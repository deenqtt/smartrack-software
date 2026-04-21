"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle } from "lucide-react";
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

interface FieldExistenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (fieldName: string, deviceName: string, deviceUniqId: string, topic?: string) => void;
  initialConfig?: { [key: string]: any };
}

export default function FieldExistenceModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: FieldExistenceModalProps) {
  const { subscribe, unsubscribe } = useMqttServer();
  const [mounted, setMounted] = useState(false);

  // Devices & Loading
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Selection state
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState<string | null>(null);

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
        setSelectedField(initialConfig.fieldName || null);
      }
    } else {
      // Reset state saat modal ditutup
      setSelectedDeviceUniqId(null);
      setSelectedField(null);
      setAvailableFields([]);
      setIsWaitingForFields(false);
    }
  }, [isOpen, onClose, initialConfig]);

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
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  // Subscribe ke MQTT saat device berubah
  useEffect(() => {
    if (!isOpen) return;

    const newTopic = selectedDevice?.topic;

    // Unsubscribe dari topic lama jika ada
    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    // Subscribe ke topic baru
    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableFields([]);
      setSelectedField(null);
      setIsWaitingForFields(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      // Cleanup saat component unmount
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    selectedDeviceUniqId,
    selectedDevice,
    isOpen,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const handleConfirm = () => {
    if (selectedDeviceUniqId && selectedDevice && selectedField) {
      onSelect(selectedField, selectedDevice.name, selectedDeviceUniqId, selectedDevice.topic);
      // Reset state
      setSelectedDeviceUniqId(null);
      setSelectedField(null);
      setAvailableFields([]);
      onClose();
    }
  };

  const handleDeviceSelect = (uniqId: string) => {
    setSelectedDeviceUniqId(uniqId);
    setSelectedField(null);
    setAvailableFields([]);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Check Field Existence
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
              Select a device and the field to check for existence. The filter will pass through data only if the field is present.
            </p>
          </div>

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
          </div>

          {/* Field Selection - Show only if device is selected */}
          {selectedDevice && (
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Field to Check
              </label>
              <Select
                onValueChange={setSelectedField}
                value={selectedField || ""}
                disabled={!selectedDeviceUniqId || availableFields.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      isWaitingForFields
                        ? "Waiting for device data..."
                        : "Select a field"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field} value={field}>
                      {field}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDeviceUniqId &&
                !isWaitingForFields &&
                availableFields.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No fields received. Ensure the device is publishing data.
                  </p>
                )}
            </div>
          )}

          {/* Preview */}
          {selectedDevice && selectedField && (
            <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Filter Preview:
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1 font-mono">
                IF '{selectedField}' exists in {selectedDevice.name}
              </p>
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
            disabled={!selectedDeviceUniqId || !selectedField}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedDeviceUniqId && selectedField
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
