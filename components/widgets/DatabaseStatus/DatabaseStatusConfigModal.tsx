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
import { Database, Settings, Activity, HardDrive } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const DatabaseStatusConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // ===== FORM STATE =====
  const [config, setConfig] = useState({
    customName: "Database Status",
    refreshInterval: 30,
    showConnectionDetails: true,
    showPerformanceMetrics: true,
    showStorageInfo: false,
    alertThresholds: {
      maxConnections: 20,
      slowQueries: 5,
    },
  });

  // ===== EDIT MODE HANDLING =====
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        customName: initialConfig.customName || "Database Status",
        refreshInterval: initialConfig.refreshInterval || 30,
        showConnectionDetails: initialConfig.showConnectionDetails !== false,
        showPerformanceMetrics: initialConfig.showPerformanceMetrics !== false,
        showStorageInfo: initialConfig.showStorageInfo || false,
        alertThresholds: {
          maxConnections: initialConfig.alertThresholds?.maxConnections || 20,
          slowQueries: initialConfig.alertThresholds?.slowQueries || 5,
        },
      });
    } else if (isOpen) {
      // Reset for create mode
      setConfig({
        customName: "Database Status",
        refreshInterval: 30,
        showConnectionDetails: true,
        showPerformanceMetrics: true,
        showStorageInfo: false,
        alertThresholds: {
          maxConnections: 20,
          slowQueries: 5,
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

    if (config.refreshInterval < 10 || config.refreshInterval > 300) {
      showToast.error("Refresh interval must be between 10 and 300 seconds.");
      return;
    }

    if (config.alertThresholds.maxConnections < 5 || config.alertThresholds.maxConnections > 100) {
      showToast.error("Max connections threshold must be between 5 and 100.");
      return;
    }

    if (config.alertThresholds.slowQueries < 0 || config.alertThresholds.slowQueries > 50) {
      showToast.error("Slow queries threshold must be between 0 and 50.");
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
            <Database className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} Database Status Widget
          </DialogTitle>
          <DialogDescription>
            Configure your database connection monitoring widget with custom thresholds and display options.
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
                      placeholder="e.g., Database Status, DB Monitor"
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
                    <p className="text-xs text-slate-500">How often to update database metrics (10-300 seconds)</p>
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Database className="w-4 h-4" />
                  Display Options
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Connection Details</Label>
                      <p className="text-sm text-slate-500">Display active/idle connection breakdown</p>
                    </div>
                    <Switch
                      checked={config.showConnectionDetails}
                      onCheckedChange={(checked) => setConfig({ ...config, showConnectionDetails: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Performance Metrics</Label>
                      <p className="text-sm text-slate-500">Display QPS and cache hit ratio</p>
                    </div>
                    <Switch
                      checked={config.showPerformanceMetrics}
                      onCheckedChange={(checked) => setConfig({ ...config, showPerformanceMetrics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Storage Info</Label>
                      <p className="text-sm text-slate-500">Display database size information</p>
                    </div>
                    <Switch
                      checked={config.showStorageInfo}
                      onCheckedChange={(checked) => setConfig({ ...config, showStorageInfo: checked })}
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
                      <Label>Max Connections Alert</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.maxConnections}</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.maxConnections]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, maxConnections: value[0] }
                      })}
                      max={100}
                      min={5}
                      step={5}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">Alert when total connections exceed this number</p>
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Slow Queries Alert</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.slowQueries}</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.slowQueries]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, slowQueries: value[0] }
                      })}
                      max={50}
                      min={0}
                      step={1}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500">Alert when slow queries exceed this count</p>
                  </div>
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
                      config.showConnectionDetails && "Connections",
                      config.showPerformanceMetrics && "Performance",
                      config.showStorageInfo && "Storage"
                    ].filter(Boolean).join(", ") || "None"
                  }</div>
                  <div><strong>Alerts:</strong> Max {config.alertThresholds.maxConnections} connections, {config.alertThresholds.slowQueries} slow queries</div>
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
            <Database className="w-4 h-4" />
            {initialConfig ? "Update" : "Create"} Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
