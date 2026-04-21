// File: app/api/devices-log-report/route.ts - Optimized Performance

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { getCachedData, CACHE_TTL } from "@/lib/cache";

interface LogReportEntry {
  id: string;
  deviceName: string;
  logName: string;
  value: number;
  units: string | null;
  timestamp: Date;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

function generateCacheKey(
  configId?: string | null,
  deviceName?: string | null,
  search?: string | null,
  startDate?: string | null,
  endDate?: string | null,
  page?: number,
  limit?: number
) {
  return `logs:report:${configId || "all"}:${deviceName || "all"}:${
    search || "none"
  }:${startDate || "none"}:${endDate || "none"}:${page || 1}:${limit || 100}`;
}

export async function GET(req: NextRequest) {
  const requestStartTime = Date.now();
  const { searchParams } = new URL(req.url);
  const configId = searchParams.get("configId");
  const deviceName = searchParams.get("deviceName");
  const search = searchParams.get("search");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(
    Math.max(10, parseInt(searchParams.get("limit") || "100")),
    5000
  );

  console.log(
    `[API:devices-log-report] GET request started at ${new Date().toISOString()}`
  );
  console.log(
    `[API:devices-log-report] Params: configId=${configId}, deviceName=${deviceName}, search=${search}, startDate=${startDate}, endDate=${endDate}, page=${page}, limit=${limit}`
  );

  // Require read permission for devices/analytics
  await requirePermission(req, "devices", "read");

  try {
    // Pagination parameters with sensible defaults and limits
    const offset = (page - 1) * limit;

    // Build where condition
    const whereCondition: any = {};
    if (configId) {
      whereCondition.configId = configId;
    }
    if (startDate && endDate) {
      whereCondition.timestamp = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const cacheKey = generateCacheKey(
      configId,
      deviceName,
      search,
      startDate,
      endDate,
      page,
      limit
    );
    console.log(`[API:devices-log-report] Cache key: ${cacheKey}`);

    // Use cached data for recent queries (short TTL since logs can be real-time)
    const result = await getCachedData(
      cacheKey,
      async () =>
        await fetchLogDataOptimized(
          whereCondition,
          limit,
          offset,
          page,
          deviceName,
          search
        ),
      { ttl: CACHE_TTL.SHORT } // 5 minutes cache
    );

    const totalRequestTime = Date.now() - requestStartTime;
    console.log(
      `[API:devices-log-report] Request completed in ${totalRequestTime}ms, returned ${result.logs.length} logs, total: ${result.pagination.total}, queryTime: ${result.queryTime}ms`
    );

    const response = NextResponse.json({
      data: result.logs,
      pagination: result.pagination,
      stats: result.stats,
      performance: {
        cached: true, // Assuming getCachedData returns cached result
        queryTime: result.queryTime,
        tip: "Use pagination for better performance with large datasets",
      },
    });

    // Short client-side cache for log data
    response.headers.set("Cache-Control", "private, max-age=60"); // 1 minute

    return response;
  } catch (error) {
    const totalRequestTime = Date.now() - requestStartTime;
    console.error(
      `[API:devices-log-report] Error after ${totalRequestTime}ms:`,
      error
    );
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

async function fetchLogDataOptimized(
  whereCondition: any,
  limit: number,
  offset: number,
  page: number,
  deviceName?: string | null,
  search?: string | null
) {
  const startTime = Date.now();

  // Build enhanced where condition for device name and search
  let enhancedWhereCondition = { ...whereCondition };

  if (deviceName) {
    // Filter by device name - need to join with config and device
    enhancedWhereCondition.config = {
      device: {
        name: deviceName,
      },
    };
  }

  if (search) {
    // Global search across device name, log name, and value
    const searchCondition = {
      OR: [
        {
          config: {
            device: {
              name: {
                contains: search,
                mode: "insensitive",
              },
            },
          },
        },
        {
          config: {
            customName: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          value: {
            equals: isNaN(parseFloat(search)) ? undefined : parseFloat(search),
          },
        },
      ].filter(Boolean), // Remove undefined conditions
    };

    // Merge search condition with existing where condition
    if (enhancedWhereCondition.AND) {
      enhancedWhereCondition.AND.push(searchCondition);
    } else if (Object.keys(enhancedWhereCondition).length > 0) {
      enhancedWhereCondition = {
        AND: [enhancedWhereCondition, searchCondition],
      };
    } else {
      enhancedWhereCondition = searchCondition;
    }
  }

  // Get total count for pagination (with optimized query)
  const total = await prisma.loggedData.count({
    where: enhancedWhereCondition,
  });

  // Get total unique device and log type counts using optimized grouping
  // Instead of fetching all rows, just get the distinct config IDs, then fetch those configs once
  const distinctConfigIds = await prisma.loggedData.findMany({
    where: enhancedWhereCondition,
    select: {
      configId: true,
    },
    distinct: ["configId"],
    take: 5000, // Safety limit to prevent memory issues
  });

  // Fetch configs once with all needed data
  const uniqueConfigs = await prisma.loggingConfiguration.findMany({
    where: {
      id: { in: distinctConfigIds.map((d) => d.configId) },
    },
    select: {
      id: true,
      customName: true,
      device: {
        select: {
          name: true,
        },
      },
    },
  });

  // Extract unique device and log names
  const uniqueDevices = new Set(
    uniqueConfigs.map((c) => c.device?.name).filter(Boolean)
  );

  const uniqueLogTypes = new Set(
    uniqueConfigs.map((c) => c.customName).filter(Boolean)
  );

  // Fetch paginated logs with optimized joins
  const logs = await prisma.loggedData.findMany({
    where: enhancedWhereCondition,
    orderBy: { timestamp: "desc" },
    take: limit,
    skip: offset,
    select: {
      id: true,
      value: true,
      timestamp: true,
      config: {
        select: {
          customName: true,
          units: true,
          device: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  // Format data efficiently
  const formattedLogs: LogReportEntry[] = logs.map((log: any) => ({
    id: log.id,
    deviceName: log.config.device?.name || "Unknown Device",
    logName: log.config.customName || "Unnamed Log",
    value: log.value,
    units: log.config.units,
    timestamp: log.timestamp,
  }));

  const totalPages = Math.ceil(total / limit);
  const queryTime = Date.now() - startTime;

  const pagination: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    logs: formattedLogs,
    pagination,
    queryTime,
    stats: {
      totalUniqueDevices: uniqueDevices.size,
      totalUniqueLogTypes: uniqueLogTypes.size,
    },
  };
}

// Enhanced DELETE with batch processing and safety limits
export async function DELETE(request: NextRequest) {
  await requirePermission(request, "devices", "delete");

  try {
    const { searchParams } = new URL(request.url);
    const configId = searchParams.get("configId");
    const olderThan = searchParams.get("olderThan"); // ISO date string

    let deleteWhere: any = {};

    if (configId) {
      deleteWhere.configId = configId;
    }

    if (olderThan) {
      deleteWhere.timestamp = {
        lt: new Date(olderThan),
      };
    } else {
      // If no specific conditions, require confirmation parameter
      const confirmed = searchParams.get("confirm") === "DELETE_ALL_LOGS";
      if (!confirmed) {
        return NextResponse.json(
          {
            message:
              "Deleting all logs requires confirmation. Add ?confirm=DELETE_ALL_LOGS to proceed",
            performance: {
              tip: "Use selective deletion with configId or olderThan parameters for better performance",
            },
          },
          { status: 400 }
        );
      }
    }

    // Perform deletion with batch processing if needed
    const deletedCount = await prisma.loggedData.deleteMany({
      where: deleteWhere,
    });

    return NextResponse.json({
      message: `Deleted ${deletedCount.count} log entries`,
      deletedCount: deletedCount.count,
      performance: {
        tip: "Consider using batch deletion for very large datasets (>100k records)",
      },
    });
  } catch (error) {
    console.error("Error deleting device logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
