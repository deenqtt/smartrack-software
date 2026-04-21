// File: app/api/power-analyzer/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET: Mengambil satu PowerAnalyzerConfiguration berdasarkan ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await prisma.powerAnalyzerConfiguration.findUnique({
      where: { id: params.id },
      include: { apiTopic: true },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Configuration not found" },
        { status: 404 }
      );
    }

    // Parse JSON strings back to objects untuk frontend
    const parsedConfig = {
      ...config,
      pduList: config.pduList ? JSON.parse(config.pduList) : [],
      mainPower: config.mainPower ? JSON.parse(config.mainPower) : {},
    };

    return NextResponse.json(parsedConfig);
  } catch (error: any) {
    console.error(`Error fetching config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Failed to fetch configuration" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Memperbarui satu PowerAnalyzerConfiguration dan DeviceExternal terkait
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customName, pduList, mainPower } = body;

    // Validasi dasar
    if (!customName || !pduList || !mainPower) {
      return NextResponse.json(
        {
          message:
            "Missing required fields: customName, pduList, and mainPower are required.",
        },
        { status: 400 }
      );
    }

    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const newTopicName = `IOT/PowerAnalyzer/${sanitizedCustomName}`;

    const updatedConfig = await prisma.$transaction(async (tx) => {
      const config = await tx.powerAnalyzerConfiguration.update({
        where: { id: params.id },
        data: {
          customName,
          pduList: JSON.stringify(pduList), // Convert to String
          mainPower: JSON.stringify(mainPower), // Convert to String
        },
        include: { apiTopic: true },
      });

      if (config.apiTopicUniqId) {
        await tx.deviceExternal.update({
          where: { uniqId: config.apiTopicUniqId },
          data: {
            name: customName,
            topic: newTopicName,
          },
        });
      }
      return config;
    });

    // Trigger reload untuk Calculation Service (MQTT real-time)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await fetch(`${baseUrl}/api/cron/calculation-reload`, { method: "POST" });
      console.log(
        "✅ Power Analyzer config updated - Calculation Service reload triggered"
      );
    } catch (reloadError) {
      console.error("Failed to trigger calculation reload:", reloadError);
    }

    // Parse response untuk frontend
    const responseConfig = {
      ...updatedConfig,
      pduList: JSON.parse(updatedConfig.pduList || "[]"),
      mainPower: JSON.parse(updatedConfig.mainPower || "{}"),
    };

    return NextResponse.json(responseConfig);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "Custom name or generated topic already exists." },
        { status: 409 }
      );
    }
    console.error(`Error updating config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Failed to update configuration" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus satu PowerAnalyzerConfiguration dan DeviceExternal terkait
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.powerAnalyzerConfiguration.findUnique({
        where: { id: params.id },
        select: { apiTopicUniqId: true },
      });

      if (!configToDelete) {
        throw new Error("Configuration not found");
      }

      await tx.powerAnalyzerConfiguration.delete({ where: { id: params.id } });

      if (configToDelete.apiTopicUniqId) {
        await tx.deviceExternal.delete({
          where: { uniqId: configToDelete.apiTopicUniqId },
        });
      }
    });

    // Trigger reload untuk Calculation Service (MQTT real-time)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await fetch(`${baseUrl}/api/cron/calculation-reload`, { method: "POST" });
      console.log(
        "✅ Power Analyzer config deleted - Calculation Service reload triggered"
      );
    } catch (reloadError) {
      console.error("Failed to trigger calculation reload:", reloadError);
    }

    return NextResponse.json(
      { message: "Configuration deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    if (error.message === "Configuration not found") {
      return NextResponse.json(
        { message: "Configuration not found" },
        { status: 404 }
      );
    }
    console.error(`Error deleting config ${params.id}:`, error);
    return NextResponse.json(
      { message: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}
