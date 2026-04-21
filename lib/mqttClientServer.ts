// lib/mqttClientServer.ts
// Server-based MQTT client management
// Provides MQTT client functionality using server configurations from database

import { getActiveServerConfigs, getServerConfigById, type MqttServerConfig } from "@/lib/mqtt-server-config";
import { loggers } from "./logger";

interface ServerMQTTClient {
  id: string;
  client: any; // MqttClient
  config: MqttServerConfig;
  connectedAt: Date;
  topics: Set<string>;
}

class MQTTClientServerManager {
  private clients: Map<string, ServerMQTTClient> = new Map();
  private isInitialized: boolean = false;

  // Initialize all active server MQTT clients
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      loggers.mqtt.info("Initializing clients...");

      const serverConfigs = await getActiveServerConfigs();

      if (serverConfigs.length === 0) {
        loggers.mqtt.warn("No active MQTT server configurations found");
        return;
      }

      loggers.mqtt.info("Found ${serverConfigs.length} active configs");

      // Initialize connections to all active brokers
      for (const serverConfig of serverConfigs) {
        await this.connectToServer(serverConfig);
      }

      this.isInitialized = true;
      loggers.mqtt.info("Clients initialized");

    } catch (error) {
      loggers.mqtt.error("Failed to initialize MQTT server clients:", error);
      throw error;
    }
  }

  // Connect to a specific MQTT server
  private async connectToServer(serverConfig: MqttServerConfig): Promise<void> {
    const serverId = serverConfig.id;

    try {
      // Import MQTT dynamically
      const mqtt = (await import('mqtt')).default || await import('mqtt');

      // Connect with server config
      const protocol = serverConfig.config.useSSL ? 'wss' : 'ws';
      const brokerUrl = `${protocol}://${serverConfig.config.brokerHost}:${serverConfig.config.brokerPort}`;

      loggers.mqtt.info(`Connecting to: ${serverConfig.name} → ${brokerUrl}`);

      const connectionOptions: any = {
        clientId: `mqtt-client-server-${serverId}-${Date.now()}`,
        clean: true,
        keepAlive: 30,
        reconnectPeriod: 5000,
        connectTimeout: 10000,
      };

      if (serverConfig.config.useAuthentication && serverConfig.config.username && serverConfig.config.password) {
        connectionOptions.username = serverConfig.config.username;
        connectionOptions.password = serverConfig.config.password;
      }

      await new Promise<void>((resolve, reject) => {
        const client = (mqtt as any).connect(brokerUrl, connectionOptions);

        client.on('connect', () => {
          loggers.mqtt.info(`Connected: ${serverConfig.name} (${brokerUrl})`);

          this.clients.set(serverId, {
            id: serverId,
            client,
            config: serverConfig,
            connectedAt: new Date(),
            topics: new Set()
          });

          resolve();
        });

        client.on('error', (error: any) => {
          loggers.mqtt.error(`Failed to connect to MQTT server ${serverId}:`, error.message);
          reject(error);
        });

        client.on('close', () => {
          loggers.mqtt.warn(`MQTT server ${serverId} connection closed`);
          this.clients.delete(serverId);
        });
      });

    } catch (error) {
      loggers.mqtt.error(`Error connecting to MQTT server ${serverId}:`, error);
      throw error;
    }
  }

  // Get all connected clients
  getClients(): ServerMQTTClient[] {
    return Array.from(this.clients.values());
  }

  // Get client by server ID
  getClient(serverId: string): ServerMQTTClient | undefined {
    return this.clients.get(serverId);
  }

  // Subscribe to topics on all connected servers
  async subscribe(topics: string[], options: { qos?: number } = {}): Promise<void> {
    const { qos = 1 } = options;

    if (this.clients.size === 0) {
      loggers.mqtt.warn("No MQTT server clients available for subscription");
      return;
    }

    const subscribePromises: Promise<void>[] = [];

    for (const [serverId, serverClient] of this.clients) {
      const promise = new Promise<void>((resolve, reject) => {
        try {
          serverClient.client.subscribe(topics, { qos: qos as any }, (err: any) => {
            if (!err) {
              topics.forEach(topic => serverClient.topics.add(topic));
              loggers.mqtt.info(`Subscribed to ${topics.length} topics on server ${serverId}`);
              resolve();
            } else {
              loggers.mqtt.error(`Failed to subscribe to topics on server ${serverId}:`, err);
              reject(err);
            }
          });
        } catch (error) {
          loggers.mqtt.error(`Error subscribing to topics on server ${serverId}:`, error);
          reject(error);
        }
      });
      subscribePromises.push(promise);
    }

    try {
      await Promise.allSettled(subscribePromises);
      loggers.mqtt.info(`Topic subscription completed on ${this.clients.size} servers`);
    } catch (error) {
      loggers.mqtt.error("Error in topic subscription:", error);
    }
  }

  // Unsubscribe from topics on all connected servers
  async unsubscribe(topics: string[]): Promise<void> {
    if (this.clients.size === 0) {
      loggers.mqtt.warn("No MQTT server clients available for unsubscription");
      return;
    }

    const unsubscribePromises: Promise<void>[] = [];

    for (const [serverId, serverClient] of this.clients) {
      const promise = new Promise<void>((resolve) => {
        try {
          serverClient.client.unsubscribe(topics, (err: any) => {
            if (!err) {
              topics.forEach(topic => serverClient.topics.delete(topic));
              loggers.mqtt.info(`Unsubscribed from ${topics.length} topics on server ${serverId}`);
            } else {
              loggers.mqtt.warn(`Failed to unsubscribe from topics on server ${serverId}`);
            }
            resolve();
          });
        } catch (error) {
          loggers.mqtt.warn(`Error unsubscribing from topics on server ${serverId}:`, error);
          resolve(); // Don't fail the whole operation
        }
      });
      unsubscribePromises.push(promise);
    }

    try {
      await Promise.allSettled(unsubscribePromises);
      loggers.mqtt.info(`Topic unsubscription completed on ${this.clients.size} servers`);
    } catch (error) {
      loggers.mqtt.error("Error in topic unsubscription:", error);
    }
  }

  // Publish message to all connected servers
  async publish(topic: string, payload: string, options: { qos?: number, retained?: boolean } = {}): Promise<void> {
    const { qos = 1, retained = false } = options;

    if (this.clients.size === 0) {
      loggers.mqtt.error(`[PUBLISH FAILED] No MQTT broker connected — message dropped for topic: ${topic}`);
      return;
    }

    const publishPromises: Promise<void>[] = [];

    for (const [serverId, serverClient] of this.clients) {
      const promise = new Promise<void>((resolve) => {
        try {
          serverClient.client.publish(topic, payload, { qos: qos as any, retain: retained });
          loggers.mqtt.debug(`Published message to ${topic} on server ${serverId}`);
          resolve();
        } catch (error) {
          loggers.mqtt.error(`Error publishing to server ${serverId}:`, error);
          resolve(); // Don't fail the whole operation
        }
      });
      publishPromises.push(promise);
    }

    await Promise.allSettled(publishPromises);
  }

  // Set message handler for all clients
  onMessage(handler: (topic: string, payload: string, serverId: string) => void): void {
    for (const [serverId, serverClient] of this.clients) {
      serverClient.client.on('message', (topic: string, message: any) => {
        try {
          handler(topic, message.toString(), serverId);
        } catch (error) {
          loggers.mqtt.error(`Error in message handler for server ${serverId}:`, error);
        }
      });
    }
  }

  // Check and maintain server connections
  async checkConnections(): Promise<void> {
    try {
      // Get current active server configurations
      const currentConfigs = await getActiveServerConfigs();
      const currentConfigIds = new Set(currentConfigs.map(c => c.id));

      // Check for servers that are no longer active
      const serversToRemove: string[] = [];
      for (const [serverId] of this.clients) {
        if (!currentConfigIds.has(serverId)) {
          loggers.mqtt.info(`Removing connection to deactivated MQTT server: ${serverId}`);
          serversToRemove.push(serverId);
        }
      }

      // Remove deactivated servers
      for (const serverId of serversToRemove) {
        const serverClient = this.clients.get(serverId);
        if (serverClient) {
          try {
            serverClient.client.end();
          } catch (error) {
            loggers.mqtt.warn(`Error disconnecting from MQTT server ${serverId}:`, error);
          }
          this.clients.delete(serverId);
        }
      }

      // Check for new active configurations
      for (const serverConfig of currentConfigs) {
        if (!this.clients.has(serverConfig.id)) {
          loggers.mqtt.info(`Connecting to newly activated MQTT server: ${serverConfig.name}`);
          try {
            await this.connectToServer(serverConfig);
          } catch (error) {
            loggers.mqtt.error(`Failed to connect to new MQTT server ${serverConfig.id}:`, error);
          }
        }
      }

    } catch (error) {
      loggers.mqtt.error("Error checking MQTT server connections:", error);
    }
  }

  // Disconnect all clients
  async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const [serverId, serverClient] of this.clients) {
      const promise = new Promise<void>((resolve) => {
        try {
          serverClient.client.end();
          loggers.mqtt.info(`Disconnected from MQTT server ${serverId}`);
          resolve();
        } catch (error) {
          loggers.mqtt.warn(`Error disconnecting from MQTT server ${serverId}:`, error);
          resolve();
        }
      });
      disconnectPromises.push(promise);
    }

    await Promise.allSettled(disconnectPromises);
    this.clients.clear();
    this.isInitialized = false;
    loggers.mqtt.info("All MQTT server connections closed");
  }

  // Get connection status
  getStatus(): { total: number, connected: number, servers: string[] } {
    const servers = Array.from(this.clients.keys());
    return {
      total: servers.length,
      connected: servers.length, // All in map are connected
      servers
    };
  }
}

