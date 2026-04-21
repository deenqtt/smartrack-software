// File: lib/services/door-lock-mqtt-listener.ts
// Consolidated MQTT Listeners untuk Health Check, Logs, dan Stats - Updated to use MQTT Server Provider

import { prisma } from "@/lib/prisma";

// Import MQTT Server Provider utilities
import { getActiveServerConfigs, type MqttServerConfig } from "@/lib/mqtt-server-config";
import { getMQTTServerClientInterface, onMQTTServerMessage } from "@/lib/mqttClientServer";

// --- KONFIGURASI ---
const HEALTH_TOPIC = "iot/door/health/+";
const LOG_TOPIC = "iot/door/logs";
const STATS_TOPIC = "iot/door/stats/+";
const DISCOVERY_TOPIC = "iot/door/discovery";

const CHECK_OFFLINE_INTERVAL_MS = 60000; // Cek setiap 60 detik
const OFFLINE_THRESHOLD_MS = 90000; // Dianggap offline jika tidak ada kabar > 90 detik

// Service state
let serviceInitialized = false;
let activeServers: MqttServerConfig[] = [];
let messageHandler: ((topic: string, payload: string, serverId: string) => void) | null = null;
let intervalId: NodeJS.Timeout | null = null;
let lastStatusLog = Date.now();
let statusSummary = { online: 0, offline: 0, totalChecks: 0 };

// --- HEALTH CHECK FUNCTION ---
async function checkOfflineControllers() {
  const cutoffTime = new Date(Date.now() - OFFLINE_THRESHOLD_MS);

  const controllersToUpdate = await prisma.accessController.findMany({
    where: {
      status: "online",
      lastSeen: {
        lt: cutoffTime,
      },
    },
    select: {
      name: true,
      id: true,
    },
  });

  statusSummary.totalChecks++;

  if (controllersToUpdate.length > 0) {
    statusSummary.offline += controllersToUpdate.length;

    await prisma.accessController.updateMany({
      where: {
        id: {
          in: controllersToUpdate.map((c: { id: string; name: string }) => c.id),
        },
      },
      data: {
        status: "offline",
        lockCount: 0,
      },
    });

    controllersToUpdate.forEach((controller: { id: string; name: string }) => {
      console.log(`[Door Lock MQTT] Controller offline: ${controller.name}`);
    });
  } else {
    statusSummary.online++;
  }

  const now = Date.now();
  if (now - lastStatusLog > 5 * 60 * 1000) {
    console.log(`[Door Lock MQTT] Status summary - Online: ${statusSummary.online}, Offline: ${statusSummary.offline} (Total checks: ${statusSummary.totalChecks})`);
    statusSummary = { online: 0, offline: 0, totalChecks: 0 };
    lastStatusLog = now;
  }
}

// --- MESSAGE HANDLER SETUP ---
export function setDoorLockMessageHandler(
  handler: (topic: string, payload: string, serverId: string) => void
) {
  messageHandler = handler;
  console.log("[Door Lock MQTT] Message handler set");
}

// --- MAIN MQTT LISTENER SERVICE INITIALIZATION ---
export async function getDoorLockMqttListenerService() {
  if (serviceInitialized) {
    console.log("[Door Lock MQTT] Service already initialized");
    return;
  }

  try {
    // Get active MQTT server configurations
    activeServers = await getActiveServerConfigs();

    if (activeServers.length === 0) {
      console.warn("[Door Lock MQTT] No active MQTT servers found");
      return;
    }

    // Removed initialization logs for cleaner startup

    serviceInitialized = true;

    // Setup interval untuk health check
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(checkOfflineControllers, CHECK_OFFLINE_INTERVAL_MS);

    // Subscribe ke door lock topics
    const mqttInterface = getMQTTServerClientInterface();
    await mqttInterface.subscribe([HEALTH_TOPIC, LOG_TOPIC, STATS_TOPIC, DISCOVERY_TOPIC], { qos: 1 });

    // Register MQTT message handler
    onMQTTServerMessage(async (topic: string, payload: string, serverId: string) => {
      if (
        topic.startsWith("iot/door/health/") ||
        topic === LOG_TOPIC ||
        topic.startsWith("iot/door/stats/") ||
        topic === DISCOVERY_TOPIC
      ) {
        await processDoorLockMessage(topic, payload, serverId);
      }
    });

    console.log("[Door Lock MQTT] Service initialized, subscribed to door lock topics");

  } catch (error) {
    console.error("[Door Lock MQTT] Failed to initialize service", error);
    throw error;
  }
}

