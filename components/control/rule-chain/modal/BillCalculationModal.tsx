"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Lightbulb, Loader2 } from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface MqttDevice {
  uniqId: string;
  id: string;
  name: string;
  topic: string;
  lastPayload?: Record<string, any>;
}

interface BillCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    nodeName: string,
    config?: {
      nodeName: string;
      deviceId?: string;
      deviceUniqId?: string;
      selectedKey?: string;
      rupiahRate?: string;
      dollarRate?: string;
      topic?: string;
    }
  ) => void;
  initialConfig?: { [key: string]: any };
}

export default function BillCalculationModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: BillCalculationModalProps) {
  const { subscribe, unsubscribe } = useMqttServer();
  const [mounted, setMounted] = useState(false);

  // Devices & Loading
  const [devices, setDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Form state
  const [selectedDevice, setSelectedDevice] = useState<MqttDevice | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [rupiahRate, setRupiahRate] = useState<string>("1467");
  const [dollarRate, setDollarRate] = useState<string>("0.1");

  const keySubTopicRef = useRef<string | null>(null);

  // Set mounted on component mount
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
        setSelectedKey(initialConfig.selectedKey || "");
        setRupiahRate(initialConfig.rupiahRate || "1467");
        setDollarRate(initialConfig.dollarRate || "0.1");

        // Find and set device if deviceId/deviceUniqId is provided
        if (initialConfig.deviceId || initialConfig.deviceUniqId) {
          // Will set selected device in a separate effect after devices are loaded
        }
      } else {
        // Don't reset form here - let user keep their input while devices are loading
      }
    } else {
      resetForm();
    }
  }, [isOpen, onClose, initialConfig]);

  // Set selected device from initialConfig when devices are loaded
  useEffect(() => {
    if (isOpen && initialConfig && devices.length > 0) {
      if (initialConfig.deviceId || initialConfig.deviceUniqId) {
        const device = devices.find(
          (d) =>
            d.id === initialConfig.deviceId ||
            d.uniqId === initialConfig.deviceUniqId
        );
        if (device) {
          setSelectedDevice(device);
        }
      }
    }
  }, [isOpen, initialConfig, devices]);

  // Handle MQTT key response
  const handleMqttKeyResponse = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys(Object.keys(innerPayload));
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttKeyResponse);
        keySubTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  // Fetch keys ketika device berubah
  useEffect(() => {
    const topic = selectedDevice?.topic;
    if (keySubTopicRef.current && keySubTopicRef.current !== topic) {
      unsubscribe(keySubTopicRef.current, handleMqttKeyResponse);
    }
    if (topic && topic !== keySubTopicRef.current) {
      setAvailableKeys([]);
      setSelectedKey("");
      setIsWaitingForKey(true);
      subscribe(topic, handleMqttKeyResponse);
      keySubTopicRef.current = topic;
    }
  }, [selectedDevice, subscribe, unsubscribe, handleMqttKeyResponse]);

  const handleDeviceChange = (uniqId: string) => {
    const device = devices.find((d) => d.id === uniqId || d.uniqId === uniqId);
    setSelectedDevice(device || null);
    setSelectedKey("");
  };

  const handleConfirm = () => {
    // Validate inputs
    if (!selectedDevice || !selectedKey) {
      showToast.warning("Please select device and key");
      return;
    }

    if (!rupiahRate || !dollarRate) {
      showToast.warning("Please enter rates");
      return;
    }

    // Auto-generate node label
    const fullLabel = `Bill: ${selectedDevice.name} - ${selectedKey}`;

    // Pass full config along with label
    onSelect(fullLabel, {
      nodeName: fullLabel,
      deviceId: selectedDevice.id,
      deviceUniqId: selectedDevice.uniqId,
      selectedKey,
      rupiahRate,
      dollarRate,
      topic: selectedDevice.topic,
    });
    resetForm();
  };

  const resetForm = () => {
    setSelectedDevice(null);
    setAvailableKeys([]);
    setSelectedKey("");
    setRupiahRate("1467");
    setDollarRate("0.1");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Bill Calculation
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
            <Lightbulb
              size={16}
              className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Configure electricity cost calculation with device data source and
              rates
            </p>
          </div>

          {/* Device Selection */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
              Select Device (Source)
            </Label>
            {isLoadingDevices ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-slate-500">
                  Loading devices...
                </span>
              </div>
            ) : (
              <Select
                onValueChange={handleDeviceChange}
                value={selectedDevice?.id || selectedDevice?.uniqId || ""}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                  <SelectValue placeholder="Select a device..." />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                  {devices.map((device) => (
                    <SelectItem
                      key={device.id || device.uniqId}
                      value={device.id || device.uniqId}
                    >
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Key Selection */}
          {selectedDevice && (
            <div>
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                Select Key from Payload
              </Label>
              <Select
                onValueChange={setSelectedKey}
                value={selectedKey}
                disabled={availableKeys.length === 0 || isWaitingForKey}
              >
                <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700 disabled:opacity-50">
                  <SelectValue
                    placeholder={
                      isWaitingForKey
                        ? "Waiting for data..."
                        : availableKeys.length === 0
                        ? "No keys available"
                        : "Select a key..."
                    }
                  />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                  {availableKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Rates */}
          {selectedDevice && selectedKey && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                  IDR Rate (/kWh)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={rupiahRate}
                  onChange={(e) => setRupiahRate(e.target.value)}
                  placeholder="e.g., 1467"
                  className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                />
              </div>
              <div>
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
                  USD Rate (/kWh)
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  value={dollarRate}
                  onChange={(e) => setDollarRate(e.target.value)}
                  placeholder="e.g., 0.10"
                  className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          {/* Summary */}
          {selectedDevice && selectedKey && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                Configuration Summary:
              </p>
              <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
                <p>
                  <span className="font-medium">Device:</span>{" "}
                  {selectedDevice.name}
                </p>
                <p>
                  <span className="font-medium">Key:</span> {selectedKey}
                </p>
                <p>
                  <span className="font-medium">IDR Rate:</span> Rp {rupiahRate}
                  /kWh
                </p>
                <p>
                  <span className="font-medium">USD Rate:</span> ${dollarRate}
                  /kWh
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              !selectedDevice ||
              !selectedKey ||
              !rupiahRate ||
              !dollarRate
            }
          >
            Add Bill Node
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
