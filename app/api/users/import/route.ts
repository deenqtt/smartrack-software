import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * POST: Import User data
 */
export async function POST(request: Request) {
    try {
        await requirePermission(request as any, "users", "write");
        const body = await request.json();

        if (!body || body.smartrack_type !== "USER_DATA" || !Array.isArray(body.data)) {
            return NextResponse.json({ error: "Invalid Smartrack export file format" }, { status: 400 });
        }

        const items = body.data;
        let createdCount = 0;
        let updatedCount = 0;

        // Fetch all roles for easy mapping
        const allRoles = await prisma.role.findMany();
        const roleMap = new Map(allRoles.map(r => [r.name, r.id]));

        for (const item of items) {
            const roleId = roleMap.get(item.roleName);
            if (!roleId) {
                console.warn(`Skipping user ${item.email} - role ${item.roleName} not found`);
                continue;
            }

            const existing = await prisma.user.findUnique({
                where: { email: item.email }
            });

            if (existing) {
                await prisma.user.update({
                    where: { id: existing.id },
                    data: {
                        password: item.password, // Keep current hashed password if provided
                        phoneNumber: item.phoneNumber,
                        avatar: item.avatar,
                        roleId: roleId,
                        updatedAt: new Date(),
                    }
                });
                updatedCount++;
            } else {
                await prisma.user.create({
                    data: {
                        email: item.email,
                        password: item.password,
                        phoneNumber: item.phoneNumber,
                        avatar: item.avatar,
                        roleId: roleId,
                    }
                });
                createdCount++;
            }
        }

        return NextResponse.json({
            success: true,
            message: `User import complete: ${createdCount} created, ${updatedCount} updated.`,
            stats: { createdCount, updatedCount }
        });

    } catch (error: any) {
        console.error("[USER_IMPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to import users" }, { status: 500 });
    }
}
