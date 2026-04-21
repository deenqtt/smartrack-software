import { prisma } from "@/lib/prisma";
import { loggers } from "../logger";

export interface PredictionResult {
  currentUsageKwh: number;
  currentCostRupiah: number;
  predictionTodayKwh: number;
  predictionTodayCost: number;
  predictionMonthKwh: number;
  predictionMonthCost: number;
  confidenceScore: number;
}

/**
 * Prediction Service for Power Consumption and Cost
 */
export class PredictionService {
  /**
   * Get predicted power usage and cost for a specific bill configuration
   */
  public async getBillPrediction(configId: string): Promise<PredictionResult> {
    try {
      const config = await prisma.billConfiguration.findUnique({
        where: { id: configId },
      });

      if (!config) throw new Error("Configuration not found");

      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      // 1. Get current usage today (from the logs since start of day)
      const logsToday = await prisma.billLog.findMany({
        where: {
          configId,
          timestamp: { gte: startOfDay },
        },
        orderBy: { timestamp: "asc" },
      });

      let currentUsageKwh = 0;
      let currentCostRupiah = 0;

      if (logsToday.length > 0) {
        // Each log records cost for a ~5-minute interval. Sum all intervals.
        currentCostRupiah = logsToday.reduce((sum, log) => sum + log.rupiahCost, 0);
        // Derive kWh from cost using the config rate
        const rate = config.rupiahRatePerKwh || 1114.74;
        currentUsageKwh = rate > 0 ? currentCostRupiah / rate : 0;
      }

      // 2. Predict Today's Total
      // Linear extrapolation based on hour of day
      const hoursPassed = now.getHours() + now.getMinutes() / 60;
      const hoursRemaining = 24 - hoursPassed;
      const hourlyRate = hoursPassed > 0 ? currentUsageKwh / hoursPassed : 0;
      const predictionTodayKwh = currentUsageKwh + hourlyRate * hoursRemaining;
      const predictionTodayCost = predictionTodayKwh * (config.rupiahRatePerKwh || 1114.74);

      // 3. Predict Month's Total
      // Get historical averages from DailyDeviceSummary or BillLog averages
      // Let's use last 7 days from BillLog summaries
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);

      // Simplified: Get average daily usage from the last 7 days
      // In a real scenario, we'd query DailyDeviceSummary
      const historicalLogs = await prisma.billLog.findMany({
        where: {
          configId,
          timestamp: { gte: sevenDaysAgo, lt: startOfDay },
        },
        orderBy: { timestamp: "asc" },
      });

      let avgDailyKwh = hourlyRate * 24; // Default to today's rate if no history

      if (historicalLogs.length > 0) {
        // Sum rupiahCost per day, then derive kWh from rate
        const rate = config.rupiahRatePerKwh || 1114.74;
        const dayMap = new Map<string, number>();
        historicalLogs.forEach(log => {
          const dayKey = log.timestamp.toISOString().split('T')[0];
          dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + log.rupiahCost);
        });

        const dailyCosts = Array.from(dayMap.values());
        if (dailyCosts.length > 0) {
          const avgDailyCost = dailyCosts.reduce((a, b) => a + b, 0) / dailyCosts.length;
          avgDailyKwh = rate > 0 ? avgDailyCost / rate : 0;
        }
      }

      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const daysElapsed = now.getDate() - 1 + (hoursPassed / 24);
      const daysRemaining = daysInMonth - daysElapsed;

      const predictionMonthKwh = currentUsageKwh + (avgDailyKwh * daysRemaining);
      const predictionMonthCost = predictionMonthKwh * (config.rupiahRatePerKwh || 1114.74);

      return {
        currentUsageKwh: parseFloat(currentUsageKwh.toFixed(2)),
        currentCostRupiah: parseFloat(currentCostRupiah.toFixed(2)),
        predictionTodayKwh: parseFloat(predictionTodayKwh.toFixed(2)),
        predictionTodayCost: parseFloat(predictionTodayCost.toFixed(2)),
        predictionMonthKwh: parseFloat(predictionMonthKwh.toFixed(2)),
        predictionMonthCost: parseFloat(predictionMonthCost.toFixed(2)),
        confidenceScore: historicalLogs.length > 0 ? 0.85 : 0.5,
      };
    } catch (error) {
      loggers.calculation.error("Prediction error:", error);
      throw error;
    }
  }
}

export const predictionService = new PredictionService();
