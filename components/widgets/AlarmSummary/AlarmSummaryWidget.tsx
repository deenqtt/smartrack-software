// File: components/widgets/AlarmSummary/AlarmSummaryWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Loader2, AlertTriangle, Bell, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface SummaryData {
  CRITICAL: number;
  MAJOR: number;
  MINOR: number;
}

interface Props {
  config: {
    widgetTitle: string;
  };
}

export const AlarmSummaryWidget = ({ config }: Props) => {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [layoutMode, setLayoutMode] = useState<"compact" | "normal" | "wide">(
    "normal"
  );
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    labelFontSize: 10,
    valueFontSize: 32,
    padding: 16,
    gap: 12,
    headerHeight: 40,
    cardPadding: 16,
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

      if (w < 250 || h < 150) {
        setLayoutMode("compact");
      } else if (aspectRatio > 2 && w > 500) {
        setLayoutMode("wide");
      } else {
        setLayoutMode("normal");
      }

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(h * 0.12, 48));
      const availableHeight = h - headerHeight;

      // Dynamic sizing
      const baseSize = Math.sqrt(w * h);

      // Calculate card dimensions
      const cardCount = 3;
      const availableWidth = w - dynamicSizes.padding * 2;
      const cardWidth =
        (availableWidth - dynamicSizes.gap * (cardCount - 1)) / cardCount;

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        labelFontSize: Math.max(8, Math.min(cardWidth * 0.12, 12)),
        valueFontSize: Math.max(
          20,
          Math.min(cardWidth * 0.3, availableHeight * 0.35, 56)
        ),
        padding: Math.max(12, Math.min(baseSize * 0.05, 20)),
        gap: Math.max(8, Math.min(baseSize * 0.04, 16)),
        headerHeight,
        cardPadding: Math.max(10, Math.min(cardWidth * 0.15, 20)),
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch alarm summary with auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      if (status !== "ok") setStatus("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/api/alarms/summary`);
        if (!response.ok) throw new Error("Failed to fetch alarm summary");
        setSummary(await response.json());
        setStatus("ok");
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchData();

    return () => {
      // Auto-refresh removed to prevent flickering
    };
  }, [status]);

  // Status styling - KONSISTEN DENGAN WIDGET LAIN
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      content: "text-slate-900 dark:text-slate-100",
      secondary: "text-slate-500 dark:text-slate-400",
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
        };
      case "loading":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  // Render content based on state
  const renderContent = () => {
    const styles = getStatusStyles();

    // Loading state
    if (status === "loading") {
      return (
        <div className="flex items-center justify-center h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.valueFontSize * 0.8,
              height: dynamicSizes.valueFontSize * 0.8,
            }}
          />
        </div>
      );
    }

    // Error state
    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center px-4">
          <AlertTriangle
            className="text-red-500 dark:text-red-400 mb-2"
            style={{
              width: dynamicSizes.valueFontSize * 0.8,
              height: dynamicSizes.valueFontSize * 0.8,
            }}
          />
          <p
            className="font-medium text-red-600 dark:text-red-400"
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    // Empty state
    if (!summary) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Bell
            className="text-slate-300 dark:text-slate-600 mb-2"
            style={{
              width: dynamicSizes.valueFontSize * 0.8,
              height: dynamicSizes.valueFontSize * 0.8,
            }}
          />
          <p
            className={styles.secondary}
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            No data available.
          </p>
        </div>
      );
    }

    // Success state - alarm summary cards
    return (
      <div
        className="grid w-full h-full"
        style={{
          gridTemplateColumns:
            layoutMode === "wide" ? "repeat(3, 1fr)" : "repeat(3, 1fr)",
          gap: `${dynamicSizes.gap}px`,
        }}
      >
        {/* CRITICAL Card */}
        <div
          className={cn(
            "relative rounded-lg text-center transition-all duration-300",
            "bg-red-50/80 dark:bg-red-950/30",
            "border border-red-200/50 dark:border-red-800/30",
            "group hover:shadow-md hover:scale-[1.02]",
            "flex flex-col items-center justify-center"
          )}
          style={{ padding: `${dynamicSizes.cardPadding}px` }}
        >
          <p
            className="font-bold text-red-600 dark:text-red-400 mb-1"
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            CRITICAL
          </p>
          <p
            className="font-bold text-red-700 dark:text-red-300 leading-none"
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {summary.CRITICAL}
          </p>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-red-900/5 dark:from-red-900/20 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* MAJOR Card */}
        <div
          className={cn(
            "relative rounded-lg text-center transition-all duration-300",
            "bg-yellow-50/80 dark:bg-yellow-950/30",
            "border border-yellow-200/50 dark:border-yellow-800/30",
            "group hover:shadow-md hover:scale-[1.02]",
            "flex flex-col items-center justify-center"
          )}
          style={{ padding: `${dynamicSizes.cardPadding}px` }}
        >
          <p
            className="font-bold text-yellow-600 dark:text-yellow-400 mb-1"
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            MAJOR
          </p>
          <p
            className="font-bold text-yellow-700 dark:text-yellow-300 leading-none"
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {summary.MAJOR}
          </p>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/5 dark:from-yellow-900/20 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* MINOR Card */}
        <div
          className={cn(
            "relative rounded-lg text-center transition-all duration-300",
            "bg-blue-50/80 dark:bg-blue-950/30",
            "border border-blue-200/50 dark:border-blue-800/30",
            "group hover:shadow-md hover:scale-[1.02]",
            "flex flex-col items-center justify-center"
          )}
          style={{ padding: `${dynamicSizes.cardPadding}px` }}
        >
          <p
            className="font-bold text-blue-600 dark:text-blue-400 mb-1"
            style={{ fontSize: `${dynamicSizes.labelFontSize}px` }}
          >
            MINOR
          </p>
          <p
            className="font-bold text-blue-700 dark:text-blue-300 leading-none"
            style={{ fontSize: `${dynamicSizes.valueFontSize}px` }}
          >
            {summary.MINOR}
          </p>

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900/5 dark:from-blue-900/20 via-transparent to-transparent pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>
    );
  };

  const styles = getStatusStyles();

  // Calculate total alarms for badge
  const totalAlarms = summary
    ? summary.CRITICAL + summary.MAJOR + summary.MINOR
    : 0;

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
        className="absolute top-0 left-0 right-0  px-4
                   bg-slate-50/50 dark:bg-slate-900/30 
                   flex items-center justify-between flex-shrink-0
                   border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Bell
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
          {/* Total alarms badge */}
          {status === "ok" && (
            <div
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50"
              style={{
                fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.75, 9)}px`,
              }}
            >
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {totalAlarms}
              </span>
            </div>
          )}

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
              styles.indicator,
              styles.pulse ? "animate-pulse" : ""
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
