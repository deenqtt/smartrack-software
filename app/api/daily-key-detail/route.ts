import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/widgets/daily-key-detail - Get daily summary for specific device key
 * Query parameters:
 * - deviceId: Device ID to filter by
 * - key: Key name to filter by
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
  const key = searchParams.get('key');
  const dateParam = searchParams.get('date');

  // Validate required parameters
  if (!deviceId) {
    return NextResponse.json({
      success: false,
      message: "deviceId parameter is required"
    }, { status: 400 });
  }

  if (!key) {
    return NextResponse.json({
      success: false,
      message: "key parameter is required"
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

    console.log(`[API] Fetching daily key detail for deviceId: ${deviceId}, key: ${key}, date: ${targetDate.toISOString().split('T')[0]}`);

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

    // Find the specific key within the device
    const keyData = deviceData.keys.find((k: any) => k.key === key);

    if (!keyData) {
      return NextResponse.json({
        success: false,
        message: `Key '${key}' not found for device ${deviceId} on date ${targetDate.toISOString().split('T')[0]}`,
      }, { status: 404 });
    }

    // Calculate trend (optional feature)
    const trend = calculateTrend(keyData.stats.lastValue, keyData.stats.avg);

    // Format response
    const response = {
      deviceId: deviceData.deviceId,
      deviceName: deviceData.deviceName,
      key: keyData.key,
      customName: keyData.customName,
      units: keyData.units,
      date: targetDate.toISOString().split('T')[0],
      stats: {
        count: keyData.stats.count,
        min: keyData.stats.min,
        max: keyData.stats.max,
        avg: keyData.stats.avg,
        lastValue: keyData.stats.lastValue,
      },
      trend: trend,
    };

    console.log(`[API] Found key detail for ${deviceId}.${key}:`, response.stats);

    return NextResponse.json({
      success: true,
      data: response,
    });

  } catch (error) {
    console.error('[API] Error fetching daily key detail:', error);

    return NextResponse.json({
      success: false,
      message: "Failed to fetch daily key detail",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500
    });
  }
}

/**
 * Helper function to calculate trend
 */
function calculateTrend(lastValue: number, avgValue: number): 'up' | 'down' | 'stable' {
  const threshold = 0.05; // 5% threshold
  const diff = (lastValue - avgValue) / Math.abs(avgValue || 1);

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
}