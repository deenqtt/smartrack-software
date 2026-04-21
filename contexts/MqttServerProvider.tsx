"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type PahoType from 'paho-mqtt';
import {
  refreshServerConfigs,
  clearServerConfigCache,
} from '@/lib/mqtt-server-config';
import {
  getPahoConnectionOptions,
  generateMqttClientId,
} from '@/lib/mqtt-utils';
import { MqttServerConfig } from '@/types/mqtt';

// Types
type MqttListener = (topic: string, payload: string, serverId: string, retained?: boolean) => void;

interface BrokerConnection {
  id: string;
  name: string;
  client: PahoType.Client;
  config: MqttServerConfig;
  listeners: Map<string, MqttListener[]>;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  reconnectAttempts: number;
  lastConnectedAt: Date | null;
  lastError: string | null;
}

interface MqttServerContextType {
  isReady: boolean;
  brokers: BrokerConnection[];
  publish: (topic: string, payload: string, serverId?: string) => Promise<void>;
  subscribe: (topic: string, listener: MqttListener, serverId?: string) => Promise<void>;
  unsubscribe: (topic: string, listener: MqttListener, serverId?: string) => Promise<void>;
  reloadConfiguration: () => Promise<void>;
  getBrokerStatus: (serverId: string) => BrokerConnection | null;
}

const MqttServerContext = createContext<MqttServerContextType>({
  isReady: false,
  brokers: [],
  publish: async () => { },
  subscribe: async () => { },
  unsubscribe: async () => { },
  reloadConfiguration: async () => { },
  getBrokerStatus: () => null,
});

export function useMqttServer() {
  return useContext(MqttServerContext);
}

// Connection management constants
const MAX_RECONNECT_ATTEMPTS = 10;
const RECONNECT_DELAY = 5000;
const HEALTH_CHECK_INTERVAL = 300000; // 5 minutes instead of 30 seconds

// Statistics batching constants
const STATS_UPDATE_INTERVAL = 10000; // 10 seconds
const STATUS_UPDATE_DEBOUNCE = 2000; // 2 seconds debounce for status changes

