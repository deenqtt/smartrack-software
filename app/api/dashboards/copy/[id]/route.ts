// File: app/api/dashboards/copy/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // RBAC: Require dashboard-management:create permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "create");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, targetUserId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ message: "Dashboard name is required" }, { status: 400 });
    }

    // Get the source dashboard
    const sourceDashboard = await prisma.dashboardLayout.findUnique({
      where: { id },
    });

    if (!sourceDashboard) {
      return NextResponse.json({ message: "Source dashboard not found" }, { status: 404 });
    }

    // Check if user is admin or owns the source dashboard
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role_data: { select: { name: true } } }
    });

    const isAdmin = user?.role_data?.name === 'ADMIN';
    const ownsDashboard = sourceDashboard.userId === auth.userId;

    if (!isAdmin && !ownsDashboard) {
      return NextResponse.json({ message: "Forbidden - Cannot copy this dashboard" }, { status: 403 });
    }

    // Determine target user
    let targetUser = auth.userId; // Default to current user

    if (targetUserId && targetUserId.trim()) {
      // Check if admin can specify target user
      if (!isAdmin) {
        return NextResponse.json({ message: "Forbidden - Cannot copy to other users" }, { status: 403 });
      }

      // Verify target user exists
      const targetUserExists = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: { id: true }
      });

      if (!targetUserExists) {
        return NextResponse.json({ message: "Target user not found" }, { status: 404 });
      }

      targetUser = targetUserId;
    }

    // Check if target user already has a dashboard with this name
    const existingDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: targetUser,
        name: name.trim()
      }
    });

    if (existingDashboard) {
      return NextResponse.json({
        message: "Dashboard name already exists for this user"
      }, { status: 409 });
    }

    // Create the copied dashboard
    const copiedDashboard = await prisma.dashboardLayout.create({
      data: {
        name: name.trim(),
        layout: JSON.stringify(sourceDashboard.layout), // Copy and stringify the layout
        userId: targetUser,
        inUse: false, // New dashboard starts as inactive
      },
    });

    console.log(`Dashboard copied: "${sourceDashboard.name}" -> "${copiedDashboard.name}" for user ${targetUser}`);

    return NextResponse.json(copiedDashboard, { status: 201 });

  } catch (error) {
    console.error("[DASHBOARD_COPY]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
