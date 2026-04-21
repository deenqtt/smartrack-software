import { prisma } from "@/lib/prisma";
import { loggers } from "../logger";
import { mqttCache } from "../system-stability";
import { serviceManager, ServiceEvents } from "./service-manager";
import { redis as redisClient } from "@/lib/redis";

/** === KONTROL KONKURENSI === */
const MAX_CONCURRENT_API_CALLS = parseInt(
  process.env.LOGGING_MAX_CONCURRENT || "100",
); // Dikurangi dari 1000 ke 50 untuk stabilitas
const MAX_QUEUE_SIZE = parseInt(process.env.LOGGING_MAX_QUEUE_SIZE || "1000"); // Mencegah pertumbuhan antrian yang tidak terbatas
const BATCH_SIZE = parseInt(process.env.LOGGING_BATCH_SIZE || "25"); // Proses 25 konfigurasi per batch
const BATCH_DELAY = parseInt(process.env.LOGGING_BATCH_DELAY || "2000"); // Penundaan 2 detik antar batch

// Removed console logs for cleaner output

class BoundedSemaphore {
  private permits: number;
  private waitingQueue: ((resolve: () => void) => void)[] = [];
  private readonly maxQueueSize: number;

  constructor(permits: number, maxQueueSize: number = 1000) {
    this.permits = permits;
    this.maxQueueSize = maxQueueSize;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve, reject) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else if (this.waitingQueue.length >= this.maxQueueSize) {
        reject(
          new Error(
            `Semaphore queue full (${this.maxQueueSize}) - rejecting to prevent memory leak`,
          ),
        );
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waitingQueue.length > 0 && this.permits > 0) {
      this.permits--;
      const nextResolve = this.waitingQueue.shift();
      if (nextResolve) {
        nextResolve(() => this.release());
      }
    }
  }

  get availablePermits(): number {
    return this.permits;
  }

  get waitingQueueLength(): number {
    return this.waitingQueue.length;
  }

  get maxQueueSizeValue(): number {
    return this.maxQueueSize;
  }

  getStats() {
    return {
      availablePermits: this.permits,
      waitingQueueLength: this.waitingQueue.length,
      maxQueueSize: this.maxQueueSize,
      queueUtilization: (this.waitingQueue.length / this.maxQueueSize) * 100,
      totalPermits: this.permits + this.waitingQueue.length,
    };
  }
}

// Kontrol konkurensi global untuk panggilan API
const apiConcurrencySemaphore = new BoundedSemaphore(
  MAX_CONCURRENT_API_CALLS,
  MAX_QUEUE_SIZE,
);

/**
 * Circuit Breaker untuk kegagalan MQTT/API
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private successCount = 0;
  private nextAttemptTime = 0;

  private readonly failureThreshold = 5; // Open after 5 failures
  private readonly timeoutMs = 60000; // Stay open for 1 minute
  private readonly successThreshold = 3; // Close after 3 successes in half-open

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    const now = Date.now();

    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === "OPEN" && now >= this.nextAttemptTime) {
      this.state = "HALF_OPEN";
      this.successCount = 0;
    }

    // Reject immediately if OPEN
    if (this.state === "OPEN") {
      throw new Error(
        `Circuit breaker is OPEN (resets in ${Math.ceil(
          (this.nextAttemptTime - now) / 1000,
        )}s)`,
      );
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = "CLOSED";
      }
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      // Go back to OPEN immediately on failure in HALF_OPEN
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.timeoutMs;
      loggers.scheduler.warn("[CIRCUIT] Transitioning back to OPEN state");
    } else if (this.failures >= this.failureThreshold) {
      // Transition to OPEN
      this.state = "OPEN";
      this.nextAttemptTime = Date.now() + this.timeoutMs;
      loggers.scheduler.error(
        `[CIRCUIT] Transitioning to OPEN state after ${this.failures} failures`,
      );
    }
  }

  getState(): string {
    return this.state;
  }

  getStats(): {
    state: string;
    failures: number;
    successCount: number;
    nextAttemptIn: number;
  } {
    const now = Date.now();
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      nextAttemptIn: Math.max(0, this.nextAttemptTime - now),
    };
  }
}

// Circuit breaker global untuk operasi logging
const loggingCircuitBreaker = new CircuitBreaker();

// Use globalThis to preserve the singleton across Next.js module re-evaluations
// Without this, each module re-evaluation creates a NEW scheduler instance that runs
// in parallel with the old one, causing DOUBLE logging entries
const globalForScheduler = globalThis as unknown as {
  _loggingSchedulerInstance: LoggingSchedulerService | undefined;
};

let instance: LoggingSchedulerService | null = null;

/** === ENV & Defaults === */
const DEFAULT_PORT = 3500;
const SCHEDULER_HOST = process.env.SCHEDULER_HOST || "127.0.0.1";

