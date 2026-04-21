// File: components/widgets/MqttKeyStatusCard/MqttKeyStatusCardWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { AlertTriangle, Loader2, WifiOff, Wifi, Clock, HelpCircle, CheckCircle2, XCircle } from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";
import { cn } from "@/lib/utils";

// ── Condition normalization ────────────────────────────────────────────────────
// Treats 1/"1"/"true"/true and 0/"0"/"false"/false as equivalent
const normalizeBoolLike = (v: string): string => {
  const s = v.toLowerCase().trim();
  if (s === "1" || s === "true" || s === "yes" || s === "on") return "__true__";
  if (s === "0" || s === "false" || s === "no" || s === "off") return "__false__";
  return s;
};
const matchesConditionValue = (actual: string, expected: string): boolean =>
  actual === expected || normalizeBoolLike(actual) === normalizeBoolLike(expected);

// ── Types ─────────────────────────────────────────────────────────────────────
export interface MqttKeyItem {
  customName?: string;
  selectedKey: string;
  useCondition?: boolean;
  onValue?: string;
  offValue?: string;
  onLabel?: string;
  offLabel?: string;
  selectedIcon?: string;
  iconColor?: string;
  iconBgColor?: string;
  multiply?: number;
  units?: string;
}

interface Config {
  widgetTitle: string;
  deviceTopic: string;
  // Single-key mode (backward compat)
  selectedKey?: string;
  multiply?: number;
  units?: string;
  useCondition?: boolean;
  onValue?: string;
  offValue?: string;
  onLabel?: string;
  offLabel?: string;
  selectedIcon?: string;
  iconColor?: string;
  iconBgColor?: string;
  // Multi-key mode
  items?: MqttKeyItem[];
}

type ConditionStatus = "ON" | "OFF" | "UNKNOWN";

