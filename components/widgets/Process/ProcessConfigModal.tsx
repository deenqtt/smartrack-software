// File: components/widgets/Process/ProcessConfigModal.tsx
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
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";

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
    deviceUniqId?: string;
    selectedKey?: string;
    name?: string;
    desc?: string;
    processType?: string;
    units?: string;
  };
}

const processTypes = [
  { value: "tank", label: "Tank" },
  { value: "rectangle", label: "Rectangle" },
  { value: "circle", label: "Circle" },
  { value: "triangle", label: "Triangle" },
];

export const ProcessConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // State untuk form
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [processType, setProcessType] = useState("rectangle");
  const [units, setUnits] = useState("");

  // State untuk key yang didapat dari MQTT
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

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

      // Load initial values if editing
      if (initialConfig) {
        setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
        setSelectedKey(initialConfig.selectedKey || null);
        setName(initialConfig.name || "");
        setDesc(initialConfig.desc || "");
        setProcessType(initialConfig.processType || "rectangle");
        setUnits(initialConfig.units || "");
      }
    } else {
      // Reset form saat modal ditutup
      setTimeout(() => {
        setSelectedDeviceUniqId(null);
        setSelectedKey(null);
        setName("");
        setDesc("");
        setProcessType("rectangle");
        setUnits("");
        setAvailableKeys([]);
        setIsWaitingForKey(false);
      }, 200);
    }
  }, [isOpen, onClose, initialConfig]);

  // Logika untuk subscribe & unsubscribe MQTT
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        let keys: string[] = [];

        // Check if payload has 'value' property (standard format)
        if (payload.hasOwnProperty("value")) {
          if (typeof payload.value === "string") {
            const innerPayload = JSON.parse(payload.value);
            keys = Object.keys(innerPayload);
          } else if (
            typeof payload.value === "object" &&
            payload.value !== null
          ) {
            keys = Object.keys(payload.value);
          }
        }
        // Direct payload format (no 'value' wrapper)
        else {
          keys = Object.keys(payload);
        }

        if (keys.length > 0) {
          setAvailableKeys(keys);
        } else {
          console.warn("No keys found in payload:", payload);
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        // Langsung unsubscribe setelah mendapat data pertama
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

    // Unsubscribe dari topik lama jika ada
    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    // Subscribe ke topik baru jika valid dan berbeda
    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    // Cleanup saat komponen unmount atau modal ditutup
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
  ]);

  // Handler saat mengganti perangkat di dropdown
  const handleDeviceChange = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const handleSave = () => {
    if (!selectedDeviceUniqId || !selectedKey || !name || !processType) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }
    onSave({
      deviceUniqId: selectedDeviceUniqId,
      selectedKey,
      name,
      desc,
      processType,
      units,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {initialConfig ? "Edit Process Widget" : "Configure Process Widget"}
          </DialogTitle>
          <DialogDescription>
            Configure industrial process monitoring with custom shapes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-6">
          {/* Device Selection Section */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border">
            <h4 className="text-sm font-medium text-slate-700">
              Device Configuration
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="device">Device *</Label>
                {isLoadingDevices ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    onValueChange={handleDeviceChange}
                    value={selectedDeviceUniqId || ""}
                  >
                    <SelectTrigger id="device">
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="key">Data Key *</Label>
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
                  availableKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No keys received. Ensure the device is publishing data.
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Process Configuration Section */}
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
            <h4 className="text-sm font-medium text-slate-700">
              Process Properties
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Process Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Main Tank, Reactor A"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Input
                  id="desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g., Primary storage tank"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="processType">Process Type *</Label>
                  <Select onValueChange={setProcessType} value={processType}>
                    <SelectTrigger id="processType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {processTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="units">Units (Optional)</Label>
                  <Input
                    id="units"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="e.g., °C, %, kW"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
