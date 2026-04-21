import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { getDailyDeviceSummary, getAvailableSummaryDates } from "@/lib/services/daily-summary-service";

/**
 * GET /api/widgets/daily-device-summary - Get daily device summary data for widgets
 * Query parameters:
 * - date: YYYY-MM-DD format (optional, defaults to yesterday)
 * - action: 'dates' to get available dates list
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const dateParam = searchParams.get('date');

  try {
    if (action === 'dates') {
      // Get available summary dates
      const dates = await getAvailableSummaryDates(30);
      return NextResponse.json({
        success: true,
        data: dates.map(date => date.toISOString().split('T')[0]) // Return YYYY-MM-DD format
      });
    } else if (action === 'devices') {
      // Get available devices from the latest summary
      const latestDate = await getAvailableSummaryDates(1);
      if (latestDate.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      const summary = await getDailyDeviceSummary(latestDate[0]);
      if (!summary) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Extract unique devices from the summary
      const devices = summary.devices.map((device: any) => ({
        id: device.deviceId,
        name: device.deviceName
      }));

      return NextResponse.json({
        success: true,
        data: devices
      });
    } else {
      // Get summary data for specific date
      let targetDate: Date;

      if (dateParam) {
        // Parse provided date (now comes in local timezone from frontend)
        const parsedDate = new Date(dateParam + 'T00:00:00'); // Local date at midnight
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
        targetDate.setHours(0, 0, 0, 0);
      }

      const summary = await getDailyDeviceSummary(targetDate);

      if (!summary) {
        return NextResponse.json({
          success: false,
          message: `No summary data available for ${targetDate.toISOString().split('T')[0]}`,
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          date: summary.date.toISOString().split('T')[0], // Return as YYYY-MM-DD string
          deviceCount: summary.deviceCount,
          totalLogs: summary.totalLogs,
          devices: summary.devices
        }
      });
    }

  } catch (error) {
    console.error('[WIDGET-API] Error fetching daily device summary:', error);

    return NextResponse.json({
      success: false,
      message: "Failed to fetch daily device summary",
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 500
    });
  }
}