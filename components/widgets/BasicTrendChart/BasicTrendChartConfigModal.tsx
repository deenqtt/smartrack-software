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
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/lib/toast-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoggingConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const BasicTrendChartConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigName, setSelectedConfigName] = useState<string>("");
  const [timeRange, setTimeRange] = useState("24h");
  const [showKPIs, setShowKPIs] = useState(true);
  const [showTrend, setShowTrend] = useState(true);
  const [chartColor, setChartColor] = useState("#2563eb");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigName(initialConfig.configName || "");
      setTimeRange(initialConfig.timeRange || "24h");
      setShowKPIs(initialConfig.showKPIs !== false);
      setShowTrend(initialConfig.showTrend !== false);
      setChartColor(initialConfig.chartColor || "#2563eb");
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigName("");
      setTimeRange("24h");
      setShowKPIs(true);
      setShowTrend(true);
      setChartColor("#2563eb");
    }

    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          if (!response.ok)
            throw new Error("Failed to fetch logging configurations");

          const responseData = await response.json();
          const configsArray = Array.isArray(responseData.data)
            ? responseData.data
            : [];
          setLoggingConfigs(configsArray);
        } catch (error: any) {
          console.error("Failed to fetch logging configs:", error);
          showToast.error("Error", error.message);
          setLoggingConfigs([]);
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, onClose, initialConfig]);

  const handleSave = () => {
    if (!widgetTitle || !selectedConfigName) {
      showToast.warning(
        "Incomplete Configuration",
        "Widget Title and Data Source are required.",
      );
      return;
    }

    onSave({
      widgetTitle,
      configName: selectedConfigName,
      timeRange,
      showKPIs,
      showTrend,
      chartColor,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Simple Trend Chart"
              : "Configure Simple Trend Chart"}
          </DialogTitle>
          <DialogDescription>
            Configure a simple trend chart to display KPI metrics and trend
            analysis for a single data source.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {/* Left Column: Data Configuration */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="widget-title">Widget Title *</Label>
              <Input
                id="widget-title"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Active Energy Import Trend"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="data-source">Data Source *</Label>
              <Select
                onValueChange={setSelectedConfigName}
                value={selectedConfigName}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select data source" />
                </SelectTrigger>
                <SelectContent>
                  {loggingConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.customName}>
                      {cfg.customName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="time-range">Time Range</Label>
              <Select onValueChange={setTimeRange} value={timeRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="12h">Last 12 Hours</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="chart-color">Chart Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="chart-color"
                  type="color"
                  value={chartColor}
                  onChange={(e) => setChartColor(e.target.value)}
                  className="w-16 h-10"
                />
                <span className="text-sm text-muted-foreground">
                  {chartColor}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Display Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-kpis" className="text-sm">
                  Show KPI Metrics
                </Label>
                <Switch
                  id="show-kpis"
                  checked={showKPIs}
                  onCheckedChange={setShowKPIs}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-trend" className="text-sm">
                  Show Trend Indicators
                </Label>
                <Switch
                  id="show-trend"
                  checked={showTrend}
                  onCheckedChange={setShowTrend}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Preview</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>Title: {widgetTitle || "Widget Title"}</div>
                <div>Data: {selectedConfigName || "Select data source"}</div>
                <div>Range: {timeRange}</div>
                <div className="flex items-center gap-2 mt-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: chartColor }}
                  />
                  <span>Chart Color</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
