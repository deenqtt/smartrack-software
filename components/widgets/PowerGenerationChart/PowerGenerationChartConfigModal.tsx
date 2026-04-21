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

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Info } from "lucide-react";
import { showToast } from "@/lib/toast-utils";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface LoggingConfig {
  id: string;
  customName: string;
  key: string;
  units: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const PowerGenerationChartConfigModal = ({
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
  const [chartType, setChartType] = useState<"bar" | "pie" | "mixed">("bar");
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigNames(initialConfig.configNames || []);
      setChartType(initialConfig.chartType || "bar");
      setRefreshInterval(String(initialConfig.refreshInterval || 30));
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigNames([]);
      setChartType("bar");
      setRefreshInterval("30");
    }

    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          if (!response.ok)
            throw new Error("Failed to fetch logging configurations");

          const responseData = await response.json();
          const configsArray = Array.isArray(responseData.data) ? responseData.data : [];
          setLoggingConfigs(configsArray);
        } catch (error: any) {
          console.error("Failed to fetch logging configs:", error);
          showToast.error("Error", error.message);
          setLoggingConfigs([]);
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, initialConfig]);

  const handleAddConfig = (configName: string) => {
    if (!selectedConfigNames.includes(configName)) {
      setSelectedConfigNames([...selectedConfigNames, configName]);
    }
  };

  const handleRemoveConfig = (configName: string) => {
    setSelectedConfigNames(selectedConfigNames.filter(name => name !== configName));
  };

  const handleSave = () => {
    if (!widgetTitle) {
      showToast.warning(
        "Incomplete Configuration",
        "Widget Title is required."
      );
      return;
    }

    if (selectedConfigNames.length === 0) {
      showToast.warning(
        "Incomplete Configuration",
        "Please select at least one data source."
      );
      return;
    }

    onSave({
      widgetTitle,
      configNames: selectedConfigNames,
      chartType,
      refreshInterval: parseInt(refreshInterval, 10),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {isEditMode ? "Edit Power Generation Chart" : "Configure Power Generation Chart"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Configure power generation monitoring with real-time data visualization and customizable display options.
              </DialogDescription>
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 ml-4">
                  <Info className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium">Configuration Summary</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div><strong>Title:</strong> {widgetTitle || "Not set"}</div>
                    <div><strong>Data Sources:</strong> {selectedConfigNames.length} selected</div>
                    <div><strong>Chart Type:</strong> {chartType}</div>
                    <div><strong>Refresh:</strong> Every {refreshInterval}s</div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 p-6">
          {/* Data Sources Section */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="widget-title">Widget Title *</Label>
              <Input
                id="widget-title"
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Power Generation Overview"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="data-sources">Data Sources *</Label>
              <Select onValueChange={handleAddConfig} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoading ? "Loading configs..." : "Select data sources"} />
                </SelectTrigger>
                <SelectContent>
                  {loggingConfigs
                    .filter(config => !selectedConfigNames.includes(config.customName))
                    .map((config) => (
                      <SelectItem key={config.id} value={config.customName}>
                        {config.customName} ({config.units})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selected Configs */}
            {selectedConfigNames.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Selected Data Sources:</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedConfigNames.map((configName) => (
                    <Badge key={configName} variant="secondary" className="flex items-center gap-1">
                      {configName}
                      <button
                        onClick={() => handleRemoveConfig(configName)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Chart Configuration */}
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="chart-type">Chart Type</Label>
                <Select onValueChange={(value: any) => setChartType(value)} value={chartType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bar">Bar Chart</SelectItem>
                    <SelectItem value="pie">Pie Chart</SelectItem>
                    <SelectItem value="mixed">Mixed Chart</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refresh-interval">Refresh Interval</Label>
                <Select onValueChange={setRefreshInterval} value={refreshInterval}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">Every 10 seconds</SelectItem>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every minute</SelectItem>
                    <SelectItem value="300">Every 5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Right Column: Information */}
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="text-sm font-medium mb-2 text-blue-900 dark:text-blue-100">
                  Supported Generation Sources
                </h4>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <div>• Solar PV Panels</div>
                  <div>• Wind Turbines</div>
                  <div>• Battery Storage</div>
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
