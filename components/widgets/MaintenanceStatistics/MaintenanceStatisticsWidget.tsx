// File: components/widgets/MaintenanceStatistics/MaintenanceStatisticsWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { subDays, subMonths, subYears } from "date-fns";
import {
  Loader2,
  AlertTriangle,
  BarChart,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MaintenanceItem {
  id: number;
  name: string;
  startTask: string;
  endTask: string;
  status: string;
  assignedTo: { id: string; email: string; phoneNumber?: string };
  deviceTarget: { name: string };
  createdAt: string;
}

interface StatisticsData {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  scheduledTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageDuration: number;
  tasksThisMonth: number;
  tasksLastMonth: number;
}

interface Props {
  config: {
    widgetTitle?: string;
    timeRange?: "7d" | "30d" | "90d" | "1y";
    showPercentages?: boolean;
    includeOverdue?: boolean;
    chartType?: "bar" | "pie" | "line";
  };
}

export const MaintenanceStatisticsWidget = ({ config }: Props) => {
  const [maintenanceList, setMaintenanceList] = useState<MaintenanceItem[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [connectionStatus] = useState<"Connected" | "Disconnected">(
    "Connected"
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicSizes, setDynamicSizes] = useState({
    fontSize: 10,
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

  // Calculate statistics
  const calculateStatistics = (data: MaintenanceItem[]) => {
    const now = new Date();
    let cutoffDate = now;

    switch (config.timeRange) {
      case "7d":
        cutoffDate = subDays(now, 7);
        break;
      case "30d":
        cutoffDate = subDays(now, 30);
        break;
      case "90d":
        cutoffDate = subDays(now, 90);
        break;
      case "1y":
        cutoffDate = subYears(now, 1);
        break;
      default:
        cutoffDate = subDays(now, 30);
    }

    const filteredData = data.filter(
      (item) => new Date(item.createdAt) >= cutoffDate
    );
    const totalTasks = filteredData.length;
    const completedTasks = filteredData.filter(
      (item) => item.status.toLowerCase() === "completed"
    ).length;
    const inProgressTasks = filteredData.filter((item) => {
      const s = item.status.toLowerCase();
      return s === "in_progress" || s === "in progress" || s === "outs";
    }).length;
    const scheduledTasks = filteredData.filter(
      (item) => item.status.toLowerCase() === "scheduled"
    ).length;
    const overdueTasks = filteredData.filter(
      (item) =>
        new Date(item.endTask) < now &&
        item.status.toLowerCase() !== "completed"
    ).length;

    const completionRate =
      totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    const completedTasksWithDuration = filteredData
      .filter((item) => item.status.toLowerCase() === "completed")
      .map(
        (item) =>
          (new Date(item.endTask).getTime() -
            new Date(item.startTask).getTime()) /
          (1000 * 60 * 60 * 24)
      );

    const averageDuration =
      completedTasksWithDuration.length > 0
        ? completedTasksWithDuration.reduce((a, b) => a + b, 0) /
          completedTasksWithDuration.length
        : 0;

    const thisMonthStart = subMonths(now, 0);
    const lastMonthStart = subMonths(now, 1);
    const tasksThisMonth = data.filter(
      (item) => new Date(item.createdAt) >= thisMonthStart
    ).length;
    const tasksLastMonth = data.filter((item) => {
      const c = new Date(item.createdAt);
      return c >= lastMonthStart && c < thisMonthStart;
    }).length;

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      scheduledTasks,
      overdueTasks,
      completionRate,
      averageDuration,
      tasksThisMonth,
      tasksLastMonth,
    };
  };

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
      const maintenanceData = Array.isArray(data) ? data : [];
      setMaintenanceList(maintenanceData);
      setStatistics(calculateStatistics(maintenanceData));
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
  }, [config.timeRange]);

  useEffect(() => {
    fetchMaintenanceData();
  }, [config.timeRange, fetchMaintenanceData]);

  // FIXED: Status styling
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
      label: "text-slate-600 dark:text-slate-400",
    };

    switch (status) {
      case "ok":
        return { ...baseStyles, indicator: "bg-emerald-500", pulse: false };
      case "error":
        return { ...baseStyles, indicator: "bg-red-500", pulse: false };
      case "loading":
        return { ...baseStyles, indicator: "bg-amber-500", pulse: true };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
        };
    }
  };

  const formatPercentage = (value: number) =>
    config.showPercentages ? `${value.toFixed(1)}%` : value.toFixed(1);

  const styles = getStatusStyles();

  // Render statistics
  const renderStatistics = () => {
    if (!statistics) return null;

    const monthTrend = statistics.tasksThisMonth - statistics.tasksLastMonth;
    const isUpward = monthTrend > 0;

    return (
      <div className="grid grid-cols-2 gap-2 p-2">
        {/* Completion Rate */}
        <div className="bg-card rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex items-center justify-between mb-1">
            <CheckCircle className="h-4 w-4 text-green-500 dark:text-green-400" />
            <span
              className="text-lg font-bold text-green-600 dark:text-green-400"
              style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
            >
              {formatPercentage(statistics.completionRate)}
            </span>
          </div>
          <p
            className="text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
          >
            Completion Rate
          </p>
          <p
            className="text-slate-500 dark:text-slate-500"
            style={{ fontSize: `${dynamicSizes.fontSize - 2}px` }}
          >
            {statistics.completedTasks}/{statistics.totalTasks} tasks
          </p>
        </div>

        {/* Average Duration */}
        <div className="bg-card rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex items-center justify-between mb-1">
            <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <span
              className="text-lg font-bold text-blue-600 dark:text-blue-400"
              style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
            >
              {statistics.averageDuration.toFixed(1)}
            </span>
          </div>
          <p
            className="text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
          >
            Avg. Duration
          </p>
          <p
            className="text-slate-500 dark:text-slate-500"
            style={{ fontSize: `${dynamicSizes.fontSize - 2}px` }}
          >
            days per task
          </p>
        </div>

        {/* In Progress */}
        <div className="bg-card rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex items-center justify-between mb-1">
            <AlertCircle className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
            <span
              className="text-lg font-bold text-yellow-600 dark:text-yellow-400"
              style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
            >
              {statistics.inProgressTasks}
            </span>
          </div>
          <p
            className="text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
          >
            In Progress
          </p>
          <p
            className="text-slate-500 dark:text-slate-500"
            style={{ fontSize: `${dynamicSizes.fontSize - 2}px` }}
          >
            active tasks
          </p>
        </div>

        {/* Monthly Trend */}
        <div className="bg-card rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex items-center justify-between mb-1">
            {isUpward ? (
              <TrendingUp className="h-4 w-4 text-green-500 dark:text-green-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 dark:text-red-400" />
            )}
            <span
              className={`text-lg font-bold ${
                isUpward
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
              style={{ fontSize: `${dynamicSizes.fontSize + 2}px` }}
            >
              {isUpward ? "+" : ""}
              {monthTrend}
            </span>
          </div>
          <p
            className="text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
          >
            Monthly Trend
          </p>
          <p
            className="text-slate-500 dark:text-slate-500"
            style={{ fontSize: `${dynamicSizes.fontSize - 2}px` }}
          >
            vs last month
          </p>
        </div>

        {/* Status Breakdown */}
        <div className="col-span-2 bg-card rounded-lg border border-slate-200 dark:border-slate-700 p-2">
          <div className="flex items-center mb-2">
            <BarChart className="h-4 w-4 text-slate-500 dark:text-slate-400 mr-1" />
            <span
              className="font-semibold text-slate-700 dark:text-slate-300"
              style={{ fontSize: `${dynamicSizes.fontSize}px` }}
            >
              Status Breakdown
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span
                className="text-slate-600 dark:text-slate-400"
                style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
              >
                Scheduled
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-blue-500 dark:bg-blue-600 rounded-full"
                    style={{
                      width: `${
                        statistics.totalTasks > 0
                          ? (statistics.scheduledTasks /
                              statistics.totalTasks) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span
                  className="font-medium text-slate-700 dark:text-slate-300"
                  style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                >
                  {statistics.scheduledTasks}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span
                className="text-slate-600 dark:text-slate-400"
                style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
              >
                In Progress
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-yellow-500 dark:bg-yellow-600 rounded-full"
                    style={{
                      width: `${
                        statistics.totalTasks > 0
                          ? (statistics.inProgressTasks /
                              statistics.totalTasks) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span
                  className="font-medium text-slate-700 dark:text-slate-300"
                  style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                >
                  {statistics.inProgressTasks}
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span
                className="text-slate-600 dark:text-slate-400"
                style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
              >
                Completed
              </span>
              <div className="flex items-center">
                <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mr-2">
                  <div
                    className="h-full bg-green-500 dark:bg-green-600 rounded-full"
                    style={{
                      width: `${
                        statistics.totalTasks > 0
                          ? (statistics.completedTasks /
                              statistics.totalTasks) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span
                  className="font-medium text-slate-700 dark:text-slate-300"
                  style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                >
                  {statistics.completedTasks}
                </span>
              </div>
            </div>

            {config.includeOverdue && statistics.overdueTasks > 0 && (
              <div className="flex justify-between items-center">
                <span
                  className="text-slate-600 dark:text-slate-400"
                  style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                >
                  Overdue
                </span>
                <div className="flex items-center">
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mr-2">
                    <div
                      className="h-full bg-red-500 dark:bg-red-600 rounded-full"
                      style={{
                        width: `${
                          statistics.totalTasks > 0
                            ? (statistics.overdueTasks /
                                statistics.totalTasks) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span
                    className="font-medium text-red-600 dark:text-red-400"
                    style={{ fontSize: `${dynamicSizes.fontSize - 1}px` }}
                  >
                    {statistics.overdueTasks}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Loading statistics...
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

    if (!statistics || statistics.totalTasks === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center">
          <BarChart className="h-8 w-8 text-slate-400 dark:text-slate-500 mb-2" />
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No maintenance data available
          </p>
        </div>
      );
    }

    return renderStatistics();
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
          className={`font-medium truncate transition-colors ${styles.title} flex-1 flex items-center gap-2`}
          style={{
            fontSize: `${dynamicSizes.titleFontSize}px`,
            lineHeight: 1.3,
          }}
          title={config.widgetTitle || "Maintenance Statistics"}
        >
          <BarChart
            className="text-slate-400 dark:text-slate-500 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
            }}
          />
          <span className="truncate">
            {config.widgetTitle || "Maintenance Statistics"}
          </span>
        </h3>

        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <div
            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200/50 dark:border-slate-700/50"
            style={{
              fontSize: `${Math.max(dynamicSizes.titleFontSize * 0.7, 9)}px`,
            }}
          >
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {config.timeRange || "30d"}
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
            className={`rounded-full transition-all ${styles.indicator} ${
              styles.pulse ? "animate-pulse" : ""
            }`}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        className="w-full h-full overflow-y-auto"
        style={{ paddingTop: dynamicSizes.headerHeight }}
      >
        {renderContent()}
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
