import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET: Export all logging configurations
 */
export async function GET(request: Request) {
    try {
        await requireAuth(request);

        const configs = await prisma.loggingConfiguration.findMany({
            include: {
                device: {
                    select: {
                        uniqId: true,
                        name: true,
                    }
                }
            }
        });

        const exportData = {
            smartrack_type: "LOGGING_CONFIG",
            version: "1.0",
            data: configs.map(c => ({
                customName: c.customName,
                key: c.key,
                units: c.units,
                multiply: c.multiply,
                deviceUniqId: c.deviceUniqId,
                loggingIntervalMinutes: c.loggingIntervalMinutes,
            })),
            exportedAt: new Date().toISOString(),
        };

        const filename = `logging-configs-export-${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[LOGGING_CONFIG_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export configurations" }, { status: 500 });
    }
}
