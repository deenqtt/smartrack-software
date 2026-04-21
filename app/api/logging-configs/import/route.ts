import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST: Import logging configuration(s)
 * Supports both single and batch formats
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const body = await request.json();

        // Unwrap data based on format
        let rawData = body;
        if (body.smartrack_type === "LOGGING_CONFIG") rawData = body.data;
        if (body.smartrack_type === "LOGGING_CONFIG_SINGLE") rawData = [body.data];

        const configs = Array.isArray(rawData) ? rawData : [rawData];

        if (configs.length === 0) {
            return NextResponse.json({ error: "No configuration data found in file" }, { status: 400 });
        }

        const stats = { created: 0, updated: 0, skipped: 0 };
        const existingDevices = await prisma.deviceExternal.findMany({ select: { uniqId: true } });
        const deviceIds = new Set(existingDevices.map(d => d.uniqId));

        await prisma.$transaction(async (tx) => {
            for (const config of configs) {
                const { deviceUniqId, key, customName, units, multiply, loggingIntervalMinutes } = config;

                if (!deviceUniqId || !key || !customName) {
                    stats.skipped++;
                    continue;
                }

                if (!deviceIds.has(deviceUniqId)) {
                    stats.skipped++;
                    continue;
                }

                await tx.loggingConfiguration.upsert({
                    where: { deviceUniqId_key: { deviceUniqId, key } },
                    update: {
                        customName,
                        units,
                        multiply: multiply || 1,
                        loggingIntervalMinutes: loggingIntervalMinutes || 10,
                    },
                    create: {
                        customName,
                        key,
                        units,
                        multiply: multiply || 1,
                        deviceUniqId,
                        loggingIntervalMinutes: loggingIntervalMinutes || 10,
                    },
                });
                stats.created++;
            }
        });

        // Trigger cron reload
        try {
            await fetch(`http://localhost:${process.env.PORT || 3000}/api/cron/reload`, { method: "POST" });
        } catch (e) {
            console.warn("Could not reload cron automatically during import");
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${configs.length} configurations. Success: ${stats.created}, Failed: ${stats.skipped}`,
            stats
        });

    } catch (error: any) {
        console.error("[LOGGING_IMPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to import configurations" }, { status: 500 });
    }
}
