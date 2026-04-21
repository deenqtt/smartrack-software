// File: app/api/dashboards/active/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie, getAuthFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  // DEMO_MODE: Return pre-built demo dashboard (the active/inUse one)
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_DASHBOARDS } = await import("@/lib/demo-data");
    const activeDashboard = DEMO_DASHBOARDS.find((d) => d.inUse) || DEMO_DASHBOARDS[0];
    return NextResponse.json(activeDashboard);
  }

  // Try cookie auth first (for web clients)
  let auth = await getAuthFromCookie(request);

  // If no cookie auth, try Authorization header (for mobile clients)
  if (!auth || !auth.userId) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  if ((auth as any).isPreview === true) {
    return NextResponse.json(
      { message: "Preview users cannot access the authenticated dashboard" },
      { status: 403 },
    );
  }

  // RBAC: Require dashboard-management:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    // 2.5 VALIDATE USER EXISTS (Stateful Check)
    // This prevents 500 errors when using mock tokens (fast dev mode) 
    // where the user ID doesn't actually exist in the DB.
    const userExists = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true }
    });

    if (!userExists) {
      console.warn(`[ACTIVE_DASHBOARD] User ${auth.userId} not found in database. Returning 401.`);
      return new NextResponse("Unauthorized - User Not Found", { status: 401 });
    }

    // First try to find active dashboard for the current user
    const userActiveDashboard = await prisma.dashboardLayout.findFirst({
      where: {
        userId: auth.userId,
        inUse: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (userActiveDashboard) {
      return NextResponse.json(userActiveDashboard);
    }

    // If no active dashboard for user, try to find any dashboard for this user as fallback
    const userFallbackDashboard = await prisma.dashboardLayout.findFirst({
      where: { userId: auth.userId },
      orderBy: { createdAt: "asc" },
    });

    if (userFallbackDashboard) {
      return NextResponse.json(userFallbackDashboard);
    }

    // If no dashboard for this user, create a new empty one
    const newDashboard = await prisma.dashboardLayout.create({
      data: {
        userId: auth.userId,
        name: "Default Dashboard",
        layout: "[]",
        inUse: true,
        isActive: true,
      },
    });

    return NextResponse.json(newDashboard);
  } catch (error) {
    console.error("[ACTIVE_DASHBOARD_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