// Singleton instance
const mqttClientServerManager = new MQTTClientServerManager();

// Export functions compatible with existing MQTT client interface
export async function initializeMQTTServerClients(): Promise<void> {
  await mqttClientServerManager.initialize();
}

export function getMQTTServerClients(): ServerMQTTClient[] {
  return mqttClientServerManager.getClients();
}

export function getMQTTServerClient(serverId: string): ServerMQTTClient | undefined {
  return mqttClientServerManager.getClient(serverId);
}

export async function subscribeMQTTServerTopics(topics: string[], options?: { qos?: number }): Promise<void> {
  await mqttClientServerManager.subscribe(topics, options);
}

export async function unsubscribeMQTTServerTopics(topics: string[]): Promise<void> {
  await mqttClientServerManager.unsubscribe(topics);
}

export async function publishMQTTServerMessage(topic: string, payload: string, options?: { qos?: number, retained?: boolean }): Promise<void> {
  await mqttClientServerManager.publish(topic, payload, options);
}

export function onMQTTServerMessage(handler: (topic: string, payload: string, serverId: string) => void): void {
  mqttClientServerManager.onMessage(handler);
}

export async function checkMQTTServerConnections(): Promise<void> {
  await mqttClientServerManager.checkConnections();
}

export async function disconnectMQTTServerClients(): Promise<void> {
  await mqttClientServerManager.disconnect();
}

export function getMQTTServerStatus(): { total: number, connected: number, servers: string[] } {
  return mqttClientServerManager.getStatus();
}

// Main interface function - returns a client-like interface for server-based MQTT
export function getMQTTServerClientInterface() {
  return {
    subscribe: subscribeMQTTServerTopics,
    unsubscribe: unsubscribeMQTTServerTopics,
    publish: publishMQTTServerMessage,
    on: (event: string, handler: (topic: string, payload: string, serverId: string) => void) => {
      if (event === 'message') {
        onMQTTServerMessage(handler);
      }
    },
    get connected() { return mqttClientServerManager.getStatus().connected > 0; },
    disconnect: disconnectMQTTServerClients
  };
}
