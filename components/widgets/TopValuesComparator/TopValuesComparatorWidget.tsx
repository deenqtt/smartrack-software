"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  Loader2,
  WifiOff,
  Wifi,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  BarChart3,
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceValue {
  deviceId: string;
  deviceName: string;
  value: number | null;
  timestamp: string | null;
  key: string;
}

interface Props {
  config: {
    customName: string;
    devices: string[];
    keyName: string;
    count: number;
    sortBy: "highest" | "lowest";
    timeRange: string;
    thresholdAlert?: number;
    refreshInterval?: number;
  };
  isEditMode?: boolean;
}

export const TopValuesComparatorWidget = ({ config, isEditMode = false }: Props) => {
  const { brokers, subscribe, unsubscribe } = useMqttServer();
  const [data, setData] = useState<DeviceValue[]>([]);
  const [filteredData, setFilteredData] = useState<DeviceValue[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "empty" | "waiting">("loading");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof DeviceValue;
    direction: "asc" | "desc";
  }>({ key: "value", direction: config.sortBy === "highest" ? "desc" : "asc" });
  const [timeFilter, setTimeFilter] = useState<string>("all");

  // Connection status check
  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  // Enhanced responsive layout system
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "wide">("normal");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width } = rect;

      if (width < 400) {
        setLayoutMode("compact");
      } else if (width > 800) {
        setLayoutMode("wide");
      } else {
        setLayoutMode("normal");
      }
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  // MQTT message handler for each device
  const createMqttHandler = useCallback((deviceId: string, deviceName: string) => {
    return (receivedTopic: string, payloadString: string) => {
      if (!payloadString) return;

      try {
        let payload: any;
        try {
          payload = JSON.parse(payloadString);
        } catch (e) {
          // Silent failure for non-JSON payloads
          return;
        }

        let innerPayload = payload;

        // Handle nested payload structure
        if (payload && payload.value && typeof payload.value === 'string') {
          try {
            innerPayload = JSON.parse(payload.value);
          } catch {
            innerPayload = payload.value;
          }
        }

        // Check if the configured key exists
        if (innerPayload && typeof innerPayload === 'object' && config.keyName in innerPayload) {
          const value = innerPayload[config.keyName];

          if (typeof value === 'number' && !isNaN(value)) {
            const timestamp = payload.Timestamp || innerPayload.Timestamp || new Date().toISOString();

            setData(prevData => {
              // Create a new array with the updated device
              const newData = prevData.map(item => {
                if (item.deviceId === deviceId) {
                  return {
                    ...item,
                    value,
                    timestamp,
                    key: config.keyName
                  };
                }
                return item;
              });

              // If the device wasn't in the list (shouldn't happen with pre-fill, but safety check)
              if (!newData.some(item => item.deviceId === deviceId)) {
                newData.push({
                  deviceId,
                  deviceName,
                  value,
                  timestamp,
                  key: config.keyName,
                });
              }

              // Filter logic (re-applied here to ensure consistency)
              const now = new Date();
              let processedData = [...newData];

              // Apply time filter if needed
              if (timeFilter !== "all") {
                 const filterMs = {
                  "1h": 60 * 60 * 1000,
                  "6h": 6 * 60 * 60 * 1000,
                  "24h": 24 * 60 * 60 * 1000,
                  "7d": 7 * 24 * 60 * 60 * 1000,
                }[timeFilter];

                if (filterMs) {
                   processedData = processedData.filter(item => {
                      if (!item.timestamp) return true; // Keep waiting items
                      const itemTime = new Date(item.timestamp);
                      return (now.getTime() - itemTime.getTime()) <= filterMs;
                   });
                }
              }

              // Sort data based on configuration
              processedData.sort((a, b) => {
                 // Push null values to bottom
                 if (a.value === null && b.value === null) return 0;
                 if (a.value === null) return 1;
                 if (b.value === null) return -1;

                if (config.sortBy === "highest") {
                  return b.value - a.value;
                } else {
                  return a.value - b.value;
                }
              });

              // Limit to configured count
              const limitedData = processedData.slice(0, config.count);

              setFilteredData(limitedData);
              setLastUpdate(new Date());

              return newData; // Update main data state
            });
          }
        }
      } catch (error) {
        console.error(`Error processing MQTT message for device ${deviceId}:`, error);
      }
    };
  }, [config.keyName, config.sortBy, config.count, timeFilter]);

  // Setup MQTT subscriptions for selected devices
  useEffect(() => {
    if (!config.devices?.length || !config.keyName) {
      setStatus("error");
      return;
    }

    const setupSubscriptions = async () => {
      setStatus("loading");

      try {
        // Get device information from API
        const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
        if (!response.ok) throw new Error("Failed to fetch devices");

        const allDevices = await response.json();
        const selectedDevicesInfo = allDevices.filter((d: any) => config.devices.includes(d.uniqId));

        if (selectedDevicesInfo.length === 0) {
          setStatus("empty");
          return;
        }

        // Initialize data with empty values immediately
        const initialData: DeviceValue[] = selectedDevicesInfo.map((d: any) => ({
          deviceId: d.uniqId,
          deviceName: d.name,
          value: null,
          timestamp: null,
          key: config.keyName
        }));

        setData(initialData);
        setFilteredData(initialData.slice(0, config.count));
        setStatus("ok"); // Show table immediately

        // Subscribe to each device's MQTT topic
        const subscriptions: Array<{ topic: string; deviceId: string; deviceName: string }> = [];

        selectedDevicesInfo.forEach((device: any) => {
          if (device.topic) {
            subscriptions.push({
              topic: device.topic,
              deviceId: device.uniqId,
              deviceName: device.name
            });
          }
        });

        // Subscribe to all topics
        subscriptions.forEach(sub => {
          const handler = createMqttHandler(sub.deviceId, sub.deviceName);
          subscribe(sub.topic, handler);
        });

        // Cleanup function
        return () => {
          subscriptions.forEach(sub => {
            const handler = createMqttHandler(sub.deviceId, sub.deviceName);
            unsubscribe(sub.topic, handler);
          });
        };
      } catch (error) {
        console.error("Error setting up subscriptions:", error);
        setStatus("error");
      }
    };

    const cleanup = setupSubscriptions();

    return () => {
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, [config.devices, config.keyName, config.count, subscribe, unsubscribe, createMqttHandler]);

  // Sorting function
  const handleSort = (key: keyof DeviceValue) => {
    const direction = sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });

    const sorted = [...filteredData].sort((a, b) => {
      // Always push null values to the bottom
      const aVal = a[key];
      const bVal = b[key];

      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();

      if (direction === "asc") {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });

    setFilteredData(sorted);
  };

  // Time filtering
  const handleTimeFilter = (filter: string) => {
    setTimeFilter(filter);

    if (filter === "all") {
      setFilteredData(data.slice(0, config.count)); // Re-apply limit
      return;
    }

    const now = new Date();
    const filterMs = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
    }[filter] as number | undefined;

    if (filterMs) {
      const filtered = data.filter(item => {
        if (!item.timestamp) return true; // Keep waiting items
        const itemTime = new Date(item.timestamp);
        return (now.getTime() - itemTime.getTime()) <= filterMs;
      });
      setFilteredData(filtered.slice(0, config.count));
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return "—";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  // Status styling - Matched with IconStatusCardWidget
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
  const headerHeight = 44;

  // Render loading state - Matched styling
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
      <div className="relative">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
             style={{ width: 48, height: 48 }}>
          <Loader2 className="animate-spin text-slate-400 dark:text-slate-500" style={{ width: 24, height: 24 }} />
        </div>
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">Loading data...</p>
    </div>
  );

  // Render error state - Matched styling
  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
      <div className="relative">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
             style={{ width: 48, height: 48 }}>
          {connectionStatus === "Connected" ? (
            <AlertTriangle className="text-red-500" style={{ width: 24, height: 24 }} />
          ) : (
            <WifiOff className="text-slate-500" style={{ width: 24, height: 24 }} />
          )}
        </div>
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">
        {connectionStatus === "Connected" ? "Error loading data" : "Offline"}
      </p>
    </div>
  );

  // Render empty state - Matched styling
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
      <div className="relative">
        <div className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
             style={{ width: 48, height: 48 }}>
          <BarChart3 className="text-slate-400" style={{ width: 24, height: 24 }} />
        </div>
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-400 text-sm">No data available</p>
    </div>
  );

  // Render data table
  const renderDataTable = () => {
    if (layoutMode === "compact") {
      return (
        <div className="space-y-2 p-3">
          {filteredData.map((item, index) => (
            <div key={item.deviceId} className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-100 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs h-5 px-1.5">#{index + 1}</Badge>
                  <span className="font-medium text-sm truncate max-w-[120px]" title={item.deviceName}>{item.deviceName}</span>
                </div>
                <div className="flex items-center gap-1">
                  {config.sortBy === "highest" ? (
                    <TrendingUp className="w-3 h-3 text-green-500" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                 {item.value !== null ? (
                    <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                      {item.value?.toFixed(2)}
                    </span>
                 ) : (
                    <Badge variant="secondary" className="text-xs font-normal bg-slate-200 text-slate-600">Waiting...</Badge>
                 )}
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(item.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="w-full h-full overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
              <TableHead className="w-12 h-8 text-xs font-medium">#</TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 h-8 text-xs font-medium"
                onClick={() => handleSort("deviceName")}
              >
                <div className="flex items-center gap-1">
                  Device
                  {sortConfig.key === "deviceName" && (
                    sortConfig.direction === "asc" ?
                      <ChevronUp className="w-3 h-3" /> :
                      <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 text-right h-8 text-xs font-medium"
                onClick={() => handleSort("value")}
              >
                <div className="flex items-center gap-1 justify-end">
                  Value
                  {sortConfig.key === "value" && (
                    sortConfig.direction === "asc" ?
                      <ChevronUp className="w-3 h-3" /> :
                      <ChevronDown className="w-3 h-3" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right h-8 text-xs font-medium">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((item, index) => {
              const isAboveThreshold = config.thresholdAlert && item.value !== null && item.value > config.thresholdAlert;
              const hasValue = item.value !== null;

              return (
                <TableRow key={item.deviceId} className={`
                  ${isAboveThreshold ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800' : ''}
                  hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-100 dark:border-slate-800
                `}>
                  <TableCell className="py-2">
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${
                        hasValue && index < 3 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    }`}>
                      #{index + 1}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium text-sm py-2 max-w-[140px] truncate" title={item.deviceName}>
                    {item.deviceName}
                  </TableCell>
                  <TableCell className="text-right py-2">
                    <div className="flex items-center justify-end gap-2">
                      {hasValue ? (
                        <span className={`font-bold text-sm ${
                          isAboveThreshold ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'
                        }`}>
                          {item.value?.toFixed(2)}
                        </span>
                      ) : (
                         <span className="text-xs text-slate-400 italic">Waiting...</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-xs text-slate-500 py-2 whitespace-nowrap">
                    {formatTimestamp(item.timestamp)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  const handleWidgetClick = () => {
     // Placeholder for future click action
     // showToast.info("Top Values Comparator", "Details coming soon!");
  };

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden ${isEditMode ? 'cursor-move' : 'cursor-default'}
        bg-white dark:bg-slate-900
        border border-slate-200/60 dark:border-slate-700/60 rounded-xl
        shadow-sm dark:shadow-lg ${isEditMode ? '' : 'hover:shadow-md dark:hover:shadow-xl'}
        transition-all duration-300 ease-out
        group ${isEditMode ? '' : 'hover:scale-[1.005]'} transform-gpu
      `}
      onClick={isEditMode ? undefined : handleWidgetClick}
    >
      {/* Header - Matched with IconStatusCardWidget */}
      <div
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between flex-shrink-0 border-b border-slate-200/60 dark:border-slate-600/80 z-10"
        style={{ height: `${headerHeight}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
          <h3
            className={`font-medium truncate transition-colors duration-200 ${styles.title}`}
            title={config.customName}
          >
            {config.customName}
          </h3>
          {config.thresholdAlert && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hidden sm:inline-block flex-shrink-0">
               &gt; {config.thresholdAlert}
            </span>
          )}
        </div>

        {/* Controls in Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Select value={timeFilter} onValueChange={handleTimeFilter}>
            <SelectTrigger className="h-6 w-[60px] text-[10px] px-2 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="1h">1H</SelectItem>
              <SelectItem value="6h">6H</SelectItem>
              <SelectItem value="24h">24H</SelectItem>
              <SelectItem value="7d">7D</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setStatus("loading");
              setTimeout(() => {
                setData([]);
                setFilteredData([]);
              }, 100);
            }}
            className="h-6 w-6 p-0 hover:bg-slate-200 dark:hover:bg-slate-700"
            disabled={status === "loading"}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${status === "loading" ? "animate-spin" : "text-slate-500"}`} />
          </Button>

          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-600 mx-1" />

          {connectionStatus === "Connected" ? (
            <Wifi className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          )}

          <div
            className={`rounded-full w-2 h-2 ${styles.indicator} ${
              status === 'ok' ? "animate-pulse" : ""
            } transition-all duration-300`}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div
        className="w-full h-full flex flex-col"
        style={{
          paddingTop: `${headerHeight}px`,
        }}
      >
        <div className="flex-1 overflow-auto w-full relative">
          {status === "loading" && renderLoadingState()}
          {status === "error" && renderErrorState()}
          {status === "empty" && renderEmptyState()}
          {status === "ok" && renderDataTable()}
          {status === "waiting" && renderLoadingState()}
        </div>

        {/* Footer info - fade out if small */}
        {lastUpdate && status === 'ok' && (
          <div className="px-3 py-1 text-[10px] text-slate-400 dark:text-slate-500 flex justify-between items-center border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm absolute bottom-0 left-0 right-0 z-10">
            <span>Updated: {lastUpdate.toLocaleTimeString()}</span>
            <span>{filteredData.length} items</span>
          </div>
        )}
      </div>
    </div>
  );
};