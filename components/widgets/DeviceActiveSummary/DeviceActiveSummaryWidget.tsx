"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
  Server,
  Circle,
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceExternal {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address?: string;
  status?: string;
  lastUpdatedByMqtt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface Props {
  config: {
    customName: string;
    refreshInterval: number;
    showDetails: boolean;
    showProgressBars: boolean;
  };
}

export const DeviceActiveSummaryWidget = ({ config }: Props) => {
  const { brokers, subscribe, unsubscribe, isReady } = useMqttServer();
  const [devices, setDevices] = useState<DeviceExternal[]>([]);
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  // Fetch device external data
  const fetchDeviceData = async () => {
    try {
      setStatus("loading");
      const response = await fetch(`${API_BASE_URL}/api/devices/external`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: DeviceExternal[] = await response.json();
      setDevices(data);
      setStatus("ok");
      setLastUpdate(new Date());
    } catch (error: any) {
      console.error("Error fetching device data:", error);
      setStatus("error");

      // Show user-friendly error message
      const errorMessage = error.message?.includes("fetch")
        ? "Unable to connect to device API"
        : error.message || "Failed to load device data";

      showToast.error("Device Summary", errorMessage);
    }
  };

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string, serverId: string) => {
      console.log('DeviceActiveSummaryWidget - MQTT Message:', { receivedTopic, payloadString, serverId });

      if (devices.some(device => device.topic === receivedTopic)) {
        console.log('DeviceActiveSummaryWidget - Updating payload for topic:', receivedTopic);
        setPayloads((prev) => ({ ...prev, [receivedTopic]: payloadString }));
      }
    },
    [devices]
  );

  // MQTT subscriptions
  useEffect(() => {
    if (!isReady || devices.length === 0 || connectionStatus !== "Connected") return;

    const topics = devices.map((d) => d.topic);
    if (topics.length === 0) return;

    topics.forEach((topic) => {
      subscribe(topic, handleMqttMessage);
    });

    return () => {
      topics.forEach((topic) => {
        unsubscribe(topic, handleMqttMessage);
      });
    };
  }, [devices, isReady, connectionStatus, subscribe, unsubscribe, handleMqttMessage]);

  // Initial data load only (no auto-refresh)
  useEffect(() => {
    fetchDeviceData();
  }, []);

  // Calculate device statistics based on real-time MQTT data
  const deviceStats = React.useMemo(() => {
    const total = devices.length;

    // Active devices are those that have received MQTT payloads
    const activeTopics = Object.keys(payloads).filter(topic => payloads[topic]);
    const active = activeTopics.length;
    const inactive = total - active;

    const activePercentage = total > 0 ? Math.round((active / total) * 100) : 0;
    const inactivePercentage = total > 0 ? Math.round((inactive / total) * 100) : 0;

    // Debug logging
    console.log('DeviceActiveSummaryWidget - Stats:', {
      total,
      active,
      inactive,
      activePercentage,
      activeTopics,
      payloadsCount: Object.keys(payloads).length,
      devicesCount: devices.length
    });

    return {
      total,
      active,
      inactive,
      activePercentage,
      inactivePercentage,
      activeTopics, // For debugging/tracking
    };
  }, [devices, payloads]);

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
      default:
        return { ...baseStyles, statusColor: "text-slate-600" };
    }
  };

  const styles = getStatusStyling();

  // Progress bar component
  const ProgressBar = ({ value, maxValue, color, label }: {
    value: number;
    maxValue: number;
    color: string;
    label: string;
  }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-slate-600 dark:text-slate-400">{label}</span>
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {value}/{maxValue}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200/60 dark:border-slate-600/80">
        <div className="flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-500" />
          <h3 className={`font-semibold text-lg ${styles.title}`}>
            {config.customName}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={fetchDeviceData}
            className="h-8 w-8 p-0 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            disabled={status === "loading"}
          >
            <RefreshCw className={`w-4 h-4 ${status === "loading" ? "animate-spin" : ""}`} />
          </button>

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
      <div className="flex-1 overflow-auto p-4">
        {status === "loading" && (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center h-32 text-red-500">
            <AlertTriangle className="w-8 h-8 mb-2" />
            <p className="text-sm">Failed to load device data</p>
          </div>
        )}

        {status === "ok" && (
          <div className="flex flex-col h-full">
            {/* 1x3 Grid Layout (Horizontal) */}
            <div className="flex-1 flex flex-row space-x-3">
              {/* Total Devices */}
              <div className="flex-1 flex flex-row items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <div className="flex flex-row items-center space-x-3">
                  <Server className="w-8 h-8 text-blue-500 flex-shrink-0" />
                  <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {deviceStats.total}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-3">
                  Total Devices
                </div>
              </div>

              {/* Active Devices */}
              <div className="flex-1 flex flex-row items-center justify-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                <div className="flex flex-row items-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {deviceStats.active}
                  </div>
                </div>
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 ml-3">
                  Active Devices
                </div>
              </div>

              
            </div>
          </div>
        )}
      </div>


    </div>
  );
};
