// File: components/widgets/MaintenanceList/MaintenanceListWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Loader2,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Wrench,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MaintenanceItem {
  id: number;
  name: string;
  description?: string;
  startTask: string;
  endTask: string;
  status: string;
  assignedTo: {
    id: string;
    email: string;
    phoneNumber?: string;
  };
  deviceTarget: {
    name: string;
  } | null;
  createdAt: string;
}

interface Props {
  config: {
    widgetTitle?: string;
    maxItems?: number;
    statusFilter?: string[];
    autoRefresh?: boolean;
    refreshInterval?: number;
    showDescription?: boolean;
    showAssignee?: boolean;
    showDevice?: boolean;
    dateFormat?: "relative" | "absolute";
  };
}

export const MaintenanceListWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicSizes, setDynamicSizes] = useState({
    fontSize: 12,
    titleFontSize: 14,
    headerHeight: 40,
  });

  // FIXED: Responsive sizing
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      const headerHeight = Math.max(36, Math.min(height * 0.15, 48));
      const baseSize = Math.max(10, width / 30);
      const fontSize = Math.min(14, baseSize);
      const titleSize = Math.max(11, Math.min(headerHeight * 0.32, 14));

      setDynamicSizes({
        fontSize: Math.round(fontSize),
        titleFontSize: Math.round(titleSize),
        headerHeight,
      });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  // FIXED: Memoized fetch function to prevent memory leaks
  const fetchMaintenanceData = useCallback(async () => {
    try {
      setStatus("loading");
      setErrorMessage("");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(`${API_BASE_URL}/api/maintenance`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const filteredData = Array.isArray(data)
        ? data.filter((item: MaintenanceItem) =>
            !config.statusFilter || config.statusFilter.length === 0
              ? true
              : config.statusFilter.includes(item.status),
          )
        : [];

      setMaintenanceList(filteredData.slice(0, config.maxItems || 10));
      setStatus("ok");
      setErrorMessage("");
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setErrorMessage("Request timed out");
        setStatus("error");
        return;
      }

      setStatus("error");
      setErrorMessage(err.message || "Failed to load maintenance data");
    }
  }, [config.maxItems, config.statusFilter]);

  useEffect(() => {
    fetchMaintenanceData();
    // Auto-refresh removed to prevent flickering
    return () => {
      // Cleanup
    };
  }, [
    config.statusFilter,
    config.maxItems,
    config.autoRefresh,
    config.refreshInterval,
    fetchMaintenanceData,
  ]);

  // FIXED: Status colors with dark mode
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300";
      case "in_progress":
      case "in progress":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
      case "completed":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
      case "cancelled":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
      case "overdue":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300";
    }
  };

  // FIXED: Status styling
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
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

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (config.dateFormat === "relative") {
      const now = new Date();
      const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
      if (diffInHours < 1) return `${Math.floor(diffInHours * 60)} menit lalu`;
      if (diffInHours < 24) return `${Math.floor(diffInHours)} jam lalu`;
      return `${Math.floor(diffInHours / 24)} hari lalu`;
    }
    return format(date, "dd MMM yyyy, HH:mm", { locale: id });
  };

  const styles = getStatusStyles();

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading maintenance data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <AlertTriangle className="h-8 w-8 text-red-500 dark:text-red-400 mb-2" />
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">
            Error
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {errorMessage}
          </p>
        </div>
      );
    }

    if (maintenanceList.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <Wrench className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No maintenance tasks found
          </p>
        </div>
      );
    }

    return (
      <div className="h-full overflow-y-auto">
        <div className="p-2 space-y-2">
          {maintenanceList.map((item) => {
            const isOverdue =
              new Date(item.endTask) < new Date() &&
              item.status.toLowerCase() !== "completed";

            return (
              <div
                key={item.id}
                className={`
                  p-3 rounded-lg border transition-all duration-200 hover:shadow-md
                  ${isOverdue
                    ? "border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-card"
                  }
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <h4
                      className="font-semibold text-slate-900 dark:text-slate-100 truncate"
                      style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
                      title={item.name}
                    >
                      {item.name}
                    </h4>
                    {config.showDescription !== false && item.description && (
                      <p
                        className="text-slate-600 dark:text-slate-400 mt-1 line-clamp-2"
                        style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    {isOverdue && (
                      <AlertCircle className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    )}
                    <div
                      className={`px-2 py-0.5 rounded-md font-medium ${getStatusColor(
                        item.status
                      )}`}
                      style={{ fontSize: `${dynamicSizes.fontSize - 2}px` }}
                    >
                      {item.status}
                    </div>
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-1">
                  {config.showDevice !== false && item.deviceTarget && (
                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                      <Wrench className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span
                        className="truncate"
                        style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                        title={item.deviceTarget.name}
                      >
                        {item.deviceTarget.name}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span
                        style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                      >
                        {format(new Date(item.startTask), "dd MMM", {
                          locale: id,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span
                        style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                      >
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>

                  {config.showAssignee !== false && (
                    <div className="flex items-center text-slate-600 dark:text-slate-400">
                      <User className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      <span
                        className="truncate"
                        style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                        title={item.assignedTo.email}
                      >
                        {item.assignedTo.email.split("@")[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden cursor-move bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group hover:scale-[1.01] transform-gpu"
      style={{ minWidth: 100, minHeight: 80 }}
    >
      {/* FIXED: Header */}
      <div
        className="absolute top-0 left-0 right-0 px-4 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between flex-shrink-0 border-b border-slate-200/40 dark:border-slate-700/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        <h3
          className={`font-medium truncate transition-colors duration-200 ${styles.title} flex-1 flex items-center gap-2`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.widgetTitle || "Maintenance List"}
        >
          <Wrench
            className="text-slate-400 dark:text-slate-500 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />
          <span className="truncate">
            {config.widgetTitle || "Maintenance List"}
          </span>
        </h3>

        {/* Status indicators */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {config.autoRefresh && (
            <div
              className="h-2 w-2 rounded-full bg-emerald-400 dark:bg-emerald-500 animate-pulse"
              title="Auto-refresh enabled"
            />
          )}

          <div
            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50"
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.7, 9)}px`,
            }}
          >
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {maintenanceList.length}/{config.maxItems || 10}
            </span>
          </div>

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
            className={`rounded-full transition-all duration-300 ${styles.indicator
              } ${styles.pulse ? "animate-pulse" : ""}`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="w-full h-full overflow-hidden"
        style={{ paddingTop: dynamicSizes.headerHeight }}
      >
        {renderContent()}
      </div>

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
