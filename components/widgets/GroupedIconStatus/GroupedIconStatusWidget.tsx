// File: components/widgets/GroupedIconStatus/GroupedIconStatusWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  Loader2,
  AlertTriangle,
  WifiOff,
  Clock,
  CheckCircle2,
  XCircle,
  List,
  Wifi,
  Pin,
  Info,
  X,
  Database,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface ItemConfig {
  customName: string;
  deviceUniqId: string;
  selectedKey: string;
  units: string;
  multiply: number;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
}

// FIXED: Clean minimal StatusRow component with smaller icons
const StatusRow = ({
  itemConfig,
  layoutMode,
  dynamicSizes,
  onClick,
  isEditMode = false, // ✅ NEW
}: {
  itemConfig: ItemConfig;
  layoutMode: "mini" | "compact" | "normal";
  dynamicSizes: {
    iconSize: number;
    fontSize: number;
    padding: number;
    gap: number;
  };
  onClick?: () => void;
  isEditMode?: boolean; // ✅ NEW
}) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(
    (broker) => broker.status === "connected",
  )
    ? "Connected"
    : "Disconnected";
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null,
  );
  const [topic, setTopic] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading",
  );
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [payloadTimestamp, setPayloadTimestamp] = useState<string | null>(null);
  const [isRetain, setIsRetain] = useState<boolean>(false);

  useEffect(() => {
    if (!itemConfig.deviceUniqId) {
      setTopic(null);
      setDisplayValue(null);
      setLastUpdate(null);
      setPayloadTimestamp(null);
      setIsRetain(false);
      setStatus("error");
      return;
    }

    if (!itemConfig.selectedKey) {
      setTopic(null);
      setDisplayValue(null);
      setLastUpdate(null);
      setPayloadTimestamp(null);
      setIsRetain(false);
      setStatus("error");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${itemConfig.deviceUniqId}`,
        );
        if (!response.ok) {
          setStatus("error");
          return;
        }
        const deviceData = await response.json();
        if (!deviceData.topic) {
          setTopic(null);
          setStatus("error");
          return;
        }

        setTopic(deviceData.topic);
      } catch (err) {
        setTopic(null);
        setStatus("error");
        console.error(err);
      }
    };
    fetchDeviceTopic();
  }, [itemConfig.deviceUniqId]);

  const handleMqttMessage = useCallback(
    (
      receivedTopic: string,
      payloadString: string,
      serverId: string,
      retained?: boolean,
    ) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(itemConfig.selectedKey)) {
          const rawValue = innerPayload[itemConfig.selectedKey];
          const multiplier = itemConfig.multiply || 1;
          const finalValue =
            typeof rawValue === "number" ? rawValue * multiplier : rawValue;

          // Extract timestamp dari payload
          const timestamp = payload.Timestamp || innerPayload.Timestamp || null;
          setPayloadTimestamp(timestamp);

          // Set retain flag dari MQTT message property
          setIsRetain(retained || false);

          setDisplayValue(finalValue);
          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        /* silent fail */
      }
    },
    [itemConfig.selectedKey, itemConfig.multiply],
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => {
        unsubscribe(topic, handleMqttMessage);
      };
    } else if (connectionStatus !== "Connected") {
      setStatus("error");
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    itemConfig.deviceUniqId,
  ]);

  const IconComponent = getIconComponent(itemConfig.selectedIcon || "Zap");

  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      iconBg: itemConfig.iconBgColor || "#64748B",
      iconColor: itemConfig.iconColor || "#FFFFFF",
    };

    // Priority: Kalau retain, tampilkan cyan
    if (isRetain && status === "ok") {
      return {
        ...baseStyles,
        indicator: "bg-cyan-500 dark:bg-cyan-400",
        pulse: false,
      };
    }

    switch (status) {
      case "ok":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-500",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-500",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
          title: "text-slate-600 dark:text-slate-400",
          value: "text-slate-700 dark:text-slate-300",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";

    if (typeof value === "number") {
      if (Math.abs(value) >= 1000000) {
        return (
          (value / 1000000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "M"
        );
      }
      if (Math.abs(value) >= 1000) {
        return (
          (value / 1000).toLocaleString(undefined, {
            maximumFractionDigits: 1,
            minimumFractionDigits: 0,
          }) + "K"
        );
      }
      return value.toLocaleString(undefined, {
        maximumFractionDigits: layoutMode === "mini" ? 0 : 1,
        minimumFractionDigits: 0,
      });
    }

    return String(value);
  };

  const formatTime = (
    date: Date,
    payloadTs: string | null,
    retain: boolean,
  ) => {
    // Priority: Kalau ada payload timestamp dari MQTT, gunakan itu
    if (payloadTs) {
      return payloadTs;
    }

    // Fallback ke logic lama (untuk widget tanpa timestamp di payload)
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderStatusIcon = () => {
    const iconSize = Math.max(dynamicSizes.iconSize * 0.5, 10);

    switch (status) {
      case "loading":
        return (
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "error":
        return connectionStatus !== "Connected" ? (
          <WifiOff
            className="text-slate-500 dark:text-slate-400"
            style={{ width: iconSize, height: iconSize }}
          />
        ) : (
          <XCircle
            className="text-red-500 dark:text-red-400"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "waiting":
        return (
          <Clock
            className="text-slate-400 dark:text-slate-500"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      case "ok":
        return (
          <CheckCircle2
            className="text-emerald-500 dark:text-emerald-400"
            style={{ width: iconSize, height: iconSize }}
          />
        );
      default:
        return null;
    }
  };

  const renderValue = () => {
    const styles = getStatusStyles();

    if (
      status === "loading" ||
      status === "error" ||
      (status === "waiting" && displayValue === null)
    ) {
      return (
        <div className="flex items-center gap-1.5">
          {renderStatusIcon()}
          <span
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.75}px` }}
          >
            {status === "loading"
              ? "Loading..."
              : status === "error"
                ? "Error"
                : "Waiting..."}
          </span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span
            className={`font-bold tracking-tight transition-colors duration-200 ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.fontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {itemConfig.units && (
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${dynamicSizes.fontSize * 0.65}px` }}
            >
              {itemConfig.units}
            </span>
          )}
        </div>

        {/* Retain Badge */}
        {isRetain && layoutMode === "normal" && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60 w-fit">
            <Pin
              className="text-amber-600 dark:text-amber-400 flex-shrink-0"
              style={{
                width: Math.max(dynamicSizes.fontSize * 0.5, 9),
                height: Math.max(dynamicSizes.fontSize * 0.5, 9),
              }}
            />
            <span
              className="text-amber-700 dark:text-amber-300 font-semibold"
              style={{ fontSize: `${dynamicSizes.fontSize * 0.55}px` }}
            >
              RETAIN
            </span>
          </div>
        )}

        {lastUpdate && layoutMode === "normal" && (
          <p
            className={`flex items-center gap-1 ${styles.unit} opacity-60`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.55}px` }}
          >
            <Clock
              style={{
                width: dynamicSizes.fontSize * 0.55,
                height: dynamicSizes.fontSize * 0.55,
              }}
            />
            {formatTime(lastUpdate, payloadTimestamp, isRetain)}
          </p>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      className={`
        relative group transition-all duration-200 ease-out
        bg-card border border-border/60 rounded-lg
        shadow-sm ${isEditMode ? "" : "hover:shadow-md hover:scale-[1.01]"} transform-gpu
        overflow-hidden ${isEditMode ? "cursor-move" : "cursor-pointer"}
      `}
      style={{ padding: `${dynamicSizes.padding}px` }}
      onClick={isEditMode ? undefined : onClick}
      title={
        isEditMode
          ? "Edit mode: Use edit button to configure widget"
          : "Click to view device details"
      }
    >
      <div
        className="flex items-center"
        style={{ gap: `${dynamicSizes.gap}px` }}
      >
        {/* FIXED: Smaller icon with better proportions */}
        {IconComponent && (
          <div className="relative flex-shrink-0">
            <div
              className="rounded-lg flex items-center justify-center shadow-sm
                         transition-all duration-200 ease-out
                         border border-slate-200/50 dark:border-slate-600/50"
              style={{
                backgroundColor: styles.iconBg,
                color: styles.iconColor,
                width: dynamicSizes.iconSize * 1.15,
                height: dynamicSizes.iconSize * 1.15,
                minWidth: dynamicSizes.iconSize * 1.15,
                minHeight: dynamicSizes.iconSize * 1.15,
              }}
            >
              <IconComponent
                style={{
                  height: dynamicSizes.iconSize * 0.65,
                  width: dynamicSizes.iconSize * 0.65,
                }}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <p
            className={`font-medium truncate leading-tight transition-colors duration-200 ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.fontSize * 0.8}px` }}
            title={itemConfig.customName}
          >
            {layoutMode === "mini" && itemConfig.customName.length > 15
              ? `${itemConfig.customName.substring(0, 15)}...`
              : itemConfig.customName}
          </p>
          {renderValue()}
        </div>

        {/* FIXED: Status indicator moved to right side */}
        <div className="flex-shrink-0 ml-2">
          <div
            className={`
              rounded-full transition-all duration-300
              ${styles.indicator}
              ${styles.pulse ? "animate-pulse" : ""}
            `}
            style={{
              width: Math.max(dynamicSizes.fontSize * 0.5, 7),
              height: Math.max(dynamicSizes.fontSize * 0.5, 7),
            }}
          />
        </div>
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
    </div>
  );
};

interface Props {
  config: {
    title: string;
    items: ItemConfig[];
  };
  isEditMode?: boolean; // ✅ NEW: Disable modal click in edit mode
}

const DEFAULT_CONFIG: Props["config"] = {
  title: "Grouped Status",
  items: [],
};

export const GroupedIconStatusWidget = ({
  config = DEFAULT_CONFIG,
  isEditMode = false,
}: Props) => {
  const { brokers } = useMqttServer();

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(
    (broker) => broker.status === "connected",
  )
    ? "Connected"
    : "Disconnected";

  // Modal and device details state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [selectedItemConfig, setSelectedItemConfig] =
    useState<ItemConfig | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutConfig, setLayoutConfig] = useState({
    columnCount: 1,
    layoutMode: "normal" as "mini" | "compact" | "normal",
    dynamicSizes: {
      iconSize: 20,
      fontSize: 14,
      padding: 12,
      gap: 12,
      headerHeight: 48,
      titleFontSize: 14,
    },
  });

  // FIXED: Enhanced responsive system with better thresholds
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      const itemCount = config?.items?.length || 1;
      const aspectRatio = width / height;

      // FIXED: Calculate header height first
      const headerHeight = Math.max(36, Math.min(height * 0.2, 56));
      const availableHeight = height - headerHeight - 24; // 24 for padding

      // FIXED: Better layout mode detection
      let layoutMode: "mini" | "compact" | "normal";
      const minDimension = Math.min(width, height);

      if (minDimension < 200 || availableHeight < 120) {
        layoutMode = "mini";
      } else if (minDimension < 320 || availableHeight < 220) {
        layoutMode = "compact";
      } else {
        layoutMode = "normal";
      }

      // FIXED: Smarter column count based on width AND height
      let columnCount = 1;
      const minCardWidth =
        layoutMode === "mini" ? 140 : layoutMode === "compact" ? 180 : 220;
      const maxPossibleColumns = Math.floor(width / minCardWidth);

      if (maxPossibleColumns >= 2 && itemCount > 1) {
        // Calculate optimal rows
        const itemsPerColumn = Math.ceil(itemCount / maxPossibleColumns);
        const estimatedRowHeight =
          layoutMode === "mini" ? 60 : layoutMode === "compact" ? 80 : 100;
        const neededHeight = itemsPerColumn * estimatedRowHeight;

        if (neededHeight <= availableHeight) {
          columnCount = Math.min(maxPossibleColumns, Math.ceil(itemCount / 2));
        }
      }

      // Calculate items per column for sizing
      const itemsPerColumn = Math.ceil(itemCount / columnCount);
      const availableHeightPerItem = availableHeight / itemsPerColumn;

      // FIXED: More proportional sizes
      const sizes = {
        mini: {
          iconSize: Math.max(14, Math.min(availableHeightPerItem / 4.5, 18)),
          fontSize: Math.max(10, Math.min(availableHeightPerItem / 6, 13)),
          padding: Math.max(6, Math.min(availableHeightPerItem / 10, 10)),
          gap: Math.max(6, Math.min(availableHeightPerItem / 12, 10)),
          headerHeight,
          titleFontSize: Math.max(10, Math.min(headerHeight * 0.32, 13)),
        },
        compact: {
          iconSize: Math.max(16, Math.min(availableHeightPerItem / 4, 22)),
          fontSize: Math.max(12, Math.min(availableHeightPerItem / 5.5, 15)),
          padding: Math.max(8, Math.min(availableHeightPerItem / 9, 12)),
          gap: Math.max(8, Math.min(availableHeightPerItem / 10, 12)),
          headerHeight,
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 15)),
        },
        normal: {
          iconSize: Math.max(18, Math.min(availableHeightPerItem / 3.5, 26)),
          fontSize: Math.max(13, Math.min(availableHeightPerItem / 5, 17)),
          padding: Math.max(10, Math.min(availableHeightPerItem / 7, 14)),
          gap: Math.max(10, Math.min(availableHeightPerItem / 8, 14)),
          headerHeight,
          titleFontSize: Math.max(12, Math.min(headerHeight * 0.35, 16)),
        },
      };

      setLayoutConfig({
        columnCount,
        layoutMode,
        dynamicSizes: sizes[layoutMode],
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, [config?.items?.length]);

  if (!config || !config.items) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-card border border-border/60 rounded-xl shadow-sm">
        <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-3" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
          Widget not configured. Please open settings to configure.
        </p>
      </div>
    );
  }

  if (config.items.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-card border border-border/60 rounded-xl shadow-sm">
        <AlertTriangle className="h-8 w-8 text-amber-500 dark:text-amber-400 mb-3" />
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
          Please configure at least one grouped status item.
        </p>
      </div>
    );
  }

  // Click handler for showing device details
  const handleItemClick = async (itemConfig: ItemConfig) => {
    setSelectedItemConfig(itemConfig);
    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);

    try {
      // Fetch detailed device information
      const deviceResponse = await fetch(
        `${API_BASE_URL}/api/devices/external`,
        {
          credentials: "include",
        },
      );

      if (deviceResponse.ok) {
        const devices = await deviceResponse.json();
        const deviceDetail = devices.find(
          (d: any) => d.uniqId === itemConfig.deviceUniqId,
        );

        if (deviceDetail) {
          setDeviceDetails(deviceDetail);
        }
      }
    } catch (error) {
      console.error("Failed to fetch device details:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // FIXED: Calculate status summary for header
  const statusSummary = {
    total: config.items.length,
  };

  return (
    <>
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              Device Details: {selectedItemConfig?.customName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : deviceDetails && selectedItemConfig ? (
              <div className="space-y-4">
                {/* Header with Device Name and Status */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="font-medium">{deviceDetails.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {connectionStatus === "Connected" ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span>{connectionStatus}</span>
                  </div>
                </div>

                {/* Current Value Display */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        Live Data
                      </span>
                      <span className="text-lg text-blue-600 dark:text-blue-400">
                        {selectedItemConfig.units || "Value"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Real-time monitoring active</span>
                  </div>
                </div>

                {/* Key Information Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Device ID
                    </div>
                    <div
                      className="font-mono text-sm truncate"
                      title={deviceDetails.uniqId}
                    >
                      {deviceDetails.uniqId}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      MQTT Topic
                    </div>
                    <div
                      className="font-mono text-sm truncate"
                      title={deviceDetails.topic}
                    >
                      {deviceDetails.topic}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Parameter
                    </div>
                    <div className="font-medium text-sm">
                      {selectedItemConfig.selectedKey}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Multiplier
                    </div>
                    <div className="font-medium text-sm">
                      {selectedItemConfig.multiply || 1}x
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      console.log("Navigate to device management");
                    }}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Manage Device
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(deviceDetails.uniqId);
                    }}
                  >
                    Copy ID
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Device Not Found
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Unable to load device information.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div
        ref={containerRef}
        className="w-full h-full flex flex-col
                   bg-card
                   border border-border/60 rounded-xl
                   shadow-sm hover:shadow-md
                   transition-all duration-300 ease-out
                   overflow-hidden"
        style={{
          minWidth: 100,
          minHeight: 80,
        }}
      >
        {/* FIXED: Header with dynamic sizing */}
        <div
          className="flex items-center justify-between px-4 py-2 bg-slate-50/80 dark:bg-slate-800/40 border-b border-border/60 flex-shrink-0"
          style={{ height: `${layoutConfig.dynamicSizes.headerHeight}px` }}
        >
          <h3
            className="font-semibold text-slate-900 dark:text-slate-100 truncate"
            style={{ fontSize: `${layoutConfig.dynamicSizes.titleFontSize}px` }}
            title={config.title}
          >
            {config.title}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-medium text-slate-500 dark:text-slate-400"
              style={{
                fontSize: `${layoutConfig.dynamicSizes.titleFontSize * 0.75}px`,
              }}
            >
              {statusSummary.total} items
            </span>
          </div>
        </div>

        {/* FIXED: Content area with grid layout */}
        <div className="flex-1 overflow-hidden p-3">
          <div
            className="grid gap-2 h-full overflow-y-auto"
            style={{
              gridTemplateColumns: `repeat(${layoutConfig.columnCount}, 1fr)`,
            }}
          >
            {config.items.map((item, index) => (
              <StatusRow
                key={`${item.deviceUniqId}-${index}`}
                itemConfig={item}
                layoutMode={layoutConfig.layoutMode}
                dynamicSizes={layoutConfig.dynamicSizes}
                onClick={() => handleItemClick(item)}
                isEditMode={isEditMode}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
};
