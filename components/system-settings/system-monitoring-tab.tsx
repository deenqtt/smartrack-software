"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Monitor,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  RefreshCw,
  Thermometer,
  RotateCcw,
  Power,
  AlertTriangle,
} from "lucide-react";

interface SystemInfo {
  cpu_usage: number;
  cpu_temp: string;
  memory_usage: number;
  used_memory: number;
  total_memory: number;
  disk_usage: number;
  used_disk: number;
  total_disk: number;
  eth0_ip_address: string;
  wlan0_ip_address: string;
  uptime: number;
  timestamp: string;
}

export function SystemMonitoringTab() {
  const { publish, subscribe, unsubscribe, isReady, connectionStatus } =
    useMqtt();
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [rebootStatus, setRebootStatus] = useState<"idle" | "rebooting">(
    "idle",
  );
  const [factoryResetStatus, setFactoryResetStatus] = useState<
    "idle" | "resetting"
  >("idle");
  const [shutdownStatus, setShutdownStatus] = useState<
    "idle" | "shutting_down"
  >("idle");

  // MQTT Topics
  const SYSTEM_STATUS_TOPIC = "system/status";

  useEffect(() => {
    if (!isReady) return;

    const handleMessage = (topic: string, message: string) => {
      if (topic === SYSTEM_STATUS_TOPIC) {
        try {
          const info: SystemInfo = JSON.parse(message);
          setSystemInfo(info);
          setLastUpdate(new Date());
          // Removed toast spam - system info updates every second
        } catch (e) {
          console.error("Failed to parse system info:", e);
          toast.error("Failed to parse system information");
        }
      }
    };

    subscribe(SYSTEM_STATUS_TOPIC, handleMessage);

    return () => {
      unsubscribe(SYSTEM_STATUS_TOPIC, handleMessage);
    };
  }, [isReady, subscribe, unsubscribe]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  // System control functions
  const handleSystemReboot = () => {
    if (!isReady) {
      toast.error("MQTT client not connected.");
      return;
    }

    setRebootStatus("rebooting");
    toast.info("Initiating system reboot...");

    const payload = {
      action: "reboot",
    };

    try {
      publish("service/command", JSON.stringify(payload));
      toast.success("Reboot command sent. System will restart shortly.");
    } catch (error) {
      console.error("Failed to send reboot command:", error);
      toast.error("Failed to send reboot command.");
      setRebootStatus("idle");
    }
  };

  const handleFactoryReset = () => {
    if (!isReady) {
      toast.error("MQTT client not connected.");
      return;
    }

    const confirmed = window.confirm(
      "⚠️ FACTORY RESET WARNING ⚠️\n\n" +
        "This will:\n" +
        "• Reset all configurations to factory defaults\n" +
        "• Reset network settings to 192.168.0.100\n" +
        "• Reset device configurations\n" +
        "• System will reboot automatically\n\n" +
        "Are you sure you want to proceed?",
    );

    if (!confirmed) return;

    setFactoryResetStatus("resetting");
    toast.warning("Initiating factory reset... System will reboot!");

    try {
      // Publish to factory reset topic (no payload needed)
      publish("command/reset_config", "");
      toast.success("Factory reset command sent. System will reboot shortly.");
    } catch (error) {
      console.error("Failed to send factory reset command:", error);
      toast.error("Failed to send factory reset command.");
      setFactoryResetStatus("idle");
    }
  };

  const handleSystemShutdown = () => {
    if (!isReady) {
      toast.error("MQTT client not connected.");
      return;
    }

    const confirmed = window.confirm(
      "⚠️ SYSTEM SHUTDOWN WARNING ⚠️\n\n" +
        "This will:\n" +
        "• Shut down the entire system\n" +
        "• All services will stop\n" +
        "• System will power off completely\n\n" +
        "Are you sure you want to shut down the system?",
    );

    if (!confirmed) return;

    setShutdownStatus("shutting_down");
    toast.warning("Initiating system shutdown... System will power off!");

    const payload = {
      action: "shutdown",
    };

    try {
      publish("service/command", JSON.stringify(payload));
      toast.success("Shutdown command sent. System will power off shortly.");
    } catch (error) {
      console.error("Failed to send shutdown command:", error);
      toast.error("Failed to send shutdown command.");
      setShutdownStatus("idle");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Monitor className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              System Monitoring
            </h2>
            <p className="text-sm text-muted-foreground">
              Real-time system metrics and system operations
            </p>
          </div>
        </div>
        <Badge
          variant={isReady ? "default" : "destructive"}
          className="font-medium"
        >
          {connectionStatus === "Connected" ? "Live Data" : connectionStatus}
        </Badge>
      </div>

      {/* System Controls - ATAS */}
      <Card className="border-l-4 border-l-red-500/20">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
              <Power className="h-4 w-4 text-red-600" />
            </div>
            System Controls
          </CardTitle>
          <CardDescription className="text-sm">
            Manage reboot, shutdown, and critical system operations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* System Operations & Critical Actions - SATU TEMPAT */}
          <div className="space-y-4">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              System Operations
            </h3>

            {/* System Control Buttons - Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* System Reboot */}
              <div className="flex flex-col items-center p-4 bg-orange-500/5 border border-orange-500/20 rounded-xl hover:bg-orange-500/10 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 mb-3">
                  <RotateCcw className="h-6 w-6 text-orange-600" />
                </div>
                <h4 className="font-semibold text-orange-700 text-center mb-2">
                  System Reboot
                </h4>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Safely restart the system
                </p>
                <Button
                  onClick={handleSystemReboot}
                  disabled={!isReady || rebootStatus === "rebooting"}
                  variant="outline"
                  size="sm"
                  className="border-orange-500/20 hover:bg-orange-500/10 w-full"
                >
                  {rebootStatus === "rebooting" ? (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                      Rebooting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1" />
                      Reboot
                    </>
                  )}
                </Button>
              </div>

              {/* System Shutdown */}
              <div className="flex flex-col items-center p-4 bg-red-500/5 border-2 border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 mb-3">
                  <Power className="h-6 w-6 text-red-600" />
                </div>
                <h4 className="font-semibold text-red-700 text-center mb-2">
                  System Shutdown
                </h4>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Power off completely
                </p>
                <Button
                  onClick={handleSystemShutdown}
                  disabled={!isReady || shutdownStatus === "shutting_down"}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  {shutdownStatus === "shutting_down" ? (
                    <>
                      <Power className="h-3 w-3 mr-1 animate-spin" />
                      Shutting Down...
                    </>
                  ) : (
                    <>
                      <Power className="h-3 w-3 mr-1" />
                      Shutdown
                    </>
                  )}
                </Button>
              </div>

              {/* Factory Reset */}
              <div className="flex flex-col items-center p-4 bg-destructive/5 border-2 border-destructive/20 rounded-xl hover:bg-destructive/10 transition-colors">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 mb-3">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <h4 className="font-semibold text-destructive text-center mb-2">
                  Factory Reset
                </h4>
                <p className="text-xs text-muted-foreground text-center mb-3">
                  Reset to defaults
                </p>
                <Button
                  onClick={handleFactoryReset}
                  disabled={!isReady || factoryResetStatus === "resetting"}
                  variant="destructive"
                  size="sm"
                  className="w-full"
                >
                  {factoryResetStatus === "resetting" ? (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Reset
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  ⚠️ Cannot be undone
                </p>
              </div>
            </div>
          </div>

          {/* Connection Warning */}
          {!isReady && (
            <div className="flex items-center gap-3 text-destructive text-sm p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">MQTT Connection Required</p>
                <p className="text-xs">
                  All system controls are disabled when disconnected from the
                  MQTT broker.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <RefreshCw className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Update</p>
                <p className="text-sm font-mono font-medium">
                  {lastUpdate ? lastUpdate.toLocaleString() : "No data"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Cpu className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">CPU Load</p>
                <p className="text-lg font-bold">
                  {systemInfo?.cpu_usage?.toFixed(1) || "N/A"}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <MemoryStick className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Memory</p>
                <p className="text-lg font-bold">
                  {systemInfo?.memory_usage?.toFixed(1) || "N/A"}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <HardDrive className="h-4 w-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Storage</p>
                <p className="text-lg font-bold">
                  {systemInfo?.disk_usage?.toFixed(1) || "N/A"}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed System Metrics - BAWAH */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* CPU & Temperature */}
        <Card className="border-l-4 border-l-blue-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Cpu className="h-4 w-4 text-blue-600" />
              </div>
              CPU Performance
            </CardTitle>
            <CardDescription className="text-sm">
              Processor usage and thermal monitoring
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">CPU Usage</span>
                <span className="text-sm font-mono font-bold">
                  {systemInfo?.cpu_usage?.toFixed(1) || "N/A"}%
                </span>
              </div>
              <Progress value={systemInfo?.cpu_usage || 0} className="h-3" />
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                  <Thermometer className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Temperature</p>
                  <p className="text-lg font-mono font-bold">
                    {systemInfo?.cpu_temp || "N/A"}°C
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card className="border-l-4 border-l-purple-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <MemoryStick className="h-4 w-4 text-purple-600" />
              </div>
              Memory Usage
            </CardTitle>
            <CardDescription className="text-sm">
              RAM utilization and availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">RAM Usage</span>
                <span className="text-sm font-mono font-bold">
                  {systemInfo?.memory_usage?.toFixed(1) || "N/A"}%
                </span>
              </div>
              <Progress value={systemInfo?.memory_usage || 0} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Used</p>
                <p className="text-sm font-mono font-bold">
                  {systemInfo
                    ? formatBytes(systemInfo.used_memory * 1024 * 1024)
                    : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-sm font-mono font-bold">
                  {systemInfo
                    ? formatBytes(systemInfo.total_memory * 1024 * 1024)
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card className="border-l-4 border-l-orange-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                <HardDrive className="h-4 w-4 text-orange-600" />
              </div>
              Storage Usage
            </CardTitle>
            <CardDescription className="text-sm">
              Disk space utilization and capacity
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Disk Usage</span>
                <span className="text-sm font-mono font-bold">
                  {systemInfo?.disk_usage?.toFixed(1) || "N/A"}%
                </span>
              </div>
              <Progress value={systemInfo?.disk_usage || 0} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Used</p>
                <p className="text-sm font-mono font-bold">
                  {systemInfo
                    ? formatBytes(systemInfo.used_disk * 1024 * 1024)
                    : "N/A"}
                </p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg text-center">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-sm font-mono font-bold">
                  {systemInfo
                    ? formatBytes(systemInfo.total_disk * 1024 * 1024)
                    : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Network & Uptime */}
        <Card className="border-l-4 border-l-green-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Wifi className="h-4 w-4 text-green-600" />
              </div>
              System Status
            </CardTitle>
            <CardDescription className="text-sm">
              Network connectivity and system uptime
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-2">
                  Network Interfaces
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Ethernet (eth0)</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {systemInfo?.eth0_ip_address || "Disconnected"}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>WiFi (wlan0)</span>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {systemInfo?.wlan0_ip_address || "Disconnected"}
                    </code>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">
                  System Uptime
                </p>
                <div className="text-center">
                  <p className="text-2xl font-mono font-bold text-green-600">
                    {systemInfo ? formatUptime(systemInfo.uptime) : "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Continuous operation time
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!systemInfo && (
        <Card className="border-l-4 border-l-muted">
          <CardContent className="pt-8 pb-8">
            <div className="text-center text-muted-foreground">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/50 mx-auto mb-4">
                <Monitor className="h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                No System Data Available
              </h3>
              <p className="text-sm max-w-md mx-auto">
                System monitoring data is not being received. Please ensure the
                backend service is running and properly connected to the MQTT
                broker.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
