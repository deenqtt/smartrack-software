"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Settings,
  RotateCcw,
  Clock,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dynamic from "next/dynamic";

// Lazy load ECharts
const ReactECharts = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

// Import design system
import {
  chartDesignSystem,
  getChartColor,
  getResponsiveSize,
} from "../design-system";

interface RealBarSeries {
  name: string;
  data: Array<{ timestamp: string; value: number }>;
  unit: string;
  color: string;
}

interface RealBarChartData {
  series: RealBarSeries[];
  timeRange: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[];
    timeRange?: "1h" | "12h" | "24h" | "7d" | "30d";
    orientation?: "vertical" | "horizontal";
    showValues?: boolean;
    showGrid?: boolean;
  };
}

const DEFAULT_BAR_CHART_CONFIG: Props["config"] = {
  widgetTitle: "Monthly Energy",
  configNames: [],
  timeRange: "30d",
  orientation: "vertical",
};

export const ChartBarWidget = ({ config = DEFAULT_BAR_CHART_CONFIG }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealBarChartData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentOrientation, setCurrentOrientation] = useState<
    "vertical" | "horizontal"
  >(config.orientation || "vertical");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    config.timeRange || "24h",
  );

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    legendFontSize: 12,
    padding: 16,
  });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width } = rect;
      const titleFontSize = getResponsiveSize(18, width, 14, 20);
      const legendFontSize = getResponsiveSize(12, width, 10, 14);
      const padding = getResponsiveSize(16, width, 12, 20);
      setDynamicSizes({ titleFontSize, legendFontSize, padding });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();
    return () => resizeObserver.disconnect();
  }, []);

  // Memoize config dependencies to prevent unnecessary re-runs
  const configNamesKey = JSON.stringify(config.configNames);

  // Load time-series data from API
  useEffect(() => {
    let isMounted = true;
    const loadData = async (isInitialLoad = true) => {
      try {
        if (!config.configNames || config.configNames.length === 0) {
          if (!isMounted) return;
          setData(null);
          setVisibleSeries(new Set());
          setStatus("error");
          setErrorMessage("Please configure at least one data source.");
          return;
        }

        if (isInitialLoad && !data) {
          setStatus("loading");
        } else {
          setIsRefreshing(true);
        }

        let configIds: string[] = [];

        if (config.configNames && config.configNames.length > 0) {
          try {
            const lookupResponse = await fetch(`/api/logging-configs`);
            if (lookupResponse.ok) {
              const lookupData = await lookupResponse.json();
              const configs = Array.isArray(lookupData.data)
                ? lookupData.data
                : [];

              configIds = config.configNames
                .map((configName) => {
                  const foundConfig = configs.find(
                    (c: any) => c.customName === configName,
                  );
                  return foundConfig ? foundConfig.id : null;
                })
                .filter((id) => id !== null) as string[];
            }
          } catch (lookupError) {
            console.warn("[BarChart] Failed to lookup configIds:", lookupError);
          }
        }

        if (configIds.length === 0) {
          throw new Error("No logging configurations matched the selected series.");
        }

        const colors = ["#2563eb", "#16a34a", "#d97706", "#dc2626", "#7c3aed"];

        const seriesPromises = configIds.map(async (configId, index) => {
          const response = await fetch(
            `/api/chart-data/${configId}?timeRange=${selectedTimeRange}&type=trend`,
          );
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to fetch data");
          }

          return {
            name: result.data.configName || `Series ${index + 1}`,
            data: result.data.data || [],
            unit: result.data.unit || "value",
            color: colors[index % colors.length],
          };
        });

        const series = await Promise.all(seriesPromises);

        if (series.length === 0) {
          throw new Error("No chart data returned for the selected series.");
        }

        if (!isMounted) return;

        setData({ series, timeRange: selectedTimeRange });
        setVisibleSeries(new Set(series.map((s) => s.name)));
        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[BarChart] Error loading data:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load data");
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [configNamesKey, selectedTimeRange]);

  const toggleSeries = (seriesName: string) => {
    const newVisible = new Set(visibleSeries);
    if (newVisible.has(seriesName)) {
      newVisible.delete(seriesName);
    } else {
      newVisible.add(seriesName);
    }
    setVisibleSeries(newVisible);
  };

  const getAxisFormatter = (timeRange: string) => {
    switch (timeRange) {
      case "1h":
        return (value: string) => format(new Date(value), "HH:mm");
      case "12h":
      case "24h":
        return (value: string) => format(new Date(value), "dd/MM HH:mm");
      case "7d":
      case "30d":
        return (value: string) => format(new Date(value), "dd/MM");
      default:
        return (value: string) => format(new Date(value), "HH:mm");
    }
  };

  const getTooltipFormatter = (timeRange: string) => {
    return (params: any) => {
      if (!params || params.length === 0) return "";

      let dateFormat;
      switch (timeRange) {
        case "1h":
          dateFormat = "HH:mm";
          break;
        case "12h":
        case "24h":
          dateFormat = "dd/MM HH:mm";
          break;
        case "7d":
        case "30d":
          dateFormat = "dd/MM/yyyy HH:mm";
          break;
        default:
          dateFormat = "dd MMM, HH:mm";
      }

      const date = format(new Date(params[0].axisValue), dateFormat);
      let content = `<strong>${date}</strong><br/>`;
      params.forEach((p: any) => {
        if (p.value !== null && p.value !== undefined) {
          content += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${p.value}</strong><br/>`;
        }
      });
      return content;
    };
  };

  const getEChartsOption = () => {
    if (!data) return {};

    const isHorizontal = currentOrientation === "horizontal";
    const isDark = theme === "dark";
    const axisColors = isDark
      ? chartDesignSystem.chart.axisDark
      : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark
      ? chartDesignSystem.chart.tooltipDark
      : chartDesignSystem.chart.tooltip;

    const timestamps = data.series[0]?.data.map((d) => d.timestamp) || [];

    const series = data.series.map((s) => {
      const isVisible = visibleSeries.has(s.name);
      return {
        name: s.name,
        type: "bar" as const,
        data: s.data.map((d) => d.value),
        itemStyle: {
          color: s.color,
          opacity: isVisible ? 1 : 0.3,
        },
        label: { show: false },
        barMaxWidth: 40,
      };
    });

    const categoryAxis = {
      type: "category" as const,
      data: timestamps,
      axisLabel: {
        color: axisColors.textColor,
        fontSize: dynamicSizes.legendFontSize,
        formatter: getAxisFormatter(selectedTimeRange),
      },
      axisLine: { lineStyle: { color: axisColors.lineColor } },
      splitLine: { show: false },
    };

    const valueAxis = {
      type: "value" as const,
      scale: true,
      axisLabel: {
        color: axisColors.textColor,
        fontSize: dynamicSizes.legendFontSize,
      },
      axisLine: { lineStyle: { color: axisColors.lineColor } },
      splitLine: {
        lineStyle: { color: axisColors.splitLineColor, opacity: 0.3 },
      },
    };

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: isDark
          ? chartDesignSystem.chart.textDark.primary
          : chartDesignSystem.chart.textLight.primary,
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: tooltipConfig.backgroundColor,
        borderColor: tooltipConfig.borderColor,
        textStyle: { color: tooltipConfig.textStyle.color, fontSize: 12 },
        axisPointer: { type: "shadow" },
        formatter: getTooltipFormatter(selectedTimeRange),
      },
      grid: {
        left: isHorizontal ? "15%" : "8%",
        right: "8%",
        top: "12%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: isHorizontal ? valueAxis : categoryAxis,
      yAxis: isHorizontal ? categoryAxis : valueAxis,
      series,
      dataZoom: [
        {
          type: "slider",
          xAxisIndex: 0,
          filterMode: "filter",
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          handleSize: "100%",
          handleStyle: {
            color: isDark
              ? chartDesignSystem.colors.primary[400]
              : chartDesignSystem.colors.primary[600],
          },
          textStyle: { color: axisColors.textColor, fontSize: 10 },
          borderColor: axisColors.lineColor,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.1)",
          selectedDataBackground: {
            lineStyle: { color: chartDesignSystem.colors.primary[600] },
            areaStyle: {
              color: chartDesignSystem.colors.primary[600],
              opacity: 0.3,
            },
          },
        },
        {
          type: "inside",
          xAxisIndex: 0,
          filterMode: "filter",
          start: 0,
          end: 100,
        },
      ],
    };
  };

  const renderLegend = () => {
    if (!data) return null;
    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {data.series.map((series) => {
          const isVisible = visibleSeries.has(series.name);
          return (
            <button
              key={series.name}
              onClick={() => toggleSeries(series.name)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg transition-all duration-200 ${isVisible
                ? theme === "dark"
                  ? "bg-slate-700 border border-slate-600"
                  : "bg-slate-100 border border-slate-300"
                : theme === "dark"
                  ? "bg-slate-800 border border-slate-700 opacity-60"
                  : "bg-slate-50 border border-slate-200 opacity-60"
                }`}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: series.color,
                  opacity: isVisible ? 1 : 0.5,
                }}
              />
              <span
                className={`text-sm font-medium ${isVisible
                  ? theme === "dark"
                    ? "text-slate-100"
                    : "text-slate-900"
                  : theme === "dark"
                    ? "text-slate-400"
                    : "text-slate-500"
                  }`}
                style={{ fontSize: `${dynamicSizes.legendFontSize}px` }}
              >
                {series.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (status === "loading" && !data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Loading chart data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-4">
          <div className={`rounded-full p-3 ${theme === "dark" ? "bg-red-900/50" : "bg-red-100"}`}>
            <Settings className={`w-6 h-6 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
          </div>
          <div>
            <p className={`font-semibold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
              Error
            </p>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
              {errorMessage}
            </p>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className={`rounded-full p-3 ${theme === "dark" ? "bg-amber-900/50" : "bg-amber-100"}`}>
            <BarChart3 className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"}`} />
          </div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            No data available
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b pb-3 mb-3 ${theme === "dark" ? "border-slate-700" : "border-slate-200"
            }`}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-700" : "bg-blue-100"}`}>
              <BarChart3 className={`w-5 h-5 ${theme === "dark" ? "text-slate-300" : "text-blue-600"}`} />
            </div>
            <div>
              <h3
                className={`font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                {config.widgetTitle}
              </h3>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                Bar chart analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Orientation Toggle */}
            <button
              onClick={() =>
                setCurrentOrientation((prev) =>
                  prev === "vertical" ? "horizontal" : "vertical",
                )
              }
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
              title={`Switch to ${currentOrientation === "vertical" ? "horizontal" : "vertical"}`}
            >
              <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </button>

            {/* Time Range Dropdown */}
            <div className="flex items-center gap-1">
              <Clock className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`} />
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger
                  className={`w-16 h-8 text-xs border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="item-aligned"
                  className={`${theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                    }`}
                >
                  {["1h", "12h", "24h", "7d", "30d"].map((tr) => (
                    <SelectItem
                      key={tr}
                      value={tr}
                      className={`${theme === "dark"
                        ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                        : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                        }`}
                    >
                      {tr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex justify-center mb-3">{renderLegend()}</div>

        {/* Chart */}
        <div className="flex-1">
          <ReactECharts
            option={getEChartsOption()}
            style={{ height: "100%", width: "100%" }}
            opts={{ renderer: "canvas" }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden rounded-xl shadow-sm bg-card border border-border/60"
      style={{
        minWidth: chartDesignSystem.layout.minWidgetWidth,
        minHeight: chartDesignSystem.layout.minWidgetHeight,
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
        {isRefreshing && (
          <span className="text-[10px] font-medium animate-pulse text-muted-foreground">
            Updating...
          </span>
        )}
        <div
          className={`rounded-full w-3 h-3 ${status === "ok"
            ? isRefreshing ? "bg-amber-400 animate-pulse" : "bg-green-500"
            : status === "error"
              ? "bg-red-500"
              : "bg-amber-500 animate-pulse"
            }`}
        />
      </div>

      <div
        className="w-full h-full p-4"
        style={{ padding: `${dynamicSizes.padding}px` }}
      >
        {renderContent()}
      </div>
    </div>
  );
};
