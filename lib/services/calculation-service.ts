// File: lib/services/calculation-service.ts
// Description: Service for real-time calculation of Bill, PUE, and Power Analyzer.

import type {
  BillConfiguration,
  PueConfiguration,
  PowerAnalyzerConfiguration,
  DeviceExternal,
} from "@prisma/client";
import { prisma } from "@/lib/prisma"; // Use globally optimized Prisma client with connection pooling
import { loggers } from "../logger";

// Use server-based MQTT client for multi-broker support
import {
  getMQTTServerClientInterface,
  onMQTTServerMessage,
  initializeMQTTServerClients,
} from "@/lib/mqttClientServer";
import { serviceManager, ServiceEvents } from "./service-manager";

// Definisikan tipe gabungan untuk semua konfigurasi
type AnyConfig = (
  | BillConfiguration
  | PueConfiguration
  | PowerAnalyzerConfiguration
) & {
  type: "Bill" | "PUE" | "PowerAnalyzer";
  sourceDevices: { uniqId: string; key: string }[];
  publishTopic: string;
};

class CalculationService {
  private configs: AnyConfig[] = [];
  private lastValues: Map<string, { value: number; timestamp: Date }> =
    new Map();
  private subscribedTopics: Set<string> = new Set();

  // --- Start of Merged Bill Scheduler Logic ---
  private billSchedulerTimers: Map<
    string,
    { timer: NodeJS.Timeout; config: any }
  > = new Map();
  private readonly BILL_INTERVAL_MINUTES = 5; // Fixed 10 minutes for DB logging
  // --- End of Merged Bill Scheduler Logic ---

  //  NEW: Reload mechanism
  private reloadRequested: boolean = false;
  private isInitialized: boolean = false;

  // Use global prisma client

  public async start() {
    if (this.isInitialized) {
      loggers.calculation.warn("Calculation service already initialized");
      return;
    }

    try {
      loggers.calculation.info("Starting calculation service...");

      // Ensure MQTT server clients are initialized (idempotent - safe to call multiple times)
      await initializeMQTTServerClients();

      // Setup message handler for all MQTT servers
      onMQTTServerMessage(
        async (topic: string, payload: string, serverId: string) => {
          this.handleMessage(topic, payload, serverId);
        },
      );

      // Load configurations and subscribe to topics
      await this.reloadAllServices();

      // Subscribe to all required topics on all MQTT servers
      await this.subscribeToAllTopics();

      // --- NEW: Register with ServiceManager ---
      serviceManager.registerService("CalculationService", this);

      // Listen for configuration updates
      serviceManager.on(ServiceEvents.CONFIG_UPDATED, async (event: any) => {
        if (
          event.type === "BILL" ||
          event.type === "PUE" ||
          event.type === "POWER_ANALYZER" ||
          event.type === "DEVICE"
        ) {
          loggers.calculation.info(
            "Refreshing calculation configurations due to update event",
          );
          await this.reloadAllServices();
          await this.subscribeToAllTopics();
        }
      });

      // --- NEW: Initialize Bill Scheduler ---
      await this.setupAllBillSchedulerConfigs();
      // ------------------------------------

      this.isInitialized = true;

      const billCount = this.configs.filter((c) => c.type === "Bill").length;
      const pueCount = this.configs.filter((c) => c.type === "PUE").length;
      const powerAnalyzerCount = this.configs.filter(
        (c) => c.type === "PowerAnalyzer",
      ).length;

      loggers.calculation.info(
        `Calculation service ready with ${this.configs.length} configs (Bill: ${billCount}, PUE: ${pueCount}, PowerAnalyzer: ${powerAnalyzerCount})`,
      );
    } catch (error) {
      loggers.calculation.error("Failed to start calculation service:", error);
      throw error;
    }
  }

  private async subscribeToAllTopics() {
    if (this.subscribedTopics.size === 0) {
      loggers.calculation.info("No topics to subscribe");
      return;
    }

    try {
      const topics = Array.from(this.subscribedTopics);
      const mqttInterface = getMQTTServerClientInterface();
      await mqttInterface.subscribe(topics, { qos: 1 });
      loggers.calculation.info(`Subscribed to ${topics.length} topics`);
    } catch (error) {
      loggers.calculation.error(
        "Failed to subscribe to calculation topics",
        error,
      );
    }
  }

  /**
   * Request reload (called by API) - Now redundant but kept for API compatibility
   */
  public async requestReload() {
    loggers.calculation.info("Manual reload triggered via API");
    await this.reloadAllServices();
    await this.subscribeToAllTopics();
  }

