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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
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

export const ChartLineConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigNames, setSelectedConfigNames] = useState<string[]>([]);
  const [timeRange, setTimeRange] = useState("24h");
  const [showLegend, setShowLegend] = useState(true);
  const [dualAxis, setDualAxis] = useState(false);
  const [smoothLines, setSmoothLines] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigNames(initialConfig.configNames || []);
      setTimeRange(initialConfig.timeRange || "24h");
      setShowLegend(initialConfig.showLegend !== false);
      setDualAxis(initialConfig.dualAxis || false);
      setSmoothLines(initialConfig.smoothLines !== false);
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigNames([]);
      setTimeRange("24h");
      setShowLegend(true);
      setDualAxis(false);
      setSmoothLines(true);
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

  const handleAddConfig = (configName: string) => {
    if (
      !selectedConfigNames.includes(configName) &&
      selectedConfigNames.length < 5
    ) {
      setSelectedConfigNames([...selectedConfigNames, configName]);
    }
  };

  const handleRemoveConfig = (configName: string) => {
    setSelectedConfigNames(
      selectedConfigNames.filter((name) => name !== configName),
    );
  };

  const handleSave = () => {
    if (!widgetTitle || selectedConfigNames.length === 0) {
      showToast.warning(
        "Incomplete Configuration",
        "Widget Title and at least one Data Source are required.",
      );
      return;
    }

    if (selectedConfigNames.length > 5) {
      showToast.warning(
        "Too Many Data Sources",
        "Maximum 5 data sources allowed for optimal performance.",
      );
      return;
    }

    onSave({
      widgetTitle,
      configNames: selectedConfigNames,
      timeRange,
      showLegend,
      dualAxis,
      smoothLines,
    });
  };

  const availableConfigs = loggingConfigs.filter(
    (config) => !selectedConfigNames.includes(config.customName),
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Line Chart" : "Configure Line Chart"}
          </DialogTitle>
          <DialogDescription>
            Configure a multi-series line chart to compare trends across
            multiple data sources.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column: Data Configuration */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="widget-title">Widget Title *</Label>
              <Input
                id="widget-title"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Phase Voltage Analysis"
              />
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
              <Label htmlFor="add-data-source">Add Data Source</Label>
              <Select onValueChange={handleAddConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Select data source to add" />
                </SelectTrigger>
                <SelectContent>
                  {availableConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.customName}>
                      {cfg.customName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>
                Selected Data Sources ({selectedConfigNames.length}/5)
              </Label>
              <div className="min-h-[100px] max-h-[150px] border rounded-md p-2 space-y-2 overflow-y-auto">
                {selectedConfigNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data sources selected
                  </p>
                ) : (
                  selectedConfigNames.map((name, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="justify-between"
                    >
                      <span className="truncate mr-2">{name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => handleRemoveConfig(name)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Display Options */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-legend" className="text-sm">
                  Show Legend
                </Label>
                <Switch
                  id="show-legend"
                  checked={showLegend}
                  onCheckedChange={setShowLegend}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="dual-axis" className="text-sm">
                  Dual Y-Axis
                </Label>
                <Switch
                  id="dual-axis"
                  checked={dualAxis}
                  onCheckedChange={setDualAxis}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="smooth-lines" className="text-sm">
                  Smooth Lines
                </Label>
                <Switch
                  id="smooth-lines"
                  checked={smoothLines}
                  onCheckedChange={setSmoothLines}
                />
              </div>
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-3">
                Configuration Summary
              </h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  <strong>Title:</strong> {widgetTitle || "Not set"}
                </div>
                <div>
                  <strong>Data Sources:</strong> {selectedConfigNames.length}
                </div>
                <div>
                  <strong>Time Range:</strong> {timeRange}
                </div>
                <div>
                  <strong>Legend:</strong> {showLegend ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Dual Axis:</strong> {dualAxis ? "Yes" : "No"}
                </div>
                <div>
                  <strong>Smooth Lines:</strong> {smoothLines ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                <strong>Tip:</strong> Select 2-4 data sources for optimal chart
                readability. Too many series may make the chart difficult to
                interpret.
              </p>
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
