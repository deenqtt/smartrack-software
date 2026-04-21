import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * POST: Import a single standard dashboard layout
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request);
    const userId = auth.userId;
    const body = await request.json();

    // Support both the "smartrack-dashboard" format and the raw export format
    const dashboardData = body.dashboard || body;
    const { name, layout, container3dWidgets } = dashboardData;

    if (!name || (!layout && !container3dWidgets)) {
      return NextResponse.json({ error: "Invalid dashboard data. Name and layout are required." }, { status: 400 });
    }

    const importTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Check if name exists for this user to avoid unique constraint error
    let finalName = `${name} (Imported ${importTime})`;
    const existing = await prisma.dashboardLayout.findFirst({
      where: { name: finalName, userId: userId }
    });
    if (existing) {
      finalName = `${name} (Imported ${importTime} - ${Math.random().toString(36).slice(2, 5)})`;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the dashboard
      const newDashboard = await tx.dashboardLayout.create({
        data: {
          name: finalName,
          layout: typeof layout === 'string' ? JSON.parse(layout) : (layout || []),
          userId: userId,
          inUse: false,
          isActive: true
        }
      });

      // Handle 3D container widgets if present in export
      if (Array.isArray(container3dWidgets)) {
        for (const widget of container3dWidgets) {
          const { id: oldId, dashboardLayoutId, containerRacks, createdAt, updatedAt, ...widgetData } = widget;

          const newWidget = await tx.container3dWidgetConfig.create({
            data: {
              ...widgetData,
              layoutId: newDashboard.id
            }
          });

          // Handle racks if present
          if (Array.isArray(containerRacks)) {
            for (const rack of containerRacks) {
              const { id: oldRackId, container3dWidgetConfigId, createdAt, updatedAt, ...rackData } = rack;
              await tx.containerRack.create({
                data: {
                  ...rackData,
                  container3dWidgetConfigId: newWidget.id
                }
              });
            }
          }
        }
      }

      return newDashboard;
    });

    return NextResponse.json({
      success: true,
      message: "Dashboard imported successfully",
      dashboardId: result.id,
      name: result.name
    });

  } catch (error: any) {
    console.error("[DASHBOARD_IMPORT_ERROR]", error);
    return NextResponse.json({ error: error.message || "Failed to import dashboard" }, { status: 500 });
  }
}
