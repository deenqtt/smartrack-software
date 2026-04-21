"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Lightbulb, Loader2 } from "lucide-react";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RELAY_PART_NUMBERS = ["RELAY", "RELAYMINI"];

interface MqttDevice {
  profile: {
    name: string;
    topic: string;
    part_number?: string;
  };
  protocol_setting: any;
  _type: "modbus" | "modular";
}

const normalizeDiscoveredDevices = (
  payload: any,
  type: "modbus" | "modular",
): MqttDevice[] => {
  if (!Array.isArray(payload)) return [];

  return payload
    .map((device: any) => {
      const profile = device?.profile || {};
      const topic = profile.topic || device?.topic;
      const name = profile.name || device?.name;

      if (!topic || !name) return null;

      return {
        ...device,
        profile: {
          ...profile,
          name,
          topic,
        },
        _type: type,
      } as MqttDevice;
    })
    .filter(Boolean) as MqttDevice[];
};

interface ControlRelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    deviceType: "modbus" | "modular",
    deviceName: string,
    selectedKey: string,
    controlType: string,
    config?: { deviceType: "modbus" | "modular"; deviceName: string; device?: any; selectedKey: string; controlType: string }
  ) => void;
  initialConfig?: { [key: string]: any };
}

const CONTROL_TYPES = [
  { value: "on", label: "Turn ON" },
  { value: "off", label: "Turn OFF" },
];

