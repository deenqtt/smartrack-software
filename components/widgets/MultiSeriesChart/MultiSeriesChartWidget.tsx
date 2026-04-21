"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  Activity,
  TrendingUp,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Clock,
  Info,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

// Helper function to calculate Pearson correlation coefficient
const calculateCorrelation = (x: number[], y: number[]): number => {
  if (x.length !== y.length || x.length < 2) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY),
  );

  return denominator === 0 ? 0 : numerator / denominator;
};

// Define types for real data
interface RealMultiLineSeries {
  name: string;
  data: Array<{ timestamp: string; value: number }>;
  unit: string;
  color: string;
}

interface RealCorrelation {
  series1: string;
  series2: string;
  correlation: number;
}

interface RealMultiLineChartData {
  series: RealMultiLineSeries[];
  correlations: RealCorrelation[];
  timeRange: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[]; // Array of config names for multiple series
    timeRange?: "1h" | "12h" | "24h" | "7d" | "30d";
    showCorrelations?: boolean;
    showLegend?: boolean;
    smoothLines?: boolean;
    showGrid?: boolean;
  };
}

export const MultiSeriesChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealMultiLineChartData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(new Set());
  const [selectedCorrelation, setSelectedCorrelation] = useState<string | null>(
    null,
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>(
    config.timeRange || "12h",
  );
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    legendFontSize: 12,
    correlationFontSize: 11,
    padding: 16,
  });

  // Track previous fetch params to prevent redundant calls
  const lastFetchParamsRef = useRef<string>("");

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
      const correlationFontSize = getResponsiveSize(11, width, 9, 12);
      const padding = getResponsiveSize(16, width, 12, 20);

      setDynamicSizes({
        titleFontSize,
        legendFontSize,
        correlationFontSize,
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
        setErrorMessage("");

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
              "[MultiLineChart] Failed to lookup configIds:",
              lookupError,
            );
          }
        }

        if (configIds.length === 0) {
          throw new Error(
            "No logging configurations matched the selected series.",
          );
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

        if (!isMounted) return;

        if (series.length === 0) {
          throw new Error("No chart data returned for the selected series.");
        }

        // Calculate correlations between series
        const correlations: RealCorrelation[] = [];
        for (let i = 0; i < series.length; i++) {
          for (let j = i + 1; j < series.length; j++) {
            const series1 = series[i];
            const series2 = series[j];

            // Simple correlation calculation (Pearson's r)
            const values1 = series1.data.map(
              (d: { timestamp: string; value: number }) => d.value,
            );
            const values2 = series2.data.map(
              (d: { timestamp: string; value: number }) => d.value,
            );

            if (values1.length === values2.length && values1.length > 1) {
              const correlation = calculateCorrelation(values1, values2);
              correlations.push({
                series1: series1.name,
                series2: series2.name,
                correlation: Math.max(-1, Math.min(1, correlation)), // Clamp to [-1, 1]
              });
            }
          }
        }

        const chartData: RealMultiLineChartData = {
          series,
          correlations,
          timeRange,
        };

        setData(chartData);

        // Initialize all series as visible
        const allSeries = new Set(
          series.map((s: RealMultiLineSeries) => s.name),
        );
        setVisibleSeries(allSeries);

        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[MultiLineChart] Error loading data:", err);
        setData(null);
        setVisibleSeries(new Set());
        setStatus("error");
        setErrorMessage(err.message || "Failed to load data");
      } finally {
        if (isMounted) setIsRefreshing(false);
      }
    };

    // Prevent redundant fetches if params haven't changed
    const currentFetchParams = `${config.timeRange}-${configNamesKey}-${selectedTimeRange}`;
    if (lastFetchParamsRef.current === currentFetchParams && data) {
      return;
    }
    lastFetchParamsRef.current = currentFetchParams;

    loadData();

    return () => {
      isMounted = false;
    };
  }, [config.timeRange, configNamesKey, selectedTimeRange, data]);

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

  // Get correlation strength description
  const getCorrelationStrength = (
    correlation: number,
  ): { label: string; color: string } => {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.8) return { label: "Strong", color: "#dc2626" };
    if (absCorr >= 0.6) return { label: "Moderate", color: "#d97706" };
    if (absCorr >= 0.3) return { label: "Weak", color: "#65a30d" };
    return { label: "Very Weak", color: "#6b7280" };
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
          content += `<span style="color:${p.color}">●</span> ${p.seriesName}: <strong>${p.value.toFixed(2)}</strong><br/>`;
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

    const timestamps = data.series[0]?.data.map((d) => d.timestamp) || [];

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
        areaStyle: selectedCorrelation?.includes(s.name)
          ? {
              color: {
                type: "linear",
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  { offset: 0, color: `${s.color}20` },
                  { offset: 1, color: `${s.color}05` },
                ],
              },
            }
          : undefined,
        animation: {
          duration: chartDesignSystem.chart.animation.duration,
          easing: chartDesignSystem.chart.animation.easing,
        },
      };
    });

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
      legend:
        config.showLegend !== false
          ? {
              data: data.series.map((s) => s.name),
              orient: "horizontal",
              bottom: "8%",
              textStyle: {
                color: axisColors.textColor,
                fontSize: dynamicSizes.legendFontSize,
              },
              itemWidth: 12,
              itemHeight: 8,
              itemGap: 16,
            }
          : undefined,
      grid: {
        left: "8%",
        right: "8%",
        top: "12%",
        bottom: config.showLegend !== false ? "20%" : "12%",
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
        splitLine:
          config.showGrid !== false
            ? {
                lineStyle: {
                  color: axisColors.splitLineColor,
                  opacity: 0.3,
                },
              }
            : undefined,
      },
      yAxis: {
        type: "value",
        scale: true,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor },
        },
        splitLine:
          config.showGrid !== false
            ? {
                lineStyle: {
                  color: axisColors.splitLineColor,
                  opacity: 0.3,
                },
              }
            : undefined,
      },
      series,

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

  // Render correlation analysis
  const renderCorrelations = () => {
    if (!data || !config.showCorrelations) return null;

    return (
      <div className="mb-4">
        <h4
          className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
            theme === "dark" ? "text-slate-100" : "text-slate-900"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Correlation Analysis
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {data.correlations.map((corr, index) => {
            const strength = getCorrelationStrength(corr.correlation);
            const isSelected =
              selectedCorrelation === `${corr.series1}-${corr.series2}`;

            return (
              <button
                key={index}
                onClick={() =>
                  setSelectedCorrelation(
                    isSelected ? null : `${corr.series1}-${corr.series2}`,
                  )
                }
                className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? theme === "dark"
                      ? "border-blue-600 bg-blue-900/30"
                      : "border-blue-300 bg-blue-50"
                    : theme === "dark"
                      ? "border-slate-600 hover:border-slate-500 bg-slate-800"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: data.series.find(
                          (s) => s.name === corr.series1,
                        )?.color,
                      }}
                    />
                    <span
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {corr.series1}
                    </span>
                  </div>
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    vs
                  </span>
                  <div className="flex items-center gap-1">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: data.series.find(
                          (s) => s.name === corr.series2,
                        )?.color,
                      }}
                    />
                    <span
                      className={`text-xs font-medium ${
                        theme === "dark" ? "text-slate-300" : "text-slate-700"
                      }`}
                    >
                      {corr.series2}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-bold"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    ({(corr.correlation * 100).toFixed(0)}%)
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Render series controls
  const renderSeriesControls = () => {
    if (!data) return null;

    return (
      <div className="flex flex-wrap gap-2 justify-center">
        {data.series.map((series, index) => {
          const isVisible = visibleSeries.has(series.name);
          return (
            <button
              key={series.name}
              onClick={() => toggleSeries(series.name)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                isVisible
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
                className={`text-sm font-medium ${
                  isVisible
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
              {isVisible ? (
                <Eye
                  className={`w-3 h-3 ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}
                />
              ) : (
                <EyeOff
                  className={`w-3 h-3 ${theme === "dark" ? "text-slate-500" : "text-slate-400"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    );
  };

  // Render summary stats
  const renderStats = () => {
    if (!data) return null;

    const stats = data.series.map((series) => {
      const values = series.data.map((d) => d.value);
      if (values.length === 0) {
        return {
          name: series.name,
          unit: series.unit,
          avg: "0.00",
          max: "0.00",
          min: "0.00",
          latest: "0.00",
          color: series.color,
        };
      }

      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const latest = values[values.length - 1];

      return {
        name: series.name,
        unit: series.unit,
        avg: avg.toFixed(2),
        max: max.toFixed(2),
        min: min.toFixed(2),
        latest: latest.toFixed(2),
        color: series.color,
      };
    });

    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 mb-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className={`text-center p-2 rounded-lg ${
              theme === "dark"
                ? "bg-slate-700/50 border border-slate-600"
                : "bg-slate-50 border border-slate-200"
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span
                className={`text-xs font-semibold ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                {stat.name}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>
                <span
                  className={`${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Latest:
                </span>
                <span
                  className={`font-bold ml-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {stat.latest}
                  {stat.unit}
                </span>
              </div>
              <div>
                <span
                  className={`${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Avg:
                </span>
                <span
                  className={`font-bold ml-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {stat.avg}
                  {stat.unit}
                </span>
              </div>
              <div>
                <span
                  className={`${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Max:
                </span>
                <span
                  className={`font-bold ml-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {stat.max}
                  {stat.unit}
                </span>
              </div>
              <div>
                <span
                  className={`${
                    theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  Min:
                </span>
                <span
                  className={`font-bold ml-1 ${
                    theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}
                >
                  {stat.min}
                  {stat.unit}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    // Only show full loading state if we have no data at all
    if (status === "loading" && !data) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            Loading multi-series data...
          </p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full text-center p-4">
          <div
            className={`rounded-full p-3 ${
              theme === "dark" ? "bg-red-900/50" : "bg-red-100"
            }`}
          >
            <Settings
              className={`w-6 h-6 ${
                theme === "dark" ? "text-red-400" : "text-red-600"
              }`}
            />
          </div>
          <div>
            <p
              className={`font-semibold ${
                theme === "dark" ? "text-red-400" : "text-red-600"
              }`}
            >
              Error
            </p>
            <p
              className={`text-sm ${
                theme === "dark" ? "text-slate-400" : "text-slate-600"
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
            className={`rounded-full p-3 ${
              theme === "dark" ? "bg-amber-900/50" : "bg-amber-100"
            }`}
          >
            <Activity
              className={`w-6 h-6 ${
                theme === "dark" ? "text-amber-400" : "text-amber-600"
              }`}
            />
          </div>
          <p
            className={`text-sm ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
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
          className={`flex items-center justify-between border-b pb-3 mb-3 ${
            theme === "dark" ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`rounded-lg p-2 ${
                theme === "dark" ? "bg-slate-700" : "bg-blue-100"
              }`}
            >
              <Activity
                className={`w-5 h-5 ${
                  theme === "dark" ? "text-slate-300" : "text-blue-600"
                }`}
              />
            </div>
            <div>
              <h3
                className={`font-semibold ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
                style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
              >
                {config.widgetTitle}
              </h3>
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
              >
                {visibleSeries.size} of {data.series.length} series active
              </p>
            </div>
          </div>

          {/* Time Range + Info Button */}
          <div className="flex items-center gap-3">
            <Clock
              className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
            />
            <Select
              value={selectedTimeRange}
              onValueChange={setSelectedTimeRange}
            >
              <SelectTrigger
                className={`w-16 h-8 text-xs border-0 bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 ${
                  theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="item-aligned"
                className={`${
                  theme === "dark"
                    ? "bg-slate-800 border-slate-700 text-slate-100"
                    : "bg-white border-slate-200 text-slate-900"
                }`}
              >
                <SelectItem
                  value="1h"
                  className={`${
                    theme === "dark"
                      ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                      : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  }`}
                >
                  1h
                </SelectItem>
                <SelectItem
                  value="12h"
                  className={`${
                    theme === "dark"
                      ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                      : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  }`}
                >
                  12h
                </SelectItem>
                <SelectItem
                  value="24h"
                  className={`${
                    theme === "dark"
                      ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                      : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  }`}
                >
                  24h
                </SelectItem>
                <SelectItem
                  value="7d"
                  className={`${
                    theme === "dark"
                      ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                      : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  }`}
                >
                  7d
                </SelectItem>
                <SelectItem
                  value="30d"
                  className={`${
                    theme === "dark"
                      ? "text-slate-100 focus:bg-slate-700 focus:text-slate-100"
                      : "text-slate-900 focus:bg-slate-100 focus:text-slate-900"
                  }`}
                >
                  30d
                </SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setShowInfoModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
            >
              <Info className="w-3.5 h-3.5" />
              Info
            </button>
          </div>
        </div>

        {/* Chart Area - FULL SIZE NOW */}
        <div className="flex-1 relative">
          {isRefreshing && data && (
            <div className="absolute inset-0 z-20 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-xs font-medium text-muted-foreground">
                  Updating chart...
                </span>
              </div>
            </div>
          )}
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

  {
    /* Info Modal Popup */
  }
  const renderInfoModal = () => {
    if (!data) return null;

    return (
      <Dialog open={showInfoModal} onOpenChange={setShowInfoModal}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Multi Series Details</DialogTitle>
          </DialogHeader>

          {/* Series Controls */}
          {renderSeriesControls()}

          {/* Stats Summary */}
          {renderStats()}

          {/* Correlation Analysis */}
          {renderCorrelations()}

          <Button
            variant="default"
            className="w-full mt-3 rounded-xl font-medium"
            onClick={() => setShowInfoModal(false)}
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      {renderInfoModal()}
      <div
        ref={containerRef}
        className={`w-full h-full relative overflow-hidden rounded-xl shadow-sm ${
          theme === "dark"
            ? "bg-slate-800 border border-slate-700"
            : "bg-white border border-slate-200"
        }`}
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
            className={`rounded-full w-3 h-3 ${
              status === "ok"
                ? isRefreshing
                  ? "bg-amber-400 animate-pulse"
                  : "bg-green-500"
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
    </>
  );
};