interface KeyState {
  rawValue: string | number | null;
  conditionStatus: ConditionStatus;
  hasData: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const resolveCondition = (val: unknown, item: MqttKeyItem): ConditionStatus => {
  const strVal = String(val);
  if (matchesConditionValue(strVal, String(item.onValue ?? "1"))) return "ON";
  if (matchesConditionValue(strVal, String(item.offValue ?? "0"))) return "OFF";
  return "UNKNOWN";
};

const getConditionStyle = (cs: ConditionStatus, onLabel: string, offLabel: string) => {
  switch (cs) {
    case "ON":
      return { indicator: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800/40", Icon: CheckCircle2, label: onLabel || "ON" };
    case "OFF":
      return { indicator: "bg-slate-400", text: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/30", border: "border-slate-200 dark:border-slate-700/40", Icon: XCircle, label: offLabel || "OFF" };
    default:
      return { indicator: "bg-amber-400", text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800/40", Icon: HelpCircle, label: "?" };
  }
};

const formatValue = (v: string | number | null, maximumFractionDigits = 2) => {
  if (v === null) return "—";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1000000) return (v / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "M";
    if (Math.abs(v) >= 1000) return (v / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 }) + "K";
    return v.toLocaleString(undefined, { maximumFractionDigits, minimumFractionDigits: 0 });
  }
  return String(v);
};

const formatTime = (date: Date) => {
  const diff = Date.now() - date.getTime();
  if (diff < 30000) return "now";
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// ── Multi-key row ─────────────────────────────────────────────────────────────
const MultiKeyRow = ({ item, state }: { item: MqttKeyItem; state: KeyState }) => {
  const IconComponent = getIconComponent(item.selectedIcon || "Zap");
  const iconSize = 16;
  const fontSize = 12;

  if (item.useCondition) {
    const cs = getConditionStyle(state.conditionStatus, item.onLabel || "ON", item.offLabel || "OFF");
    const StatusIcon = cs.Icon;
    return (
      <div className={cn("flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors", cs.bg, cs.border)}>
        <div className="rounded-md flex items-center justify-center flex-shrink-0"
          style={{ width: iconSize * 1.7, height: iconSize * 1.7, backgroundColor: item.iconBgColor || "#3B82F6" }}>
          {IconComponent && <IconComponent style={{ width: iconSize, height: iconSize, color: item.iconColor || "#FFF" }} />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate text-slate-500 dark:text-slate-400" style={{ fontSize: fontSize * 0.85 }}>
            {item.customName || item.selectedKey}
          </p>
          <div className="flex items-center gap-1">
            <StatusIcon className={cs.text} style={{ width: fontSize, height: fontSize }} />
            <span className={cn("font-bold", cs.text)} style={{ fontSize }}>
              {state.hasData ? cs.label : "—"}
            </span>
          </div>
        </div>
        <div className={cn("rounded-full flex-shrink-0", state.hasData ? cs.indicator : "bg-slate-300 dark:bg-slate-600")} style={{ width: 7, height: 7 }} />
      </div>
    );
  }

  const displayVal = state.hasData ? formatValue(state.rawValue) : "—";
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200/60 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/30 px-2 py-1.5">
      <div className="rounded-md flex items-center justify-center flex-shrink-0"
        style={{ width: iconSize * 1.7, height: iconSize * 1.7, backgroundColor: item.iconBgColor || "#3B82F6" }}>
        {IconComponent && <IconComponent style={{ width: iconSize, height: iconSize, color: item.iconColor || "#FFF" }} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate text-slate-500 dark:text-slate-400" style={{ fontSize: fontSize * 0.85 }}>
          {item.customName || item.selectedKey}
        </p>
        <p className="font-bold text-slate-900 dark:text-slate-100" style={{ fontSize }}>
          {displayVal}
          {item.units && <span className="font-normal text-slate-400 ml-0.5" style={{ fontSize: fontSize * 0.8 }}>{item.units}</span>}
        </p>
      </div>
      <div className={cn("rounded-full flex-shrink-0", state.hasData ? "bg-emerald-500" : "bg-amber-400 animate-pulse")} style={{ width: 7, height: 7 }} />
    </div>
  );
};

// ── Main widget ───────────────────────────────────────────────────────────────
export const MqttKeyStatusCardWidget = ({ config: rawConfig }: { config: Config }) => {
  const config = rawConfig ?? ({ widgetTitle: "MQTT Status Card", deviceTopic: "", selectedKey: "" } as Config);
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();

  // Normalize to items array internally
  const items: MqttKeyItem[] = config.items?.length
    ? config.items
    : [{
        customName: undefined,
        selectedKey: config.selectedKey || "",
        useCondition: config.useCondition,
        onValue: config.onValue,
        offValue: config.offValue,
        onLabel: config.onLabel,
        offLabel: config.offLabel,
        selectedIcon: config.selectedIcon,
        iconColor: config.iconColor,
        iconBgColor: config.iconBgColor,
        multiply: config.multiply,
        units: config.units,
      }];

  const isMulti = items.length > 1;

  // ── State ──────────────────────────────────────────────────────────────────
  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>({});
  const [globalStatus, setGlobalStatus] = useState<"loading" | "error" | "waiting" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ── Responsive (single mode only) ─────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [layoutMode, setLayoutMode] = useState<"horizontal" | "vertical" | "compact">("horizontal");
  const [dynamicSizes, setDynamicSizes] = useState({ valueFontSize: 20, unitFontSize: 14, iconSize: 32, titleFontSize: 12, padding: 16, gap: 12, headerHeight: 40 });

  useLayoutEffect(() => {
    if (isMulti) return; // skip responsive calc for multi mode
    const container = containerRef.current;
    if (!container) return;
    const updateLayout = () => {
      const { width, height } = container.getBoundingClientRect();
      const ar = width / height;
      const area = width * height;
      const minDim = Math.min(width, height);
      let mode: "horizontal" | "vertical" | "compact";
      if (area < 10000 || minDim < 100) mode = "compact";
      else if (ar > 1.5 && width > 250) mode = "horizontal";
      else mode = "vertical";
      setLayoutMode(mode);
      const headerH = Math.max(36, Math.min(height * 0.25, 56));
      const availH = height - headerH;
      const sizes = {
        compact: { valueFontSize: Math.max(14, Math.min(minDim * 0.14, 20)), unitFontSize: Math.max(10, Math.min(minDim * 0.09, 14)), iconSize: Math.max(16, Math.min(minDim * 0.22, 26)), titleFontSize: Math.max(10, Math.min(minDim * 0.09, 13)), padding: Math.max(8, minDim * 0.06), gap: Math.max(4, minDim * 0.04), headerHeight: Math.max(32, Math.min(minDim * 0.3, 44)) },
        horizontal: { valueFontSize: Math.max(18, Math.min(availH * 0.35, width * 0.08, 48)), unitFontSize: Math.max(12, Math.min(availH * 0.25, width * 0.055, 24)), iconSize: Math.max(24, Math.min(availH * 0.4, width * 0.08, 56)), titleFontSize: Math.max(11, Math.min(headerH * 0.35, 16)), padding: Math.max(16, Math.min(width * 0.04, 32)), gap: Math.max(12, Math.min(width * 0.05, 28)), headerHeight: headerH },
        vertical: { valueFontSize: Math.max(20, Math.min(width * 0.18, availH * 0.18, 56)), unitFontSize: Math.max(13, Math.min(width * 0.12, availH * 0.12, 28)), iconSize: Math.max(28, Math.min(width * 0.2, availH * 0.2, 64)), titleFontSize: Math.max(12, Math.min(headerH * 0.35, 16)), padding: Math.max(16, Math.min(height * 0.06, 32)), gap: Math.max(10, Math.min(availH * 0.08, 24)), headerHeight: headerH },
      };
      setDynamicSizes(sizes[mode]);
    };
    const ro = new ResizeObserver(updateLayout);
    ro.observe(container);
    updateLayout();
    return () => ro.disconnect();
  }, [isMulti]);

  // ── Validation ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!config.deviceTopic) { setGlobalStatus("error"); setErrorMessage("No MQTT topic configured."); return; }
    const keys = items.map((it) => it.selectedKey).filter(Boolean);
    if (!keys.length) { setGlobalStatus("error"); setErrorMessage("No key selected."); return; }
    setGlobalStatus("loading");
  }, [config.deviceTopic, items.length]);

  // ── MQTT handler ───────────────────────────────────────────────────────────
  const handleMqttMessage = useCallback(
    (_topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const inner = typeof payload.value === "string" ? JSON.parse(payload.value) : payload.value || {};

        setKeyStates((prev) => {
          const next = { ...prev };
          for (const item of items) {
            if (!item.selectedKey || !Object.prototype.hasOwnProperty.call(inner, item.selectedKey)) continue;
            const val = inner[item.selectedKey];
            const conditionStatus = item.useCondition ? resolveCondition(val, item) : "UNKNOWN";
            const rawValue = item.useCondition
              ? String(val)
              : typeof val === "number" ? val * (item.multiply || 1) : val;
            next[item.selectedKey] = { rawValue, conditionStatus, hasData: true };
          }
          return next;
        });

        setGlobalStatus("ok");
        setLastUpdate(new Date());
      } catch (e) {
        console.error("[MqttKeyStatusCard] parse error:", e);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.items, config.selectedKey]
  );

  useEffect(() => {
    if (!config.deviceTopic || !items.some((it) => it.selectedKey)) return;
    if (!isReady || connectionStatus !== "Connected") { setGlobalStatus("waiting"); return; }
    setGlobalStatus("waiting");
    subscribe(config.deviceTopic, handleMqttMessage);
    return () => unsubscribe(config.deviceTopic, handleMqttMessage);
  }, [config.deviceTopic, isReady, connectionStatus, subscribe, unsubscribe, handleMqttMessage]);

  // ── Shared header status dot ───────────────────────────────────────────────
  const getStatusDot = () => {
    if (globalStatus === "ok") return isMulti ? "bg-emerald-500" : (items[0]?.useCondition ? getConditionStyle(keyStates[items[0].selectedKey]?.conditionStatus ?? "UNKNOWN", items[0].onLabel || "ON", items[0].offLabel || "OFF").indicator : "bg-emerald-500");
    if (globalStatus === "error") return "bg-red-500";
    return "bg-amber-500 animate-pulse";
  };

  // ── Multi-key render ───────────────────────────────────────────────────────
  if (isMulti) {
    const headerH = 40;
    return (
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300"
        style={{ minWidth: 120, minHeight: 80 }}
      >
        <div className="flex items-center justify-between px-3 bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/60 dark:border-slate-600/80 flex-shrink-0" style={{ height: headerH }}>
          <h3 className="font-semibold truncate text-slate-700 dark:text-slate-300" style={{ fontSize: 13 }}>{config.widgetTitle}</h3>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {connectionStatus === "Connected" ? <Wifi className="text-slate-400" style={{ width: 12, height: 12 }} /> : <WifiOff className="text-slate-400" style={{ width: 12, height: 12 }} />}
            <div className={cn("rounded-full", getStatusDot())} style={{ width: 8, height: 8 }} />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {globalStatus === "error" ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <AlertTriangle className="text-red-500" style={{ width: 20, height: 20 }} />
              <p className="text-xs text-slate-500 text-center">{errorMessage}</p>
            </div>
          ) : globalStatus === "loading" ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-slate-400" style={{ width: 20, height: 20 }} /></div>
          ) : (
            items.map((item, i) => (
              <MultiKeyRow
                key={`${item.selectedKey}-${i}`}
                item={item}
                state={keyStates[item.selectedKey] ?? { rawValue: null, conditionStatus: "UNKNOWN", hasData: false }}
              />
            ))
          )}
        </div>
      </div>
    );
  }

