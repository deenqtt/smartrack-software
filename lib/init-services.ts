// File: lib/init-services.ts
import { getAlarmService } from "./services/alarm-service";
import { backupService } from "./services/backup-management-service";
import { getCalculationService } from "./services/calculation-service";
import { getExternalDeviceListenerService } from "./services/external-device-listener";
import { getDoorLockMqttListenerService } from "./services/door-lock-mqtt-listener";

// Import Logging Scheduler
import { getLoggingSchedulerService } from "./services/logging-scheduler";



// Import System Stability Module
import { processMonitor, mqttGlobalListener } from "./system-stability";
// Import Rule Chain Services
import { ruleChainMqttListener } from "./rule-chain/mqtt-listener";
import { ruleChainAutoRunner } from "./rule-chain-auto-runner";

// Service Configuration Interface
export interface ServiceConfig {
  // Monitoring & Alert Services
  alarmMonitor: boolean;

  // Communication Services
  externalDeviceListener: boolean;
  doorLockListener: boolean;

  // Data Processing
  calculation: boolean;

  // Scheduling Services
  loggingScheduler: boolean;
}

// DEFAULT SERVICE CONFIGURATION - MEMORY OPTIMIZED SETTINGS
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  // ===================================================================
  // MISSION-CRITICAL SERVICES - ENABLED BY DEFAULT (PRODUCTION ESSENTIALS)
  // ===================================================================
  alarmMonitor: true,

  externalDeviceListener: true,
  doorLockListener: true,

  loggingScheduler: true,

  // ===================================================================
  // DATA PROCESSING SERVICES
  // ===================================================================
  calculation: true, // ENABLED: Required for Bill, PUE, and Power Analyzer processing
};

import { loggers } from "./logger";
import { prisma } from "./prisma";

const SERVICE_CONFIG_KEY = "service_config";

// Load configuration from the database
async function loadServiceConfig(): Promise<ServiceConfig> {
  try {
    const dbConfig = await prisma.systemConfiguration.findUnique({
      where: { key: SERVICE_CONFIG_KEY },
    });

    if (dbConfig && dbConfig.value) {
      loggers.service.info("Loaded configuration from database");
      const parsedConfig = JSON.parse(dbConfig.value);
      // Merge with default to ensure all keys are present
      return { ...DEFAULT_SERVICE_CONFIG, ...parsedConfig };
    }
  } catch (error) {
    loggers.service.error(
      "Failed to load service configuration from DB, using default.",
      error,
    );
  }

  loggers.service.info("Using default configuration");
  return { ...DEFAULT_SERVICE_CONFIG };
}

let servicesInitialized = false;
let currentConfig: ServiceConfig | null = null;

export async function initializeBackgroundServices(
  customConfig?: Partial<ServiceConfig>,
) {
  if (servicesInitialized) {
    loggers.service.warn("Background services already initialized");
    return;
  }

  // Load configuration and start initialization (silent)
  const config = customConfig
    ? { ...DEFAULT_SERVICE_CONFIG, ...customConfig }
    : DEFAULT_SERVICE_CONFIG;
  currentConfig = config;

  // FAST DEV MODE OPTIMIZATION
  if (
    process.env.NEXT_PUBLIC_DEV_MODE === "fast" &&
    process.env.NODE_ENV === "development"
  ) {
    loggers.service.info(
      "Starting services in FAST DEV mode",
    );

    // For fast dev, we only enable the absolute essentials
    const fastConfig: ServiceConfig = {
      ...config,
      alarmMonitor: true,
      loggingScheduler: true,
      externalDeviceListener: true,
      doorLockListener: true,
      // Keep calculation enabled so Power Analyzer, PUE, and Bill processing work in dev
      calculation: true,
    };

    await startServiceInitialization(fastConfig);
    return;
  }

  // Start the actual service initialization
  await startServiceInitialization(config);
}

