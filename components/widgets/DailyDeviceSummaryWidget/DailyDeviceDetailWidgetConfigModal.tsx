"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";

interface DailyDeviceDetailWidgetConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export function DailyDeviceDetailWidgetConfigModal({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: DailyDeviceDetailWidgetConfigModalProps) {
  const [title, setTitle] = useState("Daily Device Detail");
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableDevices, setAvailableDevices] = useState<Array<{id: string, name: string}>>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Load initial config and available options
  useEffect(() => {
    if (initialConfig) {
      setTitle(initialConfig.title || "Daily Device Detail");
      setSelectedDeviceId(initialConfig.deviceId || "");
      if (initialConfig.defaultDate) {
        setSelectedDate(new Date(initialConfig.defaultDate));
      }
    } else {
      // Default to yesterday for new widgets
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setSelectedDate(yesterday);
    }

    // Load available devices and dates
    loadAvailableDevices();
    loadAvailableDates();
  }, [initialConfig, isOpen]);

  const loadAvailableDevices = async () => {
    try {
      const response = await fetch('/api/widgets/daily-device-summary?action=devices');
      const result = await response.json();

      if (result.success && result.data) {
        setAvailableDevices(result.data);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const response = await fetch('/api/widgets/daily-device-summary?action=dates');
      const result = await response.json();

      if (result.success && result.data) {
        const dates = result.data.map((dateStr: string) => new Date(dateStr + 'T00:00:00'));
        setAvailableDates(dates);
      }
    } catch (error) {
      console.error('Failed to load dates:', error);
    }
  };

  const handleSave = () => {
    const config = {
      title: title.trim() || "Daily Device Detail",
      deviceId: selectedDeviceId,
      defaultDate: selectedDate?.toISOString().split('T')[0],
    };

    onSave(config);
  };

  const handleClose = () => {
    setTitle("Daily Device Detail");
    setSelectedDeviceId("");
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(yesterday);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Configure Daily Device Detail Widget</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Widget Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter widget title"
            />
          </div>

          {/* Device Selection */}
          <div className="grid gap-2">
            <Label>Default Device</Label>
            <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(availableDevices) && availableDevices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This device will be selected by default when the widget loads.
            </p>
          </div>

          {/* Default Date Selection */}
          <div className="grid gap-2">
            <Label>Default Date</Label>
            <Select
              value={selectedDate ? selectedDate.toISOString().split('T')[0] : ""}
              onValueChange={(dateStr) => setSelectedDate(new Date(dateStr + 'T00:00:00'))}
            >
              <SelectTrigger>
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Select date" />
              </SelectTrigger>
              <SelectContent>
                {availableDates.map(date => (
                  <SelectItem key={date.toISOString()} value={date.toISOString().split('T')[0]}>
                    {format(date, "MMM dd, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              This date will be selected by default when the widget loads.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !selectedDeviceId}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}