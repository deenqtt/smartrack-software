import mqtt from "mqtt";
import { RuleChainExecutionEngine } from "./execution-engine";
import { prisma } from "@/lib/prisma";
import { getActiveServerConfigs } from "@/lib/mqtt-server-config";
import { getPahoConnectionOptions } from "@/lib/mqtt-utils";
import { loggers } from "../logger";

// Interface untuk RuleChain yang akan disimpan di cache
interface CachedRuleChain {
  id: string;
  name: string;
  nodes: any;
  edges: any;
}

interface TopicSubscription {
  topic: string;
  ruleChainIds: string[];
  count: number;
}

class RuleChainMqttListener {
  private client: mqtt.MqttClient | null = null;
  private executionEngine: RuleChainExecutionEngine;
  private subscriptions: Map<string, TopicSubscription> = new Map();
  private cachedMacAddress: string | null = null;
  private isSubscribedToConfig = false;
  private reloadRequested: boolean = false;
  private reloadCheckInterval: NodeJS.Timeout | null = null;
  private messageCache: Map<string, number> = new Map();
  private readonly MESSAGE_CACHE_TTL = 1000; // 1 second

  private cachedRuleChains: Map<string, CachedRuleChain> = new Map();
  private isConnected: boolean = false;

  constructor() {
    this.executionEngine = new RuleChainExecutionEngine();
  }

