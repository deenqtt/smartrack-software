"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  Activity,
  AlertCircle,
  Wifi,
  WifiOff,
  Clock,
  Database,
  MessageSquare,
  Zap,
  Server,
  ChevronUp,
  ChevronDown,
  Filter,
  RefreshCw,
  FileText,
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceLog {
  id: string;
  timestamp: string;
  deviceId: string;
  deviceName: string;
  eventType: "mqtt_message" | "status_change" | "error" | "connection" | "data_update";
  topic?: string;
  payload?: any;
  message?: string;
  severity: "info" | "warning" | "error" | "success";
  source: "mqtt" | "api" | "system";
}

interface Props {
  config: {
    customName: string;
    devices: string[];
    logTypes: string[];
    maxLogs: number;
    autoRefresh: boolean;
    refreshInterval: number;
    showPayload: boolean;
  };
  isEditMode?: boolean;
}

export const DeviceLogsWidget = ({ config, isEditMode }: Props) => {
  const { brokers } = useMqttServer();
  const [logs, setLogs] = useState<DeviceLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<DeviceLog[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "empty">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  // Filter logs based on selected log types and devices
  useEffect(() => {
    let filtered = logs;

    // Filter by log types
    if (config.logTypes && config.logTypes.length > 0 && logFilter !== "all") {
      filtered = filtered.filter(log => config.logTypes.includes(log.eventType));
    }

    // Filter by devices
    if (config.devices && config.devices.length > 0) {
      filtered = filtered.filter(log => config.devices.includes(log.deviceId));
    }

    // Limit to max logs
    filtered = filtered.slice(0, config.maxLogs || 50);

    setFilteredLogs(filtered);
  }, [logs, config.logTypes, config.devices, config.maxLogs, logFilter]);

  // Auto-refresh logs
  useEffect(() => {
    const fetchLogs = async () => {
      try {
        if (!config.devices || config.devices.length === 0) {
          setLogs([]);
          setFilteredLogs([]);
          setStatus("empty");
          setErrorMessage("Please configure at least one device.");
          return;
        }

        setStatus("loading");
        setErrorMessage("");

        const params = new URLSearchParams();
        params.append("page", "1");
        params.append("limit", String(Math.max(config.maxLogs || 50, 1)));

        if (config.devices[0]) {
          params.append("search", config.devices[0]);
        }

        const response = await fetch(`/api/devices-log-report?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        const mappedLogs: DeviceLog[] = rows.map((row: any) => ({
          id: String(row.id),
          timestamp: row.timestamp,
          deviceId: row.configId || row.deviceId || "unknown-device",
          deviceName: row.customName || row.deviceName || row.device?.name || "Unknown Device",
          eventType: "data_update",
          topic: row.topic || row.device?.topic,
          payload: row.value,
          message: row.message || `Logged value: ${row.value ?? "-"}`,
          severity: "info",
          source: "api",
        }));

        setLogs(mappedLogs);
        setLastUpdate(new Date());
        if (mappedLogs.length > 0) {
          setStatus("ok");
        } else {
          setStatus("empty");
        }
      } catch (error: any) {
        console.error("Error fetching device logs:", error);
        setStatus("error");
        setErrorMessage(error.message || "Failed to load device logs.");
      }
    };

    fetchLogs();

    if (config.autoRefresh) {
      intervalRef.current = setInterval(fetchLogs, config.refreshInterval * 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [config.autoRefresh, config.refreshInterval, config.devices, config.maxLogs, refreshKey]);

  // Get event type icon
  const getEventIcon = (eventType: DeviceLog["eventType"], size: number = 16) => {
    const iconProps = { width: size, height: size };
    switch (eventType) {
      case "mqtt_message":
        return <MessageSquare {...iconProps} className="text-blue-500" />;
      case "status_change":
        return <Activity {...iconProps} className="text-yellow-500" />;
      case "connection":
        return <Wifi {...iconProps} className="text-green-500" />;
      case "error":
        return <AlertCircle {...iconProps} className="text-red-500" />;
      case "data_update":
        return <Database {...iconProps} className="text-purple-500" />;
      default:
        return <FileText {...iconProps} className="text-gray-500" />;
    }
  };

  // Get severity badge
  const getSeverityBadge = (severity: DeviceLog["severity"]) => {
    const variants = {
      info: "secondary",
      warning: "outline",
      error: "destructive",
      success: "default"
    } as const;

    return (
      <Badge variant={variants[severity]} className="text-xs">
        {severity.toUpperCase()}
      </Badge>
    );
  };

  // Format payload for display
  const formatPayload = (payload: any): string => {
    if (!payload) return "-";
    if (typeof payload === "string") return payload;
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };

  // Status styling
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      indicator: connectionStatus === "Connected" ? "bg-emerald-500" : "bg-red-500",
    };

    switch (status) {
      case "ok":
        return { ...baseStyles, statusColor: "text-emerald-600" };
      case "error":
        return { ...baseStyles, statusColor: "text-red-600" };
      case "empty":
        return { ...baseStyles, statusColor: "text-amber-600" };
      default:
        return { ...baseStyles, statusColor: "text-slate-600" };
    }
  };

  const styles = getStatusStyling();

  // Click handler
  const handleWidgetClick = () => {
    showToast.info("Device Logs", "Widget shows real-time device activity logs");
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-600/80">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-500" />
          <h3 className={`font-semibold text-lg ${styles.title}`}>
            {config.customName}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Log Type Filter */}
          <Select value={logFilter} onValueChange={setLogFilter}>
            <SelectTrigger className="h-8 w-24 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="mqtt_message">Messages</SelectItem>
              <SelectItem value="connection">Connections</SelectItem>
              <SelectItem value="status_change">Status</SelectItem>
              <SelectItem value="error">Errors</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setLogs([]);
              setFilteredLogs([]);
              setLastUpdate(null);
              setStatus("loading");
              setRefreshKey((prev) => prev + 1);
            }}
            className="h-8 w-8 p-0"
            disabled={status === "loading"}
          >
            <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
          </Button>

          {/* Connection Status */}
          {connectionStatus === "Connected" ? (
            <Wifi className="w-4 h-4 text-slate-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-slate-400" />
          )}

          <div className={`rounded-full w-3 h-3 ${styles.indicator}`} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {status === "loading" && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <AlertCircle className="w-8 h-8 mb-2" />
            <p className="text-sm">{errorMessage || "Failed to load device logs"}</p>
          </div>
        )}

        {(status === "ok" || status === "empty") && filteredLogs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-slate-500">
            <FileText className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No logs found</p>
            <p className="text-xs opacity-70">{errorMessage || "No device log data available."}</p>
          </div>
        )}

        {status === "ok" && filteredLogs.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800">
                  <TableHead className="w-12">Type</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Message</TableHead>
                  {config.showPayload && <TableHead>Payload</TableHead>}
                  <TableHead className="w-20">Severity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <TableCell>
                      {getEventIcon(log.eventType, 16)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.deviceName}</div>
                      <div className="text-xs text-slate-500 font-mono">{log.deviceId}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.eventType.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="truncate" title={log.message}>
                        {log.message}
                      </div>
                      {log.topic && (
                        <div className="text-xs text-slate-500 font-mono truncate">
                          {log.topic}
                        </div>
                      )}
                    </TableCell>
                    {config.showPayload && (
                      <TableCell className="max-w-xs">
                        <div className="text-xs font-mono bg-slate-100 dark:bg-slate-800 p-1 rounded truncate">
                          {formatPayload(log.payload)}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {getSeverityBadge(log.severity)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Footer */}
      {lastUpdate && (
        <div className="px-4 py-2 border-t border-slate-200/60 dark:border-slate-600/80 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            <span>{filteredLogs.length} logs</span>
          </div>
        </div>
      )}
    </div>
  );
};
