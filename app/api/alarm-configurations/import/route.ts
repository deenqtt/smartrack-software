import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { AlarmType, AlarmKeyType } from "@prisma/client";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const body = await request.json();

        let itemsToImport = [];

        if (body.smartrack_type === "ALARM_CONFIGS_BATCH") {
            itemsToImport = body.data;
        } else if (Array.isArray(body)) {
            itemsToImport = body;
        } else if (body.customName && body.alarmType && body.deviceUniqId) {
            itemsToImport.push(body);
        } else {
            return NextResponse.json(
                { error: "Invalid Alarm Configuration data format." },
                { status: 400 }
            );
        }

        const importedIds = [];

        for (const item of itemsToImport) {
            const {
                customName, alarmType, keyType, key, deviceUniqId,
                minValue, maxValue, maxOnly, directTriggerOnTrue, bits = []
            } = item;

            if (!customName || !alarmType || !keyType || !key || !deviceUniqId) {
                continue;
            }

            // Check if device exists. If not, this might fail unless we allow floating devices or require mapping beforehand.
            // We will assume deviceUniqId is mapped correctly or we skip/error safely
            const deviceExists = await prisma.deviceExternal.findUnique({
                where: { uniqId: deviceUniqId }
            });

            if (!deviceExists) {
                // Skip configs where the target device no longer exists locally
                console.warn(`[ALARM_IMPORT] Skipped ${customName} as deviceUniqId ${deviceUniqId} not found.`);
                continue;
            }

            let existing = await prisma.alarmConfiguration.findFirst({
                where: { deviceUniqId: deviceUniqId, customName: customName }
            });

            const bitsData = bits.map((b: any) => ({
                bitPosition: b.bitPosition,
                customName: b.customName || `Bit ${b.bitPosition}`,
                alertToWhatsApp: b.alertToWhatsApp ?? false
            }));

            if (existing) {
                // Update existing record
                await prisma.alarmConfiguration.update({
                    where: { id: existing.id },
                    data: {
                        alarmType: alarmType as AlarmType,
                        keyType: keyType as AlarmKeyType,
                        key: key,
                        minValue: minValue,
                        maxValue: maxValue,
                        maxOnly: maxOnly ?? false,
                        directTriggerOnTrue: directTriggerOnTrue ?? true,
                        // Delete and recreate bits for simplicity in update
                        bits: {
                            deleteMany: {},
                            create: bitsData
                        }
                    }
                });
                importedIds.push(existing.id);
            } else {
                // Create new record
                const newConfig = await prisma.alarmConfiguration.create({
                    data: {
                        customName: customName,
                        alarmType: alarmType as AlarmType,
                        keyType: keyType as AlarmKeyType,
                        key: key,
                        deviceUniqId: deviceUniqId,
                        minValue: minValue,
                        maxValue: maxValue,
                        maxOnly: maxOnly ?? false,
                        directTriggerOnTrue: directTriggerOnTrue ?? true,
                        bits: bitsData.length > 0 ? {
                            create: bitsData
                        } : undefined
                    }
                });
                importedIds.push(newConfig.id);
            }
        }

        if (importedIds.length === 0 && itemsToImport.length > 0) {
            return NextResponse.json({
                success: false,
                message: "Import failed. No valid devices found to attach the alarms to. Make sure devices exist before importing alarms."
            }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${importedIds.length} Alarm configuration(s). Skipped alarms referencing non-existent devices.`,
            importedCount: importedIds.length,
            ids: importedIds
        });

    } catch (error: any) {
        console.error("[ALARM_CONFIG_IMPORT_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Failed to import Alarm configurations" },
            { status: 500 }
        );
    }
}
