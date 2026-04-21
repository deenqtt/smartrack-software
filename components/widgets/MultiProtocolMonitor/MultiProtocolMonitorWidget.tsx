// File: components/widgets/MultiProtocolMonitor/MultiProtocolMonitorWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Loader2,
  AlertTriangle,
  RadioTower,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Configuration type for each monitored key
interface MonitoredKeyConfig {
  key: string;
  customName: string;
  onValue: string;
  offValue: string;
}

interface Props {
  config: {
    widgetTitle: string;
    deviceTopic: string;
    monitoredKeys: MonitoredKeyConfig[];
  };
}

export const MultiProtocolMonitorWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();

  const [keyStatuses, setKeyStatuses] = useState<
    Record<string, "ON" | "OFF" | "UNKNOWN">
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "grid">(
    "normal"
  );
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    itemFontSize: 11,
    summaryFontSize: 10,
    iconSize: 16,
    padding: 16,
    gap: 8,
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

      const itemCount = config.monitoredKeys?.length || 1;
      const aspectRatio = w / h;
      const area = w * h;

      // Layout mode detection
      let currentLayoutMode: "compact" | "normal" | "grid";

      if (area < 20000 || h < 120) {
        currentLayoutMode = "compact";
      } else if (itemCount > 4 && aspectRatio > 1.2 && w > 300) {
        currentLayoutMode = "grid";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(h * 0.12, 48));
      const availableHeight = h - headerHeight;

      // Dynamic sizing
      const baseSize = Math.sqrt(area);

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        itemFontSize: Math.max(10, Math.min(baseSize * 0.04, 14)),
        summaryFontSize: Math.max(9, Math.min(baseSize * 0.035, 12)),
        iconSize: Math.max(14, Math.min(baseSize * 0.045, 20)),
        padding: Math.max(12, Math.min(baseSize * 0.05, 20)),
        gap: Math.max(6, Math.min(baseSize * 0.025, 12)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [config.monitoredKeys?.length]);

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        const newStatuses: Record<string, "ON" | "OFF" | "UNKNOWN"> = {};

        config.monitoredKeys.forEach((keyConfig) => {
          if (innerPayload.hasOwnProperty(keyConfig.key)) {
            const rawValue = String(innerPayload[keyConfig.key]);
            if (rawValue === String(keyConfig.onValue)) {
              newStatuses[keyConfig.key] = "ON";
            } else if (rawValue === String(keyConfig.offValue)) {
              newStatuses[keyConfig.key] = "OFF";
            } else {
              newStatuses[keyConfig.key] = "UNKNOWN";
            }
          } else {
            newStatuses[keyConfig.key] = "UNKNOWN";
          }
        });

        setKeyStatuses(newStatuses);
        setLastUpdate(new Date());
        setIsLoading(false);
      } catch (e) {
        console.error(
          "Failed to parse MQTT payload for multi-protocol monitor:",
          e
        );
        setIsLoading(false);
      }
    },
    [config.monitoredKeys]
  );

  // Subscribe to MQTT topic
  useEffect(() => {
    if (config.deviceTopic && isReady && connectionStatus === "Connected") {
      setIsLoading(true);
      subscribe(config.deviceTopic, handleMqttMessage);
      return () => {
        unsubscribe(config.deviceTopic, handleMqttMessage);
      };
    } else {
      setIsLoading(false);
    }
  }, [
    config.deviceTopic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Status configuration - dengan dark mode
  const getStatusConfig = (status: "ON" | "OFF" | "UNKNOWN") => {
    switch (status) {
      case "ON":
        return {
          icon: CheckCircle2,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
          border: "border-emerald-200/50 dark:border-emerald-800/30",
          dot: "bg-emerald-500 dark:bg-emerald-500",
          label: "ON",
        };
      case "OFF":
        return {
          icon: XCircle,
          color: "text-slate-600 dark:text-slate-400",
          bg: "bg-slate-50/80 dark:bg-slate-900/30",
          border: "border-slate-200/50 dark:border-slate-700/30",
          dot: "bg-slate-400 dark:bg-slate-500",
          label: "OFF",
        };
      default:
        return {
          icon: HelpCircle,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50/80 dark:bg-amber-950/30",
          border: "border-amber-200/50 dark:border-amber-800/30",
          dot: "bg-amber-500 dark:bg-amber-500",
          label: "UNKNOWN",
        };
    }
  };

  // Calculate status summary
  const getStatusSummary = () => {
    const total = config.monitoredKeys?.length ?? 0;
    const statuses = Object.values(keyStatuses);
    const onCount = statuses.filter((s) => s === "ON").length;
    const offCount = statuses.filter((s) => s === "OFF").length;
    const unknownCount = statuses.filter((s) => s === "UNKNOWN").length;
    return { total, onCount, offCount, unknownCount };
  };

  // Format time
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render status item
  const renderStatusItem = (item: MonitoredKeyConfig) => {
    const status = keyStatuses[item.key] || "UNKNOWN";
    const statusConfig = getStatusConfig(status);
    const Icon = statusConfig.icon;

    return (
      <div
        key={item.key}
        className={cn(
          "flex items-center justify-between rounded-lg border transition-all duration-200",
          "hover:shadow-sm group",
          statusConfig.bg,
          statusConfig.border
        )}
        style={{
          padding: `${dynamicSizes.padding * 0.4}px ${dynamicSizes.padding * 0.6
            }px`,
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Icon
            className={statusConfig.color}
            style={{
              width: dynamicSizes.iconSize,
              height: dynamicSizes.iconSize,
            }}
          />
          <span
            className={cn("font-medium truncate", statusConfig.color)}
            style={{ fontSize: `${dynamicSizes.itemFontSize}px` }}
            title={item.customName}
          >
            {layoutMode === "compact" && item.customName.length > 12
              ? `${item.customName.substring(0, 12)}...`
              : item.customName}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={cn(
              "rounded-full transition-all duration-200",
              statusConfig.dot
            )}
            style={{
              width: Math.max(dynamicSizes.itemFontSize * 0.5, 6),
              height: Math.max(dynamicSizes.itemFontSize * 0.5, 6),
            }}
          />
          <span
            className={cn("font-semibold min-w-fit", statusConfig.color)}
            style={{
              fontSize: `${Math.max(dynamicSizes.itemFontSize * 0.85, 9)}px`,
            }}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>
    );
  };

  // Render content based on state
  const renderContent = () => {
    // No keys configured
    if (!config.monitoredKeys || config.monitoredKeys.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 text-center h-full">
          <AlertTriangle
            className="text-amber-500 dark:text-amber-400"
            style={{
              width: dynamicSizes.iconSize * 2,
              height: dynamicSizes.iconSize * 2,
            }}
          />
          <p
            className="font-medium text-amber-600 dark:text-amber-400"
            style={{ fontSize: `${dynamicSizes.itemFontSize}px` }}
          >
            No keys configured for monitoring
          </p>
        </div>
      );
    }

    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.iconSize * 2,
              height: dynamicSizes.iconSize * 2,
            }}
          />
          <p
            className="text-slate-600 dark:text-slate-400 font-medium"
            style={{ fontSize: `${dynamicSizes.itemFontSize}px` }}
          >
            Loading protocols...
          </p>
        </div>
      );
    }

    const summary = getStatusSummary();

    return (
      <div
        className="w-full h-full flex flex-col"
        style={{ gap: `${dynamicSizes.gap}px` }}
      >
        {/* Status summary untuk normal/grid mode */}
        {layoutMode !== "compact" && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200/50 dark:border-slate-700/30">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-500" />
                <span
                  className="font-bold text-emerald-600 dark:text-emerald-400"
                  style={{ fontSize: `${dynamicSizes.summaryFontSize}px` }}
                >
                  {summary.onCount}
                </span>
              </div>
              <p
                className="text-slate-500 dark:text-slate-400"
                style={{
                  fontSize: `${Math.max(
                    dynamicSizes.summaryFontSize * 0.8,
                    8
                  )}px`,
                }}
              >
                Online
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-slate-400 dark:bg-slate-500" />
                <span
                  className="font-bold text-slate-600 dark:text-slate-400"
                  style={{ fontSize: `${dynamicSizes.summaryFontSize}px` }}
                >
                  {summary.offCount}
                </span>
              </div>
              <p
                className="text-slate-500 dark:text-slate-400"
                style={{
                  fontSize: `${Math.max(
                    dynamicSizes.summaryFontSize * 0.8,
                    8
                  )}px`,
                }}
              >
                Offline
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 dark:bg-amber-500" />
                <span
                  className="font-bold text-amber-600 dark:text-amber-400"
                  style={{ fontSize: `${dynamicSizes.summaryFontSize}px` }}
                >
                  {summary.unknownCount}
                </span>
              </div>
              <p
                className="text-slate-500 dark:text-slate-400"
                style={{
                  fontSize: `${Math.max(
                    dynamicSizes.summaryFontSize * 0.8,
                    8
                  )}px`,
                }}
              >
                Unknown
              </p>
            </div>
          </div>
        )}

        {/* Protocol list */}
        <div
          className={cn(
            "flex-1 overflow-y-auto",
            layoutMode === "grid" ? "grid grid-cols-2 gap-2" : "space-y-2"
          )}
        >
          {config.monitoredKeys.map((item) => renderStatusItem(item))}
        </div>

        {/* Footer dengan last update */}
        {layoutMode === "normal" && lastUpdate && (
          <div className="flex items-center justify-center gap-1.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/30">
            <Clock
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.summaryFontSize * 0.9, 10),
                height: Math.max(dynamicSizes.summaryFontSize * 0.9, 10),
              }}
            />
            <p
              className="text-slate-400 dark:text-slate-500"
              style={{
                fontSize: `${Math.max(
                  dynamicSizes.summaryFontSize * 0.9,
                  9
                )}px`,
              }}
            >
              Updated {formatTime(lastUpdate)}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Overall status untuk header indicator
  const getOverallStatus = () => {
    const summary = getStatusSummary();
    if (summary.unknownCount > 0) return "warning";
    if (summary.onCount > 0) return "ok";
    return "inactive";
  };

  const overallStatus = getOverallStatus();
  const styles = {
    title: "text-slate-700 dark:text-slate-300",
    indicator:
      overallStatus === "ok"
        ? "bg-emerald-500 dark:bg-emerald-500"
        : overallStatus === "warning"
          ? "bg-amber-500 dark:bg-amber-500"
          : "bg-slate-400 dark:bg-slate-500",
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-card dark:bg-card 
                 border border-border/60 dark:border-border/40 
                 rounded-xl shadow-sm hover:shadow-md 
                 transition-all duration-300 ease-out 
                 overflow-hidden group"
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
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
          <RadioTower
            className="text-slate-500 dark:text-slate-400 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
              height: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
            }}
          />
          <h3
            className={cn(
              "font-medium truncate transition-colors duration-200",
              styles.title
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

          {/* Status indicator dot */}
          <div
            className={cn(
              "rounded-full transition-all duration-300",
              styles.indicator
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
        className="w-full h-full"
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
