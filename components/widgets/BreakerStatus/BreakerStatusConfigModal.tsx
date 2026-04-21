// File: components/widgets/BreakerStatus/BreakerStatusConfigModal.tsx
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
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/lib/toast-utils";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, Trash2 } from "lucide-react";

// Tipe untuk data perangkat dari respons MQTT
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

// Komponen kecil untuk memilih Device -> Key
const KeySelector = ({
  title,
  devices,
  onSelectionChange,
  selectedTopic,
  selectedKey,
}: {
  title: string;
  devices: MqttDevice[];
  onSelectionChange: (topic: string, key: string | null) => void;
  selectedTopic: string | null;
  selectedKey: string | null;
}) => {
  const { subscribe, unsubscribe } = useMqtt();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const keySubTopicRef = useRef<string | null>(null);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error(e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        keySubTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const currentSubTopic = keySubTopicRef.current;
    if (currentSubTopic && currentSubTopic !== selectedTopic) {
      unsubscribe(currentSubTopic, handleMqttMessage);
      keySubTopicRef.current = null;
    }
    if (selectedTopic && selectedTopic !== keySubTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(selectedTopic, handleMqttMessage);
      keySubTopicRef.current = selectedTopic;
    }
  }, [selectedTopic, subscribe, unsubscribe, handleMqttMessage]);

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
      <p className="font-semibold text-sm">{title}</p>
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label>Device</Label>
          <Select
            onValueChange={(topic) => onSelectionChange(topic, null)}
            value={selectedTopic || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select device" />
            </SelectTrigger>
            <SelectContent>
              {devices.map((d) => (
                <SelectItem key={d.profile.topic} value={d.profile.topic}>
                  {d.profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Data Key</Label>
          <Select
            onValueChange={(key) => {
              if (selectedTopic) {
                onSelectionChange(selectedTopic, key);
              }
            }}
            value={selectedKey || ""}
            disabled={!selectedTopic || availableKeys.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={isWaitingForKey ? "Waiting..." : "Select key"}
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
        </div>
      </div>
    </div>
  );
};

export const BreakerStatusConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();
  const [widgetTitle, setWidgetTitle] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [deviceType, setDeviceType] = useState<"modbus" | "i2c" | null>(null);
  const [devices, setDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const responseTopicRef = useRef<string | null>(null);

  // State untuk parameter utama (ON/OFF)
  const [monitoringTopic, setMonitoringTopic] = useState<string | null>(null);
  const [monitoringKey, setMonitoringKey] = useState<string | null>(null);
  const [onValue, setOnValue] = useState("1");
  const [offValue, setOffValue] = useState("0");

  // State untuk parameter TRIP
  const [isTripEnabled, setIsTripEnabled] = useState(false);
  const [tripTopic, setTripTopic] = useState<string | null>(null);
  const [tripKey, setTripKey] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setWidgetTitle(initialConfig.widgetTitle || "");
      setIsTripEnabled(initialConfig.isTripEnabled || false);
      if (initialConfig.monitoring) {
        setMonitoringTopic(initialConfig.monitoring.deviceTopic || null);
        setMonitoringKey(initialConfig.monitoring.selectedKey || null);
        setOnValue(initialConfig.monitoring.onValue || "1");
        setOffValue(initialConfig.monitoring.offValue || "0");
      }
      if (initialConfig.trip) {
        setTripTopic(initialConfig.trip.deviceTopic || null);
        setTripKey(initialConfig.trip.selectedKey || null);
      }
    } else if (isOpen) {
      setIsEditMode(false);
      setWidgetTitle("");
      setDeviceType(null);
      setMonitoringTopic(null);
      setMonitoringKey(null);
      setOnValue("1");
      setOffValue("0");
      setIsTripEnabled(false);
      setTripTopic(null);
      setTripKey(null);
    }
  }, [isOpen, initialConfig]);

  const handleDeviceListResponse = useCallback(
    (topic: string, payloadString: string, retained?: boolean) => {
      if (retained) return;
      try {
        const parsed = JSON.parse(payloadString);
        if (Array.isArray(parsed)) {
          if (parsed.length === 0) return;
          const mappedDevices = parsed.map((d: any) => ({
            ...d,
            profile: d.profile || {
              name: d.name,
              topic: d.topic,
              part_number: d.part_number
            }
          }));
          setDevices(mappedDevices as MqttDevice[]);
          setIsLoadingDevices(false);
          if (responseTopicRef.current) {
            unsubscribe(responseTopicRef.current, handleDeviceListResponse);
            responseTopicRef.current = null;
          }
        } else if (parsed && typeof parsed === "object" && parsed.status === "error") {
          showToast.error("Error", parsed.message || "Failed to fetch devices");
          setIsLoadingDevices(false);
          if (responseTopicRef.current) {
            unsubscribe(responseTopicRef.current, handleDeviceListResponse);
            responseTopicRef.current = null;
          }
        } else {
          console.warn("Ignored non-array payload:", parsed);
        }
      } catch (e) {
        console.error("Parse error:", e);
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    if (!deviceType || !isReady) return;
    const commandTopic =
      deviceType === "modbus" ? "command_device_modbus" : "command_device_i2c";
    const responseTopic =
      deviceType === "modbus" ? "response_device_modbus" : "response_device_i2c";
    const payload = {
      command: deviceType === "modbus" ? "getDataModbus" : "getDataI2C",
    };

    setDevices([]);
    setMonitoringTopic(null);
    setMonitoringKey(null);
    setTripTopic(null);
    setTripKey(null);
    setIsLoadingDevices(true);

    subscribe(responseTopic, handleDeviceListResponse);
    responseTopicRef.current = responseTopic;
    publish(commandTopic, JSON.stringify(payload));

    const timeout = setTimeout(() => {
      if (responseTopicRef.current) {
        setIsLoadingDevices(false);
        unsubscribe(responseTopicRef.current, handleDeviceListResponse);
        responseTopicRef.current = null;
        showToast.error("Timeout", "Device list fetch timed out.");
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
    };
  }, [deviceType, isReady, publish, subscribe, handleDeviceListResponse, unsubscribe]);

  const handleSave = () => {
    if (!widgetTitle || !monitoringTopic || !monitoringKey) {
      showToast.warning(
        "Incomplete",
        "All fields are required."
      );
      return;
    }
    if (isTripEnabled && (!tripTopic || !tripKey)) {
      showToast.warning(
        "Incomplete",
        "All fields are required."
      );
      return;
    }
    onSave({
      widgetTitle,
      isTripEnabled,
      monitoring: {
        deviceTopic: monitoringTopic,
        selectedKey: monitoringKey,
        onValue,
        offValue,
      },
      trip: isTripEnabled
        ? {
          deviceTopic: tripTopic,
          selectedKey: tripKey,
        }
        : null,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {isEditMode ? "Edit Breaker Status" : "Configure Breaker Status"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? "Update your breaker status widget configuration."
              : "Configure monitoring and optional trip parameters for the breaker."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Main Breaker"
            />
          </div>
          <div className="grid gap-2">
            <Label>Device Type</Label>
            <Select
              onValueChange={(v) => setDeviceType(v as any)}
              value={deviceType || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select device type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modbus">Modbus</SelectItem>
                <SelectItem value="i2c">Modular / Modbit (I2C)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deviceType &&
            (isLoadingDevices ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <KeySelector
                  title="Monitoring Parameter (ON/OFF)"
                  devices={devices}
                  selectedTopic={monitoringTopic}
                  selectedKey={monitoringKey}
                  onSelectionChange={(topic, key) => {
                    setMonitoringTopic(topic);
                    setMonitoringKey(key);
                  }}
                />
                <div className="grid grid-cols-2 gap-4 px-4">
                  <div className="grid gap-2">
                    <Label>Value for ON</Label>
                    <Input
                      value={onValue}
                      onChange={(e) => setOnValue(e.target.value)}
                      placeholder="e.g., 1 or true"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Value for OFF</Label>
                    <Input
                      value={offValue}
                      onChange={(e) => setOffValue(e.target.value)}
                      placeholder="e.g., 0 or false"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2 p-4 border rounded-lg">
                  <Checkbox
                    id="trip-enabled"
                    checked={isTripEnabled}
                    onCheckedChange={(checked) =>
                      setIsTripEnabled(Boolean(checked))
                    }
                  />
                  <Label htmlFor="trip-enabled" className="font-semibold">
                    Enable Trip Status
                  </Label>
                </div>
                {isTripEnabled && (
                  <KeySelector
                    title="Trip Parameter"
                    devices={devices}
                    selectedTopic={tripTopic}
                    selectedKey={tripKey}
                    onSelectionChange={(topic, key) => {
                      setTripTopic(topic);
                      setTripKey(key);
                    }}
                  />
                )}
              </>
            ))}
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
