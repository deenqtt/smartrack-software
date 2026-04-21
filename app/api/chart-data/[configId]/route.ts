import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * GET /api/chart-data/[configId]?timeRange=24h&type=trend&export=csv
 * Mengambil data chart dari LoggedData berdasarkan configId dan time range
 * Support export ke CSV dan PNG
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> },
) {
  const configId = (await params).configId;
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get("timeRange") || "24h";

  // DEMO_MODE: Return generated chart data
  if (process.env.DEMO_MODE === "true") {
    const { generateDemoChartData } = await import("@/lib/demo-data");
    return NextResponse.json(generateDemoChartData(configId, timeRange));
  }

  try {
    const chartType = searchParams.get("type") || "trend";

    // Validate configId
    if (!configId) {
      return NextResponse.json(
        { message: "Config ID is required" },
        { status: 400 },
      );
    }

    // Calculate time range
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case "1h":
        startDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case "6h":
        startDate = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        break;
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Get logging configuration
    const config = await prisma.loggingConfiguration.findUnique({
      where: { id: configId },
      include: { device: true },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Logging configuration not found" },
        { status: 404 },
      );
    }

    // Dynamic data limit based on time range for optimal performance
    const getDataLimit = (timeRange: string): number => {
      switch (timeRange) {
        case "1h":
          return 100; // ~6 points (10min intervals)
        case "6h":
          return 200; // ~36 points
        case "12h":
          return 500; // ~72 points
        case "24h":
          return 1000; // ~144 points
        case "7d":
          return 2000; // ~1008 points
        case "30d":
          return 5000; // ~4320 points (with buffer)
        default:
          return 1000;
      }
    };

    const dataLimit = getDataLimit(timeRange);

    // Get logged data with dynamic limit
    let loggedData = await prisma.loggedData.findMany({
      where: {
        configId: configId,
        timestamp: {
          gte: startDate,
          lte: now,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
      take: dataLimit,
    });

    // Smart sampling for very large datasets (30d) to maintain performance
    let isSampled = false;
    let samplingRate = 1;
    const totalAvailable = loggedData.length;

    if (timeRange === "30d" && loggedData.length > 2000) {
      // Sample to ~2000 points for better performance while maintaining trend visibility
      samplingRate = Math.ceil(loggedData.length / 2000);
      loggedData = loggedData.filter((_, index) => index % samplingRate === 0);
      isSampled = true;
    }

    // Transform data based on chart type
    let chartData;

    if (chartType === "trend") {
      // Simple trend chart data
      const dataPoints = loggedData.map((entry) => ({
        timestamp: entry.timestamp.toISOString(),
        value: Number(entry.value),
      }));

      if (dataPoints.length === 0) {
        chartData = {
          current: 0,
          change: 0,
          trend: "stable",
          unit: config.units || "value",
          data: [],
          timeRange,
          message: "No data available for the selected time range",
        };
      } else {
        const current = dataPoints[dataPoints.length - 1].value;
        const previous =
          dataPoints.length > 1
            ? dataPoints[dataPoints.length - 2].value
            : current;
        const change =
          previous !== 0 ? ((current - previous) / previous) * 100 : 0;

        chartData = {
          current: Math.round(current * 100) / 100,
          change: Math.round(change * 100) / 100,
          trend: change > 0 ? "up" : change < -2 ? "down" : "stable",
          unit: config.units || "value",
          data: dataPoints.map((d) => ({
            ...d,
            value: Math.round(d.value * 100) / 100,
          })),
          timeRange,
          configName: config.customName,
          totalPoints: dataPoints.length,
          isSampled,
          samplingInfo: isSampled
            ? `Data sampled 1:${samplingRate} for performance (${totalAvailable} → ${dataPoints.length} points)`
            : null,
        };
      }
    } else if (chartType === "line") {
      // Multi-series line chart (jika diperlukan di masa depan)
      chartData = {
        series: [
          {
            name: config.customName,
            data: loggedData.map((entry) => ({
              timestamp: entry.timestamp.toISOString(),
              value: Number(entry.value),
            })),
            unit: config.units || "value",
            color: "#2563eb",
          },
        ],
        timeRange,
        configName: config.customName,
      };
    } else {
      // Default trend format
      const dataPoints = loggedData.map((entry) => ({
        timestamp: entry.timestamp.toISOString(),
        value: Number(entry.value),
      }));

      chartData = {
        data: dataPoints,
        unit: config.units || "value",
        timeRange,
        configName: config.customName,
        totalPoints: dataPoints.length,
      };
    }

    return NextResponse.json({
      success: true,
      data: chartData,
      metadata: {
        configId,
        configName: config.customName,
        deviceName: config.device?.name || "Unknown Device",
        timeRange,
        chartType,
        dataPoints: loggedData.length,
        totalAvailable: totalAvailable,
        startDate: startDate.toISOString(),
        endDate: now.toISOString(),
        isSampled,
        samplingRate,
        performance: {
          dataLimit: dataLimit,
          actualPoints: loggedData.length,
          samplingApplied: isSampled ? `1:${samplingRate}` : "none",
        },
      },
    });
  } catch (error) {
    console.error("[API] Error fetching chart data:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch chart data",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
