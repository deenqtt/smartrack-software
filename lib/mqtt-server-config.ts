import { getActiveMqttConfigs } from './mqtt-db-service';
import { MqttConfig, MqttServerConfig } from '@/types/mqtt';
export type { MqttServerConfig };
import { generateWebSocketUrl, getPahoProtocol } from './mqtt-utils';

// Global server configurations cache
let serverConfigsCache: MqttServerConfig[] = [];
let lastCacheUpdate = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Get all active server configurations
export async function getActiveServerConfigs(forceRefresh = false): Promise<MqttServerConfig[]> {
  const now = Date.now();

  // Return cached configs if still valid and not forcing refresh
  if (!forceRefresh && serverConfigsCache.length > 0 && (now - lastCacheUpdate) < CACHE_DURATION) {
    return serverConfigsCache;
  }

  try {
    const activeConfigs = await getActiveMqttConfigs();

    serverConfigsCache = activeConfigs.map(config => ({
      id: config.id,
      name: config.name,
      brokerUrl: generateWebSocketUrl(config),
      pahoProtocol: getPahoProtocol(config),
      config
    }));

    lastCacheUpdate = now;
    return serverConfigsCache;
  } catch (error) {
    console.error('Error fetching active server configs:', error);
    // Return cached configs as fallback
    return serverConfigsCache;
  }
}

// Get server configuration by ID
export async function getServerConfigById(id: string, forceRefresh = false): Promise<MqttServerConfig | null> {
  const configs = await getActiveServerConfigs(forceRefresh);
  return configs.find(config => config.id === id) || null;
}

// Get server configurations by name
export async function getServerConfigByName(name: string, forceRefresh = false): Promise<MqttServerConfig | null> {
  const configs = await getActiveServerConfigs(forceRefresh);
  return configs.find(config => config.name === name) || null;
}

// Refresh server configurations cache
export async function refreshServerConfigs(): Promise<MqttServerConfig[]> {
  return getActiveServerConfigs(true);
}

// Connection helper functions moved to @/lib/mqtt-utils.ts

// generateMqttClientId moved to @/lib/mqtt-utils.ts

// Validate server configuration
export function validateServerConfig(config: MqttServerConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.id?.trim()) {
    errors.push('Configuration ID is required');
  }

  if (!config.name?.trim()) {
    errors.push('Configuration name is required');
  }

  if (!config.brokerUrl?.trim()) {
    errors.push('Broker URL is required');
  }

  if (!config.pahoProtocol?.trim()) {
    errors.push('Protocol is required');
  }

  // Validate URL format
  try {
    new URL(config.brokerUrl);
  } catch {
    errors.push('Invalid broker URL format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Get server status summary
export async function getServerStatusSummary(): Promise<{
  totalServers: number;
  activeServers: number;
  inactiveServers: number;
  servers: Array<{
    id: string;
    name: string;
    status: string;
    lastConnected?: Date | null;
    lastError?: string | null;
  }>
}> {
  const configs = await getActiveServerConfigs();

  const servers = configs.map(server => ({
    id: server.id,
    name: server.name,
    status: server.config.connectionStatus,
    lastConnected: server.config.lastConnectedAt || null,
    lastError: server.config.connectionError || null
  }));

  const activeServers = servers.filter(s => s.status === 'CONNECTED').length;
  const inactiveServers = servers.length - activeServers;

  return {
    totalServers: servers.length,
    activeServers,
    inactiveServers,
    servers
  };
}

// Clear server configurations cache
export function clearServerConfigCache(): void {
  serverConfigsCache = [];
  lastCacheUpdate = 0;
}
