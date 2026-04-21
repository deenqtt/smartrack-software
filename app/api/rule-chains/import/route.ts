import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAuth(request);
        const userId = auth.userId;
        const body = await request.json();

        let itemsToImport = [];

        if (body.smartrack_type === "RULE_CHAIN") {
            itemsToImport.push(body.data);
        } else if (body.smartrack_type === "RULE_CHAIN_BATCH") {
            itemsToImport = body.data;
        } else if (Array.isArray(body)) {
            itemsToImport = body;
        } else if (body.name && body.nodes) {
            itemsToImport.push(body);
        } else {
            return NextResponse.json(
                { error: "Invalid Rule Chain data format." },
                { status: 400 }
            );
        }

        const importedIds = [];

        for (const item of itemsToImport) {
            const { name, description, nodes, edges } = item;

            if (!name || (!nodes && !edges)) {
                continue;
            }

            const importTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

            // Handle name collision
            let finalName = `${name} (Imported ${importTime})`;
            let existing = await prisma.ruleChain.findFirst({
                where: { name: finalName, userId: userId }
            });

            if (existing) {
                finalName = `${name} (Imported ${importTime} - ${Math.random().toString(36).slice(2, 5)})`;
            }

            const newRuleChain = await prisma.ruleChain.create({
                data: {
                    name: finalName,
                    description: description || null,
                    nodes: nodes || [],
                    edges: edges || [],
                    userId: userId,
                    isActive: false
                }
            });

            importedIds.push(newRuleChain.id);
        }

        return NextResponse.json({
            success: true,
            message: `Successfully imported ${importedIds.length} rule chain(s).`,
            importedCount: importedIds.length,
            ids: importedIds
        });

    } catch (error: any) {
        console.error("[RULE_CHAIN_IMPORT_ERROR]", error);
        return NextResponse.json(
            { error: error.message || "Failed to import Rule Chain(s)" },
            { status: 500 }
        );
    }
}
