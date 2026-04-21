"use client";

import { useState, useEffect, useCallback } from 'react';

export interface MqttServerStatus {
  id: string;
  name: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  brokerUrl: string;
  isActive: boolean;
  lastConnected: Date | null;
  lastError: string | null;
  messageCount: number;
  bytesSent: number;
  bytesReceived: number;
}

export function useMqttServerStatus() {
  const [servers, setServers] = useState<MqttServerStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Map database status to UI status
  const mapStatus = (dbStatus: string): MqttServerStatus['status'] => {
    switch (dbStatus) {
      case 'CONNECTED':
        return 'connected';
      case 'CONNECTING':
        return 'connecting';
      case 'DISCONNECTED':
      case 'RECONNECTING':
        return 'disconnected';
      case 'ERROR':
      case 'BROKER_UNAVAILABLE':
        return 'error';
      default:
        return 'disconnected';
    }
  };

  // Fetch server statuses from API
  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch only active MQTT configurations
      const response = await fetch('/api/mqtt-config?active=true');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch configurations');
      }

      const serverStatuses: MqttServerStatus[] = result.data.map((config: any) => ({
        id: config.id,
        name: config.name,
        status: mapStatus(config.connectionStatus),
        brokerUrl: `ws${config.useSSL ? 's' : ''}://${config.brokerHost}:${config.brokerPort}`,
        isActive: config.isActive || false,
        lastConnected: config.lastConnectedAt,
        lastError: config.connectionError,
        messageCount: config.messageCount,
        bytesSent: config.bytesSent,
        bytesReceived: config.bytesReceived
      }));

      setServers(serverStatuses);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch server statuses';
      setError(errorMessage);
      console.error('Error fetching MQTT server statuses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh statuses
  const refresh = useCallback(async () => {
    await fetchStatuses();
  }, [fetchStatuses]);

  // Get status for specific server
  const getServerStatus = useCallback((serverId: string): MqttServerStatus | null => {
    return servers.find(server => server.id === serverId) || null;
  }, [servers]);

  // Get servers by status
  const getServersByStatus = useCallback((status: MqttServerStatus['status']): MqttServerStatus[] => {
    return servers.filter(server => server.status === status);
  }, [servers]);

  // Get summary statistics
  const getSummary = useCallback(() => {
    const connected = servers.filter(s => s.status === 'connected').length;
    const connecting = servers.filter(s => s.status === 'connecting').length;
    const disconnected = servers.filter(s => s.status === 'disconnected').length;
    const errors = servers.filter(s => s.status === 'error').length;

    return {
      total: servers.length,
      connected,
      connecting,
      disconnected,
      errors,
      healthy: connected,
      unhealthy: connecting + disconnected + errors
    };
  }, [servers]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchStatuses();

    const interval = setInterval(fetchStatuses, 30000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  return {
    servers,
    loading,
    error,
    lastUpdate,
    refresh,
    getServerStatus,
    getServersByStatus,
    getSummary
  };
}

// Hook for individual server status
export function useMqttServerStatusById(serverId: string) {
  const { servers, loading, error, refresh, getServerStatus } = useMqttServerStatus();

  const server = getServerStatus(serverId);

  return {
    server,
    loading,
    error,
    refresh,
    isConnected: server?.status === 'connected',
    isConnecting: server?.status === 'connecting',
    hasError: server?.status === 'error'
  };
}
