import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  cleanupLoggedData,
  getDataLimits,
} from "@/lib/services/data-limits-service";
import Paho from "paho-mqtt";
import { getActiveServerConfigs } from "@/lib/mqtt-server-config";
import { getPahoConnectionOptions } from "@/lib/mqtt-utils";
import { mqttCache } from "@/lib/system-stability";

//  GLOBAL MQTT CLIENT (Truly Persistent with Auto-Reconnect)
let globalMqttClient: Paho.Client | null = null;
// let latestPayloadsCache: Record<string, any> = {}; // Replaced with Redis cache
let subscribedTopics = new Set<string>();
let isConnecting = false;
let isConnected = false;
let connectionPromise: Promise<void> | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let reconnectAttempts = 0;

// Global logging flag for this module
let globalLoggingEnabled = false;

// Global logging function
function logCron(level: "info" | "warn" | "error", message: string) {
  if (globalLoggingEnabled || level === "error") {
    switch (level) {
      case "info":
        console.info(message);
        break;
      case "warn":
        console.warn(message);
        break;
      case "error":
        console.error(message);
        break;
    }
  }
}

/**
 *  Auto-reconnect function
 */
async function attemptReconnect(requiredTopics: string[]): Promise<void> {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Max 30s
  reconnectAttempts++;

  logCron(
    "info",
    `[MQTT] Reconnecting in ${delay / 1000}s (#${reconnectAttempts})`
  );

  reconnectTimer = setTimeout(async () => {
    try {
      await ensureMqttConnection(requiredTopics, true);
      reconnectAttempts = 0; // Reset on successful reconnect
    } catch (error) {
      console.error("[MQTT] ❌ Reconnect failed:", error);
      // Will retry again via onConnectionLost
    }
  }, delay);
}

/**
 *  Initialize persistent MQTT connection with auto-reconnect
 */
async function ensureMqttConnection(
  requiredTopics: string[],
  isReconnect: boolean = false
): Promise<void> {
  //  If already connected, just subscribe to new topics if needed
  if (isConnected && globalMqttClient) {
    const missingTopics = requiredTopics.filter(
      (t) => !subscribedTopics.has(t)
    );

    if (missingTopics.length > 0) {
      logCron(
        "info",
        `[MQTT] Subscribing to ${missingTopics.length} new topics`
      );
      missingTopics.forEach((topic) => {
        try {
          globalMqttClient!.subscribe(topic);
          subscribedTopics.add(topic);
        } catch (error) {
          console.error(`[MQTT] ❌ Failed to subscribe to ${topic}:`, error);
        }
      });
    }

    return; //  Connection already active
  }

  //  If currently connecting, wait for existing attempt
  if (isConnecting && connectionPromise && !isReconnect) {
    await connectionPromise;
    return;
  }

  //  Start new connection
  isConnecting = true;

  connectionPromise = new Promise<void>(async (resolve, reject) => {
    logCron(
      "info",
      `[MQTT] ${isReconnect ? "Reconnecting" : "Initializing"
      } persistent MQTT connection...`
    );

    try {
      // === NEW LOGIC: FETCH CONFIG FROM DB ===
      const serverConfigs = await getActiveServerConfigs();
      if (serverConfigs.length === 0) {
        throw new Error(
          "No active MQTT server configurations found in database."
        );
      }
      const primaryConfig = serverConfigs[0]; // Use the first active config
      if (!primaryConfig.config) {
        throw new Error(
          `Configuration for server ${primaryConfig.name} is incomplete.`
        );
      }
      const connectionOptions = getPahoConnectionOptions(primaryConfig.config);
      logCron(
        "info",
        `[MQTT] Using config: "${primaryConfig.name}" (${primaryConfig.config.brokerHost}:${primaryConfig.config.brokerPort})`
      );
      // =======================================

      const topicsToResubscribe = Array.from(subscribedTopics);

      globalMqttClient = new Paho.Client(
        primaryConfig.config.brokerHost,
        primaryConfig.config.brokerPort,
        `cron-logger-persistent-${Date.now()}`
      );

      globalMqttClient.onMessageArrived = async (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          const isRetained = message.retained;

          // Store in Redis cache
          await mqttCache.setPayload(message.destinationName, {
            ...payload,
            _receivedAt: Date.now(),
            _isRetained: isRetained,
          });

          if (isRetained) {
            logCron(
              "info",
              `[MQTT] 📥 Retained message received: ${message.destinationName}`
            );
          }
        } catch (e) {
          console.error(
            `[MQTT] ❌ Failed to parse payload from ${message.destinationName}`
          );
        }
      };

      globalMqttClient.onConnectionLost = (responseObject) => {
        isConnected = false;
        isConnecting = false;
        connectionPromise = null;
        console.error(`[MQTT] Connection lost: ${responseObject.errorMessage}`);
        logCron(
          "info",
          `[MQTT] Auto-reconnecting (${subscribedTopics.size} topics)...`
        );
        attemptReconnect(Array.from(subscribedTopics));
      };

      // Merge Paho options with our handlers
      const finalConnectionOptions = {
        ...connectionOptions,
        onSuccess: () => {
          isConnected = true;
          isConnecting = false;
          reconnectAttempts = 0;

          logCron(
            "info",
            `[MQTT] ${isReconnect ? "Reconnected" : "Connected"} via "${primaryConfig.name
            }"`
          );

          subscribedTopics.clear();
          const allTopics = [
            ...new Set([...requiredTopics, ...topicsToResubscribe]),
          ];
          let subscribeErrors = 0;
          allTopics.forEach((topic) => {
            try {
              globalMqttClient!.subscribe(topic);
              subscribedTopics.add(topic);
            } catch (error) {
              console.error(`[MQTT] Failed to subscribe to ${topic}:`, error);
              subscribeErrors++;
            }
          });

          logCron(
            "info",
            `[MQTT] Ready (${allTopics.length - subscribeErrors}/${allTopics.length
            } topics)`
          );

          setTimeout(
            async () => {
              const cacheStats = await mqttCache.getCacheStats();
              logCron(
                "info",
                `[MQTT] Cache: ${cacheStats.totalEntries} payload(s)`
              );
              resolve();
            },
            isReconnect ? 500 : 1500
          );
        },
        onFailure: (err: any) => {
          isConnecting = false;
          isConnected = false;
          connectionPromise = null;
          console.error(
            `[MQTT] ❌ Failed to connect to "${primaryConfig.name}":`,
            err.errorMessage
          );

          if (isReconnect) {
            const topicsToRetry = Array.from(subscribedTopics);
            attemptReconnect(topicsToRetry);
            resolve();
          } else {
            reject(new Error(err.errorMessage));
          }
        },
        useSSL: primaryConfig.config.useSSL, // Ensure SSL is correctly sourced from config
      };

      globalMqttClient.connect(finalConnectionOptions);
    } catch (error) {
      isConnecting = false;
      isConnected = false;
      connectionPromise = null;
      reject(error);
    }
  });

  await connectionPromise;
}

