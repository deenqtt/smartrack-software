import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET: Export a single MQTT configuration
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth(request);
        const { id } = await params;

        const config = await prisma.mqttConfiguration.findUnique({
            where: { id }
        });

        if (!config) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const exportData = {
            smartrack_type: "MQTT_CONFIG",
            version: "1.0",
            data: [{
                name: config.name,
                description: config.description,
                brokerHost: config.brokerHost,
                brokerPort: config.brokerPort,
                protocol: config.protocol,
                useSSL: config.useSSL,
                clientId: config.clientId,
                username: config.username,
                password: config.password,
                useAuthentication: config.useAuthentication,
                keepAlive: config.keepAlive,
                connectTimeout: config.connectTimeout,
                reconnectPeriod: config.reconnectPeriod,
                cleanSession: config.cleanSession,
                maxReconnectAttempts: config.maxReconnectAttempts,
                defaultQos: config.defaultQos,
                retainMessages: config.retainMessages,
                willTopic: config.willTopic,
                willMessage: config.willMessage,
                willQos: config.willQos,
                willRetain: config.willRetain,
                isActive: config.isActive,
            }],
            exportedAt: new Date().toISOString(),
        };

        const filename = `mqtt-config-${config.name.replace(/[^a-z0-9]/gi, '_')}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[MQTT_CONFIG_SINGLE_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export configuration" }, { status: 500 });
    }
}
