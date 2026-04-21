// File: app/api/historical/bill-chart-data/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { subHours, subDays, startOfToday } from "date-fns";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const billConfigId = searchParams.get("billConfigId");
  const timeRange = searchParams.get("timeRange");

  // --- PERBAIKAN: Hapus pengecekan untuk dataType ---
  if (!billConfigId || !timeRange) {
    return NextResponse.json(
      { message: "billConfigId and timeRange are required" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "today":
        startDate = startOfToday();
        break;
      case "1h":
        startDate = subHours(now, 1);
        break;
      case "24h":
        startDate = subHours(now, 24);
        break;
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      default:
        return NextResponse.json(
          { message: "Invalid timeRange" },
          { status: 400 }
        );
    }

    const logs = await prisma.billLog.findMany({
      where: {
        configId: billConfigId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: "asc" },
      // --- PERBAIKAN: Ambil semua data yang dibutuhkan ---
      select: {
        rupiahCost: true,
        dollarCost: true,
        timestamp: true,
      },
    });

    // --- PERBAIKAN: Tidak perlu memformat data, kirim langsung ---
    return NextResponse.json(logs);
  } catch (error) {
    console.error("[API_BILL_CHART_DATA]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
