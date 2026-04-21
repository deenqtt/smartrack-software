"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, Lightbulb, PlusCircle, Trash2, Info, Loader2 } from "lucide-react";
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
  name: string;
  topic: string;
}

interface Operand {
  id: string;
  deviceUniqId: string | null;
  deviceName?: string | null;
  topic?: string | null;
  selectedKey: string | null;
}

type CalculationType = "SUM" | "AVERAGE" | "MIN" | "MAX";

const CALCULATION_DESCRIPTIONS: Record<CalculationType, string> = {
  SUM: "Add all values together: A + B + C + ...",
  AVERAGE: "Calculate mean: (A + B + C + ...) / count",
  MIN: "Find the lowest value",
  MAX: "Find the highest value",
};

const CALCULATION_OPTIONS: CalculationType[] = ["SUM", "AVERAGE", "MIN", "MAX"];

// Operand Form Component
const OperandForm = ({
  operand,
  updateOperand,
  removeOperand,
  allDevices,
  isLoadingDevices,
  operandIndex,
}: {
  operand: Operand;
  updateOperand: (id: string, field: keyof Operand, value: any) => void;
  removeOperand: (id: string) => void;
  allDevices: MqttDevice[];
  isLoadingDevices: boolean;
  operandIndex: number;
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);

  const handleMqttMessage = useCallback(
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
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe]
  );

  useEffect(() => {
    const topic = allDevices.find(
      (d) => d.uniqId === operand.deviceUniqId
    )?.topic;
    if (subscribedTopicRef.current && subscribedTopicRef.current !== topic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
    }
    if (topic && topic !== subscribedTopicRef.current) {
      setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(topic, handleMqttMessage);
      subscribedTopicRef.current = topic;
    }
  }, [
    operand.deviceUniqId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const handleDeviceChange = (value: string) => {
    const selectedDevice = allDevices.find((d) => d.uniqId === value);
    updateOperand(operand.id, "deviceUniqId", value);
    updateOperand(operand.id, "deviceName", selectedDevice?.name || null);
    updateOperand(operand.id, "topic", selectedDevice?.topic || null);
    updateOperand(operand.id, "selectedKey", null);
    setAvailableKeys([]);
  };

  return (
    <div className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50">
      {/* Operand label */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
          {String.fromCharCode(65 + operandIndex)}
        </span>
      </div>

      {/* Form fields */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">Device</Label>
          {isLoadingDevices ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-slate-500">Loading...</span>
            </div>
          ) : (
            <Select
              onValueChange={handleDeviceChange}
              value={operand.deviceUniqId || ""}
            >
              <SelectTrigger className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600">
                <SelectValue placeholder="Select a device" />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                {allDevices.map((d) => (
                  <SelectItem key={d.uniqId} value={d.uniqId}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="grid gap-2">
          <Label className="text-slate-700 dark:text-slate-300">Data Key</Label>
          <Select
            onValueChange={(value) =>
              updateOperand(operand.id, "selectedKey", value)
            }
            value={operand.selectedKey || ""}
            disabled={!operand.deviceUniqId || availableKeys.length === 0}
          >
            <SelectTrigger className="dark:bg-slate-700 dark:text-slate-100 dark:border-slate-600 disabled:opacity-50">
              <SelectValue
                placeholder={isWaitingForKey ? "Waiting..." : "Select a key"}
              />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
              {availableKeys.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="mt-6 text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20"
        onClick={() => removeOperand(operand.id)}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
};

interface SumValuesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeName: string, config: { nodeTitle: string; calculationType: CalculationType; operands: Operand[] }) => void;
  initialConfig?: { [key: string]: any };
}

export default function SumValuesModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: SumValuesModalProps) {
  // Devices & Loading
  const [devices, setDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Operands state
  const [operands, setOperands] = useState<Operand[]>([]);

  // Calculation type
  const [calculationType, setCalculationType] =
    useState<CalculationType>("SUM");

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
        setCalculationType(initialConfig.calculationType || "SUM");
        if (initialConfig.operands && Array.isArray(initialConfig.operands)) {
          setOperands(initialConfig.operands);
        } else {
          setOperands([
            { id: `op-${Date.now()}`, deviceUniqId: null, deviceName: null, topic: null, selectedKey: null },
          ]);
        }
      } else {
        // Initialize with one operand
        setOperands([
          { id: `op-${Date.now()}`, deviceUniqId: null, deviceName: null, topic: null, selectedKey: null },
        ]);
        setCalculationType("SUM");
      }
    } else {
      // Reset state saat modal ditutup
      setOperands([]);
      setCalculationType("SUM");
    }
  }, [isOpen, onClose, initialConfig]);

  // Add operand
  const addOperand = () => {
    setOperands((prev) => [
      ...prev,
      {
        id: `op-${Date.now()}`,
        deviceUniqId: null,
        selectedKey: null,
      },
    ]);
  };

  // Remove operand
  const removeOperand = (id: string) => {
    if (operands.length > 1) {
      setOperands((prev) => prev.filter((op) => op.id !== id));
    }
  };

  // Update operand
  const updateOperand = (id: string, field: keyof Operand, value: any) => {
    setOperands((prev) =>
      prev.map((op) => (op.id === id ? { ...op, [field]: value } : op))
    );
  };

  const handleConfirm = () => {
    // Validate operands
    if (operands.length === 0) {
      showToast.warning("Please add at least one operand");
      return;
    }

    // Validate all operands are complete
    for (const op of operands) {
      if (!op.deviceUniqId || !op.selectedKey) {
        showToast.warning("Please complete all operand fields");
        return;
      }
    }

    // Auto-generate node label
    const fullLabel = `${calculationType}: ${operands.length} operand${operands.length > 1 ? 's' : ''}`;
    // Use first operand's device topic as node's device topic for MQTT triggering
    const firstOperandDevice = devices.find((d) => d.uniqId === operands[0].deviceUniqId);
    // Pass full config data along with label
    onSelect(fullLabel, {
      nodeTitle: fullLabel,
      calculationType,
      operands,
    });

    // Reset state
    setOperands([]);
    setCalculationType("SUM");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Sum Values & Aggregations
          </h2>
          <button
            onClick={onClose}
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
              Create an aggregation node with multiple data sources using
              calculation type
            </p>
          </div>

          {/* Calculation Type */}
          <div>
            <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 block">
              Calculation Type
            </Label>
            <Select
              value={calculationType}
              onValueChange={(value) =>
                setCalculationType(value as CalculationType)
              }
            >
              <SelectTrigger className="dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-slate-800 dark:text-slate-100">
                {CALCULATION_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Calculation Description */}
            <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mt-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {CALCULATION_DESCRIPTIONS[calculationType]}
              </p>
            </div>
          </div>

          {/* Operands Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Data Sources (Operands)
              </Label>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {operands.length} source{operands.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="space-y-3">
              {operands.map((op, index) => (
                <OperandForm
                  key={op.id}
                  operand={op}
                  updateOperand={updateOperand}
                  removeOperand={removeOperand}
                  allDevices={devices}
                  isLoadingDevices={isLoadingDevices}
                  operandIndex={index}
                />
              ))}
            </div>
          </div>

          {/* Add Operand Button */}
          <Button
            variant="outline"
            onClick={addOperand}
            className="w-full dark:border-slate-600 dark:hover:bg-slate-800"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Add Data Source
          </Button>

          {/* Helper text */}
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Tip: Use 2+ sources for better aggregation results.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              operands.length === 0 ||
              operands.some((op) => !op.deviceUniqId || !op.selectedKey)
            }
          >
            Add Node
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
