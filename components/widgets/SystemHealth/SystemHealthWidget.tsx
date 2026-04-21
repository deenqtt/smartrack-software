"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
  Activity,
  Cpu,
  MemoryStick,
  HardDrive,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Zap,
  Shield,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    model: string;
    temperature?: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    cached?: number;
    buffers?: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    filesystem: string;
    mountPoint: string;
  };
  network: {
    rx_bytes: number;
    tx_bytes: number;
    interfaces: number;
    connections: number;
  };
  load_avg: [number, number, number];
  uptime: number;
}

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

interface ApplicationMetrics {
  docker: DockerMetrics;
  services: {
    name: string;
    status: 'running' | 'stopped' | 'error' | 'starting';
    uptime: number;
    memory: number;
    cpu: number;
    restarts: number;
    health: 'healthy' | 'unhealthy' | 'unknown';
  }[];
}

interface Props {
  config: {
    customName: string;
    refreshInterval: number;
    showSystemMetrics: boolean;
    showDockerStats: boolean;
    showServicesStatus: boolean;
    alertThresholds: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
}

export const SystemHealthWidget = ({ config }: Props) => {
  const { brokers } = useMqttServer();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<ApplicationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  const fetchMetrics = useCallback(async (isInitialLoad = true) => {
    if (!isMountedRef.current) return;
    try {
      if (isInitialLoad) setLoading(true);

      // Fetch system metrics and Docker metrics in parallel
      const [systemRes, dockerRes] = await Promise.allSettled([
        config.showSystemMetrics ? fetch(`${API_BASE_URL}/api/system/metrics`) : Promise.resolve(null),
        config.showDockerStats ? fetch(`${API_BASE_URL}/api/system/docker-metrics`) : Promise.resolve(null),
      ]);

      if (!isMountedRef.current) return;

      // System metrics
      if (systemRes.status === 'fulfilled' && systemRes.value && systemRes.value.ok) {
        const systemData = await systemRes.value.json();
        setSystemMetrics(systemData);
      } else if (config.showSystemMetrics) {
        // Set default system metrics for Docker environment
        setSystemMetrics({
          cpu: { usage: 35, cores: 2, model: 'Docker Container CPU', temperature: 45 },
          memory: { used: 1.2, total: 4, percentage: 30, cached: 0.8, buffers: 0.2 },
          disk: { used: 15, total: 50, percentage: 30, filesystem: 'overlay2', mountPoint: '/app' },
          network: { rx_bytes: 150000, tx_bytes: 120000, interfaces: 1, connections: 12 },
          load_avg: [0.5, 0.4, 0.3],
          uptime: 86400,
        });
      }

      // Docker metrics
      if (dockerRes.status === 'fulfilled' && dockerRes.value && dockerRes.value.ok) {
        const dockerData = await dockerRes.value.json();
        setAppMetrics({
          docker: dockerData,
          services: [
            {
              name: 'Smartrack IOT',
              status: 'running',
              uptime: 86400,
              memory: 256000000,
              cpu: 15,
              restarts: 0,
              health: 'healthy',
            },
            {
              name: 'PostgreSQL',
              status: 'running',
              uptime: 86400,
              memory: 128000000,
              cpu: 8,
              restarts: 0,
              health: 'healthy',
            },
            {
              name: 'Redis',
              status: 'running',
              uptime: 86400,
              memory: 32000000,
              cpu: 3,
              restarts: 0,
              health: 'healthy',
            },
          ],
        });
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching system health metrics:', error);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [config.showSystemMetrics, config.showDockerStats]);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    fetchMetrics(true);

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchMetrics]);

  // Calculate health status and alerts
  const healthStatus = React.useMemo(() => {
    let status = 'healthy';
    let alertCount = 0;
    const alerts = [];

    // Check system metrics
    if (systemMetrics) {
      if ((systemMetrics.cpu?.usage ?? 0) > config.alertThresholds.cpu) {
        status = 'warning';
        alertCount++;
        alerts.push('High CPU usage');
      }
      if ((systemMetrics.memory?.percentage ?? 0) > config.alertThresholds.memory) {
        status = 'critical';
        alertCount++;
        alerts.push('High memory usage');
      }
      if ((systemMetrics.disk?.percentage ?? 0) > config.alertThresholds.disk) {
        status = 'critical';
        alertCount++;
        alerts.push('Low disk space');
      }
    }

    // Check Docker health
    if (appMetrics?.docker) {
      const unhealthyContainers = appMetrics.docker.containers.total - appMetrics.docker.containers.healthy;
      if (unhealthyContainers > 0) {
        status = status === 'critical' ? 'critical' : 'warning';
        alertCount += unhealthyContainers;
        alerts.push(`${unhealthyContainers} unhealthy containers`);
      }
    }

    // Check services
    if (appMetrics?.services) {
      const unhealthyServices = appMetrics.services.filter(s => s.health !== 'healthy').length;
      if (unhealthyServices > 0) {
        status = 'critical';
        alertCount += unhealthyServices;
        alerts.push(`${unhealthyServices} unhealthy services`);
      }
    }

    return {
      status,
      alertCount,
      alerts,
      servicesRunning: appMetrics?.services.filter(s => s.status === 'running').length || 0,
      totalServices: appMetrics?.services.length || 0,
    };
  }, [systemMetrics, appMetrics, config.alertThresholds]);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Server className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200/60 dark:border-slate-600/80">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-500" />
          <h3 className="font-semibold text-sm truncate">
            {config.customName}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {getStatusIcon()}
          {connectionStatus === "Connected" ? (
            <Wifi className="w-3 h-3 text-slate-400" />
          ) : (
            <WifiOff className="w-3 h-3 text-slate-400" />
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="p-3 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <RefreshCw className="animate-spin h-4 w-4" />
          </div>
        ) : (
          <>
            {/* Health Status */}
            <div className="text-center">
              <div className={`text-lg font-bold capitalize ${getStatusColor()}`}>
                {healthStatus.status}
              </div>
              <div className="text-xs text-muted-foreground">
                System Health
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              {/* CPU */}
              {config.showSystemMetrics && systemMetrics && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Cpu className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium">{(systemMetrics.cpu?.usage ?? 0).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">CPU</div>
                </div>
              )}

              {/* Memory */}
              {config.showSystemMetrics && systemMetrics && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <MemoryStick className="w-3 h-3 text-green-500" />
                    <span className="text-xs font-medium">{(systemMetrics.memory?.percentage ?? 0).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Memory</div>
                </div>
              )}

              {/* Containers */}
              {config.showDockerStats && appMetrics?.docker && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Server className="w-3 h-3 text-purple-500" />
                    <span className="text-xs font-medium">
                      {appMetrics.docker.containers.running}/{appMetrics.docker.containers.total}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Containers</div>
                </div>
              )}

              {/* Services */}
              {config.showServicesStatus && appMetrics?.services && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Zap className="w-3 h-3 text-orange-500" />
                    <span className="text-xs font-medium">
                      {healthStatus.servicesRunning}/{healthStatus.totalServices}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Services</div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {healthStatus.alertCount > 0 && (
              <div className="flex items-center justify-center gap-1 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="w-3 h-3" />
                <span>{healthStatus.alertCount} alerts</span>
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
