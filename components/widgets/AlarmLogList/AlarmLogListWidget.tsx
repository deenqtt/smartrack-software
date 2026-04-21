// File: components/widgets/AlarmLogList/AlarmLogListWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  Loader2,
  AlertTriangle,
  Bell,
  Wifi,
  WifiOff,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface AlarmLog {
  id: string;
  deviceName: string;
  alarmName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  status: "ACTIVE" | "CLEARED";
  timestamp: string;
  clearedAt: string | null;
}

interface Props {
  config: {
    widgetTitle: string;
    logLimit: number;
  };
}

// Badge component dengan dark mode
const AlarmTypeBadge = ({
  type,
  fontSize,
}: {
  type: AlarmLog["alarmType"];
  fontSize: number;
}) => {
  const config = {
    CRITICAL: {
      bg: "bg-red-500 dark:bg-red-500",
      text: "text-white dark:text-white",
      border: "border-red-600 dark:border-red-400",
    },
    MAJOR: {
      bg: "bg-yellow-500 dark:bg-yellow-500",
      text: "text-white dark:text-white",
      border: "border-yellow-600 dark:border-yellow-400",
    },
    MINOR: {
      bg: "bg-blue-500 dark:bg-blue-500",
      text: "text-white dark:text-white",
      border: "border-blue-600 dark:border-blue-400",
    },
  };

  const style = config[type];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded font-medium border",
        style.bg,
        style.text,
        style.border
      )}
      style={{ fontSize: `${fontSize}px` }}
    >
      {type}
    </span>
  );
};