export default function ControlRelayModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: ControlRelayModalProps) {
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  const [internalDeviceType, setInternalDeviceType] = useState<"modbus" | "modular" | null>(null);
  const [devices, setDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MqttDevice | null>(null);

  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const keySubTopicRef = useRef<string | null>(null);
  const deviceResponseTopicRef = useRef<string | null>(null);

  const [selectedKey, setSelectedKey] = useState<string>("");
  const [controlType, setControlType] = useState<string>("on");

  // Pre-fill dari initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setInternalDeviceType(initialConfig.deviceType || null);
      setSelectedKey(initialConfig.selectedKey || "");
      setControlType(initialConfig.controlType || "on");
    } else if (!isOpen) {
      resetForm();
    }
  }, [isOpen, initialConfig]);

  // Fetch devices saat device type dipilih
  useEffect(() => {
    if (!isOpen || !isReady || !internalDeviceType) return;

    setIsLoadingDevices(true);
    setDevices([]);
    setSelectedDevice(null);
    setAvailableKeys([]);
    setSelectedKey("");

    let active = true;
    const commandTopic =
      internalDeviceType === "modbus" ? "command_device_modbus" : "command_device_i2c";
    const responseTopic =
      internalDeviceType === "modbus" ? "response_device_modbus" : "response_device_i2c";
    const command =
      internalDeviceType === "modbus" ? "getDataModbus" : "getDataI2C";

    const handleDeviceList = (topic: string, message: string) => {
      if (!active) return;
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed)) {
          // Skip empty arrays — another service may respond first with []
          if (parsed.length === 0) return;

          const normalized = normalizeDiscoveredDevices(parsed, internalDeviceType);
          const filtered = normalized.filter((d) =>
            RELAY_PART_NUMBERS.includes(d.profile.part_number || "")
          );
          setDevices(filtered);
          setIsLoadingDevices(false);
          unsubscribe(responseTopic, handleDeviceList);
          deviceResponseTopicRef.current = null;
          active = false;

          // Pre-fill selected device dari initialConfig
          if (initialConfig?.device || initialConfig?.deviceTopic) {
            const match = filtered.find(
              (d) =>
                d.profile.topic ===
                (initialConfig.device?.profile?.topic ?? initialConfig.deviceTopic)
            );
            if (match) setSelectedDevice(match);
          }
        } else if (parsed?.status === "error") {
          setDevices([]);
          setIsLoadingDevices(false);
          unsubscribe(responseTopic, handleDeviceList);
          deviceResponseTopicRef.current = null;
          active = false;
        }
      } catch (e) {
        console.error("[ControlRelay] Parse error:", e);
      }
    };

    subscribe(responseTopic, handleDeviceList);
    deviceResponseTopicRef.current = responseTopic;
    publish(commandTopic, JSON.stringify({ command }));

    const timeout = setTimeout(() => {
      if (!active) return;
      setIsLoadingDevices(false);
      if (deviceResponseTopicRef.current) {
        unsubscribe(deviceResponseTopicRef.current, handleDeviceList);
        deviceResponseTopicRef.current = null;
      }
      active = false;
    }, 5000);

    return () => {
      active = false;
      clearTimeout(timeout);
      if (deviceResponseTopicRef.current) {
        unsubscribe(deviceResponseTopicRef.current, handleDeviceList);
        deviceResponseTopicRef.current = null;
      }
    };
  }, [isOpen, isReady, internalDeviceType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch keys saat device dipilih
  const handleMqttKeyResponse = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const inner =
          typeof payload.value === "string" ? JSON.parse(payload.value) : payload.value || {};
        setAvailableKeys(Object.keys(inner));
      } catch (e) {
        console.error("[ControlRelay] Key parse error:", e);
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
      keySubTopicRef.current = null;
    }
    if (topic && topic !== keySubTopicRef.current) {
      setAvailableKeys([]);
      setSelectedKey("");
      setIsWaitingForKey(true);
      subscribe(topic, handleMqttKeyResponse);
      keySubTopicRef.current = topic;
    }
  }, [selectedDevice, subscribe, unsubscribe, handleMqttKeyResponse]);

  const handleDeviceChange = (topic: string) => {
    const device = devices.find((d) => d.profile.topic === topic);
    setSelectedDevice(device || null);
    setSelectedKey("");
  };

  const handleConfirm = () => {
    if (!selectedDevice || !selectedKey || !controlType) {
      alert("Please select all fields");
      return;
    }
    const deviceType = selectedDevice._type;
    const controlLabel = CONTROL_TYPES.find((c) => c.value === controlType)?.label || controlType;
    const nodeLabel = `${selectedDevice.profile.name} - ${selectedKey} (${controlLabel})`;
    const config = {
      deviceType,
      deviceName: selectedDevice.profile.name,
      device: selectedDevice,
      selectedKey,
      controlType,
    };
    onSelect(deviceType, nodeLabel, selectedKey, controlType, config);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setInternalDeviceType(null);
    setDevices([]);
    setSelectedDevice(null);
    setAvailableKeys([]);
    setSelectedKey("");
    setControlType("on");
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Control Relay</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
            <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Select a device type, then choose a relay device, pin/key, and control action
            </p>
          </div>

          {/* Device Type Selection */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Device Type
            </label>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setInternalDeviceType("modbus");
                  setSelectedDevice(null);
                  setAvailableKeys([]);
                  setSelectedKey("");
                }}
                className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                  internalDeviceType === "modbus"
                    ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">Modbus Device</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">TCP/Serial Modbus relay devices</div>
              </button>
              <button
                onClick={() => {
                  setInternalDeviceType("modular");
                  setSelectedDevice(null);
                  setAvailableKeys([]);
                  setSelectedKey("");
                }}
                className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                  internalDeviceType === "modular"
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                }`}
              >
                <div className="font-medium text-slate-900 dark:text-slate-100">Modular Device</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">I2C modular relay devices (RELAY / RELAYMINI)</div>
              </button>
            </div>
          </div>

          {/* Device Selection */}
          {internalDeviceType && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Device
              </label>
              {isLoadingDevices ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Discovering relay devices...
                </div>
              ) : (
                <Select
                  value={selectedDevice?.profile.topic || ""}
                  onValueChange={handleDeviceChange}
                  disabled={devices.length === 0}
                >
                  <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">
                    <SelectValue
                      placeholder={
                        devices.length === 0 ? "No relay devices found" : "Choose a device..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                    {devices.map((device) => (
                      <SelectItem key={device.profile.topic} value={device.profile.topic}>
                        {device.profile.name}
                        {device.profile.part_number && (
                          <span className="ml-2 text-xs text-slate-400">
                            ({device.profile.part_number})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Key/Pin Selection */}
          {selectedDevice && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Pin/Key
              </label>
              <Select
                value={selectedKey}
                onValueChange={setSelectedKey}
                disabled={availableKeys.length === 0 || isWaitingForKey}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 disabled:opacity-50">
                  <SelectValue
                    placeholder={
                      isWaitingForKey
                        ? "Waiting for data..."
                        : availableKeys.length === 0
                        ? "No pins available"
                        : "Choose a pin..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                  {availableKeys.map((key) => (
                    <SelectItem key={key} value={key}>{key}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Control Type */}
          {selectedDevice && selectedKey && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Control Action
              </label>
              <div className="space-y-2">
                {CONTROL_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setControlType(type.value)}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                      controlType === type.value
                        ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-green-300"
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">{type.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDevice || !selectedKey || !controlType || isLoadingDevices || isWaitingForKey}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors font-medium"
          >
            Add Control Node
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
