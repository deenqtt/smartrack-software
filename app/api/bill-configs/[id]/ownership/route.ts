// File: app/api/bill-configs/[id]/ownership/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const auth = await getAuthFromCookie(request);
    if (!auth) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    try {
        const body = await request.json();
        const { action, targetUserId } = body;

        const config = await prisma.billConfiguration.findUnique({
            where: { id },
            select: { userId: true },
        });

        if (!config) return NextResponse.json({ message: "Not found" }, { status: 404 });
        if (config.userId !== auth.userId) return NextResponse.json({ message: "Forbidden" }, { status: 403 });

        if (action === "transfer") {
            await prisma.billConfiguration.update({
                where: { id },
                data: { userId: targetUserId, sharedUsers: { disconnect: { id: targetUserId } } },
            });
            return NextResponse.json({ message: "Ownership transferred successfully" });
        } else if (action === "share") {
            await prisma.billConfiguration.update({
                where: { id },
                data: { sharedUsers: { connect: { id: targetUserId } } },
            });
            return NextResponse.json({ message: "User added to shared access" });
        } else if (action === "unshare") {
            await prisma.billConfiguration.update({
                where: { id },
                data: { sharedUsers: { disconnect: { id: targetUserId } } },
            });
            return NextResponse.json({ message: "Access revoked" });
        }

        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}
