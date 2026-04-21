// File: components/widgets/TemperatureIndicatorBar/TemperatureIndicatorBarWidget.tsx
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
  Thermometer,
  Snowflake,
  Flame,
  Gauge,
  Wind,
  Zap,
  Droplets,
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Clock,
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

// ✅ UNIT TYPE DETECTION
const detectUnitType = (units: string = ""): string => {
  const normalized = units.toLowerCase().trim();

  if (
    /^(°c|°f|°k|c|f|k|celsius|fahrenheit|kelvin|degc|degf|degk)$/i.test(
      normalized
    )
  ) {
    return "temperature";
  }

  if (
    /^(psi|pa|kpa|mpa|bar|mbar|atm|pascal|mmhg|inhg|torr)$/i.test(normalized)
  ) {
    return "pressure";
  }

  if (/^(m\/s|km\/h|mph|knot|knots|ft\/s|mps|kph)$/i.test(normalized)) {
    return "speed";
  }

  if (/^(v|mv|kv|a|ma|ka|volt|amp|ampere)$/i.test(normalized)) {
    return "electrical";
  }

  if (/^(%|percent|rh|humidity)$/i.test(normalized)) {
    return "percentage";
  }

  if (/^(w|kw|mw|watt|kilowatt|megawatt)$/i.test(normalized)) {
    return "power";
  }

  if (/^(l\/s|m3\/s|gpm|lpm|cfm)$/i.test(normalized)) {
    return "flow";
  }

  if (/^(m|cm|mm|km|ft|in|mile)$/i.test(normalized)) {
    return "distance";
  }

  if (/^(kg|g|mg|lb|oz|ton)$/i.test(normalized)) {
    return "weight";
  }

  return "generic";
};

// ✅ DYNAMIC RANGE LABELS
const getRangeInfo = (
  value: number,
  minValue: number,
  maxValue: number,
  unitType: string
) => {
  const range = maxValue - minValue;
  const percentage = Math.max(0, Math.min(1, (value - minValue) / range));

  const labelSets: Record<
    string,
    {
      zones: Array<{ threshold: number; label: string; icon: any }>;
      lowIcon: any;
      highIcon: any;
    }
  > = {
    temperature: {
      zones: [
        { threshold: 0.2, label: "Very Cold", icon: Snowflake },
        { threshold: 0.4, label: "Cool", icon: Thermometer },
        { threshold: 0.6, label: "Normal", icon: Thermometer },
        { threshold: 0.8, label: "Warm", icon: Thermometer },
        { threshold: 1.0, label: "Hot", icon: Flame },
      ],
      lowIcon: Snowflake,
      highIcon: Flame,
    },
    pressure: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: Gauge },
        { threshold: 0.4, label: "Low", icon: Gauge },
        { threshold: 0.6, label: "Normal", icon: Gauge },
        { threshold: 0.8, label: "High", icon: Gauge },
        { threshold: 1.0, label: "Very High", icon: Gauge },
      ],
      lowIcon: Gauge,
      highIcon: Gauge,
    },
    speed: {
      zones: [
        { threshold: 0.2, label: "Very Slow", icon: Wind },
        { threshold: 0.4, label: "Slow", icon: Wind },
        { threshold: 0.6, label: "Moderate", icon: Wind },
        { threshold: 0.8, label: "Fast", icon: Wind },
        { threshold: 1.0, label: "Very Fast", icon: Wind },
      ],
      lowIcon: Wind,
      highIcon: Wind,
    },
    electrical: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: Zap },
        { threshold: 0.4, label: "Low", icon: Zap },
        { threshold: 0.6, label: "Normal", icon: Zap },
        { threshold: 0.8, label: "High", icon: Zap },
        { threshold: 1.0, label: "Very High", icon: Zap },
      ],
      lowIcon: Zap,
      highIcon: Zap,
    },
    percentage: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: Droplets },
        { threshold: 0.4, label: "Low", icon: Droplets },
        { threshold: 0.6, label: "Moderate", icon: Droplets },
        { threshold: 0.8, label: "High", icon: Droplets },
        { threshold: 1.0, label: "Very High", icon: Droplets },
      ],
      lowIcon: Droplets,
      highIcon: Droplets,
    },
    power: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: TrendingUp },
        { threshold: 0.4, label: "Low", icon: TrendingUp },
        { threshold: 0.6, label: "Moderate", icon: TrendingUp },
        { threshold: 0.8, label: "High", icon: TrendingUp },
        { threshold: 1.0, label: "Very High", icon: TrendingUp },
      ],
      lowIcon: TrendingUp,
      highIcon: TrendingUp,
    },
    flow: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: Activity },
        { threshold: 0.4, label: "Low", icon: Activity },
        { threshold: 0.6, label: "Normal", icon: Activity },
        { threshold: 0.8, label: "High", icon: Activity },
        { threshold: 1.0, label: "Very High", icon: Activity },
      ],
      lowIcon: Activity,
      highIcon: Activity,
    },
    generic: {
      zones: [
        { threshold: 0.2, label: "Very Low", icon: Activity },
        { threshold: 0.4, label: "Low", icon: Activity },
        { threshold: 0.6, label: "Medium", icon: Activity },
        { threshold: 0.8, label: "High", icon: Activity },
        { threshold: 1.0, label: "Very High", icon: Activity },
      ],
      lowIcon: Activity,
      highIcon: Activity,
    },
  };

  const labelSet = labelSets[unitType] || labelSets.generic;

  let zoneInfo = labelSet.zones[0];
  for (const zone of labelSet.zones) {
    if (percentage <= zone.threshold) {
      zoneInfo = zone;
      break;
    }
  }

  // FIXED: Color mapping with dark mode support
  let colorClass, bgColorClass;
  if (percentage < 0.2) {
    colorClass = "text-blue-600 dark:text-blue-400";
    bgColorClass = "bg-blue-500";
  } else if (percentage < 0.4) {
    colorClass = "text-cyan-600 dark:text-cyan-400";
    bgColorClass = "bg-cyan-500";
  } else if (percentage < 0.6) {
    colorClass = "text-emerald-600 dark:text-emerald-400";
    bgColorClass = "bg-emerald-500";
  } else if (percentage < 0.8) {
    colorClass = "text-orange-600 dark:text-orange-400";
    bgColorClass = "bg-orange-500";
  } else {
    colorClass = "text-red-600 dark:text-red-400";
    bgColorClass = "bg-red-500";
  }

  return {
    zone: zoneInfo.label,
    color: colorClass,
    bgColor: bgColorClass,
    icon: zoneInfo.icon,
    lowIcon: labelSet.lowIcon,
    highIcon: labelSet.highIcon,
    description: zoneInfo.label,
  };
};

export const TemperatureIndicatorBarWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();

  // Calculate connection status from active brokers
  const connectionStatus = brokers.some(broker => broker.status === 'connected') ? 'Connected' : 'Disconnected';
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

  // FIXED: Responsive sizing - consistent with other widgets
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    valueFontSize: 24,
    unitFontSize: 14,
    titleFontSize: 12,
    labelFontSize: 10,
    padding: 16,
    headerHeight: 42,
    barHeight: 12,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">(
    "normal"
  );

  // FIXED: Enhanced responsive calculation - same as other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Better layout mode detection
      const minDimension = Math.min(width, height);

      let currentLayoutMode: "mini" | "compact" | "normal";
      if (minDimension < 180 || availableHeight < 100) {
        currentLayoutMode = "mini";
      } else if (minDimension < 280 || availableHeight < 160) {
        currentLayoutMode = "compact";
      } else {
        currentLayoutMode = "normal";
      }
      setLayoutMode(currentLayoutMode);

      // FIXED: Dynamic sizing based on layout mode
      const valueSize = Math.max(
        20,
        Math.min(width * 0.18, availableHeight * 0.25, 64)
      );
      const unitSize = Math.max(12, Math.min(valueSize * 0.5, 28));
      const titleSize = Math.max(11, Math.min(headerHeight * 0.32, 15));
      const labelSize = Math.max(9, Math.min(titleSize * 0.85, 13));
      const padding = Math.max(12, Math.min(width * 0.04, 24));
      const barHeight = Math.max(8, Math.min(availableHeight * 0.08, 16));

      setDynamicSizes({
        valueFontSize: Math.round(valueSize),
        unitFontSize: Math.round(unitSize),
        titleFontSize: Math.round(titleSize),
        labelFontSize: Math.round(labelSize),
        padding,
        headerHeight,
        barHeight,
      });
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
    (receivedTopic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};
        if (innerPayload.hasOwnProperty(config.selectedKey)) {
          const rawValue = innerPayload[config.selectedKey];
          if (typeof rawValue === "number") {
            const finalValue = rawValue * (config.multiply || 1);

            // Extract timestamp dari payload
            const timestamp = payload.Timestamp || innerPayload.Timestamp || null;
            setPayloadTimestamp(timestamp);

            // Set retain flag dari MQTT message property
            setIsRetain(retained || false);

            setPreviousValue(currentValue);
            setCurrentValue(finalValue);
            setStatus("ok");
            setLastUpdate(new Date());
          }
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey, config.multiply, currentValue]
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

  const { minValue = 0, maxValue = 100, units = "°C" } = config;
  const unitType = detectUnitType(units);

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

  const percentage =
    currentValue !== null
      ? Math.max(
          0,
          Math.min(1, (currentValue - minValue) / (maxValue - minValue))
        )
      : 0;

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
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 30000) return "now";
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderProgressBar = () => {
    if (currentValue === null) return null;

    const rangeInfo = getRangeInfo(currentValue, minValue, maxValue, unitType);
    const LowIcon = rangeInfo.lowIcon;
    const HighIcon = rangeInfo.highIcon;

    return (
      <div className="space-y-2">
        {/* FIXED: Range labels with responsive sizing and dark mode */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <LowIcon
              className="text-blue-500 dark:text-blue-400"
              style={{
                width: dynamicSizes.labelFontSize * 1.2,
                height: dynamicSizes.labelFontSize * 1.2,
              }}
            />
            <span
              className="text-slate-500 dark:text-slate-400 font-medium"
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              {formatValue(minValue)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="text-slate-500 dark:text-slate-400 font-medium"
              style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
            >
              {formatValue(maxValue)}
            </span>
            <HighIcon
              className="text-red-500 dark:text-red-400"
              style={{
                width: dynamicSizes.labelFontSize * 1.2,
                height: dynamicSizes.labelFontSize * 1.2,
              }}
            />
          </div>
        </div>

        {/* FIXED: Progress Bar with dark mode support */}
        <div className="relative">
          <div
            className="w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner"
            style={{ height: dynamicSizes.barHeight }}
          >
            <div
              className={`h-full ${rangeInfo.bgColor} rounded-full transition-all duration-700 ease-out relative`}
              style={{
                width: `${Math.max(2, Math.min(100, percentage * 100))}%`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            </div>
          </div>

          {/* Position indicator */}
          <div
            className="absolute top-0 w-1 h-full bg-slate-900 dark:bg-slate-100 rounded-full transform -translate-x-0.5 shadow-lg"
            style={{ left: `${percentage * 100}%` }}
          />
        </div>
      </div>
    );
  };

  const renderContent = () => {
    const styles = getStatusStyles();
    const isLoading =
      status === "loading" || (status === "waiting" && currentValue === null);

    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.valueFontSize * 1.2, 28),
              height: Math.max(dynamicSizes.valueFontSize * 1.2, 28),
            }}
          />
          <p
            className={`font-medium ${styles.title}`}
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
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
              width: Math.max(dynamicSizes.valueFontSize * 1.2, 28),
              height: Math.max(dynamicSizes.valueFontSize * 1.2, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    const rangeInfo = getRangeInfo(
      currentValue || 0,
      minValue,
      maxValue,
      unitType
    );
    const ZoneIcon = rangeInfo.icon;

    return (
      <div className="w-full space-y-3">
        {/* Main value display */}
        <div className="text-center space-y-2">
          <div className="flex items-baseline justify-center gap-2 flex-wrap">
            <span
              className={`font-bold tracking-tight transition-colors duration-300 ${styles.value}`}
              style={{
                fontSize: `${dynamicSizes.valueFontSize}px`,
                lineHeight: 0.9,
              }}
            >
              {formatValue(currentValue)}
            </span>
            <span
              className={`font-medium ${styles.unit}`}
              style={{
                fontSize: `${dynamicSizes.unitFontSize}px`,
                lineHeight: 1,
              }}
            >
              {units}
            </span>
          </div>

          {/* FIXED: Zone indicator with dark mode */}
          {layoutMode !== "mini" && (
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50 inline-flex">
              <ZoneIcon
                className={rangeInfo.color}
                style={{
                  width: Math.max(dynamicSizes.labelFontSize * 1.3, 13),
                  height: Math.max(dynamicSizes.labelFontSize * 1.3, 13),
                }}
              />
              <span
                className={`font-semibold ${rangeInfo.color}`}
                style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
              >
                {rangeInfo.zone}
              </span>
            </div>
          )}
        </div>

        {/* Timestamp - moved between zone and progress bar */}
        {layoutMode === "normal" && lastUpdate && (
          <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 w-fit mx-auto">
            <Clock
              style={{
                width: dynamicSizes.labelFontSize * 0.85,
                height: dynamicSizes.labelFontSize * 0.85,
              }}
            />
            <span
              style={{
                fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.85, 8)}px`,
              }}
              className="font-mono"
            >
              {formatTime(lastUpdate, payloadTimestamp, isRetain)}
            </span>
          </div>
        )}

        {/* Progress Bar */}
        {layoutMode !== "mini" && renderProgressBar()}
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-card
        border border-border/60 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* FIXED: Header - consistent with other widgets */}
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

        {/* FIXED: Status indicators with wifi */}
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

          <Thermometer
            className="text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />

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

      {/* FIXED: Main content with proper spacing */}
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
  );
};
