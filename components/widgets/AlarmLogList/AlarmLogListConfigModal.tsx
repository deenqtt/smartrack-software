// File: components/widgets/AlarmLogList/AlarmLogListConfigModal.tsx
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
import { showToast } from "@/lib/toast-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    logLimit: number;
  };
}

export const AlarmLogListConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || "Alarm Log"
  );
  const [logLimit, setLogLimit] = useState(
    String(initialConfig?.logLimit) || "10"
  ); // Jumlah log yang ditampilkan

  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setLogLimit(String(initialConfig.logLimit));
      } else {
        setWidgetTitle("Alarm Log");
        setLogLimit("10");
      }
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    if (!widgetTitle) {
      showToast.error("Widget Title is required.");
      return;
    }
    onSave({
      widgetTitle,
      logLimit: parseInt(logLimit, 10) || 10,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Alarm Log List
          </DialogTitle>
          <DialogDescription>
            Set a title and the number of recent logs to display.
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
          <div className="grid gap-2">
            <Label>Number of Logs to Display</Label>
            <Select onValueChange={setLogLimit} value={logLimit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Logs</SelectItem>
                <SelectItem value="10">10 Logs</SelectItem>
                <SelectItem value="15">15 Logs</SelectItem>
                <SelectItem value="20">20 Logs</SelectItem>
              </SelectContent>
            </Select>
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
