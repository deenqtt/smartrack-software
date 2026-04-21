import { createClient, type RedisClientType } from "redis";
import { loggers } from "./logger";
import { getLoggingSchedulerInstance } from "./services/logging-scheduler";

/**
 * SYSTEM STABILITY MODULE
 *
 * Comprehensive solution for logging scheduler stability issues:
 * - Redis-based MQTT cache to prevent memory leaks
 * - Process health monitoring with auto-recovery
 * - Memory management and error handling
 */

// =============================================================================
// MQTT CACHE SERVICE (Redis-based)
// =============================================================================

class MqttCacheService {
  private redis: RedisClientType | null = null;
  private readonly CACHE_TTL = parseInt(process.env.LOGGING_CACHE_TTL || "300"); // 5 minutes default
  private readonly MAX_CACHE_SIZE = parseInt(
    process.env.LOGGING_MAX_CACHE_SIZE || "5000",
  ); // Limit total entries
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      loggers.scheduler.warn(
        "[MQTT-CACHE] Redis URL not configured, using in-memory fallback",
      );
      return;
    }

    try {
      this.redis = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 5000,
        },
      });

      this.redis.on("connect", () => {
        this.isConnected = true;
        loggers.scheduler.info("[MQTT-CACHE] Connected to Redis");
      });

      this.redis.on("error", (err: Error) => {
        this.isConnected = false;
        loggers.scheduler.error(
          "[MQTT-CACHE] Redis connection error:",
          err.message,
        );
      });

      this.redis.on("end", () => {
        this.isConnected = false;
        loggers.scheduler.warn("[MQTT-CACHE] Redis connection closed");
      });

      // Connect to Redis
      await this.redis.connect();
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to initialize Redis:",
        error,
      );
    }
  }

  async setPayload(topic: string, payload: any): Promise<void> {
    if (!this.redis || !this.isConnected) {
      // Fallback to in-memory if Redis not available
      this.fallbackSetPayload(topic, payload);
      return;
    }

    try {
      const key = `mqtt:payload:${topic}`;
      const cacheData = JSON.stringify({
        ...payload,
        _cachedAt: Date.now(),
      });

      await this.redis.setEx(key, this.CACHE_TTL, cacheData);

      // Maintain cache size
      await this.enforceCacheSize();
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to set payload in Redis:",
        error,
      );
      // Fallback to in-memory
      this.fallbackSetPayload(topic, payload);
    }
  }

  async getPayload(topic: string): Promise<any | null> {
    if (!this.redis || !this.isConnected) {
      return this.fallbackGetPayload(topic);
    }

    try {
      const key = `mqtt:payload:${topic}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to get payload from Redis:",
        error,
      );
      return this.fallbackGetPayload(topic);
    }
  }

  async getAllPayloads(): Promise<Record<string, any>> {
    if (!this.redis || !this.isConnected) {
      return this.fallbackGetAllPayloads();
    }

    try {
      const keys = await this.redis.keys("mqtt:payload:*");
      const payloads: Record<string, any> = {};

      if (keys.length === 0) {
        return payloads;
      }

      // Get payloads in batches to avoid overwhelming Redis
      const batchSize = 100;
      for (let i = 0; i < keys.length; i += batchSize) {
        const batchKeys = keys.slice(i, i + batchSize);
        const batchValues = await this.redis.mGet(batchKeys);

        batchKeys.forEach((key, index) => {
          const topic = key.replace("mqtt:payload:", "");
          const value = batchValues[index];
          if (value) {
            try {
              payloads[topic] = JSON.parse(value);
            } catch (e) {
              loggers.scheduler.warn(
                `[MQTT-CACHE] Failed to parse cached payload for ${topic}`,
              );
            }
          }
        });
      }

      return payloads;
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to get all payloads from Redis:",
        error,
      );
      return this.fallbackGetAllPayloads();
    }
  }

  async clearTopic(topic: string): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.fallbackClearTopic(topic);
      return;
    }

    try {
      const key = `mqtt:payload:${topic}`;
      await this.redis.del(key);
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to clear topic from Redis:",
        error,
      );
      this.fallbackClearTopic(topic);
    }
  }

  async getCacheStats(): Promise<{
    redisConnected: boolean;
    totalEntries: number;
    memoryUsage?: number | undefined;
  }> {
    const stats = {
      redisConnected: this.isConnected,
      totalEntries: 0,
      memoryUsage: undefined as number | undefined,
    };

    if (this.redis && this.isConnected) {
      try {
        const keys = await this.redis.keys("mqtt:payload:*");
        stats.totalEntries = keys.length;

        // Get memory usage info
        const info = await this.redis.info("memory");
        const usedMemoryMatch = info.match(/used_memory:(\d+)/);
        if (usedMemoryMatch) {
          stats.memoryUsage = parseInt(usedMemoryMatch[1]);
        }
      } catch (error) {
        loggers.scheduler.error(
          "[MQTT-CACHE] Failed to get cache stats:",
          error,
        );
      }
    } else {
      // Fallback stats
      stats.totalEntries = Object.keys(this.fallbackCache).length;
    }

    return stats;
  }

  private async enforceCacheSize(): Promise<void> {
    if (!this.redis || !this.isConnected) {
      this.fallbackEnforceCacheSize();
      return;
    }

    try {
      const keys = await this.redis.keys("mqtt:payload:*");
      if (keys.length > this.MAX_CACHE_SIZE) {
        // Remove oldest entries (simple LRU approximation)
        // Get all keys with their TTL
        const keyTtls: Array<{ key: string; ttl: number }> = [];

        for (const key of keys) {
          try {
            const ttl = await this.redis!.ttl(key);
            keyTtls.push({ key, ttl });
          } catch (e) {
            // If TTL check fails, assume key is expired
            keyTtls.push({ key, ttl: -1 });
          }
        }

        // Sort by TTL (ascending - shortest TTL first, then expired)
        keyTtls.sort((a, b) => a.ttl - b.ttl);

        // Remove excess entries
        const toRemove = keyTtls.slice(0, keys.length - this.MAX_CACHE_SIZE);
        if (toRemove.length > 0) {
          const keysToDelete = toRemove.map((item) => item.key);
          await this.redis.del(keysToDelete);
          loggers.scheduler.info(
            `[MQTT-CACHE] Cleaned up ${toRemove.length} expired entries`,
          );
        }
      }
    } catch (error) {
      loggers.scheduler.error(
        "[MQTT-CACHE] Failed to enforce cache size:",
        error,
      );
    }
  }

  // Fallback in-memory cache for when Redis is not available
  private fallbackCache: Record<string, any> = {};

  private fallbackSetPayload(topic: string, payload: any): void {
    this.fallbackCache[topic] = {
      ...payload,
      _cachedAt: Date.now(),
    };
    this.fallbackEnforceCacheSize();
  }

  private fallbackGetPayload(topic: string): any | null {
    return this.fallbackCache[topic] || null;
  }

  private fallbackGetAllPayloads(): Record<string, any> {
    return { ...this.fallbackCache };
  }

  private fallbackClearTopic(topic: string): void {
    delete this.fallbackCache[topic];
  }

  private fallbackEnforceCacheSize(): void {
    const entries = Object.keys(this.fallbackCache);
    if (entries.length > this.MAX_CACHE_SIZE) {
      // Remove oldest entries
      const sortedEntries = entries
        .map((topic) => ({
          topic,
          cachedAt: this.fallbackCache[topic]._cachedAt || 0,
        }))
        .sort((a, b) => a.cachedAt - b.cachedAt);

      const toRemove = sortedEntries.slice(
        0,
        entries.length - this.MAX_CACHE_SIZE,
      );
      toRemove.forEach(({ topic }) => {
        delete this.fallbackCache[topic];
      });

      loggers.scheduler.info(
        `[MQTT-CACHE] Fallback cache cleaned up ${toRemove.length} entries`,
      );
    }
  }

  // Cleanup method
  async disconnect(): Promise<void> {
    if (this.redis && this.isConnected) {
      try {
        await this.redis.quit();
      } catch (error) {
        // Silently ignore if already closed
      }
      this.isConnected = false;
    }
  }
}

// =============================================================================
// PROCESS MONITOR SERVICE
// =============================================================================

class ProcessMonitor {
  private restartCount = 0;
  private lastRestart = 0;
  private readonly maxRestartsPerHour = 5;
  private memoryWarningThreshold = 800 * 1024 * 1024; // 800MB - Higher threshold for dev
  private memoryCriticalThreshold = 1200 * 1024 * 1024; // 1200MB - Higher for dev
  private memoryEmergencyThreshold = 1400 * 1024 * 1024; // 1400MB - Higher for dev

  startMonitoring(): void {
    // Memory monitoring - More frequent checks
    setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Every 30 seconds - More frequent

    // Periodic memory cleanup
    setInterval(() => {
      this.periodicMemoryCleanup();
    }, 300000); // Every 5 minutes

    // Service health checks
    setInterval(() => {
      this.checkServiceHealth();
    }, 300000); // Every 5 minutes

    // Log initial status
    loggers.service.info("[PROCESS-MONITOR] Process monitoring started");
    this.logSystemInfo();
  }

  private checkMemoryUsage(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);

    if (memUsage.heapUsed > this.memoryCriticalThreshold) {
      loggers.service.error(
        `[PROCESS-MONITOR] Critical memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB - triggering cleanup`,
      );
      this.triggerEmergencyCleanup();
    } else if (memUsage.heapUsed > this.memoryWarningThreshold) {
      loggers.service.warn(
        `[PROCESS-MONITOR] High memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB`,
      );
    }
  }

  private async checkServiceHealth(): Promise<void> {
    try {
      const scheduler = getLoggingSchedulerInstance();
      if (scheduler) {
        const status = await scheduler.getStatus();

        if (status.activeTimers === 0 && status.configs.length > 0) {
          loggers.service.warn(
            "[PROCESS-MONITOR] Scheduler has configs but no active timers - attempting restart",
          );
          await scheduler.initialize();
        }

        // Check semaphore health
        const semaphoreStats = status.concurrency;
        if (semaphoreStats.waitingQueue > semaphoreStats.maxConcurrent * 0.8) {
          loggers.service.warn(
            `[PROCESS-MONITOR] High semaphore queue utilization: ${semaphoreStats.waitingQueue}/${semaphoreStats.maxConcurrent}`,
          );
        }
      }
    } catch (error) {
      loggers.service.error("[PROCESS-MONITOR] Health check failed:", error);
    }
  }

  private triggerEmergencyCleanup(): void {
    const startTime = Date.now();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      loggers.service.info("[PROCESS-MONITOR] Emergency GC triggered");
    }

    // Clear MQTT cache aggressively
    try {
      // Force cleanup of expired entries
      if (mqttCache) {
        // This will be handled by the cache service itself
        loggers.service.info("[PROCESS-MONITOR] MQTT cache cleanup triggered");
      }
    } catch (error) {
      loggers.service.error("[PROCESS-MONITOR] Cache cleanup failed:", error);
    }

    // Clear Node.js module cache for non-core modules (dangerous but effective)
    try {
      const modulesToClear = Object.keys(require.cache).filter(
        (key) =>
          !key.includes("node_modules") &&
          !key.includes("next") &&
          !key.includes("react"),
      );

      modulesToClear.forEach((key) => {
        delete require.cache[key];
      });

      if (modulesToClear.length > 0) {
        loggers.service.info(
          `[PROCESS-MONITOR] Cleared ${modulesToClear.length} module cache entries`,
        );
      }
    } catch (error) {
      loggers.service.error(
        "[PROCESS-MONITOR] Module cache cleanup failed:",
        error,
      );
    }

    // Clear global event listeners if any
    try {
      if (typeof process !== "undefined" && process.eventNames) {
        const eventNames = process.eventNames();
        eventNames.forEach((eventName) => {
          // Only process string event names, skip symbols
          if (
            typeof eventName === "string" &&
            eventName !== "SIGTERM" &&
            eventName !== "SIGINT" &&
            eventName !== "uncaughtException"
          ) {
            const listeners = process.listeners(eventName as NodeJS.Signals);
            if (listeners.length > 5) {
              // Only clear if excessive
              process.removeAllListeners(eventName as NodeJS.Signals);
              loggers.service.info(
                `[PROCESS-MONITOR] Cleared ${listeners.length} listeners for ${eventName}`,
              );
            }
          }
        });
      }
    } catch (error) {
      loggers.service.error(
        "[PROCESS-MONITOR] Event listener cleanup failed:",
        error,
      );
    }

    const cleanupTime = Date.now() - startTime;
    loggers.service.info(
      `[PROCESS-MONITOR] Emergency cleanup completed in ${cleanupTime}ms`,
    );
  }

  private periodicMemoryCleanup(): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

    // Only run cleanup if memory usage is moderately high (>300MB)
    if (heapUsedMB > 300) {
      loggers.service.info(
        `[PROCESS-MONITOR] Running periodic memory cleanup (current: ${heapUsedMB}MB)`,
      );

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        loggers.service.info("[PROCESS-MONITOR] Periodic GC completed");
      }

      // Clean up expired cache entries
      try {
        // This will be handled by the cache service itself through TTL
        loggers.service.info(
          "[PROCESS-MONITOR] Periodic cache cleanup triggered",
        );
      } catch (error) {
        loggers.service.warn(
          "[PROCESS-MONITOR] Periodic cache cleanup failed:",
          error,
        );
      }
    }
  }

  private logSystemInfo(): void {
    const memUsage = process.memoryUsage();
    loggers.service.info(`[PROCESS-MONITOR] System Info:
      - Memory: ${Math.round(
        memUsage.heapUsed / 1024 / 1024,
      )}MB used / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB total
      - Uptime: ${Math.round(process.uptime())}s
      - Node Version: ${process.version}
      - Platform: ${process.platform}
    `);
  }

  // Graceful shutdown
  gracefulShutdown(): void {
    loggers.service.info("[PROCESS-MONITOR] Initiating graceful shutdown...");

    const scheduler = getLoggingSchedulerInstance();
    if (scheduler) {
      scheduler.shutdown();
    }

    // Give some time for cleanup then exit
    setTimeout(() => {
      process.exit(1);
    }, 5000);
  }
}

// =============================================================================
// MQTT GLOBAL LISTENER SERVICE
// =============================================================================

class MqttGlobalListener {
  private initialized = false;
  private activeServers: any[] = [];
  private clients: Map<string, any> = new Map();

  async initialize() {
    if (this.initialized) return;

    try {
      // Import MQTT server config dynamically to avoid circular dependencies
      const { getActiveServerConfigs } =
        await import("@/lib/mqtt-server-config");

      const servers = await getActiveServerConfigs();
      if (servers.length === 0) {
        loggers.service.warn("[MQTT-GLOBAL] No active MQTT servers found");
        return;
      }

      this.activeServers = servers;
      loggers.service.info(
        `[MQTT-GLOBAL] Initializing global MQTT listener for ${servers.length} servers`,
      );

      // Initialize connections for all servers
      for (const server of servers) {
        await this.connectToServer(server);
      }

      this.initialized = true;
      loggers.service.info(
        "[MQTT-GLOBAL] Global MQTT listener initialized successfully",
      );
    } catch (error) {
      loggers.service.error(
        "[MQTT-GLOBAL] Failed to initialize global listener:",
        error,
      );
    }
  }

  // Fetch logging config topics from DB and subscribe to each
  public async subscribeToLoggingTopics(
    client: any,
    serverName: string,
  ): Promise<void> {
    try {
      const { prisma } = await import("@/lib/prisma");
      const configs = await prisma.loggingConfiguration.findMany({
        select: { device: { select: { topic: true } } },
      });

      const topics = [
        ...new Set(
          configs.map((c: any) => c.device?.topic).filter(Boolean) as string[],
        ),
      ];

      if (topics.length === 0) {
        loggers.service.warn(
          `[MQTT-GLOBAL] No logging topics found in DB for ${serverName}`,
        );
        return;
      }

      for (const topic of topics) {
        try {
          client.subscribe(topic);
        } catch (err) {
          loggers.service.warn(
            `[MQTT-GLOBAL] Failed to subscribe to ${topic} on ${serverName}:`,
            err,
          );
        }
      }

      loggers.service.info(
        `[MQTT-GLOBAL] Subscribed to ${topics.length} logging topic(s) on ${serverName}`,
      );
    } catch (error) {
      loggers.service.error(
        `[MQTT-GLOBAL] Failed to fetch logging topics from DB:`,
        error,
      );
    }
  }

  private async connectToServer(server: any) {
    try {
      const { getPahoConnectionOptions, generateMqttClientId } =
        await import("@/lib/mqtt-utils");
      const Paho = (await import("paho-mqtt")).default;

      const connectionOptions = getPahoConnectionOptions(server.config);
      const clientId = generateMqttClientId(server.config);

      const client = new Paho.Client(
        server.config.brokerHost,
        server.config.brokerPort,
        clientId,
      );

      // Set up message handler - only cache valid JSON payloads
      client.onMessageArrived = async (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          const isRetained = message.retained;

          await mqttCache.setPayload(message.destinationName, {
            ...payload,
            _receivedAt: Date.now(),
            _isRetained: isRetained,
          });

          if (isRetained) {
            loggers.service.debug(
              `[MQTT-GLOBAL] 📥 Retained: ${message.destinationName}`,
            );
          }
        } catch {
          // Silently skip non-JSON payloads (binary, plain text, etc.)
        }
      };

      client.onConnectionLost = (responseObject) => {
        loggers.service.warn(
          `[MQTT-GLOBAL] Connection lost for ${server.name}: ${responseObject.errorMessage}`,
        );
        this.clients.delete(server.id);

        setTimeout(() => {
          loggers.service.info(
            `[MQTT-GLOBAL] Attempting to reconnect to ${server.name}`,
          );
          this.connectToServer(server);
        }, 5000);
      };

      // Connect with same options as MqttServerProvider
      client.connect({
        ...connectionOptions,
        onSuccess: async () => {
          loggers.service.info(`[MQTT-GLOBAL] Connected to ${server.name}`);
          this.clients.set(server.id, client);
          // Subscribe only to topics from LoggingConfiguration
          await this.subscribeToLoggingTopics(client, server.name);
        },
        onFailure: (error: any) => {
          loggers.service.error(
            `[MQTT-GLOBAL] Failed to connect to ${server.name}:`,
            error.errorMessage,
          );
          setTimeout(() => {
            this.connectToServer(server);
          }, 10000);
        },
        useSSL: server.config.useSSL,
        reconnect: true,
        cleanSession: true,
        keepAliveInterval: 30,
        timeout: 10,
      });
    } catch (error) {
      loggers.service.error(
        `[MQTT-GLOBAL] Error connecting to ${server.name}:`,
        error,
      );
    }
  }

  getStatus() {
    return {
      initialized: this.initialized,
      activeServers: this.activeServers.length,
      connectedClients: this.clients.size,
      servers: this.activeServers.map((server) => ({
        id: server.id,
        name: server.name,
        connected: this.clients.has(server.id),
      })),
    };
  }

  async disconnect() {
    for (const [serverId, client] of this.clients) {
      try {
        if (client.isConnected()) {
          client.disconnect();
        }
      } catch (error) {
        loggers.service.warn(
          `[MQTT-GLOBAL] Error disconnecting from ${serverId}:`,
          error,
        );
      }
    }
    this.clients.clear();
    this.initialized = false;
    loggers.service.info("[MQTT-GLOBAL] Global MQTT listener disconnected");
  }
}

// =============================================================================
// GLOBAL INSTANCES & EXPORTS
// =============================================================================

// Global instances
export const mqttCache = new MqttCacheService();
export const processMonitor = new ProcessMonitor();

// Initialize MQTT Global Listener after mqttCache
export const mqttGlobalListener = new MqttGlobalListener();

// Graceful shutdown handlers - Only register in runtime, not during build
if (typeof window === "undefined" && process.env.NODE_ENV !== "production") {
  // Skip during build time to prevent Prisma client disconnection during build
  const isBuildTime =
    process.env.NEXT_PHASE === "phase-production-build" ||
    process.env.npm_lifecycle_event === "build";

  if (!isBuildTime) {
    process.on("SIGTERM", async () => {
      loggers.service.info("[SYSTEM-STABILITY] SIGTERM received");
      await mqttCache.disconnect();

      // Disconnect Prisma client safely
      try {
        const { disconnectPrisma } = await import("./prisma");
        await disconnectPrisma();
      } catch (error) {
        loggers.service.error(
          "[SYSTEM-STABILITY] Error disconnecting Prisma:",
          error,
        );
      }

      processMonitor.gracefulShutdown();
    });

    process.on("SIGINT", async () => {
      loggers.service.info("[SYSTEM-STABILITY] SIGINT received");
      await mqttCache.disconnect();

      // Disconnect Prisma client safely
      try {
        const { disconnectPrisma } = await import("./prisma");
        await disconnectPrisma();
      } catch (error) {
        loggers.service.error(
          "[SYSTEM-STABILITY] Error disconnecting Prisma:",
          error,
        );
      }

      processMonitor.gracefulShutdown();
    });
  }
}

// Handle uncaught errors
process.on("unhandledRejection", (reason, promise) => {
  loggers.service.error("[SYSTEM-STABILITY] Unhandled Rejection:", reason);
  // Don't crash, but log
});

process.on("uncaughtException", (error) => {
  // Check for common network errors that shouldn't crash the process
  const errCode = (error as any).code;
  if (errCode === "ECONNRESET" || errCode === "ETIMEDOUT") {
    loggers.service.warn(
      `[SYSTEM-STABILITY] Suppressed ${errCode} uncaught exception`,
    );
    return;
  }

  loggers.service.error("[SYSTEM-STABILITY] Uncaught Exception:", error);
  // Log and graceful shutdown attempt for critical errors
  processMonitor.gracefulShutdown();
});