  /**
   * Get status
   */
  public getStatus() {
    const mqttInterface = getMQTTServerClientInterface();
    return {
      initialized: this.isInitialized,
      calculationService: {
        activeConfigs: this.configs.length,
        configBreakdown: {
          bill: this.configs.filter((c) => c.type === "Bill").length,
          pue: this.configs.filter((c) => c.type === "PUE").length,
          powerAnalyzer: this.configs.filter((c) => c.type === "PowerAnalyzer")
            .length,
        },
        cachedValues: this.lastValues.size,
        subscribedTopics: Array.from(this.subscribedTopics),
      },
      billScheduler: {
        activeTimers: this.billSchedulerTimers.size,
        intervalMinutes: this.BILL_INTERVAL_MINUTES,
      },
      mqttConnected: mqttInterface?.connected || false,
    };
  }

  public shutdown() {
    loggers.calculation.info("Shutting down calculation service...");
    // Clear calculation service interval
    if ((global as any).calcServiceInterval) {
      clearInterval((global as any).calcServiceInterval);
    }
    // Clear bill scheduler timers
    this.billSchedulerTimers.forEach(({ timer }) => clearTimeout(timer));
    this.billSchedulerTimers.clear();

    this.isInitialized = false;
    loggers.calculation.info("Calculation service shutdown");
  }

  // --- Start of Merged Bill Scheduler Methods ---
  private calculateBillSchedulerNextRunTime(config: any) {
    const now = new Date();
    const createdAt = new Date(config.createdAt);
    const intervalMs = this.BILL_INTERVAL_MINUTES * 60 * 1000;

    const elapsedMs = now.getTime() - createdAt.getTime();
    const remainderMs = elapsedMs % intervalMs;
    const nextRunMs = intervalMs - remainderMs;

    return { nextRun: new Date(now.getTime() + nextRunMs), delayMs: nextRunMs };
  }

  private async processSingleBillConfig(config: any) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

      const port = Number(process.env.PORT || "3030");
      const hostname = "localhost";
      loggers.calculation.info(
        `Bill scheduler firing for: ${config.customName} → http://${hostname}:${port}/api/cron/bill-logger`,
      );

      const response = await fetch(
        `http://${hostname}:${port}/api/cron/bill-logger?configId=${config.id}`,
        {
          method: "GET",
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const loggedCount = result.logged || 0;
      if (loggedCount > 0) {
        loggers.calculation.info(
          `Bill logged: ${config.customName} → ${loggedCount} entr${loggedCount > 1 ? "ies" : "y"} saved`,
        );
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        loggers.calculation.error(
          `Timeout processing ${config.customName} (>30s)`,
        );
      } else {
        loggers.calculation.error(
          `Failed to process ${config.customName}: ${error.message}`,
        );
      }
    }
  }
  // --- End of Merged Bill Scheduler Methods ---

  private scheduleBillSchedulerConfig(config: any) {
    if (this.billSchedulerTimers.has(config.id)) {
      // Clear existing timer before rescheduling
      const existingTimer = this.billSchedulerTimers.get(config.id);
      if (existingTimer) clearTimeout(existingTimer.timer);
    }

    const { delayMs } = this.calculateBillSchedulerNextRunTime(config);

    const timer = setTimeout(async () => {
      if (!this.billSchedulerTimers.has(config.id)) return;
      await this.processSingleBillConfig(config);

      const intervalMs = this.BILL_INTERVAL_MINUTES * 60 * 1000;
      const nextTimer = setTimeout(
        async function runNext(this: CalculationService) {
          if (!this.billSchedulerTimers.has(config.id)) return;
          await this.processSingleBillConfig(config);
          const timer = setTimeout(runNext.bind(this), intervalMs);
          const timerData = this.billSchedulerTimers.get(config.id);
          if (timerData) timerData.timer = timer;
        }.bind(this),
        intervalMs,
      );
      const timerData = this.billSchedulerTimers.get(config.id);
      if (timerData) timerData.timer = nextTimer;
    }, delayMs);

    this.billSchedulerTimers.set(config.id, { timer, config });
  }

  public async setupAllBillSchedulerConfigs() {
    try {
      const configs = await prisma.billConfiguration.findMany();
      loggers.calculation.info(
        `Found ${configs.length} bill configurations for DB logging`,
      );
      for (const config of configs) {
        this.scheduleBillSchedulerConfig(config);
      }
      loggers.calculation.info(
        `Bill configurations scheduled (${this.billSchedulerTimers.size} total)`,
      );
    } catch (error) {
      loggers.calculation.error(
        "Error setting up bill scheduler configs",
        error,
      );
    }
  }

