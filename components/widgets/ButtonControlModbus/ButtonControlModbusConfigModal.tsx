// File: components/widgets/ButtonControlModbus/ButtonControlModbusConfigModal.tsx
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
import { showToast } from "@/lib/toast-utils";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2 } from "lucide-react";

// Tipe untuk data perangkat dari respons MQTT
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
  };
  protocol_setting: any;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    selectedDevice: MqttDevice;
    selectedKey: string;
    onValue: string;
    offValue: string;
  };
}

export const ButtonControlModbusConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || ""
  );
  const [devices, setDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const responseTopicRef = useRef<string | null>(null);
  const keySubTopicRef = useRef<string | null>(null);

  const [selectedDevice, setSelectedDevice] = useState<MqttDevice | null>(
    initialConfig?.selectedDevice || null
  );
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(
    initialConfig?.selectedKey || null
  );
  const [onValue, setOnValue] = useState(initialConfig?.onValue || "1");
  const [offValue, setOffValue] = useState(initialConfig?.offValue || "0");

  const initialTopicRef = useRef(initialConfig?.selectedDevice?.profile.topic);

  useEffect(() => {
    initialTopicRef.current = initialConfig?.selectedDevice?.profile.topic;
  }, [initialConfig]);

  useEffect(() => {
    if (isOpen && isReady) {
      // Set initial values if in edit mode, otherwise reset
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setSelectedDevice(initialConfig.selectedDevice);
        setSelectedKey(initialConfig.selectedKey);
        setOnValue(initialConfig.onValue);
        setOffValue(initialConfig.offValue);
      } else {
        setWidgetTitle("");
        setSelectedDevice(null);
        setSelectedKey(null);
        setOnValue("1");
        setOffValue("0");
      }
      setDevices([]); // Always refetch devices
      setAvailableKeys([]); // Always refetch keys
      setIsLoadingDevices(true);

      const commandTopic = "command_device_modbus";
      const responseTopic = "response_device_modbus";
      const payload = { command: "getDataModbus" };

      let isComponentActive = true;
      const handleDeviceListResponse = (topic: string, payloadString: string, retained?: boolean) => {
        if (!isComponentActive) return;
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
            unsubscribe(responseTopic, handleDeviceListResponse);
            responseTopicRef.current = null;
            isComponentActive = false;
          } else if (parsed && typeof parsed === "object" && parsed.status === "error") {
            showToast.error("Error", parsed.message || "Failed to fetch devices");
            setIsLoadingDevices(false);
            unsubscribe(responseTopic, handleDeviceListResponse);
            responseTopicRef.current = null;
            isComponentActive = false;
          } else {
            console.warn("Ignored non-array payload:", parsed);
          }
        } catch (e) {
          console.error("Failed to parse device list:", e);
        }
      };

      subscribe(responseTopic, handleDeviceListResponse);
      responseTopicRef.current = responseTopic;
      publish(commandTopic, JSON.stringify(payload));

      const timeoutTimer = setTimeout(() => {
        if (isComponentActive && responseTopicRef.current) {
          setIsLoadingDevices(false);
          unsubscribe(responseTopicRef.current, handleDeviceListResponse);
          responseTopicRef.current = null;
          isComponentActive = false;
          showToast.error("Timeout", "Failed to fetch devices in time.");
        }
      }, 5000);

      // We should return a cleanup function here for useEffect
      return () => {
        isComponentActive = false;
        clearTimeout(timeoutTimer);
        if (responseTopicRef.current) {
          unsubscribe(responseTopicRef.current, handleDeviceListResponse);
          responseTopicRef.current = null;
        }
      };
    }
  }, [isOpen, isReady, publish, subscribe, unsubscribe]);

  const handleMqttKeyResponse = useCallback(
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
        unsubscribe(topic, handleMqttKeyResponse);
        keySubTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const topic = selectedDevice?.profile.topic;
    if (keySubTopicRef.current && keySubTopicRef.current !== topic) {
      unsubscribe(keySubTopicRef.current, handleMqttKeyResponse);
    }
    if (topic && topic !== keySubTopicRef.current) {
      setAvailableKeys([]);
      // Only set isWaitingForKey to true if we are actually fetching new keys
      if (
        !initialTopicRef.current ||
        initialTopicRef.current !== topic
      ) {
        setIsWaitingForKey(true);
      }
      subscribe(topic, handleMqttKeyResponse);
      keySubTopicRef.current = topic;
    }
  }, [
    selectedDevice,
    subscribe,
    unsubscribe,
    handleMqttKeyResponse,
  ]);

  const handleDeviceChange = (topic: string) => {
    const device = devices.find((d) => d.profile.topic === topic);
    setSelectedDevice(device || null);
    setSelectedKey(null);
  };

  const handleSave = () => {
    if (!widgetTitle || !selectedDevice || !selectedKey) {
      showToast.warning("Incomplete", "All fields are required.");
      return;
    }
    onSave({
      widgetTitle,
      // --- INI BAGIAN PENTING YANG DIPERBAIKI ---
      // Sekarang menyimpan seluruh objek device, bukan hanya topiknya
      selectedDevice: selectedDevice,
      selectedKey,
      onValue,
      offValue,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Modbus Button Control
          </DialogTitle>
          <DialogDescription>
            Select a Modbus device and a key to control.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Button Title</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="e.g., Control Lampu Teras"
            />
          </div>
          <div className="grid gap-2">
            <Label>Device</Label>
            {isLoadingDevices ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Discovering Modbus devices...
                </span>
              </div>
            ) : (
              <Select
                onValueChange={handleDeviceChange}
                value={selectedDevice?.profile.topic || ""}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.profile.topic} value={d.profile.topic}>
                      {d.profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Data Key to Control</Label>
            <Select
              onValueChange={setSelectedKey}
              value={selectedKey || ""}
              disabled={!selectedDevice || availableKeys.length === 0}
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
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Value to Send (ON)</Label>
              <Input
                value={onValue}
                onChange={(e) => setOnValue(e.target.value)}
                placeholder="e.g., 1"
              />
            </div>
            <div className="grid gap-2">
              <Label>Value to Send (OFF)</Label>
              <Input
                value={offValue}
                onChange={(e) => setOffValue(e.target.value)}
                placeholder="e.g., 0"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoadingDevices}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={
              isLoadingDevices ||
              !widgetTitle ||
              !selectedDevice ||
              !selectedKey
            }
          >
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
