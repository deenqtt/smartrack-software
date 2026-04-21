// Public endpoint - returns the active dashboard without authentication
// Used by the /preview page
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const previewOwnerEmail = "admin@smartrack.com";

    const previewOwner = await prisma.user.findUnique({
      where: { email: previewOwnerEmail },
      select: { id: true },
    });

    if (!previewOwner) {
      return NextResponse.json(
        { message: "Preview owner not found" },
        { status: 404 },
      );
    }

    // Find the most recently updated active dashboard for the preview owner
    const activeDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: previewOwner.id,
        inUse: true,
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        layout: true,
      },
    });

    if (!activeDashboard) {
      return NextResponse.json(
        { message: "No active dashboard found" },
        { status: 404 },
      );
    }

    return NextResponse.json(activeDashboard);
  } catch (error) {
    console.error("[PUBLIC_ACTIVE_DASHBOARD_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
