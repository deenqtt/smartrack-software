// File: app/api/logging-configs/batch-upload/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export async function POST(request: Request) {
  // Server-side permission check: require 'create' on 'devices' (Optional for system processes)
  const { getAuthFromCookie, getAuthFromHeader } = await import("@/lib/auth");
  const auth = (await getAuthFromCookie(request as any)) || (await getAuthFromHeader(request as any));
  if (auth) {
    await requirePermission(request, "devices", "create");
  }

  console.log("\n[API] POST /batch-upload: Receiving batch upload request...");

  try {
    const configsToUpload = await request.json();

    if (!Array.isArray(configsToUpload)) {
      return NextResponse.json(
        { message: "Request body must be an array of configurations." },
        { status: 400 }
      );
    }

    console.log(
      `[API] POST /batch-upload: Processing ${configsToUpload.length} configurations...`
    );

    // Fetch existing devices for validation
    const existingDevices = await prisma.deviceExternal.findMany({
      select: { uniqId: true },
    });
    const existingDeviceIds = new Set(existingDevices.map((d) => d.uniqId));

    let createdCount = 0;
    let skippedCount = 0;

    for (const config of configsToUpload) {
      const {
        deviceUniqId,
        key,
        customName,
        units,
        multiply,
        loggingIntervalMinutes,
      } = config;

      // Validation: Required fields
      if (!deviceUniqId || !key || !customName) {
        console.warn(
          "[API] POST /batch-upload: Skipping config - missing required fields:",
          config
        );
        skippedCount++;
        continue;
      }

      // Validation: Device exists
      if (!existingDeviceIds.has(deviceUniqId)) {
        console.warn(
          `[API] POST /batch-upload: Skipping config - device '${deviceUniqId}' not found`
        );
        skippedCount++;
        continue;
      }

      // Validation: Interval range
      const intervalToUse = loggingIntervalMinutes || 10;
      if (intervalToUse < 1 || intervalToUse > 1440) {
        console.warn(
          `[API] POST /batch-upload: Invalid interval ${intervalToUse}, using default 10 minutes`
        );
      }

      // Upsert configuration
      await prisma.loggingConfiguration.upsert({
        where: {
          deviceUniqId_key: {
            deviceUniqId: deviceUniqId,
            key: key,
          },
        },
        update: {
          customName,
          units,
          multiply: multiply || 1,
          loggingIntervalMinutes: intervalToUse,
        },
        create: {
          customName,
          key,
          units,
          multiply: multiply || 1,
          deviceUniqId,
          loggingIntervalMinutes: intervalToUse,
        },
      });

      createdCount++;
    }

    console.log(
      `[API] POST /batch-upload: Completed. Created/Updated: ${createdCount}, Skipped: ${skippedCount}`
    );

    // 🔥 TRIGGER CRON RELOAD (only if some configs were created/updated)
    if (createdCount > 0) {
      try {
        const reloadResponse = await fetch(
          `http://localhost:${process.env.PORT || 3000}/api/cron/reload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (reloadResponse.ok) {
          console.log("[API] 🔄 Cron reload triggered successfully");
        } else {
          console.warn(
            "[API] ⚠️  Cron reload request sent but got non-200 response"
          );
        }
      } catch (err: any) {
        console.error("[API] ⚠️  Failed to trigger cron reload:", err.message);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Batch upload processed successfully.",
        created: createdCount,
        skipped: skippedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] POST /batch-upload: Error occurred:", error);
    return NextResponse.json(
      { message: "An error occurred during the batch upload process." },
      { status: 500 }
    );
  }
}