  // ── Single-key render (original behavior) ──────────────────────────────────
  const singleItem = items[0];
  const singleState = keyStates[singleItem?.selectedKey] ?? { rawValue: null, conditionStatus: "UNKNOWN", hasData: false };
  const IconComponent = getIconComponent(singleItem?.selectedIcon || "Zap");

  const renderPlaceholder = (icon: React.ReactNode, text?: string) => (
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      {icon}
      {layoutMode !== "compact" && text && (
        <p className="text-slate-500 dark:text-slate-400" style={{ fontSize: dynamicSizes.titleFontSize }}>{text}</p>
      )}
    </div>
  );

  const renderSingleContent = () => {
    if (globalStatus === "loading") return renderPlaceholder(<Loader2 className="animate-spin text-slate-400" style={{ width: dynamicSizes.iconSize, height: dynamicSizes.iconSize }} />, "Loading...");
    if (globalStatus === "error") return renderPlaceholder(<AlertTriangle className="text-red-500" style={{ width: dynamicSizes.iconSize, height: dynamicSizes.iconSize }} />, errorMessage);
    if (globalStatus === "waiting" && !singleState.hasData) return renderPlaceholder(<Clock className="text-slate-400" style={{ width: dynamicSizes.iconSize, height: dynamicSizes.iconSize }} />, "Waiting for data...");

    if (singleItem?.useCondition) {
      const cs = getConditionStyle(singleState.conditionStatus, singleItem.onLabel || "ON", singleItem.offLabel || "OFF");
      const StatusIcon = cs.Icon;
      const iconEl = IconComponent && (
        <div className={cn("rounded-xl flex items-center justify-center flex-shrink-0 border", cs.bg, cs.border)} style={{ width: dynamicSizes.iconSize * 1.4, height: dynamicSizes.iconSize * 1.4 }}>
          <IconComponent style={{ width: dynamicSizes.iconSize * 0.7, height: dynamicSizes.iconSize * 0.7, color: singleItem.iconColor || "#FFFFFF" }} />
        </div>
      );
      const valueEl = (
        <div className="flex flex-col items-center justify-center min-w-0" style={{ gap: Math.max(3, dynamicSizes.gap * 0.3) }}>
          <div className="flex items-center gap-2">
            <StatusIcon className={cs.text} style={{ width: dynamicSizes.iconSize * 0.6, height: dynamicSizes.iconSize * 0.6 }} />
            <span className={cn("font-bold tracking-tight", cs.text)} style={{ fontSize: dynamicSizes.valueFontSize }}>{cs.label}</span>
          </div>
          {lastUpdate && layoutMode !== "compact" && (
            <div className="flex items-center gap-1 text-slate-400" style={{ fontSize: Math.max(dynamicSizes.titleFontSize * 0.65, 8) }}>
              <Clock style={{ width: Math.max(dynamicSizes.titleFontSize * 0.65, 8), height: Math.max(dynamicSizes.titleFontSize * 0.65, 8) }} />
              <span className="font-mono">{lastUpdate ? formatTime(lastUpdate) : ""}</span>
            </div>
          )}
        </div>
      );
      if (layoutMode === "compact") return <div className="flex flex-col items-center justify-center w-full" style={{ gap: dynamicSizes.gap * 0.8 }}>{iconEl}{valueEl}</div>;
      if (layoutMode === "horizontal") return <div className="flex items-center justify-center w-full h-full" style={{ gap: dynamicSizes.gap }}>{iconEl}{valueEl}</div>;
      return <div className="flex flex-col items-center justify-center w-full h-full" style={{ gap: dynamicSizes.gap }}>{iconEl}{valueEl}</div>;
    }

    const iconEl = IconComponent && (
      <div className="rounded-xl shadow-sm flex items-center justify-center flex-shrink-0 border border-white/20" style={{ backgroundColor: singleItem?.iconBgColor || "#3B82F6", width: dynamicSizes.iconSize * 1.4, height: dynamicSizes.iconSize * 1.4 }}>
        <IconComponent style={{ width: dynamicSizes.iconSize * 0.7, height: dynamicSizes.iconSize * 0.7, color: singleItem?.iconColor || "#FFFFFF" }} />
      </div>
    );
    const valueEl = (
      <div className="flex flex-col items-center justify-center min-w-0" style={{ gap: Math.max(3, dynamicSizes.gap * 0.3) }}>
        <div className="flex items-baseline gap-1.5 justify-center flex-wrap">
          <span className="font-bold tracking-tight leading-none text-slate-900 dark:text-slate-100" style={{ fontSize: dynamicSizes.valueFontSize }}>{formatValue(singleState.rawValue)}</span>
          {singleItem?.units && <span className="font-medium text-slate-500 dark:text-slate-400" style={{ fontSize: dynamicSizes.unitFontSize }}>{singleItem.units}</span>}
        </div>
        {lastUpdate && layoutMode !== "compact" && (
          <div className="flex items-center gap-1 text-slate-400" style={{ fontSize: Math.max(dynamicSizes.titleFontSize * 0.65, 8) }}>
            <Clock style={{ width: Math.max(dynamicSizes.titleFontSize * 0.65, 8), height: Math.max(dynamicSizes.titleFontSize * 0.65, 8) }} />
            <span className="font-mono">{lastUpdate ? formatTime(lastUpdate) : ""}</span>
          </div>
        )}
      </div>
    );
    if (layoutMode === "compact") return <div className="flex flex-col items-center justify-center w-full" style={{ gap: dynamicSizes.gap * 0.8 }}>{iconEl}{valueEl}</div>;
    if (layoutMode === "horizontal") return <div className="flex items-center justify-center w-full h-full" style={{ gap: dynamicSizes.gap }}>{iconEl}{valueEl}</div>;
    return <div className="flex flex-col items-center justify-center w-full h-full" style={{ gap: dynamicSizes.gap }}>{iconEl}{valueEl}</div>;
  };

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group" style={{ minWidth: 100, minHeight: 80 }}>
      <div className="absolute top-0 left-0 right-0 px-4 bg-slate-50/80 dark:bg-slate-800/40 flex items-center justify-between flex-shrink-0 border-b border-slate-200/60 dark:border-slate-600/80" style={{ height: dynamicSizes.headerHeight }}>
        <h3 className="font-medium truncate text-slate-700 dark:text-slate-300" style={{ fontSize: dynamicSizes.titleFontSize, lineHeight: 1.3, flex: 1 }} title={config.widgetTitle}>{config.widgetTitle}</h3>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {connectionStatus === "Connected" ? <Wifi className="text-slate-400 dark:text-slate-500" style={{ width: Math.max(dynamicSizes.titleFontSize * 0.9, 12), height: Math.max(dynamicSizes.titleFontSize * 0.9, 12) }} /> : <WifiOff className="text-slate-400 dark:text-slate-500" style={{ width: Math.max(dynamicSizes.titleFontSize * 0.9, 12), height: Math.max(dynamicSizes.titleFontSize * 0.9, 12) }} />}
          <div className={cn("rounded-full transition-all duration-300", getStatusDot())} style={{ width: Math.max(dynamicSizes.titleFontSize * 0.65, 8), height: Math.max(dynamicSizes.titleFontSize * 0.65, 8) }} />
        </div>
      </div>
      <div className="w-full h-full flex items-center justify-center" style={{ paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5, paddingBottom: dynamicSizes.padding, paddingLeft: dynamicSizes.padding, paddingRight: dynamicSizes.padding }}>
        {renderSingleContent()}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
