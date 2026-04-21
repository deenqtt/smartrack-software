// File: app/api/historical/energy-target-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfMonth, endOfMonth } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const year = parseInt(searchParams.get("year") || "", 10);

  if (!configId || !year) {
    return NextResponse.json(
      { message: "configId and year are required" },
      { status: 400 }
    );
  }

  try {
    // 1. Ambil target bulanan dari database
    const targetData = await prisma.energyTarget.findUnique({
      where: {
        loggingConfigId_year: { loggingConfigId: configId, year: year },
      },
    });
    const monthlyTargets = (targetData?.monthlyTargets as any) || {};

    // 2. Hitung pemakaian aktual untuk setiap bulan
    const monthlyActuals: { [key: string]: number } = {};
    for (let i = 0; i < 12; i++) {
      const monthStartDate = startOfMonth(new Date(year, i));
      const monthEndDate = endOfMonth(new Date(year, i));

      const firstLog = await prisma.loggedData.findFirst({
        where: {
          configId,
          timestamp: { gte: monthStartDate, lte: monthEndDate },
        },
        orderBy: { timestamp: "asc" },
      });
      const lastLog = await prisma.loggedData.findFirst({
        where: {
          configId,
          timestamp: { gte: monthStartDate, lte: monthEndDate },
        },
        orderBy: { timestamp: "desc" },
      });

      if (firstLog && lastLog) {
        monthlyActuals[i] = lastLog.value - firstLog.value;
      } else {
        monthlyActuals[i] = 0;
      }
    }

    // 3. Gabungkan data untuk dikirim ke frontend
    const monthLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const chartData = monthLabels.map((month, index) => ({
      month,
      target: monthlyTargets[month.toLowerCase()] || 0,
      actual: monthlyActuals[index] >= 0 ? monthlyActuals[index] : 0,
    }));

    return NextResponse.json(chartData);
  } catch (error) {
    console.error("[API_ENERGY_TARGET]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
