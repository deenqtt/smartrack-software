import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const modbusConfigs = await prisma.modbusRTUConfig.findMany({
            orderBy: { createdAt: "desc" },
        });

        const exportDataList = modbusConfigs.map(config => ({
            name: config.name,
            port: config.port,
            baudRate: config.baudRate,
            dataBits: config.dataBits,
            parity: config.parity,
            stopBits: config.stopBits,
            timeout: config.timeout,
            isActive: config.isActive,
        }));

        const exportData = {
            smartrack_type: "MODBUS_CONFIGS_BATCH",
            version: "1.0",
            data: exportDataList,
            exportedAt: new Date().toISOString(),
        };

        const filename = `modbus-configs-batch-export-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('[MODBUS_CONFIG_EXPORT]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to export Modbus configurations" },
            { status: 500 }
        );
    }
}
