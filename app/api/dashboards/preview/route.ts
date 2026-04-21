import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

interface DashboardImportData {
  name: string;
  layout: any;
  userEmail: string;
  container3dWidgets?: Array<{
    customName: string;
    totalRack?: number;
    coolingRacks?: any;
    frontTopics?: any;
    backTopics?: any;
    powerTopic?: string;
    gridX?: number;
    gridY?: number;
    gridWidth?: number;
    gridHeight?: number;
  }>;
}

interface DashboardPreviewItem {
  data: DashboardImportData;
  status: 'valid' | 'duplicate_name' | 'user_not_found' | 'invalid_devices' | 'missing_required';
  conflictInfo?: {
    existingDashboardName?: string;
    userNotFound?: string;
  };
  warnings: {
    devicesNotFound: string[];
    devicesDuplicates: string[];
  };
  relatedItems: {
    createdUser: boolean;
    updatedUser: boolean;
    devicesCreated: number;
    devicesUpdated: number;
    widgetsCreated: number;
  };
}

interface DashboardPreviewResult {
  total: number;
  valid: number;
  dashboards: DashboardPreviewItem[];
  summary: {
    totalDevices: number;
    totalWidgets: number;
    usersToImport: string[];
    devicesToImport: string[];
  };
}

/**
 * POST: Preview dashboard import data with conflict detection and dependency analysis
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require dashboard-management:create permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "create");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Expected array of dashboard objects" },
        { status: 400 }
      );
    }

    const dashboards: DashboardImportData[] = body;

    if (dashboards.length === 0) {
      return NextResponse.json(
        { error: "No dashboards to preview" },
        { status: 400 }
      );
    }

    // Get existing data for conflict checking
    const [existingDashboards, existingUsers, existingDevices] = await Promise.all([
      prisma.dashboardLayout.findMany({
        select: { name: true, userId: true }
      }),
      prisma.user.findMany({
        select: { email: true, id: true }
      }),
      prisma.deviceExternal.findMany({
        select: { topic: true, uniqId: true, name: true }
      })
    ]);

    // Create lookup maps
    const dashboardNameMap = new Map(
      existingDashboards.map(d => [d.name + '|' + d.userId, true])
    );
    const userEmailMap = new Map(
      existingUsers.map(u => [u.email, { id: u.id }])
    );
    const deviceTopicMap = new Map(
      existingDevices.map(d => [d.topic, d])
    );
    const deviceUniqIdMap = new Map(
      existingDevices.map(d => [d.uniqId, d])
    );

    const result: DashboardPreviewResult = {
      total: dashboards.length,
      valid: 0,
      dashboards: [],
      summary: {
        totalDevices: 0,
        totalWidgets: 0,
        usersToImport: [],
        devicesToImport: [],
      }
    };

    // Track unique users and devices across all dashboards
    const uniqueUsers = new Set<string>();
    const uniqueDevices = new Set<string>();

    for (const dashboard of dashboards) {
      console.log('🔍 Processing dashboard:', dashboard.name);
      console.log('📊 Layout array length:', Array.isArray(dashboard.layout) ? dashboard.layout.length : 'Not an array');

      const previewItem: DashboardPreviewItem = {
        data: dashboard,
        status: 'valid',
        warnings: {
          devicesNotFound: [],
          devicesDuplicates: [],
        },
        relatedItems: {
          createdUser: false,
          updatedUser: false,
          devicesCreated: 0,
          devicesUpdated: 0,
          widgetsCreated: 0,
        }
      };

      // Validate required fields
      if (!dashboard.name || !dashboard.layout || !dashboard.userEmail) {
        previewItem.status = 'missing_required';
        result.dashboards.push(previewItem);
        continue;
      }

      // Check dashboard name conflict for this user
      const dashboardKey = dashboard.name + '|' + (userEmailMap.get(dashboard.userEmail)?.id || 'unknown');
      if (dashboardNameMap.has(dashboardKey)) {
        previewItem.status = 'duplicate_name';
        previewItem.conflictInfo = { existingDashboardName: dashboard.name };
      }

      // Check user existence
      const existingUser = userEmailMap.get(dashboard.userEmail);
      if (!existingUser) {
        previewItem.status = 'user_not_found';
        previewItem.conflictInfo = { userNotFound: dashboard.userEmail };
        previewItem.relatedItems.createdUser = true;
        uniqueUsers.add(dashboard.userEmail);
      } else {
        previewItem.relatedItems.updatedUser = false; // Users are not updated in import
      }

      // Analyze layout dependencies (JSON array with device references)
      let layoutWidgetCount = 0;
      if (dashboard.layout && Array.isArray(dashboard.layout)) {
        layoutWidgetCount = dashboard.layout.length; // Count total widgets in layout array

        const layoutDeviceRefs = new Set<string>();

        for (const layoutItem of dashboard.layout) {
          if (layoutItem.config && layoutItem.config.deviceUniqId) {
            layoutDeviceRefs.add(layoutItem.config.deviceUniqId);
          }
        }

        // Check device availability for layout widgets
        layoutDeviceRefs.forEach(deviceId => {
          if (deviceUniqIdMap.has(deviceId)) {
            previewItem.warnings.devicesDuplicates.push(deviceId);
            previewItem.relatedItems.devicesUpdated++;
          } else {
            previewItem.warnings.devicesNotFound.push(deviceId);
            previewItem.relatedItems.devicesCreated++;
            uniqueDevices.add(deviceId);
          }
        });

        // Set widget count for this dashboard (total widgets in layout)
        previewItem.relatedItems.widgetsCreated = dashboard.layout.length;

        // Add to total widget count (individual dashboard widget counts)
        result.summary.totalWidgets += dashboard.layout.length;
      }

      // Analyze widget dependencies (3D container widgets)
      if (dashboard.container3dWidgets) {
        const deviceRefs = new Set<string>();

        for (const widget of dashboard.container3dWidgets) {
          // Extract device topics from various widget properties
          const topicsToCheck: string[] = [];

          // Front topics
          if (widget.frontTopics && Array.isArray(widget.frontTopics)) {
            widget.frontTopics.forEach(topic => {
              if (typeof topic === 'string') topicsToCheck.push(topic);
            });
          }

          // Back topics
          if (widget.backTopics && Array.isArray(widget.backTopics)) {
            widget.backTopics.forEach(topic => {
              if (typeof topic === 'string') topicsToCheck.push(topic);
            });
          }

          // Power topic
          if (widget.powerTopic && typeof widget.powerTopic === 'string') {
            topicsToCheck.push(widget.powerTopic);
          }

          // Check each topic
          topicsToCheck.forEach(topic => {
            if (topic.trim()) {
              deviceRefs.add(topic.trim());
            }
          });
        }

        // Check device availability for 3D container widgets
        deviceRefs.forEach(topic => {
          if (deviceTopicMap.has(topic)) {
            previewItem.warnings.devicesDuplicates.push(topic);
            previewItem.relatedItems.devicesUpdated++;
          } else {
            previewItem.warnings.devicesNotFound.push(topic);
            previewItem.relatedItems.devicesCreated++;
            uniqueDevices.add(topic);
          }
        });

        // Note: container3dWidgets are 3D rack components, not layout widgets - don't add to widget count
      }

      // Determine final status
      if (previewItem.status === 'valid' &&
          (previewItem.warnings.devicesNotFound.length > 0 ||
           previewItem.warnings.devicesDuplicates.length > 0)) {
        previewItem.status = 'invalid_devices';
      }

      if (previewItem.status === 'valid') {
        result.valid++;
      }

      result.dashboards.push(previewItem);
    }

    // Update summary
    result.summary.usersToImport = Array.from(uniqueUsers);
    result.summary.devicesToImport = Array.from(uniqueDevices);
    result.summary.totalDevices = uniqueDevices.size;

    return NextResponse.json(result);

  } catch (error) {
    console.error("[DASHBOARDS_PREVIEW_POST]", error);
    return NextResponse.json(
      { error: "Failed to preview dashboard import" },
      { status: 500 }
    );
  }
}
