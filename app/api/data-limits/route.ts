import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

// Default limits configuration
const DEFAULT_LIMITS = {
  loggedData: 500000,
  alarmLog: 500000,
  alarmNotificationRecipient: 500000,
  notification: 500000,
};

// =======================================================
// GET /api/data-limits - Get current data limits and usage
// =======================================================
export async function GET(request: NextRequest) {
  try {
    // Require data-limits read permission
    await requirePermission(request, "system-config", "read");

    // Get current limits from system config
    const limitConfigs = await prisma.systemConfiguration.findMany({
      where: {
        key: {
          in: [
            "data-limit-logged-data",
            "data-limit-alarm-log",
            "data-limit-alarm-notification-recipient",
            "data-limit-notification",
          ],
        },
      },
    });

    // Parse limits or use defaults
    const limits = {
      loggedData: DEFAULT_LIMITS.loggedData,
      alarmLog: DEFAULT_LIMITS.alarmLog,
      alarmNotificationRecipient: DEFAULT_LIMITS.alarmNotificationRecipient,
      notification: DEFAULT_LIMITS.notification,
    };

    // Override with stored values
    limitConfigs.forEach((config) => {
      const value = parseInt(config.value);
      if (!isNaN(value)) {
        switch (config.key) {
          case "data-limit-logged-data":
            limits.loggedData = value;
            break;
          case "data-limit-alarm-log":
            limits.alarmLog = value;
            break;
          case "data-limit-alarm-notification-recipient":
            limits.alarmNotificationRecipient = value;
            break;
          case "data-limit-notification":
            limits.notification = value;
            break;
        }
      }
    });

    // Get current row counts
    const [
      loggedDataCount,
      alarmLogCount,
      alarmNotificationRecipientCount,
      notificationCount,
    ] = await Promise.all([
      prisma.loggedData.count(),
      prisma.alarmLog.count(),
      prisma.alarmNotificationRecipient.count(),
      prisma.notification.count(),
    ]);

    // Calculate percentages
    const usage = {
      loggedData: {
        current: loggedDataCount,
        limit: limits.loggedData,
        percentage: Math.min((loggedDataCount / limits.loggedData) * 100, 100),
        status:
          loggedDataCount >= limits.loggedData * 0.95
            ? "critical"
            : loggedDataCount >= limits.loggedData * 0.8
              ? "warning"
              : "normal",
      },
      alarmLog: {
        current: alarmLogCount,
        limit: limits.alarmLog,
        percentage: Math.min((alarmLogCount / limits.alarmLog) * 100, 100),
        status:
          alarmLogCount >= limits.alarmLog * 0.95
            ? "critical"
            : alarmLogCount >= limits.alarmLog * 0.8
              ? "warning"
              : "normal",
      },
      alarmNotificationRecipient: {
        current: alarmNotificationRecipientCount,
        limit: limits.alarmNotificationRecipient,
        percentage: Math.min(
          (alarmNotificationRecipientCount /
            limits.alarmNotificationRecipient) *
          100,
          100
        ),
        status:
          alarmNotificationRecipientCount >=
            limits.alarmNotificationRecipient * 0.95
            ? "critical"
            : alarmNotificationRecipientCount >=
              limits.alarmNotificationRecipient * 0.8
              ? "warning"
              : "normal",
      },
      notification: {
        current: notificationCount,
        limit: limits.notification,
        percentage: Math.min(
          (notificationCount / limits.notification) * 100,
          100
        ),
        status:
          notificationCount >= limits.notification * 0.95
            ? "critical"
            : notificationCount >= limits.notification * 0.8
              ? "warning"
              : "normal",
      },
    };

    return NextResponse.json({
      limits,
      usage,
      message: "Data limits retrieved successfully",
    });
  } catch (error) {
    console.error("Error getting data limits:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/data-limits - Update data limits
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    // Require data-limits update permission
    await requirePermission(request, "system-config", "update");

    const body = await request.json();
    const { loggedData, alarmLog, alarmNotificationRecipient, notification } =
      body;

    // Validate input
    const updates = [];

    if (typeof loggedData === "number" && loggedData > 0) {
      updates.push({
        key: "data-limit-logged-data",
        value: String(loggedData),
        description: "Maximum number of rows allowed in LoggedData table",
        category: "data-limits",
      });
    }

    if (typeof alarmLog === "number" && alarmLog > 0) {
      updates.push({
        key: "data-limit-alarm-log",
        value: String(alarmLog),
        description: "Maximum number of rows allowed in AlarmLog table",
        category: "data-limits",
      });
    }

    if (
      typeof alarmNotificationRecipient === "number" &&
      alarmNotificationRecipient > 0
    ) {
      updates.push({
        key: "data-limit-alarm-notification-recipient",
        value: String(alarmNotificationRecipient),
        description:
          "Maximum number of rows allowed in AlarmNotificationRecipient table",
        category: "data-limits",
      });
    }

    if (typeof notification === "number" && notification > 0) {
      updates.push({
        key: "data-limit-notification",
        value: String(notification),
        description: "Maximum number of rows allowed in Notification table",
        category: "data-limits",
      });
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No valid limit updates provided" },
        { status: 400 }
      );
    }

    // Update configurations
    const results = [];
    for (const update of updates) {
      const config = await prisma.systemConfiguration.upsert({
        where: { key: update.key },
        update: {
          value: update.value,
          description: update.description,
          category: update.category,
          updatedAt: new Date(),
        },
        create: {
          key: update.key,
          value: update.value,
          description: update.description,
          category: update.category,
        },
      });
      results.push(config);
    }

    return NextResponse.json({
      configs: results,
      message: `Updated ${results.length} data limit(s) successfully`,
    });
  } catch (error) {
    console.error("Error updating data limits:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/data-limits/cleanup - Manually trigger data cleanup
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Require data-limits update permission
    await requirePermission(request, "system-config", "update");

    const { searchParams } = new URL(request.url);
    const table = searchParams.get("table");

    // Get current limits
    const limitConfigs = await prisma.systemConfiguration.findMany({
      where: {
        key: {
          in: [
            "data-limit-logged-data",
            "data-limit-alarm-log",
            "data-limit-alarm-notification-recipient",
            "data-limit-notification",
          ],
        },
      },
    });

    const limits = { ...DEFAULT_LIMITS };
    limitConfigs.forEach((config) => {
      const value = parseInt(config.value);
      if (!isNaN(value)) {
        switch (config.key) {
          case "data-limit-logged-data":
            limits.loggedData = value;
            break;
          case "data-limit-alarm-log":
            limits.alarmLog = value;
            break;
          case "data-limit-alarm-notification-recipient":
            limits.alarmNotificationRecipient = value;
            break;
          case "data-limit-notification":
            limits.notification = value;
            break;
        }
      }
    });

    let cleanupResults: any = {};

    // Perform cleanup based on table parameter
    if (!table || table === "loggedData") {
      const currentCount = await prisma.loggedData.count();
      if (currentCount > limits.loggedData) {
        const toDelete = currentCount - limits.loggedData;
        const recordsToDelete = await prisma.loggedData.findMany({
          where: {},
          orderBy: { timestamp: "asc" },
          take: toDelete,
          select: { id: true },
        });
        const idsToDelete = recordsToDelete.map((record) => record.id);
        const deletedRecords = await prisma.loggedData.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        cleanupResults.loggedData = {
          before: currentCount,
          after: currentCount - deletedRecords.count,
          deleted: deletedRecords.count,
        };
      }
    }

    if (!table || table === "alarmLog") {
      const currentCount = await prisma.alarmLog.count();
      if (currentCount > limits.alarmLog) {
        const toDelete = currentCount - limits.alarmLog;
        // Preserve active alarms, only delete cleared ones
        const recordsToDelete = await prisma.alarmLog.findMany({
          where: {
            status: "CLEARED", // Only delete cleared alarms
          },
          orderBy: { timestamp: "asc" },
          take: toDelete,
          select: { id: true },
        });
        const idsToDelete = recordsToDelete.map((record) => record.id);
        const deletedRecords = await prisma.alarmLog.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        cleanupResults.alarmLog = {
          before: currentCount,
          after: currentCount - deletedRecords.count,
          deleted: deletedRecords.count,
        };
      }
    }

    if (!table || table === "notification") {
      const currentCount = await prisma.notification.count();
      if (currentCount > limits.notification) {
        const toDelete = currentCount - limits.notification;
        // Preserve unread notifications
        const recordsToDelete = await prisma.notification.findMany({
          where: {
            isRead: true, // Only delete read notifications
          },
          orderBy: { createdAt: "asc" },
          take: toDelete,
          select: { id: true },
        });
        const idsToDelete = recordsToDelete.map((record) => record.id);
        const deletedRecords = await prisma.notification.deleteMany({
          where: { id: { in: idsToDelete } },
        });
        cleanupResults.notification = {
          before: currentCount,
          after: currentCount - deletedRecords.count,
          deleted: deletedRecords.count,
        };
      }
    }

    return NextResponse.json({
      cleanupResults,
      message: "Data cleanup completed successfully",
    });
  } catch (error) {
    console.error("Error performing data cleanup:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
