// lib/mqttClient.ts
import mqtt, { MqttClient } from "mqtt";
import { getMQTTConfig } from "@/lib/mqtt-config"

// Environment-based MQTT controls
const MQTT_ENABLED = process.env.MQTT_ENABLED !== 'false'; // Default true, can be disabled
const MQTT_MAX_RECONNECT_ATTEMPTS = parseInt(process.env.MQTT_MAX_RECONNECT_ATTEMPTS || '3'); // Reduced from 10
const MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD = parseInt(process.env.MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD || '300000'); // 5 minutes

let client: MqttClient | null = null;
let isConnecting: boolean = false;
let connectionState:
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "broker_unavailable" = "disconnected";
let lastLogTime = 0;
let reconnectAttempts = 0;
let currentBrokerUrl: string | null = null;
let lastBrokerFailureTime: number = 0;
let consecutiveFailures: number = 0;
let isBrokerUnavailable = false;
const logThrottleMs = 30000; // Increased to 30 seconds to reduce spam

// Throttled logging to reduce spam
function throttledLog(message: string, type: "log" | "error" = "log") {
  const now = Date.now();
  if (now - lastLogTime > logThrottleMs) {
    if (type === "error") {
      console.error(message);
    } else {
      console.log(message);
    }
    lastLogTime = now;
  }
}

// MQTT Configuration and State Management
let connectionRobustnessChecks = 0;
const MAX_ROBUSTNESS_CHECKS = 3;

// Function to get MQTT config (simplified - only use environment config)
function getMQTTConfigUrl(): string {
  return getMQTTConfig();
}

// Robustness check for connection stability
function isConnectionStable(): boolean {
  connectionRobustnessChecks++;
  if (connectionRobustnessChecks >= MAX_ROBUSTNESS_CHECKS) {
    connectionRobustnessChecks = 0;
    return true;
  }
  return false;
}

// Now the function needs to be synchronous since getMQTTConfigUrl is no longer async
export function connectMQTTAsync(): MqttClient {
  if (!MQTT_ENABLED) {
    console.warn('MQTT: MQTT is disabled via MQTT_ENABLED=false environment variable');
    throw new Error("MQTT is disabled via configuration.");
  }

  // Check if broker is in unavailable state and within grace period
  if (isBrokerUnavailable && (Date.now() - lastBrokerFailureTime) < MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD) {
    const remainingTime = Math.ceil((MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD - (Date.now() - lastBrokerFailureTime)) / 1000 / 60);
    const message = `MQTT broker unavailable for ${remainingTime} minutes. Skipping connection.`;
    console.warn(message);
    throw new Error(message);
  }

  // Reset unavailable flag if grace period passed
  if (isBrokerUnavailable && (Date.now() - lastBrokerFailureTime) >= MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD) {
    isBrokerUnavailable = false;
    consecutiveFailures = 0;
    console.log('MQTT: Broker availability grace period expired, attempting reconnection');
  }

  const mqttBrokerUrl = getMQTTConfigUrl();

  if (!mqttBrokerUrl) {
    throw new Error("MQTT broker URL is missing from configuration.");
  }

  // Check if we need to reconnect due to URL change
  if (currentBrokerUrl && currentBrokerUrl !== mqttBrokerUrl) {
    if (client) {
      client.end(true);
      client = null;
      isConnecting = false;
      connectionState = "disconnected";
      reconnectAttempts = 0;
    }
  }

  currentBrokerUrl = mqttBrokerUrl;

  if (client && (client.connected || isConnecting)) {
    return client;
  }

  if (!client || client.disconnected) {
    if (isConnecting) {
      return client!;
    }

    isConnecting = true;
    connectionState = "connecting";

    // Generate dynamic client ID
    const clientId = `client-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 15)}`;

    const connectionOptions = {
      clean: true,
      connectTimeout: 3000, // Reduced from 5000 for faster failure detection
      reconnectPeriod: 20000, // Increased from 10000 for less aggressive reconnection
      keepalive: 120,
      reschedulePings: true,
      protocolVersion: 4 as const,
      rejectUnauthorized: true,
      clientId: clientId,
    };

    // For WebSocket connections, use URL as provided
    let finalUrl = mqttBrokerUrl;
    console.log(`MQTT: Connecting to broker at ${finalUrl}`);

    client = mqtt.connect(finalUrl, connectionOptions);

    client.on("connect", () => {
      connectionState = "connected";
      isConnecting = false;
      reconnectAttempts = 0;
      consecutiveFailures = 0;
      isBrokerUnavailable = false;
      console.log(`MQTT: Successfully connected to broker at ${mqttBrokerUrl}`);
    });

    client.on("error", (err) => {
      connectionState = "disconnected";
      isConnecting = false;
      consecutiveFailures++;
      lastBrokerFailureTime = Date.now();

      console.error(`MQTT: Connection error - ${err.message}`);

      // If consecutive failures exceed threshold, mark broker as unavailable
      if (consecutiveFailures >= MQTT_MAX_RECONNECT_ATTEMPTS) {
        isBrokerUnavailable = true;
        connectionState = "broker_unavailable";
        console.error(`MQTT: Broker marked as unavailable for ${MQTT_BROKER_UNAVAILABLE_GRACE_PERIOD / 60000} minutes due to ${consecutiveFailures} consecutive failures`);
      }

      // If this is a connection error and we have fallback options, try them
      if (err.message.includes("ECONNREFUSED") || err.message.includes("connack timeout")) {
        console.warn(`MQTT: Broker connection failed (${err.message}), broker might be unreachable`);
      }
    });

    client.on("reconnect", () => {
      reconnectAttempts++;
      console.log(`MQTT: Attempting reconnection (${reconnectAttempts}/${MQTT_MAX_RECONNECT_ATTEMPTS})`);

      if (reconnectAttempts > MQTT_MAX_RECONNECT_ATTEMPTS) {
        connectionState = "broker_unavailable";
        isBrokerUnavailable = true;
        lastBrokerFailureTime = Date.now();
        console.error(`MQTT: Max reconnection attempts reached. Broker marked unavailable.`);
        client?.end(true);
      }
    });

    client.on("close", () => {
      connectionState = "disconnected";
      isConnecting = false;
      console.log(`MQTT: Connection closed`);
    });

    client.on("offline", () => {
      connectionState = "disconnected";
      isConnecting = false;
      console.log(`MQTT: Client went offline`);
    });

    client.on("end", () => {
      console.log(`MQTT: Client connection ended`);
    });
  }

  return client;
}

