import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET: Export all MQTT configurations
 */
export async function GET(request: Request) {
    try {
        await requireAuth(request);

        const configs = await prisma.mqttConfiguration.findMany();

        const exportData = {
            smartrack_type: "MQTT_CONFIG",
            version: "1.0",
            data: configs.map(c => ({
                name: c.name,
                description: c.description,
                brokerHost: c.brokerHost,
                brokerPort: c.brokerPort,
                protocol: c.protocol,
                useSSL: c.useSSL,
                clientId: c.clientId,
                username: c.username,
                password: c.password,
                useAuthentication: c.useAuthentication,
                keepAlive: c.keepAlive,
                connectTimeout: c.connectTimeout,
                reconnectPeriod: c.reconnectPeriod,
                cleanSession: c.cleanSession,
                maxReconnectAttempts: c.maxReconnectAttempts,
                defaultQos: c.defaultQos,
                retainMessages: c.retainMessages,
                willTopic: c.willTopic,
                willMessage: c.willMessage,
                willQos: c.willQos,
                willRetain: c.willRetain,
                isActive: c.isActive,
            })),
            exportedAt: new Date().toISOString(),
        };

        const filename = `mqtt-configs-export-${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[MQTT_CONFIG_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export MQTT configurations" }, { status: 500 });
    }
}
