// File: app/api/bill-configs/[id]/report/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthFromCookie(request);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const format = searchParams.get("format") || "json";
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        const config = await prisma.billConfiguration.findFirst({
            where: {
                id,
                OR: [
                    { userId: auth.userId },
                    { sharedUsers: { some: { id: auth.userId } } },
                ],
            },
            include: {
                logs: {
                    where: {
                        timestamp: {
                            ...(startDate && { gte: new Date(startDate) }),
                            ...(endDate && { lte: new Date(endDate) }),
                        },
                    },
                    orderBy: { timestamp: "desc" },
                },
            },
        });

        if (!config) return NextResponse.json({ message: "Not found or access denied" }, { status: 404 });

        if (format === "csv") {
            const header = "Timestamp,Raw Value (kWh),Rupiah Cost,Dollar Cost\n";
            const rows = config.logs.map(log =>
                `${log.timestamp.toISOString()},${log.rawValue},${log.rupiahCost},${log.dollarCost}`
            ).join("\n");

            return new NextResponse(header + rows, {
                headers: {
                    "Content-Type": "text/csv",
                    "Content-Disposition": `attachment; filename="bill-report-${config.customName}-${new Date().toISOString()}.csv"`,
                },
            });
        }

        return NextResponse.json(config.logs);
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
