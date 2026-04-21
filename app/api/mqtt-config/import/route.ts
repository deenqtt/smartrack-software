import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST: Import MQTT configurations
 */
export async function POST(request: Request) {
    try {
        await requireAuth(request);
        const body = await request.json();

        if (!body || body.smartrack_type !== "MQTT_CONFIG" || !Array.isArray(body.data)) {
            return NextResponse.json({ error: "Invalid Smartrack export file format" }, { status: 400 });
        }

        const items = body.data;
        let createdCount = 0;
        let updatedCount = 0;

        for (const item of items) {
            // Check if exists by name (simplified logic for MQTT)
            const existing = await prisma.mqttConfiguration.findFirst({
                where: { name: item.name }
            });

            if (existing) {
                await prisma.mqttConfiguration.update({
                    where: { id: existing.id },
                    data: {
                        ...item,
                        updatedAt: new Date(),
                    }
                });
                updatedCount++;
            } else {
                await prisma.mqttConfiguration.create({
                    data: {
                        ...item,
                        connectionStatus: "DISCONNECTED",
                        messageCount: 0,
                        bytesSent: 0,
                        bytesReceived: 0,
                    }
                });
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `Import complete: ${createdCount} created, ${updatedCount} updated.`,
            stats: { createdCount, updatedCount }
        });

    } catch (error: any) {
        console.error("[MQTT_CONFIG_IMPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to import configurations" }, { status: 500 });
    }
}
