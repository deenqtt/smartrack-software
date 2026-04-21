// File: components/widgets/EnergyTargetGap/EnergyTargetGapConfigModal.tsx
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
import { Skeleton } from "@/components/ui/skeleton";
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
  initialConfig?: {
    widgetTitle: string;
    loggingConfigId: string;
    targetValue: number;
    units?: string;
    multiply?: number;
  };
}

export const EnergyTargetGapConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [targetValue, setTargetValue] = useState("1000");
  const [units, setUnits] = useState("kWh");
  const [multiply, setMultiply] = useState("1");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigId(initialConfig.loggingConfigId || null);
      setTargetValue(String(initialConfig.targetValue || 1000));
      setUnits(initialConfig.units || "kWh");
      setMultiply(String(initialConfig.multiply || 1));
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setSelectedConfigId(null);
      setTargetValue("1000");
      setUnits("kWh");
      setMultiply("1");
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs`);
          if (!response.ok)
            throw new Error("Failed to fetch logging configurations");
          setLoggingConfigs(await response.json());
        } catch (error: any) {
          showToast.error("Error", error.message);
          onClose();
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen, onClose]);

  const handleSave = () => {
    if (!widgetTitle || !selectedConfigId || !targetValue) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }
    onSave({
      widgetTitle,
      loggingConfigId: selectedConfigId,
      targetValue: parseFloat(targetValue) || 0,
      units,
      multiply: parseFloat(multiply) || 1,
      period: "current_month", // Widget ini default ke bulan berjalan
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Energy Target Gap"
              : "Configure Energy Target Gap"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your energy target gap widget configuration."
              : "Set a target and track energy usage against it for the current month."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Gedung A Target"
            />
          </div>
          <div className="grid gap-2">
            <Label>Log Configuration</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={setSelectedConfigId}
                value={selectedConfigId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a log to track" />
                </SelectTrigger>
                <SelectContent>
                  {loggingConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id}>
                      {cfg.customName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetValue">Target Value</Label>
            <Input
              id="targetValue"
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder="e.g., 5000"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kWh"
              />
            </div>
            <div className="grid gap-2">
              <Label>Multiplier</Label>
              <Input
                type="number"
                value={multiply}
                onChange={(e) => setMultiply(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
