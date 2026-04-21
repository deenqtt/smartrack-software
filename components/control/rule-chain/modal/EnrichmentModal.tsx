"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Trash2, AlertCircle } from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
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

interface KeyValuePair {
  id: string;
  keyName: string;
  keyValue: string;
}

interface EnrichmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (deviceUniqId: string, deviceTopic: string, targetTopic: string, keyValuePairs: Array<{ keyName: string; keyValue: string }>) => void;
  initialConfig?: { [key: string]: any };
}

export default function EnrichmentModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: EnrichmentModalProps) {
  const { subscribe, unsubscribe } = useMqttServer();
  const [mounted, setMounted] = useState(false);

  // Devices & Loading
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Selection state
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<string | null>(null);
  const [targetTopic, setTargetTopic] = useState("");
  const [keyValuePairs, setKeyValuePairs] = useState<KeyValuePair[]>([]);

  // MQTT Fields
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isWaitingForFields, setIsWaitingForFields] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const selectedDevice = devices.find((d) => d.uniqId === selectedDeviceUniqId);

  // Set mounted on component load
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch devices saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          const data = await response.json();
          setDevices(data);
        } catch (error: any) {
          showToast.error(error.message);
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();

      // Pre-fill form from initialConfig
      if (initialConfig) {
        setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
        setTargetTopic(initialConfig.targetTopic || "");
        if (initialConfig.keyValuePairs && Array.isArray(initialConfig.keyValuePairs)) {
          setKeyValuePairs(initialConfig.keyValuePairs);
        }
      }
    } else {
      // Reset state saat modal ditutup
      setSelectedDeviceUniqId(null);
      setTargetTopic("");
      setKeyValuePairs([]);
      setAvailableFields([]);
      setIsWaitingForFields(false);
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    }
  }, [isOpen, onClose, unsubscribe, initialConfig]);

  // Handle MQTT message
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const fields = Object.keys(innerPayload);

          setAvailableFields((prevFields) => {
            const allFields = [...new Set([...prevFields, ...fields])];
            return allFields;
          });
        } else {
          console.warn("Payload 'value' is not a JSON string:", payload.value);
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForFields(false);
      }
    },
    []
  );

  // Handle device selection
  const handleDeviceChange = (deviceUniqId: string) => {
    setSelectedDeviceUniqId(deviceUniqId);
    setTargetTopic("");
    setKeyValuePairs([]);
    setAvailableFields([]);
    setIsWaitingForFields(true);

    // Unsubscribe from previous topic
    if (subscribedTopicRef.current) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
    }

    // Subscribe to new device topic
    const device = devices.find((d) => d.uniqId === deviceUniqId);
    if (device) {
      subscribe(device.topic, handleMqttMessage);
      subscribedTopicRef.current = device.topic;
    }
  };

  const handleAddKey = () => {
    const newId = Date.now().toString();
    setKeyValuePairs([
      ...keyValuePairs,
      { id: newId, keyName: "", keyValue: "" },
    ]);
  };

  const handleRemoveKey = (id: string) => {
    setKeyValuePairs(keyValuePairs.filter((pair) => pair.id !== id));
  };

  const handleKeyChange = (id: string, field: "keyName" | "keyValue", value: string) => {
    setKeyValuePairs(
      keyValuePairs.map((pair) =>
        pair.id === id ? { ...pair, [field]: value } : pair
      )
    );
  };

  const handleConfirm = () => {
    if (!selectedDeviceUniqId) {
      showToast.error("Please select a source device");
      return;
    }

    if (!selectedDevice) {
      showToast.error("Device not found");
      return;
    }

    if (keyValuePairs.length === 0) {
      showToast.warning("Please add at least one key-value pair");
      return;
    }

    // Validate all pairs have both keyName and keyValue
    const hasEmpty = keyValuePairs.some((pair) => !pair.keyName.trim() || !pair.keyValue.trim());
    if (hasEmpty) {
      showToast.warning("All key-value pairs must have both name and value");
      return;
    }

    onSelect(
      selectedDeviceUniqId,
      selectedDevice.topic,
      "",
      keyValuePairs.map((pair) => ({
        keyName: pair.keyName,
        keyValue: pair.keyValue,
      }))
    );

    // Reset state
    setSelectedDeviceUniqId(null);
    setTargetTopic("");
    setKeyValuePairs([]);
    setAvailableFields([]);
    setIsWaitingForFields(false);
    if (subscribedTopicRef.current) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Data Enrichment
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Select a source device, then add custom key-value pairs to enrich the payload. These will be merged into the "value" field before publishing to your custom target topic.
            </p>
          </div>

          {/* Device Selection */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Select Source Device
            </label>
            <Select
              onValueChange={handleDeviceChange}
              value={selectedDeviceUniqId || ""}
              disabled={isLoadingDevices}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingDevices ? "Loading devices..." : "Choose a device"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {devices.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">No devices found</div>
                ) : (
                  devices.map((device) => (
                    <SelectItem key={device.uniqId} value={device.uniqId}>
                      {device.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select a device to listen for incoming data
            </p>
          </div>

          {/* Device Status */}
          {selectedDeviceUniqId && (
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              {isWaitingForFields ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Waiting for device data...
                  </p>
                </div>
              ) : availableFields.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  No fields detected yet. Make sure the device is sending data.
                </p>
              ) : null}
            </div>
          )}


          {/* Key-Value Pairs */}
          {selectedDeviceUniqId && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Custom Fields to Add
                </label>
                <button
                  onClick={handleAddKey}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Key
                </button>
              </div>

              {keyValuePairs.length === 0 ? (
                <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-center text-slate-500 dark:text-slate-400">
                  No keys added yet. Click "Add Key" to start.
                </div>
              ) : (
                <div className="space-y-3">
                  {keyValuePairs.map((pair) => (
                    <div key={pair.id} className="flex gap-2">
                      {/* Key Name */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pair.keyName}
                          onChange={(e) => handleKeyChange(pair.id, "keyName", e.target.value)}
                          placeholder="e.g., calibrated_temp"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">Key name</p>
                      </div>

                      {/* Key Value */}
                      <div className="flex-1">
                        <input
                          type="text"
                          value={pair.keyValue}
                          onChange={(e) => handleKeyChange(pair.id, "keyValue", e.target.value)}
                          placeholder="e.g., 25.5"
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
                        />
                        <p className="text-xs text-slate-500 mt-1">Value (string, number, etc)</p>
                      </div>

                      {/* Delete Button */}
                      <div className="flex items-end">
                        <button
                          onClick={() => handleRemoveKey(pair.id)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {keyValuePairs.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Custom Fields Preview
              </label>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono text-xs text-slate-700 dark:text-slate-300 overflow-x-auto">
                <pre>
                  {JSON.stringify(
                    Object.fromEntries(
                      keyValuePairs.map((pair) => [pair.keyName, pair.keyValue])
                    ),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDeviceUniqId || keyValuePairs.length === 0 || keyValuePairs.some((m) => !m.keyName.trim() || !m.keyValue.trim())}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDeviceUniqId &&
              keyValuePairs.length > 0 &&
              keyValuePairs.every((m) => m.keyName.trim() && m.keyValue.trim())
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
