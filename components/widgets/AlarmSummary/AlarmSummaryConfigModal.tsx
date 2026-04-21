// File: components/widgets/AlarmSummary/AlarmSummaryConfigModal.tsx
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
import { showToast } from "@/lib/toast-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
  };
}

export const AlarmSummaryConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || "Active Alarms"
  );

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
      } else {
        setWidgetTitle("Active Alarms");
      }
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    if (!widgetTitle) {
      showToast.warning("Incomplete", "Widget Title is required.");
      return;
    }
    onSave({
      widgetTitle,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">Configure Alarm Summary</DialogTitle>
          <DialogDescription>
            Set a title for the alarm summary widget.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave} disabled={!widgetTitle}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
