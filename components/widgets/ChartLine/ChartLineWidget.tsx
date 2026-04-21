"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  LineChart as LineChartIcon,
  Thermometer,
  Droplets,
  Settings,
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

// Define types for real data
interface RealLineSeries {
  name: string;
  data: Array<{ timestamp: string; value: number }>;
  unit: string;
  color: string;
}

interface RealLineChartData {
  series: RealLineSeries[];
  timeRange: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[]; // Array of config names for multiple series
    timeRange?: "1h" | "12h" | "24h" | "7d" | "30d";
    showLegend?: boolean;
    dualAxis?: boolean;
    smoothLines?: boolean;
  };
}

const DEFAULT_LINE_CHART_CONFIG: Props["config"] = {
  widgetTitle: "Multi-Series Analysis",
  configNames: [],
  timeRange: "24h",
  showLegend: true,
  smoothLines: true,
};

export const ChartLineWidget = ({ config = DEFAULT_LINE_CHART_CONFIG }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealLineChartData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    config.timeRange || "24h",
  );

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    legendFontSize: 12,
    padding: 16,
  });

  // Responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width } = rect;
      setDimensions({ width, height: rect.height });

      const titleFontSize = getResponsiveSize(18, width, 14, 20);
      const legendFontSize = getResponsiveSize(12, width, 10, 14);
      const padding = getResponsiveSize(16, width, 12, 20);

      setDynamicSizes({
        titleFontSize,
        legendFontSize,
        padding,
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  // Memoize config dependencies to prevent unnecessary re-runs
  const configNamesKey = JSON.stringify(config.configNames);

  // Load real data from API
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

        // Get configIds from configNames
        let configIds: string[] = [];

        if (config.configNames && config.configNames.length > 0) {
          // Look up configIds from configNames
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
            console.warn(
              "[LineChart] Failed to lookup configIds:",
              lookupError,
            );
          }
        }

        if (configIds.length === 0) {
          throw new Error("No logging configurations matched the selected series.");
        }

        const timeRange = selectedTimeRange;

        // Fetch data for all configIds
        const seriesPromises = configIds.map(async (configId, index) => {
          const response = await fetch(
            `/api/chart-data/${configId}?timeRange=${timeRange}&type=trend`,
          );
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to fetch data");
          }

          // Map to series format
          const colors = [
            "#2563eb",
            "#16a34a",
            "#d97706",
            "#dc2626",
            "#7c3aed",
          ];
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

        const chartData: RealLineChartData = {
          series,
          timeRange,
        };

        setData(chartData);

        // Initialize all series as visible
        const allSeries = new Set(series.map((s: RealLineSeries) => s.name));
        setVisibleSeries(allSeries);

        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[LineChart] Error loading data:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load data");
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    loadData();

    return () => { isMounted = false; };
  }, [config.timeRange, configNamesKey, selectedTimeRange]);

  // Toggle series visibility
  const toggleSeries = (seriesName: string) => {
    const newVisible = new Set(visibleSeries);
    if (newVisible.has(seriesName)) {
      newVisible.delete(seriesName);
    } else {
      newVisible.add(seriesName);
    }
    setVisibleSeries(newVisible);
  };

  // Dynamic axis formatter based on time range
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

  // Dynamic tooltip formatter based on time range
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

  // Generate ECharts configuration
  const getEChartsOption = () => {
    if (!data) return {};

    const isDark = theme === "dark";
    const axisColors = isDark
      ? chartDesignSystem.chart.axisDark
      : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark
      ? chartDesignSystem.chart.tooltipDark
      : chartDesignSystem.chart.tooltip;

    const series = data.series.map((s, index) => {
      const isVisible = visibleSeries.has(s.name);
      return {
        name: s.name,
        type: "line" as const,
        data: s.data.map((d) => d.value),
        smooth: config.smoothLines !== false,
        lineStyle: {
          color: s.color,
          width: 2,
          opacity: isVisible ? 1 : 0.3,
        },
        itemStyle: {
          color: s.color,
          opacity: isVisible ? 1 : 0.3,
        },
        symbol: "circle",
        symbolSize: 6,
        showSymbol: isVisible,
        animation: {
          duration: chartDesignSystem.chart.animation.duration,
          easing: chartDesignSystem.chart.animation.easing,
        },
      };
    });

    const timestamps = data.series[0]?.data.map((d) => d.timestamp) || [];

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
        textStyle: {
          color: tooltipConfig.textStyle.color,
          fontSize: 12,
        },
        axisPointer: {
          type: "cross",
          lineStyle: {
            color: tooltipConfig.axisPointer.lineStyle.color,
            width: 1,
          },
        },
        formatter: getTooltipFormatter(selectedTimeRange),
      },

      grid: {
        left: "8%",
        right: "8%",
        top: "12%",
        bottom: "12%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
          formatter: getAxisFormatter(selectedTimeRange),
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor },
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: config.dualAxis
        ? [
          {
            type: "value",
            scale: true,
            name: data.series[0]?.unit || "",
            nameTextStyle: {
              color: axisColors.textColor,
              fontSize: dynamicSizes.legendFontSize,
            },
            axisLabel: {
              color: axisColors.textColor,
              fontSize: dynamicSizes.legendFontSize,
            },
            axisLine: {
              lineStyle: { color: axisColors.lineColor },
            },
            splitLine: {
              lineStyle: {
                color: axisColors.splitLineColor,
                opacity: 0.3,
              },
            },
          },
          {
            type: "value",
            scale: true,
            name: data.series[1]?.unit || "",
            nameTextStyle: {
              color: axisColors.textColor,
              fontSize: dynamicSizes.legendFontSize,
            },
            axisLabel: {
              color: axisColors.textColor,
              fontSize: dynamicSizes.legendFontSize,
            },
            axisLine: {
              lineStyle: { color: axisColors.lineColor },
            },
            splitLine: {
              show: false,
            },
          },
        ]
        : {
          type: "value",
          scale: true,
          axisLabel: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.legendFontSize,
          },
          axisLine: {
            lineStyle: { color: axisColors.lineColor },
          },
          splitLine: {
            lineStyle: {
              color: axisColors.splitLineColor,
              opacity: 0.3,
            },
          },
        },
      series: config.dualAxis
        ? series.map((s, index) => ({
          ...s,
          yAxisIndex: index > 0 ? 1 : 0,
        }))
        : series,

      // Zoom functionality
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
          textStyle: {
            color: axisColors.textColor,
            fontSize: 10,
          },
          borderColor: axisColors.lineColor,
          backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
          selectedDataBackground: {
            lineStyle: {
              color: chartDesignSystem.colors.primary[600],
            },
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

  // Render legend with toggle controls
  const renderLegend = () => {
    if (!data || config.showLegend === false) return null;

    return (
      <div className="flex flex-wrap gap-3 justify-center">
        {data.series.map((series, index) => {
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
                className="w-3 h-3 rounded-full"
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

  // Render content
  const renderContent = () => {
    if (status === "loading" && !data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            Loading chart data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-4">
          <div
            className={`rounded-full p-3 ${theme === "dark" ? "bg-red-900/50" : "bg-red-100"
              }`}
          >
            <Settings
              className={`w-6 h-6 ${theme === "dark" ? "text-red-400" : "text-red-600"
                }`}
            />
          </div>
          <div>
            <p
              className={`font-semibold ${theme === "dark" ? "text-red-400" : "text-red-600"
                }`}
            >
              Error
            </p>
            <p
              className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
            >
              {errorMessage}
            </p>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div
            className={`rounded-full p-3 ${theme === "dark" ? "bg-amber-900/50" : "bg-amber-100"
              }`}
          >
            <LineChartIcon
              className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"
                }`}
            />
          </div>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
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
            <div
              className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-700" : "bg-blue-100"
                }`}
            >
              <LineChartIcon
                className={`w-5 h-5 ${theme === "dark" ? "text-slate-300" : "text-blue-600"
                  }`}
              />
            </div>
            <div>
              <h3
                className={`font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                {config.widgetTitle}
              </h3>
              <p
                className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
              >
                Multi-series line analysis
              </p>
            </div>
          </div>

          {/* Time Range Dropdown */}
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
            />
            <Select
              value={selectedTimeRange}
              onValueChange={setSelectedTimeRange}
            >
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
                <SelectItem
                  value="1h"
                  className={`${theme === "dark"
                    ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                    : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    }`}
                >
                  1h
                </SelectItem>
                <SelectItem
                  value="12h"
                  className={`${theme === "dark"
                    ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                    : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    }`}
                >
                  12h
                </SelectItem>
                <SelectItem
                  value="24h"
                  className={`${theme === "dark"
                    ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                    : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    }`}
                >
                  24h
                </SelectItem>
                <SelectItem
                  value="7d"
                  className={`${theme === "dark"
                    ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                    : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    }`}
                >
                  7d
                </SelectItem>
                <SelectItem
                  value="30d"
                  className={`${theme === "dark"
                    ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                    : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                    }`}
                >
                  30d
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Legend Controls - Above Chart, Center */}
        <div className="flex justify-center mb-3">{renderLegend()}</div>

        {/* Chart Area */}
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

      {/* Content */}
      <div
        className="w-full h-full p-4"
        style={{ padding: `${dynamicSizes.padding}px` }}
      >
        {renderContent()}
      </div>
    </div>
  );
};
