import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Require admin access for this endpoint
    await requireAdmin(request);

    // Get all dashboards from all users
    const allDashboards = await prisma.dashboardLayout.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role_data: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: [
        { user: { email: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Group dashboards by user for better organization
    const groupedByUser: Record<string, {
      userId: string;
      userEmail: string;
      userRole: string;
      dashboards: Array<{
        id: string;
        name: string;
        inUse: boolean;
        isActive: boolean;
        layout: any;
        createdAt: Date;
        updatedAt: Date;
        widgetCount: number;
      }>;
    }> = allDashboards.reduce((acc, dashboard) => {
      const userEmail = dashboard.user.email;
      if (!acc[userEmail]) {
        acc[userEmail] = {
          userId: dashboard.user.id,
          userEmail: dashboard.user.email,
          userRole: dashboard.user.role_data.name,
          dashboards: []
        };
      }

      // Parse layout safely
      let widgetCount = 0;
      try {
        const layoutData = JSON.parse(dashboard.layout as string);
        widgetCount = Array.isArray(layoutData) ? layoutData.length : 0;
      } catch (error) {
        console.warn(`Failed to parse layout for dashboard ${dashboard.id}:`, error);
        widgetCount = 0;
      }

      acc[userEmail].dashboards.push({
        id: dashboard.id,
        name: dashboard.name,
        inUse: dashboard.inUse,
        isActive: dashboard.isActive,
        layout: dashboard.layout,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
        widgetCount: widgetCount
      });

      return acc;
    }, {} as Record<string, any>);

    // Convert to array format
    const result = Object.values(groupedByUser);

    // Add summary statistics
    const summary = {
      totalUsers: result.length,
      totalDashboards: allDashboards.length,
      activeDashboards: allDashboards.filter(d => d.inUse).length,
      inactiveDashboards: allDashboards.filter(d => !d.inUse).length,
      totalWidgets: allDashboards.reduce((sum, d) => {
        try {
          const layoutData = JSON.parse(d.layout as string);
          return sum + (Array.isArray(layoutData) ? layoutData.length : 0);
        } catch (error) {
          return sum;
        }
      }, 0),
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json({
      summary,
      data: result
    });

  } catch (error) {
    console.error("[DASHBOARDS_ALL_GET] Error:", error);

    if (error instanceof Error && error.message.includes("Forbidden")) {
      return NextResponse.json({ message: "Forbidden - Admin access required" }, { status: 403 });
    }

    if (error instanceof Error && error.message.includes("Unauthorized")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
