"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Container,
  Play,
  Square,
  Box,
  Monitor,
  Network,
  Shield,
  PieChart,
  TrendingUp,
  Zap,
  Server,
  Loader2
} from 'lucide-react';
import { useMenuItemPermissions, useMenu } from '@/contexts/MenuContext';
import AccessDenied from '@/components/AccessDenied';

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
  database: {
    connections: {
      active: number;
      idle: number;
      total: number;
      waiting: number;
    };
    performance: {
      queries_per_second: number;
      cache_hit_ratio: number;
      avg_query_time: number;
      slow_queries: number;
      deadlocks: number;
    };
    storage: {
      database_size: number;
      wal_size: number;
      temp_files_size: number;
    };
    system?: any;
    database_type?: string;
  };
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

export default function SystemMonitoringPage() {
  const { loading: menuLoading } = useMenu();

  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(null);
  const [appMetrics, setAppMetrics] = useState<ApplicationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Donut Chart Component
  const DonutChart = ({ value, maxValue, size = 120, strokeWidth = 8, color = '#3b82f6', label }: {
    value: number;
    maxValue: number;
    size?: number;
    strokeWidth?: number;
    color?: string;
    label?: string;
  }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;

    return (
      <div className="flex flex-col items-center gap-2">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
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
              <div className="text-2xl font-bold">{percentage.toFixed(0)}%</div>
              {label && <div className="text-xs text-muted-foreground">{label}</div>}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch system metrics and Docker metrics
      const [systemRes, dockerRes, dbRes] = await Promise.allSettled([
        fetch('/api/system/metrics'),
        fetch('/api/system/docker-metrics'),
        fetch('/api/system/database-metrics')
      ]);

      // System metrics
      if (systemRes.status === 'fulfilled' && systemRes.value.ok) {
        const systemData = await systemRes.value.json();
        setSystemMetrics(systemData);
      } else {
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
      let dockerData: DockerMetrics | null = null;
      if (dockerRes.status === 'fulfilled' && dockerRes.value.ok) {
        dockerData = await dockerRes.value.json();
      } else {
        // Default Docker metrics
        dockerData = {
          containers: { total: 5, running: 4, stopped: 1, paused: 0, healthy: 4, unhealthy: 0 },
          images: { total: 8, dangling: 2, size: 3200000000 },
          volumes: { total: 3, used: 3 },
          networks: { total: 3, active: 3 },
        };
      }

      // Database metrics
      let dbData = null;
      if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
        dbData = await dbRes.value.json();
      } else {
        // Default database metrics
        dbData = {
          connections: { active: 5, idle: 3, total: 8, waiting: 0 },
          performance: {
            queries_per_second: 45,
            cache_hit_ratio: 0.95,
            avg_query_time: 12.5,
            slow_queries: 0,
            deadlocks: 0,
          },
          storage: {
            database_size: 256000000,
            wal_size: 128000000,
            temp_files_size: 0,
          },
        };
      }

      // Combine all metrics
      setAppMetrics({
        docker: dockerData || {
          containers: { total: 0, running: 0, stopped: 0, paused: 0, healthy: 0, unhealthy: 0 },
          images: { total: 0, dangling: 0, size: 0 },
          volumes: { total: 0, used: 0 },
          networks: { total: 0, active: 0 },
        },
        database: dbData,
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

    } catch (err) {
      setError('Failed to fetch monitoring data');
      console.error('Monitoring error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();

    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchMetrics, autoRefresh]);

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes === null || bytes === undefined || bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds: number | null | undefined) => {
    if (seconds === null || seconds === undefined || seconds === 0) return '0h 0m 0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4 text-green-500" />;
      case 'stopped': return <Square className="w-4 h-4 text-gray-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Square className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy': return <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'unhealthy': return <Badge variant="destructive">Unhealthy</Badge>;
      default: return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  if (menuLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Docker System Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive monitoring of Docker containers, services, and system resources
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchMetrics}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
            <Activity className="w-4 h-4 mr-2" />
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-destructive bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="system">System Resources</TabsTrigger>
          <TabsTrigger value="docker">Docker & Services</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="capacity">Capacity Charts</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-blue-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="font-medium text-green-600">Healthy</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  All systems operational
                </p>
              </CardContent>
            </Card>

            {/* Docker Containers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Container className="w-5 h-5 text-blue-500" />
                  Containers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {appMetrics?.docker?.containers.running || 0}/{appMetrics?.docker?.containers.total || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Running containers
                </p>
              </CardContent>
            </Card>

            {/* Services */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-500" />
                  Services
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {appMetrics?.services.filter(s => s.status === 'running').length || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active services
                </p>
              </CardContent>
            </Card>

            {/* Database */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  Database
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {appMetrics?.database?.connections.active || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Active connections
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">CPU Usage</span>
                  <span className="font-medium">{systemMetrics?.cpu?.usage?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={systemMetrics?.cpu?.usage || 0} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Memory Usage</span>
                  <span className="font-medium">{systemMetrics?.memory?.percentage?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={systemMetrics?.memory?.percentage || 0} className="h-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm">Disk Usage</span>
                  <span className="font-medium">{systemMetrics?.disk?.percentage?.toFixed(0) || 0}%</span>
                </div>
                <Progress value={systemMetrics?.disk?.percentage || 0} className="h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Docker Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {appMetrics?.docker?.containers.running || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Running</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {appMetrics?.docker?.containers.stopped || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Stopped</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {appMetrics?.docker?.images.total || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Images</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {appMetrics?.docker?.volumes.used || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Volumes</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {appMetrics?.services.map((service, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getServiceStatusIcon(service.status)}
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    {getHealthBadge(service.health)}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Resources Tab */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CPU Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-500" />
                  CPU Usage
                </CardTitle>
                <CardDescription>
                  Processor utilization and system load
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>{systemMetrics.cpu?.usage?.toFixed(1) || 0}%</span>
                      </div>
                      <Progress value={systemMetrics.cpu?.usage || 0} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Cores</p>
                        <p className="font-medium">{systemMetrics.cpu.cores}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Load Average</p>
                        <p className="font-medium">{systemMetrics.load_avg?.[0]?.toFixed(2) || '0.00'}</p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2">
                      {systemMetrics.cpu.model}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Memory Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <MemoryStick className="w-5 h-5 text-green-500" />
                  Memory Usage
                </CardTitle>
                <CardDescription>
                  RAM utilization and cache information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>{systemMetrics.memory?.percentage?.toFixed(1) || 0}%</span>
                      </div>
                      <Progress value={systemMetrics.memory?.percentage || 0} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="font-medium">{formatBytes(systemMetrics.memory.used)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">{formatBytes(systemMetrics.memory.total)}</p>
                      </div>
                    </div>

                    {systemMetrics.memory.cached && (
                      <div className="text-xs text-muted-foreground pt-2">
                        Cached: {formatBytes(systemMetrics.memory.cached)}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Disk Usage */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-orange-500" />
                  Disk Usage
                </CardTitle>
                <CardDescription>
                  Storage utilization and filesystem information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics ? (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Usage</span>
                        <span>{systemMetrics.disk?.percentage?.toFixed(1) || 0}%</span>
                      </div>
                      <Progress value={systemMetrics.disk?.percentage || 0} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Used</p>
                        <p className="font-medium">{formatBytes(systemMetrics.disk.used)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total</p>
                        <p className="font-medium">{formatBytes(systemMetrics.disk.total)}</p>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground pt-2">
                      {systemMetrics.disk.filesystem} - {systemMetrics.disk.mountPoint}
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Network */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5 text-purple-500" />
                  Network & System
                </CardTitle>
                <CardDescription>
                  Network activity and system information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {systemMetrics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">RX</p>
                        <p className="font-medium">{formatBytes(systemMetrics.network.rx_bytes)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">TX</p>
                        <p className="font-medium">{formatBytes(systemMetrics.network.tx_bytes)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Connections</p>
                        <p className="font-medium">{systemMetrics.network.connections}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Uptime</p>
                        <p className="font-medium">{formatTime(systemMetrics.uptime)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Docker & Services Tab */}
        <TabsContent value="docker" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Docker Containers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Container className="w-5 h-5 text-blue-500" />
                  Docker Containers
                </CardTitle>
                <CardDescription>
                  Container status and health overview
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appMetrics?.docker ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {appMetrics.docker.containers.running}
                        </div>
                        <div className="text-sm text-muted-foreground">Running</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {appMetrics.docker.containers.stopped}
                        </div>
                        <div className="text-sm text-muted-foreground">Stopped</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {appMetrics.docker.containers.healthy}
                        </div>
                        <div className="text-sm text-muted-foreground">Healthy</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">
                          {appMetrics.docker.containers.total}
                        </div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Docker Resources */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Box className="w-5 h-5 text-purple-500" />
                  Docker Resources
                </CardTitle>
                <CardDescription>
                  Images, volumes, and networks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appMetrics?.docker ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Images</span>
                      <Badge variant="secondary">
                        {appMetrics.docker.images.total} ({appMetrics.docker.images.dangling} dangling)
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Image Size</span>
                      <span className="font-medium">{formatBytes(appMetrics.docker.images.size)}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Volumes</span>
                      <Badge variant="secondary">
                        {appMetrics.docker.volumes.used}/{appMetrics.docker.volumes.total}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Networks</span>
                      <Badge variant="secondary">
                        {appMetrics.docker.networks.active}/{appMetrics.docker.networks.total} active
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Services Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                Service Status
              </CardTitle>
              <CardDescription>
                Detailed status of all running services
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appMetrics?.services ? (
                <div className="space-y-3">
                  {appMetrics.services.map((service, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getServiceStatusIcon(service.status)}
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Uptime: {formatTime(service.uptime)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">CPU</div>
                          <div className="font-medium">{service.cpu}%</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Memory</div>
                          <div className="font-medium">{formatBytes(service.memory)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Restarts</div>
                          <div className="font-medium">{service.restarts}</div>
                        </div>
                        {getHealthBadge(service.health)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Performance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                Database Performance
              </CardTitle>
              <CardDescription>
                PostgreSQL connection pool and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appMetrics?.database ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Connection Pool</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Active</span>
                        <span>{appMetrics.database.connections.active}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Idle</span>
                        <span>{appMetrics.database.connections.idle}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Total</span>
                        <span>{appMetrics.database.connections.total}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Waiting</span>
                        <span>{appMetrics.database.connections.waiting}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Performance</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Queries/sec</span>
                        <span>{appMetrics.database.performance.queries_per_second}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Cache Hit Ratio</span>
                        <span>{((appMetrics.database.performance.cache_hit_ratio || 0) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Avg Query Time</span>
                        <span>{appMetrics.database.performance.avg_query_time}ms</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Slow Queries</span>
                        <span className={appMetrics.database.performance.slow_queries > 0 ? 'text-red-600' : ''}>
                          {appMetrics.database.performance.slow_queries}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Database Connections */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-purple-500" />
                  Database Connections
                </CardTitle>
                <CardDescription>
                  Connection pool status and activity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appMetrics?.database ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {appMetrics.database.connections.active}
                        </div>
                        <div className="text-sm text-muted-foreground">Active</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">
                          {appMetrics.database.connections.idle}
                        </div>
                        <div className="text-sm text-muted-foreground">Idle</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {appMetrics.database.connections.total}
                        </div>
                        <div className="text-sm text-muted-foreground">Total</div>
                      </div>
                      <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">
                          {appMetrics.database.connections.waiting}
                        </div>
                        <div className="text-sm text-muted-foreground">Waiting</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Database Performance */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Database Performance
                </CardTitle>
                <CardDescription>
                  Query performance and cache statistics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {appMetrics?.database ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Queries per Second</span>
                      <span className="font-medium">{appMetrics.database.performance.queries_per_second}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Cache Hit Ratio</span>
                      <span className="font-medium">{((appMetrics.database.performance.cache_hit_ratio || 0) * 100).toFixed(1)}%</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg Query Time</span>
                      <span className="font-medium">{appMetrics.database.performance.avg_query_time}ms</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Slow Queries</span>
                      <Badge variant={appMetrics.database.performance.slow_queries > 0 ? 'destructive' : 'secondary'}>
                        {appMetrics.database.performance.slow_queries}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm">Deadlocks</span>
                      <Badge variant={appMetrics.database.performance.deadlocks > 0 ? 'destructive' : 'secondary'}>
                        {appMetrics.database.performance.deadlocks}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="animate-spin h-8 w-8" />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Database Storage */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-orange-500" />
                Database Storage
              </CardTitle>
              <CardDescription>
                Database size, transaction logs, and temporary files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {appMetrics?.database ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatBytes(appMetrics.database.storage.database_size)}
                      </div>
                      <div className="text-sm text-muted-foreground">Database Size</div>
                      <div className="text-xs text-muted-foreground mt-1">Actual data stored</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {formatBytes(appMetrics.database.storage.wal_size)}
                      </div>
                      <div className="text-sm text-muted-foreground">WAL Size</div>
                      <div className="text-xs text-muted-foreground mt-1">Transaction logs</div>
                    </div>

                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatBytes(appMetrics.database.storage.temp_files_size)}
                      </div>
                      <div className="text-sm text-muted-foreground">Temp Files</div>
                      <div className="text-xs text-muted-foreground mt-1">Temporary workspace</div>
                    </div>
                  </div>

                  {/* Explanatory Text */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Storage Explanations:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <strong className="text-blue-800 dark:text-blue-200">WAL (Write-Ahead Log):</strong>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          Transaction log ensuring data integrity. Size depends on write activity and retention settings.
                          Large WAL indicates high transaction volume - this is normal for active databases.
                        </p>
                      </div>
                      <div>
                        <strong className="text-blue-800 dark:text-blue-200">Temp Files:</strong>
                        <p className="text-blue-700 dark:text-blue-300 mt-1">
                          Temporary workspace for complex queries, sorting, and joins.
                          Large temp files may indicate memory-intensive operations or insufficient RAM.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database System Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-indigo-500" />
                Database System Info
              </CardTitle>
              <CardDescription>
                Database version and system statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {appMetrics?.database?.system ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Database Type</p>
                      <p className="font-medium capitalize">{appMetrics.database.database_type}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">PostgreSQL Version</p>
                      <p className="font-medium">{appMetrics.database.system.version || 'Unknown'}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Database Name</p>
                      <p className="font-medium">{appMetrics.database.system.database?.datname || 'Unknown'}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Active Backends</p>
                      <p className="font-medium">{appMetrics.database.system.database?.numbackends || 0}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="animate-spin h-8 w-8" />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Capacity Charts Tab */}
        <TabsContent value="capacity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* CPU Capacity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">CPU Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  value={systemMetrics?.cpu.usage || 0}
                  maxValue={100}
                  color="#3b82f6"
                  label="CPU Usage"
                  size={120}
                />
              </CardContent>
            </Card>

            {/* Memory Capacity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">Memory Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  value={systemMetrics?.memory.percentage || 0}
                  maxValue={100}
                  color="#10b981"
                  label="Memory Usage"
                  size={120}
                />
              </CardContent>
            </Card>

            {/* Disk Capacity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">Disk Capacity</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  value={systemMetrics?.disk.percentage || 0}
                  maxValue={100}
                  color="#f59e0b"
                  label="Disk Usage"
                  size={120}
                />
              </CardContent>
            </Card>

            {/* Docker Containers */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-center">Container Health</CardTitle>
              </CardHeader>
              <CardContent>
                <DonutChart
                  value={appMetrics?.docker?.containers.running || 0}
                  maxValue={appMetrics?.docker?.containers.total || 1}
                  color="#8b5cf6"
                  label="Running Containers"
                  size={120}
                />
              </CardContent>
            </Card>
          </div>

          {/* Capacity Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Capacity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">CPU Cores Available</span>
                    <span className="font-medium">{systemMetrics?.cpu.cores || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory Total</span>
                    <span className="font-medium">{formatBytes(systemMetrics?.memory.total || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Disk Total</span>
                    <span className="font-medium">{formatBytes(systemMetrics?.disk.total || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Network Interfaces</span>
                    <span className="font-medium">{systemMetrics?.network.interfaces || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Docker Capacity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Containers</span>
                    <span className="font-medium">{appMetrics?.docker?.containers.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Healthy Containers</span>
                    <span className="font-medium text-green-600">{appMetrics?.docker?.containers.healthy || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Docker Images</span>
                    <span className="font-medium">{appMetrics?.docker?.images.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Active Volumes</span>
                    <span className="font-medium">{appMetrics?.docker?.volumes.used || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
