"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Database, Edit3, Wifi, Cpu, Loader2 } from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { useMqtt } from "@/contexts/MqttContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload?: Record<string, any>;
  lastUpdatedByMqtt?: string;
}

interface InternalMqttDevice {
  profile: {
    name: string;
    topic: string;
  };
  protocol_setting?: any;
}

const normalizeInternalDevices = (payload: any): InternalMqttDevice[] => {
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
      } as InternalMqttDevice;
    })
    .filter(Boolean) as InternalMqttDevice[];
};

interface DeviceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    deviceName: string,
    deviceUniqId: string,
    key?: string,
    topic?: string,
    extraConfig?: Record<string, any>,
  ) => void;
  initialConfig?: {
    deviceName: string;
    deviceUniqId: string;
    key?: string;
    topic?: string;
    isInternal?: boolean;
    deviceType?: "modbus" | "modular";
  };
}

type SelectionMode = "database" | "internal" | "manual";

export default function DeviceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: DeviceSelectionModalProps) {
  const { subscribe: serverSubscribe, unsubscribe: serverUnsubscribe } =
    useMqttServer();
  const {
    publish,
    subscribe: mqttSubscribe,
    unsubscribe: mqttUnsubscribe,
    isReady,
  } = useMqtt();
  const [mounted, setMounted] = useState(false);

  // Mode
  const [selectionMode, setSelectionMode] = useState<SelectionMode>("database");

  // --- Database mode ---
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const selectedDevice = devices.find((d) => d.uniqId === selectedDeviceUniqId);

  // --- Internal device mode ---
  const [internalDeviceType, setInternalDeviceType] = useState<
    "modbus" | "modular" | null
  >(null);
  const [internalDevices, setInternalDevices] = useState<InternalMqttDevice[]>(
    [],
  );
  const [isLoadingInternalDevices, setIsLoadingInternalDevices] =
    useState(false);
  const [selectedInternalDevice, setSelectedInternalDevice] =
    useState<InternalMqttDevice | null>(null);
  const [internalAvailableKeys, setInternalAvailableKeys] = useState<string[]>(
    [],
  );
  const [isWaitingInternalKey, setIsWaitingInternalKey] = useState(false);
  const [selectedInternalKey, setSelectedInternalKey] = useState<string>("");
  const internalResponseTopicRef = useRef<string | null>(null);
  const internalKeyTopicRef = useRef<string | null>(null);

  // --- Manual mode ---
  const [manualTopic, setManualTopic] = useState("");
  const [isSubscribingManual, setIsSubscribingManual] = useState(false);
  const [manualAvailableKeys, setManualAvailableKeys] = useState<string[]>([]);
  const [isWaitingManualKey, setIsWaitingManualKey] = useState(false);
  const [selectedManualKey, setSelectedManualKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // ── Handlers MQTT message for database mode ──────────────────────────────
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        let innerPayload: any;
        if (typeof payload.value === "string") {
          innerPayload = JSON.parse(payload.value);
        } else if (typeof payload === "object" && payload !== null) {
          innerPayload = payload;
        } else {
          return;
        }
        const keys = Object.keys(innerPayload);
        setAvailableKeys((prev) => [...new Set([...prev, ...keys])]);
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        setIsSubscribingManual(false);
      }
    },
    [],
  );

  // ── Manual mode key listener ──────────────────────────────────────────────
  const handleManualMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        let innerPayload: any;
        if (typeof payload.value === "string") {
          innerPayload = JSON.parse(payload.value);
        } else {
          innerPayload = payload;
        }
        const keys = Object.keys(innerPayload);
        setManualAvailableKeys((prev) => [...new Set([...prev, ...keys])]);
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingManualKey(false);
      }
    },
    [],
  );

  // ── Internal mode key listener ────────────────────────────────────────────
  const handleInternalKeyMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload;
        setInternalAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error("Failed to parse internal device keys:", e);
      } finally {
        setIsWaitingInternalKey(false);
        if (internalKeyTopicRef.current) {
          mqttUnsubscribe(
            internalKeyTopicRef.current,
            handleInternalKeyMessage,
          );
          internalKeyTopicRef.current = null;
        }
      }
    },
    [mqttUnsubscribe],
  );

  // ── Reset all state ───────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setSelectionMode("database");
    setSelectedDeviceUniqId(null);
    setSelectedKey(null);
    setAvailableKeys([]);
    setIsWaitingForKey(false);
    setInternalDeviceType(null);
    setInternalDevices([]);
    setSelectedInternalDevice(null);
    setInternalAvailableKeys([]);
    setSelectedInternalKey("");
    setIsWaitingInternalKey(false);
    setManualTopic("");
    setManualAvailableKeys([]);
    setSelectedManualKey(null);
    setIsWaitingManualKey(false);
    setIsSubscribingManual(false);
  }, []);

  // ── Open modal: load database devices + pre-fill ──────────────────────────
  useEffect(() => {
    if (isOpen) {
      const fetchAndSetup = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`,
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          const data = await response.json();
          setDevices(data);

          if (initialConfig) {
            if (initialConfig.isInternal) {
              setSelectionMode("internal");
              setInternalDeviceType(initialConfig.deviceType || null);
              setSelectedInternalKey(initialConfig.key || "");
              if (initialConfig.key)
                setInternalAvailableKeys([initialConfig.key]);
            } else if (initialConfig.deviceName?.startsWith("Manual:")) {
              setSelectionMode("manual");
              setManualTopic(initialConfig.topic || "");
              setSelectedManualKey(initialConfig.key || null);
              if (initialConfig.key)
                setManualAvailableKeys([initialConfig.key]);
            } else {
              setSelectionMode("database");
              setSelectedDeviceUniqId(initialConfig.deviceUniqId);
              setSelectedKey(initialConfig.key || null);
              if (initialConfig.key) setAvailableKeys([initialConfig.key]);
            }
          }
        } catch (error: any) {
          showToast.error(error.message);
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchAndSetup();
    } else {
      resetAll();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Database mode: subscribe to device topic for keys ────────────────────
  useEffect(() => {
    if (!isOpen || selectionMode !== "database") return;
    const topic = selectedDevice?.topic;
    if (topic) {
      serverSubscribe(topic, handleMqttMessage);
      setIsWaitingForKey(true);
      return () => {
        serverUnsubscribe(topic, handleMqttMessage);
        setIsWaitingForKey(false);
      };
    }
  }, [
    isOpen,
    selectionMode,
    selectedDevice,
    serverSubscribe,
    serverUnsubscribe,
    handleMqttMessage,
  ]);

  // ── Manual mode: subscribe to manual topic for keys ───────────────────────
  useEffect(() => {
    if (!isOpen || selectionMode !== "manual") return;
    const topic = manualTopic.trim();
    if (topic) {
      serverSubscribe(topic, handleManualMessage);
      setIsWaitingManualKey(true);
      return () => {
        serverUnsubscribe(topic, handleManualMessage);
        setIsWaitingManualKey(false);
      };
    }
  }, [
    isOpen,
    selectionMode,
    manualTopic,
    serverSubscribe,
    serverUnsubscribe,
    handleManualMessage,
  ]);

  // ── Internal mode: fetch device list via MQTT ─────────────────────────────
  useEffect(() => {
    if (
      !isOpen ||
      selectionMode !== "internal" ||
      !internalDeviceType ||
      !isReady
    )
      return;

    setIsLoadingInternalDevices(true);
    setInternalDevices([]);
    setSelectedInternalDevice(null);
    setInternalAvailableKeys([]);
    setSelectedInternalKey("");

    // Use same topics as the internal device pages
    const commandTopic =
      internalDeviceType === "modbus"
        ? "command_device_modbus"
        : "command_device_i2c";
    const responseTopic =
      internalDeviceType === "modbus"
        ? "response_device_modbus"
        : "response_device_i2c";
    const commandPayload = JSON.stringify({
      command: internalDeviceType === "modbus" ? "getDataModbus" : "getDataI2C",
    });

    let active = true;

    const handleDeviceList = (topic: string, payloadString: string) => {
      if (!active) return;
      try {
        const parsed = JSON.parse(payloadString);
        if (Array.isArray(parsed)) {
          const mapped = normalizeInternalDevices(parsed);
          setInternalDevices(mapped);
          setIsLoadingInternalDevices(false);
          mqttUnsubscribe(responseTopic, handleDeviceList);
          internalResponseTopicRef.current = null;
          active = false;

          // Pre-fill selected device from initialConfig
          if (initialConfig?.isInternal && initialConfig.topic) {
            const found = mapped.find(
              (d) => d.profile.topic === initialConfig.topic,
            );
            if (found) setSelectedInternalDevice(found);
          }
        } else if (parsed?.status === "error") {
          console.error("Failed to fetch internal device list:", parsed.message);
          setInternalDevices([]);
          setIsLoadingInternalDevices(false);
          mqttUnsubscribe(responseTopic, handleDeviceList);
          internalResponseTopicRef.current = null;
          active = false;
        }
        // Ignore non-array responses (status messages, etc.)
      } catch (e) {
        console.error("Failed to parse internal device list:", e);
      }
    };

    mqttSubscribe(responseTopic, handleDeviceList);
    internalResponseTopicRef.current = responseTopic;
    publish(commandTopic, commandPayload);

    const timeout = setTimeout(() => {
      if (active && internalResponseTopicRef.current) {
        setIsLoadingInternalDevices(false);
        mqttUnsubscribe(responseTopic, handleDeviceList);
        internalResponseTopicRef.current = null;
        active = false;
      }
    }, 5000);

    return () => {
      active = false;
      clearTimeout(timeout);
      if (internalResponseTopicRef.current) {
        mqttUnsubscribe(internalResponseTopicRef.current, handleDeviceList);
        internalResponseTopicRef.current = null;
      }
    };
  }, [isOpen, selectionMode, internalDeviceType, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Internal mode: subscribe to device topic for keys ────────────────────
  useEffect(() => {
    if (!isOpen || selectionMode !== "internal" || !selectedInternalDevice)
      return;

    const topic = selectedInternalDevice.profile.topic;
    setInternalAvailableKeys([]);
    setSelectedInternalKey("");
    setIsWaitingInternalKey(true);

    mqttSubscribe(topic, handleInternalKeyMessage);
    internalKeyTopicRef.current = topic;

    const timeout = setTimeout(() => {
      if (internalKeyTopicRef.current === topic) {
        setIsWaitingInternalKey(false);
        mqttUnsubscribe(topic, handleInternalKeyMessage);
        internalKeyTopicRef.current = null;
      }
    }, 5000);

    return () => {
      clearTimeout(timeout);
      if (internalKeyTopicRef.current === topic) {
        mqttUnsubscribe(topic, handleInternalKeyMessage);
        internalKeyTopicRef.current = null;
      }
    };
  }, [isOpen, selectionMode, selectedInternalDevice]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Confirm ───────────────────────────────────────────────────────────────
  const handleConfirm = () => {
    if (selectionMode === "database") {
      if (selectedDeviceUniqId && selectedDevice) {
        onSelect(
          selectedDevice.name,
          selectedDeviceUniqId,
          selectedKey || undefined,
          selectedDevice.topic,
        );
      }
    } else if (selectionMode === "internal") {
      if (internalDeviceType && selectedInternalDevice && selectedInternalKey) {
        const topic = selectedInternalDevice.profile.topic;
        const deviceName = selectedInternalDevice.profile.name;
        onSelect(deviceName, `internal-${topic}`, selectedInternalKey, topic, {
          isInternal: true,
          deviceType: internalDeviceType,
        });
      }
    } else {
      if (manualTopic.trim() && selectedManualKey) {
        const virtualDeviceName = `Manual: ${manualTopic}`;
        const virtualDeviceUniqId =
          initialConfig?.deviceUniqId ||
          `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        onSelect(
          virtualDeviceName,
          virtualDeviceUniqId,
          selectedManualKey,
          manualTopic.trim(),
        );
      }
    }
    onClose();
  };

  const handleDeviceSelect = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const handleInternalDeviceChange = (topic: string) => {
    const device = internalDevices.find((d) => d.profile.topic === topic);
    setSelectedInternalDevice(device || null);
    setSelectedInternalKey("");
    setInternalAvailableKeys([]);
  };

  const isConfirmDisabled = () => {
    if (selectionMode === "database") return !selectedDeviceUniqId;
    if (selectionMode === "internal")
      return (
        !internalDeviceType ||
        !selectedInternalDevice ||
        !selectedInternalKey ||
        isWaitingInternalKey
      );
    return !(selectedManualKey && manualTopic.trim());
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Select Device Source
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-6 p-6 overflow-y-auto flex-1">
          {/* Mode Selection */}
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Source Type
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectionMode("database")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                  selectionMode === "database"
                    ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300"
                    : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Database size={14} />
                Database
              </button>
              <button
                onClick={() => setSelectionMode("internal")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                  selectionMode === "internal"
                    ? "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300"
                    : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Cpu size={14} />
                Internal
              </button>
              <button
                onClick={() => setSelectionMode("manual")}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-colors text-xs font-medium ${
                  selectionMode === "manual"
                    ? "bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300"
                    : "border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                }`}
              >
                <Edit3 size={14} />
                Manual
              </button>
            </div>
          </div>

          {/* ── DATABASE MODE ─────────────────────────────────────────────── */}
          {selectionMode === "database" && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Device
                </label>
                <Select
                  onValueChange={handleDeviceSelect}
                  value={selectedDeviceUniqId || ""}
                  disabled={isLoadingDevices}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingDevices
                          ? "Loading devices..."
                          : "Select a device"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.length === 0 ? (
                      <div className="p-2 text-sm text-slate-500">
                        No devices found
                      </div>
                    ) : (
                      devices.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedDevice && (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Data Key
                  </label>
                  <Select
                    onValueChange={setSelectedKey}
                    value={selectedKey || ""}
                    disabled={
                      !selectedDeviceUniqId ||
                      (availableKeys.length === 0 && !isWaitingForKey)
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
                  {selectedDeviceUniqId &&
                    !isWaitingForKey &&
                    availableKeys.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No keys received. Ensure the device is publishing data.
                      </p>
                    )}
                </div>
              )}
            </>
          )}

          {/* ── INTERNAL DEVICE MODE ──────────────────────────────────────── */}
          {selectionMode === "internal" && (
            <>
              {/* Device Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Device Type
                </label>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setInternalDeviceType("modbus");
                      setSelectedInternalDevice(null);
                      setInternalAvailableKeys([]);
                      setSelectedInternalKey("");
                    }}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                      internalDeviceType === "modbus"
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-purple-300"
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Modbus Device
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      TCP/Serial Modbus devices
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setInternalDeviceType("modular");
                      setSelectedInternalDevice(null);
                      setInternalAvailableKeys([]);
                      setSelectedInternalKey("");
                    }}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                      internalDeviceType === "modular"
                        ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-violet-300"
                    }`}
                  >
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      Modular Device
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      I2C modular devices
                    </div>
                  </button>
                </div>
              </div>

              {/* Device List */}
              {internalDeviceType && (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Select Device
                  </label>
                  {isLoadingInternalDevices ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Discovering{" "}
                      {internalDeviceType === "modbus"
                        ? "Modbus"
                        : "Modular"}{" "}
                      devices...
                    </div>
                  ) : (
                    <Select
                      value={selectedInternalDevice?.profile.topic || ""}
                      onValueChange={handleInternalDeviceChange}
                      disabled={internalDevices.length === 0}
                    >
                      <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600">
                        <SelectValue
                          placeholder={
                            internalDevices.length === 0
                              ? "No devices found"
                              : "Choose a device..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                        {internalDevices.map((device) => (
                          <SelectItem
                            key={device.profile.topic}
                            value={device.profile.topic}
                          >
                            {device.profile.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {/* Key Selection */}
              {internalDeviceType && selectedInternalDevice && (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Data Key
                  </label>
                  <Select
                    value={selectedInternalKey}
                    onValueChange={setSelectedInternalKey}
                    disabled={
                      internalAvailableKeys.length === 0 || isWaitingInternalKey
                    }
                  >
                    <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-600 disabled:opacity-50">
                      <SelectValue
                        placeholder={
                          isWaitingInternalKey
                            ? "Waiting for device data..."
                            : internalAvailableKeys.length === 0
                              ? "No data received"
                              : "Choose a key..."
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                      {internalAvailableKeys.map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!isWaitingInternalKey &&
                    internalAvailableKeys.length === 0 && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No data received. Ensure the device is publishing data.
                      </p>
                    )}
                </div>
              )}
            </>
          )}

          {/* ── MANUAL MODE ───────────────────────────────────────────────── */}
          {selectionMode === "manual" && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  MQTT Topic
                </label>
                <input
                  type="text"
                  value={manualTopic}
                  onChange={(e) => setManualTopic(e.target.value)}
                  placeholder="e.g., sensor/temperature"
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Keys will be fetched automatically after you stop typing.
                </p>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Data Key
                </label>
                <Select
                  onValueChange={setSelectedManualKey}
                  value={selectedManualKey || ""}
                  disabled={
                    manualAvailableKeys.length === 0 && !isWaitingManualKey
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isWaitingManualKey
                          ? "Waiting for data..."
                          : manualAvailableKeys.length === 0
                            ? "Enter a valid topic first"
                            : "Select a key"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {manualAvailableKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {manualTopic &&
                  !isWaitingManualKey &&
                  manualAvailableKeys.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No data received. Make sure the topic is publishing data.
                    </p>
                  )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled()}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              !isConfirmDisabled()
                ? "bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
