import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST: Import Menu Structure (Groups & Items)
 */
export async function POST(request: NextRequest) {
    try {
        await requireAuth(request);
        const body = await request.json();

        if (!body || body.smartrack_type !== "MENU_STRUCTURE" || !Array.isArray(body.data)) {
            return NextResponse.json({ error: "Invalid Smartrack export file format" }, { status: 400 });
        }

        const groups = body.data;
        let groupCreated = 0;
        let groupUpdated = 0;
        let itemCreated = 0;
        let itemUpdated = 0;

        for (const groupData of groups) {
            const { items, ...groupOnly } = groupData;

            // Upsert MenuGroup
            const existingGroup = await prisma.menuGroup.findUnique({
                where: { name: groupOnly.name }
            });

            let activeGroupId: string;

            if (existingGroup) {
                const updatedGroup = await prisma.menuGroup.update({
                    where: { id: existingGroup.id },
                    data: {
                        ...groupOnly,
                        updatedAt: new Date(),
                    }
                });
                activeGroupId = updatedGroup.id;
                groupUpdated++;
            } else {
                const createdGroup = await prisma.menuGroup.create({
                    data: groupOnly
                });
                activeGroupId = createdGroup.id;
                groupCreated++;
            }

            // Upsert MenuItems within group
            if (Array.isArray(items)) {
                for (const itemData of items) {
                    const existingItem = await prisma.menuItem.findUnique({
                        where: { name: itemData.name }
                    });

                    if (existingItem) {
                        await prisma.menuItem.update({
                            where: { id: existingItem.id },
                            data: {
                                ...itemData,
                                menuGroupId: activeGroupId,
                                updatedAt: new Date(),
                            }
                        });
                        itemUpdated++;
                    } else {
                        await prisma.menuItem.create({
                            data: {
                                ...itemData,
                                menuGroupId: activeGroupId
                            }
                        });
                        itemCreated++;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            message: `Menu structure import complete. Groups: ${groupCreated} created, ${groupUpdated} updated. Items: ${itemCreated} created, ${itemUpdated} updated.`,
            stats: { groupCreated, groupUpdated, itemCreated, itemUpdated }
        });

    } catch (error: any) {
        console.error("[MENU_STRUCTURE_IMPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to import menu structure" }, { status: 500 });
    }
}
