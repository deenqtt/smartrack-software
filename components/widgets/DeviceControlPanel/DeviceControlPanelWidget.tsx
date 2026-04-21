// File: components/widgets/DeviceControlPanel/DeviceControlPanelWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Settings2,
  Send,
  AlertTriangle,
  WifiOff,
  Clock,
  Wifi,
  Zap,
  RefreshCw,
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    selectedDeviceName: string;
    selectedControlVar: string;
    controlType: "switch" | "input" | "dropdown";
    meta: {
      manufacturer: string;
      part_number: string;
      protocol: string;
      description?: string;
      data_type?: string;
      values?: any[];
    };
  };
  isEditMode?: boolean;
}

export const DeviceControlPanelWidget = ({
  config,
  isEditMode = false,
}: Props) => {
  const { publish, subscribe, unsubscribe, isReady, brokers } = useMqttServer();

  // State
  const [currentValue, setCurrentValue] = useState<any>(null);
  const [readableValue, setReadableValue] = useState<string | null>(null);
  const [validRange, setValidRange] = useState<{
    min?: number;
    max?: number;
  } | null>(null);
  const [inputValue, setInputValue] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isEditingValue, setIsEditingValue] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Responsive layout system
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

  // Connection status (mock from isReady - could be enhanced)
  const connectionStatus = brokers.some((broker) => broker.status === "connected")
    ? "Connected"
    : "Disconnected";

  // Fetch current value dari device
  const fetchCurrentValue = useCallback(() => {
    if (!isReady) {
      setStatus("error");
      setErrorMessage("MQTT not connected");
      return;
    }

    setIsFetching(true);
    setStatus("loading");

    const commandPayload = {
      command: "get_value",
      device_name: config.selectedDeviceName,
      var_name: config.selectedControlVar,
    };

    console.log("[WIDGET] Fetching current value:", commandPayload);
    publish("command_device_control", JSON.stringify(commandPayload));
  }, [isReady, config, publish]);

  // Subscribe to response untuk current value
  useEffect(() => {
    if (!isReady) return;

    const handleResponse = (topic: string, message: string, serverId: string, retained?: boolean) => {
      try {
        const data = JSON.parse(message);
        console.log("[WIDGET] Received response:", data);

        // Handle get_value response
        if (data.status === "success" && data.current_value !== undefined) {
          setCurrentValue(data.current_value);
          setReadableValue(data.readable_value || null);
          setValidRange(data.valid_range || null);
          setStatus("ok");
          setLastUpdate(new Date());
          setIsFetching(false);
          setErrorMessage("");
        } else if (data.status === "error") {
          setStatus("error");
          setErrorMessage(data.error || "Failed to fetch value");
          setIsFetching(false);
        }
        // Handle set_control response
        else if (
          data.status === "queued" ||
          data.message?.includes("forwarded")
        ) {
          // Command queued, wait for actual status
          console.log("[WIDGET] Command queued");
        } else if (data.status === "failed") {
          showToast.error(data.message || "Control failed", "Error");
          setIsSending(false);
          setStatus("error");
        }
      } catch (error) {
        console.error("[WIDGET] Parse error:", error);
      }
    };

    subscribe("response_device_control", handleResponse);

    // Fetch initial value
    fetchCurrentValue();

    return () => {
      unsubscribe("response_device_control", handleResponse);
    };
  }, [isReady, config, subscribe, unsubscribe, fetchCurrentValue]);

  // Auto-refresh removed to prevent flickering and network spam
  // Data will only refresh on manual interaction or mount

  // Enhanced responsive layout system
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const aspectRatio = width / height;
      const area = width * height;
      const minDimension = Math.min(width, height);

      let currentLayoutMode: "horizontal" | "vertical" | "compact";

      if (area < 10000 || minDimension < 100) {
        currentLayoutMode = "compact";
      } else if (aspectRatio > 1.5 && width > 250) {
        currentLayoutMode = "horizontal";
      } else {
        currentLayoutMode = "vertical";
      }

      setLayoutMode(currentLayoutMode);

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

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
          valueFontSize: Math.max(
            18,
            Math.min(availableHeight * 0.35, width * 0.08, 48),
          ),
          unitFontSize: Math.max(
            12,
            Math.min(availableHeight * 0.25, width * 0.055, 24),
          ),
          iconSize: Math.max(
            24,
            Math.min(availableHeight * 0.4, width * 0.08, 56),
          ),
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
          padding: Math.max(16, Math.min(width * 0.04, 32)),
          gap: Math.max(12, Math.min(width * 0.05, 28)),
          headerHeight,
        },
        vertical: {
          valueFontSize: Math.max(
            20,
            Math.min(width * 0.18, availableHeight * 0.18, 56),
          ),
          unitFontSize: Math.max(
            13,
            Math.min(width * 0.12, availableHeight * 0.12, 28),
          ),
          iconSize: Math.max(
            28,
            Math.min(width * 0.2, availableHeight * 0.2, 64),
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

  const handleSend = useCallback(() => {
    if (!isReady) {
      showToast.error("MQTT not connected", "Error");
      return;
    }

    setIsSending(true);

    try {
      let payloadValue: any = inputValue;

      // Konversi tipe data jika perlu
      if (config.controlType === "switch") {
        payloadValue = currentValue === 1 ? 0 : 1;
      } else if (
        config.meta?.data_type === "INTEGER" ||
        config.meta?.data_type === "UINT16"
      ) {
        payloadValue = parseInt(inputValue);
        if (isNaN(payloadValue)) {
          showToast.error("Invalid number", "Error");
          setIsSending(false);
          return;
        }

        // Validate against range if available
        if (
          validRange &&
          (validRange.min !== undefined || validRange.max !== undefined)
        ) {
          if (validRange.min !== undefined && payloadValue < validRange.min) {
            showToast.error(
              `Value must be >= ${validRange.min}`,
              "Validation Error",
            );
            setIsSending(false);
            return;
          }
          if (validRange.max !== undefined && payloadValue > validRange.max) {
            showToast.error(
              `Value must be <= ${validRange.max}`,
              "Validation Error",
            );
            setIsSending(false);
            return;
          }
        }
      } else if (
        config.meta?.data_type === "FLOAT" ||
        config.meta?.data_type === "FLOAT32"
      ) {
        payloadValue = parseFloat(inputValue);
        if (isNaN(payloadValue)) {
          showToast.error("Invalid number", "Error");
          setIsSending(false);
          return;
        }
      }

      const commandPayload = {
        command: "set_control",
        device_name: config.selectedDeviceName,
        var_name: config.selectedControlVar,
        value: payloadValue,
      };

      console.log("[WIDGET] Sending:", commandPayload);
      publish("command_device_control", JSON.stringify(commandPayload));

      showToast.success("Command sent!", "Success");

      // Close edit mode and refresh value after a delay
      setTimeout(() => {
        setIsSending(false);
        setIsEditingValue(false);
        setInputValue("");
        fetchCurrentValue(); // Refresh to get new value
      }, 1500);
    } catch (error) {
      console.error("Send error:", error);
      showToast.error("Failed to send command", "Error");
      setIsSending(false);
      setStatus("error");
    }
  }, [
    isReady,
    inputValue,
    currentValue,
    config,
    publish,
    validRange,
    fetchCurrentValue,
  ]);

  // Styling helper
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      iconBg: "#3B82F6",
      iconColor: "#FFFFFF",
    };

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

  // Format time helper
  const formatTime = (date: Date | null) => {
    if (!date) return "—";

    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Render loading state
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
            Loading...
          </p>
        )}
      </div>
    );
  };

  // Render error state
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
              {errorMessage || "Connection error"}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render Interface berdasarkan Control Type
  const renderControl = () => {
    if (config.controlType === "switch") {
      const isOn =
        currentValue === 1 || currentValue === "1" || currentValue === true;

      return (
        <div className="flex flex-col items-center justify-center gap-4 w-full">
          <div
            className="flex items-center justify-center"
            style={{
              width: dynamicSizes.iconSize * 1.6,
              height: dynamicSizes.iconSize * 1.6,
            }}
          >
            <div
              className={cn(
                "rounded-xl shadow-sm flex items-center justify-center transition-all duration-300",
                isOn ? "bg-green-500" : "bg-slate-300 dark:bg-slate-600",
              )}
              style={{
                width: dynamicSizes.iconSize * 1.4,
                height: dynamicSizes.iconSize * 1.4,
              }}
            >
              <Zap
                className={cn(
                  "transition-colors",
                  isOn ? "text-white" : "text-slate-500",
                )}
                style={{
                  width: dynamicSizes.iconSize * 0.7,
                  height: dynamicSizes.iconSize * 0.7,
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={cn(
                "font-semibold transition-colors",
                isOn
                  ? "text-green-600 dark:text-green-400"
                  : "text-slate-500 dark:text-slate-400",
              )}
              style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
            >
              {isOn ? "ON" : "OFF"}
            </span>
            <Switch
              checked={isOn}
              onCheckedChange={() => {
                setCurrentValue(isOn ? 0 : 1);
                setInputValue(isOn ? "0" : "1");
                setTimeout(handleSend, 100);
              }}
              disabled={isSending}
            />
          </div>
        </div>
      );
    } else if (config.controlType === "dropdown") {
      return (
        <div className="flex flex-col gap-3 w-full max-w-xs">
          {/* Current Value Display */}
          <div className="text-center text-sm">
            <span className={cn("text-xs", styles.unit)}>
              Current:{" "}
            </span>
            <span className={cn("font-semibold", styles.value)}>
              {currentValue !== null ? currentValue : "—"}
            </span>
          </div>

          <Select
            value={String(inputValue || currentValue || "")}
            onValueChange={setInputValue}
            disabled={isSending}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select new value..." />
            </SelectTrigger>
            <SelectContent>
              {config.meta?.values?.map((val: any) => (
                <SelectItem key={val} value={String(val)}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSend}
            disabled={isSending || !inputValue}
            className="w-full"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Apply
              </>
            )}
          </Button>
        </div>
      );
    } else {
      // Input type - show current value and edit mode
      if (!isEditingValue) {
        return (
          <div className="flex flex-col gap-3 w-full items-center">
            {/* Current Value Display - NO READABLE VALUE (no multiply) */}
            <div className="text-center w-full">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                Current Value
              </div>
              <div
                className={cn("font-bold tracking-tight leading-none transition-all duration-300", styles.value)}
                style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
              >
                {currentValue !== null ? currentValue : "—"}
              </div>
              {validRange &&
                (validRange.min !== undefined ||
                  validRange.max !== undefined) && (
                  <div
                    className="text-slate-500 dark:text-slate-400 text-xs mt-2"
                    style={{
                      fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.8, 10)}px`,
                    }}
                  >
                    Range: {validRange.min ?? "—"} to {validRange.max ?? "—"}
                  </div>
                )}
            </div>

            {/* Edit Button */}
            <Button
              onClick={() => {
                setIsEditingValue(true);
                setInputValue(
                  currentValue !== null ? String(currentValue) : "",
                );
              }}
              disabled={isFetching || currentValue === null}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              <Send className="h-4 w-4 mr-2" />
              Change Value
            </Button>
          </div>
        );
      } else {
        return (
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {/* Show current value - NO READABLE VALUE */}
            <div className="text-center text-sm">
              <span className={cn("text-xs", styles.unit)}>
                Current:{" "}
              </span>
              <span className={cn("font-semibold", styles.value)}>
                {currentValue}
              </span>
            </div>

            {/* Input field */}
            <div className="space-y-1">
              <Input
                placeholder="Enter new value..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isSending}
                type={
                  config.meta?.data_type?.includes("INT") ? "number" : "text"
                }
                autoFocus
              />
              {validRange &&
                (validRange.min !== undefined ||
                  validRange.max !== undefined) && (
                  <p className={cn("text-xs", styles.unit)}>
                    Valid range: {validRange.min ?? "—"} to{" "}
                    {validRange.max ?? "—"}
                  </p>
                )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsEditingValue(false);
                  setInputValue("");
                }}
                disabled={isSending}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSend}
                disabled={isSending || !inputValue}
                className="flex-1"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Apply
                  </>
                )}
              </Button>
            </div>
          </div>
        );
      }
    }
  };

  // Render main content based on status
  const renderMainContent = () => {
    if (status === "loading") return renderLoadingState();
    if (status === "error") return renderErrorState();

    return (
      <div className="flex flex-col items-center justify-center w-full h-full gap-4">
        {/* Control Interface */}
        {renderControl()}

        {/* Last Update Time */}
        {lastUpdate && layoutMode !== "compact" && (
          <div
            className="flex items-center gap-1 px-2 py-1 text-slate-500 dark:text-slate-400 opacity-70"
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.7, 9)}px`,
            }}
          >
            <Clock
              className="flex-shrink-0"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.7, 10),
                height: Math.max(dynamicSizes.titleFontSize * 0.7, 10),
              }}
            />
            <span className="font-mono">{formatTime(lastUpdate)}</span>
          </div>
        )}
      </div>
    );
  };

  const styles = getStatusStyling();

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full h-full relative overflow-hidden",
        isEditMode ? "cursor-move" : "cursor-default",
        "bg-white dark:bg-slate-900",
        "border border-slate-200/60 dark:border-slate-700/60 rounded-xl",
        "shadow-sm dark:shadow-lg",
        isEditMode ? "" : "hover:shadow-md dark:hover:shadow-xl",
        "transition-all duration-300 ease-out",
        "group",
        isEditMode ? "" : "hover:scale-[1.01]",
        "transform-gpu",
      )}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* Header */}
      <div
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40 flex flex-col justify-center flex-shrink-0 border-b border-slate-200/60 dark:border-slate-600/80"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex-1 min-w-0">
            <h3
              className={cn(
                "font-medium truncate transition-colors duration-200",
                styles.title
              )}
              style={{
                fontSize: `${dynamicSizes.titleFontSize}px`,
                lineHeight: 1.2,
              }}
              title={config.widgetTitle}
            >
              {config.widgetTitle}
            </h3>
            <p
              className="text-slate-500 dark:text-slate-400 font-mono truncate text-xs"
              style={{
                fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.75, 9)}px`,
                lineHeight: 1.2,
                marginTop: "2px",
              }}
              title={`Parameter: ${config.selectedControlVar}`}
            >
              {config.selectedControlVar}
            </p>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 ml-3 flex-shrink-0">
            {/* Refresh button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                fetchCurrentValue();
              }}
              disabled={isFetching || !isReady}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh current value"
            >
              <RefreshCw
                className={cn(
                  "text-slate-400 dark:text-slate-500",
                  isFetching && "animate-spin",
                )}
                style={{
                  width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                  height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                }}
              />
            </button>

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
              className={cn(
                "rounded-full",
                styles.indicator,
                styles.pulse ? "animate-pulse" : "",
                "transition-all duration-300",
              )}
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
                height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              }}
            />
          </div>
        </div>
      </div>

      {/* Main content */}
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
  );
};
