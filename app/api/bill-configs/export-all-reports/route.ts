// File: app/api/bill-configs/export-all-reports/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const configs = await prisma.billConfiguration.findMany({
            where: {
                OR: [
                    { userId: auth.userId },
                    { sharedUsers: { some: { id: auth.userId } } },
                ],
            },
            include: {
                logs: {
                    orderBy: { timestamp: "desc" },
                },
            },
        });

        const header = "Config Name,Timestamp,Raw Value (kWh),Rupiah Cost,Dollar Cost,Carbon Emission (kg)\n";
        let rows = "";

        for (const config of configs) {
            for (const log of config.logs) {
                rows += `"${config.customName}",${log.timestamp.toISOString()},${log.rawValue},${log.rupiahCost},${log.dollarCost},${(log as any).carbonEmission || 0}\n`;
            }
        }

        return new NextResponse(header + rows, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="bill-report-all-${new Date().toISOString()}.csv"`,
            },
        });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
