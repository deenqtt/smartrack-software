"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, Plus, Trash2, ArrowRight } from "lucide-react";
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

interface FieldMapping {
  id: string;
  sourceField: string;
  targetField: string;
}

interface MapPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mappings: FieldMapping[]) => void; // ✅ Only mappings, no device info!
  initialConfig?: { [key: string]: any };
}

export default function MapPayloadModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: MapPayloadModalProps) {
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
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);

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
        if (initialConfig.mappings && Array.isArray(initialConfig.mappings)) {
          setFieldMappings(initialConfig.mappings);
        }
      }
    } else {
      // Reset state saat modal ditutup
      setSelectedDeviceUniqId(null);
      setFieldMappings([]);
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
    setFieldMappings([]);
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

  // Add new mapping
  const handleAddMapping = () => {
    const newMapping: FieldMapping = {
      id: Date.now().toString(),
      sourceField: "",
      targetField: "",
    };
    setFieldMappings([...fieldMappings, newMapping]);
  };

  // Update mapping
  const handleUpdateMapping = (
    id: string,
    field: "sourceField" | "targetField",
    value: string
  ) => {
    setFieldMappings(
      fieldMappings.map((mapping) =>
        mapping.id === id ? { ...mapping, [field]: value } : mapping
      )
    );
  };

  // Delete mapping
  const handleDeleteMapping = (id: string) => {
    setFieldMappings(fieldMappings.filter((mapping) => mapping.id !== id));
  };

  const handleConfirm = () => {
    if (fieldMappings.length === 0) {
      showToast.error("Please add at least one field mapping");
      return;
    }

    // Validate all mappings have source and target
    const hasInvalidMappings = fieldMappings.some(
      (m) => !m.sourceField.trim() || !m.targetField.trim()
    );

    if (hasInvalidMappings) {
      showToast.error("All mappings must have both source and target fields");
      return;
    }

    // Check for duplicate source fields
    const sourceFields = fieldMappings.map((m) => m.sourceField);
    const uniqueSourceFields = new Set(sourceFields);
    if (sourceFields.length !== uniqueSourceFields.size) {
      showToast.error("Source fields must be unique");
      return;
    }

    // ✅ Only pass mappings array (no device info needed - using edge flow!)
    onSelect(fieldMappings);

    // Reset state
    setSelectedDeviceUniqId(null);
    setFieldMappings([]);
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
            Map Payload
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
              Map source fields to target fields to transform the payload structure. Device selection is only used to discover available fields - data will come from the previous node via edge flow.
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

          {/* Field Mappings */}
          {selectedDeviceUniqId && availableFields.length > 0 && (
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Field Mappings
                </label>
                <button
                  onClick={handleAddMapping}
                  className="flex items-center gap-1 text-xs px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                >
                  <Plus size={14} />
                  Add Mapping
                </button>
              </div>

              {fieldMappings.length === 0 ? (
                <div className="p-4 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No mappings yet. Click "Add Mapping" to create one.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fieldMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex gap-3 items-end p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    >
                      {/* Source Field */}
                      <div className="flex-1 grid gap-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Source Field
                        </label>
                        <Select
                          value={mapping.sourceField}
                          onValueChange={(value) =>
                            handleUpdateMapping(mapping.id, "sourceField", value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select source field" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableFields.map((field) => (
                              <SelectItem key={field} value={field}>
                                {field}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center justify-center text-slate-400 dark:text-slate-500 mt-5">
                        <ArrowRight size={20} />
                      </div>

                      {/* Target Field */}
                      <div className="flex-1 grid gap-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          Target Field
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., temperature"
                          value={mapping.targetField}
                          onChange={(e) =>
                            handleUpdateMapping(
                              mapping.id,
                              "targetField",
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400"
                        />
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteMapping(mapping.id)}
                        className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg transition-colors mt-5"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {fieldMappings.length > 0 && fieldMappings.every(m => m.sourceField && m.targetField) && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Transformation Preview:
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                    Source Format:
                  </p>
                  <div className="bg-white dark:bg-slate-800 rounded p-3 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    {fieldMappings.map((m) => (
                      <div key={m.id}>{`"${m.sourceField}": value`}</div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-2">
                    Target Format:
                  </p>
                  <div className="bg-white dark:bg-slate-800 rounded p-3 font-mono text-xs text-slate-700 dark:text-slate-300 space-y-1">
                    {fieldMappings.map((m) => (
                      <div key={m.id}>{`"${m.targetField}": value`}</div>
                    ))}
                  </div>
                </div>
              </div>
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
            disabled={
              fieldMappings.length === 0 ||
              fieldMappings.some((m) => !m.sourceField || !m.targetField)
            }
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              fieldMappings.length > 0 &&
              fieldMappings.every((m) => m.sourceField && m.targetField)
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
