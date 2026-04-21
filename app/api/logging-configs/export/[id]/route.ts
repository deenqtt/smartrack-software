import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET: Export a single logging configuration
 */
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAuth(request);
        const { id } = await params;

        const config = await prisma.loggingConfiguration.findUnique({
            where: { id },
            include: {
                device: {
                    select: {
                        uniqId: true,
                        name: true,
                    }
                }
            }
        });

        if (!config) {
            return NextResponse.json({ error: "Configuration not found" }, { status: 404 });
        }

        const exportData = {
            smartrack_type: "LOGGING_CONFIG_SINGLE",
            data: {
                customName: config.customName,
                key: config.key,
                units: config.units,
                multiply: config.multiply,
                deviceUniqId: config.deviceUniqId,
                loggingIntervalMinutes: config.loggingIntervalMinutes,
            },
            exportedAt: new Date().toISOString(),
        };

        const filename = `logging-config-${config.customName.replace(/[^a-z0-9]/gi, '_')}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[LOGGING_CONFIG_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export configuration" }, { status: 500 });
    }
}
