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
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/lib/toast-utils";
import { Container, Settings, Box, HardDrive } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const DockerStatusConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // ===== FORM STATE =====
  const [config, setConfig] = useState({
    customName: "Docker Status",
    refreshInterval: 30,
    showContainerDetails: true,
    showImageStats: true,
    showVolumeStats: false,
    compactView: false,
  });

  // ===== EDIT MODE HANDLING =====
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        customName: initialConfig.customName || "Docker Status",
        refreshInterval: initialConfig.refreshInterval || 30,
        showContainerDetails: initialConfig.showContainerDetails !== false,
        showImageStats: initialConfig.showImageStats !== false,
        showVolumeStats: initialConfig.showVolumeStats || false,
        compactView: initialConfig.compactView || false,
      });
    } else if (isOpen) {
      // Reset for create mode
      setConfig({
        customName: "Docker Status",
        refreshInterval: 30,
        showContainerDetails: true,
        showImageStats: true,
        showVolumeStats: false,
        compactView: false,
      });
    }
  }, [isOpen, initialConfig]);

  // ===== VALIDATION & SAVE =====
  const handleSave = () => {
    if (!config.customName.trim()) {
      showToast.error("Please enter a widget name.");
      return;
    }

    if (config.refreshInterval < 10 || config.refreshInterval > 300) {
      showToast.error("Refresh interval must be between 10 and 300 seconds.");
      return;
    }

    onSave(config);
  };

  // ===== RENDER =====
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Container className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} Docker Status Widget
          </DialogTitle>
          <DialogDescription>
            Configure your Docker container monitoring widget with display options and refresh settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Grid Layout - 2 columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Basic Settings */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Settings className="w-4 h-4" />
                  Basic Settings
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="customName">Widget Name *</Label>
                    <Input
                      id="customName"
                      value={config.customName}
                      onChange={(e) => setConfig({ ...config, customName: e.target.value })}
                      placeholder="e.g., Docker Status, Container Monitor"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="300"
                      value={config.refreshInterval}
                      onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 30 })}
                    />
                    <p className="text-xs text-slate-500">How often to update Docker metrics (10-300 seconds)</p>
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Container className="w-4 h-4" />
                  Display Options
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Compact View</Label>
                      <p className="text-sm text-slate-500">Show essential info only in 2x2 space</p>
                    </div>
                    <Switch
                      checked={config.compactView}
                      onCheckedChange={(checked) => setConfig({ ...config, compactView: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Container Details</Label>
                      <p className="text-sm text-slate-500">Display running/stopped container counts</p>
                    </div>
                    <Switch
                      checked={config.showContainerDetails}
                      onCheckedChange={(checked) => setConfig({ ...config, showContainerDetails: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Image Stats</Label>
                      <p className="text-sm text-slate-500">Display Docker image information</p>
                    </div>
                    <Switch
                      checked={config.showImageStats}
                      onCheckedChange={(checked) => setConfig({ ...config, showImageStats: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Volume Stats</Label>
                      <p className="text-sm text-slate-500">Display Docker volume information</p>
                    </div>
                    <Switch
                      checked={config.showVolumeStats}
                      onCheckedChange={(checked) => setConfig({ ...config, showVolumeStats: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Widget Preview</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <div><strong>Name:</strong> {config.customName}</div>
                  <div><strong>Refresh:</strong> {config.refreshInterval}s</div>
                  <div><strong>View:</strong> {config.compactView ? "Compact" : "Detailed"}</div>
                  <div><strong>Shows:</strong> {
                    [
                      config.showContainerDetails && "Containers",
                      config.showImageStats && "Images",
                      config.showVolumeStats && "Volumes"
                    ].filter(Boolean).join(", ") || "None"
                  }</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Container className="w-4 h-4" />
            {initialConfig ? "Update" : "Create"} Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
