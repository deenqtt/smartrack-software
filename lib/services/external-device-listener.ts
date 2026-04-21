// External Device MQTT Listener Service - Updated to use MQTT Server Provider
import { prisma } from "@/lib/prisma"; // Use globally optimized Prisma client with connection pooling
import { loggers } from "../logger";

// Import MQTT Server Provider types and utilities
import { getActiveServerConfigs, type MqttServerConfig } from "@/lib/mqtt-server-config";

// Track subscriptions per server
const serverSubscriptions = new Map<string, Set<string>>();
const topicDeviceMap = new Map<string, any>();

// Global service instance
let serviceInitialized = false;
let activeServers: MqttServerConfig[] = [];
let messageHandler: ((topic: string, payload: string, serverId: string) => void) | null = null;

// Initialize the external device listener service using MQTT Server Provider
export async function getExternalDeviceListenerService() {
  if (serviceInitialized) {
    loggers.external.debug("External device listener already initialized");
    return;
  }

  try {
    // Get active MQTT server configurations
    activeServers = await getActiveServerConfigs();

    if (activeServers.length === 0) {
      loggers.external.warn("No active MQTT servers found for external device listener");
      return;
    }

    loggers.external.info(`Initializing listener with ${activeServers.length} servers`);

    serviceInitialized = true;
    loggers.external.info("Service initialized");

    // Subscribe to all registered external devices
    await subscribeToRegisteredDevices();

  } catch (error) {
    loggers.external.error("Failed to initialize external device listener service", error);
    throw error;
  }
}

// Set message handler for processing incoming messages
export function setExternalDeviceMessageHandler(
  handler: (topic: string, payload: string, serverId: string) => void
) {
  messageHandler = handler;
  loggers.external.info("Message handler set");
}

// Subscribe to all registered external devices from database
async function subscribeToRegisteredDevices() {
  try {
    const externalDevices = await prisma.deviceExternal.findMany({
      where: {
        topic: {
          not: "",
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    if (externalDevices.length === 0) {
      loggers.external.warn("No external devices found in database");
      return;
    }

    loggers.external.info(`Subscribing to ${externalDevices.length} devices...`);

    for (const device of externalDevices) {
      // Cache the device mapping
      topicDeviceMap.set(device.topic, device);

      // Initialize subscription tracking for each server
      for (const server of activeServers) {
        if (!serverSubscriptions.has(server.id)) {
          serverSubscriptions.set(server.id, new Set());
        }
      }
    }
  } catch (error) {
    loggers.external.error("Error loading external devices", error);
  }
}

// Process incoming external device message from MQTT Server Provider
export async function processExternalDeviceMessage(topic: string, payload: string, serverId: string) {
  try {
    // Get device from cache
    let device = topicDeviceMap.get(topic);

    // If not in cache, look it up
    if (!device) {
      device = await prisma.deviceExternal.findFirst({
        where: { topic: topic },
      });

      if (device) {
        topicDeviceMap.set(topic, device);
      }
    }

    if (!device) {
      loggers.external.warn(`Received message for unknown device topic: ${topic}`);
      return;
    }

    // Parse payload
    let parsedPayload;
    try {
      parsedPayload = JSON.parse(payload);
    } catch (parseError) {
      // Store raw payload as string in JSON format
      parsedPayload = { raw_payload: payload };
    }

    // Update device with latest payload and timestamp
    await prisma.deviceExternal.update({
      where: { id: device.id },
      data: {
        lastPayload: parsedPayload,
        lastUpdatedByMqtt: new Date(),
        updatedAt: new Date(),
      },
    });

    loggers.external.debug(`Processed message: ${device.name} [Server: ${serverId}]`);

  } catch (error) {
    loggers.external.error("Error processing external device message", error);
  }
}

// Add or update a device subscription dynamically
export async function addExternalDeviceSubscription(topic: string) {
  try {
    const device = await prisma.deviceExternal.findFirst({
      where: { topic: topic },
    });

    if (device) {
      // Cache the device mapping
      topicDeviceMap.set(topic, device);

      // Track subscription for each active server
      for (const server of activeServers) {
        const serverSubs = serverSubscriptions.get(server.id) || new Set();
        serverSubs.add(topic);
        serverSubscriptions.set(server.id, serverSubs);
      }

      loggers.external.info(`Added subscription for device: ${device.name} (${topic})`);
      return true;
    }

    return false;
  } catch (error) {
    loggers.external.error(`Error adding subscription for topic ${topic}`, error);
    return false;
  }
}

// Remove a device subscription
export async function removeExternalDeviceSubscription(topic: string) {
  try {
    // Remove from all server subscriptions
    for (const [serverId, topics] of serverSubscriptions) {
      topics.delete(topic);
    }

    // Remove from cache
    topicDeviceMap.delete(topic);

    loggers.external.info(`Removed subscription for topic: ${topic}`);
    return true;
  } catch (error) {
    loggers.external.error(`Error removing subscription for topic ${topic}`, error);
    return false;
  }
}

// Get connection status for all servers
export function getExternalDeviceListenerStatus() {
  const serverStatuses = [];

  for (const server of activeServers) {
    const subscriptions = serverSubscriptions.get(server.id) || new Set();
    serverStatuses.push({
      serverId: server.id,
      serverName: server.name,
      brokerUrl: server.brokerUrl,
      subscribedTopics: Array.from(subscriptions),
      topicCount: subscriptions.size,
    });
  }

  return {
    initialized: serviceInitialized,
    activeServers: activeServers.length,
    totalSubscribedTopics: Array.from(serverSubscriptions.values()).reduce((acc, topics) => acc + topics.size, 0),
    cachedDevices: topicDeviceMap.size,
    servers: serverStatuses,
  };
}

// Manually register external device
export async function registerExternalDevice(
  name: string,
  topic: string,
  address?: string
) {
  try {
    const device = await prisma.deviceExternal.create({
      data: {
        name,
        topic,
        address: address || topic.split("/").pop() || "unknown",
      },
    });

    // Add subscription for the new device
    await addExternalDeviceSubscription(topic);

    loggers.external.info(`Registered new device: ${name} (${topic})`);
    return device;
  } catch (error) {
    loggers.external.error("Error registering external device", error);
    throw error;
  }
}

// Get all subscribed topics across all servers
export function getSubscribedTopics(): string[] {
  const allTopics = new Set<string>();
  for (const topics of serverSubscriptions.values()) {
    for (const topic of topics) {
      allTopics.add(topic);
    }
  }
  return Array.from(allTopics);
}

// Get subscription status for a specific topic
export function getTopicSubscriptionStatus(topic: string) {
  const servers = [];
  for (const [serverId, topics] of serverSubscriptions) {
    if (topics.has(topic)) {
      const server = activeServers.find(s => s.id === serverId);
      if (server) {
        servers.push({
          serverId,
          serverName: server.name,
          brokerUrl: server.brokerUrl,
        });
      }
    }
  }

  return {
    topic,
    subscribed: servers.length > 0,
    servers,
  };
}

// Cleanup function - clear all local state
export function cleanupExternalDeviceListener() {
  topicDeviceMap.clear();
  serverSubscriptions.clear();
  activeServers = [];
  serviceInitialized = false;
  messageHandler = null;
  loggers.external.info("Listener cleaned up");
}
