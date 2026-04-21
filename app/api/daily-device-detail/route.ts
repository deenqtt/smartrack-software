import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/widgets/daily-device-detail - Get daily summary for specific device
 * Query parameters:
 * - deviceId: Device ID to filter by
 * - date: Date in YYYY-MM-DD format (optional, defaults to yesterday)
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Require widget access permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "widgets", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get('deviceId');
  const dateParam = searchParams.get('date');

  // Validate required parameters
  if (!deviceId) {
    return NextResponse.json({
      success: false,
      message: "deviceId parameter is required"
    }, { status: 400 });
  }

  try {
    // Parse and validate date
    let targetDate: Date;
    if (dateParam) {
      // Parse as local date (same as how data is stored in generate-yesterday-summary.js)
      const parsedDate = new Date(dateParam + 'T00:00:00');
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format."
        }, { status: 400 });
      }
      targetDate = parsedDate;
    } else {
      // Default to yesterday
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      targetDate.setHours(0, 0, 0, 0); // Local date at midnight (same as storage)
    }

    console.log(`[API] Fetching daily device detail for deviceId: ${deviceId}, date: ${targetDate.toISOString().split('T')[0]}`);

    // Query daily device summary
    const summary = await prisma.dailyDeviceSummary.findUnique({
      where: {
        date: targetDate,
      },
    });

    if (!summary) {
      return NextResponse.json({
        success: false,
        message: `No summary data found for date ${targetDate.toISOString().split('T')[0]}`,
      }, { status: 404 });
    }

    // Parse devices JSON and find the specific device
    const devices = summary.devices as any[];
    const deviceData = devices.find((device: any) => device.deviceId === deviceId);

    if (!deviceData) {
      return NextResponse.json({
        success: false,
        message: `Device ${deviceId} not found in summary for date ${targetDate.toISOString().split('T')[0]}`,
      }, { status: 404 });
    }

    // Format response
    const response = {
      deviceId: deviceData.deviceId,
      deviceName: deviceData.deviceName,
      date: targetDate.toISOString().split('T')[0],
      topic: deviceData.topic,
      keys: deviceData.keys.map((key: any) => ({
        key: key.key,
        customName: key.customName,
        units: key.units,
        stats: {
          count: key.stats.count,
          min: key.stats.min,
          max: key.stats.max,
          avg: key.stats.avg,
          lastValue: key.stats.lastValue,
        },
      })),
    };

    console.log(`[API] Found ${response.keys.length} keys for device ${deviceId}`);

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('[API] Error fetching daily device detail:', error);

    return NextResponse.json({
      success: false,
      message: "Failed to fetch daily device detail",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500
    });
  }
}