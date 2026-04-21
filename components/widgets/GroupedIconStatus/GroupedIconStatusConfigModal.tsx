// File: components/widgets/GroupedIconStatus/GroupedIconStatusConfigModal.tsx
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
import { iconList } from "@/components/icon/IconPicker";
import { PlusCircle, Trash2, List, ChevronsUpDown, Check } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface GroupItem {
  id: string;
  customName: string;
  deviceUniqId: string | null;
  selectedKey: string | null;
  units: string;
  multiply: string;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
}

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
    title: string;
    items: Array<{
      customName: string;
      deviceUniqId: string;
      selectedKey: string;
      units: string;
      multiply: number;
      selectedIcon: string;
      iconColor: string;
      iconBgColor: string;
    }>;
  }; // ✅ TAMBAH PROP BARU
}

// Komponen Form untuk satu item
const ItemForm = ({
  item,
  updateItem,
  removeItem,
  allDevices,
  isLoadingDevices,
  isEditMode, // ✅ TAMBAH PROP
}: {
  item: GroupItem;
  updateItem: (id: string, field: keyof GroupItem, value: any) => void;
  removeItem: (id: string) => void;
  allDevices: DeviceForSelection[];
  isLoadingDevices: boolean;
  isEditMode: boolean; // ✅ TAMBAH PROP
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [deviceOpen, setDeviceOpen] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);
  const initialDeviceRef = useRef(item.deviceUniqId); // ✅ TRACK INITIAL DEVICE

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
        console.error("Failed to parse MQTT payload in item form:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  // ✅ SET INITIAL KEYS JIKA EDIT MODE
  useEffect(() => {
    if (isEditMode && item.selectedKey) {
      setAvailableKeys([item.selectedKey]);
    }
  }, [isEditMode, item.selectedKey]);

  useEffect(() => {
    const selectedDevice = allDevices.find(
      (d) => d.uniqId === item.deviceUniqId
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
    item.deviceUniqId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    isEditMode,
  ]);

  const handleDeviceChange = (value: string) => {
    updateItem(item.id, "deviceUniqId", value);
    updateItem(item.id, "selectedKey", null);
    // ✅ Hanya clear keys jika device berubah
    if (value !== initialDeviceRef.current) {
      setAvailableKeys([]);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg relative bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={() => removeItem(item.id)}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Custom Name</Label>
          <Input
            value={item.customName}
            onChange={(e) => updateItem(item.id, "customName", e.target.value)}
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
                    {item.deviceUniqId
                      ? allDevices.find((d) => d.uniqId === item.deviceUniqId)?.name ?? "Select a device"
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
                    {allDevices.map((d) => (
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
                            item.deviceUniqId === d.uniqId
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
            onValueChange={(value) => updateItem(item.id, "selectedKey", value)}
            value={item.selectedKey || ""}
            disabled={!item.deviceUniqId || availableKeys.length === 0}
          >
            <SelectTrigger>
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
          {item.deviceUniqId && (
            <div className="text-xs mt-1 flex items-center gap-1">
              {isWaitingForKey ? (
                <>
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
                    <div className="w-3 h-3 border-2 border-blue-600/30 dark:border-blue-400/30 border-t-blue-600 dark:border-t-blue-400 rounded-full animate-spin"></div>
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
        <div className="grid gap-2">
          <Label>Units</Label>
          <Input
            value={item.units}
            onChange={(e) => updateItem(item.id, "units", e.target.value)}
            placeholder="e.g., °C"
          />
        </div>
      </div>
      <div className="pt-4 border-t">
        <Label className="text-xs font-semibold">Appearance</Label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div className="grid gap-2 sm:col-span-3">
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[120px] overflow-y-auto p-1 border rounded">
              {iconList.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  onClick={() => updateItem(item.id, "selectedIcon", name)}
                  className={`flex items-center justify-center p-2 rounded-md transition-all ${
                    item.selectedIcon === name
                      ? "ring-2 ring-primary bg-primary/10 dark:bg-primary/20"
                      : "bg-muted hover:bg-muted/80 dark:bg-muted dark:hover:bg-muted/70"
                  }`}
                >
                  <Icon className="h-5 w-5 text-foreground dark:text-foreground" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`iconColor-${item.id}`}>Icon Color</Label>
            <Input
              id={`iconColor-${item.id}`}
              type="color"
              value={item.iconColor}
              onChange={(e) => updateItem(item.id, "iconColor", e.target.value)}
              className="h-10"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`iconBgColor-${item.id}`}>Background</Label>
            <Input
              id={`iconBgColor-${item.id}`}
              type="color"
              value={item.iconBgColor}
              onChange={(e) =>
                updateItem(item.id, "iconBgColor", e.target.value)
              }
              className="h-10"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const GroupedIconStatusConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig, // ✅ DESTRUCTURE PROP BARU
}: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [items, setItems] = useState<GroupItem[]>([]);
  const [widgetTitle, setWidgetTitle] = useState("Grouped Status");

  // ✅ TAMBAH STATE UNTUK TRACK EDIT MODE
  const [isEditMode, setIsEditMode] = useState(false);

  // ✅ EFFECT BARU: PRE-FILL DATA JIKA ADA initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.title || "Grouped Status");

      // ✅ Convert initialConfig items ke GroupItem format dengan id
      const loadedItems: GroupItem[] = (initialConfig.items || []).map(
        (item, index) => ({
          id: `item-${Date.now()}-${index}`,
          customName: item.customName || "",
          deviceUniqId: item.deviceUniqId || null,
          selectedKey: item.selectedKey || null,
          units: item.units || "",
          multiply: String(item.multiply || 1),
          selectedIcon: item.selectedIcon || "Zap",
          iconColor: item.iconColor || "#FFFFFF",
          iconBgColor: item.iconBgColor || "#3B82F6",
        })
      );

      setItems(loadedItems);
    } else if (isOpen) {
      setIsEditMode(false);
      setItems([]);
      setWidgetTitle("Grouped Status");
      addItem();
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

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}`,
        customName: "",
        deviceUniqId: null,
        selectedKey: null,
        units: "",
        multiply: "1",
        selectedIcon: "Zap",
        iconColor: "#FFFFFF",
        iconBgColor: "#3B82F6",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, field: keyof GroupItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSave = () => {
    if (!widgetTitle || items.length === 0) {
      showToast.error("Widget title and at least one item are required.");
      return;
    }
    for (const item of items) {
      if (!item.customName || !item.deviceUniqId || !item.selectedKey) {
        showToast.error(
          `Please complete all fields for item: '${item.customName || 'Untitled'}'`
        );
        return;
      }
    }

    onSave({
      title: widgetTitle,
      items: items.map(({ id, ...rest }) => ({
        ...rest,
        multiply: parseFloat(rest.multiply) || 1,
      })),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {/* ✅ UBAH TITLE SESUAI MODE */}
            {isEditMode
              ? "Edit Grouped Icon Status"
              : "Configure Grouped Icon Status"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your grouped status widget configuration."
              : "Add and configure multiple status items to display in one widget."}
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {items.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">
                No items added yet. Click "Add Another Item" to get started.
              </p>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="widgetTitle">Widget Title</Label>
            <Input
              id="widgetTitle"
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Server Room Status"
            />
          </div>
          <div className="space-y-4">
            {items.map((item) => (
              <ItemForm
                key={item.id}
                item={item}
                updateItem={updateItem}
                removeItem={removeItem}
                allDevices={devices}
                isLoadingDevices={isLoadingDevices}
                isEditMode={isEditMode} // ✅ PASS EDIT MODE KE ITEM FORM
              />
            ))}
          </div>
          <Button variant="outline" onClick={addItem} className="w-full">
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Another Item
          </Button>
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
