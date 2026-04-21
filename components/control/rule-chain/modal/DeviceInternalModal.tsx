"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
  getMQTTClient,
  isClientConnected,
  subscribeToTopic,
  unsubscribeFromTopic,
} from "@/lib/mqttClient";
import Swal from "sweetalert2";
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

interface DeviceSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    deviceName: string,
    deviceUniqId: string,
    key?: string,
    topic?: string,
  ) => void;
  initialConfig?: {
    deviceName: string;
    deviceUniqId: string;
    key?: string;
    topic?: string;
  };
}

export default function DeviceSelectionModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: DeviceSelectionModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"selection" | "manual">(
    "selection",
  );

  // Devices & Loading for "Selection" tab
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // State for "Manual" tab
  const [manualTopic, setManualTopic] = useState("");

  // Common selection state
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<
    string | null
  >(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // MQTT Keys
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const selectedDevice = devices.find((d) => d.uniqId === selectedDeviceUniqId);

  const resetAllState = useCallback(() => {
    // Reset selection tab state
    setDevices([]);
    setIsLoadingDevices(false);
    setSelectedDeviceUniqId(null);

    // Reset manual tab state
    setManualTopic("");

    // Reset common state
    setSelectedKey(null);
    setAvailableKeys([]);
    setIsWaitingForKey(false);

    // Unsubscribe from any active topic
    if (subscribedTopicRef.current) {
      unsubscribeFromTopic(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }
  }, []); // handleMqttMessage is memoized, so this is safe

  const handleClose = () => {
    resetAllState();
    setActiveTab("selection"); // Reset to default tab on close
    onClose();
  };

  // Set mounted untuk hydration (portal rendering)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch devices saat modal dibuka and in selection tab
  useEffect(() => {
    if (isOpen && activeTab === "selection") {
      const client = getMQTTClient();
      if (!client || !isClientConnected()) {
        console.error("MQTT not connected.");
        return;
      }

      setIsLoadingDevices(true);
      setDevices([]);

      let modbusData: any[] = [];
      let modularData: any[] = [];
      let modbusDone = false;
      let modularDone = false;

      const processAndSetDevices = () => {
        const allRaw = [...modbusData, ...modularData];
        const mapped = allRaw.map((dev) => ({
          uniqId: dev.profile.topic,
          name: dev.profile.name,
          topic: dev.profile.topic,
        }));
        const unique = Array.from(
          new Map(mapped.map((d) => [d.uniqId, d])).values(),
        );
        setDevices(unique);
        setIsLoadingDevices(false);
      };

      const responseHandler = (topic: string, payload: string) => {
        try {
          if (payload && payload !== "undefined") {
            const parsed = JSON.parse(payload);
            if (topic === "response_device_modbus") {
              modbusData = parsed;
              modbusDone = true;
            } else if (topic === "response_device_i2c") {
              modularData = parsed;
              modularDone = true;
            }
          }
        } catch (e) {
          console.error(`Failed to parse device list from ${topic}`, e);
          if (topic === "response_device_modbus") modbusDone = true;
          if (topic === "response_device_i2c") modularDone = true;
        }

        if (modbusDone && modularDone) {
          processAndSetDevices();
        }
      };

      subscribeToTopic("response_device_modbus", responseHandler);
      subscribeToTopic("response_device_i2c", responseHandler);

      client.publish(
        "command_device_modbus",
        JSON.stringify({ command: "getDataModbus" }),
      );
      client.publish(
        "command_device_i2c",
        JSON.stringify({ command: "getDataI2C" }),
      );

      const timeout = setTimeout(() => {
        if (!modbusDone || !modularDone) {
          console.warn("Timeout waiting for one or more device lists.");
          modbusDone = true;
          modularDone = true;
          processAndSetDevices();
        }
      }, 5000); // 5-second timeout

      return () => {
        clearTimeout(timeout);
        unsubscribeFromTopic("response_device_modbus", responseHandler);
        unsubscribeFromTopic("response_device_i2c", responseHandler);
      };
    }
  }, [isOpen, activeTab]);

  // Handle MQTT message for keys
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        let potentialKeys: string[] = [];

        // Condition 1: Payload has a 'value' property that is a stringified JSON
        if (typeof payload.value === "string") {
          try {
            const innerPayload = JSON.parse(payload.value);
            potentialKeys = Object.keys(innerPayload);
          } catch (e) {
            console.error("Failed to parse inner JSON string from 'value':", e);
          }
        }
        // Condition 2: Payload itself is a flat JSON object
        else if (
          payload &&
          typeof payload === "object" &&
          !Array.isArray(payload)
        ) {
          potentialKeys = Object.keys(payload);
        } else {
          console.warn(
            "Received payload is not a valid JSON object or supported structure:",
            payloadString,
          );
        }

        if (potentialKeys.length > 0) {
          setAvailableKeys((prevKeys) => {
            const allKeys = [...new Set([...prevKeys, ...potentialKeys])];
            return allKeys;
          });
        }
      } catch (e) {
        // This catches errors from the initial JSON.parse(payloadString)
        console.error("Failed to parse MQTT payload string:", e);
      } finally {
        setIsWaitingForKey(false);
        // Important: In manual mode, we might want to keep listening
        // For now, we unsubscribe after first message like before
        unsubscribeFromTopic(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [],
  );

  // Subscribe ke MQTT saat device berubah (Selection Tab)
  useEffect(() => {
    if (!isOpen || activeTab !== "selection") return;

    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribeFromTopic(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setSelectedKey(null);
      setIsWaitingForKey(true);
      subscribeToTopic(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      if (subscribedTopicRef.current) {
        unsubscribeFromTopic(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    selectedDeviceUniqId,
    selectedDevice,
    isOpen,
    activeTab,
    handleMqttMessage,
  ]);

  const handleManualSubscribe = () => {
    if (!manualTopic) {
      Swal.fire("Error", "Topic cannot be empty.", "error");
      return;
    }
    if (subscribedTopicRef.current) {
      unsubscribeFromTopic(subscribedTopicRef.current, handleMqttMessage);
    }
    setAvailableKeys([]);
    setSelectedKey(null);
    setIsWaitingForKey(true);
    subscribeToTopic(manualTopic, handleMqttMessage);
    subscribedTopicRef.current = manualTopic;
  };

  const handleConfirm = () => {
    if (activeTab === "selection") {
      if (selectedDeviceUniqId && selectedDevice) {
        onSelect(
          selectedDevice.name,
          selectedDeviceUniqId,
          selectedKey || undefined,
          selectedDevice.topic,
        );
        handleClose();
      }
    } else if (activeTab === "manual") {
      if (manualTopic) {
        // For manual, we use the topic as the name and uniqId
        onSelect(
          manualTopic,
          manualTopic,
          selectedKey || undefined,
          manualTopic,
        );
        handleClose();
      }
    }
  };

  const handleDeviceSelect = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedKey(null);
    setAvailableKeys([]);
  };

  const changeTab = (tab: "selection" | "manual") => {
    resetAllState();
    setActiveTab(tab);
  };

  if (!isOpen || !mounted) return null;

  const isConfirmDisabled =
    (activeTab === "selection" && !selectedDeviceUniqId) ||
    (activeTab === "manual" && !manualTopic);

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Select Input Source
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => changeTab("selection")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === "selection" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            Selection
          </button>
          <button
            onClick={() => changeTab("manual")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${activeTab === "manual" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
          >
            Manual
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-6 p-6">
          {activeTab === "selection" && (
            <>
              {/* Device Selection */}
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

              {/* Key Selection - Show only if device is selected */}
              {selectedDevice && (
                <div className="grid gap-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Data Key
                  </label>
                  <Select
                    onValueChange={setSelectedKey}
                    value={selectedKey || ""}
                    disabled={
                      !selectedDeviceUniqId || availableKeys.length === 0
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

          {activeTab === "manual" && (
            <>
              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  MQTT Topic
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualTopic}
                    onChange={(e) => setManualTopic(e.target.value)}
                    placeholder="e.g., /devices/sensor-1/data"
                    className="flex-grow p-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                  />
                  <button
                    onClick={handleManualSubscribe}
                    disabled={isWaitingForKey || !manualTopic}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-slate-400"
                  >
                    {isWaitingForKey ? "Waiting..." : "Subscribe"}
                  </button>
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Data Key
                </label>
                <Select
                  onValueChange={setSelectedKey}
                  value={selectedKey || ""}
                  disabled={!manualTopic || availableKeys.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isWaitingForKey ? "Waiting for data..." : "Select a key"
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
                {manualTopic &&
                  !isWaitingForKey &&
                  availableKeys.length === 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No keys received. Ensure the topic is correct and
                      publishing data.
                    </p>
                  )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              !isConfirmDisabled
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
