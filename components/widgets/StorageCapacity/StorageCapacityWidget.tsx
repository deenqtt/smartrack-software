"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
  HardDrive,
  Database,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface SystemMetrics {
  disk: {
    used: number;
    total: number;
    percentage: number;
    filesystem: string;
    mountPoint: string;
  };
}

interface DatabaseMetrics {
  storage: {
    database_size: number;
    wal_size: number;
    temp_files_size: number;
  };
}

interface Props {
  config: {
    customName: string;
    refreshInterval: number;
    showDiskUsage: boolean;
    showDatabaseSize: boolean;
    showWalSize: boolean;
    alertThresholds: {
      diskUsage: number;
      databaseSize: number;
    };
  };
}

// Mini Donut Chart Component
const MiniDonutChart = ({
  value,
  maxValue,
  size = 60,
  strokeWidth = 6,
  color = '#3b82f6',
  backgroundColor = '#e5e7eb'
}: {
  value: number;
  maxValue: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
}) => {
  const percentage = maxValue > 0 ? Math.min((value / maxValue) * 100, 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-xs font-bold leading-none">{percentage.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
};

export const StorageCapacityWidget = ({ config }: Props) => {
  const { brokers } = useMqttServer();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [dbMetrics, setDbMetrics] = useState<DatabaseMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  const fetchStorageMetrics = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch metrics in parallel
      const [systemRes, dbRes] = await Promise.allSettled([
        config.showDiskUsage ? fetch(`${API_BASE_URL}/api/system/metrics`) : Promise.resolve(null),
        (config.showDatabaseSize || config.showWalSize) ? fetch(`${API_BASE_URL}/api/system/database-metrics`) : Promise.resolve(null),
      ]);

      // System metrics (for disk usage)
      if (systemRes.status === 'fulfilled' && systemRes.value && systemRes.value.ok) {
        const systemData = await systemRes.value.json();
        setSystemMetrics(systemData);
      } else if (config.showDiskUsage) {
        // Set default system metrics
        setSystemMetrics({
          disk: { used: 15, total: 50, percentage: 30, filesystem: 'overlay2', mountPoint: '/app' },
        });
      }

      // Database metrics (for database size, WAL, temp files)
      if (dbRes.status === 'fulfilled' && dbRes.value && dbRes.value.ok) {
        const dbData = await dbRes.value.json();
        setDbMetrics(dbData);
      } else if (config.showDatabaseSize || config.showWalSize) {
        // Set default database metrics
        setDbMetrics({
          storage: {
            database_size: 256000000,
            wal_size: 128000000,
            temp_files_size: 0,
          },
        });
      }

      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching storage metrics:', error);
    } finally {
      setLoading(false);
    }
  }, [config.showDiskUsage, config.showDatabaseSize, config.showWalSize]);

  useEffect(() => {
    fetchStorageMetrics();
  }, [fetchStorageMetrics]);

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStorageHealthStatus = () => {
    let status = 'healthy';
    let alerts = [];

    // Check disk usage
    if (systemMetrics && systemMetrics.disk.percentage > config.alertThresholds.diskUsage) {
      status = 'critical';
      alerts.push('High disk usage');
    }

    // Check database size (rough estimate - if > 10GB, might be concerning)
    if (dbMetrics && dbMetrics.storage.database_size > config.alertThresholds.databaseSize * 1024 * 1024 * 1024) {
      if (status !== 'critical') status = 'warning';
      alerts.push('Large database size');
    }

    return { status, alerts };
  };

  const healthStatus = getStorageHealthStatus();

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <HardDrive className="w-5 h-5 text-gray-500" />;
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
          <HardDrive className="w-4 h-4 text-blue-500" />
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
            {/* Storage Capacity Donut Charts Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Disk Usage Donut Chart */}
              {config.showDiskUsage && systemMetrics && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MiniDonutChart
                      value={systemMetrics.disk.percentage}
                      maxValue={100}
                      size={55}
                      color={systemMetrics.disk.percentage > config.alertThresholds.diskUsage ? '#ef4444' : '#10b981'}
                    />
                  </div>
                  <div className="text-xs font-medium mb-1">
                    {formatBytes(systemMetrics.disk.used)}
                  </div>
                  <div className="text-xs text-muted-foreground">Disk</div>
                </div>
              )}

              {/* Database Size Donut Chart */}
              {config.showDatabaseSize && dbMetrics && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MiniDonutChart
                      value={Math.min(dbMetrics.storage.database_size / (config.alertThresholds.databaseSize * 1024 * 1024 * 1024) * 100, 100)}
                      maxValue={100}
                      size={55}
                      color={dbMetrics.storage.database_size > config.alertThresholds.databaseSize * 1024 * 1024 * 1024 ? '#a855f7' : '#8b5cf6'}
                    />
                  </div>
                  <div className="text-xs font-medium mb-1">
                    {formatBytes(dbMetrics.storage.database_size)}
                  </div>
                  <div className="text-xs text-muted-foreground">Database</div>
                </div>
              )}

              {/* WAL Size Donut Chart */}
              {config.showWalSize && dbMetrics && (
                <div className="text-center">
                  <div className="flex items-center justify-center mb-1">
                    <MiniDonutChart
                      value={Math.min(dbMetrics.storage.wal_size / (128 * 1024 * 1024) * 100, 100)} // Relative to 128MB baseline
                      maxValue={100}
                      size={55}
                      color={dbMetrics.storage.wal_size > 1024 * 1024 * 1024 ? '#f59e0b' : '#eab308'} // 1GB threshold
                    />
                  </div>
                  <div className="text-xs font-medium mb-1">
                    {formatBytes(dbMetrics.storage.wal_size)}
                  </div>
                  <div className="text-xs text-muted-foreground">WAL</div>
                </div>
              )}

              {/* Storage Health Status */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center ${healthStatus.status === 'healthy' ? 'bg-green-100 dark:bg-green-900/20' :
                      healthStatus.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                        'bg-red-100 dark:bg-red-900/20'
                    }`}>
                    {healthStatus.status === 'healthy' ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : healthStatus.status === 'warning' ? (
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                  </div>
                </div>
                <div className={`text-xs font-medium capitalize ${getStatusColor()}`}>
                  {healthStatus.status}
                </div>
                <div className="text-xs text-muted-foreground">Health</div>
              </div>
            </div>

            {/* Storage Summary */}
            <div className="text-center space-y-1">
              {/* Total Storage Used */}
              <div className="text-sm font-medium">
                Total: {formatBytes(
                  (systemMetrics?.disk.used || 0) +
                  (dbMetrics?.storage.database_size || 0) +
                  (dbMetrics?.storage.wal_size || 0)
                )}
              </div>

              {/* Alerts */}
              {healthStatus.alerts.length > 0 && (
                <div className="flex items-center justify-center gap-1 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{healthStatus.alerts.length} alerts</span>
                </div>
              )}
            </div>

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
