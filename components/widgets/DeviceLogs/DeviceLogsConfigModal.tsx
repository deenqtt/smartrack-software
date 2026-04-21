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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/lib/toast-utils";
import { Check, ChevronsUpDown, X, Activity, MessageSquare, Wifi, AlertCircle, Database } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    customName: string;
    devices: string[];
    logTypes: string[];
    maxLogs: number;
    autoRefresh: boolean;
    refreshInterval: number;
    showPayload: boolean;
  };
}

export const DeviceLogsConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Form states
  const [customName, setCustomName] = useState("Device Logs");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedLogTypes, setSelectedLogTypes] = useState<string[]>([]);
  const [maxLogs, setMaxLogs] = useState(50);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [showPayload, setShowPayload] = useState(false);

  // UI states
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [logTypeSearchOpen, setLogTypeSearchOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Available log types
  const availableLogTypes = [
    { id: "mqtt_message", label: "MQTT Messages", icon: MessageSquare, description: "MQTT topic messages and payloads" },
    { id: "connection", label: "Connections", icon: Wifi, description: "Device connect/disconnect events" },
    { id: "status_change", label: "Status Changes", icon: Activity, description: "Device status updates" },
    { id: "error", label: "Errors", icon: AlertCircle, description: "Error events and failures" },
    { id: "data_update", label: "Data Updates", icon: Database, description: "Data processing and updates" },
  ];

  // Pre-fill data for edit mode
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "Device Logs");
      setSelectedDevices(initialConfig.devices || []);
      setSelectedLogTypes(initialConfig.logTypes || []);
      setMaxLogs(initialConfig.maxLogs || 50);
      setAutoRefresh(initialConfig.autoRefresh !== false);
      setRefreshInterval(initialConfig.refreshInterval || 30);
      setShowPayload(initialConfig.showPayload || false);
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset for create mode
      setCustomName("Device Logs");
      setSelectedDevices([]);
      setSelectedLogTypes([]);
      setMaxLogs(50);
      setAutoRefresh(true);
      setRefreshInterval(30);
      setShowPayload(false);
    }
  }, [isOpen, initialConfig]);

  // Fetch devices
  useEffect(() => {
    if (isOpen) {
      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
          if (!response.ok) throw new Error("Failed to fetch devices");
          setDevices(await response.json());
        } catch (error: any) {
          showToast.error("Failed to load devices: " + error.message);
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();
    }
  }, [isOpen, onClose]);

  // Device selection handlers
  const handleDeviceToggle = (deviceId: string) => {
    setSelectedDevices(prev =>
      prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleRemoveDevice = (deviceId: string) => {
    setSelectedDevices(prev => prev.filter(id => id !== deviceId));
  };

  const getSelectedDeviceNames = () => {
    return selectedDevices.map(id => {
      const device = devices.find(d => d.uniqId === id);
      return device ? device.name : id;
    });
  };

  // Log type selection handlers
  const handleLogTypeToggle = (logTypeId: string) => {
    setSelectedLogTypes(prev =>
      prev.includes(logTypeId)
        ? prev.filter(id => id !== logTypeId)
        : [...prev, logTypeId]
    );
  };

  const handleRemoveLogType = (logTypeId: string) => {
    setSelectedLogTypes(prev => prev.filter(id => id !== logTypeId));
  };

  const getSelectedLogTypeLabels = () => {
    return selectedLogTypes.map(id => {
      const logType = availableLogTypes.find(lt => lt.id === id);
      return logType ? logType.label : id;
    });
  };

  const getLogTypeIcon = (logTypeId: string, size: number = 16) => {
    const logType = availableLogTypes.find(lt => lt.id === logTypeId);
    if (!logType) return null;
    const IconComponent = logType.icon;
    return <IconComponent width={size} height={size} />;
  };

  const handleSave = () => {
    if (!customName || selectedDevices.length === 0) {
      showToast.error("Please fill in all required fields.");
      return;
    }

    const config = {
      customName,
      devices: selectedDevices,
      logTypes: selectedLogTypes.length > 0 ? selectedLogTypes : ["mqtt_message", "connection", "status_change"],
      maxLogs,
      autoRefresh,
      refreshInterval,
      showPayload,
    };

    onSave(config);
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            {isEditMode ? "Edit Device Logs" : "Configure Device Logs"}
          </DialogTitle>
          <DialogDescription>
            Monitor real-time device activity, MQTT messages, and system events across your IoT devices.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-6 p-6 max-h-[60vh] overflow-y-auto">
          {/* Basic Configuration */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="customName">Widget Name *</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Device Activity Monitor"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxLogs">Max Logs to Display</Label>
                <Select value={maxLogs.toString()} onValueChange={(value) => setMaxLogs(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25 logs</SelectItem>
                    <SelectItem value="50">50 logs</SelectItem>
                    <SelectItem value="100">100 logs</SelectItem>
                    <SelectItem value="200">200 logs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                  placeholder="30"
                  min="5"
                  max="300"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto Refresh</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically refresh logs at specified interval
                </div>
              </div>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Payload Data</Label>
                <div className="text-sm text-muted-foreground">
                  Display MQTT message payloads in log details
                </div>
              </div>
              <Switch
                checked={showPayload}
                onCheckedChange={setShowPayload}
              />
            </div>
          </div>

          {/* Device Selection */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Devices to Monitor * ({selectedDevices.length} selected)</Label>

              {/* Selected Devices Display */}
              {selectedDevices.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {getSelectedDeviceNames().map((name, index) => (
                    <Badge key={selectedDevices[index]} variant="secondary" className="flex items-center gap-1">
                      {name}
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveDevice(selectedDevices[index])}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              {isLoadingDevices ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="ml-2 text-sm">Loading devices...</span>
                </div>
              ) : (
                <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deviceSearchOpen}
                      className="w-full justify-between"
                    >
                      {selectedDevices.length > 0
                        ? `${selectedDevices.length} device${selectedDevices.length > 1 ? 's' : ''} selected`
                        : "Select devices to monitor..."
                      }
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search devices..."
                        value={deviceSearchQuery}
                        onValueChange={setDeviceSearchQuery}
                      />
                      <CommandEmpty>No devices found.</CommandEmpty>
                      <CommandList className="max-h-64">
                        <CommandGroup>
                          {filteredDevices.map((device) => {
                            const isSelected = selectedDevices.includes(device.uniqId);
                            return (
                              <CommandItem
                                key={device.uniqId}
                                onSelect={() => handleDeviceToggle(device.uniqId)}
                                className="cursor-pointer"
                              >
                                <Checkbox
                                  checked={isSelected}
                                  className="mr-2"
                                  onChange={() => {}}
                                />
                                <div className="flex-1">
                                  <span className="font-medium">{device.name}</span>
                                  <div className="text-xs text-muted-foreground">
                                    {device.topic}
                                  </div>
                                </div>
                                {isSelected && <Check className="ml-2 h-4 w-4" />}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Log Types to Monitor ({selectedLogTypes.length} selected)</Label>

              {/* Selected Log Types Display */}
              {selectedLogTypes.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  {getSelectedLogTypeLabels().map((label, index) => (
                    <Badge key={selectedLogTypes[index]} variant="secondary" className="flex items-center gap-1">
                      {getLogTypeIcon(selectedLogTypes[index], 12)}
                      <span className="ml-1">{label}</span>
                      <X
                        className="w-3 h-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleRemoveLogType(selectedLogTypes[index])}
                      />
                    </Badge>
                  ))}
                </div>
              )}

              <Popover open={logTypeSearchOpen} onOpenChange={setLogTypeSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={logTypeSearchOpen}
                    className="w-full justify-between"
                  >
                    {selectedLogTypes.length > 0
                      ? `${selectedLogTypes.length} log type${selectedLogTypes.length > 1 ? 's' : ''} selected`
                      : "Select log types (leave empty for all)..."
                    }
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandEmpty>No log types found.</CommandEmpty>
                    <CommandList className="max-h-64">
                      <CommandGroup>
                        {availableLogTypes.map((logType) => {
                          const isSelected = selectedLogTypes.includes(logType.id);
                          const IconComponent = logType.icon;
                          return (
                            <CommandItem
                              key={logType.id}
                              onSelect={() => handleLogTypeToggle(logType.id)}
                              className="cursor-pointer"
                            >
                              <Checkbox
                                checked={isSelected}
                                className="mr-2"
                                onChange={() => {}}
                              />
                              <div className="flex items-center gap-2 flex-1">
                                <IconComponent className="w-4 h-4" />
                                <div>
                                  <span className="font-medium">{logType.label}</span>
                                  <div className="text-xs text-muted-foreground">
                                    {logType.description}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check className="ml-2 h-4 w-4" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <p className="text-xs text-muted-foreground">
                Leave empty to monitor all log types. Select specific types to filter the logs displayed.
              </p>
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
