// File: components/widgets/BreakerStatus/BreakerStatusWidget.tsx
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
  Power,
  PowerOff,
  Zap,
  Wifi,
  WifiOff,
  Clock,
  Pin,
  Database,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
    widgetTitle: string;
    isTripEnabled: boolean;
    monitoring: {
      deviceTopic: string;
      selectedKey: string;
      onValue: string;
      offValue: string;
    };
    trip: {
      deviceTopic: string;
      selectedKey: string;
    } | null;
  };
  isEditMode?: boolean; // ✅ NEW: Disable modal click in edit mode
}

export const BreakerStatusWidget = ({ config, isEditMode = false }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(
    (broker) => broker.status === "connected",
  )
    ? "Connected"
    : "Disconnected";

  const [monitoringStatus, setMonitoringStatus] = useState<
    "UNKNOWN" | "ON" | "OFF"
  >("UNKNOWN");
  const [tripStatus, setTripStatus] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Modal and device details state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<
    "compact" | "normal" | "horizontal"
  >("normal");
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    statusFontSize: 20,
    iconSize: 48,
    padding: 16,
    headerHeight: 40,
  });

  // RESPONSIVE CALCULATION
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      setDimensions({ width: w, height: h });

      // Layout mode detection
      const aspectRatio = w / h;
      const minDimension = Math.min(w, h);

      if (w < 180 || h < 120) {
        setLayoutMode("compact");
      } else if (aspectRatio > 1.5 && w > 300) {
        setLayoutMode("horizontal");
      } else {
        setLayoutMode("normal");
      }

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(h * 0.12, 48));
      const availableHeight = h - headerHeight;

      // Dynamic sizing
      const baseSize = Math.sqrt(w * h);

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        statusFontSize: Math.max(
          16,
          Math.min(baseSize * 0.08, availableHeight * 0.15, 40),
        ),
        iconSize: Math.max(
          32,
          Math.min(baseSize * 0.15, availableHeight * 0.35, 80),
        ),
        padding: Math.max(12, Math.min(baseSize * 0.05, 24)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Handle trip status
        if (
          config.isTripEnabled &&
          config.trip &&
          config.trip.selectedKey &&
          innerPayload.hasOwnProperty(config.trip.selectedKey)
        ) {
          if (topic === config.trip.deviceTopic) {
            setTripStatus(Boolean(innerPayload[config.trip.selectedKey]));
          }
        }

        // Handle monitoring status
        if (
          config.monitoring &&
          config.monitoring.selectedKey &&
          innerPayload.hasOwnProperty(config.monitoring.selectedKey)
        ) {
          if (topic === config.monitoring.deviceTopic) {
            const rawValue = String(
              innerPayload[config.monitoring.selectedKey],
            );
            if (rawValue === String(config.monitoring.onValue)) {
              setMonitoringStatus("ON");
            } else if (rawValue === String(config.monitoring.offValue)) {
              setMonitoringStatus("OFF");
            } else {
              setMonitoringStatus("UNKNOWN");
            }
          }
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Failed to parse MQTT payload for breaker status:", e);
      }
    },
    [config],
  );

  // Subscribe to MQTT topics
  useEffect(() => {
    if (
      !config.monitoring?.deviceTopic ||
      !isReady ||
      connectionStatus !== "Connected"
    ) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const monitoringTopic = config.monitoring.deviceTopic;
    const tripTopic = config.isTripEnabled ? config.trip?.deviceTopic : null;

    subscribe(monitoringTopic, handleMqttMessage);

    if (tripTopic && tripTopic !== monitoringTopic) {
      subscribe(tripTopic, handleMqttMessage);
    }

    return () => {
      unsubscribe(monitoringTopic, handleMqttMessage);
      if (tripTopic && tripTopic !== monitoringTopic) {
        unsubscribe(tripTopic, handleMqttMessage);
      }
    };
  }, [
    config,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Determine final status: TRIP > ON/OFF > UNKNOWN
  const finalStatus = tripStatus ? "TRIP" : monitoringStatus;

  // Status configuration - dengan dark mode
  const getStatusConfig = (status: string) => {
    const configs = {
      TRIP: {
        icon: Zap,
        color: "text-amber-600 dark:text-amber-400",
        bgColor: "bg-amber-50/80 dark:bg-amber-950/30",
        borderColor: "border-amber-200/50 dark:border-amber-800/30",
        dotColor: "bg-amber-500 dark:bg-amber-500",
        label: "TRIP",
        indicator: "bg-amber-500 dark:bg-amber-500",
        pulse: true,
      },
      ON: {
        icon: Power,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-50/80 dark:bg-green-950/30",
        borderColor: "border-green-200/50 dark:border-green-800/30",
        dotColor: "bg-green-500 dark:bg-green-500",
        label: "ON",
        indicator: "bg-green-500 dark:bg-green-500",
        pulse: true,
      },
      OFF: {
        icon: PowerOff,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-50/80 dark:bg-red-950/30",
        borderColor: "border-red-200/50 dark:border-red-800/30",
        dotColor: "bg-red-500 dark:bg-red-500",
        label: "OFF",
        indicator: "bg-red-500 dark:bg-red-500",
        pulse: false,
      },
      UNKNOWN: {
        icon: AlertTriangle,
        color: "text-slate-500 dark:text-slate-400",
        bgColor: "bg-slate-50/80 dark:bg-slate-900/30",
        borderColor: "border-slate-200/50 dark:border-slate-700/30",
        dotColor: "bg-slate-400 dark:bg-slate-500",
        label: "UNKNOWN",
        indicator: "bg-slate-400 dark:bg-slate-500",
        pulse: false,
      },
    };
    return configs[status as keyof typeof configs] || configs.UNKNOWN;
  };

  const statusConfig = getStatusConfig(finalStatus);
  const StatusIcon = statusConfig.icon;

  // Render content based on state
  const renderContent = () => {
    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.iconSize * 0.6,
              height: dynamicSizes.iconSize * 0.6,
            }}
          />
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
          >
            Loading...
          </p>
        </div>
      );
    }

    // Success state - show breaker status
    return (
      <div
        className={cn(
          "flex items-center justify-center w-full h-full",
          layoutMode === "horizontal" ? "flex-row gap-6" : "flex-col gap-4",
        )}
      >
        {/* Status Icon with pulse effect */}
        <div className="relative group">
          {/* Pulse effect for active states */}
          {statusConfig.pulse && (
            <div
              className={cn(
                "absolute inset-0 rounded-xl opacity-20 animate-ping",
                statusConfig.dotColor,
              )}
            />
          )}

          {/* Icon container */}
          <div
            className={cn(
              "relative rounded-xl border-2 transition-all duration-300",
              "flex items-center justify-center",
              "group-hover:scale-105",
              statusConfig.bgColor,
              statusConfig.borderColor,
            )}
            style={{
              width: dynamicSizes.iconSize * 1.5,
              height: dynamicSizes.iconSize * 1.5,
              padding: `${dynamicSizes.padding * 0.5}px`,
            }}
          >
            <StatusIcon
              className={statusConfig.color}
              style={{
                width: dynamicSizes.iconSize,
                height: dynamicSizes.iconSize,
              }}
            />
          </div>

          {/* Status dot */}
          <div
            className={cn(
              "absolute -bottom-1.5 -right-1.5 rounded-full",
              "border-2 border-white dark:border-slate-800",
              statusConfig.dotColor,
              statusConfig.pulse ? "animate-pulse" : "",
            )}
            style={{
              width: Math.max(dynamicSizes.iconSize * 0.2, 12),
              height: Math.max(dynamicSizes.iconSize * 0.2, 12),
            }}
          />
        </div>

        {/* Status label */}
        <div
          className={cn("font-bold text-center", statusConfig.color)}
          style={{ fontSize: `${dynamicSizes.statusFontSize}px` }}
        >
          {statusConfig.label}
        </div>
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
        // Find device by monitoring topic
        const deviceDetail = devices.find(
          (d: any) => d.topic === config.monitoring.deviceTopic,
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

  const styles = {
    title: "text-slate-700 dark:text-slate-300",
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-card dark:bg-card
                 border border-border/60 dark:border-border/40
                 rounded-xl shadow-sm ${isEditMode ? "" : "hover:shadow-md"}
                 transition-all duration-300 ease-out
                 overflow-hidden group
                 ${isEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
      onClick={handleWidgetClick}
      title={isEditMode ? "Drag to move widget" : "Click to view device details"}
    >
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              Device Details: {config.widgetTitle}
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
                        className={`w-2 h-2 rounded-full ${statusConfig.indicator}`}
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

                {/* Current Status Display */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                        {statusConfig.label}
                      </span>
                      <span className="text-lg text-blue-600 dark:text-blue-400">
                        Status
                      </span>
                    </div>
                    <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>Breaker monitoring active</span>
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
                      {config.monitoring.selectedKey}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Trip Enabled
                    </div>
                    <div className="font-medium text-sm">
                      {config.isTripEnabled ? "Yes" : "No"}
                    </div>
                  </div>
                </div>

                {/* Status Values */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      ON Value
                    </div>
                    <div className="font-medium text-sm text-green-600">
                      {config.monitoring.onValue}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      OFF Value
                    </div>
                    <div className="font-medium text-sm text-red-600">
                      {config.monitoring.offValue}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      Trip Status
                    </div>
                    <div
                      className={`font-medium text-sm ${tripStatus ? "text-amber-600" : "text-gray-500"}`}
                    >
                      {tripStatus ? "TRIPPED" : "Normal"}
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
      {/* HEADER - Fixed position dengan pattern konsisten */}
      <div
        className="absolute top-0 left-0 right-0 px-4
                   bg-slate-50/50 dark:bg-slate-900/30 
                   flex items-center justify-between flex-shrink-0
                   border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap
            className="text-slate-500 dark:text-slate-400 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
              height: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
            }}
          />
          <h3
            className={cn(
              "font-medium truncate transition-colors duration-200",
              styles.title,
            )}
            style={{
              fontSize: `${dynamicSizes.titleFontSize}px`,
              lineHeight: 1.3,
            }}
            title={config.widgetTitle}
          >
            {config.widgetTitle}
          </h3>
        </div>

        {/* Right: Status indicators - KONSISTEN DENGAN WIDGET LAIN */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Wifi status icon */}
          {connectionStatus === "Connected" && isReady ? (
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

          {/* Status indicator dot */}
          <div
            className={cn(
              "rounded-full transition-all duration-300",
              statusConfig.indicator,
              statusConfig.pulse ? "animate-pulse" : "",
            )}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* CONTENT - with proper spacing from header */}
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

      {/* Minimal hover effect - KONSISTEN DENGAN WIDGET LAIN */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
