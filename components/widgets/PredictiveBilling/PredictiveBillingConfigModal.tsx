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

interface BillConfig {
  id: string;
  customName: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    billConfigId: string;
    showType: "today" | "monthly" | "all";
  };
}

export const PredictiveBillingConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [billConfigs, setBillConfigs] = useState<BillConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [widgetTitle, setWidgetTitle] = useState("");
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showType, setShowType] = useState<"today" | "monthly" | "all">("all");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setSelectedConfigId(initialConfig.billConfigId || null);
      setShowType(initialConfig.showType || "all");
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("Power & Cost Forecast");
      setSelectedConfigId(null);
      setShowType("all");
    }
  }, [isOpen, initialConfig]);

  useEffect(() => {
    if (isOpen) {
      const fetchConfigs = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/bill-configs`);
          if (!response.ok) throw new Error("Failed to fetch bill configurations");
          const data = await response.json();
          setBillConfigs(data);
        } catch (error: any) {
          showToast.error("Error", error.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchConfigs();
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!widgetTitle || !selectedConfigId) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }

    onSave({
      widgetTitle,
      billConfigId: selectedConfigId,
      showType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Prediction Widget" : "Add Prediction Widget"}</DialogTitle>
          <DialogDescription>
            Configure the AI prediction widget.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Widget Title</Label>
            <Input
              id="title"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="Power & Cost Forecast"
            />
          </div>
          <div className="grid gap-2">
            <Label>Bill Source</Label>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                onValueChange={setSelectedConfigId}
                value={selectedConfigId || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a bill config" />
                </SelectTrigger>
                <SelectContent>
                  {billConfigs.map((cfg) => (
                    <SelectItem key={cfg.id} value={cfg.id}>
                      {cfg.customName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Show Mode</Label>
            <Select
              onValueChange={(val: any) => setShowType(val)}
              value={showType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Display mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today's Forecast Only</SelectItem>
                <SelectItem value="monthly">Monthly Forecast Only</SelectItem>
                <SelectItem value="all">Show Both</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>{isEditMode ? "Update" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
