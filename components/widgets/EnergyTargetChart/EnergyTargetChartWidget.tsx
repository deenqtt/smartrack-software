"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useTheme } from "next-themes";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  X,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

// Define types for real energy target data
interface RealMonthlyData {
  month: string;
  target: number;
  actual: number;
  achievement: number;
  variance: number;
  status: "excellent" | "good" | "warning" | "danger";
}

interface RealDailyData {
  date: string;
  day: number;
  target: number;
  actual: number;
  achievement: number;
}

interface RealMonthlySummary {
  totalTarget: number;
  totalActual: number;
  overallAchievement: number;
  averageAchievement: number;
  bestMonth: RealMonthlyData | null;
  worstMonth: RealMonthlyData | null;
}

interface RealDailySummary {
  totalTarget: number;
  totalActual: number;
  averageAchievement: number;
}

interface RealYearEndProjection {
  projected: number;
  target: number;
  gap: number;
}

interface RealProjections {
  yearEnd: RealYearEndProjection;
}

interface RealEnergyTargetData {
  year: number;
  monthly: {
    data: RealMonthlyData[];
    summary: RealMonthlySummary;
  };
  daily: {
    month: string;
    data: RealDailyData[];
    summary: RealDailySummary;
  };
  projections: RealProjections;
  unit: string;
}

interface Props {
  config: {
    widgetTitle: string;
    configNames?: string[]; // Array of energy meter config names
    loggingConfigId?: string;
    year?: number;
    chartType?: "composed" | "progress" | "heatmap";
    showProjections?: boolean;
    showAchievements?: boolean;
    targetUnit?: string;
  };
}

interface LoggingConfigLookup {
  id: string;
  customName: string;
  units?: string | null;
}

interface HistoricalMonthlyItem {
  month: string;
  target: number;
  actual: number;
}

interface HistoricalDailyItem {
  date: string;
  actual: number;
  target: number;
  dayOfWeek: number;
}

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const roundToOne = (value: number) => Math.round(value * 10) / 10;

const calculateAchievement = (actual: number, target: number) => {
  if (target <= 0) return 0;
  return roundToOne((actual / target) * 100);
};

const getStatusFromAchievement = (
  achievement: number,
  target: number,
  actual: number,
): RealMonthlyData["status"] => {
  if (target <= 0) return actual > 0 ? "warning" : "good";
  if (achievement >= 95) return "excellent";
  if (achievement >= 85) return "good";
  if (achievement >= 75) return "warning";
  return "danger";
};

const getDisplayMonth = (
  year: number,
  monthlyData: HistoricalMonthlyItem[],
) => {
  const now = new Date();
  const maxMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;

  for (let month = maxMonth; month >= 1; month -= 1) {
    const entry = monthlyData[month - 1];
    if (entry && (entry.actual > 0 || entry.target > 0)) {
      return month;
    }
  }

  return Math.max(1, maxMonth);
};

const getLastMonthWithValues = (monthlyData: RealMonthlyData[]) => {
  for (let index = monthlyData.length - 1; index >= 0; index -= 1) {
    if (monthlyData[index].target > 0 || monthlyData[index].actual > 0) {
      return index + 1;
    }
  }

  return 0;
};

