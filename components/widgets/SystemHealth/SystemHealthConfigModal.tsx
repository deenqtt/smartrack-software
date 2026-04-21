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
import { Shield, Settings, Cpu, Server, Zap } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const SystemHealthConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // ===== FORM STATE =====
  const [config, setConfig] = useState({
    customName: "System Health",
    refreshInterval: 30,
    showSystemMetrics: true,
    showDockerStats: true,
    showServicesStatus: true,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90,
    },
  });

  // ===== EDIT MODE HANDLING =====
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        customName: initialConfig.customName || "System Health",
        refreshInterval: initialConfig.refreshInterval || 30,
        showSystemMetrics: initialConfig.showSystemMetrics !== false,
        showDockerStats: initialConfig.showDockerStats !== false,
        showServicesStatus: initialConfig.showServicesStatus !== false,
        alertThresholds: {
          cpu: initialConfig.alertThresholds?.cpu || 80,
          memory: initialConfig.alertThresholds?.memory || 85,
          disk: initialConfig.alertThresholds?.disk || 90,
        },
      });
    } else if (isOpen) {
      // Reset for create mode
      setConfig({
        customName: "System Health",
        refreshInterval: 30,
        showSystemMetrics: true,
        showDockerStats: true,
        showServicesStatus: true,
        alertThresholds: {
          cpu: 80,
          memory: 85,
          disk: 90,
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

    if (config.alertThresholds.cpu < 50 || config.alertThresholds.cpu > 100) {
      showToast.error("CPU threshold must be between 50% and 100%.");
      return;
    }

    if (config.alertThresholds.memory < 50 || config.alertThresholds.memory > 100) {
      showToast.error("Memory threshold must be between 50% and 100%.");
      return;
    }

    if (config.alertThresholds.disk < 50 || config.alertThresholds.disk > 100) {
      showToast.error("Disk threshold must be between 50% and 100%.");
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
            <Shield className="w-5 h-5" />
            {initialConfig ? "Edit" : "Configure"} System Health Widget
          </DialogTitle>
          <DialogDescription>
            Configure your system health monitoring widget with custom thresholds and display options.
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
                      placeholder="e.g., System Health, Server Status"
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
                    <p className="text-xs text-slate-500">How often to update metrics (10-300 seconds)</p>
                  </div>
                </div>
              </div>

              {/* Display Options */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                  <Shield className="w-4 h-4" />
                  Display Options
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show System Metrics</Label>
                      <p className="text-sm text-slate-500">Display CPU and memory usage</p>
                    </div>
                    <Switch
                      checked={config.showSystemMetrics}
                      onCheckedChange={(checked) => setConfig({ ...config, showSystemMetrics: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Docker Stats</Label>
                      <p className="text-sm text-slate-500">Display container information</p>
                    </div>
                    <Switch
                      checked={config.showDockerStats}
                      onCheckedChange={(checked) => setConfig({ ...config, showDockerStats: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Show Services Status</Label>
                      <p className="text-sm text-slate-500">Display service health indicators</p>
                    </div>
                    <Switch
                      checked={config.showServicesStatus}
                      onCheckedChange={(checked) => setConfig({ ...config, showServicesStatus: checked })}
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
                  <Cpu className="w-4 h-4" />
                  Alert Thresholds (%)
                </div>

                <div className="space-y-4">
                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>CPU Usage Alert</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.cpu}%</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.cpu]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, cpu: value[0] }
                      })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Memory Usage Alert</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.memory}%</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.memory]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, memory: value[0] }
                      })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                  </div>

                  <div className="grid gap-2">
                    <div className="flex justify-between items-center">
                      <Label>Disk Usage Alert</Label>
                      <span className="text-sm font-medium">{config.alertThresholds.disk}%</span>
                    </div>
                    <Slider
                      value={[config.alertThresholds.disk]}
                      onValueChange={(value) => setConfig({
                        ...config,
                        alertThresholds: { ...config.alertThresholds, disk: value[0] }
                      })}
                      max={100}
                      min={50}
                      step={5}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                <h4 className="font-medium text-sm mb-2">Widget Preview</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  <div><strong>Name:</strong> {config.customName}</div>
                  <div><strong>Refresh:</strong> {config.refreshInterval}s</div>
                  <div><strong>Monitors:</strong> {
                    [
                      config.showSystemMetrics && "System",
                      config.showDockerStats && "Docker",
                      config.showServicesStatus && "Services"
                    ].filter(Boolean).join(", ") || "None"
                  }</div>
                  <div><strong>Alerts:</strong> CPU &gt; {config.alertThresholds.cpu}%, Memory &gt; {config.alertThresholds.memory}%, Disk &gt; {config.alertThresholds.disk}%</div>
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
            <Shield className="w-4 h-4" />
            {initialConfig ? "Update" : "Create"} Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
