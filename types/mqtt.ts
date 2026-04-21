// types/mqtt.ts

export interface MqttConfig {
    id: string;
    name: string;
    description?: string;
    brokerHost: string;
    brokerPort: number;
    protocol: 'TCP' | 'WEBSOCKET' | 'SECURE_TCP' | 'SECURE_WEBSOCKET';
    useSSL: boolean;
    clientId?: string;
    username?: string;
    password?: string;
    useAuthentication: boolean;
    keepAlive: number;
    connectTimeout: number;
    reconnectPeriod: number;
    cleanSession: boolean;
    maxReconnectAttempts: number;
    defaultQos: number;
    retainMessages: boolean;
    willTopic?: string;
    willMessage?: string;
    willQos: number;
    willRetain: boolean;
    isActive: boolean;
    connectionStatus: string;
    lastConnectedAt?: Date;
    lastDisconnectedAt?: Date;
    connectionError?: string;
    messageCount: number;
    bytesSent: number;
    bytesReceived: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string;
    updatedBy?: string;
}

export interface MqttServerConfig {
    id: string;
    name: string;
    brokerUrl: string;
    pahoProtocol: string;
    config: MqttConfig;
}
