import { prisma } from "@/lib/prisma";
import { loggers } from "../logger";

export interface DeviceKeyStats {
    key: string;
    customName: string;
    units?: string | null;
    stats: {
        count: number;
        min: number;
        max: number;
        avg: number;
        lastValue: number;
    };
}

export interface DeviceSummary {
    deviceId: string;
    deviceName: string;
    topic: string;
    keys: DeviceKeyStats[];
}

export interface DailySummaryData {
    date: Date;
    deviceCount: number;
    totalLogs: number;
    devices: DeviceSummary[];
}

/**
 * Generate daily summary for device logs
 * Aggregates data from 00:00 to 23:59 of the target date
 */
export async function generateDailyDeviceSummary(targetDate: Date): Promise<DailySummaryData> {
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all logged data for the day with device and config info
    const logs = await prisma.loggedData.findMany({
        where: {
            timestamp: {
                gte: startOfDay,
                lte: endOfDay,
            },
        },
        include: {
            config: {
                include: {
                    device: true,
                },
            },
        },
        orderBy: {
            timestamp: 'asc',
        },
    });

    if (logs.length === 0) {
        loggers.stats.info(`No logs found for ${targetDate.toISOString().split('T')[0]}`);
        return {
            date: startOfDay,
            deviceCount: 0,
            totalLogs: 0,
            devices: [],
        };
    }

    // Group logs by device and key, and store config mapping
    const deviceMap = new Map<string, Map<string, number[]>>();
    const configMap = new Map<string, any>();

    for (const log of logs) {
        const deviceId = log.config.deviceUniqId;
        const key = log.config.key;
        const configId = `${deviceId}:${key}`;

        if (!deviceMap.has(deviceId)) {
            deviceMap.set(deviceId, new Map());
        }

        const keyMap = deviceMap.get(deviceId)!;
        if (!keyMap.has(key)) {
            keyMap.set(key, []);
            configMap.set(configId, log.config);
        }

        keyMap.get(key)!.push(log.value);
    }

    // Build device summaries
    const devices: DeviceSummary[] = [];

    for (const [deviceId, keyMap] of deviceMap.entries()) {
        const firstLog = logs.find(log => log.config.deviceUniqId === deviceId);
        if (!firstLog) continue;

        const device = firstLog.config.device;
        const keys: DeviceKeyStats[] = [];

        for (const [key, values] of keyMap.entries()) {
            const config = configMap.get(`${deviceId}:${key}`);
            if (!config) continue;

            // Calculate statistics
            const count = values.length;
            if (count === 0) continue;

            const min = Math.min(...values);
            const max = Math.max(...values);
            const avg = values.reduce((sum, val) => sum + val, 0) / count;
            const lastValue = values[values.length - 1];

            keys.push({
                key,
                customName: config.customName,
                units: config.units || null,
                stats: {
                    count,
                    min: Number(min.toFixed(2)),
                    max: Number(max.toFixed(2)),
                    avg: Number(avg.toFixed(2)),
                    lastValue: Number(lastValue.toFixed(2)),
                },
            });
        }

        if (keys.length > 0) {
            devices.push({
                deviceId,
                deviceName: device.name || "Unknown Device",
                topic: device.topic || "unknown/topic",
                keys,
            });
        }
    }

    const summary: DailySummaryData = {
        date: startOfDay,
        deviceCount: devices.length,
        totalLogs: logs.length,
        devices,
    };

    return summary;
}

/**
 * Save daily summary to database
 */
export async function saveDailyDeviceSummary(summary: DailySummaryData): Promise<void> {
    try {
        // Check if summary already exists for this date
        const existing = await prisma.dailyDeviceSummary.findUnique({
            where: { date: summary.date },
        });

        const data = {
            date: summary.date,
            deviceCount: summary.deviceCount,
            totalLogs: summary.totalLogs,
            devices: summary.devices as any,
        };

        if (existing) {
            // Update existing
            await prisma.dailyDeviceSummary.update({
                where: { id: existing.id },
                data,
            });
            loggers.stats.info(`Updated existing summary: ${summary.date.toISOString().split('T')[0]}`);
        } else {
            // Create new
            await prisma.dailyDeviceSummary.create({
                data,
            });
            // loggers.stats.info(`Created new summary: ${summary.date.toISOString().split('T')[0]}`);
        }
    } catch (error) {
        loggers.stats.error('Error saving summary:', error);
        throw error;
    }
}

/**
 * Get daily summary for a specific date
 */
export async function getDailyDeviceSummary(date: Date): Promise<DailySummaryData | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    try {
        const summary = await prisma.dailyDeviceSummary.findUnique({
            where: { date: startOfDay },
        });

        if (!summary) return null;

        return {
            date: summary.date,
            deviceCount: summary.deviceCount,
            totalLogs: summary.totalLogs,
            devices: summary.devices as unknown as DeviceSummary[],
        };
    } catch (error) {
        loggers.stats.error('Error fetching summary:', error);
        throw error;
    }
}

/**
 * Get available summary dates (for date picker)
 */
export async function getAvailableSummaryDates(limit: number = 30): Promise<Date[]> {
    try {
        const summaries = await prisma.dailyDeviceSummary.findMany({
            select: { date: true },
            orderBy: { date: 'desc' },
            take: limit,
        });

        return summaries.map(s => s.date);
    } catch (error) {
        loggers.stats.error('Error fetching available dates:', error);
        throw error;
    }
}

/**
 * Generate and save daily summary for yesterday
 * This is the main function called by cron job
 */
export async function generateAndSaveDailySummary(targetDate?: Date): Promise<DailySummaryData> {
    const date = targetDate || new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday by default

    loggers.stats.info(`Starting daily summary generation: ${date.toISOString().split('T')[0]}`);

    const summary = await generateDailyDeviceSummary(date);
    await saveDailyDeviceSummary(summary);

    return summary;
}