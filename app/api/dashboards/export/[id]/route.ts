import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET: Export single dashboard with complete relations (widgets, racks, devices, user info)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { id } = await params;

    // Get dashboard with all relations
    const dashboard = await prisma.dashboardLayout.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            roleId: true,
          },
        },
        container3dWidgets: {
          include: {
            containerRacks: true,
          },
        },
      },
    });

    if (!dashboard) {
      return NextResponse.json(
        { error: "Dashboard not found" },
        { status: 404 }
      );
    }

    // Extract all device uniqIds used in dashboard layout
    const deviceUniqIds = new Set<string>();

    try {
      // Parse dashboard layout JSON to extract device uniqIds
      const layoutData = JSON.parse(dashboard.layout as string);

      // Recursively find all deviceUniqId in the layout
      const extractDeviceUniqIds = (obj: any) => {
        if (typeof obj === 'object' && obj !== null) {
          // Check if this object has deviceUniqId property
          if (obj.deviceUniqId && typeof obj.deviceUniqId === 'string') {
            deviceUniqIds.add(obj.deviceUniqId.trim());
          }

          // Recursively check all properties
          Object.values(obj).forEach(value => {
            if (typeof value === 'object' && value !== null) {
              extractDeviceUniqIds(value);
            } else if (Array.isArray(value)) {
              value.forEach(item => extractDeviceUniqIds(item));
            }
          });
        } else if (Array.isArray(obj)) {
          obj.forEach(item => extractDeviceUniqIds(item));
        }
      };

      extractDeviceUniqIds(layoutData);
    } catch (error) {
      console.error('Error parsing dashboard layout:', error);
      // Fallback to widget topics if layout parsing fails
      dashboard.container3dWidgets.forEach(widget => {
        if (widget.frontTopics && Array.isArray(widget.frontTopics)) {
          widget.frontTopics.forEach((topic: any) => {
            if (typeof topic === 'string' && topic.trim()) {
              deviceUniqIds.add(topic.trim());
            }
          });
        }
        if (widget.backTopics && Array.isArray(widget.backTopics)) {
          widget.backTopics.forEach((topic: any) => {
            if (typeof topic === 'string' && topic.trim()) {
              deviceUniqIds.add(topic.trim());
            }
          });
        }
        if (widget.powerTopic && typeof widget.powerTopic === 'string') {
          deviceUniqIds.add(widget.powerTopic.trim());
        }
      });
    }

    // Get all related devices by uniqId
    const relatedDevices = await prisma.deviceExternal.findMany({
      where: {
        uniqId: {
          in: Array.from(deviceUniqIds)
        }
      },
      select: {
        id: true,
        uniqId: true,
        name: true,
        topic: true,
        address: true,
      },
    });

    // Transform data for export
    const exportData = {
      dashboard: {
        id: dashboard.id,
        name: dashboard.name,
        layout: dashboard.layout,
        userId: dashboard.userId,
        createdAt: dashboard.createdAt,
        updatedAt: dashboard.updatedAt,
        inUse: dashboard.inUse,
        isActive: dashboard.isActive,
      },
      user: dashboard.user,
      container3dWidgets: dashboard.container3dWidgets.map(widget => ({
        id: widget.id,
        dashboardLayoutId: widget.layoutId,
        customName: widget.customName,
        totalRack: widget.totalRack,
        coolingRacks: widget.coolingRacks,
        frontTopics: widget.frontTopics,
        backTopics: widget.backTopics,
        powerTopic: widget.powerTopic,
        gridX: widget.gridX,
        gridY: widget.gridY,
        gridWidth: widget.gridWidth,
        gridHeight: widget.gridHeight,
        createdAt: widget.createdAt,
        updatedAt: widget.updatedAt,
      })),
      containerRacks: dashboard.container3dWidgets.flatMap(widget =>
        widget.containerRacks.map(rack => ({
          id: rack.id,
          container3dWidgetConfigId: rack.container3dWidgetConfigId,
          rackNumber: rack.rackNumber,
          servers: rack.servers,
          createdAt: rack.createdAt,
          updatedAt: rack.updatedAt,
        }))
      ),
      relatedDevices: relatedDevices,
    };

    // Create JSON response for download
    const jsonData = JSON.stringify(exportData, null, 2);
    const filename = `dashboard-export-${dashboard.name.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error("[DASHBOARDS_EXPORT_GET]", error);
    return NextResponse.json(
      { error: "Failed to export dashboard" },
      { status: 500 }
    );
  }
}
