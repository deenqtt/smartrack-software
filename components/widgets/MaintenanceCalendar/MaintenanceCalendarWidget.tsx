// File: components/widgets/MaintenanceCalendar/MaintenanceCalendarWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { id } from "date-fns/locale";
import {
  Loader2,
  AlertTriangle,
  Calendar,
  ChevronLeft,
  ChevronRight,
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
  };
}

interface Props {
  config: {
    widgetTitle?: string;
    viewType?: "month" | "week";
    showCompleted?: boolean;
    highlightOverdue?: boolean;
  };
}

export const MaintenanceCalendarWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicSizes, setDynamicSizes] = useState({
    fontSize: 10,
    titleFontSize: 14,
    headerHeight: 40,
  });

  // FIXED: Responsive sizing - consistent with other widgets
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(height * 0.15, 48));

      // Base font size for calendar
      const baseSize = Math.max(8, width / 35);
      const fontSize = Math.min(12, baseSize);
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
      let filteredData = Array.isArray(data) ? data : [];
      if (!config.showCompleted) {
        filteredData = filteredData.filter(
          (item: MaintenanceItem) => item.status.toLowerCase() !== "completed"
        );
      }
      setMaintenanceList(filteredData);
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
  }, [config.showCompleted]);

  useEffect(() => {
    fetchMaintenanceData();
  }, [config.showCompleted, fetchMaintenanceData]);

  // Get tasks for specific date
  const getTasksForDate = (date: Date) => {
    return maintenanceList.filter((item) => {
      const startDate = new Date(item.startTask);
      const endDate = new Date(item.endTask);
      const dateOnly = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
      );
      const startOnly = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        startDate.getDate()
      );
      const endOnly = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate()
      );
      return dateOnly >= startOnly && dateOnly <= endOnly;
    });
  };

  // FIXED: Status colors with dark mode
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "scheduled":
        return "bg-blue-500 dark:bg-blue-600";
      case "in_progress":
      case "in progress":
        return "bg-yellow-500 dark:bg-yellow-600";
      case "completed":
        return "bg-green-500 dark:bg-green-600";
      case "cancelled":
        return "bg-red-500 dark:bg-red-600";
      case "overdue":
        return "bg-orange-500 dark:bg-orange-600";
      case "outs":
        return "bg-purple-500 dark:bg-purple-600";
      default:
        return "bg-slate-500 dark:bg-slate-600";
    }
  };

  // FIXED: Status styling with dark mode
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

  // Navigate months
  const goToPreviousMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const goToNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // Generate calendar days
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const styles = getStatusStyles();

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading calendar...
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

    return (
      <div className="h-full flex flex-col">
        {/* FIXED: Month Navigation with dark mode */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200/40 dark:border-slate-700/40">
          <button
            onClick={goToPreviousMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>

          <h4
            className="font-semibold text-slate-700 dark:text-slate-300"
            style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
          >
            {format(currentDate, "MMMM yyyy", { locale: id })}
          </h4>

          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* FIXED: Calendar Grid with dark mode */}
        <div className="flex-1 p-2 overflow-auto">
          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map((day) => (
              <div
                key={day}
                className="text-center text-slate-600 dark:text-slate-400 font-semibold p-1"
                style={{ fontSize: `${dynamicSizes.fontSize}px` }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* FIXED: Calendar Days with dark mode */}
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const tasksForDay = getTasksForDate(day);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toISOString()}
                  className={`
                    relative border rounded-lg p-1 min-h-[3rem] transition-colors
                    ${
                      isCurrentDay
                        ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700"
                    }
                    ${
                      tasksForDay.length > 0 && !isCurrentDay
                        ? "bg-slate-50 dark:bg-slate-800"
                        : !isCurrentDay
                        ? "bg-card"
                        : ""
                    }
                  `}
                >
                  {/* Day Number */}
                  <div
                    className={`text-center font-semibold ${
                      isCurrentDay
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                    style={{ fontSize: `${dynamicSizes.fontSize}px` }}
                  >
                    {format(day, "d")}
                  </div>

                  {/* Task Indicators */}
                  {tasksForDay.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {tasksForDay.slice(0, 2).map((task) => {
                        const isOverdue =
                          config.highlightOverdue &&
                          new Date(task.endTask) < new Date() &&
                          task.status.toLowerCase() !== "completed";

                        return (
                          <div
                            key={task.id}
                            className={`
                              px-1 py-0.5 rounded text-white text-xs truncate
                              ${
                                isOverdue
                                  ? "bg-orange-500 dark:bg-orange-600"
                                  : getStatusColor(task.status)
                              }
                            `}
                            style={{
                              fontSize: `${Math.max(
                                dynamicSizes.fontSize - 2,
                                7
                              )}px`,
                            }}
                            title={`${task.name} - ${task.status}`}
                          >
                            {task.name.length > 8
                              ? task.name.substring(0, 8) + "..."
                              : task.name}
                          </div>
                        );
                      })}

                      {tasksForDay.length > 2 && (
                        <div
                          className="text-center text-slate-500 dark:text-slate-400 text-xs font-medium"
                          style={{
                            fontSize: `${Math.max(
                              dynamicSizes.fontSize - 2,
                              7
                            )}px`,
                          }}
                        >
                          +{tasksForDay.length - 2}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* FIXED: Legend with dark mode */}
        <div className="border-t border-slate-200/40 dark:border-slate-700/40 px-3 py-2">
          <div className="flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-600" />
              <span
                style={{ fontSize: `${dynamicSizes.fontSize}px` }}
                className="text-slate-600 dark:text-slate-400"
              >
                Scheduled
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-yellow-500 dark:bg-yellow-600" />
              <span
                style={{ fontSize: `${dynamicSizes.fontSize}px` }}
                className="text-slate-600 dark:text-slate-400"
              >
                In Progress
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-green-500 dark:bg-green-600" />
              <span
                style={{ fontSize: `${dynamicSizes.fontSize}px` }}
                className="text-slate-600 dark:text-slate-400"
              >
                Completed
              </span>
            </div>
            {config.highlightOverdue && (
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-orange-500 dark:bg-orange-600" />
                <span
                  style={{ fontSize: `${dynamicSizes.fontSize}px` }}
                  className="text-slate-600 dark:text-slate-400"
                >
                  Overdue
                </span>
              </div>
            )}
          </div>
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
      {/* FIXED: Header - consistent with other widgets */}
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
          title={config.widgetTitle || "Maintenance Calendar"}
        >
          <Calendar
            className="text-slate-400 dark:text-slate-500 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />
          <span className="truncate">
            {config.widgetTitle || "Maintenance Calendar"}
          </span>
        </h3>

        {/* FIXED: Status indicators with wifi */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Task count badge */}
          <div
            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50"
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.7, 9)}px`,
            }}
          >
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {maintenanceList.length}
            </span>
          </div>

          {/* Wifi status */}
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

      {/* Content */}
      <div
        className="w-full h-full overflow-hidden"
        style={{
          paddingTop: dynamicSizes.headerHeight,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
