// File: app/api/bill-configs/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const configs = await request.json();
        if (!Array.isArray(configs)) return NextResponse.json({ message: "Invalid format" }, { status: 400 });

        const results = { imported: 0, skipped: 0, errors: [] as string[] };

        for (const config of configs) {
            try {
                const { customName, sourceDeviceUniqId, sourceDeviceKey, rupiahRatePerKwh, dollarRatePerKwh, carbonRateKgPerKwh } = config;

                const existing = await prisma.billConfiguration.findUnique({ where: { customName } });
                if (existing) { results.skipped++; continue; }

                const targetDevice = await prisma.deviceExternal.create({
                    data: {
                        name: customName,
                        topic: `IOT/BillCalculation/${customName.replace(/\s+/g, "_")}`,
                        address: "virtual-device",
                        users: { connect: { id: auth.userId } }
                    },
                });

                await prisma.billConfiguration.create({
                    data: {
                        customName,
                        sourceDeviceUniqId,
                        sourceDeviceKey,
                        rupiahRatePerKwh,
                        dollarRatePerKwh,
                        carbonRateKgPerKwh: carbonRateKgPerKwh || 0.87,
                        publishTargetDeviceUniqId: targetDevice.uniqId,
                        userId: auth.userId,
                    },
                });

                results.imported++;
            } catch (e: any) {
                results.errors.push(`${config.customName}: ${e.message}`);
                results.skipped++;
            }
        }

        return NextResponse.json(results);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
