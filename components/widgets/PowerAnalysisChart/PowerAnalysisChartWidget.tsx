"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle,
  Settings,
  Gauge,
  BarChart3,
  Clock,
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
import { chartDesignSystem, getChartColor, getResponsiveSize } from "../design-system";

// Safe math operations to prevent NaN/Infinity errors
const safeDivide = (a: number, b: number): number => {
  if (!isFinite(a) || !isFinite(b) || b === 0) return 0;
  return a / b;
};

const safeSqrt = (value: number): number => {
  if (!isFinite(value) || value < 0) return 0;
  return Math.sqrt(value);
};

const safeAverage = (values: number[]): number => {
  if (!values || values.length === 0) return 0;
  const validValues = values.filter(v => isFinite(v));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
};

// Define types for real power analysis data
interface RealPowerPhase {
  phase: string;
  voltage: number;
  current: number;
  power: number;
  pf: number;
  thd: number;
}

interface RealPowerHarmonic {
  harmonic: number;
  value: number;
}

interface RealPowerQuality {
  voltageUnbalance: number;
  currentUnbalance: number;
  flicker: number;
}

interface RealPowerSummary {
  totalPower: number;
  averageVoltage: number;
  averageCurrent: number;
  systemPF: number;
  totalTHD: number;
}

interface RealPowerAnalysisData {
  summary: RealPowerSummary;
  phases: RealPowerPhase[];
  harmonics: RealPowerHarmonic[];
  quality: RealPowerQuality;
  timestamp: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[]; // Array of power meter config names
    showHarmonics?: boolean;
    showQualityMetrics?: boolean;
    refreshInterval?: number;
  };
}