  public async reloadBillSchedulerConfigs() {
    try {
      const currentConfigs = await prisma.billConfiguration.findMany();
      const currentConfigIds = new Set(currentConfigs.map((c: any) => c.id));

      for (const [configId, timerData] of this.billSchedulerTimers.entries()) {
        if (!currentConfigIds.has(configId)) {
          clearTimeout(timerData.timer);
          this.billSchedulerTimers.delete(configId);
          loggers.calculation.info(
            `Removed bill scheduler config: ${timerData.config.customName}`,
          );
        }
      }

      for (const config of currentConfigs) {
        // Always reschedule to apply potential changes, scheduleBillSchedulerConfig handles clearing existing timers
        this.scheduleBillSchedulerConfig(config);
      }

      loggers.calculation.info(
        `Bill configurations reload complete (${this.billSchedulerTimers.size} active)`,
      );
    } catch (error) {
      loggers.calculation.error(
        "Error reloading bill scheduler configs",
        error,
      );
    }
  }

  private async reloadAllServices() {
    const billConfigs = await prisma.billConfiguration.findMany({
      include: { publishTargetDevice: true },
    });
    const pueConfigs = await prisma.pueConfiguration.findMany({
      include: { apiTopic: true },
    });
    const powerAnalyzerConfigs =
      await prisma.powerAnalyzerConfiguration.findMany({
        include: { apiTopic: true },
      });

    const allConfigs: AnyConfig[] = [];
    const topicsToSubscribe = new Set<string>();

    for (const config of billConfigs) {
      if (config.publishTargetDevice?.topic) {
        const sourceDevice = await prisma.deviceExternal.findUnique({
          where: { uniqId: config.sourceDeviceUniqId },
        });
        if (sourceDevice?.topic) {
          topicsToSubscribe.add(sourceDevice.topic);
          allConfigs.push({
            ...config,
            type: "Bill",
            sourceDevices: [
              {
                uniqId: config.sourceDeviceUniqId,
                key: config.sourceDeviceKey,
              },
            ],
            publishTopic: config.publishTargetDevice.topic,
          });
        }
      }
    }

    const processComplexConfig = async (
      config: (PueConfiguration | PowerAnalyzerConfiguration) & {
        apiTopic: DeviceExternal | null;
      },
      type: "PUE" | "PowerAnalyzer",
    ) => {
      if (!config.apiTopic?.topic) return;

      //  FIX: Parse JSON strings dengan safety check
      let pduList: any[] = [];
      let mainPower: any = null;

      try {
        // Parse pduList dari JSON string
        if (config.pduList) {
          pduList = JSON.parse(String(config.pduList));
          // Safety check: pastikan hasilnya array
          if (!Array.isArray(pduList)) {
            pduList = [];
          }
        }

        // Parse mainPower dari JSON string
        if (config.mainPower) {
          mainPower = JSON.parse(String(config.mainPower));
        }
      } catch (error) {
        loggers.calculation.error(
          `Error parsing config for ${config.customName}`,
          error,
        );
        return; // Skip config yang error
      }

      const sources: { uniqId: string; key: string }[] = [];

      // Process mainPower
      const mainUniqId = mainPower?.uniqId || mainPower?.topicUniqId;
      if (mainUniqId && mainPower?.key) {
        sources.push({ uniqId: mainUniqId, key: mainPower.key });
      }

      //  FIX: Sekarang pduList sudah pasti array
      pduList.forEach((pdu) => {
        const pduUniqId = pdu.uniqId || pdu.topicUniqId;
        if (pduUniqId && Array.isArray(pdu.keys)) {
          pdu.keys.forEach((key: string) =>
            sources.push({ uniqId: pduUniqId, key }),
          );
        }
      });

      if (sources.length === 0) return;

      const sourceDevices = await prisma.deviceExternal.findMany({
        where: { uniqId: { in: sources.map((s) => s.uniqId) } },
      });

      sourceDevices.forEach((device) => {
        if (device.topic) topicsToSubscribe.add(device.topic);
      });

      allConfigs.push({
        ...config,
        type,
        sourceDevices: sources,
        publishTopic: config.apiTopic.topic,
      });
    };

    await Promise.all([
      ...pueConfigs.map((c) => processComplexConfig(c, "PUE")),
      ...powerAnalyzerConfigs.map((c) =>
        processComplexConfig(c, "PowerAnalyzer"),
      ),
    ]);

    this.configs = allConfigs;
    // Store subscribed topics for potential resubscription
    this.subscribedTopics = topicsToSubscribe;

    // Note: Actual subscription happens in subscribeToAllTopics() when connected

    // --- Part 2: Reload bill scheduler configs ---
    await this.reloadBillSchedulerConfigs();
    loggers.calculation.info("Calculation services reloaded");
  }

