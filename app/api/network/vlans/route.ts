// File: app/api/network/vlans/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// GET: Fetch all VLANs for dropdown/selection
export async function GET(request: NextRequest) {
    const authPayload = await getAuthFromCookie(request);
    if (!authPayload?.userId) {
        return new NextResponse("Unauthenticated", { status: 401 });
    }

    try {
        const vlans = await prisma.vLAN.findMany({
            orderBy: { vlanId: "asc" },
            select: {
                id: true,
                vlanId: true,
                name: true,
                isActive: true,
            },
        });

        return NextResponse.json(vlans);
    } catch (error: any) {
        console.error("Error fetching VLANs:", error);
        return NextResponse.json(
            { message: "Failed to fetch VLANs", error: error.message },
            { status: 500 }
        );
    }
}
