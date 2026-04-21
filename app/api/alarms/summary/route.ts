// File: app/api/alarms/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { AlarmType } from "@prisma/client";
import { requirePermission } from "@/lib/auth";

export async function GET(req: Request) {
  // DEMO_MODE: Return static alarm summary
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_ALARM_SUMMARY } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_ALARM_SUMMARY);
  }

  try {
    // Require read permission for alarms summary
    await requirePermission(req, "alarms", "read");

    // Gunakan aggregate untuk menghitung jumlah log alarm yang aktif
    const summary = await prisma.alarmLog.groupBy({
      by: ["alarmConfigId"], // Kelompokkan berdasarkan konfigurasi alarm
      where: {
        status: "ACTIVE", // Hanya hitung yang statusnya ACTIVE
      },
      _count: {
        id: true,
      },
    });

    // Ambil detail tipe alarm dari konfigurasi
    const alarmConfigIds = summary.map((item) => item.alarmConfigId);
    const configs = await prisma.alarmConfiguration.findMany({
      where: {
        id: { in: alarmConfigIds },
      },
      select: {
        id: true,
        alarmType: true,
      },
    });

    // Buat map untuk pencarian cepat
    const configTypeMap = new Map(configs.map((c) => [c.id, c.alarmType]));

    // Inisialisasi hasil
    const result = {
      CRITICAL: 0,
      MAJOR: 0,
      MINOR: 0,
    };

    // Akumulasi hitungan berdasarkan tipe alarm
    for (const item of summary) {
      const type = configTypeMap.get(item.alarmConfigId);
      if (type && result.hasOwnProperty(type)) {
        result[type]++;
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Response) return error;
    
    console.error("Error fetching alarm summary:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