async function startServiceInitialization(config: ServiceConfig) {
  // Initialize services dengan staggered timing untuk menghindari database connection pool exhaustion (silent startup)

  // Start ALL services at once (extremely fast)
  const startPromises = [];
  const serviceStatus: Record<string, boolean> = {
    alarmMonitor: false,
    externalDeviceListener: false,
    doorLockListener: false,
    backupService: false,
    loggingScheduler: false,
  };

  // Core synchronous services (silent initialization - only log failures)
  const coreServices = [];

  // Initialize core services silently
  for (const svc of coreServices) {
    if (svc.enabled) {
      startPromises.push(
        Promise.resolve(svc.service())
          .then(() => {
            serviceStatus[svc.key] = true;
          })
          .catch((err) =>
            loggers.service.error(
              `${svc.name} failed:`,
              (err as Error).message,
            ),
          ),
      );
    }
  }

  // Alarm Monitor (synchronous)
  if (config.alarmMonitor) {
    try {
      getAlarmService(); // This starts the service synchronously
      serviceStatus.alarmMonitor = true;
    } catch (err) {
      loggers.service.error("Alarm Monitor failed:", (err as Error).message);
      serviceStatus.alarmMonitor = false;
    }
  }

  if (config.externalDeviceListener) {
    startPromises.push(
      Promise.resolve(getExternalDeviceListenerService())
        .then(() => {
          serviceStatus.externalDeviceListener = true;
        })
        .catch((err) =>
          loggers.service.error("External Device Listener failed:", err),
        ),
    );
  }

  if (config.doorLockListener) {
    startPromises.push(
      Promise.resolve(getDoorLockMqttListenerService())
        .then(() => {
          serviceStatus.doorLockListener = true;
        })
        .catch((err) =>
          loggers.service.error("Door Lock MQTT Listener failed:", err),
        ),
    );
  }

  // Initialize backup management service (includes scheduler)
  try {
    startPromises.push(
      Promise.resolve(backupService.initialize())
        .then(() => {
          serviceStatus.backupService = true;
        })
        .catch((err) => {
          loggers.service.info(
            "Backup service skipped:",
            (err as Error).message,
          );
          serviceStatus.backupService = false;
        }),
    );
  } catch (error) {
    loggers.service.info(
      "Backup service skipped:",
      (error as Error).message,
    );
    serviceStatus.backupService = false;
  }

  // Wait for all core services to be initialized
  await Promise.all(startPromises);
  // Phase 4: Rule Chain Services (500ms delay)
  setTimeout(() => {
    loggers.service.info("Initializing Rule Chain services...");
    try {
      ruleChainMqttListener.start();
      ruleChainAutoRunner.start();
      loggers.service.info("Rule Chain services started");
    } catch (err) {
      loggers.service.error("Rule Chain services failed to start:", err);
    }
  }, 500);
  // Phase 5: Scheduling Services (1200ms delay - most critical for DB connections) - Silent
  setTimeout(() => {
    if (config.loggingScheduler) {
      // getLoggingSchedulerService() already auto-initializes on first call.
      // Do NOT call scheduler.initialize() explicitly to avoid double init
      // which causes duplicate event listeners and duplicate timers.
      setTimeout(() => {
        try {
          getLoggingSchedulerService();
          serviceStatus.loggingScheduler = true;
        } catch (err) {
          loggers.service.error("Logging Scheduler failed:", err);
          serviceStatus.loggingScheduler = false;
        }
      }, 200);
    }

    // Initialize MQTT Global Listener after scheduler
    setTimeout(async () => {
      try {
        await mqttGlobalListener.initialize();

        // Test global listener status
        setTimeout(() => {
          try {
            const status = mqttGlobalListener.getStatus();
          } catch (testError) {
            loggers.service.debug(
              "MQTT Global Listener status check failed:",
              testError,
            );
          }
        }, 3000);
      } catch (err) {
        loggers.service.error("MQTT Global Listener failed:", err);
      }
    }, 500);

    if (config.calculation) {
      setTimeout(() => {
        try {
          getCalculationService();
        } catch (err) {
          loggers.service.error("Calculation Service failed:", err);
        }
      }, 400);
    }
  }, 1200);

  // Phase 6: Critical Heavy DB Services - 2500ms delay with longer intervals
  setTimeout(() => {
    servicesInitialized = true;

    // Start process monitoring
    processMonitor.startMonitoring();
    loggers.service.info("Initialization complete");
  }, 2500);

  // Services will be marked as initialized by staggered initialization process
}

// Fungsi untuk mendapatkan konfigurasi service saat ini
export function getCurrentServiceConfig(): ServiceConfig | null {
  return currentConfig;
}

// Fungsi untuk restart services dengan konfigurasi baru
export async function restartServicesWithConfig(
  newConfig: Partial<ServiceConfig>,
) {
  // Reset initialization flag
  servicesInitialized = false;

  // Shutdown existing services jika perlu
  // (implementasi shutdown tergantung pada service masing-masing)

  // Re-initialize dengan konfigurasi baru
  await initializeBackgroundServices(newConfig);
}