// --- MESSAGE PROCESSING FUNCTION ---
export async function processDoorLockMessage(topic: string, payload: string, serverId: string) {
  try {
    // --- HEALTH CHECK LISTENER ---
    if (topic.startsWith("iot/door/health/")) {
      const message = JSON.parse(payload);
      const { ip, macAddress, locks, doorStatus, lockAddresses } = message;

      if (!macAddress) {
        console.warn("[Door Lock MQTT] Health beat message missing macAddress. Skipped.");
        return;
      }

      await prisma.accessController.upsert({
        where: { macAddress: macAddress },
        update: {
          ipAddress: ip,
          status: "online",
          lockCount: locks,
          lastSeen: new Date(),
          doorStatus: doorStatus ? JSON.stringify(doorStatus) : undefined,
          lockAddresses: lockAddresses ? JSON.stringify(lockAddresses) : undefined,
        },
        create: {
          macAddress: macAddress,
          ipAddress: ip,
          name: `New Controller (${ip})`,
          status: "online",
          lockCount: locks,
          lastSeen: new Date(),
          doorStatus: doorStatus ? JSON.stringify(doorStatus) : null,
          lockAddresses: lockAddresses ? JSON.stringify(lockAddresses) : null,
        },
      });

      console.log(`[Door Lock MQTT] Health check processed for ${macAddress} from server ${serverId}`);
    }

    // --- DISCOVERY LISTENER ---
    else if (topic === DISCOVERY_TOPIC) {
      const message = JSON.parse(payload);
      const { ipAddress, macAddress, name, firmware } = message;

      if (!macAddress || !ipAddress) {
        console.warn("[Door Lock MQTT] Discovery message missing macAddress or ipAddress. Skipped.");
        return;
      }

      await prisma.accessController.upsert({
        where: { macAddress: macAddress },
        update: {
          ipAddress: ipAddress,
          firmware: firmware || undefined,
          lastSeen: new Date(),
        },
        create: {
          macAddress: macAddress,
          ipAddress: ipAddress,
          name: name || `Controller (${ipAddress})`,
          firmware: firmware || null,
          status: "offline",
          lastSeen: new Date(),
        },
      });

      console.log(`[Door Lock MQTT] Discovery processed for ${macAddress} (${ipAddress}) from server ${serverId}`);
    }

    // --- LOG LISTENER ---
    else if (topic === LOG_TOPIC) {
      const logData = JSON.parse(payload);
      const {
        controllerIp,
        timestamp,
        method,
        cardNumber,
        jobId,
        username,
        lockAddress,
      } = logData;

      if (!controllerIp) {
        console.warn("[Door Lock MQTT] Log received without controller IP, skipped.");
        return;
      }

      const controller = await prisma.accessController.findFirst({
        where: { ipAddress: controllerIp },
      });

      if (!controller) {
        console.warn(
          `[Door Lock MQTT] Log received from unknown controller (IP: ${controllerIp}), skipped.`
        );
        return;
      }

      let message = `Lock ${lockAddress} | ${username || "Unknown User"}`;
      if (jobId > 0) {
        message += ` (Job ID: ${jobId})`;
      }
      message += ` event by ${method}`;
      if (cardNumber && cardNumber !== "0") {
        message += ` (Card: ${cardNumber})`;
      }

      await prisma.activityLog.create({
        data: {
          controllerId: controller.id,
          timestamp: new Date(timestamp),
          message: message,
          details: JSON.stringify({
            method,
            cardNumber,
            jobId,
            username,
            lockAddress,
          }),
        },
      });

      console.log(`[Door Lock MQTT] Log processed for controller ${controllerIp} from server ${serverId}`);
    }

    // --- STATS LISTENER ---
    else if (topic.startsWith("iot/door/stats/")) {
      const ipAddress = topic.split("/")[3];
      const statsData = JSON.parse(payload);

      await prisma.accessController.update({
        where: { ipAddress: ipAddress },
        data: {
          uptime: statsData.uptime,
          freeHeap: statsData.freeHeap,
          totalHeap: statsData.totalHeap,
          spiffsUsed: statsData.spiffsUsed,
          spiffsTotal: statsData.spiffsTotal,
          logFileSize: statsData.logFileSize,
        },
      });

      console.log(`[Door Lock MQTT] Stats processed for ${ipAddress} from server ${serverId}`);
    }

  } catch (error) {
    console.error("[Door Lock MQTT] Error processing message:", error);
  }
}

// --- SERVICE STATUS ---
export function getDoorLockMqttListenerStatus() {
  return {
    initialized: serviceInitialized,
    activeServers: activeServers.length,
    servers: activeServers.map(server => ({
      id: server.id,
      name: server.name,
      brokerUrl: server.brokerUrl,
    })),
    topics: [HEALTH_TOPIC, LOG_TOPIC, STATS_TOPIC, DISCOVERY_TOPIC],
    lastStatusLog: new Date(lastStatusLog).toISOString(),
    statusSummary,
  };
}

// --- CLEANUP FUNCTION ---
export function cleanupDoorLockMqttListener() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  serviceInitialized = false;
  activeServers = [];
  messageHandler = null;
  statusSummary = { online: 0, offline: 0, totalChecks: 0 };

  console.log("[Door Lock MQTT] Service cleaned up");
}
