"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
  Container,
  Play,
  Square,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Box,
  Server,
  Wifi,
  WifiOff,
  Activity,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DockerMetrics {
  containers: {
    total: number;
    running: number;
    stopped: number;
    paused: number;
    healthy: number;
    unhealthy: number;
  };
  images: {
    total: number;
    dangling: number;
    size: number;
  };
  volumes: {
    total: number;
    used: number;
  };
  networks: {
    total: number;
    active: number;
  };
}

interface Props {
  config: {
    customName: string;
    refreshInterval: number;
    showContainerDetails: boolean;
    showImageStats: boolean;
    showVolumeStats: boolean;
    compactView: boolean;
  };
}

export const DockerStatusWidget = ({ config }: Props) => {
  const { brokers } = useMqttServer();
  const [dockerMetrics, setDockerMetrics] = useState<DockerMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  const fetchDockerMetrics = useCallback(async (isInitialLoad = true) => {
    if (!isMountedRef.current) return;
    try {
      if (isInitialLoad) setLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/system/docker-metrics`);
      if (!isMountedRef.current) return;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDockerMetrics(data);
      setLastUpdate(new Date());
    } catch (error) {
      if (!isMountedRef.current) return;
      console.error('Error fetching Docker metrics:', error);
      // Set default Docker metrics
      setDockerMetrics({
        containers: {
          total: 0,
          running: 0,
          stopped: 0,
          paused: 0,
          healthy: 0,
          unhealthy: 0
        },
        images: {
          total: 0,
          dangling: 0,
          size: 0
        },
        volumes: {
          total: 0,
          used: 0
        },
        networks: {
          total: 0,
          active: 0
        },
      });
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchDockerMetrics(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchDockerMetrics]);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getContainerHealthStatus = () => {
    if (!dockerMetrics) return { status: 'unknown', color: 'text-gray-500' };

    const { containers } = dockerMetrics;
    const total = containers.total;
    const running = containers.running;
    const healthy = containers.healthy;
    const unhealthy = containers.unhealthy;

    if (total === 0) return { status: 'no-containers', color: 'text-gray-500' };
    if (running === total && healthy === total) return { status: 'healthy', color: 'text-green-600' };
    if (running > 0 && unhealthy === 0) return { status: 'warning', color: 'text-yellow-600' };
    if (unhealthy > 0) return { status: 'critical', color: 'text-red-600' };
    return { status: 'stopped', color: 'text-gray-600' };
  };

  const healthStatus = getContainerHealthStatus();

  const getHealthIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'no-containers':
        return <Container className="w-5 h-5 text-gray-500" />;
      default:
        return <Square className="w-5 h-5 text-gray-500" />;
    }
  };

  if (config.compactView) {
    // Compact View - 2x2 widget
    return (
      <div className="w-full h-full relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-600/80">
          <div className="flex items-center gap-2">
            <Container className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm truncate">
              {config.customName}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {getHealthIcon()}
            {connectionStatus === "Connected" ? (
              <Wifi className="w-3 h-3 text-slate-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-slate-400" />
            )}
          </div>
        </div>

        {/* Main Content - Compact */}
        <div className="p-3 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-16">
              <RefreshCw className="animate-spin h-4 w-4" />
            </div>
          ) : (
            <>
              {/* Container Status */}
              <div className="text-center">
                <div className="text-xl font-bold">
                  {dockerMetrics?.containers.running || 0}/{dockerMetrics?.containers.total || 0}
                </div>
                <div className="text-xs text-muted-foreground">Running Containers</div>
              </div>

              {/* Health Status */}
              <div className="text-center">
                <div className={`text-sm font-medium capitalize ${healthStatus.color}`}>
                  {healthStatus.status.replace('-', ' ')}
                </div>
                <div className="text-xs text-muted-foreground">Health Status</div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-sm font-medium text-green-600">
                    {dockerMetrics?.containers.healthy || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Healthy</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-red-600">
                    {dockerMetrics?.containers.unhealthy || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Unhealthy</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Detailed View - 2x2 widget with more info
  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-600/80">
        <div className="flex items-center gap-2">
          <Container className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm truncate">
            {config.customName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {getHealthIcon()}
          {connectionStatus === "Connected" ? (
            <Wifi className="w-3 h-3 text-slate-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>

      {/* Main Content - Detailed */}
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="animate-spin h-4 w-4" />
          </div>
        ) : (
          <>
            {/* Container Overview */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Play className="w-3 h-3 text-green-500" />
                  <span className="text-sm font-medium">{dockerMetrics?.containers.running || 0}</span>
                </div>
                <div className="text-xs text-muted-foreground">Running</div>
              </div>

              <div className="text-center p-2 bg-slate-50 dark:bg-slate-800 rounded">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Square className="w-3 h-3 text-gray-500" />
                  <span className="text-sm font-medium">{dockerMetrics?.containers.stopped || 0}</span>
                </div>
                <div className="text-xs text-muted-foreground">Stopped</div>
              </div>
            </div>

            {/* Health Status */}
            <div className="text-center">
              <div className={`text-sm font-medium capitalize ${healthStatus.color}`}>
                {healthStatus.status.replace('-', ' ')}
              </div>
              <div className="text-xs text-muted-foreground">Overall Health</div>
            </div>

            {/* Additional Stats */}
            {config.showImageStats && (
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <div className="text-sm font-medium">{dockerMetrics?.images.total || 0}</div>
                  <div className="text-xs text-muted-foreground">Images</div>
                </div>
                <div>
                  <div className="text-sm font-medium">{dockerMetrics?.volumes.used || 0}</div>
                  <div className="text-xs text-muted-foreground">Volumes</div>
                </div>
              </div>
            )}

            {/* Last Update */}
            {lastUpdate && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">
                  Updated: {lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
