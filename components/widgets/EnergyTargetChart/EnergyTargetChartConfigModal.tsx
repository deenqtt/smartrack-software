// File: components/widgets/EnergyTargetChart/EnergyTargetChartConfigModal.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { showToast } from "@/lib/toast-utils";
import { Loader2, ChevronLeft, ChevronRight, Info } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoggingConfig {
  id: string;
  customName: string;
  units?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle?: string;
    loggingConfigId?: string;
    configNames?: string[];
    year?: number;
    chartType?: "composed" | "heatmap";
    heatmapMonth?: number; // 1-12
    heatmapYear?: number;
    colorScheme?: string;
    activityLevelMode?: "auto" | "custom";
    targetUnit?: string;
    showProjections?: boolean;
    showAchievements?: boolean;
    customThresholds?: {
      level1: number;
      level2: number;
      level3: number;
      level4: number;
    };
  };
}

// Color schemes for heatmap
const colorSchemes = {
  "github-green": {
    name: "GitHub Green",
    dark: ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"],
    light: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  },
  "heat-red": {
    name: "Heat Red",
    dark: ["#1a1414", "#5c1a1a", "#8b2e2e", "#c44545", "#ff6b6b"],
    light: ["#fff5f5", "#fed7d7", "#fc8181", "#f56565", "#e53e3e"],
  },
  "cool-blue": {
    name: "Cool Blue",
    dark: ["#0d1829", "#1e3a5f", "#2563eb", "#3b82f6", "#60a5fa"],
    light: ["#eff6ff", "#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8"],
  },
  "purple-haze": {
    name: "Purple Haze",
    dark: ["#1e1729", "#3d2e5c", "#6d28d9", "#8b5cf6", "#a78bfa"],
    light: ["#faf5ff", "#e9d5ff", "#c084fc", "#9333ea", "#7e22ce"],
  },
};

