import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * GET: Export all users
 */
export async function GET(request: Request) {
    try {
        await requirePermission(request as any, "users", "read");

        const users = await prisma.user.findMany({
            include: {
                role_data: true
            }
        });

        const exportData = {
            smartrack_type: "USER_DATA",
            version: "1.0",
            data: users.map(u => ({
                email: u.email,
                password: u.password, // Hashed password
                phoneNumber: u.phoneNumber,
                avatar: u.avatar,
                roleName: u.role_data.name,
            })),
            exportedAt: new Date().toISOString(),
        };

        const filename = `users-export-${new Date().toISOString().slice(0, 10)}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[USER_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export users" }, { status: 500 });
    }
}
