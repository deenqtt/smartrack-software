// File: app/api/bill-configs/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const configs = await prisma.billConfiguration.findMany({
            where: {
                OR: [{ userId: auth.userId }, { sharedUsers: { some: { id: auth.userId } } }],
            },
            include: { sourceDevice: true }
        });

        const exportData = configs.map((config) => ({
            customName: config.customName,
            sourceDeviceKey: config.sourceDeviceKey,
            rupiahRatePerKwh: config.rupiahRatePerKwh,
            dollarRatePerKwh: config.dollarRatePerKwh,
            carbonRateKgPerKwh: config.carbonRateKgPerKwh,
            sourceDeviceUniqId: config.sourceDeviceUniqId
        }));

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="bill-configs-export-${new Date().toISOString()}.json"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
