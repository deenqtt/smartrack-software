import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    try {
        const ruleChains = await prisma.ruleChain.findMany({
            where: { userId: auth.userId },
            orderBy: { createdAt: "desc" },
        });

        const exportDataList = ruleChains.map(rc => ({
            name: rc.name,
            description: rc.description,
            nodes: rc.nodes,
            edges: rc.edges,
        }));

        const exportData = {
            smartrack_type: "RULE_CHAIN_BATCH",
            version: "1.0",
            data: exportDataList,
            exportedAt: new Date().toISOString(),
        };

        const filename = `rulechains-batch-export-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('[RULE_CHAINS_BATCH_EXPORT_GET]', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to export rule chains" },
            { status: 500 }
        );
    }
}
