// File: app/(dashboard)/alarm-management/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider"; // <-- IMPORT MQTT SERVER
import { useMenuItemPermissions } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { useSortableTable } from "@/hooks/use-sort-table";
import { showToast } from "@/lib/toast-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import { ImportExportButtons } from "@/components/shared/ImportExportButtons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Bell,
  AlertTriangle,
  AlertCircle,
  Info,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CircleCheck,
  Filter,
  Download,
  Copy,
  CopyPlus,
  MoreHorizontal,
  HardDrive,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Confirmation Dialog State - removed duplicate

// --- Type Definitions ---
type DeviceExternal = {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
};

type AlarmBit = {
  id?: string;
  bitPosition: number;
  customName: string;
  alertToWhatsApp: boolean;
};

type AlarmConfig = {
  id: string;
  customName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  keyType: "DIRECT" | "THRESHOLD" | "BIT_VALUE";
  key: string;
  device: { name: string };
  deviceUniqId: string;
  bits: AlarmBit[];
  minValue?: number | null;
  maxValue?: number | null;
  maxOnly?: boolean | null;
  directTriggerOnTrue?: boolean | null;
  notificationRecipients?: {
    user: {
      id: string;
      email: string;
      phoneNumber: string;
    };
  }[];
};

type ManualAlarmFormData = {
  deviceUniqId: string;
  key: string;
  customName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  keyType: "DIRECT" | "THRESHOLD" | "BIT_VALUE";
  minValue?: number | string | null;
  maxValue?: number | string | null;
  maxOnly: boolean;
  directTriggerOnTrue: boolean; // New field for direct value trigger condition
  bits: { bit: string; customName: string; alertToWhatsApp: boolean }[];
};

// =================================================================
// Sub-Component: AlarmDialog (Add/Edit Form) - Versi Manual
// =================================================================
interface AlarmDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  initialData?: AlarmConfig | null;
}

