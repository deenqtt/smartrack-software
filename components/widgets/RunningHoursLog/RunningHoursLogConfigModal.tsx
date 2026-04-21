// File: components/widgets/RunningHoursLog/RunningHoursLogConfigModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { ChevronsUpDown, Check } from "lucide-react";

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
    deviceUniqId: string;
    selectedKey: string;
    units?: string;
    multiply?: number;
    timeUnit?: string;
  };
}

// Time unit conversion factors to hours
const TIME_UNIT_CONVERSIONS: Record<string, number> = {
  seconds: 1 / 3600,
  minutes: 1 / 60,
  hours: 1,
  days: 24,
};

export const RunningHoursLogConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { subscribe, unsubscribe, brokers } = useMqttServer();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Form state
  const [customName, setCustomName] = useState("");
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [timeUnit, setTimeUnit] = useState<string>("seconds");
  const [multiply, setMultiply] = useState("1");

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  // Pre-fill data if editing
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
      setSelectedKey(initialConfig.selectedKey || null);
      setTimeUnit(initialConfig.timeUnit || "seconds");
      setMultiply(String(initialConfig.multiply || 1));

      if (initialConfig.selectedKey) {
        setAvailableKeys([initialConfig.selectedKey]);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setSelectedKey(null);
      setTimeUnit("seconds");
      setMultiply("1");
      setAvailableKeys([]);
      setIsWaitingForKey(false);
    }
  }, [isOpen, initialConfig]);

  // Fetch devices
  useEffect(() => {
    if (isOpen) {
      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          setDevices(await response.json());
        } catch (error: any) {
          showToast.error("Error", error.message);
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();
    }
  }, [isOpen, onClose]);

  // Handle MQTT message
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};

        setAvailableKeys((prevKeys) => {
          const newKeys = Object.keys(innerPayload);
          const allKeys = [...new Set([...prevKeys, ...newKeys])];
          return allKeys;
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  // Subscribe to device topic
  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === selectedDeviceUniqId
    );
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      if (!isEditMode) {
        setAvailableKeys([]);
      }
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    selectedDeviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    isEditMode,
  ]);

  const handleDeviceChange = (value: string) => {
    setSelectedDeviceUniqId(value);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }

    // Calculate multiplier based on time unit
    const timeUnitFactor = TIME_UNIT_CONVERSIONS[timeUnit] || 1;
    const customMultiplier = parseFloat(multiply) || 1;
    const finalMultiplier = timeUnitFactor * customMultiplier;

    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      units: "Hours",
      multiply: finalMultiplier,
      timeUnit,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Running Hours Log"
              : "Configure Running Hours Log"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your running hours log widget configuration."
              : "Select a device and the key that contains the running hours data."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6 max-h-[70vh] overflow-y-auto">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Genset A Running Time"
              className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            />
          </div>

          {/* Device Selection */}
          <div className="grid gap-2">
            <Label>Device</Label>
            {isLoadingDevices ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={deviceOpen}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {selectedDeviceUniqId
                        ? devices.find((d) => d.uniqId === selectedDeviceUniqId)?.name ?? "Select a device"
                        : "Select a device"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search device..." />
                    <CommandEmpty>No device found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {devices.map((d) => (
                        <CommandItem
                          key={d.uniqId}
                          value={d.name}
                          onSelect={() => {
                            handleDeviceChange(d.uniqId);
                            setDeviceOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedDeviceUniqId === d.uniqId
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {d.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Data Key Selection */}
          <div className="grid gap-2">
            <Label>Data Key</Label>
            <Select
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDeviceUniqId || availableKeys.length === 0}
            >
              <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                <SelectValue
                  placeholder={
                    isWaitingForKey ? "Waiting for data..." : "Select a key"
                  }
                />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                {availableKeys.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDeviceUniqId &&
              !isWaitingForKey &&
              availableKeys.length === 0 &&
              !isEditMode && (
                <p className="text-xs text-muted-foreground">
                  No keys received. Ensure the device is publishing data.
                </p>
              )}
          </div>

          {/* Time Unit Info Box */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
              Time Unit Conversion
            </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                Select the time unit of your data. It will automatically convert
                to hours for display. For example, if your device sends seconds,
                select &quot;Seconds&quot; and it will show as hours.
              </p>
          </div>

          {/* Time Unit Selection */}
          <div className="grid gap-2">
            <Label>Data Time Unit</Label>
            <Select value={timeUnit} onValueChange={setTimeUnit}>
              <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                <SelectItem value="seconds">Seconds</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              What unit is the raw value in?
            </p>
          </div>

          {/* Custom Multiplier */}
          <div className="grid gap-2">
            <Label>Custom Multiplier (Optional)</Label>
            <Input
              type="number"
              value={multiply}
              onChange={(e) => setMultiply(e.target.value)}
              placeholder="Default: 1"
              step="0.1"
              className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
            />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Apply additional multiplier to the value. Leave as 1 if not
                  needed.
                </p>
          </div>

          {/* Preview */}
          {selectedKey && (
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                Preview
              </p>
              <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <p>
                  <span className="font-medium">Key:</span> {selectedKey}
                </p>
                <p>
                  <span className="font-medium">Conversion:</span> {timeUnit} →
                  hours
                </p>
                <p>
                  <span className="font-medium">Multiplier:</span>{" "}
                  {(
                    TIME_UNIT_CONVERSIONS[timeUnit] *
                    (parseFloat(multiply) || 1)
                  ).toFixed(6)}
                </p>
                <p className="text-slate-500 dark:text-slate-500">
                  Example: 3600 {timeUnit} ={" "}
                  {(
                    3600 *
                    TIME_UNIT_CONVERSIONS[timeUnit] *
                    (parseFloat(multiply) || 1)
                  ).toFixed(2)}{" "}
                  hours
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="dark:hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            className="dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
