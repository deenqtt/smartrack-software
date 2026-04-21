"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, CheckCircle2, Circle } from "lucide-react";
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

interface ExtractFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedFields: string[]) => void; // ✅ Only selectedFields, no device info!
  initialConfig?: { [key: string]: any };
}

export default function ExtractFieldsModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: ExtractFieldsModalProps) {
  const { subscribe, unsubscribe } = useMqttServer();
  const [mounted, setMounted] = useState(false);

  // Devices & Loading
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Selection state
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<string | null>(
    null
  );
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  // MQTT Fields
  const [availableFields, setAvailableFields] = useState<string[]>([]);
  const [isWaitingForFields, setIsWaitingForFields] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const selectedDevice = devices.find((d) => d.uniqId === selectedDeviceUniqId);

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
        if (initialConfig.selectedFields && Array.isArray(initialConfig.selectedFields)) {
          setSelectedFields(new Set(initialConfig.selectedFields));
        }
      }
    } else {
      // Reset state saat modal ditutup
      setSelectedDeviceUniqId(null);
      setSelectedFields(new Set());
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
    setSelectedFields(new Set());
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

  // Handle field selection toggle
  const toggleFieldSelection = (field: string) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(field)) {
      newSelection.delete(field);
    } else {
      newSelection.add(field);
    }
    setSelectedFields(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedFields.size === availableFields.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(availableFields));
    }
  };

  const handleConfirm = () => {
    if (selectedFields.size === 0) {
      showToast.error("Please select at least one field");
      return;
    }

    // ✅ Only pass selectedFields array (no device info needed - using edge flow!)
    onSelect(Array.from(selectedFields));

    // Reset state
    setSelectedDeviceUniqId(null);
    setSelectedFields(new Set());
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
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Extract Fields
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-6 p-6">
          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
            <AlertCircle size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Extract specific fields from the incoming payload. Device selection is only used to discover available fields - data will come from the previous node via edge flow.
            </p>
          </div>

          {/* Device Selection (for field discovery only) */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Select Device (For Field Discovery)
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
              Choose a device to discover available fields (data will come from previous node)
            </p>
          </div>

          {/* Fields Selection */}
          {selectedDeviceUniqId && (
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Available Fields
                </label>
                {availableFields.length > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="text-xs px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                  >
                    {selectedFields.size === availableFields.length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                )}
              </div>

              {isWaitingForFields ? (
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Waiting for device data...
                  </p>
                </div>
              ) : availableFields.length === 0 ? (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No fields detected yet. Make sure the device is sending data.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {availableFields.map((field) => (
                    <button
                      key={field}
                      onClick={() => toggleFieldSelection(field)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                    >
                      {selectedFields.has(field) ? (
                        <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                      ) : (
                        <Circle size={18} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      )}
                      <span className={`text-sm font-medium ${
                        selectedFields.has(field)
                          ? "text-green-700 dark:text-green-300"
                          : "text-slate-700 dark:text-slate-300"
                      }`}>
                        {field}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {selectedFields.size > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Selected Fields ({selectedFields.size}):
              </p>
              <div className="grid gap-2">
                {Array.from(selectedFields).map((field) => (
                  <div
                    key={field}
                    className="text-xs px-3 py-2 bg-white dark:bg-slate-800 rounded border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 font-mono"
                  >
                    {field}
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Only these fields will be forwarded to the next node
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 sticky bottom-0 bg-white dark:bg-slate-900">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={selectedFields.size === 0}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedFields.size > 0
                ? "bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
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
