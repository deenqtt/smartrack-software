// File: app/api/dashboards/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // RBAC: Require dashboard-management:update permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "update");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id },
    });

    if (!dashboard) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check if user is admin or owns the dashboard
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role_data: { select: { name: true } } },
    });

    const isAdmin = user?.role_data?.name === "ADMIN";
    const ownsDashboard = dashboard.userId === auth.userId;

    if (!isAdmin && !ownsDashboard) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const { name, layout, inUse } = body;

    if (inUse === true) {
      await prisma.dashboardLayout.updateMany({
        where: {
          userId: auth.userId, // PERBAIKAN: Gunakan auth.userId
          id: { not: id },
        },
        data: { inUse: false },
      });
    }

    const updatedDashboard = await prisma.dashboardLayout.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(layout && { layout: JSON.stringify(layout) }), //  Stringify here
        ...(inUse !== undefined && { inUse }),
      },
    });

    return NextResponse.json(updatedDashboard);
  } catch (error) {
    console.error("[DASHBOARD_PUT]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // RBAC: Require dashboard-management:delete permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "delete");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id },
    });

    if (!dashboard) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check if user is admin or owns the dashboard
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role_data: { select: { name: true } } },
    });

    const isAdmin = user?.role_data?.name === "ADMIN";
    const ownsDashboard = dashboard.userId === auth.userId;

    if (!isAdmin && !ownsDashboard) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.dashboardLayout.delete({
      where: { id },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[DASHBOARD_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * GET: Mengambil data satu dashboard spesifik berdasarkan ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // RBAC: Require dashboard-management:read permission (optional for viewing)
  // Allow viewing if user is admin or owner, regardless of dashboard-management permission
  const { requirePermission } = await import("@/lib/auth");
  let hasPermission = false;
  try {
    await requirePermission(request, "dashboard-management", "read");
    hasPermission = true;
  } catch (error) {
    // Continue even without permission - will check ownership below
  }

  try {
    const { id } = await params;
    console.log(
      `[DASHBOARD_GET] Fetching dashboard: ${id}, User: ${auth.userId}`,
    );

    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id },
    });

    if (!dashboard) {
      console.log(`[DASHBOARD_GET] Dashboard not found: ${id}`);
      return new NextResponse("Not Found", { status: 404 });
    }

    // Check if user is admin or owns the dashboard
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role_data: { select: { name: true } } },
    });

    const isAdmin = user?.role_data?.name === "ADMIN";
    const ownsDashboard = dashboard.userId === auth.userId;

    console.log(
      `[DASHBOARD_GET] Dashboard: ${dashboard.name}, Owner: ${dashboard.userId}, IsAdmin: ${isAdmin}, Owns: ${ownsDashboard}`,
    );

    // Allow if user has permission OR is admin OR owns dashboard
    if (!hasPermission && !isAdmin && !ownsDashboard) {
      console.log(`[DASHBOARD_GET] Access denied for user ${auth.userId}`);
      return new NextResponse("Forbidden", { status: 403 });
    }

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("[DASHBOARD_GET_BY_ID]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