// Lazy environment loading untuk menghindari race condition di production
function getInternalBaseUrl(): string {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  return process.env.INTERNAL_BASE_URL || `http://127.0.0.1:3000`;
}

function getSchedulerPort(): number {
  return Number(process.env.PORT || DEFAULT_PORT);
}

// Log environment info saat pertama kali dipanggil (lazy)
let environmentLogged = false;
function logEnvironmentOnce() {
  if (!environmentLogged) {
    console.log(
      `[SCHEDULER] Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${
        process.env.PORT
      }, INTERNAL_BASE_URL=${getInternalBaseUrl()}`,
    );
    environmentLogged = true;
  }
}

export class LoggingSchedulerService {
  private activeTimers: Map<
    string,
    { timer: NodeJS.Timeout; intervalTimer: NodeJS.Timeout | null }
  >;
  private configCache: Map<string, { data: any; timestamp: number }> =
    new Map();
  private readonly CONFIG_CACHE_TTL_MS = 300000; // 5 minutes cache
  private isInitialized: boolean = false;
  private isShuttingDown: boolean = false;
  private logBuffer: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;
  private readonly FLUSH_INTERVAL_MS = 10000; // Flush every 10 seconds
  private reloadRequested: boolean = false;
  private hostname: string;
  private port: number;

  constructor(hostname: string = SCHEDULER_HOST, port: number = DEFAULT_PORT) {
    this.activeTimers = new Map();
    this.hostname = hostname;
    this.port = port;
  }

  /**
   * Hitung waktu jalankan berikutnya berdasarkan waktu pembuatan config
   * Mengembalikan waktu yang selaras untuk menghindari drift
   */
  private calculateNextRunTime(config: any) {
    const now = new Date();
    const createdAt = new Date(config.createdAt);
    const intervalMs = config.loggingIntervalMinutes * 60 * 1000;

    const elapsedMs = now.getTime() - createdAt.getTime();
    const remainderMs = elapsedMs % intervalMs;
    const nextRunMs = intervalMs - remainderMs;

    const nextRun = new Date(now.getTime() + nextRunMs);

    return { nextRun, delayMs: nextRunMs, intervalMs };
  }

  /**
   * Fetch fresh config from database - OPTIMIZED with select
   */
  private async getFreshConfig(
    configId: string,
    forceRefresh: boolean = false,
  ) {
    // Check cache first
    const cached = this.configCache.get(configId);
    const now = Date.now();

    if (
      !forceRefresh &&
      cached &&
      now - cached.timestamp < this.CONFIG_CACHE_TTL_MS
    ) {
      return cached.data;
    }

    try {
      const config = await prisma.loggingConfiguration.findUnique({
        where: { id: configId },
        select: {
          id: true,
          customName: true,
          key: true,
          loggingIntervalMinutes: true,
          multiply: true,
          deviceUniqId: true,
          device: {
            select: {
              id: true,
              name: true,
              topic: true,
              uniqId: true,
            },
          },
        },
      });

      if (config) {
        this.configCache.set(configId, { data: config, timestamp: now });
      } else {
        this.configCache.delete(configId); // Ensure cache is clean if deleted from DB
      }

      return config;
    } catch (error) {
      loggers.scheduler.error(`Failed to fetch config ${configId}`, error);
      // Return cached data even if expired if fetch fails (stale-while-revalidate style)
      return cached?.data || null;
    }
  }

  /**
   * Get dynamic internal API URL (runtime safe)
   */
  private getDynamicApiUrl(): string {
    // Priority: INTERNAL_BASE_URL > construct from SERVER_HOST/PORT > localhost fallback
    if (process.env.INTERNAL_BASE_URL) {
      return process.env.INTERNAL_BASE_URL;
    }

    const port = process.env.PORT || process.env.SERVER_PORT || "3500";
    const host = process.env.SERVER_HOST || "127.0.0.1";

    return `http://${host}:${port}`;
  }

