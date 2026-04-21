import { EventEmitter } from "events";
import { loggers } from "../logger";

/**
 * ServiceEvents defines the global events available for inter-service communication
 */
export enum ServiceEvents {
  CONFIG_UPDATED = "config:updated",
  ALARM_TRIGGERED = "alarm:triggered",
  SERVICE_RELOAD = "service:reload",
}

/**
 * ServiceManager - Centralized manager for service lifecycles and event emission.
 * Used to replace inefficient polling mechanisms with event-driven architecture.
 */
class ServiceManager extends EventEmitter {
  private static instance: ServiceManager;
  private services: Map<string, any> = new Map();

  private constructor() {
    super();
    // Increase limit for global event listeners
    this.setMaxListeners(50);
    loggers.service.info("[ServiceManager] Initialized");
  }

  public static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  /**
   * Register a service for lifecycle management
   */
  public registerService(name: string, service: any) {
    this.services.set(name, service);
    loggers.service.debug(`[ServiceManager] Service registered: ${name}`);
  }

  /**
   * Get a registered service
   */
  public getService<T>(name: string): T | undefined {
    return this.services.get(name) as T;
  }

  /**
   * Emit a configuration update event
   * @param type The type of configuration updated (e.g., 'ALARM', 'CALCULATION', 'DEVICE')
   * @param data Optional payload
   */
  public notifyConfigUpdate(type: string, data?: any) {
    loggers.service.info(`[ServiceManager] Config updated: ${type}`);
    this.emit(ServiceEvents.CONFIG_UPDATED, { type, data });
  }

  /**
   * Shutdown all registered services if they have a shutdown method
   */
  public async shutdownAll() {
    loggers.service.info("[ServiceManager] Shutting down all services...");
    for (const [name, service] of this.services.entries()) {
      if (typeof service.shutdown === "function") {
        try {
          await service.shutdown();
          loggers.service.debug(`[ServiceManager] Service shutdown: ${name}`);
        } catch (error) {
          loggers.service.error(
            `[ServiceManager] Error shutting down service ${name}:`,
            error,
          );
        }
      }
    }
    this.services.clear();
  }
}

// Use globalThis to preserve the singleton across Next.js hot module replacements
// Without this, each module re-evaluation creates a new instance, breaking event subscriptions
const globalForServiceManager = globalThis as unknown as {
  _serviceManager: ServiceManager | undefined;
};

export const serviceManager =
  globalForServiceManager._serviceManager ??
  (globalForServiceManager._serviceManager = ServiceManager.getInstance());
