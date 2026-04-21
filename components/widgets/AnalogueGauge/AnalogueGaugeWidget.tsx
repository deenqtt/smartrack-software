// File: components/widgets/AnalogueGauge/AnalogueGaugeWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import ReactECharts from "echarts-for-react";
import { useTheme } from "next-themes";
import {
  Loader2,
  AlertTriangle,
  Gauge,
  TrendingUp,
  TrendingDown,
  Minus,
  Wifi,
  WifiOff,
  Pin,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    selectedKey: string;
    multiply?: number;
    units?: string;
    minValue?: number;
    maxValue?: number;
  };
}

export const AnalogueGaugeWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const { theme } = useTheme();

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some((broker) => broker.status === "connected")
    ? "Connected"
    : "Disconnected";
  const [currentValue, setCurrentValue] = useState<number | null>(null);
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [payloadTimestamp, setPayloadTimestamp] = useState<string | null>(null);
  const [isRetain, setIsRetain] = useState<boolean>(false);

  // FIXED: Enhanced responsive system - consistent with other widgets
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    valueFontSize: 24,
    labelFontSize: 10,
    unitFontSize: 12,
    gaugeSize: 1,
    padding: 16,
    headerHeight: 52,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">(
    "normal"
  );

  // FIXED: Layout calculation - same as other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Better layout mode detection - consistent naming
      const minDimension = Math.min(width, height);
      let currentLayoutMode: "mini" | "compact" | "normal";

      if (minDimension < 160 || availableHeight < 100) {
        currentLayoutMode = "mini";
      } else if (minDimension < 240 || availableHeight < 180) {
        currentLayoutMode = "compact";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // FIXED: Dynamic sizing based on layout mode
      const baseScale = Math.sqrt(width * height) / 130;

      const sizeConfigs = {
        mini: {
          titleFontSize: Math.max(10, Math.min(headerHeight * 0.3, 13)),
          valueFontSize: Math.max(16, Math.min(availableHeight * 0.15, 22)),
          labelFontSize: Math.max(8, Math.min(baseScale * 9, 10)),
          unitFontSize: Math.max(10, Math.min(baseScale * 11, 12)),
          gaugeSize: Math.min(minDimension * 0.85, 140),
          padding: Math.max(8, width * 0.03),
          headerHeight,
        },
        compact: {
          titleFontSize: Math.max(11, Math.min(headerHeight * 0.32, 14)),
          valueFontSize: Math.max(20, Math.min(availableHeight * 0.18, 28)),
          labelFontSize: Math.max(9, Math.min(baseScale * 10, 11)),
          unitFontSize: Math.max(11, Math.min(baseScale * 12, 14)),
          gaugeSize: Math.min(minDimension * 0.9, 180),
          padding: Math.max(10, width * 0.04),
          headerHeight,
        },
        normal: {
          titleFontSize: Math.max(12, Math.min(headerHeight * 0.32, 15)),
          valueFontSize: Math.max(24, Math.min(availableHeight * 0.2, 36)),
          labelFontSize: Math.max(10, Math.min(baseScale * 11, 13)),
          unitFontSize: Math.max(12, Math.min(baseScale * 14, 16)),
          gaugeSize: Math.min(minDimension * 0.95, 240),
          padding: Math.max(12, width * 0.04),
          headerHeight,
        },
      };

      setDynamicSizes(sizeConfigs[currentLayoutMode]);
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setStatus("error");
      setErrorMessage("Device not configured.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Device not found`);
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err: any) {
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
      retained?: boolean
    ) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(config.selectedKey)) {
          const rawValue = innerPayload[config.selectedKey];
          const numericValue = typeof rawValue === "number"
            ? rawValue
            : typeof rawValue === "string"
              ? parseFloat(rawValue.replace(/[^0-9.-]/g, ""))
              : NaN;
          if (!isNaN(numericValue)) {
            const finalValue = numericValue * (config.multiply || 1);

            // Extract timestamp dari payload
            const timestamp = payload.Timestamp || innerPayload.Timestamp || null;
            setPayloadTimestamp(timestamp);

            // Set retain flag
            setIsRetain(retained || false);

            // Use functional update to avoid stale closure on currentValue
            setCurrentValue((prev) => {
              setPreviousValue(prev);
              return finalValue;
            });
            setStatus("ok");
            setLastUpdate(new Date());
          }
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
  }, [topic, isReady, connectionStatus, subscribe, unsubscribe, handleMqttMessage]);

  const { minValue = 0, maxValue = 100, units = "" } = config;

  const getTrend = () => {
    if (currentValue === null || previousValue === null) return null;
    if (currentValue > previousValue) return "up";
    if (currentValue < previousValue) return "down";
    return "stable";
  };

  // FIXED: Simplified status styling - consistent with other widgets
  const getStatusStyling = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      label: "text-slate-600 dark:text-slate-400",
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

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const formatTime = (date: Date, payloadTs: string | null, retain: boolean) => {
    // Priority: Kalau ada payload timestamp dari MQTT, gunakan itu
    if (payloadTs) {
      return payloadTs;
    }

    // Fallback ke logic lama (untuk widget tanpa timestamp di payload)
    const diff = new Date().getTime() - date.getTime();

    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full">
      <div
        className="bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-600"
        style={{
          width: Math.max(dynamicSizes.labelFontSize * 4, 48),
          height: Math.max(dynamicSizes.labelFontSize * 4, 48),
        }}
      >
        <Loader2
          className="animate-spin text-slate-400 dark:text-slate-500"
          style={{
            width: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
            height: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
          }}
        />
      </div>
      <p
        className="text-slate-600 dark:text-slate-400 font-medium"
        style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
      >
        Loading gauge...
      </p>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center gap-3 h-full px-4">
      <div
        className="bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center border-2 border-slate-200 dark:border-slate-600"
        style={{
          width: Math.max(dynamicSizes.labelFontSize * 4, 48),
          height: Math.max(dynamicSizes.labelFontSize * 4, 48),
        }}
      >
        <AlertTriangle
          className="text-red-600 dark:text-red-400"
          style={{
            width: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
            height: Math.max(dynamicSizes.labelFontSize * 2.2, 24),
          }}
        />
      </div>
      <div className="space-y-1 text-center">
        <p
          className="text-red-700 dark:text-red-300 font-semibold"
          style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
        >
          Connection Error
        </p>
        <p
          className="text-red-600 dark:text-red-400 opacity-80 break-words"
          style={{
            fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.85, 8)}px`,
          }}
        >
          {errorMessage.length > 40
            ? `${errorMessage.substring(0, 40)}...`
            : errorMessage}
        </p>
      </div>
    </div>
  );

  const getGaugeColor = (val: number, min: number, max: number): string => {
    // Logic: 0-33% Green, 33-66% Amber, 66-100% Red (Example) or single color
    const percent = Math.max(0, Math.min(1, (val - min) / (max - min)));
    if (percent <= 0.5) return "#10b981"; // Emerald-500
    if (percent <= 0.8) return "#f59e0b"; // Amber-500
    return "#ef4444"; // Red-500
  };

  const getEChartsOption = useMemo(() => {
    const isDark = theme === "dark";
    const value = currentValue !== null ? currentValue : minValue;
    const progressColor = getGaugeColor(value, minValue, maxValue);

    // Dynamic sizes for chart elements
    const axisLineWidth = layoutMode === 'mini' ? 8 : layoutMode === 'compact' ? 12 : 16;
    const tickWidth = layoutMode === 'mini' ? 1 : 2;
    const tickLength = layoutMode === 'mini' ? 4 : 6;
    const splitLength = layoutMode === 'mini' ? 8 : 12;
    const labelDistance = layoutMode === 'mini' ? 12 : 20;
    const labelFontSize = dynamicSizes.labelFontSize;
    const detailFontSize = dynamicSizes.valueFontSize;
    const pointerWidth = layoutMode === 'mini' ? 4 : 6;

    return {
      series: [
        {
          type: "gauge",
          startAngle: 180,
          endAngle: 0,
          min: minValue,
          max: maxValue,
          splitNumber: 5,
          radius: "100%",
          center: ["50%", "75%"], // Move gauge down slightly
          itemStyle: {
            color: progressColor,
            shadowColor: "rgba(0,138,255,0.45)",
            shadowBlur: 10,
            shadowOffsetX: 2,
            shadowOffsetY: 2,
          },
          progress: {
            show: true,
            roundCap: true,
            width: axisLineWidth,
          },
          pointer: {
            icon: "path://M12.8,0.7l12,40.1H0.7L12.8,0.7z",
            length: "60%",
            width: pointerWidth,
            offsetCenter: [0, "-30%"],
            itemStyle: {
              color: isDark ? "#e2e8f0" : "#334155",
            },
          },
          axisLine: {
            roundCap: true,
            lineStyle: {
              width: axisLineWidth,
              color: [
                [1, isDark ? "#334155" : "#e2e8f0"] // Background track color
              ],
            },
          },
          axisTick: {
            splitNumber: 2,
            lineStyle: {
              width: tickWidth,
              color: isDark ? "#64748b" : "#94a3b8",
            },
            length: tickLength,
          },
          splitLine: {
            length: splitLength,
            lineStyle: {
              width: Math.max(2, tickWidth + 1),
              color: isDark ? "#64748b" : "#94a3b8",
            },
          },
          axisLabel: {
            distance: labelDistance,
            color: isDark ? "#94a3b8" : "#64748b",
            fontSize: labelFontSize,
            formatter: (val: number) => {
              // Only show min and max labels if needed, but let's show standard intervals
              if (val === minValue) return formatValue(val);
              if (val === maxValue) return formatValue(val);
              // Hide intermediate labels for cleaner look in small widgets
              return layoutMode === "mini" ? "" : formatValue(val);
            },
          },
          title: {
            show: false,
          },
          detail: {
            valueAnimation: true,
            fontSize: detailFontSize,
            offsetCenter: [0, "15%"], // Position below the center
            formatter: function (value: number) {
              return `{value|${formatValue(value)}}\n{unit|${units}}`;
            },
            rich: {
              value: {
                fontSize: detailFontSize,
                fontWeight: "bold",
                color: isDark ? "#f1f5f9" : "#0f172a",
                padding: [5, 0],
              },
              unit: {
                fontSize: dynamicSizes.unitFontSize,
                color: isDark ? "#94a3b8" : "#64748b",
                padding: [0, 0],
              },
            },
          },
          data: [
            {
              value: currentValue !== null ? currentValue : minValue,
            },
          ],
        },
      ],
    };
  }, [
    currentValue,
    minValue,
    maxValue,
    theme,
    layoutMode,
    dynamicSizes,
    units,
  ]);

  const renderGaugeContent = () => {
    if (
      status === "loading" ||
      (status === "waiting" && currentValue === null)
    ) {
      return renderLoadingState();
    }

    if (status === "error") {
      return renderErrorState();
    }

    const trend = getTrend();
    const styling = getStatusStyling();

    return (
      <div className="w-full h-full flex flex-col relative">
        {/* ECharts Instance */}
        <div className="flex-1 w-full h-full relative" style={{ minHeight: 0 }}>
             <ReactECharts
              option={getEChartsOption}
              style={{ height: '100%', width: '100%' }}
              opts={{ renderer: 'canvas' }}
              notMerge={true}
              theme={theme === 'dark' ? 'dark' : undefined}
            />
        </div>

        {/* Footer with Min/Max and Info */}
        <div 
          className="w-full flex justify-between items-end px-4 pb-3 absolute bottom-0 left-0 right-0 pointer-events-none"
        >
          {/* Min Label - Visible only if chart axis labels are insufficient or for explicit clarity */}
          <div className="text-left pointer-events-auto opacity-0 md:opacity-100"> 
             {/* Hidden on small screens as chart has axis labels */}
          </div>

          {/* Center Info: Trend & Time */}
          <div className="text-center flex flex-col items-center gap-1 mx-auto pointer-events-auto transform translate-y-1">
             {/* Trend Indicator */}
             {trend && layoutMode !== "mini" && (
              <div className="flex items-center gap-1.5 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                {trend === "up" ? (
                  <TrendingUp
                    className="text-emerald-500 dark:text-emerald-400"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                ) : trend === "down" ? (
                  <TrendingDown
                    className="text-red-500 dark:text-red-400"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                ) : (
                  <Minus
                    className="text-slate-400 dark:text-slate-500"
                    style={{
                      width: dynamicSizes.labelFontSize * 1.2,
                      height: dynamicSizes.labelFontSize * 1.2,
                    }}
                  />
                )}
                <span
                  className={`font-medium text-xs ${
                    trend === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : trend === "down"
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {trend === "up"
                    ? "Rising"
                    : trend === "down"
                    ? "Falling"
                    : "Stable"}
                </span>
              </div>
            )}
            
            {/* Timestamp */}
            {lastUpdate && layoutMode === "normal" && (
              <p
                className={`text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-800/50 px-2 rounded-full backdrop-blur-sm`}
              >
                {formatTime(lastUpdate, payloadTimestamp, isRetain)}
              </p>
            )}
          </div>

          {/* Max Label */}
           <div className="text-right pointer-events-auto opacity-0 md:opacity-100">
             {/* Hidden on small screens */}
           </div>
        </div>
      </div>
    );
  };

  const styling = getStatusStyling();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full flex flex-col cursor-move
        bg-card border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group overflow-hidden
      `}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* Header */}
      <div
        className="px-4 bg-muted/20 flex items-center justify-between flex-shrink-0 border-b border-border/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Title */}
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styling.title} flex-1`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.customName}
        >
          {config.customName}
        </h3>

        {/* Status Indicators */}
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

          {/* Gauge icon */}
          <Gauge
            className="text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />

          {/* Connection Status */}
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

          {/* Live Status Indicator */}
          <div
            className={`rounded-full transition-all duration-300 ${
              styling.indicator
            } ${styling.pulse ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 w-full relative overflow-hidden bg-transparent">
        {renderGaugeContent()}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