export const EnergyTargetChartWidget = ({ config }: Props) => {
  const { theme } = useTheme();
  const [data, setData] = useState<RealEnergyTargetData | null>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [selectedView, setSelectedView] = useState<
    "monthly" | "daily" | "projections"
  >("monthly");
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 16,
    valueFontSize: 14,
    labelFontSize: 12,
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

      const titleFontSize = getResponsiveSize(16, width, 12, 18);
      const valueFontSize = getResponsiveSize(12, width, 8, 12);
      const labelFontSize = getResponsiveSize(11, width, 8, 12);
      const legendFontSize = getResponsiveSize(10, width, 8, 11);
      const padding = getResponsiveSize(12, width, 8, 16);

      setDynamicSizes({
        titleFontSize,
        valueFontSize,
        labelFontSize,
        legendFontSize: legendFontSize,
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

  // Load real energy target data
  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setStatus("loading");
        setErrorMessage("");

        let resolvedConfigId = config.loggingConfigId || "";
        let resolvedUnit = config.targetUnit || "kWh";

        if (!resolvedConfigId || !config.targetUnit) {
          const lookupResponse = await fetch(`/api/logging-configs?limit=1000`);
          if (!lookupResponse.ok) {
            throw new Error("Failed to load logging configuration metadata");
          }

          const lookupData = await lookupResponse.json();
          const configs: LoggingConfigLookup[] = Array.isArray(lookupData.data)
            ? lookupData.data
            : [];

          let matchedConfig =
            configs.find((item) => item.id === resolvedConfigId) || null;

          if (
            !matchedConfig &&
            config.configNames &&
            config.configNames.length > 0
          ) {
            matchedConfig =
              config.configNames
                .map(
                  (configName) =>
                    configs.find((item) => item.customName === configName) ||
                    null,
                )
                .find(Boolean) || null;
          }

          if (matchedConfig) {
            resolvedConfigId = matchedConfig.id;
            resolvedUnit = matchedConfig.units || resolvedUnit;
          }
        }

        if (!resolvedConfigId) {
          throw new Error("Please configure a valid logging source.");
        }

        const year = config.year || new Date().getFullYear();

        const monthlyResponse = await fetch(
          `/api/historical/energy-target-data?configId=${resolvedConfigId}&year=${year}`,
        );
        if (!monthlyResponse.ok) {
          throw new Error("Failed to load monthly energy target data");
        }

        const monthlyPayload = await monthlyResponse.json();
        const monthlySource: HistoricalMonthlyItem[] = Array.isArray(
          monthlyPayload,
        )
          ? monthlyPayload
          : [];

        const normalizedMonthlySource = MONTH_LABELS.map((month, index) => {
          const sourceItem = monthlySource[index];
          return {
            month,
            target: Number(sourceItem?.target || 0),
            actual: Number(sourceItem?.actual || 0),
          };
        });

        const monthlyData: RealMonthlyData[] = normalizedMonthlySource.map(
          (item) => {
            const achievement = calculateAchievement(item.actual, item.target);
            return {
              month: item.month,
              target: item.target,
              actual: item.actual,
              achievement,
              variance: roundToOne(item.actual - item.target),
              status: getStatusFromAchievement(
                achievement,
                item.target,
                item.actual,
              ),
            };
          },
        );

        const monthsWithTargets = monthlyData.filter((item) => item.target > 0);
        const monthsWithValues = monthlyData.filter(
          (item) => item.target > 0 || item.actual > 0,
        );
        const totalTarget = roundToOne(
          monthlyData.reduce((sum, item) => sum + item.target, 0),
        );
        const totalActual = roundToOne(
          monthlyData.reduce((sum, item) => sum + item.actual, 0),
        );
        const overallAchievement = calculateAchievement(
          totalActual,
          totalTarget,
        );
        const averageAchievement =
          monthsWithTargets.length > 0
            ? roundToOne(
              monthsWithTargets.reduce(
                (sum, item) => sum + item.achievement,
                0,
              ) / monthsWithTargets.length,
            )
            : 0;
        const bestMonth =
          monthsWithValues.length > 0
            ? monthsWithValues.reduce((best, current) =>
              current.achievement > best.achievement ? current : best,
            )
            : null;
        const worstMonth =
          monthsWithValues.length > 0
            ? monthsWithValues.reduce((worst, current) =>
              current.achievement < worst.achievement ? current : worst,
            )
            : null;
        const monthlySummary: RealMonthlySummary = {
          totalTarget,
          totalActual,
          overallAchievement,
          averageAchievement,
          bestMonth,
          worstMonth,
        };

        const displayMonth = getDisplayMonth(year, normalizedMonthlySource);
        const dailyResponse = await fetch(
          `/api/historical/monthly-energy-data?configId=${resolvedConfigId}&month=${displayMonth}&year=${year}`,
        );
        if (!dailyResponse.ok) {
          throw new Error("Failed to load daily energy data");
        }

        const dailyPayload = await dailyResponse.json();
        const dailySource: HistoricalDailyItem[] = Array.isArray(dailyPayload)
          ? dailyPayload
          : [];
        const dailyData: RealDailyData[] = dailySource.map((item) => {
          const actual = Number(item.actual || 0);
          const target = Number(item.target || 0);
          return {
            date: item.date,
            day: Number(item.date.split("-")[2]),
            target,
            actual,
            achievement: Math.round(calculateAchievement(actual, target)),
          };
        });

        const dailyTotalTarget = roundToOne(
          dailyData.reduce((sum, item) => sum + item.target, 0),
        );
        const dailyTotalActual = roundToOne(
          dailyData.reduce((sum, item) => sum + item.actual, 0),
        );
        const dailyAverageAchievement =
          dailyData.length > 0
            ? dailyData.reduce((sum, item) => sum + item.achievement, 0) /
            dailyData.length
            : 0;

        const dailySummary: RealDailySummary = {
          totalTarget: dailyTotalTarget,
          totalActual: dailyTotalActual,
          averageAchievement: roundToOne(dailyAverageAchievement),
        };

        const monthsElapsed =
          year === new Date().getFullYear()
            ? Math.min(new Date().getMonth() + 1, 12)
            : getLastMonthWithValues(monthlyData) || 12;
        const actualToDate = monthlyData
          .slice(0, Math.max(1, monthsElapsed))
          .reduce((sum, item) => sum + item.actual, 0);
        const projectedTotal =
          monthsElapsed > 0
            ? roundToOne((actualToDate / monthsElapsed) * 12)
            : totalActual;
        const yearEndProjection: RealYearEndProjection = {
          projected: projectedTotal,
          target: totalTarget,
          gap: roundToOne(projectedTotal - totalTarget),
        };

        const projections: RealProjections = { yearEnd: yearEndProjection };

        if (!isMounted) return;

        const energyData: RealEnergyTargetData = {
          year,
          monthly: { data: monthlyData, summary: monthlySummary },
          daily: {
            month: MONTH_LABELS[displayMonth - 1],
            data: dailyData,
            summary: dailySummary,
          },
          projections,
          unit: resolvedUnit,
        };

        setData(energyData);
        setStatus("ok");
      } catch (err: any) {
        if (!isMounted) return;
        console.error("[EnergyTarget] Error loading data:", err);
        setData(null);
        setStatus("error");
        setErrorMessage(err.message || "Failed to load target data");
      }
    };

    loadData();

    // The user requested to remove automatic refresh to prevent flickering.
    return () => {
      isMounted = false;
    };
  }, [config.year, config.loggingConfigId, config.targetUnit, configNamesKey]);

  // Generate monthly progress chart
  const getMonthlyChartOption = () => {
    if (!data) return {};

    const width = dimensions.width;
    const isDark = theme === "dark";
    const axisColors = isDark
      ? chartDesignSystem.chart.axisDark
      : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark
      ? chartDesignSystem.chart.tooltipDark
      : chartDesignSystem.chart.tooltip;

    const months = data.monthly.data.map((d) => d.month);
    const actuals = data.monthly.data.map((d) => d.actual);
    const targets = data.monthly.data.map((d) => d.target);
    const achievements = data.monthly.data.map((d) => d.achievement);

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
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const month = params[0].axisValue;
          const monthData = data.monthly.data.find((d) => d.month === month);
          if (!monthData) return "";

          return `
            <strong>${month} ${data.year}</strong><br/>
            <span style="color:#16a34a">●</span> Target: ${monthData.target} ${data.unit}<br/>
            <span style="color:#2563eb">●</span> Actual: ${monthData.actual} ${data.unit}<br/>
            <span style="color:#d97706">●</span> Achievement: ${monthData.achievement}%<br/>
            <span style="color:${monthData.variance >= 0 ? "#16a34a" : "#dc2626"}">●</span> Variance: ${monthData.variance >= 0 ? "+" : ""}${monthData.variance} ${data.unit}
          `;
        },
      },
      legend: {
        data: ["Target", "Actual"],
        orient: "horizontal",
        bottom: "8%",
        show: width >= 320,
        textStyle: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        itemWidth: 12,
        itemHeight: 8,
        itemGap: 16,
      },
      grid: {
        left: width < 400 ? "2%" : "5%",
        right: width < 400 ? "2%" : "5%",
        top: width < 400 ? "10%" : "12%",
        bottom: width < 400 ? "5%" : "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: months,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.legendFontSize,
        },
        axisLine: {
          lineStyle: { color: axisColors.lineColor },
        },
      },
      yAxis: {
        type: "value",
        scale: true,
        name: width >= 380 ? `Energy (${data.unit})` : "",
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
      series: [
        {
          name: "Target",
          type: "line",
          data: targets,
          lineStyle: {
            color: isDark ? "#fbbf24" : "#d97706",
            width: 3,
            type: "dashed",
          },
          itemStyle: {
            color: isDark ? "#fbbf24" : "#d97706",
          },
          symbol: "circle",
          symbolSize: 8,
        },
        {
          name: "Actual",
          type: "bar",
          data: actuals,
          itemStyle: (params: any) => ({
            color:
              achievements[params.dataIndex] >= 95
                ? "#16a34a"
                : achievements[params.dataIndex] >= 85
                  ? "#65a30d"
                  : achievements[params.dataIndex] >= 75
                    ? isDark
                      ? "#fbbf24"
                      : "#d97706"
                    : "#dc2626",
          }),
          barWidth: "60%",
          label: {
            show: width >= 380,
            position: "top",
            formatter: (params: any) => `${achievements[params.dataIndex]}%`,
            fontSize: dynamicSizes.valueFontSize,
            color: isDark
              ? chartDesignSystem.chart.textDark.primary
              : chartDesignSystem.chart.textLight.primary,
          },
        },
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Generate daily breakdown chart
  const getDailyChartOption = () => {
    if (!data) return {};

    const isDark = theme === "dark";
    const axisColors = isDark
      ? chartDesignSystem.chart.axisDark
      : chartDesignSystem.chart.axisLight;
    const tooltipConfig = isDark
      ? chartDesignSystem.chart.tooltipDark
      : chartDesignSystem.chart.tooltip;

    const days = data.daily.data.map((d) => d.day);
    const actuals = data.daily.data.map((d) => d.actual);
    const targets = data.daily.data.map((d) => d.target);
    const achievements = data.daily.data.map((d) => d.achievement);

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
        formatter: (params: any) => {
          if (!params || params.length === 0) return "";
          const day = params[0].axisValue;
          const dayData = data.daily.data.find((d) => d.day === day);
          if (!dayData) return "";

          return `
            <strong>Day ${day}, ${data.daily.month} ${data.year}</strong><br/>
            <span style="color:#d97706">●</span> Target: ${dayData.target} ${data.unit}<br/>
            <span style="color:#2563eb">●</span> Actual: ${dayData.actual} ${data.unit}<br/>
            <span style="color:#16a34a">●</span> Achievement: ${dayData.achievement}%
          `;
        },
      },
      grid: {
        left: dimensions.width < 400 ? "2%" : "5%",
        right: dimensions.width < 400 ? "2%" : "5%",
        top: dimensions.width < 400 ? "10%" : "12%",
        bottom: dimensions.width < 400 ? "5%" : "15%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: days,
        axisLabel: {
          color: axisColors.textColor,
          fontSize: dynamicSizes.labelFontSize,
          formatter: (value: number) => `${value}`,
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
      yAxis: {
        type: "value",
        scale: true,
        name: `Energy (${data.unit})`,
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
          name: "Daily Target",
          type: "line",
          data: targets,
          lineStyle: {
            color: isDark ? "#fbbf24" : "#d97706",
            width: 2,
            type: "dashed",
          },
          itemStyle: {
            color: isDark ? "#fbbf24" : "#d97706",
          },
          symbol: "none",
        },
        {
          name: "Daily Actual",
          type: "bar",
          data: actuals,
          itemStyle: (params: any) => ({
            color:
              achievements[params.dataIndex] >= 100
                ? "#16a34a"
                : achievements[params.dataIndex] >= 80
                  ? "#65a30d"
                  : achievements[params.dataIndex] >= 60
                    ? isDark
                      ? "#fbbf24"
                      : "#d97706"
                    : "#dc2626",
          }),
          barWidth: "80%",
        },
      ],
      animation: {
        duration: chartDesignSystem.chart.animation.duration,
        easing: chartDesignSystem.chart.animation.easing,
      },
    };
  };

  // Render achievement badges
  const renderAchievementBadges = () => {
    if (!data) return null;

    const { monthly } = data;
    const badges = [];

    // Best month badge
    if (monthly.summary.bestMonth) {
      badges.push({
        title: "Best Month",
        value: `${monthly.summary.bestMonth.month}: ${monthly.summary.bestMonth.achievement}%`,
        icon: Award,
        color: "#f59e0b",
      });
    }

    // Overall achievement badge
    const achievement = monthly.summary.overallAchievement;
    badges.push({
      title: "Year Progress",
      value: `${achievement.toFixed(1)}%`,
      icon:
        achievement >= 95
          ? CheckCircle
          : achievement >= 85
            ? TrendingUp
            : AlertTriangle,
      color:
        achievement >= 95
          ? "#16a34a"
          : achievement >= 85
            ? "#d97706"
            : "#dc2626",
    });

    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        {badges.map((badge, index) => {
          const Icon = badge.icon;
          return (
            <div
              key={index}
              className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 flex items-center gap-3"
            >
              <div
                className="rounded-full p-2"
                style={{ backgroundColor: `${badge.color}20` }}
              >
                <Icon className="w-5 h-5" style={{ color: badge.color }} />
              </div>
              <div>
                <div
                  className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                  {badge.title}
                </div>
                <div
                  className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                  style={{ color: badge.color }}
                >
                  {badge.value}
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

    const { monthly, projections } = data;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <div
          className={`text-center p-2 rounded-lg ${theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
            }`}
        >
          <div
            className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
            Total Target
          </div>
          <div
            className={`text-sm font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
              }`}
          >
            {monthly.summary.totalTarget.toLocaleString()} {data.unit}
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
            }`}
        >
          <div
            className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
            Total Actual
          </div>
          <div className="text-sm font-bold text-blue-600">
            {monthly.summary.totalActual.toLocaleString()} {data.unit}
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
            }`}
        >
          <div
            className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
            Avg Achievement
          </div>
          <div className="text-sm font-bold text-green-600">
            {monthly.summary.averageAchievement.toFixed(1)}%
          </div>
        </div>
        <div
          className={`text-center p-2 rounded-lg ${theme === "dark"
              ? "bg-slate-700/50 border border-slate-600"
              : "bg-slate-50 border border-slate-200"
            }`}
        >
          <div
            className={`text-xs font-medium ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
            Year End Projection
          </div>
          <div className="text-sm font-bold text-purple-600">
            {projections.yearEnd.projected.toLocaleString()} {data.unit}
          </div>
        </div>
      </div>
    );
  };

  // Render projections
  const renderProjections = () => {
    if (!data || !config.showProjections) return null;

    const { projections } = data;

    return (
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 mb-4">
        <h4
          className={`text-sm font-semibold mb-3 flex items-center gap-2 ${theme === "dark" ? "text-slate-100" : "text-slate-900"
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          Year-End Projections
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div
              className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
            >
              Projected Total
            </div>
            <div className="text-lg font-bold text-blue-600">
              {projections.yearEnd.projected.toLocaleString()} {data.unit}
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
            >
              Target
            </div>
            <div
              className={`text-lg font-bold ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                }`}
            >
              {projections.yearEnd.target.toLocaleString()} {data.unit}
            </div>
          </div>
          <div className="text-center">
            <div
              className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                }`}
            >
              Gap
            </div>
            <div
              className={`text-lg font-bold ${projections.yearEnd.gap >= 0 ? "text-green-600" : "text-red-600"
                }`}
            >
              {projections.yearEnd.gap >= 0 ? "+" : ""}
              {projections.yearEnd.gap.toLocaleString()} {data.unit}
            </div>
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
          { key: "monthly", label: "Monthly", icon: BarChart3 },
          { key: "daily", label: "Daily", icon: Calendar },
          { key: "projections", label: "Projections", icon: TrendingUp },
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
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
          >
            Loading target data...
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
            <AlertTriangle
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
            <Target
              className={`w-6 h-6 ${theme === "dark" ? "text-amber-400" : "text-amber-600"
                }`}
            />
          </div>
          <p
            className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"
              }`}
          >
            No target data available
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
              className={`rounded-lg p-2 ${theme === "dark" ? "bg-slate-700" : "bg-green-100"
                }`}
            >
              <Target
                className={`w-5 h-5 ${theme === "dark" ? "text-slate-300" : "text-green-600"
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
                {selectedView === "monthly"
                  ? "Monthly progress tracking"
                  : selectedView === "daily"
                    ? `Daily breakdown - ${data.daily.month} ${data.year}`
                    : "Year-end projections & forecasting"}
              </p>
            </div>
          </div>

          {/* Time Range Display */}
          <div className="flex items-center gap-2">
            <Clock
              className={`w-4 h-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
            />
            <div>
              <div
                className={`text-sm font-semibold ${theme === "dark" ? "text-slate-100" : "text-slate-900"}`}
              >
                {data.year}
              </div>
              <div
                className={`text-xs ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}
              >
                year
              </div>
            </div>
          </div>
        </div>

        {/* View Selector + Info Button */}
        <div className="flex items-center justify-between mb-4">
          {renderViewSelector()}

          <button
            onClick={() => setShowInfoModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
            Info
          </button>
        </div>

        {/* Chart Area - FULL SIZE NOW */}
        <div className="flex-1 w-full h-full">
          {selectedView === "monthly" && (
            <ReactECharts
              option={getMonthlyChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}

          {selectedView === "daily" && (
            <ReactECharts
              option={getDailyChartOption()}
              style={{ height: "100%", width: "100%" }}
              opts={{ renderer: "canvas" }}
              notMerge={true}
              lazyUpdate={true}
            />
          )}

          {selectedView === "projections" && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
                <h4
                  className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-slate-100" : "text-slate-900"
                    }`}
                >
                  Energy Target Projections
                </h4>
                <p
                  className={`text-sm mb-4 ${theme === "dark" ? "text-slate-400" : "text-slate-600"
                    }`}
                >
                  Predictive analytics for year-end energy consumption targets
                </p>
                {renderProjections()}
              </div>
            </div>
          )}
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
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Energy Target Details</DialogTitle>
          </DialogHeader>

          {/* Achievement Badges */}
          {config.showAchievements !== false && renderAchievementBadges()}

          {/* Summary Stats */}
          {renderSummaryStats()}

          {/* Projections */}
          {renderProjections()}

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
        className={`w-full h-full relative overflow-hidden rounded-xl shadow-sm ${theme === "dark"
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
    </>
  );
};
