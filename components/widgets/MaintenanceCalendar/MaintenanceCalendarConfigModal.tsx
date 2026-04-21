// File: components/widgets/MaintenanceCalendar/MaintenanceCalendarConfigModal.tsx
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
import { Calendar } from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    viewType: "month" | "week";
    showCompleted: boolean;
    highlightOverdue: boolean;
  };
}

export const MaintenanceCalendarConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || "Maintenance Calendar"
  );
  const [viewType, setViewType] = useState<"month" | "week">(
    initialConfig?.viewType || "month"
  );
  const [showCompleted, setShowCompleted] = useState(
    initialConfig?.showCompleted ?? false
  );
  const [highlightOverdue, setHighlightOverdue] = useState(
    initialConfig?.highlightOverdue ?? true
  );

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setViewType(initialConfig.viewType);
        setShowCompleted(initialConfig.showCompleted);
        setHighlightOverdue(initialConfig.highlightOverdue);
      } else {
        setWidgetTitle("Maintenance Calendar");
        setViewType("month");
        setShowCompleted(false);
        setHighlightOverdue(true);
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
      viewType,
      showCompleted,
      highlightOverdue,
    };

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Configure Maintenance Calendar Widget
          </DialogTitle>
          <DialogDescription>
            Configure how maintenance tasks are displayed in your calendar
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
              placeholder="e.g., Monthly Maintenance Schedule"
              maxLength={50}
            />
          </div>

          {/* View Type */}
          <div className="grid gap-2">
            <Label htmlFor="viewType">Default View</Label>
            <Select
              value={viewType}
              onValueChange={(value: "month" | "week") => setViewType(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Display Options */}
          <div className="grid gap-3">
            <Label>Display Options</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="showCompleted"
                checked={showCompleted}
                onCheckedChange={(checked: boolean) => setShowCompleted(!!checked)}
              />
              <Label htmlFor="showCompleted" className="cursor-pointer text-sm">
                Show Completed Tasks
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="highlightOverdue"
                checked={highlightOverdue}
                onCheckedChange={(checked: boolean) => setHighlightOverdue(!!checked)}
              />
              <Label
                htmlFor="highlightOverdue"
                className="cursor-pointer text-sm"
              >
                Highlight Overdue Tasks
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
                • <strong>Default View:</strong>{" "}
                {viewType === "month" ? "Month" : "Week"}
              </p>
              <p>
                • <strong>Show Completed:</strong>{" "}
                {showCompleted ? "Yes" : "No"}
              </p>
              <p>
                • <strong>Highlight Overdue:</strong>{" "}
                {highlightOverdue ? "Yes" : "No"}
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
