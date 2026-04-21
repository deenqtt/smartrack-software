"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Box, Settings, Layout, Check } from "lucide-react";

interface SmartRack2DConfigData {
  rackType?: "MAIN" | "NORMAL";
  displayMode?: "single" | "multi";
  customName?: string;
  assignedCategory?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: SmartRack2DConfigData) => void;
  initialConfig?: SmartRack2DConfigData | null;
}

export const SmartRack2DConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [rackType, setRackType] = useState<"MAIN" | "NORMAL">(initialConfig?.rackType || "MAIN");
  const [displayMode, setDisplayMode] = useState<"single" | "multi">(initialConfig?.displayMode || "single");
  const [customName, setCustomName] = useState(initialConfig?.customName || "Smart Rack View");

  useEffect(() => {
    if (isOpen && initialConfig) {
      setRackType(initialConfig.rackType || "MAIN");
      setDisplayMode(initialConfig.displayMode || "single");
      setCustomName(initialConfig.customName || "Smart Rack View");
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    onSave({
      ...initialConfig,
      rackType,
      displayMode,
      customName,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl rounded-[2.5rem] overflow-hidden">
        <DialogHeader className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <Box className="h-5 w-5" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">Smart Rack 2D Settings</DialogTitle>
          </div>
          <DialogDescription className="font-medium">Configure how the smart rack is displayed in the dashboard.</DialogDescription>
        </DialogHeader>

        <div className="p-8 space-y-6">
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="custom-name" className="text-sm font-bold text-slate-700 dark:text-slate-300">Widget Title</Label>
              <Input 
                id="custom-name" 
                value={customName} 
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Main Server Rack"
                className="rounded-xl border-slate-200 dark:border-slate-800 h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Display Mode</Label>
                <Select value={displayMode} onValueChange={(v: "single" | "multi") => setDisplayMode(v)}>
                  <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="single">Single Rack</SelectItem>
                    <SelectItem value="multi">Multi Rack</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold text-slate-700 dark:text-slate-300">Rack Priority</Label>
                <Select value={rackType} onValueChange={(v: "MAIN" | "NORMAL") => setRackType(v)}>
                  <SelectTrigger className="rounded-xl h-11 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-slate-800">
                    <SelectItem value="MAIN">Main Rack</SelectItem>
                    <SelectItem value="NORMAL">Normal Racks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold">CANCEL</Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black shadow-lg shadow-blue-600/20">
            SAVE SETTINGS
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
