// File: components/widgets/CalculatedParameter/CalculatedParameterConfigModal.tsx
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
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { PlusCircle, Trash2, Info, Search, Check } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Operand {
  id: string;
  deviceUniqId: string | null;
  selectedKey: string | null;
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
    calculation: string;
    units: string;
    operands: Array<{
      deviceUniqId: string;
      selectedKey: string;
    }>;
  };
}

// Calculation descriptions
const CALCULATION_DESCRIPTIONS: Record<string, string> = {
  SUM: "Add all values together: A + B + C + ...",
  AVERAGE: "Calculate mean: (A + B + C + ...) / count",
  MIN: "Find the lowest value",
  MAX: "Find the highest value",
  DIFFERENCE: "Subtract second from first: A - B",
};

// Operand Form Component
const OperandForm = ({
  operand,
  updateOperand,
  removeOperand,
  allDevices,
  isLoadingDevices,
  isEditMode,
  operandIndex,
}: {
  operand: Operand;
  updateOperand: (id: string, field: keyof Operand, value: any) => void;
  removeOperand: (id: string) => void;
  allDevices: DeviceForSelection[];
  isLoadingDevices: boolean;
  isEditMode: boolean;
  operandIndex: number;
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const subscribedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (isEditMode && operand.selectedKey) {
      setAvailableKeys([operand.selectedKey]);
    }
  }, [isEditMode, operand.selectedKey]);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, serverId: string, retained?: boolean) => {
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
        console.error("Failed to parse MQTT payload in operand form:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const selectedDevice = allDevices.find(
      (d) => d.uniqId === operand.deviceUniqId
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
    operand.deviceUniqId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    isEditMode,
  ]);

  const handleDeviceChange = (uniqId: string) => {
    updateOperand(operand.id, "deviceUniqId", uniqId);
    updateOperand(operand.id, "selectedKey", null);
    if (!isEditMode || uniqId !== operand.deviceUniqId) {
      setAvailableKeys([]);
    }
    setDeviceSearchOpen(false);
  };

  const selectedDevice = allDevices.find(
    (d) => d.uniqId === operand.deviceUniqId
  );

  return (
    <div className="flex flex-col gap-4 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      {/* Header dengan Operand label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">
              {String.fromCharCode(65 + operandIndex)}
            </span>
          </div>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Operand {String.fromCharCode(65 + operandIndex)}
          </span>
        </div>
        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
          onClick={() => removeOperand(operand.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Form fields */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Device Selection with Search */}
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">Device *</Label>
          {isLoadingDevices ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={deviceSearchOpen}
                  className={`h-10 w-full justify-between text-left font-normal ${operand.deviceUniqId
                      ? "border-green-500 bg-green-50 dark:bg-green-950/10"
                      : ""
                    }`}
                >
                  {operand.deviceUniqId
                    ? (() => {
                      const device = allDevices.find(
                        (d) => d.uniqId === operand.deviceUniqId
                      );
                      return device ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {device.name}
                          </span>
                          <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                        </div>
                      ) : (
                        "Select device..."
                      );
                    })()
                    : "Select device..."}
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
                      <p className="text-sm text-muted-foreground">
                        No devices found
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Try adjusting your search terms
                      </p>
                    </div>
                  </CommandEmpty>
                  <CommandGroup className="max-h-64 overflow-auto">
                    {allDevices
                      .filter((device) => {
                        if (!deviceSearchQuery) return true;
                        const searchValue = deviceSearchQuery.toLowerCase();
                        return device.name.toLowerCase().includes(searchValue);
                      })
                      .map((device) => (
                        <CommandItem
                          key={device.uniqId}
                          value={device.uniqId}
                          onSelect={() => handleDeviceChange(device.uniqId)}
                          className="cursor-pointer hover:bg-accent"
                        >
                          <div className="flex items-center gap-3 w-full">
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <span className="font-medium truncate">
                                {device.name}
                              </span>
                            </div>
                            {operand.deviceUniqId === device.uniqId && (
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                  <div className="border-t p-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-between">
                      <span>{allDevices.length} devices available</span>
                      <span>↑↓ to navigate • Enter to select</span>
                    </div>
                  </div>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <div className="text-xs text-muted-foreground px-1">
            {operand.deviceUniqId ? (
              <span className="text-green-600 dark:text-green-400">✓ Device selected</span>
            ) : (
              <span>Choose a device to monitor for data</span>
            )}
          </div>
        </div>

        {/* Data Key Selection */}
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">
            Data Key *
          </Label>
          <Select
            onValueChange={(value) =>
              updateOperand(operand.id, "selectedKey", value)
            }
            value={operand.selectedKey || ""}
            disabled={!operand.deviceUniqId || availableKeys.length === 0}
          >
            <SelectTrigger
              className={`dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 disabled:opacity-50 ${operand.selectedKey
                  ? "border-green-500 bg-green-50 dark:bg-green-950/10"
                  : ""
                }`}
            >
              <SelectValue
                placeholder={isWaitingForKey ? "Waiting..." : "Select a key"}
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
          {operand.deviceUniqId && (
            <div className="text-xs mt-1 flex items-center gap-1">
              {isWaitingForKey ? (
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 animate-pulse">
                  <div className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin"></div>
                  <span>Waiting for real-time data...</span>
                </div>
              ) : availableKeys.length === 0 && !isEditMode ? (
                <p className="text-yellow-600 dark:text-yellow-400">
                  No data available from this device
                </p>
              ) : availableKeys.length > 0 ? (
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
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const CalculatedParameterConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [operands, setOperands] = useState<Operand[]>([]);
  const [widgetTitle, setWidgetTitle] = useState("");
  const [calculationType, setCalculationType] = useState("SUM");
  const [units, setUnits] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.title || "");
      setCalculationType(initialConfig.calculation || "SUM");
      setUnits(initialConfig.units || "");

      const loadedOperands: Operand[] = initialConfig.operands.map(
        (op, index) => ({
          id: `op-${Date.now()}-${index}`,
          deviceUniqId: op.deviceUniqId || null,
          selectedKey: op.selectedKey || null,
        })
      );

      setOperands(loadedOperands);
    } else if (isOpen) {
      setIsEditMode(false);
      setOperands([]);
      setWidgetTitle("");
      setCalculationType("SUM");
      setUnits("");
      addOperand();
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

  const addOperand = () => {
    setOperands((prev) => [
      ...prev,
      {
        id: `op-${Date.now()}`,
        deviceUniqId: null,
        selectedKey: null,
      },
    ]);
  };

  const removeOperand = (id: string) => {
    if (operands.length > 1) {
      setOperands((prev) => prev.filter((op) => op.id !== id));
    }
  };

  const updateOperand = (id: string, field: keyof Operand, value: any) => {
    setOperands((prev) =>
      prev.map((op) => (op.id === id ? { ...op, [field]: value } : op))
    );
  };

  const handleSave = () => {
    if (!widgetTitle || operands.length === 0) {
      showToast.warning(
        "Incomplete",
        "Widget title and at least one operand are required."
      );
      return;
    }
    for (const op of operands) {
      if (!op.deviceUniqId || !op.selectedKey) {
        showToast.warning(
          "Incomplete",
          "Please complete all fields for all operands."
        );
        return;
      }
    }

    onSave({
      title: widgetTitle,
      calculation: calculationType,
      units,
      operands: operands.map(({ id, ...rest }) => rest),
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[95vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 flex-shrink-0">
          <DialogTitle className="text-xl font-bold">
            {isEditMode
              ? "Edit Calculated Parameter"
              : "Configure Calculated Parameter"}
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {isEditMode
              ? "Update your calculated parameter configuration."
              : "Define a calculation based on multiple real-time data points."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 flex-1 overflow-hidden">
          {/* Kolom Kiri: Widget Configuration */}
          <div className="space-y-6 overflow-y-auto pr-2">
            {/* Title */}
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Widget Title *
              </Label>
              <Input
                value={widgetTitle}
                onChange={(e) => setWidgetTitle(e.target.value)}
                placeholder="e.g., Total Power Consumption"
                className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>

            {/* Calculation Type */}
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Calculation Type *
              </Label>
              <Select
                onValueChange={setCalculationType}
                value={calculationType}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                  <SelectItem value="SUM">SUM - Add all values</SelectItem>
                  <SelectItem value="AVERAGE">
                    AVERAGE - Calculate mean
                  </SelectItem>
                  <SelectItem value="MIN">MIN - Lowest value</SelectItem>
                  <SelectItem value="MAX">MAX - Highest value</SelectItem>
                  <SelectItem value="DIFFERENCE">
                    DIFFERENCE - First minus second
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* Calculation Description */}
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {CALCULATION_DESCRIPTIONS[calculationType]}
                </p>
              </div>
            </div>

            {/* Units */}
            <div className="grid gap-2">
              <Label className="text-slate-700 dark:text-slate-300">
                Units
              </Label>
              <Input
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="e.g., kW, A, %"
                className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Kolom Kanan: Operands */}
          <div className="space-y-4 flex flex-col h-full">
            <div className="flex items-center justify-between">
              <Label className="text-slate-700 dark:text-slate-300 text-base font-semibold">
                Data Sources
              </Label>
              <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-full font-semibold">
                {operands.length} source{operands.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="space-y-3.5 flex-1 overflow-y-auto pr-2">
              {operands.map((op, index) => (
                <div key={op.id}>
                  <OperandForm
                    operand={op}
                    updateOperand={updateOperand}
                    removeOperand={removeOperand}
                    allDevices={devices}
                    isLoadingDevices={isLoadingDevices}
                    isEditMode={isEditMode}
                    operandIndex={index}
                  />
                </div>
              ))}
            </div>

            {/* Add Operand Button */}
            <Button
              variant="outline"
              onClick={addOperand}
              className="w-full dark:border-slate-600 dark:hover:bg-slate-800"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Data Source
            </Button>

            {/* Helper text */}
            <p className="text-xs text-slate-500 dark:text-slate-400 px-2">
              Tip: Use 2+ sources. For DIFFERENCE, order matters (A - B).
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end gap-2 border-t">
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
