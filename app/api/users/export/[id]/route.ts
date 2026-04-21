import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

/**
 * GET: Export a single user
 */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requirePermission(request as any, "users", "read");
        const { id } = await params;

        const user = await prisma.user.findUnique({
            where: { id },
            include: { role_data: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const exportData = {
            smartrack_type: "USER_DATA",
            version: "1.0",
            data: [{
                email: user.email,
                password: user.password,
                phoneNumber: user.phoneNumber,
                avatar: user.avatar,
                roleName: user.role_data.name,
            }],
            exportedAt: new Date().toISOString(),
        };

        const filename = `user-${user.email.replace(/@/g, '_at_').replace(/[^a-z0-9]/gi, '_')}.json`;

        return new NextResponse(JSON.stringify(exportData, null, 2), {
            headers: {
                "Content-Type": "application/json",
                "Content-Disposition": `attachment; filename="${filename}"`,
            },
        });
    } catch (error: any) {
        console.error("[USER_SINGLE_EXPORT_ERROR]", error);
        return NextResponse.json({ error: error.message || "Failed to export user" }, { status: 500 });
    }
}
