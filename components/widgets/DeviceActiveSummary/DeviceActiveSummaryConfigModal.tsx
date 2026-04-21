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
import { Server, RefreshCw, BarChart3, FileText, CheckCircle, XCircle, Activity } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    customName: string;
    refreshInterval: number;
    showDetails: boolean;
    showProgressBars: boolean;
  };
}

export const DeviceActiveSummaryConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Form states
  const [customName, setCustomName] = useState("Device Active Summary");
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [showDetails, setShowDetails] = useState(false);
  const [showProgressBars, setShowProgressBars] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);

  // Pre-fill data for edit mode
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "Device Active Summary");
      setRefreshInterval(initialConfig.refreshInterval || 30);
      setShowDetails(initialConfig.showDetails || false);
      setShowProgressBars(initialConfig.showProgressBars !== false);
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset for create mode
      setCustomName("Device Active Summary");
      setRefreshInterval(30);
      setShowDetails(false);
      setShowProgressBars(true);
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    if (!customName.trim()) {
      showToast.error("Please enter a widget name.");
      return;
    }

    const config = {
      customName: customName.trim(),
      refreshInterval: 0, // Always disabled
      showDetails,
      showProgressBars,
    };

    onSave(config);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            {isEditMode ? "Edit Device Active Summary" : "Configure Device Active Summary"}
          </DialogTitle>
          <DialogDescription>
            Display real-time summary of total devices, active devices, and inactive devices from your device-external database.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Left Column - Basic Configuration */}
          <div className="space-y-4">
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="customName" className="text-sm font-medium">
                  Widget Name *
                </Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Device Status Overview"
                  className="w-full"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refreshInterval" className="text-sm font-medium">
                  Refresh Interval (seconds) - Disabled
                </Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  value={0}
                  disabled
                  className="w-full opacity-50 cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  Auto-refresh disabled. Use manual refresh button when needed.
                </p>
              </div>
            </div>

          {/* Widget Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Widget Description</Label>
            <p className="text-sm text-muted-foreground">
              Displays device activity summary in a clean 2x2 grid layout showing total devices,
              active devices, inactive devices, and device activity percentage.
            </p>
          </div>
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Live Preview</Label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="space-y-4">
                  {/* Header Preview */}
                  <div className="flex items-center justify-between pb-2 border-b">
                    <div className="flex items-center gap-2">
                      <Server className="w-4 h-4 text-blue-500" />
                      <span className="font-medium text-sm">
                        {customName || "Device Active Summary"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <RefreshCw className="w-3 h-3" />
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    </div>
                  </div>

                  {/* 2x2 Grid Preview */}
                  <div className="grid grid-cols-2 grid-rows-2 gap-3">
                    {/* Total Devices */}
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                      <Server className="w-6 h-6 text-blue-500 mb-1" />
                      <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">24</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Total</div>
                    </div>

                    {/* Active Devices */}
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                      <CheckCircle className="w-6 h-6 text-green-500 mb-1" />
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">18</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Active</div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">75% active</div>
                    </div>

                    {/* Inactive Devices */}
                    <div className="flex flex-col items-center justify-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                      <XCircle className="w-6 h-6 text-red-500 mb-1" />
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">6</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">Inactive</div>
                    </div>

                    {/* Active Percentage */}
                    <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border-2 border-green-200 dark:border-green-800">
                      <Activity className="w-6 h-6 text-green-600 dark:text-green-400 mb-1" />
                      <div className="text-3xl font-bold text-green-700 dark:text-green-300">75%</div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium">Activity</div>
                    </div>
                  </div>

                  {/* Progress Bars Preview */}
                  {showProgressBars && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Device Status Distribution
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Active</span>
                          <span>--%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full w-3/4"></div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Inactive</span>
                          <span>--%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                          <div className="bg-red-500 h-2 rounded-full w-1/4"></div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Details Preview */}
                  {showDetails && (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                        Inactive Device Breakdown
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded text-xs">
                          <div className="font-bold">--</div>
                          <div>Inactive</div>
                        </div>
                        <div className="text-center p-2 bg-red-100 dark:bg-red-900/50 rounded text-xs">
                          <div className="font-bold">--</div>
                          <div>Error</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Footer Preview */}
                  <div className="text-xs text-slate-500 dark:text-slate-400 text-center pt-2 border-t">
                    Last updated: --:--:-- | Manual refresh only
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
