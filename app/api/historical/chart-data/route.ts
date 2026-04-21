// File: app/api/historical/chart-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours, subDays, startOfHour, endOfHour } from "date-fns";
import { getCachedData, CACHE_TTL } from "@/lib/cache";

interface ChartDataPoint {
  value: number;
  timestamp: Date;
}

function generateCacheKey(configId: string, timeRange: string, aggregation?: string | null) {
  return `chart:${configId}:${timeRange}:${aggregation || 'raw'}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const timeRange = searchParams.get("timeRange"); // e.g., "1h", "24h", "7d"
  const aggregation = searchParams.get("aggregation"); // 'hourly', 'daily', or null for raw
  const limit = Math.min(parseInt(searchParams.get("limit") || "5000"), 50000); // Max 50k points

  if (!configId) {
    return NextResponse.json(
      { message: "configId is required" },
      { status: 400 }
    );
  }

  if (!timeRange) {
    return NextResponse.json(
      { message: "timeRange is required" },
      { status: 400 }
    );
  }

  try {
    const cacheKey = generateCacheKey(configId, timeRange, aggregation);
    const cacheTtl = timeRange === "1h" ? CACHE_TTL.SHORT : CACHE_TTL.MEDIUM;

    const data = await getCachedData(
      cacheKey,
      async () => await fetchChartData(configId, timeRange, aggregation, limit),
      { ttl: cacheTtl }
    );

    // Add performance metadata
    const response = NextResponse.json({
      data: data,
      metadata: {
        count: data.length,
        timeRange,
        aggregation: aggregation || 'raw',
        cached: true,
        maxPoints: limit
      }
    });

    // Set cache headers for client-side caching
    if (timeRange === "1h") {
      response.headers.set("Cache-Control", "private, max-age=30"); // Short client cache
    }

    return response;
  } catch (error) {
    console.error("[API_CHART_DATA]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function fetchChartData(
  configId: string,
  timeRange: string,
  aggregation: string | null,
  limit: number
): Promise<ChartDataPoint[]> {
  const now = new Date();
  let startDate: Date;
  let shouldAggregate = false;

  // Determine start date and if we need aggregation
  switch (timeRange) {
    case "1h":
      startDate = subHours(now, 1);
      break;
    case "6h":
      startDate = subHours(now, 6);
      break;
    case "24h":
      startDate = subHours(now, 24);
      break;
    case "7d":
      startDate = subDays(now, 7);
      shouldAggregate = true; // Aggregate for large ranges
      break;
    case "30d":
      startDate = subDays(now, 30);
      shouldAggregate = true;
      break;
    default:
      throw new Error(`Invalid timeRange: ${timeRange}`);
  }

  // Force aggregation if explicitly requested or for large ranges
  const useAggregation = aggregation === "hourly" || (aggregation !== "raw" && shouldAggregate);

  if (useAggregation) {
    // Aggregated query: Group by hour and calculate avg/min/max
    const result = await prisma.$queryRaw<ChartDataPoint[]>`
      SELECT
        date_trunc('hour', timestamp) as timestamp,
        avg(value) as value,
        min(value) as min_value,
        max(value) as max_value,
        count(*) as sample_count
      FROM "LoggedData"
      WHERE "configId" = ${configId}
        AND timestamp >= ${startDate}
        AND timestamp <= ${now}
      GROUP BY date_trunc('hour', timestamp)
      ORDER BY timestamp ASC
      LIMIT ${limit}
    `;

    // Transform to chart format (using avg as main value)
    return result.map((row: any) => ({
      value: Number(row.value),
      timestamp: new Date(row.timestamp),
      metadata: {
        min: Number(row.min_value),
        max: Number(row.max_value),
        sampleCount: Number(row.sample_count)
      }
    })) as ChartDataPoint[];
  } else {
    // Raw data query with pagination
    return await prisma.loggedData.findMany({
      where: {
        configId: configId,
        timestamp: {
          gte: startDate,
          lte: now
        },
      },
      select: {
        value: true,
        timestamp: true,
      },
      orderBy: {
        timestamp: "asc",
      },
      take: limit, // Limit results to prevent massive responses
    });
  }
}
