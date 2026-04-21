"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Zap,
  Calendar,
  Database,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface PredictionData {
  currentUsageKwh: number;
  currentCostRupiah: number;
  predictionTodayKwh: number;
  predictionTodayCost: number;
  predictionMonthKwh: number;
  predictionMonthCost: number;
  confidenceScore: number;
}

interface Props {
  config: {
    widgetTitle: string;
    billConfigId: string;
    showType?: "today" | "monthly" | "all";
  };
}

export const PredictiveBillingWidget = ({ config }: Props) => {
  const [data, setData] = useState<PredictionData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 13,
    valueFontSize: 22,
    labelFontSize: 10,
    headerHeight: 44,
  });
  const [layoutMode, setLayoutMode] = useState<"mini" | "compact" | "normal">("normal");

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const { width, height } = container.getBoundingClientRect();
      const headerHeight = Math.max(36, Math.min(height * 0.22, 52));
      const minDim = Math.min(width, height);

      setLayoutMode(
        minDim < 180 || height - headerHeight < 100 ? "mini"
          : minDim < 280 || height - headerHeight < 160 ? "compact"
          : "normal"
      );

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.32, 14)),
        valueFontSize: Math.max(16, Math.min(width * 0.07, 28)),
        labelFontSize: Math.max(9, Math.min(width * 0.035, 11)),
        headerHeight,
      });
    };

    const ro = new ResizeObserver(update);
    ro.observe(container);
    update();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!config.billConfigId) {
      setStatus("error");
      setErrorMessage("Missing bill configuration");
      return;
    }

    const fetch_ = async () => {
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/bill-configs/prediction?configId=${config.billConfigId}`
        );
        if (!res.ok) throw new Error("Failed to fetch prediction");
        setData(await res.json());
        setStatus("ok");
      } catch (e: any) {
        setErrorMessage(e.message);
        setStatus("error");
      }
    };

    fetch_();
    const interval = setInterval(fetch_, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [config.billConfigId]);

  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  // Confidence: derive a label from score (no AI involved, just data coverage)
  const getConfidenceLabel = (score: number) => {
    if (score >= 0.8) return { label: "High", color: "text-emerald-500" };
    if (score >= 0.5) return { label: "Medium", color: "text-amber-500" };
    return { label: "Low", color: "text-red-400" };
  };

  const showType = config.showType ?? "all";
  const showToday = showType === "today" || showType === "all";
  const showMonthly = showType === "monthly" || showType === "all";

  // ── Status dot (consistent with other widgets) ────────────────────────────
  const dotColor =
    status === "ok" ? "bg-emerald-500"
    : status === "error" ? "bg-red-500"
    : "bg-amber-500 animate-pulse";

  // ── Loading ───────────────────────────────────────────────────────────────
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center gap-2 h-full">
      <Loader2
        className="animate-spin text-muted-foreground"
        style={{ width: 28, height: 28 }}
      />
      <p className="text-xs text-muted-foreground">Loading forecast...</p>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  const renderError = () => (
    <div className="flex flex-col items-center justify-center gap-2 h-full px-3 text-center">
      <AlertTriangle className="text-red-400" size={24} />
      <p className="text-xs text-muted-foreground">{errorMessage || "Forecast unavailable"}</p>
    </div>
  );

  // ── Content ───────────────────────────────────────────────────────────────
  const renderContent = () => {
    if (!data) return null;
    const conf = getConfidenceLabel(data.confidenceScore);
    const todayProgress =
      data.predictionTodayKwh > 0
        ? Math.min(100, (data.currentUsageKwh / data.predictionTodayKwh) * 100)
        : 0;

    return (
      <div
        className="flex flex-col gap-3 overflow-auto scrollbar-hide h-full"
        style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
      >
        {/* Today forecast */}
        {showToday && (
          <div className="flex flex-col bg-muted/30 rounded-lg border border-border/40 p-3 gap-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 font-semibold text-muted-foreground uppercase tracking-wider" style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}>
                <Calendar size={10} />
                Forecast Today
              </span>
              <span className="text-[9px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                Estimate
              </span>
            </div>

            <div className="flex items-baseline gap-1.5">
              <span
                className="font-black text-foreground"
                style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
              >
                {formatIDR(data.predictionTodayCost)}
              </span>
            </div>

            {layoutMode !== "mini" && (
              <>
                <div className="flex items-center gap-1.5">
                  <Zap size={9} className="text-amber-500 flex-shrink-0" />
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{ width: `${todayProgress}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground font-medium" style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
                    {data.predictionTodayKwh.toFixed(2)} kWh
                  </span>
                </div>
                <p className="text-muted-foreground/60" style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
                  Used {data.currentUsageKwh.toFixed(3)} kWh so far
                </p>
              </>
            )}
          </div>
        )}

        {/* Monthly forecast */}
        {showMonthly && (
          <div className="flex flex-col bg-indigo-50/40 dark:bg-indigo-900/10 rounded-lg border border-indigo-100/50 dark:border-indigo-800/20 p-3 gap-1.5">
            <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider" style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}>
              <TrendingUp size={10} />
              Est. Monthly
            </span>
            <div
              className="font-black text-indigo-700 dark:text-indigo-300"
              style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
            >
              {formatIDR(data.predictionMonthCost)}
            </div>
            {layoutMode !== "mini" && (
              <p className="text-indigo-500/60 dark:text-indigo-400/50" style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
                {data.predictionMonthKwh.toFixed(2)} kWh · based on 7-day avg
              </p>
            )}
          </div>
        )}

        {/* Data confidence (not AI — just data coverage) */}
        {layoutMode !== "mini" && (
          <div className="flex items-center justify-between px-0.5">
            <div className="flex items-center gap-1.5">
              <Database size={9} className="text-muted-foreground/50" />
              <span className="text-muted-foreground/60" style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
                Data coverage:
              </span>
              <span className={`font-bold ${conf.color}`} style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
                {conf.label}
              </span>
            </div>
            <span className="text-muted-foreground/40" style={{ fontSize: `${dynamicSizes.labelFontSize - 1}px` }}>
              {(data.confidenceScore * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex flex-col bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden"
    >
      {/* Header — consistent with other widgets */}
      <div
        className="px-4 bg-muted/20 flex items-center justify-between flex-shrink-0 border-b border-border/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <CreditCard
            className="text-blue-500 flex-shrink-0"
            style={{ width: dynamicSizes.titleFontSize + 2, height: dynamicSizes.titleFontSize + 2 }}
          />
          <h3
            className="font-semibold text-foreground truncate"
            style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
            title={config.widgetTitle}
          >
            {config.widgetTitle}
          </h3>
        </div>

        {/* Status dot */}
        <div className={`rounded-full flex-shrink-0 ml-2 ${dotColor}`} style={{ width: 8, height: 8 }} />
      </div>

      {/* Content */}
      <div className="flex-1 w-full overflow-hidden p-3">
        {status === "loading" && renderLoading()}
        {status === "error" && renderError()}
        {status === "ok" && renderContent()}
      </div>
    </div>
  );
};
