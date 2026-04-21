// File: app/api/historical/daily-energy-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfYear, endOfYear, eachDayOfInterval } from "date-fns";
import { getCachedData, CACHE_TTL } from "@/lib/cache";

interface DailyEnergyData {
  date: string;
  actual: number;
  target: number;
  dayOfWeek: number;
}

function generateCacheKey(configId: string, year: number) {
  return `daily-energy:${configId}:${year}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const year = parseInt(searchParams.get("year") || "", 10);

  if (!configId) {
    return NextResponse.json(
      { message: "configId is required" },
      { status: 400 }
    );
  }

  if (!year || isNaN(year)) {
    return NextResponse.json(
      { message: "Valid year is required" },
      { status: 400 }
    );
  }

  try {
    const cacheKey = generateCacheKey(configId, year);

    // Cache for 1 hour since energy data doesn't change often
    const data = await getCachedData(
      cacheKey,
      async () => await fetchDailyEnergyDataOptimized(configId, year),
      { ttl: CACHE_TTL.LONG }
    );

    const response = NextResponse.json({
      data: data,
      metadata: {
        configId,
        year,
        count: data.length,
        cached: true,
        performanceNote: "Optimized with single aggregated query"
      }
    });

    // Set longer client-side cache for historical data
    response.headers.set("Cache-Control", "private, max-age=3600"); // 1 hour

    return response;
  } catch (error) {
    console.error("[API_DAILY_ENERGY_DATA]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Optimized version using single aggregated query instead of 365+ individual queries
async function fetchDailyEnergyDataOptimized(configId: string, year: number): Promise<DailyEnergyData[]> {
  // 1. Get energy targets (optional, for calculation targets)
  const targetData = await prisma.energyTarget.findUnique({
    where: {
      loggingConfigId_year: { loggingConfigId: configId, year: year },
    },
  });
  const monthlyTargets = (targetData?.monthlyTargets as any) || {};

  // 2. Use TimescaleDB optimized query to get daily consumption in ONE query
  // This replaces 365+ individual queries with a single windowed aggregate query
  const dailyConsumptions = await prisma.$queryRaw<DailyEnergyData[]>`
    SELECT
      DATE("timestamp") as date,
      -- Calculate daily consumption using window function (last - first value per day)
      (MAX("value") OVER (PARTITION BY DATE("timestamp")) - MIN("value") OVER (PARTITION BY DATE("timestamp"))) as actual,
      EXTRACT(DOW FROM DATE("timestamp")) as day_of_week
    FROM "LoggedData"
    WHERE "configId" = ${configId}
      AND DATE_PART('year', "timestamp") = ${year}
      AND "timestamp" >= ${new Date(year, 0, 1)}  -- Start of year
      AND "timestamp" < ${new Date(year + 1, 0, 1)}  -- Start of next year
    GROUP BY DATE("timestamp")
    ORDER BY DATE("timestamp") ASC
  `;

  // 3. Generate all days in the year and merge with actual data
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const allDaysInYear = eachDayOfInterval({ start: yearStart, end: yearEnd });

  // Create map for faster lookup
  const consumptionMap = new Map<string, { actual: number; dayOfWeek: number }>();
  dailyConsumptions.forEach((day: any) => {
    const actual = Number(day.actual);
    // Handle negative values (meter reset) - use 0 for now, could be more sophisticated
    const cleanActual = actual < 0 ? 0 : actual;
    consumptionMap.set(day.date, {
      actual: cleanActual,
      dayOfWeek: Number(day.day_of_week)
    });
  });

  // 4. Build final result with targets calculated
  return allDaysInYear.map(day => {
    const dateStr = day.toISOString().split("T")[0];
    const actualData = consumptionMap.get(dateStr);

    // Calculate daily target from monthly target
    const monthName = day.toLocaleString("en-US", { month: "short" }).toLowerCase();
    const monthlyTarget = monthlyTargets[monthName] || 0;
    const daysInMonth = new Date(year, day.getMonth() + 1, 0).getDate();
    const dailyTarget = monthlyTarget / daysInMonth;

    return {
      date: dateStr,
      actual: actualData?.actual || 0,
      target: dailyTarget,
      dayOfWeek: actualData?.dayOfWeek ?? day.getDay(), // Fallback to date calculation
    };
  });
}
