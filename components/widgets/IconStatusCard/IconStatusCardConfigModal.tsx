// File: components/widgets/IconStatusCard/IconStatusCardConfigModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { iconList } from "@/components/icon/IconPicker";
import { Search } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface IconItem {
  name: string;
  icon: React.ComponentType<any>;
  category: string;
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
    selectedIcon?: string;
    iconColor?: string;
    iconBgColor?: string;
  }; // ✅ TAMBAH PROP BARU
}

export const IconStatusCardConfigModal = ({
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
  const [units, setUnits] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Zap");
  const [iconColor, setIconColor] = useState("#FFFFFF");
  const [iconBgColor, setIconBgColor] = useState("#3B82F6");

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  // ✅ TAMBAH STATE UNTUK TRACK EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);

  // State untuk device search dropdown
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");

  // ✅ EFFECT BARU: PRE-FILL DATA JIKA ADA initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
      setSelectedKey(initialConfig.selectedKey || null);
      setMultiply(String(initialConfig.multiply || 1));
      setUnits(initialConfig.units || "");
      setSelectedIcon(initialConfig.selectedIcon || "Zap");
      setIconColor(initialConfig.iconColor || "#FFFFFF");
      setIconBgColor(initialConfig.iconBgColor || "#3B82F6");

      // ✅ Jika edit mode, langsung set available keys dengan key yang dipilih
      if (initialConfig.selectedKey) {
        setAvailableKeys([initialConfig.selectedKey]);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      // Reset ke default values untuk create mode
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setSelectedKey(null);
      setMultiply("1");
      setUnits("");
      setSelectedIcon("Zap");
      setIconColor("#FFFFFF");
      setIconBgColor("#3B82F6");
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
          showToast.error("Failed to load devices: " + error.message);
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
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const keys = Object.keys(innerPayload);

          // ✅ JIKA EDIT MODE, gabungkan dengan key yang sudah ada
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

  const handleDeviceChange = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    // ✅ Hanya clear keys jika bukan edit mode ATAU device berubah
    if (!isEditMode || uniqId !== initialConfig?.deviceUniqId) {
      setAvailableKeys([]);
    }
  };

  const handleSave = () => {
    if (!customName || !selectedDeviceUniqId || !selectedKey || !selectedIcon) {
      showToast.error("Please fill in all required fields.");
      return;
    }
    onSave({
      customName,
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      multiply: parseFloat(multiply) || 1,
      units,
      selectedIcon,
      iconColor,
      iconBgColor,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {/* ✅ UBAH TITLE SESUAI MODE */}
            {isEditMode
              ? "Edit Icon Status Card"
              : "Configure Icon Status Card"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your widget configuration below."
              : "Select device, key, and customize the appearance of the card."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 max-h-[70vh] overflow-y-auto">
          {/* Kolom Kiri: Konfigurasi Data */}
          <div className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="customName">Custom Name</Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Main Voltage"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="device">Device *</Label>
              {isLoadingDevices ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deviceSearchOpen}
                      className={`h-10 w-full justify-between text-left font-normal ${
                        selectedDeviceUniqId ? 'border-green-500 bg-green-50 dark:bg-green-950/10' : ''
                      }`}
                    >
                      {selectedDeviceUniqId
                        ? (() => {
                            const selectedDevice = devices.find(d => d.uniqId === selectedDeviceUniqId);
                            return selectedDevice ? (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{selectedDevice.name}</span>
                                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                              </div>
                            ) : "Select device...";
                          })()
                        : (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span>Select device...</span>
                          </div>
                        )}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[var(--radix-popover-trigger-width)] max-h-[--radix-popover-content-available-height] p-0"
                    side="bottom"
                    sideOffset={4}
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search devices by name..."
                        value={deviceSearchQuery}
                        onValueChange={setDeviceSearchQuery}
                        className="h-9"
                      />
                      <CommandEmpty>
                        <div className="p-4 text-center">
                          <Search className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No devices found</p>
                          <p className="text-xs text-muted-foreground">Try adjusting your search terms</p>
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {devices
                          .filter((device) => {
                            if (!deviceSearchQuery) return true; // Show all if no search input
                            const searchValue = deviceSearchQuery.toLowerCase();

                            return device.name.toLowerCase().includes(searchValue);
                          })
                          .map((device) => (
                            <CommandItem
                              key={device.uniqId}
                              value={device.uniqId}
                              onSelect={() => {
                                handleDeviceChange(device.uniqId);
                                setDeviceSearchOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium truncate">{device.name}</span>
                                </div>
                                {selectedDeviceUniqId === device.uniqId && (
                                  <div className="w-4 h-4 text-green-600">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                      <div className="border-t p-2 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>{devices.length} devices available</span>
                          <span>↑↓ to navigate • Enter to select</span>
                        </div>
                      </div>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
              <div className="text-xs text-muted-foreground">
                {selectedDeviceUniqId ? (
                  <span className="text-green-600">✓ Device selected</span>
                ) : (
                  <span>Choose a device to monitor for data</span>
                )}
              </div>
            </div>
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
                  {availableKeys.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDeviceUniqId && (
                <div className="text-xs mt-1 flex items-center gap-1">
                  {isWaitingForKey ? (
                    <>
                      <div className="flex items-center gap-2 text-blue-600 animate-pulse">
                        <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                        <span>Waiting for real-time data...</span>
                      </div>
                    </>
                  ) : availableKeys.length === 0 && !isEditMode ? (
                    <p className="text-yellow-600 dark:text-yellow-400">
                      No data available from this device
                    </p>
                  ) : availableKeys.length > 0 ? (
                    <>
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <svg
                          className="w-3 h-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                        <span>{availableKeys.length} keys available</span>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="units">Units</Label>
                <Input
                  id="units"
                  value={units}
                  onChange={(e) => setUnits(e.target.value)}
                  placeholder="e.g., V, A, %"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="multiply">Multiplier</Label>
                <Input
                  id="multiply"
                  type="number"
                  value={multiply}
                  onChange={(e) => setMultiply(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Konfigurasi Tampilan */}
          <div className="space-y-4">
            <div>
              <Label>Icon</Label>
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-2 border p-3 rounded-md mt-2 max-h-[200px] overflow-y-auto">
                {iconList.map(({ name, icon: Icon }) => (
                  <button
                    key={name}
                    onClick={() => setSelectedIcon(name)}
                    className={`flex items-center justify-center p-2 rounded-md transition-all ${
                      selectedIcon === name
                        ? "ring-2 ring-primary bg-primary/10 dark:bg-primary/20"
                        : "bg-muted hover:bg-muted/80 dark:bg-muted dark:hover:bg-muted/70"
                    }`}
                  >
                    <Icon className="h-5 w-5 text-foreground dark:text-foreground" />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="iconColor">Icon Color</Label>
                <Input
                  id="iconColor"
                  type="color"
                  value={iconColor}
                  onChange={(e) => setIconColor(e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="iconBgColor">Background Color</Label>
                <Input
                  id="iconBgColor"
                  type="color"
                  value={iconBgColor}
                  onChange={(e) => setIconBgColor(e.target.value)}
                  className="h-10"
                />
              </div>
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
