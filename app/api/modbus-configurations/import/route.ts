import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const body = await request.json();

        let itemsToImport = [];

        if (body.smartrack_type === "MODBUS_CONFIGS_BATCH") {
            itemsToImport = body.data;
        } else if (Array.isArray(body)) {
            itemsToImport = body;
        } else if (body.name && body.port) {
            itemsToImport.push(body);
        } else {
            return NextResponse.json(
                { error: "Invalid Modbus Configuration data format." },
                { status: 400 }
            );
        }

        const importedIds = [];

        for (const item of itemsToImport) {
            const { name, port, baudRate, dataBits, parity, stopBits, timeout, isActive } = item;

            if (!name || !port) continue;

            // Handle name collision
            let finalName = name;
            let existing = await prisma.modbusRTUConfig.findFirst({
                where: { name: finalName }
            });

            if (existing) {
                finalName = `${name}-${Math.random().toString(36).slice(2, 5)}`;
            }

            // Handle port collision
            let finalPort = port;
            let existingPort = await prisma.modbusRTUConfig.findUnique({
                where: { port: finalPort }
            });

            if (existingPort) {
                // Port must be unique. If port collision happens, we either skip or auto-rename. 
                // For hardware ports, renaming might not make sense, but for software testing it might.
                // Usually, we should throw an error or skip. Let's skip with a warning or just rename nicely if possible.
                continue; // Skip if port already in use to prevent hardware conflicts
            }

            const newConfig = await prisma.modbusRTUConfig.create({
                data: {
                    name: finalName,
                    port: finalPort,
                    baudRate: baudRate ?? 9600,
                    dataBits: dataBits ?? 8,
                    parity: parity || "none",
                    stopBits: stopBits ?? 1,
                    timeout: timeout ?? 1000,
                    isActive: false // Default to false for safety
                }
            });

            importedIds.push(newConfig.id);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${importedIds.length} Modbus configuration(s). Skipped configs with existing hardware ports.`,
            importedCount: importedIds.length,
            ids: importedIds
        });

    } catch (error: any) {
        console.error("[MODBUS_CONFIG_IMPORT_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Failed to import Modbus configurations" },
            { status: 500 }
        );
    }
}
