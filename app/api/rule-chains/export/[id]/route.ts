import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { id } = await params;

        const ruleChain = await prisma.ruleChain.findUnique({
            where: { id },
        });

        if (!ruleChain) {
            return NextResponse.json({ error: "Rule chain not found" }, { status: 404 });
        }

        // Verify ownership
        if (ruleChain.userId !== auth.userId) {
            return new NextResponse("Unauthorized", { status: 403 });
        }

        const exportData = {
            smartrack_type: "RULE_CHAIN",
            version: "1.0",
            data: {
                name: ruleChain.name,
                description: ruleChain.description,
                nodes: ruleChain.nodes,
                edges: ruleChain.edges,
            },
            exportedAt: new Date().toISOString(),
        };

        const filename = `rulechain-export-${ruleChain.name.replace(/[^a-z0-9]/gi, '_')}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error("[RULE_CHAIN_EXPORT]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
