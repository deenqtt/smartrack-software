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
import { Slider } from "@/components/ui/slider";
import { showToast } from "@/lib/toast-utils";
import { HardDrive, Settings, Database, Activity } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const StorageCapacityConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // ===== FORM STATE =====
  const [config, setConfig] = useState({
    customName: "Storage Capacity",
    refreshInterval: 60,
    showDiskUsage: true,
    showDatabaseSize: true,
    showWalSize: false,
    alertThresholds: {
      diskUsage: 85,
      databaseSize: 10, // GB
    },
  });

  // ===== EDIT MODE HANDLING =====
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        customName: initialConfig.customName || "Storage Capacity",
        refreshInterval: initialConfig.refreshInterval || 60,
        showDiskUsage: initialConfig.showDiskUsage !== false,
        showDatabaseSize: initialConfig.showDatabaseSize !== false,
        showWalSize: initialConfig.showWalSize || false,
        alertThresholds: {
          diskUsage: initialConfig.alertThresholds?.diskUsage || 85,
          databaseSize: initialConfig.alertThresholds?.databaseSize || 10,
        },
      });
    } else if (isOpen) {
      // Reset for create mode
      setConfig({
        customName: "Storage Capacity",
        refreshInterval: 60,
        showDiskUsage: true,
        showDatabaseSize: true,
        showWalSize: false,
        alertThresholds: {
          diskUsage: 85,
          databaseSize: 10,
        },
      });
    }
  }, [isOpen, initialConfig]);

  // ===== VALIDATION & SAVE =====
  const handleSave = () => {
    if (!config.customName.trim()) {
      showToast.error("Please enter a widget name.");
      return;
    }

    if (config.refreshInterval < 30 || config.refreshInterval > 600) {
      showToast.error("Refresh interval must be between 30 and 600 seconds.");
      return;
    }

    if (config.alertThresholds.diskUsage < 50 || config.alertThresholds.diskUsage > 100) {
      showToast.error("Disk usage threshold must be between 50% and 100%.");
      return;
    }

    if (config.alertThresholds.databaseSize < 1 || config.alertThresholds.databaseSize > 1000) {
      showToast.error("Database size threshold must be between 1GB and 1000GB.");
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
            <HardDrive className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} Storage Capacity Widget
          </DialogTitle>
          <DialogDescription>
            Configure your storage capacity monitoring widget with donut charts and alert thresholds.
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
                      placeholder="e.g., Storage Monitor, Disk Usage"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="30"
                      max="600"
                      value={config.refreshInterval}
                      onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 60 })}
                    />
                    <p className="text-xs text-slate-500">How often to update storage metrics (30-600 seconds)</p>
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <HardDrive className="w-4 h-4" />
                  Display Options
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Disk Usage</Label>
                      <p className="text-sm text-slate-500">Display disk usage with donut chart</p>
                    </div>
                    <Switch
                      checked={config.showDiskUsage}
                      onCheckedChange={(checked) => setConfig({ ...config, showDiskUsage: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Database Size</Label>
                      <p className="text-sm text-slate-500">Display PostgreSQL database size</p>
                    </div>
                    <Switch
                      checked={config.showDatabaseSize}
                      onCheckedChange={(checked) => setConfig({ ...config, showDatabaseSize: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show WAL Size</Label>
                      <p className="text-sm text-slate-500">Display Write-Ahead Log size</p>
                    </div>
                    <Switch
                      checked={config.showWalSize}
                      onCheckedChange={(checked) => setConfig({ ...config, showWalSize: checked })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Alert Thresholds */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Activity className="w-4 h-4" />
                  Alert Thresholds
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Disk Usage Alert (%)</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.diskUsage}%</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.diskUsage]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, diskUsage: value[0] }
                      })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">Alert when disk usage exceeds this percentage</p>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Database Size Alert (GB)</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.databaseSize}GB</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.databaseSize]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, databaseSize: value[0] }
                      })}
                      max={1000}
                      min={1}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">Alert when database size exceeds this amount</p>
                  </div>
                </div>
              </div>

              {/* Storage Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2 text-blue-900 dark:text-blue-100">Storage Information:</h4>
                <div className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <div><strong>Disk Usage:</strong> Shows filesystem utilization with visual donut chart</div>
                  <div><strong>Database Size:</strong> Actual PostgreSQL data size</div>
                  <div><strong>WAL Size:</strong> Write-Ahead Log size (transaction logs)</div>
                  <div><strong>Alerts:</strong> Configurable thresholds for disk and database monitoring</div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Widget Preview</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <div><strong>Name:</strong> {config.customName}</div>
                  <div><strong>Refresh:</strong> {config.refreshInterval}s</div>
                  <div><strong>Shows:</strong> {
                    [
                      config.showDiskUsage && "Disk Usage",
                      config.showDatabaseSize && "Database Size",
                      config.showWalSize && "WAL Size"
                    ].filter(Boolean).join(", ") || "None"
                  }</div>
                  <div><strong>Alerts:</strong> Disk &gt; {config.alertThresholds.diskUsage}%, DB &gt; {config.alertThresholds.databaseSize}GB</div>
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
            <HardDrive className="w-4 h-4" />
            {initialConfig ? "Update" : "Create"} Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
