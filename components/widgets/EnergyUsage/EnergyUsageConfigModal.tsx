// File: components/widgets/EnergyUsage/EnergyUsageConfigModal.tsx
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
  units?: string | null;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  period: "last_month" | "current_month";
  title: string;
  initialConfig?: {
    widgetTitle: string;
    loggingConfigId: string;
    units?: string;
    multiply?: number;
    period: "last_month" | "current_month";
  }; // ✅ TAMBAH PROP BARU
}

export const EnergyUsageConfigModal = ({
  isOpen,
  onClose,
  onSave,
  period,
  title,
  initialConfig, // ✅ DESTRUCTURE PROP BARU
}: Props) => {
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // State untuk form
  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [units, setUnits] = useState("kWh");
  const [multiply, setMultiply] = useState("1");

  // ✅ TAMBAH STATE UNTUK TRACK EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);

  // ✅ EFFECT BARU: PRE-FILL DATA JIKA ADA initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigId(initialConfig.loggingConfigId || null);
      setUnits(initialConfig.units || "kWh");
      setMultiply(String(initialConfig.multiply || 1));
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset ke default values
      setWidgetTitle("");
      setSelectedConfigId(null);
      setUnits("kWh");
      setMultiply("1");
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/logging-configs?limit=1000`);
          if (!response.ok)
            throw new Error("Failed to fetch logging configurations");

          const responseData = await response.json();
          const configs = Array.isArray(responseData.data) ? responseData.data : [];
          setLoggingConfigs(configs);
        } catch (error: any) {
          console.error("Failed to fetch logging configurations:", error);
          setLoggingConfigs([]);
          showToast.error("Error", error.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedConfigId) return;

    const selectedConfig = loggingConfigs.find(
      (config) => config.id === selectedConfigId
    );

    if (selectedConfig?.units) {
      setUnits(selectedConfig.units);
    }
  }, [selectedConfigId, loggingConfigs]);

  const handleSave = () => {
    if (!widgetTitle || !selectedConfigId) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }
    onSave({
      widgetTitle,
      loggingConfigId: selectedConfigId,
      units,
      multiply: parseFloat(multiply) || 1,
      period, // Simpan periode yang sesuai
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {/* ✅ UBAH TITLE SESUAI MODE */}
            {isEditMode ? `Edit ${title}` : title}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your energy usage widget configuration."
              : "Select a pre-defined logging configuration to calculate energy usage."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Gedung A - Last Month"
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
            {/* ✅ UBAH TEXT BUTTON SESUAI MODE */}
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
