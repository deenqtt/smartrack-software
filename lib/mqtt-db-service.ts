import { prisma } from '@/lib/prisma';
import { MqttConfig } from '@/types/mqtt';

// Convert BigInt fields to Number for JSON serialization
function serializeConfig(config: any): MqttConfig {
  return {
    ...config,
    messageCount: Number(config.messageCount ?? 0),
    bytesSent: Number(config.bytesSent ?? 0),
    bytesReceived: Number(config.bytesReceived ?? 0),
  };
}

function serializeConfigs(configs: any[]): MqttConfig[] {
  return configs.map(serializeConfig);
}

// Get all active MQTT configurations
export async function getActiveMqttConfigs(): Promise<MqttConfig[]> {
  return [{
    id: "mock-config-1",
    name: "Mock Broker (Demo)",
    description: "Mock broker for portfolio demonstration",
    brokerHost: "localhost",
    brokerPort: 9000,
    protocol: "WEBSOCKET",
    useSSL: false,
    useAuthentication: false,
    isActive: true,
    messageCount: 0,
    bytesSent: 0,
    bytesReceived: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  } as MqttConfig];
}

// Get all MQTT configurations (for management UI)
export async function getAllMqttConfigs(): Promise<MqttConfig[]> {
  return await getActiveMqttConfigs();
}

// Get MQTT configuration by ID
export async function getMqttConfigById(id: string): Promise<MqttConfig | null> {
  const configs = await getActiveMqttConfigs();
  return configs[0];
}

// Create new MQTT configuration
export async function createMqttConfig(data: any): Promise<MqttConfig> {
  return (await getActiveMqttConfigs())[0];
}

// Update MQTT configuration
export async function updateMqttConfig(id: string, data: Partial<MqttConfig>): Promise<MqttConfig> {
  return (await getActiveMqttConfigs())[0];
}

// Delete MQTT configuration
export async function deleteMqttConfig(id: string): Promise<void> {
  return;
}

// Update connection status
export async function updateConnectionStatus(
  id: string,
  status: string,
  error?: string
): Promise<void> {
  return;
}

// Increment message count and bytes
export async function incrementMessageStats(
  id: string,
  messageCount: number = 1,
  bytesSent: number = 0,
  bytesReceived: number = 0
): Promise<void> {
  return;
}

// Validate MQTT configuration
export function validateMqttConfig(config: Partial<MqttConfig>): { isValid: boolean; errors: string[] } {
  return { isValid: true, errors: [] };
}

// Create connection history entry
export async function createConnectionHistory(
  configId: string,
  eventType: string,
  details?: string | null,
  errorMessage?: string | null,
  duration?: number | null
): Promise<void> {
  return;
}

// Log MQTT message
export async function logMqttMessage(
  configId: string,
  topic: string,
  payload: string,
  qos: number,
  retained: boolean,
  direction: 'INBOUND' | 'OUTBOUND'
): Promise<void> {
  return;
}

// Activate a specific MQTT broker (deactivates all others)
export async function activateMqttBroker(brokerId: string): Promise<MqttConfig> {
  return (await getActiveMqttConfigs())[0];
}

// Deactivate a specific MQTT broker
export async function deactivateMqttBroker(brokerId: string): Promise<MqttConfig> {
  return (await getActiveMqttConfigs())[0];
}

// Get the currently active broker (should only be one)
export async function getCurrentActiveBroker(): Promise<MqttConfig | null> {
  const configs = await getActiveMqttConfigs();
  return configs[0];
}

