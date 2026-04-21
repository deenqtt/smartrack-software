import { prisma } from "@/lib/prisma";
import { loggers } from "../logger";

// Default limits configuration
const DEFAULT_LIMITS = {
  loggedData: 100000,
  alarmLog: 50000,
  alarmNotificationRecipient: 1000,
  notification: 10000,
};

export interface DataLimits {
  loggedData: number;
  alarmLog: number;
  alarmNotificationRecipient: number;
  notification: number;
}

export interface CleanupResult {
  table: string;
  before: number;
  after: number;
  deleted: number;
  success: boolean;
  error?: string;
}

/**
 * Get current data limits from system configuration
 */
export async function getDataLimits(): Promise<DataLimits> {
  try {
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

    // Override with stored values
    limitConfigs.forEach((config: any) => {
      const value = parseInt(config.value);
      if (!isNaN(value) && value > 0) {
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

    return limits;
  } catch (error) {
    loggers.cleanup.error("Error getting data limits:", error);
    return { ...DEFAULT_LIMITS };
  }
}

/**
 * Update data limits in system configuration
 */
export async function updateDataLimits(
  limits: Partial<DataLimits>
): Promise<boolean> {
  try {
    const updates = [];

    if (typeof limits.loggedData === "number" && limits.loggedData > 0) {
      updates.push({
        key: "data-limit-logged-data",
        value: String(limits.loggedData),
        description: "Maximum number of rows allowed in LoggedData table",
        category: "data-limits",
      });
    }

    if (typeof limits.alarmLog === "number" && limits.alarmLog > 0) {
      updates.push({
        key: "data-limit-alarm-log",
        value: String(limits.alarmLog),
        description: "Maximum number of rows allowed in AlarmLog table",
        category: "data-limits",
      });
    }

    if (
      typeof limits.alarmNotificationRecipient === "number" &&
      limits.alarmNotificationRecipient > 0
    ) {
      updates.push({
        key: "data-limit-alarm-notification-recipient",
        value: String(limits.alarmNotificationRecipient),
        description:
          "Maximum number of rows allowed in AlarmNotificationRecipient table",
        category: "data-limits",
      });
    }

    if (typeof limits.notification === "number" && limits.notification > 0) {
      updates.push({
        key: "data-limit-notification",
        value: String(limits.notification),
        description: "Maximum number of rows allowed in Notification table",
        category: "data-limits",
      });
    }

    // Update configurations
    for (const update of updates) {
      await prisma.systemConfiguration.upsert({
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
    }

    return true;
  } catch (error) {
    loggers.cleanup.error("Error updating data limits:", error);
    return false;
  }
}

/**
 * Get current usage statistics for all tables
 */
export async function getDataUsage() {
  try {
    const limits = await getDataLimits();

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

    // Calculate percentages and status
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

    return {
      limits,
      usage,
    };
  } catch (error) {
    loggers.cleanup.error("Error getting data usage:", error);
    throw error;
  }
}

/**
 * Clean up LoggedData table (FIFO - First In, First Out)
 */
export async function cleanupLoggedData(
  limit?: number
): Promise<CleanupResult> {
  try {
    const limits = await getDataLimits();
    const targetLimit = limit || limits.loggedData;

    const currentCount = await prisma.loggedData.count();

    if (currentCount <= targetLimit) {
      return {
        table: "LoggedData",
        before: currentCount,
        after: currentCount,
        deleted: 0,
        success: true,
      };
    }

    const toDelete = currentCount - targetLimit;

    // FIND THE CUTOFF TIMESTAMP (Efficient range deletion)
    const cutoffRecord = await prisma.loggedData.findFirst({
      where: {},
      orderBy: { timestamp: "asc" },
      skip: toDelete - 1, // Get the newest record that should be deleted
      select: { timestamp: true },
    });

    if (!cutoffRecord) {
      return {
        table: "LoggedData",
        before: currentCount,
        after: currentCount,
        deleted: 0,
        success: true,
      };
    }

    // Batch deletion to prevent table locking
    const BATCH_SIZE = 5000;
    let totalDeleted = 0;
    let hasMore = true;

    while (hasMore) {
      const recordsToDelete = await prisma.loggedData.findMany({
        where: { timestamp: { lte: cutoffRecord.timestamp } },
        select: { id: true },
        take: BATCH_SIZE,
      });

      if (recordsToDelete.length === 0) {
        hasMore = false;
        break;
      }

      const ids = recordsToDelete.map(r => r.id);
      const deletedBatch = await prisma.loggedData.deleteMany({
        where: { id: { in: ids } },
      });

      totalDeleted += deletedBatch.count;

      // Small delay to let other queries execute if needed
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return {
      table: "LoggedData",
      before: currentCount,
      after: currentCount - totalDeleted,
      deleted: totalDeleted,
      success: true,
    };
  } catch (error) {
    loggers.cleanup.error("Error cleaning up LoggedData:", error);
    return {
      table: "LoggedData",
      before: 0,
      after: 0,
      deleted: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clean up AlarmLog table (Preserve active alarms)
 */
export async function cleanupAlarmLog(limit?: number): Promise<CleanupResult> {
  try {
    const limits = await getDataLimits();
    const targetLimit = limit || limits.alarmLog;

    const currentCount = await prisma.alarmLog.count();

    if (currentCount <= targetLimit) {
      return {
        table: "AlarmLog",
        before: currentCount,
        after: currentCount,
        deleted: 0,
        success: true,
      };
    }

    const toDelete = currentCount - targetLimit;

    // 1. Delete CLEARED alarms (FIFO based on count)
    const cutoffCleared = await prisma.alarmLog.findFirst({
      where: { status: "CLEARED" },
      orderBy: { timestamp: "asc" },
      skip: Math.max(0, toDelete - 1),
      select: { timestamp: true },
    });

    let deletedRecordsCount = 0;
    const BATCH_SIZE = 5000;

    if (cutoffCleared) {
      let hasMore = true;
      while (hasMore) {
        const recordsToDelete = await prisma.alarmLog.findMany({
          where: {
            status: "CLEARED",
            timestamp: { lte: cutoffCleared.timestamp },
          },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (recordsToDelete.length === 0) {
          hasMore = false;
          break;
        }

        const ids = recordsToDelete.map(r => r.id);
        const deletedBatch = await prisma.alarmLog.deleteMany({
          where: { id: { in: ids } },
        });

        deletedRecordsCount += deletedBatch.count;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // If we still need to delete more, delete oldest ACKNOWLEDGED alarms
    let additionalDeleted = 0;
    if (deletedRecordsCount < toDelete) {
      const remainingToDelete = toDelete - deletedRecordsCount;
      const cutoffAck = await prisma.alarmLog.findFirst({
        where: {
          status: "ACKNOWLEDGED",
        },
        orderBy: { timestamp: "asc" },
        skip: Math.max(0, remainingToDelete - 1),
        select: { timestamp: true },
      });

      if (cutoffAck) {
        let hasMoreAck = true;
        while (hasMoreAck) {
          const recordsToDelete = await prisma.alarmLog.findMany({
            where: {
              status: "ACKNOWLEDGED",
              timestamp: { lte: cutoffAck.timestamp },
            },
            select: { id: true },
            take: BATCH_SIZE,
          });

          if (recordsToDelete.length === 0) {
            hasMoreAck = false;
            break;
          }

          const ids = recordsToDelete.map(r => r.id);
          const deletedBatch = await prisma.alarmLog.deleteMany({
            where: { id: { in: ids } },
          });

          additionalDeleted += deletedBatch.count;
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }

    const totalDeleted = deletedRecordsCount + additionalDeleted;

    return {
      table: "AlarmLog",
      before: currentCount,
      after: currentCount - totalDeleted,
      deleted: totalDeleted,
      success: true,
    };
  } catch (error) {
    loggers.cleanup.error("Error cleaning up AlarmLog:", error);
    return {
      table: "AlarmLog",
      before: 0,
      after: 0,
      deleted: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Clean up Notification table (Preserve unread notifications)
 */
export async function cleanupNotification(
  limit?: number
): Promise<CleanupResult> {
  try {
    const limits = await getDataLimits();
    const targetLimit = limit || limits.notification;

    const currentCount = await prisma.notification.count();

    if (currentCount <= targetLimit) {
      return {
        table: "Notification",
        before: currentCount,
        after: currentCount,
        deleted: 0,
        success: true,
      };
    }

    const toDelete = currentCount - targetLimit;

    // Only delete read notifications (FIFO range)
    const cutoffRead = await prisma.notification.findFirst({
      where: { isRead: true },
      orderBy: { createdAt: "asc" },
      skip: toDelete - 1,
      select: { createdAt: true },
    });

    let deletedCount = 0;
    const BATCH_SIZE = 5000;

    if (cutoffRead) {
      let hasMore = true;
      while (hasMore) {
        const recordsToDelete = await prisma.notification.findMany({
          where: {
            isRead: true,
            createdAt: { lte: cutoffRead.createdAt },
          },
          select: { id: true },
          take: BATCH_SIZE,
        });

        if (recordsToDelete.length === 0) {
          hasMore = false;
          break;
        }

        const ids = recordsToDelete.map(r => r.id);
        const deletedBatch = await prisma.notification.deleteMany({
          where: { id: { in: ids } },
        });

        deletedCount += deletedBatch.count;
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    return {
      table: "Notification",
      before: currentCount,
      after: currentCount - deletedCount,
      deleted: deletedCount,
      success: true,
    };
  } catch (error) {
    loggers.cleanup.error("Error cleaning up Notification:", error);
    return {
      table: "Notification",
      before: 0,
      after: 0,
      deleted: 0,
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Perform cleanup for all tables
 */
export async function cleanupAllTables(): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];

  // Run cleanups in parallel for better performance
  const [loggedDataResult, alarmLogResult, notificationResult] =
    await Promise.all([
      cleanupLoggedData(),
      cleanupAlarmLog(),
      cleanupNotification(),
    ]);

  results.push(loggedDataResult, alarmLogResult, notificationResult);

  return results;
}

/**
 * Scheduled cleanup function (can be called by cron job)
 */
export async function scheduledCleanup(): Promise<{
  results: CleanupResult[];
  timestamp: Date;
  duration: number;
}> {
  const startTime = Date.now();

  try {
    loggers.cleanup.info("Starting scheduled cleanup...");

    const results = await cleanupAllTables();

    const duration = Date.now() - startTime;

    // Log results
    const totalDeleted = results.reduce(
      (sum, result) => sum + result.deleted,
      0
    );
    loggers.cleanup.info(
      `Cleanup completed in ${duration}ms. Total records deleted: ${totalDeleted}`
    );

    // Log individual results
    results.forEach((result) => {
      if (result.deleted > 0) {
        loggers.cleanup.info(
          `${result.table}: ${result.before} → ${result.after} (${result.deleted} deleted)`
        );
      }
    });

    return {
      results,
      timestamp: new Date(),
      duration,
    };
  } catch (error) {
    loggers.cleanup.error("Scheduled cleanup failed:", error);
    throw error;
  }
}
