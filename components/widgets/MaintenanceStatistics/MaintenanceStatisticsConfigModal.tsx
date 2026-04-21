// File: components/widgets/MaintenanceStatistics/MaintenanceStatisticsConfigModal.tsx
"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { BarChart } from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    timeRange: "7d" | "30d" | "90d" | "1y";
    showPercentages: boolean;
    includeOverdue: boolean;
    chartType: "bar" | "pie" | "line";
  };
}

export const MaintenanceStatisticsConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || "Maintenance Statistics"
  );
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">(
    initialConfig?.timeRange || "30d"
  );
  const [showPercentages, setShowPercentages] = useState(
    initialConfig?.showPercentages ?? true
  );
  const [includeOverdue, setIncludeOverdue] = useState(
    initialConfig?.includeOverdue ?? true
  );
  const [chartType, setChartType] = useState<"bar" | "pie" | "line">(
    initialConfig?.chartType || "bar"
  );

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setTimeRange(initialConfig.timeRange);
        setShowPercentages(initialConfig.showPercentages);
        setIncludeOverdue(initialConfig.includeOverdue);
        setChartType(initialConfig.chartType);
      } else {
        setWidgetTitle("Maintenance Statistics");
        setTimeRange("30d");
        setShowPercentages(true);
        setIncludeOverdue(true);
        setChartType("bar");
      }
    }
  }, [isOpen, initialConfig]);

  const validateForm = () => {
    if (!widgetTitle.trim()) {
      showToast.warning("Validation Error", "Widget title is required.");
      return false;
    }
    return true;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const config = {
      widgetTitle: widgetTitle.trim(),
      timeRange,
      showPercentages,
      includeOverdue,
      chartType,
    };

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center">
            <BarChart className="h-5 w-5 mr-2" />
            Configure Maintenance Statistics Widget
          </DialogTitle>
          <DialogDescription>
            Configure how maintenance statistics are displayed in your dashboard
            widget.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Maintenance Performance Overview"
              maxLength={50}
            />
          </div>

          {/* Time Range */}
          <div className="grid gap-2">
            <Label htmlFor="timeRange">Time Range</Label>
            <Select
              value={timeRange}
              onValueChange={(value: "7d" | "30d" | "90d" | "1y") =>
                setTimeRange(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last 1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Chart Type */}
          <div className="grid gap-2">
            <Label htmlFor="chartType">Chart Type</Label>
            <Select
              value={chartType}
              onValueChange={(value: "bar" | "pie" | "line") =>
                setChartType(value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bar">Bar Chart</SelectItem>
                <SelectItem value="pie">Pie Chart</SelectItem>
                <SelectItem value="line">Line Chart</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display Options */}
          <div className="grid gap-3">
            <Label>Display Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showPercentages"
                checked={showPercentages}
                onCheckedChange={(checked) => setShowPercentages(!!checked)}
              />
              <Label
                htmlFor="showPercentages"
                className="cursor-pointer text-sm"
              >
                Show Percentages
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeOverdue"
                checked={includeOverdue}
                onCheckedChange={(checked) => setIncludeOverdue(!!checked)}
              />
              <Label
                htmlFor="includeOverdue"
                className="cursor-pointer text-sm"
              >
                Include Overdue Tasks
              </Label>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">
              Widget Preview Settings
            </h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>
                • <strong>Title:</strong> {widgetTitle}
              </p>
              <p>
                • <strong>Time Range:</strong> {timeRange}
              </p>
              <p>
                • <strong>Chart Type:</strong> {chartType}
              </p>
              <p>
                • <strong>Show Percentages:</strong>{" "}
                {showPercentages ? "Yes" : "No"}
              </p>
              <p>
                • <strong>Include Overdue:</strong>{" "}
                {includeOverdue ? "Yes" : "No"}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={!widgetTitle.trim()}
          >
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
