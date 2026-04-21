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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Info } from "lucide-react";
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

export const PowerAnalyzerChartConfigModal = ({
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
  const [showHarmonics, setShowHarmonics] = useState(true);
  const [showQualityMetrics, setShowQualityMetrics] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("30");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigNames(initialConfig.configNames || []);
      setShowHarmonics(initialConfig.showHarmonics !== false);
      setShowQualityMetrics(initialConfig.showQualityMetrics !== false);
      setRefreshInterval(String(initialConfig.refreshInterval || 30));
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigNames([]);
      setShowHarmonics(true);
      setShowQualityMetrics(true);
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
        "Maximum 5 data sources allowed for power analysis.",
      );
      return;
    }

    onSave({
      widgetTitle,
      configNames: selectedConfigNames,
      showHarmonics,
      showQualityMetrics,
      refreshInterval: parseInt(refreshInterval, 10),
    });
  };

  const availableConfigs = loggingConfigs.filter(
    (config) => !selectedConfigNames.includes(config.customName),
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {isEditMode
                  ? "Edit Power Analysis Chart"
                  : "Configure Power Analysis Chart"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Configure power quality analysis with harmonics detection and
                electrical parameter monitoring.
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
                    <div>
                      <strong>Title:</strong> {widgetTitle || "Not set"}
                    </div>
                    <div>
                      <strong>Data Sources:</strong>{" "}
                      {selectedConfigNames.length}
                    </div>
                    <div>
                      <strong>Harmonics:</strong>{" "}
                      {showHarmonics ? "Enabled" : "Disabled"}
                    </div>
                    <div>
                      <strong>Quality Metrics:</strong>{" "}
                      {showQualityMetrics ? "Enabled" : "Disabled"}
                    </div>
                    <div>
                      <strong>Refresh:</strong> Every {refreshInterval}s
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
                placeholder="e.g., Power Quality Analysis"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="add-data-source">Add Power Data Source</Label>
              <Select onValueChange={handleAddConfig}>
                <SelectTrigger>
                  <SelectValue placeholder="Select power data source" />
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
              <div className="min-h-[120px] max-h-[160px] border rounded-md p-3 space-y-2 overflow-y-auto">
                {selectedConfigNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
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

          {/* Right Column: Analysis Options */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="refresh-interval">Refresh Interval</Label>
              <Select
                onValueChange={setRefreshInterval}
                value={refreshInterval}
              >
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="show-harmonics" className="text-sm">
                    Show Harmonic Analysis
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Detect power quality distortions
                  </p>
                </div>
                <Switch
                  id="show-harmonics"
                  checked={showHarmonics}
                  onCheckedChange={setShowHarmonics}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="show-quality-metrics" className="text-sm">
                    Show Quality Metrics
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    THD, power factor, efficiency
                  </p>
                </div>
                <Switch
                  id="show-quality-metrics"
                  checked={showQualityMetrics}
                  onCheckedChange={setShowQualityMetrics}
                />
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