  private async handleMessage(
    topic: string,
    payloadStr: string,
    serverId?: string,
  ) {
    try {
      const parsedPayload = JSON.parse(payloadStr);
      const device = await prisma.deviceExternal.findUnique({
        where: { topic },
      });
      if (!device) {
        return;
      }
      const valueObject = JSON.parse(parsedPayload.value);
      for (const key in valueObject) {
        if (valueObject.hasOwnProperty(key)) {
          const value = parseFloat(
            String((valueObject as Record<string, any>)[key]),
          );
          if (!isNaN(value)) {
            this.lastValues.set(`${device.uniqId}:${key}`, {
              value,
              timestamp: new Date(),
            });
          }
        }
      }
      this.configs.forEach((config) => {
        if (config.sourceDevices.some((s) => s.uniqId === device.uniqId)) {
          this.triggerCalculation(config);
        }
      });
    } catch (error) {
      loggers.calculation.error(
        `Error processing MQTT message (topic: ${topic}, server: ${serverId})`,
        error,
      );
    }
  }
  private triggerCalculation(config: AnyConfig) {
    // Check if all required values are cached
    const allValuesReady = config.sourceDevices.every((s) =>
      this.lastValues.has(`${s.uniqId}:${s.key}`),
    );

    if (!allValuesReady) {
      return;
    }

    switch (config.type) {
      case "Bill":
        this.calculateAndPublishBill(config as any);
        break;
      case "PUE":
        this.calculateAndPublishPue(config as any);
        break;
      case "PowerAnalyzer":
        this.calculateAndPublishPowerAnalyzer(config as any);
        break;
    }
  }

  private async publish(
    topic: string,
    deviceName: string,
    valuePayload: object,
  ) {
    try {
      const mqttInterface = getMQTTServerClientInterface();
      const finalPayload = {
        device_name: deviceName,
        value: JSON.stringify(valuePayload),
        Timestamp: new Date().toISOString(),
      };
      if (!mqttInterface.connected) {
        loggers.calculation.error(`[PUBLISH SKIPPED] No broker connected for topic: ${topic}`);
        return;
      }
      await mqttInterface.publish(topic, JSON.stringify(finalPayload), {
        qos: 1,
        retained: true,
      });
      loggers.calculation.info(`Published calculation result: ${topic}`);
    } catch (error) {
      loggers.calculation.error(`Failed to publish to ${topic}:`, error);
    }
  }

  private calculateAndPublishBill(
    config: BillConfiguration & { publishTargetDevice: DeviceExternal },
  ) {
    const sourceValue =
      this.lastValues.get(
        `${config.sourceDeviceUniqId}:${config.sourceDeviceKey}`,
      )?.value ?? 0;

    // sourceValue may be current (A) from a PDU or actual energy (Wh) from an energy meter.
    // If the key ends with common energy suffixes (Wh, kWh), treat as energy directly.
    // Otherwise assume current (A): estimate power using nominal voltage (230V) and
    // convert to kWh over the publish interval (~5 min = 5/60 h).
    const isEnergyKey = /wh|kwh|energy/i.test(config.sourceDeviceKey);
    const NOMINAL_VOLTAGE = 230; // V — standard PLN supply voltage
    const INTERVAL_HOURS = 5 / 60; // 5-minute scheduler interval
    const energyInKwh = isEnergyKey
      ? sourceValue / 1000 // Wh → kWh
      : (NOMINAL_VOLTAGE * sourceValue * INTERVAL_HOURS) / 1000; // I(A) → kWh
    const rupiahCost = energyInKwh * (config.rupiahRatePerKwh ?? 1114.74);
    const dollarCost = energyInKwh * (config.dollarRatePerKwh ?? 0.069);
    const carbonEmission = energyInKwh * (config.carbonRateKgPerKwh ?? 0.87);

    const result = {
      rawValue: sourceValue,
      energyKwh: parseFloat(energyInKwh.toFixed(4)),
      rupiahCost: parseFloat(rupiahCost.toFixed(2)),
      dollarCost: parseFloat(dollarCost.toFixed(2)),
      carbonEmissionKg: parseFloat(carbonEmission.toFixed(4)),
    };
    this.publish(config.publishTargetDevice.topic, config.customName, result);
  }

