"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Clock,
  Zap,
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
interface RealTrendData {
  current: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  data: Array<{ timestamp: string; value: number }>;
  timeRange: string;
  configName?: string;
  totalPoints?: number;
  message?: string;
  isSampled?: boolean;
  samplingInfo?: string | null;
}

interface Props {
  config: {
    widgetTitle: string;
    configName?: string; // Custom name dari LoggingConfiguration
    timeRange?: "1h" | "12h" | "24h" | "7d" | "30d";
    chartColor?: string;
    showKPIs?: boolean;
    showTrend?: boolean;
  };
}

export const SimpleTrendChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealTrendData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    config.timeRange || "24h"
  );

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    headerHeight: chartDesignSystem.layout.headerHeight,
    chartArea: chartDesignSystem.layout.chartArea,
    footerHeight: chartDesignSystem.layout.footerHeight,
    titleFontSize: 16,
    valueFontSize: 24,
    labelFontSize: 12,
    padding: 16,
  });

  // Responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      const headerHeight = Math.max(60, Math.min(height * dynamicSizes.headerHeight, 80));
      const titleFontSize = getResponsiveSize(18, width, 14, 20);
      const valueFontSize = getResponsiveSize(28, width, 20, 32);
      const labelFontSize = getResponsiveSize(12, width, 10, 14);
      const padding = getResponsiveSize(16, width, 12, 20);

      setDynamicSizes({
        headerHeight,
        chartArea: 1 - dynamicSizes.headerHeight - dynamicSizes.footerHeight,
        footerHeight: dynamicSizes.footerHeight,
        titleFontSize,
        valueFontSize,
        labelFontSize,
        padding,
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  // Memoize config dependencies to prevent unnecessary re-runs
  const configNameKey = config.configName;

  // Load real data from API
  useEffect(() => {
    let isMounted = true;
    const loadData = async (isInitialLoad = true) => {
      try {
        if (isInitialLoad && !data) setStatus("loading");

        // Get configId from configName
        let configId = null;

        if (config.configName) {
          // Look up configId from configName
          try {
            const lookupResponse = await fetch(`/api/logging-configs`);
            if (lookupResponse.ok) {
              const lookupData = await lookupResponse.json();
              const configs = Array.isArray(lookupData.data) ? lookupData.data : [];
              const foundConfig = configs.find((c: any) => c.customName === config.configName);
              if (foundConfig) {
                configId = foundConfig.id;
              }
            }
          } catch (lookupError) {
            console.warn("[SimpleTrendChart] Failed to lookup configId:", lookupError);
          }
        }

        // Fallback to sample configId if lookup failed
        if (!configId) {
          console.warn("[SimpleTrendChart] Using fallback configId for:", config.configName);
          configId = "cmir024config975192"; // Active Energy Import [Power Meter 1]
        }

        const timeRange = selectedTimeRange;
        const response = await fetch(`/api/chart-data/${configId}?timeRange=${timeRange}&type=trend`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!isMounted) return;

        if (!result.success) {
          throw new Error(result.message || "Failed to fetch data");
        }

        setData(result.data);
        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[SimpleTrendChart] Error loading data:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load data");
      }
    };

    loadData();

    // The user requested to remove automatic refresh to prevent flickering.
    // Refresh will now only occur when parameters change or specifically triggered.

    return () => { isMounted = false; };
  }, [config.timeRange, configNameKey, selectedTimeRange]);

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

  // Dynamic tooltip formatter based on time range
  const getTooltipFormatter = (timeRange: string) => {
    return (params: any) => {
      if (!params || params.length === 0 || !data) return "";

      let dateFormat;
      switch (timeRange) {
        case '1h':
          dateFormat = "HH:mm";
          break;
        case '12h':
        case '24h':
          dateFormat = "dd/MM HH:mm";
          break;
        case '7d':
        case '30d':
          dateFormat = "dd/MM/yyyy HH:mm";
          break;
        default:
          dateFormat = "dd MMM, HH:mm";
      }

      const date = format(new Date(params[0].axisValue), dateFormat);
      const value = Number(params[0].value).toFixed(2);
      return `<strong>${date}</strong><br/>${value} ${data.unit}`;
    };
  };



  // Generate ECharts configuration
  const getEChartsOption = () => {
    if (!data) return {};

    const isDark = theme === "dark";
    const axisColors = isDark ? chartDesignSystem.chart.axisDark : chartDesignSystem.chart.axisLight;
    const chartColor = config.chartColor || chartDesignSystem.colors.primary[600];
    const timestamps = data.data.map((d) => d.timestamp);
    const values = data.data.map((d) => d.value);

    return {
      backgroundColor: "transparent",
      grid: {
        left: "5%",
        right: "5%",
        top: "10%",
        bottom: "10%",
        containLabel: false,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        show: false,
      },
      yAxis: {
        type: "value",
        show: false,
        min: "dataMin",
        max: "dataMax",
      },
      tooltip: theme === "dark" ? {
        trigger: "axis",
        backgroundColor: chartDesignSystem.chart.tooltipDark.backgroundColor,
        borderColor: chartDesignSystem.chart.tooltipDark.borderColor,
        textStyle: {
          color: chartDesignSystem.chart.tooltipDark.textStyle.color,
          fontSize: 12,
        },
        formatter: getTooltipFormatter(selectedTimeRange),
      } : {
        trigger: "axis",
        backgroundColor: chartDesignSystem.chart.tooltip.backgroundColor,
        borderColor: chartDesignSystem.chart.tooltip.borderColor,
        textStyle: {
          color: chartDesignSystem.chart.tooltip.textStyle.color,
          fontSize: 12,
        },
        formatter: getTooltipFormatter(selectedTimeRange),
      },
      series: [
        {
          type: "line",
          data: values,
          smooth: true,
          symbol: "none",
          lineStyle: {
            color: chartColor,
            width: 3,
          },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${chartColor}40` },
                { offset: 1, color: `${chartColor}10` },
              ],
            },
          },
          animation: {
            duration: chartDesignSystem.chart.animation.duration,
            easing: chartDesignSystem.chart.animation.easing,
          },
        },
      ],

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

  // Render summary stats
  const renderSummaryStats = () => {
    if (!data) return null;

    const values = data.data.map(d => d.value);
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Current</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {data.current.toFixed(1)} {data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Average</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {avg.toFixed(1)} {data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Maximum</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {max.toFixed(1)} {data.unit}
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Minimum</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {min.toFixed(1)} {data.unit}
          </div>
        </div>
      </div>
    );
  };

  // Render KPI indicators
  const renderKPIs = () => {
    if (!data || !config.showKPIs) return null;

    const trendColor = data.trend === 'up' ? chartDesignSystem.colors.success[600] :
      data.trend === 'down' ? chartDesignSystem.colors.danger[600] :
        chartDesignSystem.colors.neutral[600];

    const TrendIcon = data.trend === 'up' ? TrendingUp :
      data.trend === 'down' ? TrendingDown : Minus;

    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${theme === "dark" ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <div className={`text-lg font-bold ${theme === "dark" ? 'text-slate-100' : 'text-slate-900'}`}>
              {data.current.toFixed(1)}
            </div>
            <div className={`text-xs ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`}>{data.unit}</div>
          </div>
        </div>

        <div className="flex items-center gap-2" title={`Trend compared to previous ${config.timeRange || '24h'} period`}>
          <TrendIcon className={`w-4 h-4`} style={{ color: trendColor }} />
          <div>
            <div className={`text-sm font-semibold`} style={{ color: trendColor }}>
              {data.change > 0 ? '+' : ''}{data.change.toFixed(1)}%
            </div>
            <div className={`text-xs ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`}>vs previous</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
    );
  };

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${theme === "dark" ? 'border-blue-400' : 'border-blue-600'
            }`}></div>
          <p className={`text-sm ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`}>Loading trend data...</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-4">
          <div className={`rounded-full p-3 ${theme === "dark" ? 'bg-red-900/50' : 'bg-red-100'
            }`}>
            <Activity className={`w-6 h-6 ${theme === "dark" ? 'text-red-400' : 'text-red-600'
              }`} />
          </div>
          <div>
            <p className={`font-semibold ${theme === "dark" ? 'text-red-400' : 'text-red-600'
              }`}>Error</p>
            <p className={`text-sm ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'
              }`}>{errorMessage}</p>
          </div>
        </div>
      );
    }

    if (!data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className={`rounded-full p-3 ${theme === "dark" ? 'bg-amber-900/50' : 'bg-amber-100'
            }`}>
            <Activity className={`w-6 h-6 ${theme === "dark" ? 'text-amber-400' : 'text-amber-600'
              }`} />
          </div>
          <p className={`text-sm ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'
            }`}>No data available</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Header with KPIs */}
        <div
          className={`flex items-center justify-between border-b pb-3 ${theme === "dark" ? 'border-slate-700' : 'border-slate-200'
            }`}
          style={{ paddingBottom: `${dynamicSizes.padding * 0.5}px` }}
        >
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${theme === "dark" ? 'bg-slate-700' : 'bg-blue-100'
              }`}>
              <Activity className={`w-5 h-5 ${theme === "dark" ? 'text-slate-300' : 'text-blue-600'
                }`} />
            </div>
            <div>
              <h3
                className={`font-semibold ${theme === "dark" ? 'text-slate-100' : 'text-slate-900'
                  }`}
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                {config.widgetTitle}
              </h3>
              <p className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}>
                Live trend monitoring
                {data?.isSampled && (
                  <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${theme === "dark" ? "bg-amber-900/50 text-amber-300" : "bg-amber-100 text-amber-700"
                    }`}>
                    Sampled
                  </span>
                )}
              </p>
            </div>
          </div>

          {config.showKPIs !== false && renderKPIs()}
        </div>

        {/* Summary Stats */}
        <div className="mb-4">
          {renderSummaryStats()}
        </div>

        {/* Chart Area */}
        <div className="flex-1 pt-3">
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
