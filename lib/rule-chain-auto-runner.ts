import { RuleChainExecutionEngine } from "./rule-chain/execution-engine";
import { prisma } from "@/lib/prisma";
import * as schedule from "node-schedule";

interface AutoRunnerStats {
  totalActiveChains: number;
  lastExecutionTime: Date | null;
  executionsToday: number;
  errorsToday: number;
  scheduledJobs: number;
}

interface ScheduledTimer {
  ruleChainId: string;
  nodeId: string;
  scheduleType: "once" | "interval" | "weekly";
  job: schedule.Job;
  executed?: boolean; // Track if "once" timer already executed
  executedAt?: Date; // Track execution timestamp
}

class RuleChainAutoRunner {
  private executionEngine: RuleChainExecutionEngine;
  private prisma = prisma; //  Add prisma property
  private isRunning = false;
  private stats: AutoRunnerStats;
  private scheduledTimers: Map<string, ScheduledTimer> = new Map();
  //  Background reload polling
  private reloadRequested: boolean = false;
  private reloadCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.executionEngine = new RuleChainExecutionEngine();
    this.stats = {
      totalActiveChains: 0,
      lastExecutionTime: null,
      executionsToday: 0,
      errorsToday: 0,
      scheduledJobs: 0,
    };
  }

  /**
   * Start the auto runner with intelligent scheduling
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    // Initialize scheduled jobs for all active rule chains
    this.initializeSchedules();

    // Start background reload polling (check every 5 seconds)
    this.startReloadPolling();
  }

  /**
   * Start background reload polling
   */
  private startReloadPolling(): void {
    if (this.reloadCheckInterval) {
      clearInterval(this.reloadCheckInterval);
    }

    this.reloadCheckInterval = setInterval(async () => {
      if (this.reloadRequested) {
        this.reloadRequested = false;

        await this.forceRun();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Request reload (non-blocking, returns immediately)
   */
  requestReload(): void {
    this.reloadRequested = true;
  }

  /**
   * Stop the auto runner
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Cancel all scheduled jobs
    this.scheduledTimers.forEach(({ job, ruleChainId }) => {
      job.cancel();
    });
    this.scheduledTimers.clear();
  }

  /**
   * Initialize schedules for all timer nodes in active rule chains
   */
  private async initializeSchedules(): Promise<void> {
    try {
      // Invalidate Prisma's Data Proxy cache to ensure we get the latest data
      await this.prisma.$queryRaw`SELECT 1`;

      const activeChains = await this.prisma.ruleChain.findMany({
        where: { isActive: true },
      });

      for (const chain of activeChains) {
        if (!chain.nodes || typeof chain.nodes !== "object") continue;

        const nodesArray = Array.isArray(chain.nodes) ? chain.nodes : [];

        // Find all timer nodes in this chain
        for (const node of nodesArray) {
          if (
            node &&
            typeof node === "object" &&
            "type" in node &&
            node.type === "timerSchedulerNode" &&
            node.data &&
            typeof node.data === "object" &&
            "config" in node.data &&
            node.data.config
          ) {
            const { scheduleType } = node.data.config as {
              scheduleType: string;
            };

            switch (scheduleType) {
              case "once":
                this.scheduleOnceTimer(chain.id, node);
                break;
              case "weekly":
                this.scheduleWeeklyTimer(chain.id, node);
                break;
              case "interval":
                this.scheduleIntervalTimer(chain.id, node);
                break;
            }
          }
        }
      }
    } catch (error) {
      console.error(" Error initializing schedules:", error);
    }
  }

  /**
   * Schedule a "once" type timer
   */
  private scheduleOnceTimer(ruleChainId: string, node: any): void {
    const config = node.data.config;
    const startDateTimeStr = config.startDateTime; // e.g., "2025-12-03T17:03"
    const timerId = `${ruleChainId}-${node.id}`;

    // Parse local datetime string and adjust for timezone
    // Same logic as executor: parse as components, create UTC Date, then adjust with timezone offset
    const [datePart, timePart] = startDateTimeStr.split("T");
    if (!datePart || !timePart) {
      console.error(`    Invalid startDateTime format: ${startDateTimeStr}`);
      return;
    }

    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    // Create a Date assuming these are UTC components
    const dateUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
    // Adjust for timezone offset to get the actual local time the user meant
    const offsetMs = new Date().getTimezoneOffset() * 60000;
    const startDateTime = new Date(dateUTC.getTime() + offsetMs);

    const now = new Date();

    // Check if time already passed
    if (now > startDateTime) {
      const timeSinceScheduled = now.getTime() - startDateTime.getTime();

      //  If time has already passed when app starts, treat as EXPIRED
      // Don't execute even if within 2 minutes - it's too late
      console.warn(
        `     ONCE timer EXPIRED: ${
          node.data.label
        } (was scheduled at ${startDateTime.toLocaleString()}, app started at ${now.toLocaleString()}, ${Math.floor(
          timeSinceScheduled / 1000,
        )}s late)`,
      );
      this.scheduledTimers.set(timerId, {
        ruleChainId,
        nodeId: node.id,
        scheduleType: "once",
        job: null as any,
        executed: true,
        executedAt: startDateTime,
      });
      return;
    }

    // Schedule for future time using node-schedule
    const job = schedule.scheduleJob(startDateTime, async () => {
      await this.executeRuleChain({ id: ruleChainId }, node);
      // Mark as executed
      const scheduled = this.scheduledTimers.get(timerId);
      if (scheduled) {
        scheduled.executed = true;
        scheduled.executedAt = new Date();
      }
    });

    this.scheduledTimers.set(timerId, {
      ruleChainId,
      nodeId: node.id,
      scheduleType: "once",
      job,
      executed: false,
    });
  }

  /**
   * Execute ONCE timer and mark as executed
   */
  private async scheduleOnceExecute(
    ruleChainId: string,
    node: any,
    timerId: string,
  ): Promise<void> {
    try {
      await this.executeRuleChain({ id: ruleChainId }, node);
      const scheduled = this.scheduledTimers.get(timerId);
      if (scheduled) {
        scheduled.executed = true;
        scheduled.executedAt = new Date();
      }
    } catch (error) {
      console.error(` Error executing ONCE timer: ${error}`);
    }
  }

  /**
   * Schedule a "weekly" type timer with BOTH start and end times
   */
  private scheduleWeeklyTimer(ruleChainId: string, node: any): void {
    const config = node.data.config;
    const { weeklyDays, weeklyStartTime, weeklyEndTime } = config;

    // Convert days array to cron day format (0=Sun, 1=Mon, etc.)
    const daysOfWeek = weeklyDays
      .map((isActive: boolean, index: number) => (isActive ? index : -1))
      .filter((day: number) => day !== -1);

    if (daysOfWeek.length === 0) {
      console.warn(
        `    No days selected for weekly timer: ${node.data.label}`,
      );
      return;
    }

    const dayLabels = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const selectedDays = daysOfWeek.map((d: number) => dayLabels[d]).join(", ");

    //  Schedule START time
    const [startHour, startMin] = weeklyStartTime.split(":").map(Number);
    const startCronExpression = `${startMin} ${startHour} * * ${daysOfWeek.join(
      ",",
    )}`;

    const startJob = schedule.scheduleJob(startCronExpression, async () => {
      await this.executeRuleChain({ id: ruleChainId }, node);
    });

    //  Schedule END time (separate job)
    const [endHour, endMin] = weeklyEndTime.split(":").map(Number);
    const endCronExpression = `${endMin} ${endHour} * * ${daysOfWeek.join(
      ",",
    )}`;

    const endJob = schedule.scheduleJob(endCronExpression, async () => {
      await this.executeRuleChain({ id: ruleChainId }, node);
    });

    // Store both jobs with unique timer IDs
    const startTimerId = `${ruleChainId}-${node.id}-start`;
    const endTimerId = `${ruleChainId}-${node.id}-end`;

    this.scheduledTimers.set(startTimerId, {
      ruleChainId,
      nodeId: node.id,
      scheduleType: "weekly",
      job: startJob,
    });

    this.scheduledTimers.set(endTimerId, {
      ruleChainId,
      nodeId: node.id,
      scheduleType: "weekly",
      job: endJob,
    });
  }

  /**
   * Schedule an "interval" type timer
   */
  private scheduleIntervalTimer(ruleChainId: string, node: any): void {
    const config = node.data.config;
    const { intervalValue, intervalUnit } = config;

    // Convert interval to milliseconds
    const intervalMs = this.convertIntervalToMs(intervalValue, intervalUnit);

    const job = schedule.scheduleJob(
      `*/${Math.floor(intervalMs / 1000)} * * * * *`,
      async () => {
        await this.executeRuleChain({ id: ruleChainId }, node);
      },
    );

    this.scheduledTimers.set(`${ruleChainId}-${node.id}`, {
      ruleChainId,
      nodeId: node.id,
      scheduleType: "interval",
      job,
    });
  }

  /**
   * Convert interval value and unit to milliseconds
   */
  private convertIntervalToMs(
    value: number,
    unit: "seconds" | "minutes" | "hours",
  ): number {
    switch (unit) {
      case "seconds":
        return value * 1000;
      case "minutes":
        return value * 60 * 1000;
      case "hours":
        return value * 60 * 60 * 1000;
      default:
        return value * 1000;
    }
  }

  /**
   * Execute a single rule chain
   */
  private async executeRuleChain(chain: any, timerNode?: any): Promise<void> {
    const startTime = Date.now();

    try {
      // Invalidate Prisma's Data Proxy cache to get the latest version of the rule chain
      await this.prisma.$queryRaw`SELECT 1`;

      // Fetch full chain data from database
      const fullChain = await this.prisma.ruleChain.findUnique({
        where: { id: chain.id },
      });

      if (!fullChain) {
        console.error(` Rule chain not found: ${chain.id}`);
        return;
      }

      const timerLabel = timerNode?.data?.label || "Auto-triggered";

      // Prepare execution context
      const testPayload = {
        autoRunner: true,
        timerTriggered: !!timerNode,
        timerLabel,
        executionTime: new Date().toISOString(),
        ruleChainId: fullChain.id,
        ruleChainName: fullChain.name,
      };

      // Execute the rule chain
      const executionContext = await this.executionEngine.executeRuleChain(
        fullChain.id,
        fullChain.nodes as any,
        fullChain.edges as any,
        testPayload,
      );

      const duration = Date.now() - startTime;

      this.stats.lastExecutionTime = new Date();
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.error(
        ` Rule chain execution failed after ${duration}ms:`,
        error.message,
      );
      this.stats.errorsToday++;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): AutoRunnerStats {
    return {
      ...this.stats,
      scheduledJobs: this.scheduledTimers.size,
    };
  }

  /**
   * Check if the auto runner is currently running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Reset daily statistics
   */
  resetDailyStats(): void {
    this.stats.executionsToday = 0;
    this.stats.errorsToday = 0;
  }

  /**
   * Force reinitialize all schedules (for testing)
   */
  async forceRun(): Promise<void> {
    // Clear existing schedules
    this.scheduledTimers.forEach(({ job }) => {
      job.cancel();
    });
    this.scheduledTimers.clear();
    // Reinitialize all schedules
    await this.initializeSchedules();
  }

  /**
   * Get list of active rule chains
   */
  async getActiveChains(): Promise<any[]> {
    try {
      return await this.prisma.ruleChain.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          description: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      console.error("Error fetching active chains:", error);
      return [];
    }
  }
}

// Singleton pattern to prevent multiple instances in development
declare global {
  var __ruleChainAutoRunner: RuleChainAutoRunner | undefined;
}

const getRuleChainAutoRunnerInstance = (): RuleChainAutoRunner => {
  if (process.env.NODE_ENV === "production") {
    return new RuleChainAutoRunner();
  } else {
    if (!global.__ruleChainAutoRunner) {
      global.__ruleChainAutoRunner = new RuleChainAutoRunner();
    }
    return global.__ruleChainAutoRunner;
  }
};

export const ruleChainAutoRunner = getRuleChainAutoRunnerInstance();

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("SIGINT", () => {
    ruleChainAutoRunner.stop();
  });

  process.on("SIGTERM", () => {
    ruleChainAutoRunner.stop();
  });
}
