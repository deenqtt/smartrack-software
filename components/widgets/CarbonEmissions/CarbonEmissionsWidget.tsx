"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import {
  Loader2,
  AlertTriangle,
  Leaf,
  Wind,
  CloudRain,
  TrendingUp,
  TrendingDown,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    widgetTitle: string;
    billConfigId: string;
    publishTopic?: string; // Topic to listen for real-time updates
  };
}

export const CarbonEmissionsWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const [data, setData] = useState<{
    carbonEmissionKg: number;
    energyKwh: number;
  } | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const connectionStatus = brokers.some(b => b.status === "connected")
    ? "Connected"
    : "Disconnected";

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

  // Responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

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

      const valueSize = Math.max(18, Math.min(width * 0.2, availableHeight * 0.28, 64));
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

  useEffect(() => {
    if (!config.billConfigId) {
      setData(null);
      setStatus("error");
      setErrorMessage("Please configure a valid billing source.");
      return;
    }
    if (!config.publishTopic) {
      setStatus("error");
      setErrorMessage("Billing source has no publish topic configured.");
      return;
    }
    setStatus((current) => (current === "ok" ? current : "loading"));
    setErrorMessage("");
  }, [config.billConfigId, config.publishTopic]);

  const handleMqttMessage = useCallback((receivedTopic: string, payloadStr: string) => {
    if (receivedTopic !== config.publishTopic) return;
    try {
      const payload = JSON.parse(payloadStr);
      const value = typeof payload.value === "string" ? JSON.parse(payload.value) : payload.value;
      if (value?.carbonEmissionKg !== undefined) {
        setData({
          carbonEmissionKg: value.carbonEmissionKg,
          energyKwh: value.energyKwh ?? 0,
        });
        setStatus("ok");
        setErrorMessage("");
      }
    } catch (e) {
      console.error("Carbon Emissions Widget: Message parse error", e);
    }
  }, [config.publishTopic]);

  useEffect(() => {
    if (!config.publishTopic || !isReady || connectionStatus !== "Connected") return;
    subscribe(config.publishTopic, handleMqttMessage);
    return () => {
      unsubscribe(config.publishTopic!, handleMqttMessage);
    };
  }, [config.publishTopic, isReady, connectionStatus, subscribe, unsubscribe, handleMqttMessage]);

  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      value: "text-emerald-700 dark:text-emerald-400",
      unit: "text-slate-500 dark:text-slate-400",
      label: "text-slate-600 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return { ...baseStyles, indicator: "bg-emerald-500", pulse: false };
      case "error":
        return { ...baseStyles, indicator: "bg-red-500", pulse: false, value: "text-red-700" };
      case "loading":
        return { ...baseStyles, indicator: "bg-amber-500", pulse: true };
      default:
        return { ...baseStyles, indicator: "bg-slate-400", pulse: false };
    }
  };

  const formatValue = (value: number | null) => {
    if (value === null) return "—";
    if (value >= 1000) return (value / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + " t";
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const renderContent = () => {
    const styles = getStatusStyles();

    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-slate-400" size={32} />
          <p className={styles.label} style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}>Waiting for data...</p>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 text-center">
          <AlertTriangle className="text-amber-500" size={32} />
          <p className={styles.label} style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}>
            {errorMessage || "Waiting for carbon emission data..."}
          </p>
        </div>
      );
    }

    const emissionValue = data.carbonEmissionKg;
    const unit = emissionValue >= 1000 ? "t CO₂e" : "kg CO₂e";
    const displayValue = emissionValue >= 1000 ? emissionValue / 1000 : emissionValue;

    return (
      <div className="flex flex-col items-center justify-center text-center w-full gap-2">
        <div className="flex items-baseline justify-center gap-1.5 w-full flex-wrap">
          <span
            className={`font-black tracking-tighter ${styles.value}`}
            style={{ fontSize: `${dynamicSizes.valueFontSize * 1.2}px`, lineHeight: 1 }}
          >
            {displayValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span
            className={`font-bold uppercase tracking-widest ${styles.unit}`}
            style={{ fontSize: `${dynamicSizes.unitFontSize}px` }}
          >
            {unit}
          </span>
        </div>

        {layoutMode !== "mini" && (
          <div className="mt-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center gap-2 border border-emerald-100 dark:border-emerald-800/30">
            <Leaf size={12} className="text-emerald-500" />
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-tighter">
              Carbon Emission Rate
            </span>
          </div>
        )}
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden bg-card border border-border/60 rounded-xl shadow-sm group hover:shadow-md transition-all duration-300"
    >
      <div
        className="absolute top-0 left-0 right-0 px-4 flex items-center justify-between border-b border-border/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Leaf className="text-emerald-500 flex-shrink-0" size={16} />
          <h3 className={`font-bold truncate ${styles.title}`} style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}>
            {config.widgetTitle}
          </h3>
        </div>
        <div className={`w-2 h-2 rounded-full ${styles.indicator} ${styles.pulse ? "animate-pulse" : ""}`} />
      </div>

      <div className="w-full h-full flex items-center justify-center p-4" style={{ paddingTop: dynamicSizes.headerHeight }}>
        {renderContent()}
      </div>

      {layoutMode !== "mini" && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
          <Wind size={12} className="text-emerald-500" />
          <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Real-time</span>
        </div>
      )}
    </div>
  );
};
