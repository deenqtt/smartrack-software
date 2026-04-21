// File: components/widgets/IconStatusCard/IconStatusCardWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { AlertTriangle, Loader2, WifiOff, Clock, Wifi, Pin, Info, X, Database, Zap, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
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

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    selectedIcon?: string;
    iconColor?: string;
    iconBgColor?: string;
  };
  isEditMode?: boolean;
}

const DEFAULT_ICON_STATUS_CONFIG: Props["config"] = {
  customName: "Icon Status",
  deviceUniqId: "",
  selectedKey: "",
  units: "kW",
  multiply: 1,
  selectedIcon: "Zap",
  iconColor: "#ffffff",
  iconBgColor: "#f59e0b",
};

export const IconStatusCardWidget = ({ config: rawConfig = DEFAULT_ICON_STATUS_CONFIG, isEditMode = false }: Props) => {
  const config = rawConfig ?? DEFAULT_ICON_STATUS_CONFIG;

  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [previousValue, setPreviousValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [payloadTimestamp, setPayloadTimestamp] = useState<string | null>(null);
  const [isRetain, setIsRetain] = useState<boolean>(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(broker => broker.status === 'connected') ? 'Connected' : 'Disconnected';

  // Enhanced responsive layout system
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<
    "horizontal" | "vertical" | "compact"
  >("horizontal");
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 20,
    unitFontSize: 14,
    iconSize: 32,
    titleFontSize: 12,
    padding: 16,
    gap: 12,
    headerHeight: 40,
  });

  // FIXED: Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // FIXED: Better layout mode detection
      const aspectRatio = width / height;
      const area = width * height;
      const minDimension = Math.min(width, height);

      let currentLayoutMode: "horizontal" | "vertical" | "compact";

      // Compact mode for very small widgets
      if (area < 10000 || minDimension < 100) {
        currentLayoutMode = "compact";
      }
      // Horizontal for wide widgets (aspect ratio > 1.5)
      else if (aspectRatio > 1.5 && width > 250) {
        currentLayoutMode = "horizontal";
      }
      // Vertical for tall or square widgets
      else {
        currentLayoutMode = "vertical";
      }

      setLayoutMode(currentLayoutMode);

      // FIXED: Better size calculations with max limits
      const baseScale = Math.sqrt(area) / 150;

      // Calculate header height first
      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Responsive sizes with better proportions - SMALLER ICONS
      const sizes = {
        compact: {
          valueFontSize: Math.max(14, Math.min(minDimension * 0.14, 20)),
          unitFontSize: Math.max(10, Math.min(minDimension * 0.09, 14)),
          iconSize: Math.max(16, Math.min(minDimension * 0.22, 26)),
          titleFontSize: Math.max(10, Math.min(minDimension * 0.09, 13)),
          padding: Math.max(8, minDimension * 0.06),
          gap: Math.max(4, minDimension * 0.04),
          headerHeight: Math.max(32, Math.min(minDimension * 0.3, 44)),
        },
        horizontal: {
          // FIXED: Smaller icon sizes for horizontal layout
          valueFontSize: Math.max(
            18,
            Math.min(availableHeight * 0.35, width * 0.08, 48)
          ),
          unitFontSize: Math.max(
            12,
            Math.min(availableHeight * 0.25, width * 0.055, 24)
          ),
          iconSize: Math.max(
            24,
            Math.min(availableHeight * 0.4, width * 0.08, 56)
          ),
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
          padding: Math.max(16, Math.min(width * 0.04, 32)),
          gap: Math.max(12, Math.min(width * 0.05, 28)),
          headerHeight,
        },
        vertical: {
          // FIXED: Smaller icon sizes for vertical layout
          valueFontSize: Math.max(
            20,
            Math.min(width * 0.18, availableHeight * 0.18, 56)
          ),
          unitFontSize: Math.max(
            13,
            Math.min(width * 0.12, availableHeight * 0.12, 28)
          ),
          iconSize: Math.max(
            28,
            Math.min(width * 0.2, availableHeight * 0.2, 64)
          ),
          titleFontSize: Math.max(12, Math.min(headerHeight * 0.35, 16)),
          padding: Math.max(16, Math.min(height * 0.06, 32)),
          gap: Math.max(10, Math.min(availableHeight * 0.08, 24)),
          headerHeight,
        },
      };

      setDynamicSizes(sizes[currentLayoutMode]);
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
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
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
    (receivedTopic: string, payloadString: string, serverId: string, retained?: boolean) => {
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

          setDisplayValue((prevValue) => {
            setPreviousValue(prevValue); // Set previous value to what displayValue was before this update
            return finalValue;
          });

          // Extract timestamp dari payload (outer atau inner)
          const timestamp = payload.Timestamp || innerPayload.Timestamp || null;
          setPayloadTimestamp(timestamp);

          // Set retain flag dari MQTT message property
          setIsRetain(retained || false);

          setStatus("ok");
          setLastUpdate(new Date());
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply]
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

  const IconComponent = getIconComponent(config.selectedIcon || "Zap");

  // Clean minimal styling with dark mode support
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      iconBg: config.iconBgColor || "#64748B",
      iconColor: config.iconColor || "#FFFFFF",
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
          indicator: "bg-emerald-500 dark:bg-emerald-400",
          pulse: false,
        };
      case "error":
        return {
          ...baseStyles,
          indicator: "bg-red-500 dark:bg-red-400",
          pulse: false,
          title: "text-red-600 dark:text-red-400",
          value: "text-red-700 dark:text-red-300",
        };
      case "loading":
      case "waiting":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-400",
          pulse: true,
          title: "text-slate-600 dark:text-slate-400",
          value: "text-slate-700 dark:text-slate-300",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-600",
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

  const formatTime = (date: Date, payloadTs: string | null, retain: boolean) => {
    // Priority: Kalau ada payload timestamp dari MQTT, gunakan itu
    if (payloadTs) {
      return payloadTs;
    }

    // Kalau retain=true tapi ga ada timestamp, tampilkan dash
    if (retain) {
      return "—";
    }

    // Fallback ke logic lama (untuk widget tanpa timestamp di payload, dan retain=false)
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderLoadingState = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            <Loader2
              className="animate-spin text-slate-400 dark:text-slate-500"
              style={{
                width: dynamicSizes.iconSize * 0.6,
                height: dynamicSizes.iconSize * 0.6,
              }}
            />
          </div>
        </div>
        {layoutMode !== "compact" && (
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Loading data...
          </p>
        )}
      </div>
    );
  };

  const renderErrorState = () => {
    const styles = getStatusStyling();
    const isOffline = connectionStatus !== "Connected";

    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            {isOffline ? (
              <WifiOff
                className="text-slate-500 dark:text-slate-400"
                style={{
                  width: dynamicSizes.iconSize * 0.6,
                  height: dynamicSizes.iconSize * 0.6,
                }}
              />
            ) : (
              <AlertTriangle
                className="text-red-500 dark:text-red-400"
                style={{
                  width: dynamicSizes.iconSize * 0.6,
                  height: dynamicSizes.iconSize * 0.6,
                }}
              />
            )}
          </div>
        </div>
        {layoutMode !== "compact" && (
          <div className="space-y-1">
            <p
              className={`font-semibold ${styles.title}`}
              style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
            >
              {isOffline ? "Offline" : "Error"}
            </p>
            <p
              className={`opacity-80 break-words ${styles.value}`}
              style={{ fontSize: `${dynamicSizes.titleFontSize * 0.8}px` }}
            >
              {layoutMode === "horizontal" && errorMessage.length > 20
                ? `${errorMessage.substring(0, 20)}...`
                : errorMessage}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderWaitingState = () => {
    return (
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div className="relative">
          <div
            className="bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center border border-slate-200 dark:border-slate-600"
            style={{
              width: dynamicSizes.iconSize * 1.3,
              height: dynamicSizes.iconSize * 1.3,
            }}
          >
            <Clock
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: dynamicSizes.iconSize * 0.6,
                height: dynamicSizes.iconSize * 0.6,
              }}
            />
          </div>
        </div>
        {layoutMode !== "compact" && (
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Waiting for data...
          </p>
        )}
      </div>
    );
  };

  const renderMainContent = () => {
    const styles = getStatusStyling();

    if (status === "loading") return renderLoadingState();
    if (status === "error") return renderErrorState();
    if (status === "waiting" && displayValue === null)
      return renderWaitingState();

    // Icon element dengan clean styling
    const iconElement = IconComponent && (
      <div className="relative group flex-shrink-0">
        <div
          className="rounded-xl shadow-sm flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-105 border border-slate-200/50 dark:border-slate-600/50"
          style={{
            backgroundColor: styles.iconBg,
            color: styles.iconColor,
            width: dynamicSizes.iconSize * 1.4,
            height: dynamicSizes.iconSize * 1.4,
            minWidth: dynamicSizes.iconSize * 1.4,
            minHeight: dynamicSizes.iconSize * 1.4,
          }}
        >
          <IconComponent
            style={{
              height: dynamicSizes.iconSize * 0.7,
              width: dynamicSizes.iconSize * 0.7,
            }}
          />
        </div>
      </div>
    );

    // Value element dengan clean typography
    const valueElement = (
      <div
        className="flex flex-col items-center justify-center min-w-0"
        style={{ gap: `${Math.max(4, dynamicSizes.gap * 0.3)}px` }}
      >
        <div className="flex items-baseline gap-1.5 justify-center flex-wrap">
          <span
            className={`font-bold tracking-tight leading-none transition-all duration-300 ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {formatValue(displayValue)}
          </span>
          {config.units && (
            <span
              className={`font-medium ${styles.unit}`}
              style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
            >
              {config.units}
            </span>
          )}
        </div>
        {lastUpdate && layoutMode !== "compact" && (
          // Timestamp Display - Responsive sizing
          <div
            className={`flex items-center justify-center gap-1 px-1.5 py-0.5 ${styles.unit} opacity-70 flex-wrap`}
            style={{ fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.65, 8)}px`, marginTop: `${dynamicSizes.gap * 0.25}px` }}
          >
            <Clock
              className="text-slate-400 dark:text-slate-500 flex-shrink-0"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
                height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              }}
            />
            <span className="font-mono text-center">{formatTime(lastUpdate, payloadTimestamp, isRetain)}</span>
          </div>
        )}
      </div>
    );

    // FIXED: Better layout rendering for each mode
    switch (layoutMode) {
      case "compact":
        return (
          <div
            className="flex flex-col items-center justify-center w-full"
            style={{ gap: `${dynamicSizes.gap * 0.8}px` }}
          >
            {iconElement}
            {valueElement}
          </div>
        );

      case "horizontal":
        return (
          <div
            className="flex items-center justify-center w-full h-full"
            style={{ gap: `${dynamicSizes.gap}px`, maxWidth: "100%" }}
          >
            {iconElement}
            {valueElement}
          </div>
        );

      case "vertical":
      default:
        return (
          <div
            className="flex flex-col items-center justify-center w-full h-full"
            style={{ gap: `${dynamicSizes.gap}px` }}
          >
            {iconElement}
            {valueElement}
          </div>
        );
    }
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
      const deviceResponse = await fetch(`${API_BASE_URL}/api/devices/external`, {
        credentials: 'include'
      });

      if (deviceResponse.ok) {
        const devices = await deviceResponse.json();
        const deviceDetail = devices.find((d: any) => d.uniqId === config.deviceUniqId);

        if (deviceDetail) {
          setDeviceDetails(deviceDetail);
        }
      }
    } catch (error) {
      console.error('Failed to fetch device details:', error);
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
    if (Math.abs(diff) < 0.001) return <Minus className="w-4 h-4 text-gray-400" />;
    if (diff > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const styles = getStatusStyling();

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
                      <div className={`w-2 h-2 rounded-full ${styles.indicator}`} />
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
                      <span>{lastUpdate ? formatTime(lastUpdate, payloadTimestamp, isRetain) : 'Never updated'}</span>
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
                    <div className="text-xs text-muted-foreground mb-1">Device ID</div>
                    <div className="font-mono text-sm truncate" title={deviceDetails.uniqId}>
                      {deviceDetails.uniqId}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">MQTT Topic</div>
                    <div className="font-mono text-sm truncate" title={deviceDetails.topic}>
                      {deviceDetails.topic}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Parameter</div>
                    <div className="font-medium text-sm">{config.selectedKey}</div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Multiplier</div>
                    <div className="font-medium text-sm">{config.multiply || 1}x</div>
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
                      console.log('Navigate to device management');
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
          ${isEditMode ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:scale-[1.01]'}
          bg-white dark:bg-slate-900
          border border-slate-200/60 dark:border-slate-700/60 rounded-xl
          shadow-sm dark:shadow-lg hover:shadow-md dark:hover:shadow-xl
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
        {/* FIXED: Header with dynamic height */}
        <div
          className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between flex-shrink-0 border-b border-slate-200/60 dark:border-slate-600/80"
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
          {/* Status indicators - in header */}
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
                <span className="text-amber-700 dark:text-amber-300 font-semibold text-xs" style={{ fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.6, 9)}px` }}>
                  RETAIN
                </span>
              </div>
            )}

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
            <div
              className={`rounded-full ${styles.indicator} ${styles.pulse ? "animate-pulse" : ""
                } transition-all duration-300`}
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
                height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              }}
            />
          </div>
        </div>

        {/* FIXED: Main content with proper spacing from header */}
        <div
          className="w-full h-full flex items-center justify-center"
          style={{
            paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
            paddingBottom: dynamicSizes.padding,
            paddingLeft: dynamicSizes.padding,
            paddingRight: dynamicSizes.padding,
          }}
        >
          {renderMainContent()}
        </div>

        {/* Minimal hover effects */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </div>
    </>
  );
};
