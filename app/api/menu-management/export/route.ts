import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * GET: Export entire Menu Structure (Groups & Items)
 */
export async function GET(request: NextRequest) {
    try {
        await requireAuth(request);

        const groups = await prisma.menuGroup.findMany({
            include: {
                items: true
            },
            orderBy: { order: 'asc' }
        });

        const exportData = {
            smartrack_type: "MENU_STRUCTURE",
            version: "1.0",
            data: groups.map(g => ({
                name: g.name,
                label: g.label,
                icon: g.icon,
                order: g.order,
                isActive: g.isActive,
                isDeveloper: g.isDeveloper,
                items: g.items.map(i => ({
                    name: i.name,
                    label: i.label,
                    path: i.path,
                    icon: i.icon,
                    order: i.order,
                    isActive: i.isActive,
                    isDeveloper: i.isDeveloper,
                }))
            })),
            exportedAt: new Date().toISOString(),
        };

        const filename = `menu-structure-export-${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[MENU_STRUCTURE_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export menu structure" }, { status: 500 });
    }
}