export function getMQTTClient(): MqttClient | null {
  // Check if MQTT is disabled
  if (!MQTT_ENABLED) {
    console.warn('MQTT: MQTT services disabled via environment variable');
    return null;
  }

  // Auto-connect if client doesn't exist or is disconnected
  if (!client || client.disconnected) {
    try {
      client = connectMQTTAsync();
    } catch (error) {
      console.error('MQTT: Failed to auto-connect MQTT client:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
  return client;
}

export function getConnectionState(): string {
  return connectionState;
}

export function isClientConnected(): boolean {
  const connected = client?.connected || false;
  return connected;
}

export function resetConnection(): void {
  reconnectAttempts = 0;
  connectionState = "disconnected";
  consecutiveFailures = 0;
  isBrokerUnavailable = false;

  if (client) {
    client.end(true);
    client = null;
  }

  isConnecting = false;
}

export function disconnectMQTT(): void {
  if (client) {
    client.end(true, () => {
      client = null;
      isConnecting = false;
      connectionState = "disconnected";
      reconnectAttempts = 0;
      consecutiveFailures = 0;
      isBrokerUnavailable = false;
    });
  }
}

// Backward compatible wrapper - returns the client without waiting
export function connectMQTT(): MqttClient {
  // For existing code that expects synchronous behavior
  // Return existing client or create new one
  if (client) {
    return client;
  }

  // Create temporary client with URL for immediate return
  const mqttBrokerUrl = getMQTTConfig();
  return mqtt.connect(mqttBrokerUrl, {
    clean: true,
    connectTimeout: 3000,
    reconnectPeriod: 15000,
    keepalive: 60,
  });
}

// Function to force reconnection when mode changes
export async function reconnectMQTT(): Promise<MqttClient> {
  // Force disconnect from current broker
  if (client) {
    client.end(true);
    client = null;
  }

  // Reset all connection state
  isConnecting = false;
  connectionState = "disconnected";
  reconnectAttempts = 0;
  consecutiveFailures = 0;
  isBrokerUnavailable = false;
  currentBrokerUrl = null; // Force URL re-evaluation

  // Wait a bit to ensure clean disconnect
  await new Promise((resolve) => setTimeout(resolve, 100));

  return connectMQTTAsync();
}