  async start(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      const serverConfigs = await getActiveServerConfigs();
      if (serverConfigs.length === 0) {
        throw new Error("No active MQTT server configurations found");
      }
      const primaryConfig = serverConfigs[0];
      const connectionOptions = getPahoConnectionOptions(primaryConfig.config);

      const protocol = primaryConfig.config.useSSL ? 'wss' : 'ws';
      const brokerUrl = `${protocol}://${primaryConfig.config.brokerHost}:${primaryConfig.config.brokerPort}`;
      const clientId = `rule-chain-listener-${Date.now()}`;

      await new Promise<void>((resolve, reject) => {
        this.client = mqtt.connect(brokerUrl, {
          clientId,
          username: connectionOptions.userName,
          password: connectionOptions.password,
          clean: true,
          keepalive: 30,
        });

        this.client.on('connect', () => {
          this.isConnected = true;
          this.refreshSubscriptions();
          resolve();
        });

        this.client.on('error', (error: any) => {
          this.isConnected = false;
          loggers.ruleChain.error("Connection failed:", error.message || error);
          reject(error);
        });

        this.client.on('close', () => {
          this.isConnected = false;
        });

        this.client.on('message', async (topic: string, message: Buffer) => {
          await this.handleMessage(topic, message);
        });
      });

      this.startReloadPolling();
    } catch (error) {
      loggers.ruleChain.error("Failed to start listener:", error);
    }
  }

  private startReloadPolling(): void {
    if (this.reloadCheckInterval) {
      clearInterval(this.reloadCheckInterval);
    }

    this.reloadCheckInterval = setInterval(async () => {
      if (this.reloadRequested) {
        this.reloadRequested = false;
        await this.refreshSubscriptions();
      }
    }, 3000);
  }

  requestReload(): void {
    this.reloadRequested = true;
  }

  async stop(): Promise<void> {
    if (this.client && this.isConnected) {
      this.client.end();
      this.client = null;
    }

    if (this.reloadCheckInterval) {
      clearInterval(this.reloadCheckInterval);
      this.reloadCheckInterval = null;
    }

    this.isConnected = false;
    this.subscriptions.clear();
  }

  async refreshSubscriptions(): Promise<void> {
    if (!this.isConnected || !this.client) return;

    try {
      await prisma.$queryRaw`SELECT 1`;

      const activeChains = await prisma.ruleChain.findMany({
        where: { isActive: true },
      });

      const oldTopics = new Set(this.subscriptions.keys());
      this.subscriptions.clear();

      const topicMap = new Map<string, Set<string>>();

      for (const chain of activeChains) {
        this.cachedRuleChains.set(chain.id, chain);

        const nodes = chain.nodes as any[];
        const inputNodes = nodes.filter((node: any) => node.type === "inputNode");
        const enrichmentNodes = nodes.filter((node: any) => node.type === "enrichmentNode");
        const analyticsNodes = nodes.filter((node: any) => {
          if (node.type !== "analyticsNode") return false;
          const hasTopLevelTopic = node.data?.config?.deviceTopic || node.data?.config?.topic;
          const hasOperandsTopic = node.data?.config?.operands && node.data?.config?.operands.length > 0 && node.data?.config?.operands[0].topic;
          return hasTopLevelTopic || hasOperandsTopic;
        });

        for (const node of inputNodes) {
          const topic = node.data?.config?.topic;
          if (topic) {
            if (!topicMap.has(topic)) topicMap.set(topic, new Set());
            topicMap.get(topic)!.add(chain.id);
          }
        }

        for (const node of enrichmentNodes) {
          const topic = node.data?.config?.deviceTopic;
          if (topic) {
            if (!topicMap.has(topic)) topicMap.set(topic, new Set());
            topicMap.get(topic)!.add(chain.id);
          }
        }

        for (const node of analyticsNodes) {
          let topic = node.data?.config?.deviceTopic || node.data?.config?.topic;
          if (!topic && node.data?.config?.operands && node.data?.config?.operands.length > 0) {
            topic = node.data?.config?.operands[0].topic;
          }
          if (topic) {
            if (!topicMap.has(topic)) topicMap.set(topic, new Set());
            topicMap.get(topic)!.add(chain.id);
          }
        }
      }

      const newTopics = new Set(topicMap.keys());

      for (const topic of newTopics) {
        if (!oldTopics.has(topic)) {
          this.client.subscribe(topic, { qos: 0 as any });
        }
      }

      for (const topic of oldTopics) {
        if (!newTopics.has(topic)) {
          this.client.unsubscribe(topic);
        }
      }

      for (const [topic, ruleChainIdsSet] of topicMap) {
        const ruleChainIds = Array.from(ruleChainIdsSet);
        this.subscriptions.set(topic, {
          topic,
          ruleChainIds,
          count: ruleChainIds.length,
        });
      }

      if (this.subscriptions.size === 0) {
        loggers.ruleChain.warn("No topics subscribed");
      }
    } catch (error) {
      loggers.ruleChain.error("Error refreshing subscriptions:", error);
    }
  }

  private async handleMessage(topic: string, message: Buffer): Promise<void> {
    try {
      if (topic === "mqtt_config/response_mac") {
        try {
          const payload = JSON.parse(message.toString());
          if (payload.mac_address) {
            this.cachedMacAddress = payload.mac_address;
          }
        } catch (error) {
          loggers.ruleChain.error("Failed to parse response_mac:", error);
        }
        return;
      }

      const messageKey = `${topic}:${message.toString()}`;
      const now = Date.now();
      const lastProcessed = this.messageCache.get(messageKey);

      if (lastProcessed && now - lastProcessed < this.MESSAGE_CACHE_TTL) {
        loggers.ruleChain.debug(`Duplicate message on "${topic}" (ignored)`);
        return;
      }

      this.messageCache.set(messageKey, now);

      for (const [key, timestamp] of this.messageCache.entries()) {
        if (now - timestamp > this.MESSAGE_CACHE_TTL) {
          this.messageCache.delete(key);
        }
      }

      const subscription = this.subscriptions.get(topic);
      if (!subscription) {
        loggers.ruleChain.debug(`Unsubscribed topic: ${topic}`);
        return;
      }

      let payload: any;
      try {
        payload = JSON.parse(message.toString());
      } catch (error) {
        loggers.ruleChain.error("Failed to parse JSON message");
        return;
      }

      for (const ruleChainId of subscription.ruleChainIds) {
        try {
          const ruleChain = this.cachedRuleChains.get(ruleChainId);
          if (!ruleChain) continue;
          await this.executeRuleChain(ruleChain, payload, topic);
        } catch (error) {
          loggers.ruleChain.error(`Failed to execute ${ruleChainId}:`, error);
        }
      }
    } catch (error) {
      loggers.ruleChain.error("Error handling message:", error);
    }
  }

  private async executeRuleChain(
    ruleChain: CachedRuleChain,
    mqttPayload: any,
    triggeredFromTopic?: string,
  ): Promise<void> {
    try {
      const processedPayload = this.preprocessPayload(mqttPayload);
      let nodes = ruleChain.nodes as any[];
      let triggeringNodeId: string | undefined;

      if (triggeredFromTopic) {
        const inputNodes = nodes.filter(
          (n: any) => n.type === "inputNode" && n.data?.config?.topic === triggeredFromTopic,
        );
        const enrichmentNodes = nodes.filter(
          (n: any) => n.type === "enrichmentNode" && n.data?.config?.deviceTopic === triggeredFromTopic,
        );
        const analyticsNodes = nodes.filter((n: any) => {
          if (n.type !== "analyticsNode") return false;
          const nodeTopic = n.data?.config?.deviceTopic || n.data?.config?.topic;
          if (nodeTopic === triggeredFromTopic) return true;
          if (n.data?.config?.operands && n.data?.config?.operands.length > 0) {
            return n.data?.config?.operands[0].topic === triggeredFromTopic;
          }
          return false;
        });

        if (inputNodes.length === 0 && enrichmentNodes.length === 0 && analyticsNodes.length === 0) {
          return;
        }

        let nodesToExecuteFrom: any[] = [];
        if (inputNodes.length > 0) {
          nodesToExecuteFrom = inputNodes; // execute ALL matching inputNodes, not just the first
        } else if (enrichmentNodes.length > 0) {
          nodesToExecuteFrom = [enrichmentNodes[0]];
        } else {
          nodesToExecuteFrom = analyticsNodes;
        }

        for (const triggeringNode of nodesToExecuteFrom) {
          triggeringNodeId = triggeringNode.id;
          await this.executionEngine.executeRuleChain(
            ruleChain.id,
            nodes,
            ruleChain.edges as any[],
            processedPayload,
            triggeringNodeId,
          );
        }
      } else {
        await this.executionEngine.executeRuleChain(
          ruleChain.id,
          nodes,
          ruleChain.edges as any[],
          processedPayload,
          triggeringNodeId,
        );
      }
    } catch (error: any) {
      loggers.ruleChain.error(`Execution failed:`, error.message);
    }
  }

  private preprocessPayload(payload: any): any {
    let processed = { ...payload };
    if (processed.value && typeof processed.value === "string") {
      try {
        const parsedValue = JSON.parse(processed.value);
        processed = { ...processed, ...parsedValue };
      } catch (error) {
        loggers.ruleChain.debug(`Failed to parse "value" field as JSON`);
      }
    }
    return processed;
  }

  getStatus() {
    const subscriptions = Array.from(this.subscriptions.values());
    const totalRuleChains = subscriptions.reduce((sum, sub) => sum + sub.count, 0);

    return {
      isConnected: this.isConnected,
      subscriptions,
      totalTopics: subscriptions.length,
      totalRuleChains,
    };
  }

  async forceRefresh(): Promise<void> {
    if (!this.isConnected) {
      loggers.ruleChain.info("Starting connection...");
      await this.start();
      return;
    }
    if (this.messageCache.size > 0) {
      this.messageCache.clear();
    }
    await this.refreshSubscriptions();
  }

  private subscribeToMqttConfig(): void {
    if (!this.client || this.isSubscribedToConfig) return;
    const configTopic = "mqtt_config/response_mac";
    this.client.subscribe(configTopic, { qos: 0 as any }, (err: any) => {
      if(!err) {
        this.isSubscribedToConfig = true;
      } else {
        loggers.ruleChain.error("Failed to subscribe to response_mac:", err);
      }
    });
  }

  async getMacAddress(): Promise<string> {
    await this.ensureConnected();
    if (this.cachedMacAddress) return this.cachedMacAddress;

    const requestTopic = "mqtt_config/get_mac_address";
    if (!this.isSubscribedToConfig) {
      this.subscribeToMqttConfig();
    }

    try {
      await this.publish(requestTopic, { command: "getMacAddress" });
    } catch (error) {
      loggers.ruleChain.error(`Failed to request MAC: ${error}`);
    }

    const maxWaitTime = 3000;
    const startTime = Date.now();
    while (!this.cachedMacAddress && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return this.cachedMacAddress || "unknown";
  }

  async publish(topic: string, payload: object | string): Promise<void> {
    const client = await this.ensureConnected();
    const messageStr = typeof payload === "string" ? payload : JSON.stringify(payload);
    return new Promise((resolve) => {
      this.client!.publish(topic, messageStr, { qos: 0 as any });
      resolve();
    });
  }

  private async ensureConnected(): Promise<mqtt.MqttClient> {
    if (this.client && this.isConnected) return this.client;
    if (!this.isConnected) await this.start();

    const maxWaitTime = 5000;
    const startTime = Date.now();
    while (!this.isConnected && Date.now() - startTime < maxWaitTime) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.client) throw new Error("MQTT connection failed");
    return this.client;
  }
}

declare global {
  var __ruleChainMqttListener: RuleChainMqttListener | undefined;
}

const getRuleChainMqttListenerInstance = (): RuleChainMqttListener => {
  if (process.env.NODE_ENV === "production") {
    return new RuleChainMqttListener();
  } else {
    if (!global.__ruleChainMqttListener) {
      global.__ruleChainMqttListener = new RuleChainMqttListener();
    }
    return global.__ruleChainMqttListener;
  }
};

export const ruleChainMqttListener = getRuleChainMqttListenerInstance();

if (typeof process !== "undefined") {
  process.on("SIGINT", () => {
    ruleChainMqttListener.stop();
  });
  process.on("SIGTERM", () => {
    ruleChainMqttListener.stop();
  });
}
