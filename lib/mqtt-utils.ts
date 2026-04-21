import { MqttConfig } from "@/types/mqtt";

// Helper function to generate WebSocket URL from config
export function generateWebSocketUrl(config: MqttConfig): string {
    const protocol = config.useSSL ? 'wss://' : 'ws://';
    return `${protocol}${config.brokerHost}:${config.brokerPort}`;
}

// Helper function to get protocol for Paho MQTT
export function getPahoProtocol(config: MqttConfig): string {
    switch (config.protocol) {
        case 'WEBSOCKET':
            return config.useSSL ? 'wss' : 'ws';
        case 'SECURE_WEBSOCKET':
            return 'wss';
        case 'TCP':
            return config.useSSL ? 'ssl' : 'tcp';
        case 'SECURE_TCP':
            return 'ssl';
        default:
            return 'ws';
    }
}

// Get connection options for Paho MQTT client
export function getPahoConnectionOptions(config: MqttConfig) {
    // NOTE: Paho MQTT expects 'timeout' in SECONDS, but DB stores connectTimeout in MILLISECONDS.
    // Divide by 1000 to convert. Fallback to 10 seconds if value is invalid.
    const timeoutSeconds = config.connectTimeout > 0
        ? Math.round(config.connectTimeout / 1000)
        : 10;

    const options: any = {
        cleanSession: config.cleanSession,
        timeout: timeoutSeconds,
        keepAliveInterval: config.keepAlive ?? 60,
        reconnect: true,
    };

    if (config.useAuthentication && config.username && config.password) {
        options.userName = config.username; // Paho uses userName
        options.password = config.password;
    }

    if (config.willTopic && config.willMessage) {
        options.willMessage = {
            topic: config.willTopic,
            payload: config.willMessage,
            qos: config.willQos,
            retained: config.willRetain
        };
    }

    return options;
}

// Generate client ID for Paho MQTT client
export function generateMqttClientId(config: MqttConfig): string {
    return config.clientId || `web-mqtt-${config.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
