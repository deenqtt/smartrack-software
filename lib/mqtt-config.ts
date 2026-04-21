// MQTT Configuration - Simplified WebSocket only version

// Get MQTT broker WebSocket URL
export function getMQTTBrokerUrl(): string {
  let host: string;
  let port: string;
  let useSSL: boolean;

  if (process.env.NODE_ENV === 'production') {
    // In production, prefer the current browser hostname so deployed devices
    // automatically use their accessible IP/domain without rebuilding.
    host =
      typeof window !== 'undefined'
        ? window.location.hostname
        : process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
    port = process.env.NEXT_PUBLIC_MQTT_PORT || '9000';
    // Use WSS for HTTPS sites, WS for HTTP sites
    useSSL = typeof window !== 'undefined' ? window.location.protocol === 'https:' : true;
  } else {
    // In development, use localhost
    host = process.env.NEXT_PUBLIC_MQTT_HOST || 'localhost';
    port = process.env.NEXT_PUBLIC_MQTT_PORT || '9000';
    useSSL = process.env.NEXT_PUBLIC_MQTT_SSL === 'true';
  }

  const protocol = useSSL ? 'wss://' : 'ws://';
  const url = `${protocol}${host}:${port}`;

  console.log('MQTT Broker URL:', url); // Debug log
  return url;
}

// Get MQTT authentication credentials
export function getMQTTUsername(): string | undefined {
  return process.env.NEXT_PUBLIC_MQTT_USERNAME || process.env.MQTT_USERNAME;
}

export function getMQTTPassword(): string | undefined {
  return process.env.NEXT_PUBLIC_MQTT_PASSWORD || process.env.MQTT_PASSWORD;
}

// Legacy compatibility functions
export function getMQTTConfig(): string {
  return getMQTTBrokerUrl();
}

export function getEnvMQTTBrokerUrl(): string {
  return getMQTTBrokerUrl();
}

// Async versions for backward compatibility
export async function getMQTTWebSocketUrlAsync(): Promise<string> {
  return getMQTTBrokerUrl();
}
