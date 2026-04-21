"use client";

import React, { useState, useEffect, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Check, ChevronsUpDown, X, Search, TrendingUp, TrendingDown } from "lucide-react";

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
    keyName: string;
    count: number;
    sortBy: "highest" | "lowest";
    timeRange: string;
    thresholdAlert?: number;
    refreshInterval?: number;
  };
}

export const TopValuesComparatorConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { subscribe, unsubscribe } = useMqttServer();

  // Form states
  const [customName, setCustomName] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [keyName, setKeyName] = useState("");
  const [count, setCount] = useState(5);
  const [sortBy, setSortBy] = useState<"highest" | "lowest">("highest");
  const [timeRange, setTimeRange] = useState("1h");
  const [thresholdAlert, setThresholdAlert] = useState<string>("");
  const [refreshInterval, setRefreshInterval] = useState<string>("30");

  // UI states
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  // Pre-fill data for edit mode
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDevices(initialConfig.devices || []);
      setKeyName(initialConfig.keyName || "");
      setCount(initialConfig.count || 5);
      setSortBy(initialConfig.sortBy || "highest");
      setTimeRange(initialConfig.timeRange || "1h");
      setThresholdAlert(initialConfig.thresholdAlert?.toString() || "");
      setRefreshInterval(initialConfig.refreshInterval?.toString() || "30");

      // Set available keys if editing
      if (initialConfig.keyName) {
        setAvailableKeys([initialConfig.keyName]);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset for create mode
      setCustomName("");
      setSelectedDevices([]);
      setKeyName("");
      setCount(5);
      setSortBy("highest");
      setTimeRange("1h");
      setThresholdAlert("");
      setRefreshInterval("30");
      setAvailableKeys([]);
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

  // Stable key detection from first device
  useEffect(() => {
    if (selectedDevices.length === 0 || !devices.length) {
      setAvailableKeys([]);
      setIsWaitingForKey(false);
      return;
    }

    const firstDeviceId = selectedDevices[0];
    const firstDevice = devices.find(d => d.uniqId === firstDeviceId);

    if (!firstDevice || !firstDevice.topic) {
      setAvailableKeys([]);
      setIsWaitingForKey(false);
      return;
    }

    // Only reset keys if this is a different device than before
    setAvailableKeys(prevKeys => {
      // If we already have keys and it's the same device, keep them
      if (prevKeys.length > 0 && firstDevice.uniqId === firstDeviceId) {
        return prevKeys;
      }
      // Reset for new device
      setIsWaitingForKey(true);
      return [];
    });

    const topic = firstDevice.topic;
    let messageCount = 0;
    const maxMessages = 10; // Increased to get more stable results
    let subscriptionActive = true;
    let keysFound = false;

    const messageHandler = (receivedTopic: string, payloadString: string) => {
      if (!subscriptionActive || keysFound) return;

      try {
        const payload = JSON.parse(payloadString);
        let innerPayload = payload;

        // Handle nested payload structure
        if (payload.value && typeof payload.value === 'string') {
          try {
            innerPayload = JSON.parse(payload.value);
          } catch {
            innerPayload = payload.value;
          }
        }

        // Extract all numeric/string keys from the payload
        if (innerPayload && typeof innerPayload === 'object') {
          const keys = Object.keys(innerPayload).filter(key => {
            const value = innerPayload[key];
            return typeof value === 'number' ||
                   (typeof value === 'string' && !isNaN(Number(value)));
          });

          if (keys.length > 0) {
            setAvailableKeys(prevKeys => {
              const newKeys = [...new Set([...prevKeys, ...keys])];
              keysFound = true;
              setIsWaitingForKey(false);
              return newKeys;
            });
          }
        }

        messageCount++;
        // Stop after receiving enough messages or if we found keys
        if (messageCount >= maxMessages) {
          subscriptionActive = false;
          if (!keysFound) {
            setIsWaitingForKey(false);
          }
        }
      } catch (error) {
        console.error(`Error parsing MQTT message for key detection:`, error);
        messageCount++;
        if (messageCount >= maxMessages) {
          subscriptionActive = false;
          setIsWaitingForKey(false);
        }
      }
    };

    // Subscribe to the topic
    subscribe(topic, messageHandler);

    // Set reasonable timeout
    const timeout = setTimeout(() => {
      subscriptionActive = false;
      setIsWaitingForKey(false);
      if (!keysFound) {
        console.warn(`No suitable keys found from device ${firstDevice.name} after 20 seconds`);
      }
    }, 20000); // 20 second timeout

    // Cleanup function
    return () => {
      subscriptionActive = false;
      clearTimeout(timeout);
      unsubscribe(topic, messageHandler);
    };
  }, [selectedDevices.length > 0 ? selectedDevices[0] : null, devices, subscribe, unsubscribe]);

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

  const handleSave = () => {
    if (!customName || selectedDevices.length === 0 || !keyName) {
      showToast.error("Please fill in all required fields.");
      return;
    }

    const config = {
      customName,
      devices: selectedDevices,
      keyName,
      count,
      sortBy,
      timeRange,
      thresholdAlert: thresholdAlert ? parseFloat(thresholdAlert) : undefined,
      refreshInterval: refreshInterval ? parseInt(refreshInterval) : undefined,
    };

    onSave(config);
  };

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[200vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl flex items-center gap-2">
            {sortBy === "highest" ? (
              <TrendingUp className="w-5 h-5 text-green-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-red-500" />
            )}
            {isEditMode ? "Edit Top Values Comparator" : "Configure Top Values Comparator"}
          </DialogTitle>
          <DialogDescription>
            Compare and rank values across multiple devices. Select devices first, then choose
            a data key from the first device - all other devices will automatically use the same key
            for consistent comparison.
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
                placeholder="e.g., Top Temperature Sensors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="count">Number of Items</Label>
                <Select value={count.toString()} onValueChange={(value) => setCount(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">Top 3</SelectItem>
                    <SelectItem value="5">Top 5</SelectItem>
                    <SelectItem value="10">Top 10</SelectItem>
                    <SelectItem value="15">Top 15</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="sortBy">Sort Order</Label>
                <Select value={sortBy} onValueChange={(value: "highest" | "lowest") => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="highest">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        Highest Values
                      </div>
                    </SelectItem>
                    <SelectItem value="lowest">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-500" />
                        Lowest Values
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Device Selection */}
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label>Devices * ({selectedDevices.length} selected)</Label>

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
                <Skeleton className="h-10 w-full" />
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
                        : "Select devices..."
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
                                  onChange={() => {}} // Controlled by onSelect
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
              <Label htmlFor="keyName">Data Key *</Label>
              <Select
                value={keyName}
                onValueChange={setKeyName}
                disabled={!selectedDevices.length || availableKeys.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    isWaitingForKey
                      ? "Loading available keys..."
                      : selectedDevices.length === 0
                      ? "Select devices first"
                      : "Select a data key"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDevices.length > 0 && availableKeys.length === 0 && !isWaitingForKey && (
                <p className="text-sm text-muted-foreground">
                  No data keys available from selected devices
                </p>
              )}
            </div>
          </div>

          {/* Advanced Configuration */}
          <div className="space-y-4 border-t pt-4">
            <h4 className="font-medium text-sm">Advanced Settings</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="timeRange">Time Range</Label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5m">Last 5 minutes</SelectItem>
                    <SelectItem value="15m">Last 15 minutes</SelectItem>
                    <SelectItem value="1h">Last hour</SelectItem>
                    <SelectItem value="6h">Last 6 hours</SelectItem>
                    <SelectItem value="24h">Last 24 hours</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                <Input
                  id="refreshInterval"
                  type="number"
                  value={refreshInterval}
                  onChange={(e) => setRefreshInterval(e.target.value)}
                  placeholder="30"
                  min="5"
                  max="3600"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="thresholdAlert">Alert Threshold (Optional)</Label>
              <Input
                id="thresholdAlert"
                type="number"
                value={thresholdAlert}
                onChange={(e) => setThresholdAlert(e.target.value)}
                placeholder="e.g., 80 (highlight values above this threshold)"
              />
              <p className="text-xs text-muted-foreground">
                Values exceeding this threshold will be highlighted in red
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