// ─── Demo MQTT Provider ───────────────────────────────────────────────────────
// Simulates real-time MQTT data without a real broker (for portfolio demo mode)
function DemoMqttServerProvider({ children }: { children: React.ReactNode }) {
  const listenersRef = useRef<Map<string, MqttListener[]>>(new Map());

  const topicMatchesDemo = (subscribed: string, actual: string): boolean => {
    if (subscribed === actual) return true;
    if (subscribed.endsWith('/#')) return actual.startsWith(subscribed.slice(0, -2) + '/');
    if (subscribed.includes('+')) {
      const pattern = subscribed.replace(/\//g, '\\/').replace(/\+/g, '[^/]+');
      return new RegExp(`^${pattern}$`).test(actual);
    }
    return false;
  };

  useEffect(() => {
    const DEMO_TOPICS = [
      "demo/rack01/pdu-a",
      "demo/rack01/pdu-b",
      "demo/rack01/env",
      "demo/rack02/env",
      "demo/ups/main",
      "demo/cooling/crac01",
      "demo/power/meter01",
      "demo/rack01/server01",
      "demo/rack01/server02",
      "demo/rack02/switch01",
      "demo/rack02/firewall",
      "demo/pue/monitor",
    ];

    const interval = setInterval(async () => {
      try {
        const { generateDemoMqttPayload } = await import("@/lib/demo-data");
        DEMO_TOPICS.forEach((topic) => {
          const payload = generateDemoMqttPayload(topic);
          const payloadStr = JSON.stringify(payload);
          listenersRef.current.forEach((listeners, subscribedTopic) => {
            if (topicMatchesDemo(subscribedTopic, topic)) {
              listeners.forEach((listener) => {
                try {
                  listener(topic, payloadStr, "demo-broker", false);
                } catch (e) {
                  // ignore listener errors
                }
              });
            }
          });
        });
      } catch (e) {
        // ignore import errors during hot reload
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const subscribe = useCallback(async (topic: string, listener: MqttListener) => {
    const existing = listenersRef.current.get(topic) || [];
    if (!existing.includes(listener)) {
      listenersRef.current.set(topic, [...existing, listener]);
    }
  }, []);

  const unsubscribe = useCallback(async (topic: string, listener: MqttListener) => {
    const existing = listenersRef.current.get(topic) || [];
    const updated = existing.filter((l) => l !== listener);
    if (updated.length > 0) {
      listenersRef.current.set(topic, updated);
    } else {
      listenersRef.current.delete(topic);
    }
  }, []);

  const demoBroker: BrokerConnection = {
    id: "demo-broker",
    name: "Demo Broker (Simulated)",
    client: {} as PahoType.Client,
    config: { id: "demo-broker", name: "Demo", brokerUrl: "demo://localhost", pahoProtocol: "ws", config: {} } as unknown as MqttServerConfig,
    listeners: new Map(),
    status: "connected",
    reconnectAttempts: 0,
    lastConnectedAt: new Date(),
    lastError: null,
  };

  const value: MqttServerContextType = {
    isReady: true,
    brokers: [demoBroker],
    publish: async () => {},
    subscribe,
    unsubscribe,
    reloadConfiguration: async () => {},
    getBrokerStatus: (id) => id === "demo-broker" ? demoBroker : null,
  };

  return (
    <MqttServerContext.Provider value={value}>
      {children}
    </MqttServerContext.Provider>
  );
}

// ─── Main MQTT Server Provider ────────────────────────────────────────────────
// Wrapper: routes to DemoMqttServerProvider or RealMqttServerProvider
export function MqttServerProvider({ children }: { children: React.ReactNode }) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return <DemoMqttServerProvider>{children}</DemoMqttServerProvider>;
  }
  return <RealMqttServerProvider>{children}</RealMqttServerProvider>;
}

function RealMqttServerProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [brokers, setBrokers] = useState<BrokerConnection[]>([]);
  const brokersRef = useRef<Map<string, BrokerConnection>>(new Map());
  const pendingSubscriptionsRef = useRef<Map<string, Array<{ topic: string; listener: MqttListener }>>>(new Map());

  // Statistics batching system
  const statsBufferRef = useRef<Map<string, { messageCount: number; bytesReceived: number; bytesSent: number }>>(new Map());
  const statsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Status update debouncing
  const statusUpdateTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastStatusRef = useRef<Map<string, BrokerConnection['status']>>(new Map());

  // Batch statistics updates to reduce API calls
  const batchUpdateStats = useCallback(async () => {
    const statsToUpdate = Array.from(statsBufferRef.current.entries());

    if (statsToUpdate.length === 0) return;

    // Clear buffer immediately to prevent duplicate updates
    statsBufferRef.current.clear();

    // Update each broker's stats
    const updatePromises = statsToUpdate.map(async ([brokerId, stats]) => {
      try {
        // Validate brokerId
        if (!brokerId || typeof brokerId !== 'string' || brokerId.trim() === '') {
          console.warn(`Invalid brokerId for stats update: ${brokerId}`);
          return;
        }

        if (stats.messageCount === 0 && stats.bytesReceived === 0 && stats.bytesSent === 0) {
          return; // Skip empty updates
        }

        const response = await fetch(`/api/mqtt-config/${brokerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageCountIncrement: stats.messageCount,
            bytesReceivedIncrement: stats.bytesReceived,
            bytesSentIncrement: stats.bytesSent
          })
        });

        if (!response.ok) {
          console.warn(`Failed to batch update stats for broker ${brokerId}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.error(`Error batch updating stats for broker ${brokerId}:`, err);
      }
    });

    await Promise.allSettled(updatePromises);
  }, []);

  // Add stats to buffer (non-blocking)
  const bufferStats = useCallback((brokerId: string, messageCount: number = 0, bytesReceived: number = 0, bytesSent: number = 0) => {
    // Validate brokerId before adding to buffer
    if (!brokerId || typeof brokerId !== 'string' || brokerId.trim() === '') {
      console.warn(`Invalid brokerId passed to bufferStats: ${brokerId}`);
      return;
    }

    const current = statsBufferRef.current.get(brokerId) || { messageCount: 0, bytesReceived: 0, bytesSent: 0 };
    statsBufferRef.current.set(brokerId, {
      messageCount: current.messageCount + messageCount,
      bytesReceived: current.bytesReceived + bytesReceived,
      bytesSent: current.bytesSent + bytesSent
    });

    // Start timer if not already running
    if (!statsUpdateTimerRef.current) {
      statsUpdateTimerRef.current = setTimeout(async () => {
        statsUpdateTimerRef.current = null;
        await batchUpdateStats();
      }, STATS_UPDATE_INTERVAL);
    }
  }, [batchUpdateStats]);

  // Debounced status update
  const debouncedUpdateBrokerStatus = useCallback(async (
    brokerId: string,
    status: BrokerConnection['status'],
    error?: string | null
  ) => {
    // Clear existing timeout for this broker
    const existingTimeout = statusUpdateTimeoutsRef.current.get(brokerId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Skip update if status hasn't changed and it's a stable status
    const lastStatus = lastStatusRef.current.get(brokerId);
    if (lastStatus === status && (status === 'connected' || status === 'disconnected')) {
      return;
    }

    // For critical status changes (connected/error), update immediately
    if (status === 'connected' || status === 'error' || status === 'disconnected') {
      lastStatusRef.current.set(brokerId, status);
      await updateBrokerStatusInternal(brokerId, status, error);
      return;
    }

    // For transitional states, debounce
    const timeout = setTimeout(async () => {
      lastStatusRef.current.set(brokerId, status);
      await updateBrokerStatusInternal(brokerId, status, error);
      statusUpdateTimeoutsRef.current.delete(brokerId);
    }, STATUS_UPDATE_DEBOUNCE);

    statusUpdateTimeoutsRef.current.set(brokerId, timeout);
  }, []);

  // Internal broker status update (called by debounced version)
  const updateBrokerStatusInternal = useCallback(async (
    brokerId: string,
    status: BrokerConnection['status'],
    error?: string | null
  ) => {
    try {
      // Update database via API
      const updateResponse = await fetch(`/api/mqtt-config/${brokerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionStatus: status.toUpperCase(),
          connectionError: error || null,
          lastConnectedAt: status === 'connected' ? new Date().toISOString() :
            status === 'disconnected' || status === 'error' ? new Date().toISOString() : undefined,
          lastDisconnectedAt: status === 'disconnected' || status === 'error' ? new Date().toISOString() : undefined
        })
      });

      if (!updateResponse.ok) {
        console.warn(`Failed to update broker ${brokerId} status in database`);
      }

      // Update local state
      setBrokers(prev => prev.map(broker =>
        broker.id === brokerId
          ? {
            ...broker,
            status,
            lastError: error || null,
            lastConnectedAt: status === 'connected' ? new Date() : broker.lastConnectedAt
          }
          : broker
      ));

      // Update ref
      const broker = brokersRef.current.get(brokerId);
      if (broker) {
        broker.status = status;
        broker.lastError = error || null;
        if (status === 'connected') {
          broker.lastConnectedAt = new Date();
        }
        brokersRef.current.set(brokerId, broker);
      }

    } catch (err) {
      console.error(`Error updating broker ${brokerId} status:`, err);
    }
  }, []);

  // Connect to a single broker
  const connectToBroker = useCallback(async (serverConfig: MqttServerConfig): Promise<BrokerConnection> => {
    const brokerId = serverConfig.id;
    const connectionOptions = getPahoConnectionOptions(serverConfig.config);
    const clientId = generateMqttClientId(serverConfig.config);

    console.log(`[MqttServerProvider] Connecting to broker: ${serverConfig.config.brokerHost}:${serverConfig.config.brokerPort}`);
    console.log(`[MqttServerProvider] Client ID: ${clientId}`);
    console.log(`[MqttServerProvider] Connection options:`, connectionOptions);

    // Create Paho client - pass host, port, and WebSocket path, then clientId
    const Paho = require('paho-mqtt');
    const client = new Paho.Client(
      serverConfig.config.brokerHost,
      serverConfig.config.brokerPort,
      '/mqtt',   // ✅ WebSocket path required by Mosquitto broker
      clientId   // ✅ Use generated client ID
    );

    const broker: BrokerConnection = {
      id: brokerId,
      name: serverConfig.name,
      client,
      config: serverConfig,
      listeners: new Map(),
      status: 'connecting',
      reconnectAttempts: 0,
      lastConnectedAt: null,
      lastError: null,
    };

    // Set up event handlers
    client.onConnectionLost = async (responseObject: PahoType.MQTTError) => {
      const error = responseObject.errorCode !== 0 ? responseObject.errorMessage : undefined;
      console.warn(`MQTT ${brokerId} connection lost:`, error);

      await debouncedUpdateBrokerStatus(brokerId, 'disconnected', error);

      // Attempt reconnection if within limits
      if (broker.reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        broker.reconnectAttempts++;
        setTimeout(() => connectToBroker(serverConfig), RECONNECT_DELAY);
      } else {
        await debouncedUpdateBrokerStatus(brokerId, 'error', 'Max reconnection attempts reached');
      }
    };

    client.onMessageArrived = async (message: PahoType.Message) => {
      const topic = message.destinationName;
      const payload = message.payloadString;

      // Buffer message stats (batched update)
      bufferStats(brokerId, 1, payload.length, 0);

      // Notify listeners
      const topicListeners = broker.listeners.get(topic) || [];
      const wildcardListeners = Array.from(broker.listeners.entries())
        .filter(([pattern]) => matchesTopic(pattern, topic))
        .flatMap(([, listeners]) => listeners);

      const allListeners = [...topicListeners, ...wildcardListeners];

      allListeners.forEach(listener => {
        try {
          listener(topic, payload, brokerId, message.retained);
        } catch (error) {
          console.error(`Error in MQTT listener for topic ${topic}:`, error);
        }
      });
    };

    // Attempt connection with same settings as working MqttContext
    try {
      console.log(`[MqttServerProvider] Starting connection attempt for ${brokerId}`);

      // Force SSL if the page is loaded over HTTPS to prevent Mixed Content blocked by browser
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const effectiveUseSSL = isHttps || serverConfig.config.useSSL;

      if (isHttps && !serverConfig.config.useSSL) {
        console.warn(`[MqttServerProvider] Upgrading MQTT connection for ${brokerId} to use SSL (wss://) because the page is loaded over HTTPS.`);
      }

      await new Promise<void>((resolve, reject) => {
        client.connect({
          // connectionOptions already contains correctly converted values from mqtt-utils.ts
          // (timeout in SECONDS, keepAliveInterval, cleanSession, etc.)
          ...connectionOptions,
          onSuccess: async () => {
            console.log(`MQTT ${brokerId} connected successfully`);
            // Update status after successful connection (non-blocking)
            debouncedUpdateBrokerStatus(brokerId, 'connected').catch((err: any) =>
              console.warn(`Failed to update connected status for ${brokerId}:`, err)
            );
            resolve();
          },
          onFailure: async (error: any) => {
            // Safely handle error message - Paho MQTT error object may not always have errorMessage
            const errorMessage = (error && typeof error === 'object' && 'errorMessage' in error && error.errorMessage)
              ? error.errorMessage
              : 'Connection failed';
            console.error(`MQTT ${brokerId} connection failed:`, errorMessage);
            // Update status on failure (non-blocking)
            debouncedUpdateBrokerStatus(brokerId, 'error', errorMessage).catch((err: any) =>
              console.warn(`Failed to update error status for ${brokerId}:`, err)
            );
            reject(new Error(errorMessage));
          },
          // Respect browser security: force WSS if page is loaded over HTTPS
          useSSL: effectiveUseSSL,
        });
      });
      broker.reconnectAttempts = 0;

      // Subscribe to pending topics
      const pendingSubs = pendingSubscriptionsRef.current.get(brokerId) || [];
      // Also check if there are global pending subscriptions (empty serverId)
      // Actually, my proposed fix below will put global subs into each broker's pending list.
      for (const { topic, listener } of pendingSubs) {
        try {
          if (client.isConnected()) {
            client.subscribe(topic);
          }
          const listeners = broker.listeners.get(topic) || [];
          if (!listeners.includes(listener)) {
            listeners.push(listener);
            broker.listeners.set(topic, listeners);
          }
        } catch (error) {
          console.error(`Failed to subscribe to ${topic} on ${brokerId}:`, error);
        }
      }
      pendingSubscriptionsRef.current.delete(brokerId);

    } catch (error) {
      await debouncedUpdateBrokerStatus(brokerId, 'error', error instanceof Error ? error.message : 'Connection failed');
      throw error;
    }

    return broker;
  }, []);

  // Disconnect from broker
  const disconnectFromBroker = useCallback(async (brokerId: string) => {
    const broker = brokersRef.current.get(brokerId);
    if (broker && broker.client.isConnected()) {
      try {
        broker.client.disconnect();
        await debouncedUpdateBrokerStatus(brokerId, 'disconnected');
        console.log(`MQTT ${brokerId} disconnected`);
      } catch (error) {
        console.error(`Error disconnecting from ${brokerId}:`, error);
      }
    }

    // Clean up stats for disconnected broker
    statsBufferRef.current.delete(brokerId);

    brokersRef.current.delete(brokerId);
  }, []);

  // Initialize connections for all active configurations
  const initializeConnections = useCallback(async () => {
    try {
      setIsReady(false);

      // Get active configurations from API
      const response = await fetch('/api/mqtt-config?active=true');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch active configurations');
      }

      // Convert API response to server config format
      const serverConfigs: MqttServerConfig[] = result.data.map((config: any) => ({
        id: config.id,
        name: config.name,
        brokerUrl: `ws${config.useSSL ? 's' : ''}://${config.brokerHost}:${config.brokerPort}`,
        pahoProtocol: config.protocol === 'WEBSOCKET' ? (config.useSSL ? 'wss' : 'ws') :
          config.protocol === 'SECURE_WEBSOCKET' ? 'wss' :
            config.protocol === 'TCP' ? (config.useSSL ? 'ssl' : 'tcp') : 'ssl',
        config: config
      }));

      // Disconnect from brokers not in active config
      const activeIds = new Set(serverConfigs.map(c => c.id));
      for (const [brokerId] of brokersRef.current) {
        if (!activeIds.has(brokerId)) {
          await disconnectFromBroker(brokerId);
        }
      }

      // Connect to new or reconfigure existing brokers
      const newBrokers: BrokerConnection[] = [];

      for (const serverConfig of serverConfigs) {
        const brokerId = serverConfig.id;
        let broker = brokersRef.current.get(brokerId);

        // Check if reconfiguration needed
        const needsReconnect = !broker ||
          broker.config.brokerUrl !== serverConfig.brokerUrl ||
          broker.config.pahoProtocol !== serverConfig.pahoProtocol;

        if (needsReconnect) {
          // Disconnect existing connection
          if (broker) {
            await disconnectFromBroker(brokerId);
          }

          // Connect with new configuration
          try {
            broker = await connectToBroker(serverConfig);
            brokersRef.current.set(brokerId, broker);
            newBrokers.push(broker);
          } catch (error) {
            console.error(`Failed to connect to broker ${brokerId}:`, error);
            // Create a disconnected broker entry for failed connections
            const failedBroker: BrokerConnection = {
              id: brokerId,
              name: serverConfig.name,
              client: {} as PahoType.Client, // Placeholder
              config: serverConfig,
              listeners: new Map(),
              status: 'error',
              reconnectAttempts: 0,
              lastConnectedAt: null,
              lastError: error instanceof Error ? error.message : 'Connection failed',
            };
            brokersRef.current.set(brokerId, failedBroker);
            newBrokers.push(failedBroker);
          }
        } else if (broker) {
          newBrokers.push(broker);
        }
      }

      setBrokers(newBrokers);
      setIsReady(true);

    } catch (error) {
      console.error('Error initializing MQTT connections:', error);
      setIsReady(false);
    }
  }, [connectToBroker, disconnectFromBroker]);

  // Publish message to broker
  const publish = useCallback(async (topic: string, payload: string, serverId?: string) => {
    if (!serverId) {
      // Publish to all connected brokers
      const publishPromises = Array.from(brokersRef.current.values())
        .filter(broker => broker.status === 'connected')
        .map(async (broker) => {
          try {
            const Paho = require('paho-mqtt');
            const message = new Paho.Message(payload);
            message.destinationName = topic;
            broker.client.send(message);

            // Buffer publish stats (batched update)
            bufferStats(broker.id, 0, 0, payload.length);
          } catch (error) {
            console.error(`Failed to publish to ${broker.id}:`, error);
          }
        });

      await Promise.allSettled(publishPromises);
    } else {
      // Publish to specific broker
      const broker = brokersRef.current.get(serverId);
      if (broker && broker.status === 'connected') {
        try {
          const Paho = require('paho-mqtt');
          const message = new Paho.Message(payload);
          message.destinationName = topic;
          broker.client.send(message);

          // Buffer publish stats (batched update)
          bufferStats(broker.id, 0, 0, payload.length);
        } catch (error) {
          console.error(`Failed to publish to ${serverId}:`, error);
          throw error;
        }
      } else {
        throw new Error(`Broker ${serverId} is not connected`);
      }
    }
  }, []);

  // Subscribe to topic on broker
  const subscribe = useCallback(async (topic: string, listener: MqttListener, serverId?: string) => {
    // Determine which brokers to target
    const targetBrokerIds = serverId
      ? [serverId]
      : Array.from(brokersRef.current.keys()).length > 0
        ? Array.from(brokersRef.current.keys())
        : []; // If none loaded yet, we'll need to handle it elsewhere or wait

    // If no serverId provided AND we have configurations from API (via brokers state)
    // iterate over all of them.
    const allBrokerIds = Array.from(brokersRef.current.keys());

    if (!serverId) {
      // Global subscription across all current and future brokers
      allBrokerIds.forEach(id => {
        const broker = brokersRef.current.get(id);
        if (broker && broker.status === 'connected') {
          try {
            broker.client.subscribe(topic);
            const listeners = broker.listeners.get(topic) || [];
            if (!listeners.includes(listener)) {
              listeners.push(listener);
              broker.listeners.set(topic, listeners);
            }
          } catch (error) {
            console.error(`Failed to subscribe to ${topic} on ${id}:`, error);
          }
        } else {
          // Queue for this specific broker
          const pending = pendingSubscriptionsRef.current.get(id) || [];
          if (!pending.some(p => p.topic === topic && p.listener === listener)) {
            pending.push({ topic, listener });
            pendingSubscriptionsRef.current.set(id, pending);
          }
        }
      });
    } else {
      // Specific broker subscription
      const broker = brokersRef.current.get(serverId);
      if (broker) {
        if (broker.status === 'connected') {
          try {
            broker.client.subscribe(topic);
            const listeners = broker.listeners.get(topic) || [];
            if (!listeners.includes(listener)) {
              listeners.push(listener);
              broker.listeners.set(topic, listeners);
            }
          } catch (error) {
            console.error(`Failed to subscribe to ${topic} on ${serverId}:`, error);
            throw error;
          }
        } else {
          // Queue for later subscription
          const pending = pendingSubscriptionsRef.current.get(serverId) || [];
          if (!pending.some(p => p.topic === topic && p.listener === listener)) {
            pending.push({ topic, listener });
            pendingSubscriptionsRef.current.set(serverId, pending);
          }
        }
      } else {
        throw new Error(`Broker ${serverId} not found`);
      }
    }
  }, []);

  // Unsubscribe from topic on broker
  const unsubscribe = useCallback(async (topic: string, listener: MqttListener, serverId?: string) => {
    if (!serverId) {
      // Unsubscribe from all brokers
      Array.from(brokersRef.current.keys()).forEach(brokerId => {
        const broker = brokersRef.current.get(brokerId);
        if (broker) {
          try {
            const listeners = broker.listeners.get(topic) || [];
            const newListeners = listeners.filter(l => l !== listener);
            if (newListeners.length > 0) {
              broker.listeners.set(topic, newListeners);
            } else {
              broker.listeners.delete(topic);
              if (broker.status === 'connected') {
                broker.client.unsubscribe(topic);
              }
            }
          } catch (error) {
            console.error(`Failed to unsubscribe from ${topic} on ${brokerId}:`, error);
          }
        }

        // Also remove from pending list
        const pending = pendingSubscriptionsRef.current.get(brokerId) || [];
        const newPending = pending.filter(p => !(p.topic === topic && p.listener === listener));
        if (newPending.length > 0) {
          pendingSubscriptionsRef.current.set(brokerId, newPending);
        } else {
          pendingSubscriptionsRef.current.delete(brokerId);
        }
      });
    } else {
      // Unsubscribe from specific broker
      const broker = brokersRef.current.get(serverId);
      if (broker) {
        try {
          const listeners = broker.listeners.get(topic) || [];
          const newListeners = listeners.filter(l => l !== listener);
          if (newListeners.length > 0) {
            broker.listeners.set(topic, newListeners);
          } else {
            broker.listeners.delete(topic);
            if (broker.status === 'connected') {
              broker.client.unsubscribe(topic);
            }
          }
        } catch (error) {
          console.error(`Failed to unsubscribe from ${topic} on ${serverId}:`, error);
          throw error;
        }
      }

      // Also remove from pending list for this server
      const pending = pendingSubscriptionsRef.current.get(serverId) || [];
      const newPending = pending.filter(p => !(p.topic === topic && p.listener === listener));
      if (newPending.length > 0) {
        pendingSubscriptionsRef.current.set(serverId, newPending);
      } else {
        pendingSubscriptionsRef.current.delete(serverId);
      }
    }
  }, []);

  // Reload configuration
  const reloadConfiguration = useCallback(async () => {
    console.log('Reloading MQTT server configuration...');
    clearServerConfigCache();
    await initializeConnections();
  }, [initializeConnections]);

  // Get broker status
  const getBrokerStatus = useCallback((serverId: string): BrokerConnection | null => {
    return brokersRef.current.get(serverId) || null;
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeConnections();

    // Set up periodic health checks
    const healthCheckInterval = setInterval(async () => {
      try {
        // Get current active configurations from API
        const response = await fetch('/api/mqtt-config?active=true');
        if (!response.ok) return;

        const result = await response.json();
        if (!result.success) return;

        const configIds = new Set(result.data.map((c: any) => c.id));
        const currentBrokerIds = new Set(brokersRef.current.keys());

        // Check for new configurations
        const hasNewConfigs = result.data.some((config: any) => !currentBrokerIds.has(config.id));
        if (hasNewConfigs) {
          console.log('New MQTT configuration detected, reloading...');
          await initializeConnections();
          return;
        }

        // Check for removed configurations
        for (const brokerId of currentBrokerIds) {
          if (!configIds.has(brokerId)) {
            console.log(`MQTT configuration removed: ${brokerId}`);
            await disconnectFromBroker(brokerId);
            setBrokers(prev => prev.filter(b => b.id !== brokerId));
          }
        }
      } catch (error) {
        console.error('Error during health check:', error);
      }
    }, HEALTH_CHECK_INTERVAL);

    return () => {
      clearInterval(healthCheckInterval);

      // Clear any pending stats updates
      if (statsUpdateTimerRef.current) {
        clearTimeout(statsUpdateTimerRef.current);
        statsUpdateTimerRef.current = null;
      }

      // Clear any pending status update timeouts
      statusUpdateTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      statusUpdateTimeoutsRef.current.clear();

      // Cleanup all connections
      Array.from(brokersRef.current.keys()).forEach(brokerId => {
        disconnectFromBroker(brokerId);
      });
    };
  }, [initializeConnections, disconnectFromBroker]);

  // Topic matching utility
  const matchesTopic = (wildcard: string, actualTopic: string): boolean => {
    if (wildcard === actualTopic) return true;
    if (wildcard.endsWith('/#')) {
      const prefix = wildcard.slice(0, -2);
      return actualTopic.startsWith(prefix + '/');
    }
    if (wildcard.includes('+')) {
      const pattern = wildcard.replace(/\//g, '\\/').replace(/\+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(actualTopic);
    }
    return false;
  };

  const value: MqttServerContextType = {
    isReady,
    brokers,
    publish,
    subscribe,
    unsubscribe,
    reloadConfiguration,
    getBrokerStatus,
  };

  return (
    <MqttServerContext.Provider value={value}>
      {children}
    </MqttServerContext.Provider>
  );
}