  /**
   * Log single config with direct database operations and improved error handling
   */
  private async logSingleConfig(
    configId: string,
    retryCount: number = 0,
  ): Promise<{ success: boolean; logged: number; method: string }> {
    const startTime = Date.now();

    // Fetch fresh config from database
    const config = await this.getFreshConfig(configId);

    if (!config) {
      loggers.scheduler.warn(`[LOG] Config ${configId} not found in database`);
      return { success: false, logged: 0, method: "config_not_found" };
    }

    loggers.scheduler.debug(
      `[LOG] Processing config: ${config.customName} (${configId})`,
    );

    try {
      // Get MQTT payload from Redis cache directly
      const topic = config.device.topic;
      let payload = await mqttCache.getPayload(topic);
      let payloadSource = "cache";

      // If no payload, try to get from all cached payloads (debug mode)
      if (!payload) {
        loggers.scheduler.debug(
          `[LOG] No direct payload for ${topic}, checking all cached topics`,
        );
        const allPayloads = await mqttCache.getAllPayloads();

        // Find payload with similar topic pattern
        for (const [cachedTopic, cachedPayload] of Object.entries(
          allPayloads,
        )) {
          if (cachedTopic.includes(topic) || topic.includes(cachedTopic)) {
            payload = cachedPayload;
            payloadSource = "similar_topic";
            loggers.scheduler.info(
              `[LOG] Found similar payload for ${topic} from ${cachedTopic}`,
            );
            break;
          }
        }
      }

      let valueToLog: any = null;
      let processingMethod = "unknown";

      if (payload) {
        // Validate payload freshness
        const staleThresholdMs = parseInt(
          process.env.LOGGING_STALE_THRESHOLD_MS || "300000",
        );
        const retainedStaleThresholdMs = parseInt(
          process.env.LOGGING_RETAINED_STALE_THRESHOLD_MS || "86400000",
        );

        const payloadAge = Date.now() - (payload._receivedAt || 0);
        const isRetained = payload._isRetained;
        const applicableThreshold = isRetained
          ? retainedStaleThresholdMs
          : staleThresholdMs;

        if (payloadAge > applicableThreshold) {
          loggers.scheduler.warn(
            `[LOG] Stale payload for ${topic} (${Math.round(
              payloadAge / 1000,
            )}s old), using fallback`,
          );
        } else {
          // Parse payload data - handle multiple formats
          let innerValue;

          // Check if payload has nested "value" field (Modbus format)
          if (payload.value && typeof payload.value === "string") {
            try {
              // Parse the nested JSON string
              innerValue = JSON.parse(
                payload.value.replace(/\bNaN\b/g, "null"),
              );
              loggers.scheduler.debug(
                `[LOG] Parsed nested value for ${topic}:`,
                innerValue,
              );
            } catch (parseError) {
              loggers.scheduler.warn(
                `[LOG] Failed to parse nested value for ${topic}:`,
                parseError,
              );
              innerValue = payload;
            }
          } else if (payload.value && typeof payload.value === "object") {
            innerValue = payload.value;
          } else {
            // Direct payload format
            innerValue = payload;
          }

          valueToLog = innerValue[config.key];
          processingMethod = "live_payload";

          if (valueToLog !== undefined && valueToLog !== null) {
            loggers.scheduler.debug(
              `[LOG] Found value ${valueToLog} for key "${config.key}" in ${topic}`,
            );
          } else {
            loggers.scheduler.warn(
              `[LOG] Key "${config.key}" not found in payload for ${topic}, will use fallback. Available keys: ${Object.keys(innerValue || {}).join(", ")}`,
            );
          }
        }
      }

      // If no value from payload, use fallback strategy
      if (valueToLog === null || valueToLog === undefined) {
        // 1. Try Redis fallback (FAST)
        try {
          const redisKey = `logging:last_value:${config.id}`;
          const cachedValue = await redisClient.get(redisKey);
          if (cachedValue !== null) {
            valueToLog = parseFloat(cachedValue);
            processingMethod = "fallback_redis";
            loggers.scheduler.debug(
              `[LOG] Using Redis fallback for ${config.customName}: ${valueToLog}`,
            );
          }
        } catch (redisError) {
          loggers.scheduler.warn(
            `[LOG] Redis fallback failed for ${config.id}:`,
            redisError,
          );
        }

        // 2. Try DB fallback (SLOW - only if Redis failed)
        if (valueToLog === null || valueToLog === undefined) {
          const lastEntry = await prisma.loggedData.findFirst({
            where: { configId: config.id },
            orderBy: { timestamp: "desc" },
            select: { value: true, timestamp: true },
          });

          if (lastEntry) {
            valueToLog = lastEntry.value;
            processingMethod = "fallback_last_value_db";
          } else {
            // Generate default value based on device type
            valueToLog = this.generateDefaultValue(config);
            processingMethod = "default_value";
            loggers.scheduler.warn(
              `[LOG] No historical data, using default value ${valueToLog} for ${config.customName}`,
            );
          }
        }
      }

      // Process the value
      if (valueToLog !== undefined && valueToLog !== null) {
        // Handle boolean values
        if (typeof valueToLog === "boolean") {
          valueToLog = valueToLog ? 1 : 0;
        }

        if (!isNaN(parseFloat(valueToLog))) {
          let finalValue = parseFloat(valueToLog);

          // Save to Redis for next time fallback (non-blocking)
          const redisKey = `logging:last_value:${config.id}`;
          redisClient
            .set(redisKey, String(finalValue), { EX: 86400 })
            .catch((e: any) =>
              loggers.scheduler.warn(
                `[LOG] Failed to update Redis last_value for ${config.id}:`,
                e,
              ),
            );

          if (config.multiply) {
            finalValue *= config.multiply;
          }

          // Buffer the data instead of creating directly
          this.logBuffer.push({
            configId: config.id,
            value: finalValue,
            timestamp: new Date(), // Explicit timestamp for the buffered data
          });

          return { success: true, logged: 1, method: processingMethod };
        } else {
          loggers.scheduler.warn(
            `[LOG] Invalid value type for ${config.customName}: ${valueToLog} (${typeof valueToLog})`,
          );
          return { success: false, logged: 0, method: "invalid_value_type" };
        }
      } else {
        loggers.scheduler.error(
          `[LOG] No valid value could be determined for ${config.customName}`,
        );
        return { success: false, logged: 0, method: "no_value_determined" };
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      loggers.scheduler.error(
        `[LOG] Failed to log ${config.customName} after ${duration}ms:`,
        error.message,
      );

      // Retry logic (max 3 retries with exponential backoff)
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        loggers.scheduler.info(
          `[LOG] Retrying ${config.customName} in ${delay}ms (attempt ${retryCount + 1}/3)`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.logSingleConfig(configId, retryCount + 1);
      }

      return { success: false, logged: 0, method: "error_after_retries" };
    }
  }

  /**
   * Generate default value based on config key and device type
   */
  private generateDefaultValue(config: any): number {
    const key = config.key.toLowerCase();

    // Default values based on sensor type
    if (key.includes("ph")) return 7.0;
    if (key.includes("temperature") || key.includes("temp")) return 25.0;
    if (key.includes("flow") || key.includes("rate")) return 0.0;
    if (key.includes("pressure")) return 1.0;
    if (key.includes("humidity")) return 50.0;
    if (key.includes("voltage") || key.includes("current")) return 0.0;

    // Fallback based on device type
    if (config.device?.name?.toLowerCase().includes("ph")) return 7.0;
    if (config.device?.name?.toLowerCase().includes("temp")) return 25.0;
    if (config.device?.name?.toLowerCase().includes("flow")) return 0.0;

    return 0.0; // Ultimate fallback
  }

  /**
   * Schedule single config logging with proper interval management
   */
  private scheduleConfigLogging(config: any) {
    // Clear existing timers for this config to prevent duplicates
    if (this.activeTimers.has(config.id)) {
      this.clearConfigTimer(config.id);
    }

    const { delayMs } = this.calculateNextRunTime(config);

    // Initial timer for first run
    const initialTimer = setTimeout(async () => {
      await this.executeAndReschedule(config.id);
    }, delayMs);

    // Store timer (intervalTimer will be set after first execution)
    this.activeTimers.set(config.id, {
      timer: initialTimer,
      intervalTimer: null,
    });
  }

  /**
   * Execute logging and reschedule next run
   */
  private async executeAndReschedule(configId: string) {
    // Check if config is still active
    if (!this.activeTimers.has(configId) || this.isShuttingDown) {
      return;
    }

    // Fetch fresh config to get latest settings (need it for interval timing)
    const config = await this.getFreshConfig(configId);

    if (!config) {
      this.clearConfigTimer(configId);
      return;
    }

    // Acquire concurrency semaphore
    const releaseSemaphore = await apiConcurrencySemaphore.acquire();

    try {
      // Execute logging with circuit breaker protection
      await loggingCircuitBreaker.execute(async () => {
        await this.logSingleConfig(configId);
      });
    } catch (error) {
      loggers.scheduler.error(
        `[CONCURRENCY] Error in executeAndReschedule for ${configId}:`,
        error,
      );
    } finally {
      // Always release the semaphore
      releaseSemaphore();

      // Log current concurrency status periodically
      if (Math.random() < 0.1) {
        // Log ~10% of executions
        loggers.scheduler.debug(
          `[CONCURRENCY] Available: ${apiConcurrencySemaphore.availablePermits}, Waiting: ${apiConcurrencySemaphore.waitingQueueLength}`,
        );
      }
    }

    // Check again if config is still active after logging
    if (!this.activeTimers.has(configId) || this.isShuttingDown) {
      return;
    }

    // Schedule next execution using setTimeout for proper interval control
    const intervalMs: number = config.loggingIntervalMinutes * 60 * 1000;

    const nextTimer = setTimeout(async () => {
      // Recursively call this function for next execution
      await this.executeAndReschedule(configId);
    }, intervalMs);

    // Update timer data - replace the current timer
    const timerData = this.activeTimers.get(configId);
    if (timerData) {
      // Clear the old timer first
      if (timerData.timer) {
        clearTimeout(timerData.timer);
      }
      // Set the new timer
      timerData.timer = nextTimer;
      timerData.intervalTimer = null; // We use setTimeout instead of setInterval
    }
  }

  /**
   * Clear all timers for a specific config
   */
  private clearConfigTimer(configId: string) {
    const timerData = this.activeTimers.get(configId);
    if (timerData) {
      clearTimeout(timerData.timer);
      if (timerData.intervalTimer) {
        clearInterval(timerData.intervalTimer);
      }
      this.activeTimers.delete(configId);
    }
  }

  /**
   * Setup all configs with batch processing to prevent thundering herd
   */
  public async setupAllConfigs() {
    try {
      const configs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      if (configs.length === 0) {
        loggers.scheduler.warn("No logging configurations found");
        return;
      }

      // Clear old cache before seeding new ones
      this.configCache.clear();

      // Process configs in batches to prevent thundering herd
      for (const config of configs) {
        this.configCache.set(config.id, {
          data: config,
          timestamp: Date.now(),
        });
      }

      // Process configs in batches to prevent thundering herd (silent processing)
      const totalBatches = Math.ceil(configs.length / BATCH_SIZE);

      // Process configs in batches to prevent thundering herd
      for (let i = 0; i < configs.length; i += BATCH_SIZE) {
        const batch = configs.slice(i, i + BATCH_SIZE);

        // Schedule all configs in this batch (silent)
        for (const config of batch) {
          this.scheduleConfigLogging(config);
        }

        // Add delay between batches (except for the last batch) - silent
        if (i + BATCH_SIZE < configs.length) {
          await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
        }
      }
    } catch (error) {
      loggers.scheduler.error("Error setting up logging configs", error);
      throw error;
    }
  }

  /**
   * Reload configurations (add new, remove deleted, update changed)
   */
  public async reloadConfigs() {
    try {
      const currentConfigs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      const currentConfigIds = new Set(currentConfigs.map((c: any) => c.id));

      // Stop & remove deleted configs
      for (const [configId] of this.activeTimers.entries()) {
        if (!currentConfigIds.has(configId)) {
          const config = await this.getFreshConfig(configId);
          const configName = config?.customName || configId;
          this.clearConfigTimer(configId);
          this.configCache.delete(configId); // Also remove from cache
          loggers.scheduler.info(`Removed logging config: ${configName}`);
        }
      }

      // Add new configs OR reschedule existing ones (to apply changes)
      for (const config of currentConfigs) {
        // Update cache for all configs found
        this.configCache.set(config.id, {
          data: config,
          timestamp: Date.now(),
        });

        if (!this.activeTimers.has(config.id)) {
          this.scheduleConfigLogging(config);
          loggers.scheduler.info(
            `Added new logging config: ${config.customName}`,
          );
        } else {
          // Reschedule existing config to apply any changes (interval, multiply, etc)
          this.scheduleConfigLogging(config);
        }
      }

      loggers.scheduler.info(
        `Logging reload complete. Active timers: ${this.activeTimers.size}`,
      );
    } catch (error) {
      loggers.scheduler.error("Error reloading logging configs", error);
      throw error;
    }
  }

  /**
   * Start periodic flush of the log buffer
   */
  private startFlushInterval() {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flushTimer = setInterval(async () => {
      await this.flushLogBuffer();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Flush log buffer using bulk insert (createMany) with concurrency guard
   */
  private async flushLogBuffer() {
    if (this.logBuffer.length === 0 || this.isFlushing) return;

    this.isFlushing = true;
    const dataToFlush = [...this.logBuffer];
    this.logBuffer = [];

    // Filter out entries for configs that have been deleted (prevents P2003 FK violation)
    const validConfigIds = new Set(this.activeTimers.keys());
    const validData = dataToFlush.filter((entry) =>
      validConfigIds.has(entry.configId),
    );
    const discarded = dataToFlush.length - validData.length;
    if (discarded > 0) {
      loggers.scheduler.debug(
        `[BULK] Discarded ${discarded} buffered entries for deleted/inactive configs`,
      );
    }

    if (validData.length === 0) {
      this.isFlushing = false;
      return;
    }

    try {
      // Limit batch size to 500 records per transaction for database stability
      const MAX_DB_BATCH = 500;
      let totalInserted = 0;

      for (let i = 0; i < validData.length; i += MAX_DB_BATCH) {
        const batch = validData.slice(i, i + MAX_DB_BATCH);
        const result = await prisma.loggedData.createMany({
          data: batch,
          skipDuplicates: true,
        });
        totalInserted += result.count;
      }

      if (totalInserted > 0) {
        loggers.scheduler.debug(
          `[BULK] Successfully flushed ${totalInserted} logs to database`,
        );
      }
    } catch (error) {
      loggers.scheduler.error(
        `[BULK] Failed to flush ${validData.length} logs:`,
        error,
      );
      // Put back to buffer if it failed, but be careful of infinite growth (max 2000 records)
      if (this.logBuffer.length < 2000) {
        this.logBuffer = [...validData, ...this.logBuffer].slice(0, 2000);
      }
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * Request reload (called by API) - Now redundant but kept for API compatibility
   */
  public async requestReload() {
    loggers.scheduler.info("Manual reload triggered via API");
    await this.reloadConfigs();
  }

  /**
   * Initialize scheduler
   */
  public async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      loggers.scheduler.info("Logging scheduler already initialized");
      return true;
    }

    try {
      // loggers.scheduler.info("[SCHEDULER] Starting initialization...");

      // Setup all configs (silent setup)
      await this.setupAllConfigs();

      // Start periodic flush
      this.startFlushInterval();

      // Register with ServiceManager
      serviceManager.registerService("LoggingScheduler", this);

      // Listen for configuration updates
      serviceManager.on(ServiceEvents.CONFIG_UPDATED, async (event: any) => {
        if (event.type === "LOGGING" || event.type === "DEVICE") {
          loggers.scheduler.info(
            "Refreshing logging configurations due to update event",
          );
          await this.reloadConfigs();
        }
      });

      this.isInitialized = true;

      return true;
    } catch (error: any) {
      loggers.scheduler.error(
        "[SCHEDULER] Failed to initialize logging scheduler",
        error,
      );
      this.isInitialized = false;
      throw error;
    }
  }

  /**
   * Shutdown gracefully
   */
  public async shutdown() {
    this.isShuttingDown = true;

    // Clear flush timer and do final flush
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flushLogBuffer();

    // Clear all timers
    this.activeTimers.forEach((timerData, configId) => {
      this.clearConfigTimer(configId);
    });
    this.activeTimers.clear();

    this.isInitialized = false;

    loggers.scheduler.info("Logging scheduler shutdown complete");
  }

  /**
   * Get status
   */
  public async getStatus() {
    const configs = [];

    for (const [configId] of this.activeTimers.entries()) {
      const config = await this.getFreshConfig(configId);
      if (config) {
        configs.push({
          id: config.id,
          name: config.customName,
          interval: config.loggingIntervalMinutes,
        });
      }
    }

    return {
      initialized: this.isInitialized,
      activeTimers: this.activeTimers.size,
      configs,
      concurrency: {
        maxConcurrent: MAX_CONCURRENT_API_CALLS,
        availablePermits: apiConcurrencySemaphore.availablePermits,
        waitingQueue: apiConcurrencySemaphore.waitingQueueLength,
      },
      circuitBreaker: loggingCircuitBreaker.getStats(),
      batching: {
        batchSize: BATCH_SIZE,
        batchDelay: BATCH_DELAY,
      },
    };
  }

  /**
   * DEBUG FUNCTION: Comprehensive debugging untuk logging scheduler
   */
  public async debugScheduler(): Promise<{
    timestamp: string;
    scheduler: any;
    configurations: any[];
    mqttCache: any;
    database: any;
    recentLogs: any[];
    testResults: any;
  }> {
    const debugStart = Date.now();
    const results = {
      timestamp: new Date().toISOString(),
      scheduler: {} as any,
      configurations: [] as any[],
      mqttCache: {} as any,
      database: {} as any,
      recentLogs: [] as any[],
      testResults: {} as any,
    };

    try {
      // 1. SCHEDULER STATUS
      loggers.scheduler.info(
        "[DEBUG] 🔍 Starting comprehensive scheduler debug...",
      );
      results.scheduler = {
        initialized: this.isInitialized,
        isShuttingDown: this.isShuttingDown,
        activeTimers: this.activeTimers.size,
        reloadRequested: this.reloadRequested,
        hostname: this.hostname,
        port: this.port,
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT,
          INTERNAL_BASE_URL: process.env.INTERNAL_BASE_URL,
          SCHEDULER_HOST: process.env.SCHEDULER_HOST,
        },
        concurrency: {
          maxConcurrent: MAX_CONCURRENT_API_CALLS,
          availablePermits: apiConcurrencySemaphore.availablePermits,
          waitingQueue: apiConcurrencySemaphore.waitingQueueLength,
          queueUtilization:
            (apiConcurrencySemaphore.waitingQueueLength / MAX_QUEUE_SIZE) * 100,
        },
        circuitBreaker: loggingCircuitBreaker.getStats(),
        batching: {
          batchSize: BATCH_SIZE,
          batchDelay: BATCH_DELAY,
        },
      };

      // 2. CONFIGURATIONS
      loggers.scheduler.info("[DEBUG] 📋 Checking logging configurations...");
      const allConfigs = await prisma.loggingConfiguration.findMany({
        include: { device: true },
      });

      results.configurations = allConfigs.map((config: any) => ({
        id: config.id,
        customName: config.customName,
        key: config.key,
        units: config.units,
        multiply: config.multiply,
        intervalMinutes: config.loggingIntervalMinutes,
        device: {
          id: config.deviceUniqId,
          name: config.device?.name,
          topic: config.device?.topic,
        },
        hasActiveTimer: this.activeTimers.has(config.id),
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      }));

      loggers.scheduler.info(
        `[DEBUG] Found ${allConfigs.length} configurations`,
      );

      // 3. MQTT CACHE STATUS
      loggers.scheduler.info("[DEBUG] 📡 Checking MQTT cache status...");
      const cacheStats = await mqttCache.getCacheStats();
      const allPayloads = await mqttCache.getAllPayloads();

      results.mqttCache = {
        stats: cacheStats,
        totalTopics: Object.keys(allPayloads).length,
        topics: Object.keys(allPayloads).slice(0, 10), // First 10 topics only
        samplePayload:
          Object.keys(allPayloads).length > 0
            ? allPayloads[Object.keys(allPayloads)[0]]
            : null,
      };

      // 4. DATABASE STATUS
      loggers.scheduler.info("[DEBUG] 🗄️ Checking database status...");
      const totalLoggedData = await prisma.loggedData.count();
      const recentLoggedData = await prisma.loggedData.findMany({
        take: 10,
        orderBy: { timestamp: "desc" },
        include: {
          config: {
            select: {
              customName: true,
              key: true,
              device: {
                select: { name: true, topic: true },
              },
            },
          },
        },
      });

      results.database = {
        totalRecords: totalLoggedData,
        connectionStatus: "connected", // If we reach here, DB is connected
        recentLogs: recentLoggedData.map((log: any) => ({
          id: log.id,
          configId: log.configId,
          configName: log.config.customName,
          deviceName: log.config.device?.name,
          value: log.value,
          timestamp: log.timestamp,
        })),
      };

      results.recentLogs = results.database.recentLogs;

      // 5. TEST LOGGING EXECUTION
      loggers.scheduler.info("[DEBUG] 🧪 Running test logging execution...");
      const testResults = {
        totalConfigs: allConfigs.length,
        successfulTests: 0,
        failedTests: 0,
        details: [] as any[],
      };

      // Test only first 3 configs to avoid overwhelming the system
      const testConfigs = allConfigs.slice(0, 3);

      for (const config of testConfigs) {
        try {
          loggers.scheduler.info(
            `[DEBUG] Testing config: ${config.customName}`,
          );
          const result = await this.logSingleConfig(config.id);

          testResults.details.push({
            configId: config.id,
            configName: config.customName,
            success: result.success,
            logged: result.logged,
            error: result.success ? null : "Failed to log data",
          });

          if (result.success) {
            testResults.successfulTests++;
          } else {
            testResults.failedTests++;
          }
        } catch (error: any) {
          loggers.scheduler.error(
            `[DEBUG] Test failed for ${config.customName}:`,
            error,
          );
          testResults.details.push({
            configId: config.id,
            configName: config.customName,
            success: false,
            logged: 0,
            error: error.message,
          });
          testResults.failedTests++;
        }
      }

      results.testResults = testResults;

      // 6. PERFORMANCE METRICS
      const debugDuration = Date.now() - debugStart;
      loggers.scheduler.info(`[DEBUG] Debug completed in ${debugDuration}ms`);

      results.scheduler.debugDuration = debugDuration;
      results.scheduler.performanceMetrics = {
        debugDuration,
        configsPerSecond: allConfigs.length / (debugDuration / 1000),
        memoryUsage: process.memoryUsage(),
      };

      return results;
    } catch (error: any) {
      loggers.scheduler.error("[DEBUG] Debug failed:", error);
      return {
        timestamp: new Date().toISOString(),
        scheduler: { error: error.message },
        configurations: [],
        mqttCache: { error: error.message },
        database: { error: error.message },
        recentLogs: [],
        testResults: { error: error.message },
      };
    }
  }

  /**
   * DEBUG FUNCTION: Test single config manually
   */
  public async debugTestConfig(configId: string): Promise<{
    success: boolean;
    config?: any;
    payload?: any;
    processedValue?: any;
    error?: string;
  }> {
    try {
      loggers.scheduler.info(`[DEBUG-TEST] Testing config: ${configId}`);

      // Get config
      const config = await this.getFreshConfig(configId);
      if (!config) {
        return { success: false, error: `Config ${configId} not found` };
      }

      // Get payload
      const topic = config.device.topic;
      const payload = await mqttCache.getPayload(topic);

      if (!payload) {
        return {
          success: false,
          config: {
            id: config.id,
            name: config.customName,
            topic,
          },
          error: `No payload found for topic: ${topic}`,
        };
      }

      // Process payload (same logic as logSingleConfig)
      let innerValue;
      if (payload.value && typeof payload.value === "object") {
        innerValue = payload.value;
      } else if (payload.value && typeof payload.value === "string") {
        try {
          innerValue = JSON.parse(payload.value.replace(/\bNaN\b/g, "null"));
        } catch {
          innerValue = payload;
        }
      } else {
        innerValue = payload;
      }

      const valueToLog = innerValue[config.key];
      let processedValue = null;
      let finalValue = null;

      if (valueToLog !== undefined && valueToLog !== null) {
        // Handle boolean values
        let processedValueToLog = valueToLog;
        if (typeof valueToLog === "boolean") {
          processedValueToLog = valueToLog ? 1 : 0;
        }

        if (!isNaN(parseFloat(processedValueToLog))) {
          finalValue = parseFloat(processedValueToLog);
          if (config.multiply) {
            finalValue *= config.multiply;
          }
          processedValue = finalValue;
        }
      }

      return {
        success: true,
        config: {
          id: config.id,
          name: config.customName,
          key: config.key,
          multiply: config.multiply,
          topic,
        },
        payload: {
          raw: payload,
          processed: innerValue,
          extractedValue: valueToLog,
        },
        processedValue,
      };
    } catch (error: any) {
      loggers.scheduler.error(
        `[DEBUG-TEST] Test failed for ${configId}:`,
        error,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * DEBUG FUNCTION: Force reload all configs
   */
  public async debugForceReload(): Promise<{
    success: boolean;
    message: string;
    previousTimers: number;
    newTimers: number;
  }> {
    try {
      const previousTimers = this.activeTimers.size;

      loggers.scheduler.info(
        `[DEBUG-RELOAD] Force reloading configs (previous: ${previousTimers})`,
      );

      // Clear all existing timers
      this.activeTimers.forEach((timerData, configId) => {
        this.clearConfigTimer(configId);
      });
      this.activeTimers.clear();

      // Reload configs
      await this.reloadConfigs();

      const newTimers = this.activeTimers.size;

      loggers.scheduler.info(
        `[DEBUG-RELOAD] Reload complete (new: ${newTimers})`,
      );

      return {
        success: true,
        message: `Reloaded configurations: ${previousTimers} → ${newTimers} active timers`,
        previousTimers,
        newTimers,
      };
    } catch (error: any) {
      loggers.scheduler.error("[DEBUG-RELOAD] Force reload failed:", error);
      return {
        success: false,
        message: `Reload failed: ${error.message}`,
        previousTimers: 0,
        newTimers: 0,
      };
    }
  }

  /**
   * DEBUG FUNCTION: Get timer details
   */
  public debugGetTimerDetails(): {
    totalTimers: number;
    timers: Array<{
      configId: string;
      hasInitialTimer: boolean;
      hasIntervalTimer: boolean;
    }>;
  } {
    const timers = Array.from(this.activeTimers.entries()).map(
      ([configId, timerData]) => ({
        configId,
        hasInitialTimer: !!timerData.timer,
        hasIntervalTimer: !!timerData.intervalTimer,
      }),
    );

    return {
      totalTimers: timers.length,
      timers,
    };
  }
}

/**
 * Get singleton instance
 */
export function getLoggingSchedulerService(): LoggingSchedulerService {
  if (!globalForScheduler._loggingSchedulerInstance) {
    const newInstance = new LoggingSchedulerService();
    globalForScheduler._loggingSchedulerInstance = newInstance;
    instance = newInstance;

    // Auto-initialize
    newInstance.initialize().catch((error) => {
      loggers.scheduler.error(
        "Failed to auto-initialize logging scheduler",
        error,
      );
    });
  } else {
    // Sync local variable with global on module re-evaluation
    instance = globalForScheduler._loggingSchedulerInstance;
  }

  return globalForScheduler._loggingSchedulerInstance;
}

/**
 * Get instance (for API access) - may return null if not initialized yet
 */
export function getLoggingSchedulerInstance(): LoggingSchedulerService | null {
  return globalForScheduler._loggingSchedulerInstance ?? null;
}
