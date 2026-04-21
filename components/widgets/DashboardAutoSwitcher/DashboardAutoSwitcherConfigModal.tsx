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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import {
  Monitor,
  Clock,
  RotateCcw,
  Play,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Dashboard {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    customName: string;
    dashboardIds: string[];
    intervalSeconds: number;
    isLooping: boolean;
    isAutoStart: boolean;
  };
}

export const DashboardAutoSwitcherConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Form states
  const [customName, setCustomName] = useState("Dashboard Auto Switcher");
  const [dashboardIds, setDashboardIds] = useState<string[]>([]);
  const [intervalSeconds, setIntervalSeconds] = useState(30);
  const [isLooping, setIsLooping] = useState(true);
  const [isAutoStart, setIsAutoStart] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Available dashboards
  const [availableDashboards, setAvailableDashboards] = useState<Dashboard[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available dashboards
  useEffect(() => {
    if (!isOpen) return;

    const fetchDashboards = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/dashboards`);
        if (!response.ok) throw new Error("Failed to fetch dashboards");
        const data = await response.json();
        setAvailableDashboards(data);
      } catch (error) {
        console.error("Error fetching dashboards:", error);
        showToast.error("Error", "Failed to load dashboards");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboards();
  }, [isOpen]);

  // Pre-fill data for edit mode
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "Dashboard Auto Switcher");
      setDashboardIds(initialConfig.dashboardIds || []);
      setIntervalSeconds(initialConfig.intervalSeconds || 30);
      setIsLooping(initialConfig.isLooping !== false);
      setIsAutoStart(initialConfig.isAutoStart || false);
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset for create mode
      setCustomName("Dashboard Auto Switcher");
      setDashboardIds([]);
      setIntervalSeconds(30);
      setIsLooping(true);
      setIsAutoStart(false);
    }
  }, [isOpen, initialConfig]);

  const handleDashboardToggle = (dashboardId: string, checked: boolean) => {
    if (checked) {
      setDashboardIds(prev => [...prev, dashboardId]);
    } else {
      setDashboardIds(prev => prev.filter(id => id !== dashboardId));
    }
  };

  const handleSelectAll = () => {
    setDashboardIds(availableDashboards.map(d => d.id));
  };

  const handleClearAll = () => {
    setDashboardIds([]);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newIds = [...dashboardIds];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    setDashboardIds(newIds);
  };

  const handleMoveDown = (index: number) => {
    if (index === dashboardIds.length - 1) return;
    const newIds = [...dashboardIds];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    setDashboardIds(newIds);
  };

  const handleSave = () => {
    if (!customName.trim()) {
      showToast.error("Please enter a widget name.");
      return;
    }

    if (dashboardIds.length === 0) {
      showToast.error("Please select at least one dashboard.");
      return;
    }

    if (intervalSeconds < 5 || intervalSeconds > 3600) {
      showToast.error("Interval must be between 5 and 3600 seconds.");
      return;
    }

    const config = {
      customName: customName.trim(),
      dashboardIds,
      intervalSeconds,
      isLooping,
      isAutoStart,
    };

    onSave(config);
  };

  const selectedDashboards = availableDashboards.filter(d =>
    dashboardIds.includes(d.id)
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Monitor className="w-5 h-5 text-blue-500" />
            {isEditMode ? "Edit Dashboard Auto Switcher" : "Configure Dashboard Auto Switcher"}
          </DialogTitle>
          <DialogDescription>
            Automatically cycle through multiple dashboards with customizable timing and behavior.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 h-full overflow-y-auto">
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
                    placeholder="e.g., Auto Dashboard Switcher"
                    className="w-full"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="intervalSeconds" className="text-sm font-medium">
                    Switch Interval (seconds)
                  </Label>
                  <Input
                    id="intervalSeconds"
                    type="number"
                    value={intervalSeconds}
                    onChange={(e) => setIntervalSeconds(parseInt(e.target.value) || 30)}
                    placeholder="30"
                    min="5"
                    max="3600"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    How long to display each dashboard (5-3600 seconds)
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isLooping"
                      checked={isLooping}
                      onCheckedChange={setIsLooping}
                    />
                    <Label htmlFor="isLooping" className="text-sm font-medium">
                      Loop continuously
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isLooping
                      ? "Will cycle through dashboards continuously"
                      : "Will stop after completing one full cycle"
                    }
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isAutoStart"
                      checked={isAutoStart}
                      onCheckedChange={setIsAutoStart}
                    />
                    <Label htmlFor="isAutoStart" className="text-sm font-medium">
                      Auto-start switching
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isAutoStart
                      ? "Will start switching automatically when widget loads"
                      : "Will start in paused mode, requiring manual play"
                    }
                  </p>
                </div>
              </div>

              {/* Widget Description */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Widget Description</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically switches between selected dashboards at specified intervals.
                  Perfect for digital signage, monitoring displays, or presentation cycles.
                </p>
              </div>
            </div>

            {/* Right Column - Dashboard Selection */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Select Dashboards ({dashboardIds.length} selected)
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      disabled={loading}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      disabled={loading}
                    >
                      Clear All
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-64 border rounded-md p-3">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-muted-foreground">Loading dashboards...</span>
                    </div>
                  ) : availableDashboards.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">No dashboards available</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableDashboards.map((dashboard) => {
                        const isSelected = dashboardIds.includes(dashboard.id);
                        const order = dashboardIds.indexOf(dashboard.id) + 1;

                        return (
                          <div
                            key={dashboard.id}
                            className="flex items-center space-x-3 p-2 rounded border hover:bg-muted/50"
                          >
                            <Checkbox
                              id={`dashboard-${dashboard.id}`}
                              checked={isSelected}
                              onCheckedChange={(checked) =>
                                handleDashboardToggle(dashboard.id, checked as boolean)
                              }
                            />

                            <div className="flex-1 min-w-0">
                              <Label
                                htmlFor={`dashboard-${dashboard.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {dashboard.name}
                              </Label>
                              {isSelected && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  #{order}
                                </Badge>
                              )}
                            </div>

                            {isSelected && dashboardIds.length > 1 && (
                              <div className="flex gap-1">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleMoveUp(dashboardIds.indexOf(dashboard.id))}
                                  disabled={order === 1}
                                >
                                  ↑
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => handleMoveDown(dashboardIds.indexOf(dashboard.id))}
                                  disabled={order === dashboardIds.length}
                                >
                                  ↓
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>

                {selectedDashboards.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Selected Order:</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedDashboards.map((dashboard, index) => (
                        <Badge key={dashboard.id} variant="outline" className="text-xs">
                          {index + 1}. {dashboard.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end border-t pt-4">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave} disabled={dashboardIds.length === 0}>
            <CheckCircle className="w-4 h-4 mr-2" />
            {isEditMode ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};