  private calculateAndPublishPue(
    config: PueConfiguration & { apiTopic: DeviceExternal },
  ) {
    //  FIX: Parse JSON strings dengan safety
    let mainPowerConfig: any = null;
    let pduList: any[] = [];

    try {
      if (config.mainPower) {
        mainPowerConfig = JSON.parse(String(config.mainPower));
      }
      if (config.pduList) {
        pduList = JSON.parse(String(config.pduList));
        if (!Array.isArray(pduList)) pduList = [];
      }
    } catch (error) {
      loggers.calculation.error(
        `PUE parse error for ${config.customName}`,
        error,
      );
      return;
    }

    const mainUniqId = mainPowerConfig?.uniqId || mainPowerConfig?.topicUniqId;
    const mainPowerValue =
      this.lastValues.get(`${mainUniqId}:${mainPowerConfig?.key}`)?.value ?? 0;

    let itPower = 0;
    const itPowerDetails: { name: string; value: number | string }[] = [];
    pduList.forEach((pdu) => {
      const pduUniqId = pdu.uniqId || pdu.topicUniqId;
      const pduTotal = pdu.keys.reduce(
        (sum: number, key: string) =>
          sum + (this.lastValues.get(`${pduUniqId}:${key}`)?.value ?? 0),
        0,
      );
      itPower += pduTotal;
      const individualPue =
        mainPowerValue > 0 && pduTotal > 0 ? mainPowerValue / pduTotal : "N/A";
      itPowerDetails.push({
        name: pdu.name,
        value:
          individualPue !== "N/A"
            ? parseFloat(individualPue.toFixed(2))
            : "N/A",
      });
    });
    const pueValue = itPower > 0 ? mainPowerValue / itPower : 0;
    const result = {
      totalFacilityPower: mainPowerValue,
      totalItPower: itPower,
      pueValue: parseFloat(pueValue.toFixed(2)),
      itPowerDetails,
    };
    this.publish(config.apiTopic.topic, config.customName, result);
  }

  private calculateAndPublishPowerAnalyzer(
    config: PowerAnalyzerConfiguration & { apiTopic: DeviceExternal },
  ) {
    //  FIX: Parse JSON strings dengan safety
    let mainPowerConfig: any = null;
    let pduList: any[] = [];

    try {
      if (config.mainPower) {
        mainPowerConfig = JSON.parse(String(config.mainPower));
      }
      if (config.pduList) {
        pduList = JSON.parse(String(config.pduList));
        if (!Array.isArray(pduList)) pduList = [];
      }
    } catch (error) {
      loggers.calculation.error(
        `PowerAnalyzer parse error for ${config.customName}`,
        error,
      );
      return;
    }

    const mainUniqId = mainPowerConfig?.uniqId || mainPowerConfig?.topicUniqId;
    const mainPowerValue =
      this.lastValues.get(`${mainUniqId}:${mainPowerConfig?.key}`)?.value ?? 0;

    let itPower = 0;
    const itPowerDetails: { name: string; value: string }[] = [];
    pduList.forEach((pdu) => {
      const pduUniqId = pdu.uniqId || pdu.topicUniqId;
      const pduTotal = pdu.keys.reduce(
        (sum: number, key: string) =>
          sum + (this.lastValues.get(`${pduUniqId}:${key}`)?.value ?? 0),
        0,
      );
      itPower += pduTotal;
      const pduLoadPercentage =
        mainPowerValue > 0 ? (pduTotal / mainPowerValue) * 100 : 0;
      itPowerDetails.push({
        name: pdu.name,
        value: `${pduLoadPercentage.toFixed(2)}%`,
      });
    });
    const itLoadPercentage =
      mainPowerValue > 0 ? (itPower / mainPowerValue) * 100 : 0;
    const result = {
      totalFacilityPower: mainPowerValue,
      totalItPower: itPower,
      itLoadPercentage: parseFloat(itLoadPercentage.toFixed(2)),
      itPowerDetails,
    };
    this.publish(config.apiTopic.topic, config.customName, result);
  }
}

const calculationServiceInstance = new CalculationService();
let isCalcServiceStarted = false;

/**
 * Get singleton instance and auto-start
 */
export const getCalculationService = () => {
  if (!isCalcServiceStarted) {
    calculationServiceInstance.start();
    isCalcServiceStarted = true;
  }
  return calculationServiceInstance;
};

/**
 *  Get instance (for API access) - may return null if not initialized yet
 */
export const getCalculationServiceInstance = () => {
  return isCalcServiceStarted ? calculationServiceInstance : null;
};