const AlarmDialog = ({
  isOpen,
  onOpenChange,
  onSave,
  initialData,
}: AlarmDialogProps) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<DeviceExternal[]>([]);
  const [subscribedTopic, setSubscribedTopic] = useState<string | null>(null);
  const [livePayload, setLivePayload] = useState<any>({});
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ManualAlarmFormData>({
    deviceUniqId: "",
    key: "",
    customName: "",
    alarmType: "MINOR",
    keyType: "DIRECT",
    bits: [],
    maxOnly: false,
    directTriggerOnTrue: true,
    minValue: "",
    maxValue: "",
  });
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [errors, setErrors] = useState<
    Record<string, string>
  >({});
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  useEffect(() => {
    async function fetchDevicesAndUsers() {
      try {
        // Fetch devices
        const deviceRes = await fetch("/api/devices/for-selection");
        if (!deviceRes.ok) throw new Error("Failed to fetch devices");
        setDevices(await deviceRes.json());

        // Fetch users for WhatsApp notifications
        const userRes = await fetch("/api/users");
        if (!userRes.ok) throw new Error("Failed to fetch users");
        const json = await userRes.json();
        const usersData = Array.isArray(json) ? json : (json.data || []);

        // Filter users with phone numbers
        const usersWithPhone = usersData.filter((user: any) =>
          user.phoneNumber && user.phoneNumber.trim() !== ''
        );
        setAvailableUsers(usersWithPhone);
      } catch (error) {
        console.error(error);
        // Still set empty array to prevent undefined errors
        setAvailableUsers([]);
      }
    }
    if (isOpen) fetchDevicesAndUsers();
  }, [isOpen]);

  const handleMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      console.log(`[AlarmDialog] Received MQTT message on topic: ${topic}`, payloadStr);

      const payload = JSON.parse(payloadStr);
      if (typeof payload.value === "string") {
        const innerPayload = JSON.parse(payload.value);
        const keys = Object.keys(innerPayload);

        // ✅ JIKA EDIT MODE, gabungkan dengan key yang sudah ada
        setAvailableKeys((prevKeys) => {
          const allKeys = [...new Set([...prevKeys, ...keys])];
          return allKeys;
        });

        setLivePayload(innerPayload);
        console.log(`[AlarmDialog] Set livePayload:`, innerPayload);
        console.log(`[AlarmDialog] Available keys:`, keys);
      } else {
        console.warn("[AlarmDialog] Payload 'value' is not a JSON string:", payload.value);
        setLivePayload({ raw: payloadStr });
      }
    } catch (e) {
      console.error("[AlarmDialog] Failed to parse MQTT payload:", e);
      console.error("[AlarmDialog] Raw payload:", payloadStr);
      setLivePayload({ raw: payloadStr });
    }
  }, []);

  useEffect(() => {
    const selectedDevice = devices.find(
      (d) => d.uniqId === formData.deviceUniqId
    );
    const newTopic = selectedDevice?.topic || null;

    if (subscribedTopic && subscribedTopic !== newTopic) {
      unsubscribe(subscribedTopic, handleMessage);
    }
    if (newTopic && newTopic !== subscribedTopic) {
      subscribe(newTopic, handleMessage);
      setSubscribedTopic(newTopic);
      setLivePayload({});
      handleFormChange("key", "");
    }
  }, [
    formData.deviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    subscribedTopic,
    handleMessage,
  ]);

  useEffect(() => {
    return () => {
      if (subscribedTopic) {
        unsubscribe(subscribedTopic, handleMessage);
      }
    };
  }, [subscribedTopic, unsubscribe, handleMessage]);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!isOpen) {
      // Dialog closed - reset form
      setFormData({
        deviceUniqId: "",
        key: "",
        customName: "",
        alarmType: "MINOR",
        keyType: "DIRECT",
        bits: [],
        maxOnly: false,
        directTriggerOnTrue: true,
        minValue: "",
        maxValue: "",
      });
      setAvailableKeys([]);
      setIsWaitingForKey(false);
      setErrors({});
      return;
    }

    // Dialog opened - populate with initial data or reset
    if (initialData) {
      setFormData({
        deviceUniqId: initialData.deviceUniqId,
        key: initialData.key,
        customName: initialData.customName,
        alarmType: initialData.alarmType,
        keyType: initialData.keyType,
        minValue: initialData.minValue ?? "",
        maxValue: initialData.maxValue ?? "",
        maxOnly: initialData.maxOnly || false,
        directTriggerOnTrue: initialData.directTriggerOnTrue !== null && initialData.directTriggerOnTrue !== undefined ? initialData.directTriggerOnTrue : true,
        bits:
          initialData.bits?.map((b) => ({
            bit: String(b.bitPosition),
            customName: b.customName,
            alertToWhatsApp: b.alertToWhatsApp,
          })) || [],
      });
      setSelectedUsers(initialData.notificationRecipients?.map(r => r.user.id) || []);
    } else {
      // New alarm form
      setFormData({
        deviceUniqId: "",
        key: "",
        customName: "",
        alarmType: "MINOR",
        keyType: "DIRECT",
        bits: [],
        maxOnly: false,
        directTriggerOnTrue: true,
        minValue: "",
        maxValue: "",
      });
      setSelectedUsers([]);
      setErrors({});
    }
  }, [isOpen, initialData]);

  const handleFormChange = (field: keyof ManualAlarmFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Clear key when keyType changes
      if (field === 'keyType' && value !== prev.keyType) {
        updated.key = "";
      }

      // Clear bits when switching away from BIT_VALUE
      if (field === 'keyType' && value !== 'BIT_VALUE') {
        updated.bits = [];
      }

      // Reset threshold values when switching to DIRECT or BIT_VALUE
      if (field === 'keyType' && (value === 'DIRECT' || value === 'BIT_VALUE')) {
        updated.minValue = "";
        updated.maxValue = "";
        updated.maxOnly = false;
      }

      return updated;
    });

    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleBitChange = (
    index: number,
    field: "bit" | "customName" | "alertToWhatsApp",
    value: any
  ) => {
    const newBits = [...formData.bits];
    newBits[index] = { ...newBits[index], [field]: value };
    handleFormChange("bits", newBits);
  };

  const addBit = () => {
    handleFormChange("bits", [
      ...formData.bits,
      { bit: "0", customName: "", alertToWhatsApp: false },
    ]);
  };

  const removeBit = (index: number) => {
    const newBits = [...formData.bits];
    newBits.splice(index, 1);
    handleFormChange("bits", newBits);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.deviceUniqId) newErrors.deviceUniqId = "Device is required.";
    if (!formData.customName || formData.customName.length < 3)
      newErrors.customName = "Custom name must be at least 3 characters.";
    if (!formData.key) newErrors.key = "Key is required.";

    if (formData.keyType === "THRESHOLD") {
      if (
        !formData.maxOnly &&
        (formData.minValue === null || formData.minValue === "")
      )
        newErrors.minValue = "Min Value is required.";
      if (formData.maxValue === null || formData.maxValue === "")
        newErrors.maxValue = "Max Value is required.";

      // Validate numeric values
      if (formData.minValue && isNaN(Number(formData.minValue)))
        newErrors.minValue = "Min Value must be a valid number.";
      if (formData.maxValue && isNaN(Number(formData.maxValue)))
        newErrors.maxValue = "Max Value must be a valid number.";
    }

    if (formData.keyType === "BIT_VALUE") {
      if (formData.bits.length === 0)
        newErrors.bits = "At least one bit configuration is required.";

      // Check for duplicate bit positions and validate bit configurations
      const bitPositions = new Set<number>();
      formData.bits.forEach((bit, index) => {
        if (!bit.customName || bit.customName.trim().length < 2) {
          newErrors[`bit${index}`] = "Custom name must be at least 2 characters.";
        }
        if (bitPositions.has(parseInt(bit.bit))) {
          newErrors[`bit${index}`] = "Duplicate bit position.";
        } else {
          bitPositions.add(parseInt(bit.bit));
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const url = initialData?.id ? `/api/alarms/${initialData.id}` : "/api/alarms";
      const method = initialData?.id ? "PUT" : "POST";

      // Prepare payload with notification recipients
      const payload = {
        ...formData,
        notificationRecipients: selectedUsers.map(userId => ({
          userId,
          sendWhatsApp: true // All selected users will receive WhatsApp notifications
        }))
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save alarm.");
      }

      const result = await response.json();
      showToast.success(`Alarm has been ${initialData?.id ? "updated" : "created"} with ${selectedUsers.length} notification recipients.`);
      onSave();
      onOpenChange(false);
    } catch (error: any) {
      showToast.error("Error", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const payloadKeys = useMemo(() => {
    console.log(`[AlarmDialog] Computing payloadKeys for keyType: ${formData.keyType}`);
    console.log(`[AlarmDialog] Current livePayload:`, livePayload);

    // If no payload or not an object, return empty array
    if (!livePayload || typeof livePayload !== "object" || Array.isArray(livePayload)) {
      console.log(`[AlarmDialog] No valid payload available`);
      return [];
    }

    const allKeys = Object.keys(livePayload);
    console.log(`[AlarmDialog] All available keys:`, allKeys);

    // Helper functions for type checking
    const isNumber = (value: any) => {
      const num = Number(value);
      return !isNaN(num) && isFinite(num);
    };

    const isBooleanOrBinary = (value: any) => {
      // Accept actual booleans
      if (typeof value === "boolean") return true;

      // Accept binary numbers (0 or 1)
      if (typeof value === "number" && (value === 0 || value === 1)) return true;

      // Accept binary strings
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "0" || trimmed === "1") return true;
        if (trimmed.toLowerCase() === "true" || trimmed.toLowerCase() === "false") return true;
      }

      // For IoT sensors, accept numeric values as potential boolean triggers
      // This allows using temperature, pH, or other sensor values as direct boolean alarms
      if (typeof value === "number") return true;

      // For DIRECT alarms, be more permissive - accept any non-numeric values as potential boolean indicators
      // This allows using any field as a direct boolean trigger
      if (typeof value === "string" && isNaN(Number(value))) return true;

      return false;
    };

    const isInteger = (value: any) => {
      const num = Number(value);
      return !isNaN(num) && Number.isInteger(num);
    };

    let filteredKeys: string[];

    switch (formData.keyType) {
      case "THRESHOLD":
        filteredKeys = allKeys.filter((k) => {
          const result = isNumber(livePayload[k]);
          console.log(`[AlarmDialog] Key "${k}" (${livePayload[k]}) is number: ${result}`);
          return result;
        });
        console.log(`[AlarmDialog] THRESHOLD keys:`, filteredKeys);
        break;

      case "DIRECT":
        filteredKeys = allKeys.filter((k) => {
          const result = isBooleanOrBinary(livePayload[k]);
          console.log(`[AlarmDialog] Key "${k}" (${livePayload[k]}) is boolean/binary: ${result}`);
          return result;
        });
        console.log(`[AlarmDialog] DIRECT keys:`, filteredKeys);
        break;

      case "BIT_VALUE":
        filteredKeys = allKeys.filter((k) => {
          const result = isInteger(livePayload[k]);
          console.log(`[AlarmDialog] Key "${k}" (${livePayload[k]}) is integer: ${result}`);
          return result;
        });
        console.log(`[AlarmDialog] BIT_VALUE keys:`, filteredKeys);
        break;

      default:
        filteredKeys = allKeys;
        console.log(`[AlarmDialog] DEFAULT keys:`, filteredKeys);
        break;
    }

    console.log(`[AlarmDialog] Final payloadKeys for ${formData.keyType}:`, filteredKeys);
    return filteredKeys;
  }, [livePayload, formData.keyType]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-semibold">
            {initialData?.id ? "Edit Alarm Configuration" : initialData ? "Duplicate Alarm Configuration" : "Create New Alarm Configuration"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure monitoring conditions that will trigger system alarms and notifications.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto py-6 space-y-6"
        >
          {/* Basic Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded bg-primary"></div>
              </div>
              <h3 className="text-lg font-medium">Basic Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="deviceUniqId" className="text-sm font-medium">Device *</Label>
                <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={deviceSearchOpen}
                      className={`h-10 w-full justify-between text-left font-normal ${formData.deviceUniqId ? 'border-green-500 bg-green-50 dark:bg-green-950/10' : ''
                        }`}
                    >
                      {formData.deviceUniqId
                        ? (() => {
                          const selectedDevice = devices.find(d => d.uniqId === formData.deviceUniqId);
                          return selectedDevice ? (
                            <div className="flex items-center gap-2">
                              <div className="flex flex-col items-start flex-1 min-w-0">
                                <span className="font-medium truncate">{selectedDevice.name}</span>
                                <span className="text-xs text-muted-foreground truncate">{selectedDevice.topic}</span>
                              </div>
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
                        placeholder="Search devices by name, topic, or ID..."
                        className="h-9"
                        onValueChange={setDeviceSearch}
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
                            if (!deviceSearch) return true;
                            const search = deviceSearch.toLowerCase();
                            return (
                              device.name.toLowerCase().includes(search) ||
                              device.topic.toLowerCase().includes(search) ||
                              device.uniqId.toLowerCase().includes(search)
                            );
                          })
                          .map((device) => (
                            <CommandItem
                              key={device.uniqId}
                              value={device.uniqId}
                              onSelect={() => {
                                handleFormChange("deviceUniqId", device.uniqId);
                                setDeviceSearchOpen(false);
                              }}
                              className="cursor-pointer hover:bg-accent"
                            >
                              <div className="flex items-center gap-3 w-full">
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                                <div className="flex flex-col flex-1 min-w-0">
                                  <span className="font-medium truncate">{device.name}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground truncate">{device.topic}</span>
                                    <Badge variant="outline" className="text-xs px-1 py-0">
                                      {device.uniqId.split('-').pop()}
                                    </Badge>
                                  </div>
                                </div>
                                {formData.deviceUniqId === device.uniqId && (
                                  <div className="w-4 h-4 text-green-600">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
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
                <div className="text-xs text-muted-foreground">
                  {formData.deviceUniqId ? (
                    <span className="text-green-600">✓ Device selected</span>
                  ) : (
                    <span>Choose a device to monitor for alarms</span>
                  )}
                </div>
                {errors.deviceUniqId && (
                  <p className="text-xs text-red-500 mt-1">{errors.deviceUniqId}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="customName" className="text-sm font-medium">Alarm Name *</Label>
                <Input
                  id="customName"
                  value={formData.customName}
                  onChange={(e) => handleFormChange("customName", e.target.value)}
                  placeholder="e.g., Server Room Temperature"
                  className="h-10"
                />
                {errors.customName && (
                  <p className="text-xs text-red-500 mt-1">{errors.customName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="alarmType" className="text-sm font-medium">Alarm Severity *</Label>
                <Select
                  onValueChange={(value) => handleFormChange("alarmType", value)}
                  value={formData.alarmType}
                >
                  <SelectTrigger id="alarmType" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITICAL">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        Critical
                      </div>
                    </SelectItem>
                    <SelectItem value="MAJOR">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-500" />
                        Major
                      </div>
                    </SelectItem>
                    <SelectItem value="MINOR">
                      <div className="flex items-center gap-2">
                        <Info className="h-4 w-4 text-blue-500" />
                        Minor
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyType" className="text-sm font-medium">Monitor Type *</Label>
                <Select
                  onValueChange={(value) => handleFormChange("keyType", value)}
                  value={formData.keyType}
                >
                  <SelectTrigger id="keyType" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DIRECT">Direct Value</SelectItem>
                    <SelectItem value="THRESHOLD">Threshold Range</SelectItem>
                    <SelectItem value="BIT_VALUE">Bit Field Map</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key" className="text-sm font-medium">Monitored Key *</Label>
                <Select
                  onValueChange={(value) => handleFormChange("key", value)}
                  value={formData.key}
                  disabled={!subscribedTopic || payloadKeys.length === 0}
                >
                  <SelectTrigger id="key" className="h-10">
                    <SelectValue
                      placeholder={
                        !subscribedTopic
                          ? "Select a device first..."
                          : payloadKeys.length === 0
                            ? (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Waiting for payload...
                              </div>
                            )
                            : (
                              <div className="flex items-center gap-2 text-green-600">
                                <CircleCheck className="h-4 w-4" />
                                {payloadKeys.length} keys available
                              </div>
                            )
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {payloadKeys.map((k) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex justify-between w-full">
                          <span className="font-medium">{k}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({livePayload[k]})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.key && (
                  <p className="text-xs text-red-500 mt-1">{errors.key}</p>
                )}
              </div>
            </div>
          </div>

          {/* WhatsApp Notification Recipients */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <div className="w-5 h-5 rounded bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Bell className="w-3 h-3 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-base font-medium">WhatsApp Notification Recipients</h3>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <Bell className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-sm font-medium">Select recipients</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Choose users who will receive WhatsApp notifications when this alarm triggers. Only users with phone numbers are shown.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm font-medium">
                    Available Users <Badge variant="secondary" className="ml-2">{availableUsers.length}</Badge>
                  </Label>

                  {/* Simplified Multi-Select using custom list to avoid infinite loops */}
                  <div className="border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="flex items-center px-3 border-b border-gray-200 dark:border-gray-700">
                      <Search className="h-4 w-4 text-muted-foreground mr-2" />
                      <Input
                        placeholder="Search users by email, phone, or role..."
                        className="h-9 border-0 focus-visible:ring-0 px-0 shadow-none bg-transparent"
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {availableUsers.length === 0 ? (
                        <div className="p-4 text-center">
                          <Info className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-500">No users with phone numbers found</p>
                          <p className="text-xs text-gray-400 mt-1">
                            Users must have phone numbers configured to receive WhatsApp notifications
                          </p>
                        </div>
                      ) : (() => {
                        const filtered = availableUsers.filter(user =>
                          user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (user.phoneNumber && user.phoneNumber.includes(userSearch)) ||
                          (user.role_data?.name && user.role_data.name.toLowerCase().includes(userSearch.toLowerCase()))
                        );

                        if (filtered.length === 0) {
                          return <div className="p-4 text-sm text-center text-muted-foreground">No users match your search</div>;
                        }

                        return filtered.map((user) => {
                          const isSelected = selectedUsers.includes(user.id);
                          return (
                            <div
                              key={user.id}
                              onClick={() => {
                                setSelectedUsers(prev =>
                                  prev.includes(user.id)
                                    ? prev.filter(id => id !== user.id)
                                    : [...prev, user.id]
                                );
                              }}
                              className="flex items-center gap-2 p-2 rounded-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                {isSelected && (
                                  <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}>
                                  {user.email}
                                </span>
                                <span className="text-xs text-muted-foreground truncate">
                                  {user.role_data?.name || 'No role'} • {user.phoneNumber}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  {/* Selection Summary */}
                  {selectedUsers.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                      <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                        <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                        <span className="text-sm font-medium">
                          {selectedUsers.length} user{selectedUsers.length === 1 ? '' : 's'} selected for notifications
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Advanced Configuration Section */}
          {(formData.keyType === "DIRECT" || formData.keyType === "THRESHOLD" || formData.keyType === "BIT_VALUE") && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded bg-primary"></div>
                </div>
                <h3 className="text-lg font-medium">
                  {formData.keyType === "DIRECT" ? "Direct Value Settings" :
                    formData.keyType === "THRESHOLD" ? "Threshold Settings" : "Bit Configuration"}
                </h3>
                {errors.bits && (
                  <span className="text-sm text-red-500 ml-2">({errors.bits})</span>
                )}
              </div>

              <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
                {formData.keyType === "DIRECT" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <div className="w-3 h-3 rounded bg-slate-400 dark:bg-slate-600"></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Direct Value Configuration
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Set the trigger condition for this boolean alarm
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Trigger Condition
                        </Label>
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 p-4">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id="directTriggerOnTrue"
                              checked={formData.directTriggerOnTrue}
                              onCheckedChange={(checked) =>
                                handleFormChange("directTriggerOnTrue", !!checked)
                              }
                              className="border-slate-300 dark:border-slate-600"
                            />
                            <Label
                              htmlFor="directTriggerOnTrue"
                              className="text-sm font-medium leading-none cursor-pointer text-slate-900 dark:text-slate-100"
                            >
                              Trigger when value is TRUE
                            </Label>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            {formData.directTriggerOnTrue
                              ? 'Alarm activates when the boolean value becomes true'
                              : 'Alarm activates when the boolean value becomes false'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Current Value
                        </Label>
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 p-4 h-11 flex items-center">
                          {formData.key && livePayload[formData.key] !== undefined ? (
                            <div className="flex items-center justify-between w-full">
                              <span className={`font-mono text-lg font-bold ${livePayload[formData.key] === true ? 'text-green-600 dark:text-green-400' :
                                livePayload[formData.key] === false ? 'text-red-600 dark:text-red-400' :
                                  'text-blue-600 dark:text-blue-400'
                                }`}>
                                {String(livePayload[formData.key])}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${formData.directTriggerOnTrue
                                  ? (livePayload[formData.key] === true ? 'bg-green-500' : 'bg-gray-400')
                                  : (livePayload[formData.key] === false ? 'bg-green-500' : 'bg-gray-400')
                                  }`} />
                                <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Waiting for data...</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Real-time boolean value from device
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formData.keyType === "THRESHOLD" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <div className="w-3 h-3 rounded bg-slate-400 dark:bg-slate-600"></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Value Range Configuration
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Set the boundaries that will trigger this alarm when exceeded
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="minValue" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Minimum Value
                          {!formData.maxOnly && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        <Input
                          id="minValue"
                          type="number"
                          value={formData.minValue ?? ""}
                          onChange={(e) =>
                            handleFormChange("minValue", e.target.value)
                          }
                          disabled={formData.maxOnly}
                          placeholder="e.g., 20"
                          className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
                        />
                        {errors.minValue && (
                          <p className="text-xs text-red-500 mt-1">{errors.minValue}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="maxValue" className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Maximum Value <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                          id="maxValue"
                          type="number"
                          value={formData.maxValue ?? ""}
                          onChange={(e) =>
                            handleFormChange("maxValue", e.target.value)
                          }
                          placeholder="e.g., 80"
                          className="h-11 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
                        />
                        {errors.maxValue && (
                          <p className="text-xs text-red-500 mt-1">{errors.maxValue}</p>
                        )}
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Threshold Mode
                        </Label>
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 p-4 h-11">
                          <div className="flex items-center space-x-3 h-full">
                            <Checkbox
                              id="maxOnly"
                              checked={formData.maxOnly}
                              onCheckedChange={(checked) =>
                                handleFormChange("maxOnly", !!checked)
                              }
                              className="border-slate-300 dark:border-slate-600"
                            />
                            <Label
                              htmlFor="maxOnly"
                              className="text-sm font-medium leading-none cursor-pointer text-slate-900 dark:text-slate-100"
                            >
                              Upper limit only
                            </Label>
                          </div>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          When checked, alarm activates only when value exceeds maximum threshold
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                          Current Value
                        </Label>
                        <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-600 p-4 h-11 flex items-center">
                          {formData.key && livePayload[formData.key] !== undefined ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="font-mono text-lg font-bold text-green-600 dark:text-green-400">
                                {livePayload[formData.key]}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${(() => {
                                  const currentVal = Number(livePayload[formData.key]);
                                  const maxVal = formData.maxValue ? Number(formData.maxValue) : null;
                                  const minVal = formData.minValue ? Number(formData.minValue) : null;
                                  if (maxVal !== null && currentVal > maxVal) return 'bg-red-500 animate-pulse';
                                  if (minVal !== null && currentVal < minVal) return 'bg-yellow-500 animate-pulse';
                                  return 'bg-green-500';
                                })()
                                  }`} />
                                <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Waiting for data...</span>
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Real-time value from device
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {formData.keyType === "BIT_VALUE" && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        <div className="w-3 h-3 rounded bg-slate-400 dark:bg-slate-600"></div>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-900 dark:text-slate-100">
                          Bit Field Configuration
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Configure individual bits to monitor within the integer value. Each bit can trigger a separate alarm when set.
                        </p>
                      </div>
                    </div>

                    {/* Current Integer Value Display */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h5 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Current Integer Value
                          </h5>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            This integer value will be decoded into bit fields
                          </p>
                        </div>
                        <div className="text-right space-y-2">
                          {formData.key && livePayload[formData.key] !== undefined ? (
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-2xl font-bold text-blue-600 dark:text-blue-400">
                                {livePayload[formData.key]}
                              </span>
                              <div className="flex flex-col items-end">
                                <div className={`w-2 h-2 rounded-full bg-green-500`} />
                                <span className="text-xs text-slate-500 dark:text-slate-400">Live</span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Waiting for data...</span>
                            </div>
                          )}
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Binary: {formData.key && livePayload[formData.key] !== undefined ? `0b${Number(livePayload[formData.key]).toString(2).padStart(16, '0')}` : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {formData.bits.map((bit, index) => (
                        <div
                          key={index}
                          className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-4 space-y-4 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                              Bit Configuration #{index + 1}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeBit(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Bit Position <span className="text-red-500 ml-1">*</span>
                              </Label>
                              <Select
                                onValueChange={(value) =>
                                  handleBitChange(index, "bit", value)
                                }
                                value={bit.bit}
                              >
                                <SelectTrigger className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100">
                                  <SelectValue placeholder="Select bit..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 16 }).map((_, i) => (
                                    <SelectItem key={i} value={String(i)}>
                                      Bit {i} (2^{i})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {errors[`bit${index}`] && (
                                <p className="text-xs text-red-500 mt-1">{errors[`bit${index}`]}</p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Alarm Description <span className="text-red-500 ml-1">*</span>
                              </Label>
                              <Input
                                value={bit.customName}
                                onChange={(e) =>
                                  handleBitChange(index, "customName", e.target.value)
                                }
                                placeholder="e.g., Door Open Alarm"
                                className="h-9 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-slate-500 dark:focus:border-slate-400"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                Notification Options
                              </Label>
                              <div className="h-9 flex items-center space-x-3">
                                <Checkbox
                                  checked={bit.alertToWhatsApp}
                                  onCheckedChange={(checked) =>
                                    handleBitChange(index, "alertToWhatsApp", !!checked)
                                  }
                                  className="border-slate-300 dark:border-slate-600"
                                />
                                <Label className="text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                  Send WhatsApp notification
                                </Label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      <div className="flex justify-center pt-6">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={addBit}
                          className="flex items-center gap-2 border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                        >
                          <PlusCircle className="h-4 w-4" />
                          Add Bit Configuration
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between border-t pt-6 mt-8">
            <div className="text-xs text-muted-foreground">
              Fields marked with <span className="text-red-500">*</span> are required
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="px-6"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="px-6">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {initialData?.id ? "Update Alarm" : "Create Alarm"}
              </Button>
            </div>
          </DialogFooter>

        </form>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// Main Page Component
// =================================================================
function AlarmManagementPage() {
  const [alarms, setAlarms] = useState<AlarmConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAlarm, setSelectedAlarm] = useState<AlarmConfig | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAlarms, setSelectedAlarms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"customName" | "alarmType" | "device.name">("customName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [visibleItemsCount, setVisibleItemsCount] = useState(20);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [isLazyLoading, setIsLazyLoading] = useState(false);

  // RBAC: menu-level permissions for alarms management
  const { canView, canCreate, canUpdate, canDelete, isDeveloper } = useMenuItemPermissions(
    "security-alarm-management"
  );

  // Confirmation Dialog State
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationDialogContent, setConfirmationDialogContent] = useState<{
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "warning" | "destructive";
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    title: "",
    description: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "info",
    onConfirm: () => { },
  });

  const confirmationDialog = (config: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "warning" | "destructive";
    onConfirm: () => void;
    onCancel?: () => void;
  }) => {
    setConfirmationDialogContent({
      title: config.title,
      description: config.description,
      confirmText: config.confirmText || "Confirm",
      cancelText: config.cancelText || "Cancel",
      type: config.type || "info",
      onConfirm: config.onConfirm,
      onCancel: config.onCancel || (() => setConfirmationDialogOpen(false)),
    });
    setConfirmationDialogOpen(true);
  };

  // Filter and sort alarms
  const processedAlarms = useMemo(() => {
    let filtered = alarms.filter(alarm => {
      const matchesSearch = alarm.customName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alarm.device?.name && alarm.device.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });

    // Sort alarms
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "customName":
          aValue = a.customName.toLowerCase();
          bValue = b.customName.toLowerCase();
          break;
        case "alarmType":
          aValue = a.alarmType;
          bValue = b.alarmType;
          break;
        case "device.name":
          aValue = a.device?.name?.toLowerCase() || "";
          bValue = b.device?.name?.toLowerCase() || "";
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [alarms, searchQuery, sortBy, sortOrder]);

  // Lazy loading logic
  const loadMoreItems = async () => {
    if (isLazyLoading) return;

    setIsLazyLoading(true);

    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const newCount = visibleItemsCount + 20;
    setVisibleItemsCount(newCount);

    // Check if we have more data
    if (newCount >= processedAlarms.length) {
      setHasMoreData(false);
    }

    setIsLazyLoading(false);
  };

  const loadMoreManually = () => {
    loadMoreItems();
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreData && !isLazyLoading) {
          loadMoreItems();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const sentinel = document.getElementById('lazy-load-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMoreData, isLazyLoading, visibleItemsCount, processedAlarms.length]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItemsCount(20);
    setHasMoreData(true);
    setCurrentPage(1);
  }, [searchQuery]);

  const fetchAlarms = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/alarms");
      if (!response.ok) throw new Error("Failed to fetch alarms");
      setAlarms(await response.json());
    } catch (error: any) {
      console.error(error);
      showToast.error("Failed to fetch alarms", error.message || "Could not fetch alarm configurations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) {
      fetchAlarms();
    }
  }, [canView, fetchAlarms]);

  // If user cannot view and not a developer, show access denied
  if (!canView && !isDeveloper) {
    return <AccessDenied title="Access Denied" message="You do not have permission to view Alarm Management." onRetry={() => window.location.reload()} />;
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedAlarms(processedAlarms.map(a => a.id));
    } else {
      setSelectedAlarms([]);
    }
  };

  const handleSelectAlarm = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedAlarms(prev => [...prev, id]);
    } else {
      setSelectedAlarms(prev => prev.filter(alarmId => alarmId !== id));
    }
  };

  const handleBulkDelete = () => {
    const alarmsToDelete = selectedAlarms;
    if (alarmsToDelete.length === 0) return;

    confirmationDialog({
      type: "destructive",
      title: "Delete Multiple Alarms",
      description: `Are you sure you want to delete ${alarmsToDelete.length} alarm(s)? This action cannot be undone.`,
      confirmText: "Yes, delete all",
      cancelText: "Cancel",
      onConfirm: async () => {
        let successCount = 0;
        let errorCount = 0;

        for (const id of alarmsToDelete) {
          try {
            const response = await fetch(`/api/alarms/${id}`, { method: "DELETE" });
            if (response.ok) {
              successCount++;
            } else {
              errorCount++;
            }
          } catch (error) {
            errorCount++;
          }
        }

        showToast.success(`Deleted ${successCount} alarm(s)`);
        if (errorCount > 0) {
          showToast.error(`Failed to delete ${errorCount} alarm(s)`);
        }

        fetchAlarms();
        setSelectedAlarms([]);
      },
    });
  };

  const handleSort = (column: "customName" | "alarmType" | "device.name") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const handleDuplicate = (alarm: AlarmConfig) => {
    if (!canCreate && !isDeveloper) return;
    const { id, ...rest } = alarm;
    const duplicate = {
      ...rest,
      id: "",
      customName: `${alarm.customName} (Copy)`
    };
    setSelectedAlarm(duplicate as AlarmConfig);
    setIsDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success(`${label} copied to clipboard`);
    } catch (err) {
      showToast.error("Could not copy to clipboard");
    }
  };

  const handleAdd = () => {
    if (!canCreate && !isDeveloper) return;
    setSelectedAlarm(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (alarm: AlarmConfig) => {
    if (!canUpdate && !isDeveloper) return;
    setSelectedAlarm(alarm);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    confirmationDialog({
      type: "destructive",
      title: "Delete Alarm",
      description: "Are you sure you want to delete this alarm? This action cannot be undone.",
      confirmText: "Yes, delete it",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/alarms/${id}`, {
            method: "DELETE",
          });
          if (!response.ok) throw new Error("Failed to delete alarm.");
          showToast.success("The alarm has been deleted.");
          fetchAlarms();
        } catch (error: any) {
          showToast.error("Deletion failed", error.message);
        }
      },
    });
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Alarm Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Define, view, and manage all system alarm configurations</p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <ImportExportButtons
            exportUrl="/api/alarm-configurations/export"
            importUrl="/api/alarm-configurations/import"
            onImportSuccess={fetchAlarms}
            itemName="Alarm Configurations"
          />
          {(canCreate || isDeveloper) && (
            <Button onClick={handleAdd}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Alarm
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bell className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Alarms</p>
                <p className="text-2xl font-bold">{alarms.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {alarms.filter(a => a.alarmType === 'CRITICAL').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-6 w-6 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Major</p>
                <p className="text-2xl font-bold text-orange-600">
                  {alarms.filter(a => a.alarmType === 'MAJOR').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Info className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Minor</p>
                <p className="text-2xl font-bold text-blue-600">
                  {alarms.filter(a => a.alarmType === 'MINOR').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search & Filter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search alarms by name or device..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear Filters
                </Button>
                {selectedAlarms.length > 0 && (canDelete || isDeveloper) && (
                  <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedAlarms.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Active Filters Display */}
            {searchQuery && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                <Badge variant="secondary" className="gap-1">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alarms List
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {processedAlarms.slice(0, visibleItemsCount).length} of {processedAlarms.length} alarms
            </div>
          </CardTitle>
          <CardDescription>
            All alarm configurations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            {alarms.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarms</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first alarm configuration.
                </p>
              </div>
            ) : processedAlarms.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarms found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search criteria.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedAlarms.length === processedAlarms.length && processedAlarms.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("device.name")} className="h-auto p-0 font-semibold">
                        Device
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("customName")} className="h-auto p-0 font-semibold">
                        Alarm Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("alarmType")} className="h-auto p-0 font-semibold">
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Key Type</TableHead>
                    <TableHead>Configuration Details</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedAlarms.slice(0, visibleItemsCount).map((alarm) => (
                    <TableRow key={alarm.id} className="group">
                      <TableCell>
                        <Checkbox
                          checked={selectedAlarms.includes(alarm.id)}
                          onCheckedChange={(checked) => handleSelectAlarm(alarm.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-96" title={alarm.device?.name || "N/A"}>
                            {alarm.device?.name || "N/A"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(alarm.device?.name || "N/A", "Device name")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-96" title={alarm.customName}>
                            {alarm.customName}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard(alarm.customName, "Alarm name")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            alarm.alarmType === "CRITICAL"
                              ? "destructive"
                              : alarm.alarmType === "MAJOR"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {alarm.alarmType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{alarm.keyType}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground max-w-sm">
                          {(() => {
                            if (alarm.keyType === "DIRECT") {
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Key:</span>
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{alarm.key}</code>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Trigger:</span>
                                    <Badge variant={alarm.directTriggerOnTrue !== false ? "default" : "secondary"} className="text-xs">
                                      {alarm.directTriggerOnTrue !== false ? 'TRUE' : 'FALSE'}
                                    </Badge>
                                  </div>
                                </div>
                              );
                            } else if (alarm.keyType === "THRESHOLD") {
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Key:</span>
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{alarm.key}</code>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Range:</span>
                                    <span className="text-xs">
                                      {alarm.maxOnly ? `≤ ${alarm.maxValue}` : `${alarm.minValue} - ${alarm.maxValue}`}
                                    </span>
                                  </div>
                                </div>
                              );
                            } else if (alarm.keyType === "BIT_VALUE") {
                              const bitCount = alarm.bits?.length || 0;
                              return (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Key:</span>
                                    <code className="bg-muted px-1 py-0.5 rounded text-xs">{alarm.key}</code>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">Bits:</span>
                                    <Badge variant="outline" className="text-xs">
                                      {bitCount} configured
                                    </Badge>
                                  </div>
                                </div>
                              );
                            }
                            return <span>N/A</span>;
                          })()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {(alarm as any).notificationRecipients?.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-xs font-medium text-green-700">
                                  {(alarm as any).notificationRecipients.length} users
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 max-w-xs">
                                {(alarm as any).notificationRecipients.slice(0, 2).map((recipient: any, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="outline"
                                    className="text-xs bg-green-50 text-green-700 border-green-200"
                                  >
                                    {recipient.user?.email || recipient.userId}
                                  </Badge>
                                ))}
                                {(alarm as any).notificationRecipients.length > 2 && (
                                  <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500">
                                    +{(alarm as any).notificationRecipients.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-400 rounded-full" />
                              <span className="text-xs text-gray-500">No recipients</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent side="left" align="start">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            {(canUpdate || isDeveloper) && (
                              <DropdownMenuItem onClick={() => handleEdit(alarm)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {(canCreate || isDeveloper) && (
                              <DropdownMenuItem onClick={() => handleDuplicate(alarm)}>
                                <CopyPlus className="mr-2 h-4 w-4" />
                                Duplicate
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {(canDelete || isDeveloper) && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(alarm.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-4">
            {processedAlarms.slice(0, visibleItemsCount).map((alarm) => (
              <Card key={alarm.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedAlarms.includes(alarm.id)}
                        onCheckedChange={(checked) => handleSelectAlarm(alarm.id, checked as boolean)}
                        className="flex-shrink-0"
                      />
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Bell className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{alarm.customName}</h3>
                          <Badge
                            variant={
                              alarm.alarmType === "CRITICAL"
                                ? "destructive"
                                : alarm.alarmType === "MAJOR"
                                  ? "warning"
                                  : "secondary"
                            }
                            className="text-xs flex-shrink-0"
                          >
                            {alarm.alarmType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${(alarm as any).notificationRecipients?.length > 0 ? 'bg-green-500' : 'bg-gray-400'
                            } flex-shrink-0`} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {(alarm as any).notificationRecipients?.length || 0} recipients
                          </span>
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {(canUpdate || isDeveloper) && (
                          <DropdownMenuItem onClick={() => handleEdit(alarm)} className="text-xs">
                            <Edit className="h-3 w-3 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        {(canDelete || isDeveloper) && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(alarm.id)}
                            className="text-destructive text-xs"
                          >
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Device */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Device:</span>
                      <span className="text-xs font-medium truncate">
                        {alarm.device?.name || 'Not specified'}
                      </span>
                    </div>
                  </div>

                  {/* Key Type */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Type:</span>
                      <Badge variant="outline" className="text-xs">
                        {alarm.keyType}
                      </Badge>
                    </div>
                  </div>

                  {/* Configuration Preview */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        Key: <code className="bg-muted px-1 py-0.5 rounded text-xs">{alarm.key}</code>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {processedAlarms.length === 0 && alarms.length > 0 && (
            <div className="text-center py-8 lg:hidden">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarms found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search criteria.
              </p>
            </div>
          )}

          {alarms.length === 0 && (
            <div className="text-center py-8 lg:hidden">
              <Bell className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarms</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first alarm configuration.
              </p>
            </div>
          )}

          {/* Lazy Loading Sentinel */}
          {hasMoreData && processedAlarms.length > 0 && (
            <div
              id="lazy-load-sentinel"
              className="flex justify-center py-8"
            >
              {isLazyLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading more alarms...</span>
                </div>
              ) : (
                <Button variant="outline" onClick={loadMoreManually}>
                  Load More Alarms
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {processedAlarms.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(processedAlarms.length / itemsPerPage)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(processedAlarms.length / itemsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlarmDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={fetchAlarms}
        initialData={selectedAlarm}
      />

      <ConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        type={confirmationDialogContent.type || "info"}
        title={confirmationDialogContent.title}
        description={confirmationDialogContent.description}
        confirmText={confirmationDialogContent.confirmText || "Confirm"}
        cancelText={confirmationDialogContent.cancelText || "Cancel"}
        onConfirm={confirmationDialogContent.onConfirm}
        onCancel={confirmationDialogContent.onCancel || (() => setConfirmationDialogOpen(false))}
      />
    </div>
  );
}

// --- Main Export ---
export default AlarmManagementPage;
