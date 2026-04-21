// File: app/api/historical/monthly-energy-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, eachDayOfInterval, startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const month = parseInt(searchParams.get("month") || "", 10); // 1-12
  const year = parseInt(searchParams.get("year") || "", 10);

  if (!configId || !month || !year) {
    return NextResponse.json(
      { message: "configId, month, and year are required" },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json(
      { message: "month must be between 1 and 12" },
      { status: 400 }
    );
  }

  try {
    // 1. Ambil target bulanan dari database (optional)
    const targetData = await prisma.energyTarget.findUnique({
      where: {
        loggingConfigId_year: { loggingConfigId: configId, year: year },
      },
    });
    const monthlyTargets = (targetData?.monthlyTargets as any) || {};

    // 2. Generate semua tanggal dalam bulan tersebut (UTC untuk konsistensi)
    const monthStart = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
    const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const daysInMonth = new Date(year, month, 0).getDate();

    // Generate array of all days in the month
    const allDaysInMonth = Array.from({ length: daysInMonth }, (_, i) => {
      return new Date(Date.UTC(year, month - 1, i + 1, 0, 0, 0, 0));
    });

    // 3. Hitung konsumsi aktual untuk setiap hari
    const dailyData = await Promise.all(
      allDaysInMonth.map(async (day) => {
        const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 0, 0, 0, 0));
        const dayEnd = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), 23, 59, 59, 999));

        // Ambil log pertama dan terakhir di hari tersebut
        const firstLog = await prisma.loggedData.findFirst({
          where: {
            configId,
            timestamp: { gte: dayStart, lte: dayEnd },
          },
          orderBy: { timestamp: "asc" },
        });

        const lastLog = await prisma.loggedData.findFirst({
          where: {
            configId,
            timestamp: { gte: dayStart, lte: dayEnd },
          },
          orderBy: { timestamp: "desc" },
        });

        // Hitung konsumsi harian (last - first)
        let actual = 0;
        if (firstLog && lastLog) {
          actual = lastLog.value - firstLog.value;
          // Pastikan tidak negatif (jika ada reset meter)
          if (actual < 0) actual = 0;
        }

        // Hitung target harian (bagi target bulanan dengan jumlah hari di bulan)
        const monthName = day.toLocaleString("en-US", { month: "short", timeZone: "UTC" }).toLowerCase();
        const monthlyTarget = monthlyTargets[monthName] || 0;
        const dailyTarget = monthlyTarget / daysInMonth;

        return {
          date: day.toISOString().split("T")[0], // Format: "2025-01-01"
          actual: actual,
          target: dailyTarget,
          dayOfWeek: day.getUTCDay(), // 0 = Sunday, 6 = Saturday
        };
      })
    );

    return NextResponse.json(dailyData);
  } catch (error) {
    console.error("[API_MONTHLY_ENERGY_DATA]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