export const PowerAnalysisChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealPowerAnalysisData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedView, setSelectedView] = useState<"overview" | "harmonics" | "quality">("overview");

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

  // Memoize config dependencies to prevent unnecessary re-runs
  const configNamesKey = JSON.stringify(config.configNames);

  const getMetricValue = (results: any[], phase: string, metric: string) => {
    const normalizedPhase = phase.toLowerCase();
    const normalizedMetric = metric.toLowerCase();
    const match = results.find((result) => {
      const name = String(result.data?.configName || "").toLowerCase();
      return name.includes(normalizedPhase) && name.includes(normalizedMetric);
    });
    return Number(match?.data?.current ?? 0);
  };

  // Load real power analysis data
  useEffect(() => {
    let isMounted = true;
    const loadData = async (isInitialLoad = true) => {
      try {
        if (isInitialLoad && !data) setStatus("loading");

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
            console.warn("[PowerAnalysis] Failed to lookup configIds:", lookupError);
          }
        }

        if (configIds.length === 0) {
          if (isInitialLoad) {
            setData(null);
            setStatus("error");
            setErrorMessage("No power meter configurations found.");
          }
          return;
        }

        const timeRange = "24h";

        // Fetch data for all power meter configs
        const configPromises = configIds.map(async (configId) => {
          const response = await fetch(`/api/chart-data/${configId}?timeRange=${timeRange}&type=trend`);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.message || "Failed to fetch data");
          }
          return { configId, ...result };
        });

        const results = await Promise.all(configPromises);

        if (!isMounted) return;

        const phases: RealPowerPhase[] = ["L1", "L2", "L3"]
          .map((phase) => ({
            phase,
            voltage: getMetricValue(results, phase, "voltage"),
            current: getMetricValue(results, phase, "current"),
            power: getMetricValue(results, phase, "power"),
            pf: getMetricValue(results, phase, "pf"),
            thd: getMetricValue(results, phase, "thd"),
          }))
          .filter((phase) =>
            [phase.voltage, phase.current, phase.power, phase.pf, phase.thd].some(
              (value) => value > 0,
            ),
          );

        if (phases.length === 0) {
          throw new Error("Selected configurations do not contain phase power metrics.");
        }

        // Calculate summary
        const totalPower = phases.reduce((sum, phase) => sum + phase.power, 0);
        const averageVoltage = safeAverage(phases.map((phase) => phase.voltage));
        const averageCurrent = safeAverage(phases.map((phase) => phase.current));
        const systemPF = safeAverage(phases.map((phase) => phase.pf));
        const totalTHD = safeAverage(phases.map((phase) => phase.thd));

        const harmonics: RealPowerHarmonic[] = Array.from({ length: 15 }, (_, i) => ({
          harmonic: i + 1,
          value: i === 0 ? 100 : 0,
        }));

        const voltageUnbalance = averageVoltage
          ? Math.max(
              ...phases.map((phase) =>
                Math.abs(safeDivide(phase.voltage - averageVoltage, averageVoltage) * 100),
              ),
            )
          : 0;
        const currentUnbalance = averageCurrent
          ? Math.max(
              ...phases.map((phase) =>
                Math.abs(safeDivide(phase.current - averageCurrent, averageCurrent) * 100),
              ),
            )
          : 0;

        const powerData: RealPowerAnalysisData = {
          summary: { totalPower, averageVoltage, averageCurrent, systemPF, totalTHD },
          phases,
          harmonics,
          quality: {
            voltageUnbalance,
            currentUnbalance,
            flicker: 0
          },
          timestamp: new Date().toISOString()
        };

        setData(powerData);
        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[PowerAnalysis] Error loading data:", err);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load power data");
      }
    };

    loadData();

    // The user requested to remove automatic refresh to prevent flickering.
    return () => { isMounted = false; };
  }, [configNamesKey]);

  // Generate overview chart (3-phase power)
  const getOverviewChartOption = () => {
    if (!data) return {};

    const isDark = theme === "dark";
    const axisColors = isDark ? chartDesignSystem.chart.axisDark : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark ? chartDesignSystem.chart.tooltipDark : chartDesignSystem.chart.tooltip;

    const phases = data.phases.map(phase => phase.phase);
    const voltages = data.phases.map(phase => phase.voltage);
    const currents = data.phases.map(phase => phase.current);
    const powers = data.phases.map(phase => phase.power);

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
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const phase = params[0].axisValue;
          const phaseData = data.phases.find(p => p.phase === phase);
          if (!phaseData) return "";

          return `
            <strong>${phase}</strong><br/>
            <span style="color:#2563eb">●</span> Voltage: ${phaseData.voltage.toFixed(1)} V<br/>
            <span style="color:#16a34a">●</span> Current: ${phaseData.current.toFixed(1)} A<br/>
            <span style="color:#d97706">●</span> Power: ${phaseData.power.toFixed(0)} W<br/>
            <span style="color:#dc2626">●</span> PF: ${phaseData.pf.toFixed(3)}
          `;
        },
      },
      legend: {
        data: ["Voltage", "Current", "Power"],
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
        data: phases,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor }
        },
      },
      yAxis: [
        {
          type: "value",
          scale: true,
          name: "Voltage (V) / Current (A)",
          nameTextStyle: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.labelFontSize,
          },
          axisLabel: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.labelFontSize,
          },
          axisLine: {
            lineStyle: { color: axisColors.lineColor }
          },
        },
        {
          type: "value",
          scale: true,
          name: "Power (W)",
          nameTextStyle: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.labelFontSize,
          },
          axisLabel: {
            color: axisColors.textColor,
            fontSize: dynamicSizes.labelFontSize,
          },
          axisLine: {
            lineStyle: { color: axisColors.lineColor }
          },
        }
      ],
      series: [
        {
          name: "Voltage",
          type: "bar",
          data: voltages,
          itemStyle: {
            color: "#2563eb",
          },
          barWidth: "20%",
        },
        {
          name: "Current",
          type: "bar",
          data: currents,
          itemStyle: {
            color: "#16a34a",
          },
          barWidth: "20%",
        },
        {
          name: "Power",
          type: "line",
          yAxisIndex: 1,
          data: powers,
          itemStyle: {
            color: "#d97706",
          },
          lineStyle: {
            color: "#d97706",
            width: 3,
          },
          symbol: "circle",
          symbolSize: 6,
        }
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Generate harmonics chart
  const getHarmonicsChartOption = () => {
    if (!data) return {};

    const harmonics = data.harmonics.slice(0, 15); // Show first 15 harmonics
    const harmonicNumbers = harmonics.map(h => h.harmonic);
    const values = harmonics.map(h => h.value);

    return {
      backgroundColor: "transparent",
      textStyle: {
        color: chartDesignSystem.colors.neutral[700],
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: chartDesignSystem.chart.tooltip.backgroundColor,
        borderColor: chartDesignSystem.chart.tooltip.borderColor,
        textStyle: {
          color: chartDesignSystem.chart.tooltip.textStyle.color,
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const harmonic = params[0].axisValue;
          const harmonicData = harmonics.find(h => h.harmonic === harmonic);
          if (!harmonicData) return "";

          return `
            <strong>Harmonic ${harmonic}</strong><br/>
            <span style="color:#7c3aed">●</span> Amplitude: ${harmonicData.value.toFixed(2)}%<br/>
            ${harmonic === 1 ? '<em>Fundamental Frequency</em>' : ''}
          `;
        },
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
        data: harmonicNumbers,
        axisLabel: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
          formatter: (value: number) => {
            if (value === 1) return "1\n(Fundamental)";
            return value.toString();
          },
        },
        axisLine: {
          lineStyle: { color: chartDesignSystem.colors.neutral[300] }
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: "Amplitude (%)",
        nameTextStyle: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLabel: {
          color: chartDesignSystem.colors.neutral[600],
          fontSize: dynamicSizes.labelFontSize,
        },
        axisLine: {
          lineStyle: { color: chartDesignSystem.colors.neutral[300] }
        },
      },
      series: [
        {
          name: "Harmonics",
          type: "bar",
          data: values,
          itemStyle: (params: any) => ({
            color: params.dataIndex === 0 ? "#dc2626" : "#7c3aed", // Fundamental in red
          }),
          barWidth: "60%",
        }
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Render quality metrics
  const renderQualityMetrics = () => {
    if (!data) return null;

    const { quality } = data;

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            <span className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Voltage Unbalance</span>
          </div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {quality.voltageUnbalance.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
            {quality.voltageUnbalance < 2 ? "Good" : quality.voltageUnbalance < 3 ? "Fair" : "Poor"}
          </div>
        </div>

        <div className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className="flex items-center gap-2 mb-2 justify-center">
            <Activity className="w-4 h-4 text-green-600" />
            <span className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Current Unbalance</span>
          </div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {quality.currentUnbalance.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
            {quality.currentUnbalance < 10 ? "Good" : quality.currentUnbalance < 20 ? "Fair" : "Poor"}
          </div>
        </div>

        <div className={`text-center p-4 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <span className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}>Flicker</span>
          </div>
          <div className={`text-2xl font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {quality.flicker.toFixed(2)}
          </div>
          <div className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>
            {quality.flicker < 1 ? "Excellent" : quality.flicker < 1.5 ? "Good" : "Poor"}
          </div>
        </div>
      </div>
    );
  };

  // Render summary stats
  const renderSummaryStats = () => {
    if (!data) return null;

    const { summary } = data;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Total Power</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {(summary.totalPower / 1000).toFixed(1)} kW
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Avg Voltage</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {summary.averageVoltage.toFixed(1)} V
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Avg Current</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {summary.averageCurrent.toFixed(1)} A
          </div>
        </div>
        <div className={`text-center p-2 rounded-lg ${theme === "dark" ? "bg-slate-700/50 border border-slate-600" : "bg-slate-50 border border-slate-200"
          }`}>
          <div className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>Power Factor</div>
          <div className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}>
            {summary.systemPF.toFixed(3)}
          </div>
        </div>
      </div>
    );
  };

  // Render view selector
  const renderViewSelector = () => {
    return (
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4">
        {[
          { key: "overview", label: "Overview", icon: BarChart3 },
          { key: "harmonics", label: "Harmonics", icon: Activity },
          { key: "quality", label: "Quality", icon: CheckCircle },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSelectedView(key as any)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${selectedView === key
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
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Loading power analysis...</p>
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
            <Zap className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"
              }`} />
          </div>
          <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
            }`}>No power data available</p>
        </div>
      );
    }

    return (
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 mb-3 ${theme === "dark" ? "border-slate-700" : "border-slate-200"
          }`}>
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-700" : "bg-blue-100"
              }`}>
              <Zap className={`w-5 h-5 ${theme === "dark" ? "text-slate-300" : "text-blue-600"
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
                {selectedView === "overview" ? "3-phase power monitoring" :
                  selectedView === "harmonics" ? "Harmonic analysis" :
                    "Power quality metrics"}
              </p>
            </div>
          </div>

          {/* Time Range Display */}
          <div className="flex items-center gap-2">
            <Clock className={`w-4 h-4 ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`} />
            <div>
              <div className={`text-sm font-semibold ${theme === "dark" ? 'text-slate-100' : 'text-slate-900'}`}>
                24h
              </div>
              <div className={`text-xs ${theme === "dark" ? 'text-slate-400' : 'text-slate-600'}`}>time range</div>
            </div>
          </div>
        </div>

        {/* View Selector */}
        {renderViewSelector()}

        {/* Summary Stats */}
        {selectedView === "overview" && renderSummaryStats()}

        {/* Quality Metrics */}
        {selectedView === "quality" && renderQualityMetrics()}

        {/* Chart Area */}
        <div className="flex-1">
          {selectedView === "overview" && (
            <ReactECharts
              option={getOverviewChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}

          {selectedView === "harmonics" && config.showHarmonics !== false && (
            <ReactECharts
              option={getHarmonicsChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}

          {selectedView === "quality" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h4 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                  }`}>
                  Power Quality Analysis
                </h4>
                <p className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                  }`}>
                  Real-time power quality monitoring and analysis
                </p>
                {renderQualityMetrics()}
              </div>
            </div>
          )}
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
