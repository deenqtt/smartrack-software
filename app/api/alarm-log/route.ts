// File: app/api/alarm-log/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar
import { requirePermission } from "@/lib/auth";

// =======================================================
// HANDLER UNTUK GET (Mengambil semua log alarm dengan pagination)
// =======================================================
export async function GET(req: Request) {
  // DEMO_MODE: Return mock alarm logs
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_ALARM_LOGS } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_ALARM_LOGS);
  }

  // Require read permission for alarm logs
  await requirePermission(req, "alarms", "read");

  try {
    // Parse query parameters for pagination
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(10, parseInt(url.searchParams.get('limit') || '100'))); // Max 1000 per page, min 10

    const skip = (page - 1) * limit;

    // Parse filter parameters
    const status = url.searchParams.get('status'); // active, cleared, ack
    const type = url.searchParams.get('type'); // alarm type filter
    const deviceId = url.searchParams.get('deviceId');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');

    // Build where clause for filters
    // Map lowercase/shorthand status to Prisma enum values (ACTIVE, ACKNOWLEDGED, CLEARED)
    const statusEnumMap: Record<string, string> = {
      active: 'ACTIVE',
      acknowledged: 'ACKNOWLEDGED',
      ack: 'ACKNOWLEDGED',
      cleared: 'CLEARED',
    };
    const whereClause: any = {};
    if (status && status !== 'all') {
      whereClause.status = statusEnumMap[status.toLowerCase()] ?? status.toUpperCase();
    }

    // Handle alarm config filters
    const alarmConfigFilters: any = {};
    if (type && type !== 'all') alarmConfigFilters.alarmType = type;
    if (deviceId) alarmConfigFilters.deviceUniqId = deviceId;

    if (Object.keys(alarmConfigFilters).length > 0) {
      whereClause.alarmConfig = alarmConfigFilters;
    }

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    // Execute query with pagination and optimized joins
    // Use transaction to ensure atomicity and better performance
    const result = await prisma.$transaction([
      // Get paginated data with only essential fields
      prisma.alarmLog.findMany({
        where: whereClause,
        orderBy: { timestamp: "desc" },
        take: limit,
        skip: skip,
        select: { // Use select instead of include for better performance
          id: true,
          status: true,
          timestamp: true,
          triggeringValue: true,
          clearedAt: true,
          alarmConfig: {
            select: {
              customName: true,
              alarmType: true,
              deviceUniqId: true, // Store device reference instead of full object
            },
          },
        },
      }),
      // Get total count for pagination metadata
      prisma.alarmLog.count({ where: whereClause })
    ]);

    const [logs, totalCount] = result;

    // Cache device names to avoid repeated lookups
    const deviceNamesMap = new Map<string, string>();

    if (logs.length > 0) {
      // Get unique device IDs
      const deviceIds = [...new Set(logs.map(log => log.alarmConfig.deviceUniqId))];

      // Fetch device names in batch
      const devices = await prisma.deviceExternal.findMany({
        where: { uniqId: { in: deviceIds } },
        select: { uniqId: true, name: true }
      });

      devices.forEach(device => {
        deviceNamesMap.set(device.uniqId, device.name || "Unknown Device");
      });
    }

    // Ubah struktur data agar lebih mudah digunakan di frontend
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      // Ambil nama dari device cache, berikan fallback jika tidak ada
      deviceName: deviceNamesMap.get(log.alarmConfig.deviceUniqId) || "Unknown Device",
      alarmName: log.alarmConfig.customName,
      alarmType: log.alarmConfig.alarmType,
      status: log.status,
      timestamp: log.timestamp,
      triggeringValue: log.triggeringValue,
      clearedAt: log.clearedAt,
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      data: formattedLogs,
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
          status: status || null,
          type: type || null,
          deviceId: deviceId || null,
          dateRange: startDate || endDate ? { startDate, endDate } : null
        }
      }
    });
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("Error fetching alarm logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK DELETE (Menghapus SEMUA log alarm)
// =======================================================
export async function DELETE(req: Request) {
  // Require delete permission for alarm logs
  await requirePermission(req, "alarms", "delete");

  try {
    await prisma.alarmLog.deleteMany({});
    return new NextResponse(null, { status: 204 }); // 204 No Content, artinya sukses
  } catch (error) {
    console.error("Error deleting all alarm logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