const monthLabels = [
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

const DEFAULT_THRESHOLDS = {
  level1: 3,
  level2: 6,
  level3: 9,
  level4: 12,
};

export const EnergyTargetChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Combined saving state
  const [isEditMode, setIsEditMode] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || ""
  );
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(
    initialConfig?.loggingConfigId || null
  );
  const [year, setYear] = useState(
    initialConfig?.year || new Date().getFullYear()
  );
  const [chartType, setChartType] = useState<"composed" | "heatmap">(
    initialConfig?.chartType || "composed"
  );

  // Heatmap-specific states
  const currentDate = new Date();
  const [heatmapMonth, setHeatmapMonth] = useState(
    initialConfig?.heatmapMonth || currentDate.getMonth() + 1 // 1-12
  );
  const [heatmapYear, setHeatmapYear] = useState(
    initialConfig?.heatmapYear || currentDate.getFullYear()
  );
  const [colorScheme, setColorScheme] = useState(
    initialConfig?.colorScheme || "github-green"
  );
  const [activityLevelMode, setActivityLevelMode] = useState<"auto" | "custom">(
    initialConfig?.activityLevelMode || "auto"
  );

  // Custom thresholds for activity levels
  const [customThresholds, setCustomThresholds] = useState(
    initialConfig?.customThresholds || DEFAULT_THRESHOLDS
  );

  const [monthlyTargets, setMonthlyTargets] = useState<Record<string, number>>(
    {}
  );

  const selectedLoggingConfig = loggingConfigs.find(
    (config) => config.id === selectedConfigId
  );

  // Fetch daftar log config saat modal dibuka
  useEffect(() => {
    if (!isOpen) return;

    const now = new Date();
    setIsEditMode(Boolean(initialConfig));
    setWidgetTitle(initialConfig?.widgetTitle || "");
    setSelectedConfigId(initialConfig?.loggingConfigId || null);
    setYear(initialConfig?.year || now.getFullYear());
    setChartType(initialConfig?.chartType || "composed");
    setHeatmapMonth(initialConfig?.heatmapMonth || now.getMonth() + 1);
    setHeatmapYear(initialConfig?.heatmapYear || now.getFullYear());
    setColorScheme(initialConfig?.colorScheme || "github-green");
    setActivityLevelMode(initialConfig?.activityLevelMode || "auto");
    setCustomThresholds(initialConfig?.customThresholds || DEFAULT_THRESHOLDS);
    setMonthlyTargets({});

    const fetchConfigs = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/logging-configs?limit=1000`);
        if (!response.ok) {
          throw new Error("Failed to fetch logging configurations");
        }

        const responseData = await response.json();
        const configs = Array.isArray(responseData.data) ? responseData.data : [];
        setLoggingConfigs(configs);

        if (!initialConfig?.loggingConfigId && initialConfig?.configNames?.length) {
          const matchedConfig = configs.find(
            (config: LoggingConfig) =>
              config.customName === initialConfig.configNames?.[0]
          );
          if (matchedConfig) {
            setSelectedConfigId(matchedConfig.id);
          }
        }
      } catch (error: any) {
        console.error("Failed to fetch logging configs:", error);
        setLoggingConfigs([]);
        showToast.error(
          "Failed to load data sources",
          error.message || "Unable to fetch logging configurations."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfigs();
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (!isOpen || chartType !== "composed") {
      return;
    }

    if (selectedConfigId && year) {
      const fetchTargets = async () => {
        try {
          const res = await fetch(
            `${API_BASE_URL}/api/energy-targets?configId=${selectedConfigId}&year=${year}`
          );
          if (res.ok) {
            setMonthlyTargets(await res.json());
          } else {
            setMonthlyTargets({}); // Clear targets if none found or error
          }
        } catch (error) {
          console.error("Failed to fetch energy targets:", error);
          setMonthlyTargets({});
        }
      };
      fetchTargets();
    } else {
      setMonthlyTargets({}); // Clear targets if no config selected or year is invalid
    }
  }, [selectedConfigId, year, chartType, isOpen]);

  const handleTargetChange = (month: string, value: string) => {
    setMonthlyTargets((prev) => ({
      ...prev,
      [month.toLowerCase()]: Number(value) || 0,
    }));
  };

  // Month navigation helpers
  const navigateMonth = (direction: "prev" | "next") => {
    let newMonth = heatmapMonth;
    let newYear = heatmapYear;

    if (direction === "prev") {
      newMonth--;
      if (newMonth < 1) {
        newMonth = 12;
        newYear--;
      }
    } else {
      newMonth++;
      if (newMonth > 12) {
        newMonth = 1;
        newYear++;
      }
    }

    setHeatmapMonth(newMonth);
    setHeatmapYear(newYear);
  };

  const setToCurrentMonth = () => {
    const now = new Date();
    setHeatmapMonth(now.getMonth() + 1);
    setHeatmapYear(now.getFullYear());
  };

  const setToLastMonth = () => {
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setHeatmapMonth(lastMonth.getMonth() + 1);
    setHeatmapYear(lastMonth.getFullYear());
  };

  // Get formatted month display
  const getMonthDisplay = () => {
    const monthName = new Date(heatmapYear, heatmapMonth - 1, 1).toLocaleString(
      "en-US",
      { month: "long" }
    );
    return `${monthName} ${heatmapYear}`;
  };

  const handleSave = async () => {
    if (!widgetTitle || !selectedConfigId) {
      showToast.warning(
        "Incomplete configuration",
        "Widget title and log configuration are required."
      );
      return;
    }

    setIsSaving(true);
    try {
      // Save monthly targets only for composed chart
      if (chartType === "composed") {
        const targetResponse = await fetch(`${API_BASE_URL}/api/energy-targets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            loggingConfigId: selectedConfigId,
            year,
            monthlyTargets,
          }),
        });

        if (!targetResponse.ok) {
          const errorPayload = await targetResponse.json().catch(() => null);
          throw new Error(errorPayload?.message || "Failed to save monthly targets");
        }
      }

      // Build config based on chart type
      const widgetConfig: any = {
        widgetTitle,
        loggingConfigId: selectedConfigId,
        configNames: selectedLoggingConfig ? [selectedLoggingConfig.customName] : [],
        chartType,
        targetUnit:
          selectedLoggingConfig?.units ||
          initialConfig?.targetUnit ||
          "kWh",
        showProjections: initialConfig?.showProjections ?? true,
        showAchievements: initialConfig?.showAchievements ?? true,
      };

      if (chartType === "composed") {
        widgetConfig.year = year;
      } else {
        // Heatmap specific config
        widgetConfig.heatmapMonth = heatmapMonth;
        widgetConfig.heatmapYear = heatmapYear;
        widgetConfig.colorScheme = colorScheme;
        widgetConfig.activityLevelMode = activityLevelMode;
        if (activityLevelMode === "custom") {
          widgetConfig.customThresholds = customThresholds;
        }
      }

      // Save the widget configuration
      onSave(widgetConfig);

      showToast.success(
        isEditMode ? "Widget updated" : "Widget created",
        "Energy Target Chart configuration has been saved."
      );
      onClose();
    } catch (error: any) {
      showToast.error(
        "Error",
        error.message || "Failed to save widget configuration."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {chartType === "heatmap"
              ? isEditMode
                ? "Edit Activity Heatmap"
                : "Configure Activity Heatmap"
              : isEditMode
                ? "Edit Energy Target Chart"
                : "Configure Energy Target Chart"}
          </DialogTitle>
          <DialogDescription>
            {chartType === "heatmap"
              ? "Select a data source and customize your daily activity heatmap visualization."
              : "Select a data source and set the energy targets for each month of the year."}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="widgetTitle">Widget Title</Label>
              <Input
                id="widgetTitle"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Building A Energy Monitor"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="logConfig">Log Configuration</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={setSelectedConfigId}
                  value={selectedConfigId || ""}
                >
                  <SelectTrigger id="logConfig">
                    <SelectValue placeholder="Select a log source" />
                  </SelectTrigger>
                  <SelectContent>
                    {loggingConfigs.map((cfg) => (
                      <SelectItem key={cfg.id} value={cfg.id}>
                        {cfg.customName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Chart Type Selection */}
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label className="text-base font-semibold">Chart Type</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Choose how you want to visualize your energy data
              </p>
            </div>

            <RadioGroup value={chartType} onValueChange={(val) => setChartType(val as "composed" | "heatmap")}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    chartType === "composed"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="composed" id="composed" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">Monthly Target (Bar + Line)</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Compare actual vs target consumption per month
                    </div>
                  </div>
                </label>

                <label
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    chartType === "heatmap"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <RadioGroupItem value="heatmap" id="heatmap" className="mt-1" />
                  <div className="flex-1">
                    <div className="font-medium">Daily Activity (Heatmap)</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Visual pattern of daily consumption over a month
                    </div>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>

          {/* Conditional Configuration based on Chart Type */}
          {chartType === "composed" ? (
            // Composed Chart Configuration
            <div className="space-y-4 pt-4 border-t">
              <div className="grid gap-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  min="2000"
                  max="2100"
                />
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Shows monthly target vs actual consumption for the year
                </p>
              </div>
            </div>
          ) : (
            // Heatmap Configuration
            <div className="space-y-6 pt-4 border-t">
              {/* Month Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Select Month</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center font-medium text-lg">
                    {getMonthDisplay()}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => navigateMonth("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setToCurrentMonth}
                    className="flex-1"
                  >
                    This Month
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={setToLastMonth}
                    className="flex-1"
                  >
                    Last Month
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Shows daily consumption pattern for the selected month
                </p>
              </div>

              {/* Color Scheme Selector */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Color Scheme</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Object.entries(colorSchemes).map(([key, scheme]) => (
                    <label
                      key={key}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        colorScheme === key
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="colorScheme"
                          value={key}
                          checked={colorScheme === key}
                          onChange={(e) => setColorScheme(e.target.value)}
                          className="sr-only"
                        />
                        <span className="font-medium text-sm">{scheme.name}</span>
                        {colorScheme === key && (
                          <span className="text-xs text-primary">(Selected)</span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        {scheme.light.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-sm border border-border"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  Choose colors that match your dashboard theme
                </p>
              </div>

              {/* Activity Level Mode */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Activity Levels</Label>
                <RadioGroup value={activityLevelMode} onValueChange={(val) => setActivityLevelMode(val as "auto" | "custom")}>
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      activityLevelMode === "auto"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="auto" id="auto" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Auto (Recommended)</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Automatically adjusts based on your data distribution
                      </div>
                    </div>
                  </label>
                  <label
                    className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      activityLevelMode === "custom"
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value="custom" id="custom" className="mt-1" />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Custom Thresholds</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Set your own ranges for activity levels
                      </div>
                    </div>
                  </label>
                </RadioGroup>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  How to categorize daily usage: 0 = No activity, 1-4 = Low to very high
                </p>

                {/* Custom Thresholds Input (only show if custom mode) */}
                {activityLevelMode === "custom" && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Info className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Set Custom Thresholds (kWh)</p>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="level1" className="text-xs font-medium">
                          Level 1 (Low) - Range: 0.01 to:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="level1"
                            type="number"
                            value={customThresholds.level1}
                            onChange={(e) =>
                              setCustomThresholds((prev) => ({
                                ...prev,
                                level1: Number(e.target.value),
                              }))
                            }
                            min="0"
                            step="0.1"
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground w-8">kWh</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="level2" className="text-xs font-medium">
                          Level 2 (Medium) - Range: {customThresholds.level1.toFixed(1)} to:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="level2"
                            type="number"
                            value={customThresholds.level2}
                            onChange={(e) =>
                              setCustomThresholds((prev) => ({
                                ...prev,
                                level2: Number(e.target.value),
                              }))
                            }
                            min={customThresholds.level1}
                            step="0.1"
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground w-8">kWh</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="level3" className="text-xs font-medium">
                          Level 3 (High) - Range: {customThresholds.level2.toFixed(1)} to:
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            id="level3"
                            type="number"
                            value={customThresholds.level3}
                            onChange={(e) =>
                              setCustomThresholds((prev) => ({
                                ...prev,
                                level3: Number(e.target.value),
                              }))
                            }
                            min={customThresholds.level2}
                            step="0.1"
                            className="h-9"
                          />
                          <span className="text-xs text-muted-foreground w-8">kWh</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="level4-info" className="text-xs font-medium text-muted-foreground">
                          Level 4 (Very High) - Range: Above {customThresholds.level3.toFixed(1)} kWh
                        </Label>
                        <div className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700">
                          ℹ️ Level 4 applies to all values above Level 3 threshold
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
                      <strong>Example with current values:</strong><br/>
                      • Level 0: 0 kWh (No activity)<br/>
                      • Level 1: 0.01 - {customThresholds.level1} kWh (Low)<br/>
                      • Level 2: {customThresholds.level1.toFixed(1)} - {customThresholds.level2} kWh (Medium)<br/>
                      • Level 3: {customThresholds.level2.toFixed(1)} - {customThresholds.level3} kWh (High)<br/>
                      • Level 4: Above {customThresholds.level3} kWh (Very High)
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly Targets (only for composed chart) */}
          {selectedConfigId && chartType === "composed" && (
            <div className="space-y-4 pt-4 border-t">
              <div>
                <Label className="text-base font-semibold">
                  Monthly Targets (kWh)
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Set energy consumption targets for each month
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {monthLabels.map((month) => (
                  <div key={month} className="grid gap-1.5">
                    <Label htmlFor={`target-${month}`} className="text-sm">
                      {month}
                    </Label>
                    <Input
                      id={`target-${month}`}
                      type="number"
                      placeholder="0"
                      value={monthlyTargets[month.toLowerCase()] || ""}
                      onChange={(e) =>
                        handleTargetChange(month, e.target.value)
                      }
                      min="0"
                      step="0.1"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={
              isSaving || isLoading || !selectedConfigId || !widgetTitle
            }
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
