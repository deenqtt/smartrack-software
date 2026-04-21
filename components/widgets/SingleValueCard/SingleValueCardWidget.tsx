// File: components/widgets/SingleValueCard/SingleValueCardWidget.tsx
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
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  Clock,
  Pin,
  Info,
  X,
  Database,
  Zap,
  Activity,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
  };
  isEditMode?: boolean; // ✅ NEW: Disable modal click in edit mode
}

const DEFAULT_SINGLE_VALUE_CONFIG: Props["config"] = {
  customName: "Single Value",
  deviceUniqId: "",
  selectedKey: "",
  units: "V",
  multiply: 1,
};

export const SingleValueCardWidget = ({
  config: rawConfig = DEFAULT_SINGLE_VALUE_CONFIG,
  isEditMode = false,
}: Props) => {
  const config = rawConfig ?? DEFAULT_SINGLE_VALUE_CONFIG;

  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null,
  );
  const [previousValue, setPreviousValue] = useState<string | number | null>(
    null,
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "stable" | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [payloadTimestamp, setPayloadTimestamp] = useState<string | null>(null);
  const [isRetain, setIsRetain] = useState<boolean>(false);

  // Modal and device details state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(
    (broker) => broker.status === "connected",
  )
    ? "Connected"
    : "Disconnected";

  // Responsive sizing - SAMA SEPERTI ICON WIDGET
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 24,
    unitFontSize: 14,
    titleFontSize: 12,
    padding: 16,
    headerHeight: 40,
    trendIconSize: 16,
  });

  // Enhanced responsive calculation - CONSISTENT DENGAN ICON WIDGET
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // Dynamic sizing based on available space
      const minDimension = Math.min(width, height);
      const area = width * height;

      // Value font size - larger than icon widget since no icon
      const valueSize = Math.max(
        22,
        Math.min(width * 0.22, availableHeight * 0.28, 72),
      );
      const unitSize = Math.max(14, Math.min(valueSize * 0.5, 32));
      const titleSize = Math.max(11, Math.min(headerHeight * 0.35, 16));
      const padding = Math.max(16, Math.min(width * 0.04, 32));
      const trendSize = Math.max(14, Math.min(titleSize * 1.4, 20));

      setDynamicSizes({
        valueFontSize: Math.round(valueSize),
        unitFontSize: Math.round(unitSize),
        titleFontSize: Math.round(titleSize),
        padding,
        headerHeight,
        trendIconSize: Math.round(trendSize),
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setTopic(null);
      setDisplayValue(null);
      setPreviousValue(null);
      setTrend(null);
      setLastUpdate(null);
      setPayloadTimestamp(null);
      setIsRetain(false);
      setStatus("error");
      setErrorMessage("Please configure a valid device.");
      return;
    }

    if (!config.selectedKey) {
      setTopic(null);
      setDisplayValue(null);
      setPreviousValue(null);
      setTrend(null);
      setLastUpdate(null);
      setPayloadTimestamp(null);
      setIsRetain(false);
      setStatus("error");
      setErrorMessage("Please select a data key.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`,
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Device not found`);
        }
        const deviceData = await response.json();
        if (!deviceData.topic) {
          setTopic(null);
          setStatus("error");
          setErrorMessage("Device has no MQTT topic configured.");
          return;
        }

        setTopic(deviceData.topic);
      } catch (err: any) {
        setTopic(null);
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchDeviceTopic();
  }, [config.deviceUniqId]);

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

        if (innerPayload.hasOwnProperty(config.selectedKey)) {
          const rawValue = innerPayload[config.selectedKey];
          const finalValue =
            typeof rawValue === "number"
              ? rawValue * (config.multiply || 1)
              : rawValue;

          // Calculate trend
          if (
            previousValue !== null &&
            typeof finalValue === "number" &&
            typeof previousValue === "number"
          ) {
            const diff = finalValue - previousValue;
            const threshold = Math.abs(previousValue * 0.01); // 1% threshold

            if (Math.abs(diff) <= threshold) {
              setTrend("stable");
            } else if (diff > 0) {
              setTrend("up");
            } else {
              setTrend("down");
            }
          }

          // Extract timestamp dari payload
          const timestamp = payload.Timestamp || innerPayload.Timestamp || null;
          setPayloadTimestamp(timestamp);

          // Set retain flag dari MQTT message property
          setIsRetain(retained || false);

          setPreviousValue(displayValue);
          setDisplayValue(finalValue);
          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply, previousValue, displayValue],
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => {
        unsubscribe(topic, handleMqttMessage);
      };
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
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
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
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

  const renderTrendIndicator = () => {
    if (!trend || status !== "ok") return null;

    const trendConfig = {
      up: { icon: TrendingUp, color: "text-emerald-500 dark:text-emerald-400" },
      down: { icon: TrendingDown, color: "text-red-500 dark:text-red-400" },
      stable: { icon: Minus, color: "text-slate-400 dark:text-slate-500" },
    };

    const { icon: Icon, color } = trendConfig[trend];

    return (
      <div
        className="flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-700/50"
        style={{
          width: Math.max(dynamicSizes.trendIconSize * 1.6, 22),
          height: Math.max(dynamicSizes.trendIconSize * 1.6, 22),
        }}
      >
        <Icon
          className={color}
          style={{
            width: Math.max(dynamicSizes.trendIconSize * 0.9, 14),
            height: Math.max(dynamicSizes.trendIconSize * 0.9, 14),
          }}
        />
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
                height: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
              }}
            />
          </div>
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Loading data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-2">
          <AlertTriangle
            className="text-red-500 dark:text-red-400"
            style={{
              width: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
              height: Math.max(dynamicSizes.valueFontSize * 1.2, 32),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.9, 11)}px`,
            }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-2">
        <div className="flex items-baseline justify-center gap-2 w-full flex-wrap">
          <span
            className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
            style={{
              fontSize: `${dynamicSizes.valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium transition-colors duration-200 ${styles.unit}`}
              style={{
                fontSize: `${dynamicSizes.unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {config.units}
            </span>
          )}
        </div>
        {lastUpdate && (
          <div
            className={`flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 ${styles.unit}`}
            style={{ fontSize: `${dynamicSizes.titleFontSize * 0.85}px` }}
          >
            <Clock
              className="text-slate-400 dark:text-slate-500 flex-shrink-0"
              style={{
                width: dynamicSizes.titleFontSize * 0.85,
                height: dynamicSizes.titleFontSize * 0.85,
              }}
            />
            <span className="font-mono">
              {formatTime(lastUpdate, payloadTimestamp, isRetain)}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Click handler for showing device details
  const handleWidgetClick = async (e: React.MouseEvent) => {
    // Don't show details if in edit mode
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!config.deviceUniqId) return;

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
          (d: any) => d.uniqId === config.deviceUniqId,
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

  // Calculate trend indicator
  const getTrendIndicator = () => {
    if (displayValue === null || previousValue === null) return null;

    const current = Number(displayValue);
    const prev = Number(previousValue);

    if (isNaN(current) || isNaN(prev)) return null;

    const diff = current - prev;
    if (Math.abs(diff) < 0.001)
      return <Minus className="w-4 h-4 text-gray-400" />;
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const styles = getStatusStyles();

  return (
    <>
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              Device Details: {config.customName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : deviceDetails ? (
              <div className="space-y-4">
                {/* Header with Device Name and Status */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${styles.indicator}`}
                      />
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
                {displayValue !== null && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {formatValue(displayValue)}
                        </span>
                        {config.units && (
                          <span className="text-lg text-blue-600 dark:text-blue-400">
                            {config.units}
                          </span>
                        )}
                      </div>
                      {getTrendIndicator()}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>
                        {lastUpdate
                          ? formatTime(lastUpdate, payloadTimestamp, isRetain)
                          : "Never updated"}
                      </span>
                      {isRetain && (
                        <>
                          <span>•</span>
                          <Pin className="w-3 h-3 text-amber-500" />
                          <span className="text-amber-600">Retained</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

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
                      {config.selectedKey}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Multiplier
                    </div>
                    <div className="font-medium text-sm">
                      {config.multiply || 1}x
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
                      // Could add navigation to device management page
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
                      // Could add toast notification here
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
        className={`
          w-full h-full relative overflow-hidden
          ${isEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer hover:scale-[1.01]"}
          bg-card
          border border-border/60 rounded-xl
          shadow-sm ${isEditMode ? "" : "hover:shadow-md"}
          transition-all duration-300 ease-out
          group transform-gpu
        `}
        style={{
          minWidth: 100,
          minHeight: 80,
        }}
        onClick={handleWidgetClick}
        title={isEditMode ? "Drag to move widget" : "Click to view device details"}
      >
        {/* Header - SAMA SEPERTI ICON WIDGET */}
        <div
          className="absolute top-0 left-0 right-0 px-4 bg-muted/20 flex items-center justify-between flex-shrink-0 border-b border-border/40"
          style={{ height: `${dynamicSizes.headerHeight}px` }}
        >
          <h3
            className={`font-medium truncate transition-colors duration-200 ${styles.title}`}
            style={{
              fontSize: `${dynamicSizes.titleFontSize}px`,
              lineHeight: 1.3,
              flex: 1,
            }}
            title={config.customName}
          >
            {config.customName}
          </h3>

          {/* Status indicators in header */}
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {/* Retain Badge */}
            {isRetain && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700/60">
                <Pin
                  className="text-amber-600 dark:text-amber-400 flex-shrink-0"
                  style={{
                    width: Math.max(dynamicSizes.titleFontSize * 0.7, 10),
                    height: Math.max(dynamicSizes.titleFontSize * 0.7, 10),
                  }}
                />
                <span
                  className="text-amber-700 dark:text-amber-300 font-semibold text-xs"
                  style={{
                    fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.6, 9)}px`,
                  }}
                >
                  RETAIN
                </span>
              </div>
            )}

            {/* Wifi status */}
            {connectionStatus === "Connected" ? (
              <Wifi
                className="text-slate-400 dark:text-slate-500"
                style={{
                  width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                  height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                }}
              />
            ) : (
              <WifiOff
                className="text-slate-400 dark:text-slate-500"
                style={{
                  width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                  height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                }}
              />
            )}

            {/* Status dot */}
            <div
              className={`rounded-full ${styles.indicator} ${
                styles.pulse ? "animate-pulse" : ""
              } transition-all duration-300`}
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
                height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              }}
            />
          </div>
        </div>

        {/* Main content area */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
            paddingBottom: dynamicSizes.padding,
            paddingLeft: dynamicSizes.padding,
            paddingRight: dynamicSizes.padding,
          }}
        >
          {renderContent()}
        </div>

        {/* Minimal hover effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </>
  );
};
