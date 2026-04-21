// File: app/api/power-analyzer/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET: Mengambil semua PowerAnalyzerConfiguration
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.powerAnalyzerConfiguration.findMany({
      include: {
        apiTopic: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Parse JSON strings back to objects untuk frontend
    const parsedConfigs = configs.map((config) => ({
      ...config,
      pduList:
        config.pduList && typeof config.pduList === "string"
          ? JSON.parse(config.pduList)
          : [],
      mainPower:
        config.mainPower && typeof config.mainPower === "string"
          ? JSON.parse(config.mainPower)
          : {},
    }));

    return NextResponse.json(parsedConfigs);
  } catch (error: any) {
    console.error("Error fetching Power Analyzer configs:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST: Membuat PowerAnalyzerConfiguration baru beserta DeviceExternal untuk API
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customName, pduList, mainPower } = body;

    if (!customName || !pduList || !mainPower) {
      return NextResponse.json(
        { message: "Missing required fields: customName, pduList, mainPower" },
        { status: 400 }
      );
    }

    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const topicName = `IOT/PowerAnalyzer/${sanitizedCustomName}`;

    // Gunakan transaksi untuk memastikan kedua operasi berhasil
    const newConfig = await prisma.$transaction(async (tx) => {
      // 1. Buat DeviceExternal baru untuk API topic
      const newApiTopic = await tx.deviceExternal.create({
        data: {
          name: customName,
          topic: topicName,
        },
      });

      // 2. Buat PowerAnalyzerConfiguration dan hubungkan dengan topic di atas
      const newPowerAnalyzerConfig = await tx.powerAnalyzerConfiguration.create(
        {
          data: {
            customName,
            pduList: JSON.stringify(pduList), // Convert to String
            mainPower: JSON.stringify(mainPower), // Convert to String
            apiTopic: {
              connect: {
                uniqId: newApiTopic.uniqId,
              },
            },
          },
          include: {
            apiTopic: true,
          },
        }
      );

      return newPowerAnalyzerConfig;
    });

    // Trigger reload untuk Calculation Service (MQTT real-time)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await fetch(`${baseUrl}/api/cron/calculation-reload`, { method: "POST" });
      console.log(
        "✅ Power Analyzer config created - Calculation Service reload triggered"
      );
    } catch (reloadError) {
      console.error("Failed to trigger calculation reload:", reloadError);
    }

    // Parse response untuk frontend
    const responseConfig = {
      ...newConfig,
      pduList:
        newConfig.pduList && typeof newConfig.pduList === "string"
          ? JSON.parse(newConfig.pduList)
          : [],
      mainPower:
        newConfig.mainPower && typeof newConfig.mainPower === "string"
          ? JSON.parse(newConfig.mainPower)
          : {},
    };

    return NextResponse.json(responseConfig, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[];
      if (target?.includes("customName")) {
        return NextResponse.json(
          { message: "Custom name already exists." },
          { status: 409 }
        );
      }
      if (target?.includes("topic")) {
        return NextResponse.json(
          {
            message:
              "Topic name already exists from the generated custom name.",
          },
          { status: 409 }
        );
      }
    }
    console.error("Error creating Power Analyzer config:", error);
    return NextResponse.json(
      { message: "Failed to create configuration", error: error.message },
      { status: 500 }
    );
  }
}
