// File: components/widgets/TemperatureIndicatorBar/TemperatureIndicatorBarConfigModal.tsx
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
    multiply?: number;
    units?: string;
    minValue?: number;
    maxValue?: number;
  }; // ✅ TAMBAH PROP BARU
}

export const TemperatureIndicatorBarConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig, // ✅ DESTRUCTURE PROP BARU
}: Props) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // State untuk form
  const [customName, setCustomName] = useState("");
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [multiply, setMultiply] = useState("1");
  const [units, setUnits] = useState("°C");
  const [minValue, setMinValue] = useState("0");
  const [maxValue, setMaxValue] = useState("100");

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  // ✅ TAMBAH STATE UNTUK TRACK EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  // ✅ EFFECT BARU: PRE-FILL DATA JIKA ADA initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
      setSelectedKey(initialConfig.selectedKey || null);
      setMultiply(String(initialConfig.multiply || 1));
      setUnits(initialConfig.units || "°C");
      setMinValue(String(initialConfig.minValue ?? 0));
      setMaxValue(String(initialConfig.maxValue ?? 100));

      // ✅ Jika edit mode, langsung set available keys dengan key yang dipilih
      if (initialConfig.selectedKey) {
        setAvailableKeys([initialConfig.selectedKey]);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset ke default values
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setSelectedKey(null);
      setMultiply("1");
      setUnits("°C");
      setMinValue("0");
      setMaxValue("100");
      setAvailableKeys([]);
      setIsWaitingForKey(false);
    }
  }, [isOpen, initialConfig]);

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

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};

        // ✅ JIKA EDIT MODE, gabungkan dengan key yang sudah ada
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
      // ✅ PERBAIKAN: Jangan clear keys di edit mode, tapi tetap subscribe
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
    // ✅ Hanya clear keys jika bukan edit mode ATAU device berubah
    if (!isEditMode || value !== initialConfig?.deviceUniqId) {
      setAvailableKeys([]);
    }
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }
    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      multiply: parseFloat(multiply) || 1,
      units,
      minValue: parseFloat(minValue) || 0,
      maxValue: parseFloat(maxValue) || 100,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {/* ✅ UBAH TITLE SESUAI MODE */}
            {isEditMode ? "Edit Temperature Bar" : "Configure Temperature Bar"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your temperature indicator bar configuration."
              : "Set the data source and the temperature range for the indicator bar."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Custom Name</Label>
            <Input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Room Temperature"
            />
          </div>
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
          <div className="grid gap-2">
            <Label>Data Key</Label>
            <Select
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDeviceUniqId || availableKeys.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isWaitingForKey ? "Waiting for data..." : "Select a key"
                  }
                />
              </SelectTrigger>
              <SelectContent>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Min Value</Label>
              <Input
                type="number"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
                placeholder="e.g., 0"
              />
            </div>
            <div className="grid gap-2">
              <Label>Max Value</Label>
              <Input
                type="number"
                value={maxValue}
                onChange={(e) => setMaxValue(e.target.value)}
                placeholder="e.g., 100"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Units</Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., °C"
              />
            </div>
            <div className="grid gap-2">
              <Label>Multiplier</Label>
              <Input
                type="number"
                value={multiply}
                onChange={(e) => setMultiply(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {/* ✅ UBAH TEXT BUTTON SESUAI MODE */}
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
