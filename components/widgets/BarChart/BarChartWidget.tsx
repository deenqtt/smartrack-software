"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  BarChart3,
  TrendingUp,
  RotateCcw,
  Settings,
  Grid3X3,
  BarChart,
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
import { chartDesignSystem, getChartColor, getResponsiveSize } from "../design-system";

// Define types for real data
interface RealBarData {
  categories: string[];
  data: number[];
  unit: string;
  colors: string[];
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[]; // Array of config names for bar chart data
    timeRange?: "1h" | "12h" | "24h" | "7d" | "30d";
    mode?: "single" | "stacked" | "grouped";
    orientation?: "vertical" | "horizontal";
    showValues?: boolean;
    showGrid?: boolean;
    colorScheme?: "default" | "gradient" | "monochrome";
  };
}

export const BarChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealBarData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentMode, setCurrentMode] = useState<"single" | "stacked" | "grouped">(config.mode || "single");
  const [currentOrientation, setCurrentOrientation] = useState<"vertical" | "horizontal">(config.orientation || "vertical");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    config.timeRange || "24h"
  );

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    valueFontSize: 12,
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
      const valueFontSize = getResponsiveSize(12, width, 10, 14);
      const legendFontSize = getResponsiveSize(12, width, 10, 14);
      const padding = getResponsiveSize(16, width, 12, 20);

      setDynamicSizes({
        titleFontSize,
        valueFontSize,
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
    const loadData = async (isInitialLog = true) => {
      try {
        if (!config.configNames || config.configNames.length === 0) {
          if (!isMounted) return;
          setData(null);
          setStatus("error");
          setErrorMessage("Please configure at least one data source.");
          return;
        }

        if (isInitialLog && !data) setStatus("loading");
        setErrorMessage("");

        // Get configIds from configNames
        let configIds: string[] = [];

        if (config.configNames && config.configNames.length > 0) {
          // Look up configIds from configNames
          try {
            const lookupResponse = await fetch(`/api/logging-configs`);
            if (lookupResponse.ok) {
              const lookupData = await lookupResponse.json();
              const configs = Array.isArray(lookupData.data) ? lookupData.data : [];

              configIds = config.configNames.map(configName => {
                const foundConfig = configs.find((c: any) => c.customName === configName);
                return foundConfig ? foundConfig.id : null;
              }).filter(id => id !== null) as string[];
            }
          } catch (lookupError) {
            console.warn("[BarChart] Failed to lookup configIds:", lookupError);
          }
        }

        if (configIds.length === 0) {
          throw new Error("No logging configurations matched the selected series.");
        }

        const timeRange = selectedTimeRange;

        // Fetch data for all configIds
        const configPromises = configIds.map(async (configId) => {
          const response = await fetch(`/api/chart-data/${configId}?timeRange=${timeRange}&type=trend`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to fetch data");
          }
          return result;
        });

        const results = await Promise.all(configPromises);

        if (!isMounted) return;

        if (results.length === 0) {
          throw new Error("No chart data returned for the selected series.");
        }

        // Transform to bar chart format
        const categories = results.map(r => r.data.configName || `Config ${results.indexOf(r) + 1}`);
        const dataValues = results.map(r => r.data.current || 0);
        const unit = results[0]?.data.unit || 'value';
        const colors = results.map((_, index) => {
          const colorPalette = ['#2563eb', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];
          return colorPalette[index % colorPalette.length];
        });

        const chartData: RealBarData = {
          categories,
          data: dataValues,
          unit,
          colors
        };

        setData(chartData);
        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[BarChart] Error loading data:", err);
        setData(null);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load data");
      }
    };

    loadData();

    // The user requested to remove automatic refresh to prevent flickering.
    // Refresh will now only occur when parameters change or specifically triggered.

    return () => { isMounted = false; };
  }, [configNamesKey, selectedTimeRange]);

  // Dynamic axis formatter based on time range
  const getAxisFormatter = (timeRange: string) => {
    switch (timeRange) {
      case '1h':
        return (value: string) => format(new Date(value), "HH:mm");
      case '12h':
      case '24h':
        return (value: string) => format(new Date(value), "dd/MM HH:mm");
      case '7d':
      case '30d':
        return (value: string) => format(new Date(value), "dd/MM");
      default:
        return (value: string) => format(new Date(value), "HH:mm");
    }
  };

  // Dynamic tooltip formatter for bar chart (category-based, not time-based)
  const getTooltipFormatter = (timeRange: string) => {
    return (params: any) => {
      if (!params || params.length === 0) return "";

      // For bar chart, axisValue is category name, not timestamp
      const categoryName = params[0].axisValue;
      let content = `<strong>${categoryName}</strong><br/>`;
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

    const isHorizontal = currentOrientation === "horizontal";
    const isStacked = currentMode === "stacked";
    const isDark = theme === "dark";
    const axisColors = isDark ? chartDesignSystem.chart.axisDark : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark ? chartDesignSystem.chart.tooltipDark : chartDesignSystem.chart.tooltip;

    // Prepare data based on mode
    let seriesData;
    if (isStacked) {
      // For stacked mode, we'll show multiple series
      seriesData = [
        {
          name: "Actual",
          type: "bar",
          data: data.data,
          itemStyle: {
            color: chartDesignSystem.colors.primary[600],
          },
          label: config.showValues ? {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            fontSize: dynamicSizes.valueFontSize,
            color: isDark ? chartDesignSystem.chart.textDark.primary : chartDesignSystem.chart.textLight.primary,
          } : undefined,
        },
        {
          name: "Target",
          type: "bar",
          data: data.data.map(v => v * 0.8), // Mock target data
          itemStyle: {
            color: chartDesignSystem.colors.success[500],
          },
          label: config.showValues ? {
            show: true,
            position: isHorizontal ? 'right' : 'top',
            fontSize: dynamicSizes.valueFontSize,
            color: isDark ? chartDesignSystem.chart.textDark.primary : chartDesignSystem.chart.textLight.primary,
          } : undefined,
        }
      ];
    } else {
      // Single or grouped mode
      seriesData = [{
        name: "Value",
        type: "bar",
        data: data.data,
        itemStyle: (params: any) => ({
          color: data.colors[params.dataIndex] || chartDesignSystem.colors.primary[600],
        }),
        label: config.showValues ? {
          show: true,
          position: isHorizontal ? 'right' : 'top',
          fontSize: dynamicSizes.valueFontSize,
          color: isDark ? chartDesignSystem.chart.textDark.primary : chartDesignSystem.chart.textLight.primary,
          formatter: (params: any) => `${params.value}${data.unit}`,
        } : undefined,
      }];
    }

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: isDark ? chartDesignSystem.chart.textDark.primary : chartDesignSystem.chart.textLight.primary,
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
          type: "shadow",
        },
        formatter: getTooltipFormatter(selectedTimeRange),
      },
      legend: isStacked ? {
        data: ["Actual", "Target"],
        orient: "horizontal",
        bottom: "8%",
        textStyle: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 16,
      } : undefined,
      grid: {
        left: isHorizontal ? "15%" : "8%",
        right: "8%",
        top: "12%",
        bottom: isStacked ? "20%" : "12%",
        containLabel: true,
      },
      xAxis: isHorizontal ? {
        type: "value",
        scale: true,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor }
        },
        splitLine: config.showGrid !== false ? {
          lineStyle: {
            color: axisColors.splitLineColor,
            opacity: 0.3,
          },
        } : undefined,
      } : {
        type: "category",
        data: data.categories,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
          rotate: data.categories.length > 6 ? 45 : 0,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor }
        },
        splitLine: config.showGrid !== false ? {
          lineStyle: {
            color: axisColors.splitLineColor,
            opacity: 0.3,
          },
        } : undefined,
      },
      yAxis: isHorizontal ? {
        type: "category",
        data: data.categories,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor }
        },
        splitLine: config.showGrid !== false ? {
          lineStyle: {
            color: axisColors.splitLineColor,
            opacity: 0.3,
          },
        } : undefined,
      } : {
        type: "value",
        scale: true,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor }
        },
        splitLine: config.showGrid !== false ? {
          lineStyle: {
            color: axisColors.splitLineColor,
            opacity: 0.3,
          },
        } : undefined,
      },
      series: isStacked ? seriesData.map(s => ({
        ...s,
        stack: 'total',
      })) : seriesData,
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },

      // Zoom functionality
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          filterMode: 'filter',
          start: 0,
          end: 100,
          height: 20,
          bottom: 10,
          handleSize: '100%',
          handleStyle: {
            color: isDark ? chartDesignSystem.colors.primary[400] : chartDesignSystem.colors.primary[600],
          },
          textStyle: {
            color: axisColors.textColor,
            fontSize: 10,
          },
          borderColor: axisColors.lineColor,
          backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
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
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'filter',
          start: 0,
          end: 100,
        },
      ],


    };
  };

  // Render mode controls
  const renderControls = () => {
    return (
      <div className="flex items-center gap-2">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {(["single", "stacked"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCurrentMode(mode)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${currentMode === mode
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
            >
              {mode === "single" ? "Single" : "Stacked"}
            </button>
          ))}
        </div>

        {/* Orientation Toggle */}
        <button
          onClick={() => setCurrentOrientation(prev => prev === "vertical" ? "horizontal" : "vertical")}
          className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors duration-200"
          title={`Switch to ${currentOrientation === "vertical" ? "horizontal" : "vertical"} orientation`}
        >
          <RotateCcw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>
    );
  };

  // Render summary stats
  const renderStats = () => {
    if (!data) return null;

    const total = data.data.reduce((sum, val) => sum + val, 0);
    const average = total / data.data.length;
    const max = Math.max(...data.data);
    const min = Math.min(...data.data);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Total</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {total.toLocaleString()}{data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Average</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {average.toFixed(1)}{data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Max</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {max.toLocaleString()}{data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Min</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {min.toLocaleString()}{data.unit}
          </div>
        </div>
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Loading chart data...</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-4">
          <div className={`rounded-full p-3 ${theme === "dark" ? "bg-red-900/50" : "bg-red-100"
            }`}>
            <Settings className={`w-6 h-6 ${theme === "dark" ? "text-red-400" : "text-red-600"
              }`} />
          </div>
          <div>
            <p className={`font-semibold ${theme === "dark" ? "text-red-400" : "text-red-600"
              }`}>Error</p>
            <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}>{errorMessage}</p>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className={`rounded-full p-3 ${theme === "dark" ? "bg-amber-900/50" : "bg-amber-100"
            }`}>
            <BarChart3 className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"
              }`} />
          </div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>No data available</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Header with controls */}
        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${theme === "dark" ? "border-slate-700" : "border-slate-200"
          }`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-700" : "bg-blue-100"
              }`}>
              <BarChart3 className={`w-5 h-5 ${theme === "dark" ? "text-slate-300" : "text-blue-600"
                }`} />
            </div>
            <div>
              <h3
                className={`font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                {config.widgetTitle}
              </h3>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                {currentMode === "stacked" ? "Stacked comparison" : "Single values"} • {currentOrientation}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {renderControls()}

            {/* Time Range Dropdown */}
            <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-300 dark:border-slate-600">
              <Clock className={`w-4 h-4 ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`} />
              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className={`w-16 h-8 text-xs border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 ${theme === "dark" ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  position="item-aligned"
                  className={`${theme === "dark"
                      ? 'bg-slate-800 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-200 text-slate-900'
                    }`}
                >
                  <SelectItem value="1h" className={`${theme === "dark"
                      ? 'text-slate-100 focus:bg-slate-700 focus:text-slate-100'
                      : 'text-slate-900 focus:bg-slate-100 focus:text-slate-900'
                    }`}>1h</SelectItem>
                  <SelectItem value="12h" className={`${theme === "dark"
                      ? 'text-slate-100 focus:bg-slate-700 focus:text-slate-100'
                      : 'text-slate-900 focus:bg-slate-100 focus:text-slate-900'
                    }`}>12h</SelectItem>
                  <SelectItem value="24h" className={`${theme === "dark"
                      ? 'text-slate-100 focus:bg-slate-700 focus:text-slate-100'
                      : 'text-slate-900 focus:bg-slate-100 focus:text-slate-900'
                    }`}>24h</SelectItem>
                  <SelectItem value="7d" className={`${theme === "dark"
                      ? 'text-slate-100 focus:bg-slate-700 focus:text-slate-100'
                      : 'text-slate-900 focus:bg-slate-100 focus:text-slate-900'
                    }`}>7d</SelectItem>
                  <SelectItem value="30d" className={`${theme === "dark"
                      ? 'text-slate-100 focus:bg-slate-700 focus:text-slate-100'
                      : 'text-slate-900 focus:bg-slate-100 focus:text-slate-900'
                    }`}>30d</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="mb-4">
          {renderStats()}
        </div>

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
      className={`w-full h-full relative overflow-hidden rounded-xl shadow-sm ${theme === "dark"
          ? 'bg-slate-800 border border-slate-700'
          : 'bg-white border border-slate-200'
        }`}
      style={{
        minWidth: chartDesignSystem.layout.minWidgetWidth,
        minHeight: chartDesignSystem.layout.minWidgetHeight,
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 z-10">
        <div
          className={`rounded-full w-3 h-3 ${status === "ok"
              ? "bg-green-500"
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
