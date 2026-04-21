"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, BarChart3, Settings, Bell, Zap, Activity, AlertTriangle, Lightbulb } from "lucide-react";

interface MessageTypeFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedTypes: string[]) => void;
  initialConfig?: { [key: string]: any };
}

// Message type definitions
const MESSAGE_TYPES = [
  { id: "telemetry", label: "Telemetry", icon: BarChart3, description: "Sensor readings & measurements" },
  { id: "attribute", label: "Attribute", icon: Settings, description: "Device properties & metadata" },
  { id: "event", label: "Event", icon: Bell, description: "Special events & occurrences" },
  { id: "command", label: "Command", icon: Zap, description: "Commands to device" },
  { id: "status", label: "Status", icon: Activity, description: "Device status & state" },
  { id: "alarm", label: "Alarm", icon: AlertTriangle, description: "Alarm & critical alerts" },
];

export default function MessageTypeFilterModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: MessageTypeFilterModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill form when modal opens with initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setSelectedTypes(initialConfig.selectedTypes || []);
    } else if (!isOpen) {
      // Reset form when closed
      setSelectedTypes([]);
    }
  }, [isOpen, initialConfig]);

  const handleTypeToggle = (typeId: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeId) ? prev.filter((t) => t !== typeId) : [...prev, typeId]
    );
  };

  const handleConfirm = () => {
    if (selectedTypes.length === 0) {
      showToast.warning("Please select at least one message type.");
      return;
    }

    onSelect(selectedTypes);
    setSelectedTypes([]);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Message Type Filter
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info */}
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex gap-2">
            <Lightbulb size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Select which message types to allow through this filter.
            </p>
          </div>

          {/* Message Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-3">
              Message Types
            </label>

            <div className="grid grid-cols-2 gap-3">
              {MESSAGE_TYPES.map((type) => {
                const IconComponent = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => handleTypeToggle(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTypes.includes(type.id)
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTypes.includes(type.id)}
                        onChange={() => handleTypeToggle(type.id)}
                        className="mt-1 w-4 h-4 rounded cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <IconComponent size={18} className="text-slate-600 dark:text-slate-400" />
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {type.label}
                          </p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Preview */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Filter will allow: {selectedTypes.join(", ") || "none"}
              </p>
            </div>
          </div>
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
            disabled={selectedTypes.length === 0}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTypes.length > 0
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
