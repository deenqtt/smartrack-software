// File: components/widgets/SingleValueCard/SingleValueCardConfigModal.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  };
}

export const SingleValueCardConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
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
  const [units, setUnits] = useState(""); // ✅ TAMBAH STATE UNTUK UNITS

  // State untuk key yang didapat dari MQTT
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  // State untuk track edit mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);

  // ✅ EFFECT: PRE-FILL DATA JIKA ADA initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
      setSelectedKey(initialConfig.selectedKey || null);
      setMultiply(String(initialConfig.multiply || 1));
      setUnits(initialConfig.units || ""); // ✅ SET UNITS DARI INITIAL CONFIG

      if (initialConfig.selectedKey) {
        setAvailableKeys([initialConfig.selectedKey]);
      }
    } else if (isOpen) {
      setIsEditMode(false);
    }
  }, [isOpen, initialConfig]);

  // Fetch data perangkat saat modal dibuka
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
    } else {
      // Reset form saat modal ditutup
      setTimeout(() => {
        setCustomName("");
        setSelectedDeviceUniqId(null);
        setSelectedKey(null);
        setMultiply("1");
        setUnits(""); // ✅ RESET UNITS
        setAvailableKeys([]);
        setIsWaitingForKey(false);
        setIsEditMode(false);
      }, 200);
    }
  }, [isOpen, onClose]);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const keys = Object.keys(innerPayload);

          setAvailableKeys((prevKeys) => {
            const allKeys = [...new Set([...prevKeys, ...keys])];
            return allKeys;
          });
        } else {
          console.warn("Payload 'value' is not a JSON string:", payload.value);
        }
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

  const handleDeviceChange = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    if (!isEditMode || uniqId !== initialConfig?.deviceUniqId) {
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
      units: units.trim(), // ✅ INCLUDE UNITS DALAM SAVE
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode
              ? "Edit Single Value Card"
              : "Configure Single Value Card"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your widget configuration below."
              : "Select a device to get available data keys via MQTT."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 p-6">
          {/* Custom Name */}
          <div className="grid gap-2">
            <Label htmlFor="customName">Display Name</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g., Main Voltage"
            />
          </div>

          {/* Device Selection */}
          <div className="grid gap-2">
            <Label htmlFor="device">Device</Label>
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
                      {devices.map((device) => (
                        <CommandItem
                          key={device.uniqId}
                          value={device.name}
                          onSelect={() => {
                            handleDeviceChange(device.uniqId);
                            setDeviceOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedDeviceUniqId === device.uniqId
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {device.name}
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
            <Label htmlFor="key">Data Key</Label>
            <Select
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDeviceUniqId || availableKeys.length === 0}
            >
              <SelectTrigger id="key">
                <SelectValue
                  placeholder={
                    isWaitingForKey
                      ? "Waiting for device data..."
                      : "Select a key"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {key}
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

          {/* Multiplier */}
          <div className="grid gap-2">
            <Label htmlFor="multiply">Multiplier (Optional)</Label>
            <Input
              id="multiply"
              type="number"
              value={multiply}
              onChange={(e) => setMultiply(e.target.value)}
              placeholder="e.g., 1000 or 0.1"
              step="0.01"
            />
          </div>

          {/* ✅ TAMBAH FORM UNITS */}
          <div className="grid gap-2">
            <Label htmlFor="units">Units (Optional)</Label>
            <Input
              id="units"
              type="text"
              value={units}
              onChange={(e) => setUnits(e.target.value)}
              placeholder="e.g., V, kW, °C, %"
            />
            <p className="text-xs text-muted-foreground">
              Display unit suffix (e.g., V for Voltage, kW for Power)
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
