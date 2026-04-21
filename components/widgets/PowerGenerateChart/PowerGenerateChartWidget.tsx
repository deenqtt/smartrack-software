"use client";

import React, {
  useState,
  useRef,
  useLayoutEffect,
  useEffect,
  useMemo,
} from "react";
import { useTheme } from "next-themes";
import {
  Sun,
  Wind,
  Fuel,
  Battery,
  Zap,
  TrendingUp,
  BarChart3,
  PieChart,
  Settings,
} from "lucide-react";
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
import { chartDesignSystem, getResponsiveSize } from "../design-system";

// Define types for power generation data
interface PowerSource {
  name: string;
  capacity: number;
  current: number;
  color: string;
}

interface PowerSummary {
  totalGeneration: number;
  totalConsumption: number;
  netPower: number;
  efficiency: number;
  co2Savings: number;
}

interface PowerGenerationData {
  sources: PowerSource[];
  summary: PowerSummary;
  timestamp: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[];
    showWeather?: boolean;
    showForecast?: boolean;
    chartType?: "bar" | "pie" | "mixed";
    refreshInterval?: number;
  };
}

export const PowerGenerateChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<PowerGenerationData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedView, setSelectedView] = useState<"generation" | "efficiency">(
    "generation",
  );

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    valueFontSize: 14,
    labelFontSize: 12,
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
      const valueFontSize = getResponsiveSize(14, width, 12, 16);
      const labelFontSize = getResponsiveSize(12, width, 10, 14);
      const padding = getResponsiveSize(16, width, 12, 20);

      setDynamicSizes({
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

  const configNamesKey = JSON.stringify(config.configNames);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        if (!config.configNames || config.configNames.length === 0) {
          throw new Error("Please configure at least one generation source.");
        }

        setStatus("loading");
        setErrorMessage("");

        const lookupResponse = await fetch(`/api/logging-configs`);
        if (!lookupResponse.ok) {
          throw new Error("Failed to load logging configurations.");
        }

        const lookupData = await lookupResponse.json();
        const configs = Array.isArray(lookupData.data) ? lookupData.data : [];
        const matchedConfigs = config.configNames
          .map((configName) =>
            configs.find((item: any) => item.customName === configName) || null,
          )
          .filter(Boolean);

        if (matchedConfigs.length === 0) {
          throw new Error("No logging configurations matched the selected generation sources.");
        }

        const palette = ["#f59e0b", "#06b6d4", "#8b5cf6", "#16a34a", "#ef4444"];
        const sourceResults = await Promise.all(
          matchedConfigs.map(async (matchedConfig: any, index: number) => {
            const response = await fetch(`/api/chart-data/${matchedConfig.id}?timeRange=24h&type=trend`);
            if (!response.ok) {
              throw new Error(`Failed to load data for ${matchedConfig.customName}.`);
            }
            const result = await response.json();
            if (!result.success) {
              throw new Error(result.message || `Failed to load data for ${matchedConfig.customName}.`);
            }

            const currentValue = Number(result.data?.current ?? 0);
            return {
              name: matchedConfig.customName,
              capacity: currentValue,
              current: currentValue,
              color: palette[index % palette.length],
            };
          }),
        );

        const sources = sourceResults.filter((source) => source.current > 0);
        if (sources.length === 0) {
          throw new Error("Selected generation sources do not have current data.");
        }

        const totalGeneration = sources.reduce((sum, source) => sum + source.current, 0);
        const totalCapacity = sources.reduce((sum, source) => sum + source.capacity, 0);

        if (!isMounted) return;

        setData({
          sources,
          summary: {
            totalGeneration,
            totalConsumption: totalGeneration,
            netPower: 0,
            efficiency: totalCapacity > 0 ? (totalGeneration / totalCapacity) * 100 : 0,
            co2Savings: 0,
          },
          timestamp: new Date().toISOString(),
        });
        setStatus("ok");
      } catch (error: any) {
        if (!isMounted) return;
        setData(null);
        setStatus("error");
        setErrorMessage(error.message || "Failed to load generation data.");
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [configNamesKey]);

  // Get icon for source type
  const getSourceIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case "solar pv":
        return Sun;
      case "wind turbine":
        return Wind;
      case "diesel generator":
        return Fuel;
      case "battery storage":
        return Battery;
      default:
        return Zap;
    }
  };

  // Generate generation mix chart
  const getGenerationChartOption = () => {
    if (!data) return {};

    const chartType = config.chartType || "bar";
    const sources = data.sources.filter((s: any) => s.current > 0); // Only show active sources
    const isDark = theme === "dark";

    // Theme-aware colors
    const axisColors = isDark
      ? chartDesignSystem.chart.axisDark
      : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark
      ? chartDesignSystem.chart.tooltipDark
      : chartDesignSystem.chart.tooltip;

    if (chartType === "pie") {
      return {
        backgroundColor: "transparent",
        tooltip: {
          trigger: "item",
          backgroundColor: tooltipConfig.backgroundColor,
          borderColor: tooltipConfig.borderColor,
          textStyle: {
            color: tooltipConfig.textStyle.color,
            fontSize: 12,
          },
          formatter: (params: any) => `
            <strong>${params.name}</strong><br/>
            <span style="color:${params.color}">●</span> Power: ${params.value.toFixed(1)} kW<br/>
            <span style="color:${params.color}">●</span> Capacity: ${data.sources.find((s: any) => s.name === params.name)?.capacity || 0} kW<br/>
            <span style="color:${params.color}">●</span> Utilization: ${((params.value / (data.sources.find((s: any) => s.name === params.name)?.capacity || 1)) * 100).toFixed(1)}%
          `,
        },
        legend: {
          orient: "vertical",
          left: "right",
          textStyle: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.labelFontSize,
          },
        },
        series: [
          {
            name: "Power Generation",
            type: "pie",
            radius: ["40%", "70%"],
            center: ["35%", "50%"],
            data: sources.map((source: any) => ({
              name: source.name,
              value: source.current,
              itemStyle: { color: source.color },
            })),
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: isDark
                  ? "rgba(255, 255, 255, 0.2)"
                  : "rgba(0, 0, 0, 0.5)",
              },
            },
            label: {
              show: true,
              position: "outside",
              formatter: "{b}: {d}%",
              fontSize: dynamicSizes.labelFontSize,
              color: axisColors.textColor,
            },
            labelLine: {
              show: true,
              lineStyle: {
                color: axisColors.lineColor,
              },
            },
          },
        ],
        animation: {
          duration: chartDesignSystem.chart.animation.duration,
          easing: chartDesignSystem.chart.animation.easing,
        },
      };
    }

    // Bar chart (default)
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
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const sourceName = params[0].axisValue;
          const source = data.sources.find((s: any) => s.name === sourceName);
          if (!source) return "";

          return `
            <strong>${sourceName}</strong><br/>
            <span style="color:#16a34a">●</span> Current: ${source.current.toFixed(1)} kW<br/>
            <span style="color:#6b7280">●</span> Capacity: ${source.capacity} kW<br/>
            <span style="color:#d97706">●</span> Utilization: ${((source.current / source.capacity) * 100).toFixed(1)}%<br/>
            <span style="color:#7c3aed">●</span> Status: ${source.current > 0 ? "Active" : "Inactive"}
          `;
        },
      },
      legend: {
        data: ["Current Generation", "Capacity"],
        orient: "horizontal",
        bottom: "8%",
        textStyle: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
        },
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 16,
      },
      grid: {
        left: "8%",
        right: "8%",
        top: "12%",
        bottom: "25%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: data.sources.map((s: any) => s.name),
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
          rotate: 45,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor },
        },
        splitLine: {
          show: false,
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "Power (kW)",
        nameTextStyle: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
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
      series: [
        {
          name: "Current Generation",
          type: "bar",
          data: data.sources.map((s: any) => s.current),
          itemStyle: {
            color: (params: any) => data.sources[params.dataIndex].color,
          },
          barWidth: "40%",
        },
        {
          name: "Capacity",
          type: "line",
          data: data.sources.map((s: any) => s.capacity),
          itemStyle: {
            color: isDark ? "#94a3b8" : "#6b7280",
          },
          lineStyle: {
            color: isDark ? "#94a3b8" : "#6b7280",
            width: 2,
            type: "dashed",
          },
          symbol: "circle",
          symbolSize: 6,
        },
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Generate efficiency chart
  const getEfficiencyChartOption = () => {
    if (!data) return {};

    const efficiencyData = [
      {
        name: "System Efficiency",
        value: data.summary.efficiency,
        color: "#16a34a",
      },
      { name: "Solar Efficiency", value: 85, color: "#f59e0b" },
      { name: "Wind Efficiency", value: 78, color: "#06b6d4" },
      { name: "Battery Efficiency", value: 92, color: "#8b5cf6" },
    ];

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: chartDesignSystem.chart.tooltip.backgroundColor,
        borderColor: chartDesignSystem.chart.tooltip.borderColor,
        textStyle: {
          color: chartDesignSystem.chart.tooltip.textStyle.color,
          fontSize: 12,
        },
        formatter: (params: any) => `
          <strong>${params[0].axisValue}</strong><br/>
          <span style="color:${params[0].color}">●</span> Efficiency: ${params[0].value.toFixed(1)}%
        `,
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
        data: efficiencyData.map((d) => d.name),
        axisLabel: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
          rotate: 45,
        },
        axisLine: {
          lineStyle: { color: chartDesignSystem.colors.neutral[300] },
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "Efficiency (%)",
        nameTextStyle: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLabel: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLine: {
          lineStyle: { color: chartDesignSystem.colors.neutral[300] },
        },
      },
      series: [
        {
          name: "Efficiency",
          type: "bar",
          data: efficiencyData.map((d) => d.value),
          itemStyle: {
            color: (params: any) => efficiencyData[params.dataIndex].color,
          },
          barWidth: "60%",
          label: {
            show: true,
            position: "top",
            formatter: "{c}%",
            fontSize: dynamicSizes.valueFontSize,
            color: chartDesignSystem.colors.neutral[700],
          },
        },
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Render source cards
  const renderSourceCards = () => {
    if (!data) return null;

    return (
      <div className="flex gap-3 overflow-x-auto pb-2 mb-4">
        {data.sources.map((source: any, index: number) => {
          const Icon = getSourceIcon(source.name);
          const utilization = (source.current / source.capacity) * 100;

          return (
            <div
              key={index}
              className={`bg-slate-50 dark:bg-slate-800 rounded-lg p-3 border flex-1 min-w-[180px] ${
                theme === "dark" ? "border-slate-600" : "border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="rounded-lg p-1.5"
                  style={{ backgroundColor: `${source.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: source.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    className={`font-semibold text-xs truncate ${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    {source.name}
                  </h4>
                  <p
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    {source.current > 0 ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Current
                  </span>
                  <span
                    className={`font-bold text-xs ${
                      theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                  >
                    {source.current.toFixed(1)} kW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Capacity
                  </span>
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-300" : "text-slate-700"
                    }`}
                  >
                    {source.capacity} kW
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span
                    className={`text-xs ${
                      theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                  >
                    Utilization
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      utilization > 80
                        ? "text-green-600"
                        : utilization > 50
                          ? "text-amber-600"
                          : "text-red-600"
                    }`}
                  >
                    {utilization.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render summary stats
  const renderSummaryStats = () => {
    if (!data) return null;

    const { summary } = data;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div
          className={`text-center p-2 rounded-lg ${
            theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Total Generation
          </div>
          <div className="text-sm font-bold text-green-600">
            {summary.totalGeneration.toFixed(1)} kW
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${
            theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            Net Power
          </div>
          <div className="text-sm font-bold text-blue-600">
            {summary.netPower.toFixed(1)} kW
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${
            theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            System Efficiency
          </div>
          <div
            className={`text-sm font-bold ${
              theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
          >
            {summary.efficiency.toFixed(1)}%
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${
            theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
          }`}
        >
          <div
            className={`text-xs font-medium ${
              theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}
          >
            CO₂ Saved
          </div>
          <div className="text-sm font-bold text-green-600">
            {summary.co2Savings} kg
          </div>
        </div>
      </div>
    );
  };

  // Weather data is not available from a real source yet.
  const renderWeatherInfo = () => {
    return null;
  };

  // Forecast data is not available from a real source yet.
  const renderForecast = () => {
    return null;
  };

  // Render view selector
  const renderViewSelector = () => {
    return (
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4">
        {[
          { key: "generation", label: "Generation", icon: BarChart3 },
          { key: "efficiency", label: "Efficiency", icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key as "generation" | "efficiency")}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
              selectedView === key
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Icon className="w-3 h-3" />
            {label}
          </button>
        ))}
      </div>
    );
  };

  // Render content
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            Loading generation data...
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
            <Zap
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
            No generation data available
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div
          className={`flex items-center gap-3 border-b pb-3 mb-3 ${
            theme === "dark" ? "border-slate-700" : "border-slate-200"
          }`}
        >
          <div
            className={`rounded-lg p-2 ${
              theme === "dark" ? "bg-slate-700" : "bg-green-100"
            }`}
          >
            <Zap
              className={`w-5 h-5 ${
                theme === "dark" ? "text-slate-300" : "text-green-600"
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
              {selectedView === "generation"
                ? "Renewable energy mix"
                : "System efficiency analysis"}
            </p>
          </div>
        </div>

        {/* View Selector */}
        {renderViewSelector()}

        {/* Weather Info */}
        {selectedView === "generation" && renderWeatherInfo()}

        {/* Summary Stats */}
        {selectedView === "generation" && renderSummaryStats()}

        {/* Source Cards */}
        {selectedView === "generation" && renderSourceCards()}

        {/* Chart Area */}
        <div className="flex-1">
          {selectedView === "generation" && (
            <ReactECharts
              option={getGenerationChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}

          {selectedView === "efficiency" && (
            <ReactECharts
              option={getEfficiencyChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}
        </div>
      </div>
    );
  };

  return (
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
      <div className="absolute top-3 right-3 z-10">
        <div
          className={`rounded-full w-3 h-3 ${
            status === "ok"
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
