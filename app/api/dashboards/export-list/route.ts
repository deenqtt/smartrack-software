import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET: Get list of all dashboards available for export (requires admin or dashboard management permissions)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require dashboard-management:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const dashboards = await prisma.dashboardLayout.findMany({
      include: {
        user: {
          select: {
            email: true,
          },
        },
        container3dWidgets: {
          select: {
            id: true,
            customName: true,
            _count: {
              select: { containerRacks: true }
            }
          }
        },
        _count: {
          select: { container3dWidgets: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Transform to simpler format for export list
    const exportList = dashboards.map(dashboard => ({
      id: dashboard.id,
      name: dashboard.name,
      userId: dashboard.userId,
      userEmail: dashboard.user.email,
      widgetCount: dashboard._count.container3dWidgets,
      rackCount: dashboard.container3dWidgets.reduce((total, widget) => total + widget._count.containerRacks, 0),
      isActive: dashboard.isActive,
      inUse: dashboard.inUse,
      updatedAt: dashboard.updatedAt,
    }));

    return NextResponse.json(exportList);
  } catch (error) {
    console.error("[DASHBOARDS_EXPORT_LIST_GET]", error);
    return NextResponse.json(
      { error: "Failed to load dashboard list" },
      { status: 500 }
    );
  }
}
