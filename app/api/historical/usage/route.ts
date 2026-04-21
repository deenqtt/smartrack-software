// File: app/api/historical/usage/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const configId = searchParams.get("configId");
  const period = searchParams.get("period"); // e.g., "last_month", "current_month"

  if (!configId || !period) {
    return NextResponse.json(
      { message: "configId and period are required" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (period === "last_month") {
      // UTC version - last month
      const lastMonthYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear();
      const lastMonth = now.getUTCMonth() === 0 ? 11 : now.getUTCMonth() - 1;
      startDate = new Date(Date.UTC(lastMonthYear, lastMonth, 1, 0, 0, 0, 0));
      // Last day of last month
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
    } else if (period === "current_month") {
      // UTC version - current month
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      endDate = now; // Sampai waktu saat ini
    } else {
      return NextResponse.json({ message: "Invalid period" }, { status: 400 });
    }

    // Debug log untuk troubleshooting
    console.log(`[USAGE_API] Period: ${period}, StartDate: ${startDate.toISOString()}, EndDate: ${endDate.toISOString()}`);

    const firstLog = await prisma.loggedData.findFirst({
      where: {
        configId: configId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: "asc" },
    });

    // Untuk bulan ini, log terakhir adalah yang paling baru
    const lastLog = await prisma.loggedData.findFirst({
      where: {
        configId: configId,
        timestamp: { lte: endDate },
      },
      orderBy: { timestamp: "desc" },
    });

    // Debug log
    console.log(`[USAGE_API] FirstLog: ${firstLog?.timestamp.toISOString()} = ${firstLog?.value}, LastLog: ${lastLog?.timestamp.toISOString()} = ${lastLog?.value}`);

    if (!firstLog || !lastLog) {
      return NextResponse.json(
        { usage: 0, message: "Not enough data for the period" },
        { status: 200 }
      );
    }

    const usage = lastLog.value - firstLog.value;

    return NextResponse.json({
      usage: usage >= 0 ? usage : 0,
    });
  } catch (error) {
    console.error("[API_HISTORICAL_USAGE]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