/**
 *  Main GET handler
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  // Get parameters from query
  const searchParams = request.nextUrl.searchParams;
  const intervalParam = searchParams.get("interval");
  const configIdParam = searchParams.get("configId");
  const queryEnableLogging = searchParams.get("enableLogging");

  // Default from environment variable, override with query param if provided
  const envLoggingEnabled = process.env.CRON_LOGGING_ENABLED === "true";
  const loggingEnabled =
    queryEnableLogging !== null
      ? queryEnableLogging === "true"
      : envLoggingEnabled;

  // Set global logging flag for this request
  globalLoggingEnabled = loggingEnabled;

  const interval = intervalParam ? parseInt(intervalParam) : null;

  // Helper function for conditional logging
  const log = (level: "info" | "warn" | "error", message: string) => {
    if (loggingEnabled || level === "error") {
      switch (level) {
        case "info":
          console.info(message);
          break;
        case "warn":
          console.warn(message);
          break;
        case "error":
          console.error(message);
          break;
      }
    }
  };

  // Build where clause
  let whereClause: any = {};

  if (configIdParam) {
    whereClause = { id: configIdParam };
  } else if (interval) {
    whereClause = { loggingIntervalMinutes: interval };
  }

  // Fetch configs from database
  const configs = await prisma.loggingConfiguration.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: { device: true },
  });

  if (configs.length === 0) {
    return NextResponse.json({
      message: configIdParam
        ? `Config ${configIdParam} not found`
        : interval
          ? `No configs for ${interval} minute interval`
          : "No configs found",
      logged: 0,
    });
  }

  // Simplified logging - only show basic info
  if (configIdParam) {
    log("info", `[CRON] Processing ${configs[0].customName}`);
  } else {
    log("info", `[CRON] Processing ${configs.length} configs`);
  }

  // Get unique topics
  const topics = [...new Set(configs.map((c: any) => c.device.topic))] as string[];

  //  Ensure MQTT connection (persistent)
  try {
    await ensureMqttConnection(topics);
  } catch (error: any) {
    console.error(`[MQTT] ❌ Connection error:`, error.message);
    return NextResponse.json(
      { message: `Failed to connect to MQTT: ${error.message}`, logged: 0 },
      { status: 500 }
    );
  }

  //  Get current cache state from Redis
  const currentCache: Record<string, any> = await mqttCache.getAllPayloads();
  const hasAllPayloads = topics.every((topic) => currentCache[topic]);

  log(
    "info",
    `[MQTT] Initial cache status: ${Object.keys(currentCache).length
    } cached, topics needed: ${topics.length}`
  );
  log("info", `[MQTT] Topics needed: ${topics.join(", ")}`);

  if (!hasAllPayloads) {
    log("info", "[MQTT] ⏳ Waiting for fresh payloads...");

    // Wait up to 3 seconds for payloads to arrive
    const waitStart = Date.now();
    const maxWait = 3000;

    while (Date.now() - waitStart < maxWait) {
      const updatedCache: Record<string, any> = await mqttCache.getAllPayloads();
      const allReceived = topics.filter((topic) => updatedCache[topic]);
      if (allReceived.length === topics.length) {
        log(
          "info",
          `[MQTT]  All payloads received in ${Date.now() - waitStart}ms`
        );
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200)); // Check every 200ms
    }

    const finalCache: Record<string, any> = await mqttCache.getAllPayloads();
    const finalCheck = topics.filter((topic) => !finalCache[topic]);
    log(
      "info",
      `[MQTT] Missing payloads after wait: ${finalCheck.length
      } topics: ${finalCheck.join(", ")}`
    );
  }

  //  Get payloads from cache (INSTANT!)
  const finalCache: Record<string, any> = await mqttCache.getAllPayloads();
  const logEntries = [];

  for (const config of configs) {
    const topic = config.device.topic;
    const payload = finalCache[topic];

    if (!payload) {
      log(
        "warn",
        `[CRON] ⚠️  No cached payload for topic ${topic} (Config: ${config.customName})`
      );
      continue;
    }

    // Validate payload freshness (configurable stale threshold)
    const staleThresholdMs = parseInt(
      process.env.LOGGING_STALE_THRESHOLD_MS || "300000"
    ); // Default 5 minutes (300 seconds)

    // Extended threshold for retained messages (since they're "last known good state")
    // Retained messages represent the last known state of offline devices
    const retainedStaleThresholdMs = parseInt(
      process.env.LOGGING_RETAINED_STALE_THRESHOLD_MS || "86400000"
    ); // Default 24 hours for retained messages

    const payloadAge = Date.now() - (payload._receivedAt || 0);
    const isRetained = payload._isRetained;
    const applicableThreshold = isRetained
      ? retainedStaleThresholdMs
      : staleThresholdMs;

    if (payloadAge > applicableThreshold) {
      log(
        "warn",
        `[CRON] ⚠️  ${isRetained ? "Retained" : "Live"
        } payload too old for topic ${topic} (${Math.round(
          payloadAge / 1000
        )}s old > ${Math.round(
          applicableThreshold / 1000
        )}s threshold) (Config: ${config.customName})`
      );
      continue;
    }

    // Log retained message usage
    if (isRetained) {
      log(
        "info",
        `[CRON] 📚 Using retained message for ${config.customName
        } (${Math.round(payloadAge / 1000)}s old)`
      );
    }

    try {
      // --- FLEXIBLE PAYLOAD PARSING ---
      let innerValue;
      if (payload.value && typeof payload.value === "object") {
        innerValue = payload.value;
      } else if (payload.value && typeof payload.value === "string") {
        try {
          innerValue = JSON.parse(payload.value.replace(/\bNaN\b/g, "null"));
        } catch {
          innerValue = payload; // Fallback to using the parent payload if string parsing fails
        }
      } else {
        innerValue = payload; // Fallback for non-standard structures (value is top-level)
      }

      let valueToLog = innerValue[config.key];
      log(
        "info",
        `[DEBUG] ${config.id} - ${config.key
        }: ${valueToLog} (${typeof valueToLog})`
      );

      if (valueToLog !== undefined && valueToLog !== null) {
        // Handle boolean values for drycontact and relay
        if (typeof valueToLog === "boolean") {
          valueToLog = valueToLog ? 1 : 0;
        }

        if (!isNaN(parseFloat(valueToLog))) {
          let finalValue = parseFloat(valueToLog);
          if (config.multiply) {
            finalValue *= config.multiply;
          }

          logEntries.push({
            configId: config.id,
            value: finalValue,
          });

          log(
            "info",
            `[CRON] ✅ Logged ${config.customName}: ${finalValue} ${config.units || ""
            }`
          );
        } else {
          log(
            "warn",
            `[CRON] ⚠️  Key "${config.key}" invalid value type in payload for ${topic} (Config: ${config.customName})`
          );
        }
      } else {
        // 🔄 FALLBACK STRATEGY: Use last known good value from database
        log(
          "warn",
          `[CRON] ⚠️  Key "${config.key}" not found in payload for ${topic} (Config: ${config.customName}) - Using fallback`
        );

        // Get last known value from database
        const lastEntry = await prisma.loggedData.findFirst({
          where: { configId: config.id },
          orderBy: { timestamp: "desc" },
          select: { value: true, timestamp: true },
        });

        if (lastEntry) {
          logEntries.push({
            configId: config.id,
            value: lastEntry.value,
          });

          log(
            "info",
            `[CRON] 🔄 Fallback logged ${config.customName}: ${lastEntry.value
            } ${config.units || ""} (last: ${lastEntry.timestamp
              .toISOString()
              .slice(11, 19)})`
          );
        } else {
          log(
            "warn",
            `[CRON] ❌ No fallback data available for ${config.customName}`
          );
        }
      }
    } catch (e) {
      console.error(
        `[CRON] ❌ Failed to process payload for "${config.customName}":`,
        e
      );
    }
  }

  // Save to database with retry
  let savedCount = 0;

  if (logEntries.length > 0) {
    try {
      // Re-fetch configs to verify they still exist
      const configIds = logEntries.map((entry) => entry.configId);
      const existingConfigs = await prisma.loggingConfiguration.findMany({
        where: { id: { in: configIds } },
        select: { id: true },
      });

      const existingConfigIds = new Set(existingConfigs.map((c: any) => c.id));

      // Filter out entries for deleted configs
      const validLogEntries = logEntries.filter((entry) =>
        existingConfigIds.has(entry.configId)
      );

      const skippedCount = logEntries.length - validLogEntries.length;

      if (skippedCount > 0) {
        log(
          "warn",
          `[CRON] ⚠️  Skipped ${skippedCount} log entries (configs deleted)`
        );
      }

      if (validLogEntries.length > 0) {
        // Pre-cleanup: Cek dan hapus data lama jika akan over limit
        try {
          const limits = await getDataLimits();
          const currentCount = await prisma.loggedData.count();
          const newTotal = currentCount + validLogEntries.length;

          if (newTotal > limits.loggedData) {
            const excess = newTotal - limits.loggedData;
            log(
              "info",
              `[CRON] 🧹 Pre-cleanup needed: ${currentCount} + ${validLogEntries.length} = ${newTotal} > ${limits.loggedData}, removing ${excess} old records`
            );

            // Hapus data lama sebelum insert (Efficient range deletion)
            const cutoffRecord = await prisma.loggedData.findFirst({
              where: {},
              orderBy: { timestamp: "asc" },
              skip: excess - 1,
              select: { timestamp: true },
            });

            if (cutoffRecord) {
              const deletedResult = await prisma.loggedData.deleteMany({
                where: {
                  timestamp: { lte: cutoffRecord.timestamp },
                },
              });
              log(
                "info",
                `[CRON] 🧹 Pre-cleanup: Removed ${deletedResult.count} old records`
              );
            }
          }
        } catch (preCleanupError) {
          console.error("[CRON] ❌ Pre-cleanup failed:", preCleanupError);
          // Continue with insert even if pre-cleanup fails
        }

        await prisma.loggedData.createMany({ data: validLogEntries });
        savedCount = validLogEntries.length;
        log("info", `[CRON] 💾 Saved ${savedCount} log entry(ies) to database`);

        // Optional post-cleanup sebagai safety net
        try {
          const cleanupResult = await cleanupLoggedData();
          if (cleanupResult.deleted > 0) {
            log(
              "info",
              `[CRON] 🧹 Post-cleanup: ${cleanupResult.table} ${cleanupResult.before} → ${cleanupResult.after} (${cleanupResult.deleted} deleted)`
            );
          }
        } catch (cleanupError) {
          console.error("[CRON] ❌ Post-cleanup failed:", cleanupError);
          // Don't fail the main operation if cleanup fails
        }
      } else {
        log(
          "warn",
          "[CRON] ⚠️  No valid log entries to save (all configs deleted)"
        );
      }
    } catch (error) {
      console.error("[CRON] ❌ Error saving log entries:", error);
      return NextResponse.json(
        { message: "Error saving log entries", logged: 0 },
        { status: 500 }
      );
    }
  } else {
    log("warn", "[CRON] ⚠️  No log entries to save");
  }

  const duration = Date.now() - startTime;
  log("info", `[CRON] ⚡ Completed in ${duration}ms (${savedCount} logged)\n`);

  // Get cache stats for response
  const cacheStats = await mqttCache.getCacheStats();

  return NextResponse.json({
    message: "Cron job finished",
    interval: interval || "single",
    configs: configs.length,
    logged: savedCount,
    durationMs: duration,
    mqttConnected: isConnected,
    cacheSize: cacheStats.totalEntries,
    redisConnected: cacheStats.redisConnected,
  });
}
