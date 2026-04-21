import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const alarms = await prisma.alarmConfiguration.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                bits: true,
                device: {
                    select: { uniqId: true, name: true }
                }
            },
        });

        const exportDataList = alarms.map(alarm => ({
            customName: alarm.customName,
            alarmType: alarm.alarmType,
            keyType: alarm.keyType,
            key: alarm.key,
            deviceUniqId: alarm.device.uniqId, // Keep reference (import might need to match or re-assign)
            deviceName: alarm.device.name, // Helpful context
            minValue: alarm.minValue,
            maxValue: alarm.maxValue,
            maxOnly: alarm.maxOnly,
            directTriggerOnTrue: alarm.directTriggerOnTrue,
            bits: alarm.bits.map(b => ({
                bitPosition: b.bitPosition,
                customName: b.customName,
                alertToWhatsApp: b.alertToWhatsApp
            }))
        }));

        const exportData = {
            smartrack_type: "ALARM_CONFIGS_BATCH",
            version: "1.0",
            data: exportDataList,
            exportedAt: new Date().toISOString(),
        };

        const filename = `alarm-configs-batch-export-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('[ALARM_CONFIG_EXPORT]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to export Alarm configurations" },
            { status: 500 }
        );
    }
}
