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
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface ConnectionWidgetConfig {
  deviceUniqId: string;
  selectedKey: string;
  name: string;
  desc: string;
  connectionType: string;
  flowDirection: "forward" | "reverse" | "bidirectional";
  animated: boolean;
  animationSpeed: number;
  color: string;
  thickness: number;
  showFlow: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ConnectionWidgetConfig) => void;
  initialConfig?: ConnectionWidgetConfig;
}

export const ConnectionWidgetConfigModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  const defaultConfig: ConnectionWidgetConfig = {
    deviceUniqId: "",
    selectedKey: "",
    name: "Connection Widget",
    desc: "",
    connectionType: "line",
    flowDirection: "forward",
    animated: true,
    animationSpeed: 3,
    color: "#3b82f6",
    thickness: 4,
    showFlow: true,
  };

  const [localConfig, setLocalConfig] = useState<ConnectionWidgetConfig>(
    initialConfig || defaultConfig
  );

  // State untuk key yang didapat dari MQTT
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialConfig) {
      setLocalConfig(initialConfig);
    }
  }, [initialConfig]);

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
        setLocalConfig(defaultConfig);
        setAvailableKeys([]);
        setIsWaitingForKey(false);
      }, 200);
    }
  }, [isOpen, onClose, defaultConfig]);

  // Logika untuk subscribe & unsubscribe MQTT
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        // Cek jika 'value' adalah string JSON, lalu parse lagi
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const keys = Object.keys(innerPayload);
          setAvailableKeys(keys);
        } else {
          console.warn("Payload 'value' is not a JSON string:", payload.value);
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
      (d) => d.uniqId === localConfig.deviceUniqId
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
    localConfig.deviceUniqId,
    devices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const handleDeviceChange = (deviceUniqId: string) => {
    setLocalConfig({ ...localConfig, deviceUniqId, selectedKey: "" });
    setAvailableKeys([]);
  };

  const handleSave = () => {
    onSave(localConfig);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configure Connection Widget</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Widget Name</Label>
                <Input
                  id="name"
                  value={localConfig.name}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, name: e.target.value })
                  }
                  placeholder="Connection Widget"
                />
              </div>
              <div>
                <Label htmlFor="desc">Description (Optional)</Label>
                <Input
                  id="desc"
                  value={localConfig.desc}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, desc: e.target.value })
                  }
                  placeholder="Widget description"
                />
              </div>
            </div>
          </div>

          {/* Device Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Device Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="device">Device</Label>
                <Select
                  value={localConfig.deviceUniqId}
                  onValueChange={handleDeviceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select device" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map((device) => (
                      <SelectItem key={device.uniqId} value={device.uniqId}>
                        {device.name || device.uniqId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="key">Data Key</Label>
                <Select
                  value={localConfig.selectedKey}
                  onValueChange={(selectedKey) =>
                    setLocalConfig({ ...localConfig, selectedKey })
                  }
                  disabled={
                    !localConfig.deviceUniqId || availableKeys.length === 0
                  }
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
                    {availableKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {localConfig.deviceUniqId &&
                  !isWaitingForKey &&
                  availableKeys.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No keys received. Ensure the device is publishing data.
                    </p>
                  )}
              </div>
            </div>
          </div>

          {/* Connection Style */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Connection Style</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="connectionType">Connection Type</Label>
                <Select
                  value={localConfig.connectionType}
                  onValueChange={(connectionType) =>
                    setLocalConfig({ ...localConfig, connectionType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="line">Line</SelectItem>
                    <SelectItem value="pipe">Pipe</SelectItem>
                    <SelectItem value="arrow">Arrow</SelectItem>
                    <SelectItem value="double-arrow">Double Arrow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="flowDirection">Flow Direction</Label>
                <Select
                  value={localConfig.flowDirection}
                  onValueChange={(
                    flowDirection: "forward" | "reverse" | "bidirectional"
                  ) => setLocalConfig({ ...localConfig, flowDirection })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="forward">Forward</SelectItem>
                    <SelectItem value="reverse">Reverse</SelectItem>
                    <SelectItem value="bidirectional">Bidirectional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="thickness">
                  Thickness: {localConfig.thickness}px
                </Label>
                <Slider
                  value={[localConfig.thickness]}
                  onValueChange={(value) =>
                    setLocalConfig({ ...localConfig, thickness: value[0] })
                  }
                  min={1}
                  max={20}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  type="color"
                  value={localConfig.color}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, color: e.target.value })
                  }
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Animation Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Animation Settings</h3>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="animated"
                  checked={localConfig.animated}
                  onCheckedChange={(animated) =>
                    setLocalConfig({ ...localConfig, animated })
                  }
                />
                <Label htmlFor="animated">Enable Animation</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="showFlow"
                  checked={localConfig.showFlow}
                  onCheckedChange={(showFlow) =>
                    setLocalConfig({ ...localConfig, showFlow })
                  }
                />
                <Label htmlFor="showFlow">Show Flow Particles</Label>
              </div>

              {localConfig.animated && (
                <div>
                  <Label htmlFor="animationSpeed">
                    Animation Speed: {localConfig.animationSpeed}x
                  </Label>
                  <Slider
                    value={[localConfig.animationSpeed]}
                    onValueChange={(value) =>
                      setLocalConfig({
                        ...localConfig,
                        animationSpeed: value[0],
                      })
                    }
                    min={0.1}
                    max={5}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
