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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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

export const BarChartConfigModal = ({
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
  const [mode, setMode] = useState<"single" | "stacked" | "grouped">("single");
  const [orientation, setOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [showValues, setShowValues] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [colorScheme, setColorScheme] = useState<"default" | "gradient" | "monochrome">("default");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigNames(initialConfig.configNames || []);
      setTimeRange(initialConfig.timeRange || "24h");
      setMode(initialConfig.mode || "single");
      setOrientation(initialConfig.orientation || "vertical");
      setShowValues(initialConfig.showValues !== false);
      setShowGrid(initialConfig.showGrid !== false);
      setColorScheme(initialConfig.colorScheme || "default");
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigNames([]);
      setTimeRange("24h");
      setMode("single");
      setOrientation("vertical");
      setShowValues(true);
      setShowGrid(true);
      setColorScheme("default");
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
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, onClose, initialConfig]);

  const handleAddConfig = (configName: string) => {
    if (!selectedConfigNames.includes(configName) && selectedConfigNames.length < 8) {
      setSelectedConfigNames([...selectedConfigNames, configName]);
    }
  };

  const handleRemoveConfig = (configName: string) => {
    setSelectedConfigNames(selectedConfigNames.filter(name => name !== configName));
  };

  const handleSave = () => {
    if (!widgetTitle || selectedConfigNames.length === 0) {
      showToast.warning(
        "Incomplete Configuration",
        "Widget Title and at least one Data Source are required."
      );
      return;
    }

    if (selectedConfigNames.length > 8) {
      showToast.warning(
        "Too Many Data Sources",
        "Maximum 8 data sources allowed for optimal performance."
      );
      return;
    }

    onSave({
      widgetTitle,
      configNames: selectedConfigNames,
      timeRange,
      mode,
      orientation,
      showValues,
      showGrid,
      colorScheme,
    });
  };

  const availableConfigs = loggingConfigs.filter(
    config => !selectedConfigNames.includes(config.customName)
  );

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case "single": return "Single bars for each data source";
      case "stacked": return "Bars stacked on top of each other";
      case "grouped": return "Bars grouped side by side";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto auto-hide-scrollbar">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl">
                {isEditMode ? "Edit Bar Chart" : "Configure Bar Chart"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Configure a bar chart to visualize data comparisons across multiple sources with various display options.
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
                    <div><strong>Data Sources:</strong> {selectedConfigNames.length}</div>
                    <div><strong>Time Range:</strong> {timeRange}</div>
                    <div><strong>Mode:</strong> {mode}</div>
                    <div><strong>Orientation:</strong> {orientation}</div>
                    <div><strong>Colors:</strong> {colorScheme}</div>
                    <div><strong>Values:</strong> {showValues ? "Shown" : "Hidden"}</div>
                    <div><strong>Grid:</strong> {showGrid ? "Shown" : "Hidden"}</div>
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
                placeholder="e.g., Power Metrics Overview"
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
              <Label>Selected Data Sources ({selectedConfigNames.length}/8)</Label>
              <div className="min-h-[120px] max-h-[180px] border rounded-md p-3 space-y-2 overflow-y-auto">
                {selectedConfigNames.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    No data sources selected
                  </p>
                ) : (
                  selectedConfigNames.map((name, index) => (
                    <Badge key={index} variant="secondary" className="justify-between">
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
            <div className="grid gap-2">
              <Label htmlFor="chart-mode">Chart Mode</Label>
              <Select onValueChange={(value: any) => setMode(value)} value={mode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single Bars</SelectItem>
                  <SelectItem value="stacked">Stacked Bars</SelectItem>
                  <SelectItem value="grouped">Grouped Bars</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{getModeDescription(mode)}</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="orientation">Orientation</Label>
              <Select onValueChange={(value: any) => setOrientation(value)} value={orientation}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">Vertical</SelectItem>
                  <SelectItem value="horizontal">Horizontal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color-scheme">Color Scheme</Label>
              <Select onValueChange={(value: any) => setColorScheme(value)} value={colorScheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default Colors</SelectItem>
                  <SelectItem value="gradient">Gradient</SelectItem>
                  <SelectItem value="monochrome">Monochrome</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="show-values" className="text-sm">
                  Show Values on Bars
                </Label>
                <Switch
                  id="show-values"
                  checked={showValues}
                  onCheckedChange={setShowValues}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show-grid" className="text-sm">
                  Show Grid Lines
                </Label>
                <Switch
                  id="show-grid"
                  checked={showGrid}
                  onCheckedChange={setShowGrid}
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