export const AlarmLogListWidget = ({ config }: Props) => {
  const [logs, setLogs] = useState<AlarmLog[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    contentFontSize: 11,
    badgeFontSize: 9,
    timelineDotSize: 12,
    padding: 16,
    headerHeight: 40,
  });

  // RESPONSIVE CALCULATION - SAMA PERSIS DENGAN IconStatusCard
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      setDimensions({ width, height });

      // Calculate header height - SAMA dengan IconStatusCard
      const headerHeight = Math.max(36, Math.min(height * 0.25, 56));
      const availableHeight = height - headerHeight;

      // Dynamic sizing - SAMA dengan IconStatusCard
      const baseSize = Math.sqrt(width * height);

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        contentFontSize: Math.max(10, Math.min(baseSize * 0.04, 13)),
        badgeFontSize: Math.max(8, Math.min(baseSize * 0.03, 10)),
        timelineDotSize: Math.max(10, Math.min(baseSize * 0.035, 14)),
        padding: Math.max(12, Math.min(baseSize * 0.05, 20)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Fetch alarm logs with auto-refresh
  useEffect(() => {
    const fetchData = async () => {
      if (status !== "ok") setStatus("loading");
      try {
        const response = await fetch(`${API_BASE_URL}/api/alarm-log`);
        if (!response.ok) throw new Error("Failed to fetch alarm logs");

        const responseData = await response.json();

        // Handle different response formats: direct array or {data: [...]}
        let data: any[];
        if (Array.isArray(responseData)) {
          // Direct array format
          data = responseData;
        } else if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
          // Object with data property format
          data = responseData.data;
        } else {
          console.warn("AlarmLogListWidget: Received unexpected response format:", responseData);
          throw new Error("Invalid response format: expected array of alarm logs or {data: [...]}");
        }

        // Ensure all items in the array have the expected structure
        const validLogs = data.filter((item): item is AlarmLog => {
          return (
            item &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.deviceName === 'string' &&
            typeof item.alarmName === 'string' &&
            ['CRITICAL', 'MAJOR', 'MINOR'].includes(item.alarmType) &&
            ['ACTIVE', 'CLEARED', 'ACKNOWLEDGED'].includes(item.status) &&
            typeof item.timestamp === 'string'
          );
        });

        if (validLogs.length !== data.length) {
          console.warn(`AlarmLogListWidget: Filtered out ${data.length - validLogs.length} invalid log entries`);
        }

        const allLogs: AlarmLog[] = validLogs;
        const limitedLogs = allLogs.slice(0, config.logLimit || 10);

        console.log("AlarmLogListWidget: Processing logs", {
          totalReceived: data.length,
          validLogs: validLogs.length,
          limitedLogs: limitedLogs.length,
          status: "ok"
        });

        setLogs(limitedLogs);
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
  }, [config.logLimit, status]);

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
              width: dynamicSizes.timelineDotSize * 2.5,
              height: dynamicSizes.timelineDotSize * 2.5,
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
              width: dynamicSizes.timelineDotSize * 2.5,
              height: dynamicSizes.timelineDotSize * 2.5,
            }}
          />
          <p
            className="font-medium text-red-600 dark:text-red-400"
            style={{ fontSize: `${dynamicSizes.contentFontSize}px` }}
          >
            {errorMessage}
          </p>
        </div>
      );
    }

    // Empty state
    if (logs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full">
          <Bell
            className="text-slate-300 dark:text-slate-600 mb-2"
            style={{
              width: dynamicSizes.timelineDotSize * 2.5,
              height: dynamicSizes.timelineDotSize * 2.5,
            }}
          />
          <p
            className={styles.secondary}
            style={{ fontSize: `${dynamicSizes.contentFontSize}px` }}
          >
            No alarm logs found.
          </p>
        </div>
      );
    }

    // Success state - timeline
    return (
      <ul className="space-y-0">
        {logs.map((log, index) => (
          <li key={log.id} className="flex gap-3 group">
            {/* Timeline dot and line */}
            <div
              className="flex flex-col items-center"
              style={{ width: dynamicSizes.timelineDotSize }}
            >
              <div
                className={cn(
                  "rounded-full transition-all duration-300",
                  log.status === "ACTIVE"
                    ? "bg-red-500 dark:bg-red-500 ring-4 ring-red-200 dark:ring-red-900/50"
                    : "bg-green-500 dark:bg-green-500"
                )}
                style={{
                  width: dynamicSizes.timelineDotSize,
                  height: dynamicSizes.timelineDotSize,
                  marginTop: 4,
                }}
              />
              {index < logs.length - 1 && (
                <div
                  className="flex-1 bg-slate-300 dark:bg-slate-600"
                  style={{ width: 2, minHeight: 20 }}
                />
              )}
            </div>

            {/* Log content */}
            <div
              className="flex-1 pb-4"
              style={{
                paddingBottom:
                  index === logs.length - 1 ? 0 : dynamicSizes.padding * 0.5,
              }}
            >
              {/* Alarm name and badge */}
              <div className="flex items-start justify-between gap-2 mb-1">
                <p
                  className={cn("font-semibold leading-tight", styles.content)}
                  style={{ fontSize: `${dynamicSizes.contentFontSize}px` }}
                >
                  {log.alarmName}
                </p>
                <AlarmTypeBadge
                  type={log.alarmType}
                  fontSize={dynamicSizes.badgeFontSize}
                />
              </div>

              {/* Device name */}
              <p
                className={cn("leading-tight mb-1", styles.secondary)}
                style={{ fontSize: `${dynamicSizes.contentFontSize * 0.85}px` }}
              >
                {log.deviceName}
              </p>

              {/* Status and time */}
              <div className="flex items-center gap-1.5">
                <Clock
                  className={styles.secondary}
                  style={{
                    width: dynamicSizes.contentFontSize * 0.85,
                    height: dynamicSizes.contentFontSize * 0.85,
                  }}
                />
                <p
                  style={{
                    fontSize: `${dynamicSizes.contentFontSize * 0.85}px`,
                  }}
                >
                  <span
                    className={cn(
                      "font-semibold",
                      log.status === "ACTIVE"
                        ? "text-red-600 dark:text-red-400"
                        : "text-green-600 dark:text-green-400"
                    )}
                  >
                    {log.status}
                  </span>
                  <span className={styles.secondary}>
                    {" - "}
                    {log.status === "CLEARED" && log.clearedAt
                      ? formatDistanceToNow(new Date(log.clearedAt), {
                        addSuffix: true,
                      })
                      : formatDistanceToNow(new Date(log.timestamp), {
                        addSuffix: true,
                      })}
                  </span>
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-card dark:bg-card
                 border border-border/60 dark:border-border/40
                 rounded-xl shadow-sm hover:shadow-md
                 transition-all duration-300 ease-out
                 overflow-hidden group flex flex-col"
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* HEADER - Fixed at top, no overlap with scroll */}
      <div
        className="flex-shrink-0 px-4
                   bg-slate-50/50 dark:bg-slate-900/30
                   flex items-center justify-between
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
          {/* Log count badge */}
          {status === "ok" && (
            <div
              className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50"
              style={{
                fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.75, 9)}px`,
              }}
            >
              <span className="font-medium text-slate-600 dark:text-slate-400">
                {logs.length}
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

      {/* CONTENT - Scrollable area with proper flex layout */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          paddingTop: dynamicSizes.padding * 0.5,
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
