// File: app/api/logging-configs/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

// ============================================
// GET - Fetch all logging configurations with pagination
// ============================================
export async function GET(request: Request) {
  // DEMO_MODE: Return mock logging configurations
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_LOGGING_CONFIGS } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_LOGGING_CONFIGS);
  }

  // Server-side permission check: require 'read' on 'devices' (Optional for system processes)
  const { getAuthFromCookie, getAuthFromHeader } = await import("@/lib/auth");
  const auth = (await getAuthFromCookie(request as any)) || (await getAuthFromHeader(request as any));
  if (auth) {
    await requirePermission(request, "devices", "read");
  }

  try {
    const url = new URL(request.url);

    // Pagination parameters
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(10, parseInt(url.searchParams.get('limit') || '100'))); // Max 1000, min 10
    const skip = (page - 1) * limit;

    // Filter parameters
    const deviceId = url.searchParams.get('deviceId');
    const interval = url.searchParams.get('interval');
    const status = url.searchParams.get('status'); // active/inactive
    const search = url.searchParams.get('search');

    // Build where clause
    const whereClause: any = {};
    if (deviceId) whereClause.deviceUniqId = deviceId;
    if (interval) whereClause.loggingIntervalMinutes = parseInt(interval);
    if (search) {
      whereClause.OR = [
        { customName: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { device: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }
    // Note: No status filter - logging configs are always "active"

    // Sorting parameters
    const sortBy = url.searchParams.get('sortBy') || 'customName';
    const sortOrder = url.searchParams.get('sortOrder') || 'asc';

    // Execute optimized query with pagination using transactions
    const result = await prisma.$transaction([
      prisma.loggingConfiguration.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder as 'asc' | 'desc' },
        skip: skip,
        take: limit,
        select: { // Use select instead of include for better performance
          id: true,
          customName: true,
          key: true,
          units: true,
          multiply: true,
          deviceUniqId: true,
          loggingIntervalMinutes: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.loggingConfiguration.count({ where: whereClause })
    ]);

    const [configs, totalCount] = result;

    // Batch fetch device information only after getting configs
    let devicesMap = new Map();
    if (configs.length > 0) {
      const deviceIds = [...new Set(configs.map(c => c.deviceUniqId))];
      const devices = await prisma.deviceExternal.findMany({
        where: { uniqId: { in: deviceIds } },
        select: { uniqId: true, name: true, topic: true }
      });
      devicesMap = new Map(devices.map(d => [d.uniqId, d]));
    }

    // Merge device data into configs
    const configsWithDevices = configs.map(config => ({
      ...config,
      device: devicesMap.get(config.deviceUniqId) || {
        uniqId: config.deviceUniqId,
        name: 'Unknown Device',
        topic: null
      }
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: configsWithDevices,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      meta: {
        filteredBy: {
          deviceId: deviceId || null,
          interval: interval || null,
          status: status || null
        }
      }
    });
  } catch (error) {
    console.error(
      "[API] GET /api/logging-configs: Error fetching data:",
      error
    );
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create new logging configuration
// ============================================
export async function POST(request: Request) {
  // Server-side permission check: require 'create' on 'devices' (Optional for system processes)
  const { getAuthFromCookie, getAuthFromHeader } = await import("@/lib/auth");
  const auth = (await getAuthFromCookie(request as any)) || (await getAuthFromHeader(request as any));
  if (auth) {
    await requirePermission(request, "devices", "create");
  }

  try {
    const body = await request.json();
    const {
      customName,
      key,
      units,
      multiply,
      deviceUniqId,
      loggingIntervalMinutes,
    } = body;

    // Validation: Required fields
    if (!customName || !key || !deviceUniqId) {
      console.error("[API] POST /api/logging-configs: Missing required fields");
      return NextResponse.json(
        { message: "Missing required fields: customName, key, deviceUniqId" },
        { status: 400 }
      );
    }

    // Check license limits before creating logging config
    const { canAddLoggingConfig } = await import("@/lib/license");
    const licenseCheck = await canAddLoggingConfig();
    if (!licenseCheck.allowed) {
      return NextResponse.json(
        {
          message: "Cannot create logging configuration: License limit exceeded",
          error: licenseCheck.message || "Logging config limit exceeded",
          suggestion: "Please upgrade your license or deactivate the current license and activate a higher-tier license (Type B, C, or X for unlimited)"
        },
        { status: 403 }
      );
    }

    // Validation: Check if device exists
    const deviceExists = await prisma.deviceExternal.findUnique({
      where: { uniqId: deviceUniqId },
    });

    if (!deviceExists) {
      console.error(
        `[API] POST /api/logging-configs: Device '${deviceUniqId}' not found`
      );
      return NextResponse.json(
        {
          message: `Device with ID '${deviceUniqId}' not found. Please ensure the device is registered.`,
        },
        { status: 404 }
      );
    }

    // Validation: Interval range
    if (
      loggingIntervalMinutes &&
      (loggingIntervalMinutes < 1 || loggingIntervalMinutes > 1440)
    ) {
      return NextResponse.json(
        {
          message:
            "Logging interval must be between 1 and 1440 minutes (24 hours).",
        },
        { status: 400 }
      );
    }

    // Create configuration
    const newConfig = await prisma.loggingConfiguration.create({
      data: {
        customName,
        key,
        units,
        multiply: multiply || 1,
        deviceUniqId,
        loggingIntervalMinutes: loggingIntervalMinutes || 10,
      },
      include: {
        device: {
          select: {
            uniqId: true,
            name: true,
            topic: true,
          },
        },
      },
    });

    console.log(
      `[API]  Created logging config: "${customName}" with ${loggingIntervalMinutes || 10
      }min interval`
    );

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("LOGGING");

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error: any) {
    // Handle unique constraint violation (duplicate device + key)
    if (error.code === "P2002") {
      console.warn(
        "[API] POST /api/logging-configs: Duplicate configuration detected"
      );
      return NextResponse.json(
        {
          message:
            "A configuration with this device and key combination already exists.",
        },
        { status: 409 }
      );
    }

    console.error(
      "[API] POST /api/logging-configs: Error creating configuration:",
      error
    );
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}
