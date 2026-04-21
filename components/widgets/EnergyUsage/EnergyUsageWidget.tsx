// File: components/widgets/EnergyUsage/EnergyUsageWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Zap,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    loggingConfigId: string;
    units?: string;
    multiply?: number;
    period: "last_month" | "current_month";
  };
}

const DEFAULT_CONFIG: Props["config"] = {
  widgetTitle: "Energy Usage",
  loggingConfigId: "",
  period: "current_month",
  units: "kWh",
};

export const EnergyUsageWidget = ({ config = DEFAULT_CONFIG }: Props) => {
  const [usage, setUsage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  // FIXED: Responsive sizing - consistent with other widgets
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    valueFontSize: 24,
    unitFontSize: 12,
    labelFontSize: 10,
    padding: 16,
    headerHeight: 44,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">(
    "normal"
  );

  // FIXED: Enhanced responsive calculation - same as other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // FIXED: Layout mode detection - 3 modes
      const minDimension = Math.min(width, height);
      let currentLayoutMode: "mini" | "compact" | "normal";

      if (minDimension < 160 || availableHeight < 80) {
        currentLayoutMode = "mini";
      } else if (minDimension < 240 || availableHeight < 140) {
        currentLayoutMode = "compact";
      } else {
        currentLayoutMode = "normal";
      }

      setLayoutMode(currentLayoutMode);

      // FIXED: Dynamic sizing based on layout mode
      const valueSize = Math.max(
        18,
        Math.min(width * 0.2, availableHeight * 0.28, 64)
      );
      const unitSize = Math.max(12, Math.min(valueSize * 0.45, 28));
      const titleSize = Math.max(11, Math.min(headerHeight * 0.32, 15));
      const labelSize = Math.max(9, Math.min(titleSize * 0.85, 12));
      const padding = Math.max(12, Math.min(width * 0.04, 24));

      setDynamicSizes({
        titleFontSize: Math.round(titleSize),
        valueFontSize: Math.round(valueSize),
        unitFontSize: Math.round(unitSize),
        labelFontSize: Math.round(labelSize),
        padding,
        headerHeight,
      });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch usage data
  useEffect(() => {
    if (!config?.loggingConfigId) {
      setUsage(null);
      setStatus("error");
      setErrorMessage("Please configure a valid logging source.");
      return;
    }

    const fetchUsageData = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/historical/usage?configId=${config.loggingConfigId}&period=${config.period}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to fetch data");
        }
        const data = await response.json();
        const finalUsage = data.usage * (config.multiply || 1);
        setUsage(finalUsage);
        setStatus("ok");
      } catch (err: any) {
        setUsage(null);
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchUsageData();
  }, [config?.loggingConfigId, config?.period, config?.multiply]);

  // FIXED: Status styling with FULL dark mode support
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-slate-900 dark:text-slate-100",
      unit: "text-slate-500 dark:text-slate-400",
      label: "text-slate-600 dark:text-slate-400",
    };

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

  // FIXED: Usage condition with dark mode colors
  const getUsageCondition = (value: number) => {
    if (value < 100) {
      return {
        label: "Efficient",
        color: "text-emerald-600 dark:text-emerald-400",
        dotColor: "bg-emerald-500 dark:bg-emerald-500",
      };
    } else if (value < 500) {
      return {
        label: "Normal",
        color: "text-blue-600 dark:text-blue-400",
        dotColor: "bg-blue-500 dark:bg-blue-500",
      };
    } else if (value < 1000) {
      return {
        label: "High",
        color: "text-orange-600 dark:text-orange-400",
        dotColor: "bg-orange-500 dark:bg-orange-500",
      };
    } else {
      return {
        label: "Critical",
        color: "text-red-600 dark:text-red-400",
        dotColor: "bg-red-500 dark:bg-red-500",
      };
    }
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "—";

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
      maximumFractionDigits: 1,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  };

  const getPeriodIcon = () => {
    return config.period === "current_month" ? TrendingUp : TrendingDown;
  };

  const renderContent = () => {
    const styles = getStatusStyles();

    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="relative">
            <Loader2
              className="animate-spin text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
                height: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
              }}
            />
          </div>
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
              width: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
              height: Math.max(dynamicSizes.valueFontSize * 0.7, 28),
            }}
          />
          <p
            className={`font-semibold break-words ${styles.value}`}
            style={{
              fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.9, 10)}px`,
            }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-3">
        {/* Main value display */}
        <div className="flex items-baseline justify-center gap-2 w-full flex-wrap">
          <span
            className={`font-bold tracking-tight transition-all duration-300 ${styles.value}`}
            style={{
              fontSize: `${dynamicSizes.valueFontSize}px`,
              lineHeight: 0.9,
            }}
          >
            {formatValue(usage)}
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

        {/* FIXED: Usage level indicator with badge style and dark mode */}
        {typeof usage === "number" && layoutMode !== "mini" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
            <div
              className={`rounded-full transition-all duration-300 ${
                getUsageCondition(usage).dotColor
              }`}
              style={{
                width: Math.max(dynamicSizes.labelFontSize * 0.5, 7),
                height: Math.max(dynamicSizes.labelFontSize * 0.5, 7),
              }}
            />
            <span
              className={`font-semibold ${getUsageCondition(usage).color}`}
              style={{
                fontSize: `${Math.max(
                  dynamicSizes.labelFontSize * 0.95,
                  10
                )}px`,
              }}
            >
              {getUsageCondition(usage).label}
            </span>
          </div>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();
  const PeriodIcon = getPeriodIcon();

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
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styles.title} flex-1`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.widgetTitle}
        >
          {config.widgetTitle}
        </h3>

        {/* FIXED: Status indicators with wifi */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <Zap
            className="text-slate-400 dark:text-slate-500"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />

          {/* FIXED: Wifi status */}
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
            className={`rounded-full transition-all duration-300 ${
              styles.indicator
            } ${styles.pulse ? "animate-pulse" : ""}`}
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

      {/* FIXED: Period indicator at bottom with dark mode and better opacity */}
      {layoutMode !== "mini" && (
        <div className="absolute bottom-3 left-3 opacity-60 group-hover:opacity-90 transition-opacity">
          <div className="flex items-center gap-1.5">
            <PeriodIcon
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.labelFontSize * 0.8, 11),
                height: Math.max(dynamicSizes.labelFontSize * 0.8, 11),
              }}
            />
            <span
              className="text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider"
              style={{
                fontSize: `${Math.max(dynamicSizes.labelFontSize * 0.75, 9)}px`,
              }}
            >
              {config.period === "current_month" ? "CURRENT" : "LAST"}
            </span>
          </div>
        </div>
      )}

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
