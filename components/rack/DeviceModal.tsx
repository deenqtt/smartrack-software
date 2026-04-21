"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Trash2 } from "lucide-react";

export type DeviceType = "server" | "pdu-rail" | "pdu-side" | "ups" | "switch";
export type PDUSide = "left" | "right";

export interface DeviceFormData {
  name: string;
  deviceType: DeviceType;
  position?: number; // U position (for rack-mount devices)
  height?: number; // Height in U (for rack-mount devices)
  side?: PDUSide; // For pdu-side
  outlets?: number; // For pdu-side
  ports?: number; // For switch
  mqtt_topic?: string;
}

interface DeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DeviceFormData) => void;
  onDelete?: () => void;
  editingDevice?: any; // For edit mode
  maxU?: number;
}

export default function DeviceModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingDevice,
  maxU = 42,
}: DeviceModalProps) {
  const isEditMode = !!editingDevice;

  const [formData, setFormData] = useState<DeviceFormData>({
    name: "",
    deviceType: "server",
    position: 1,
    height: 1,
    side: "left",
    outlets: 8,
    ports: 24,
    mqtt_topic: "",
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && editingDevice) {
      setFormData({
        name: editingDevice.name || "",
        deviceType: editingDevice.deviceType || "server",
        position: editingDevice.position,
        height: editingDevice.height,
        side: editingDevice.side || "left",
        outlets: editingDevice.outlets || 8,
        ports: editingDevice.ports || 24,
        mqtt_topic: editingDevice.mqtt_topic || "",
      });
    }
  }, [isEditMode, editingDevice]);

  const deviceTypes: { value: DeviceType; label: string }[] = [
    { value: "server", label: "Server" },
    { value: "pdu-rail", label: "PDU (Rack Mount)" },
    { value: "pdu-side", label: "PDU (Side Mount)" },
    { value: "ups", label: "UPS" },
    { value: "switch", label: "Network Switch" },
  ];

  const handleDeviceTypeChange = (type: DeviceType) => {
    setFormData((prev) => ({
      ...prev,
      deviceType: type,
      // Reset device-specific fields
      position: 1,
      height: 1,
      side: "left",
      outlets: 8,
      ports: 24,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert("Device name is required");
      return;
    }

    // Validate position for rack-mount devices
    if (
      ["server", "pdu-rail", "ups", "switch"].includes(formData.deviceType)
    ) {
      if (!formData.position || formData.position < 1 || formData.position > maxU) {
        alert(`Position must be between 1 and ${maxU}`);
        return;
      }
      if (!formData.height || formData.height < 1) {
        alert("Height must be at least 1U");
        return;
      }
    }

    onSave(formData);
    setFormData({
      name: "",
      deviceType: "server",
      position: 1,
      height: 1,
      side: "left",
      outlets: 8,
      ports: 24,
      mqtt_topic: "",
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg bg-white dark:bg-slate-800 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? `Edit: ${formData.name}` : "Add Device"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Device Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Device Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {deviceTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleDeviceTypeChange(type.value)}
                  className={`p-3 rounded-lg border-2 transition-colors text-sm font-medium ${
                    formData.deviceType === type.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-600"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Device Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              placeholder="e.g., Server 01, Main PDU"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Position (for rack-mount devices) */}
          {["server", "pdu-rail", "ups", "switch"].includes(
            formData.deviceType
          ) && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Position (U) *
                </label>
                <input
                  type="number"
                  min="1"
                  max={maxU}
                  value={formData.position || 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      position: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Height (U) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.height || 1}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      height: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* PDU Side Mount - Side & Outlets */}
          {formData.deviceType === "pdu-side" && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Side *
                </label>
                <div className="flex gap-2">
                  {(["left", "right"] as PDUSide[]).map((s) => (
                    <button
                      key={s}
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, side: s }))
                      }
                      className={`flex-1 p-2 rounded-lg border-2 transition-colors text-sm font-medium capitalize ${
                        formData.side === s
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                          : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Outlets *
                </label>
                <select
                  value={formData.outlets || 8}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      outlets: parseInt(e.target.value),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="6">6 Outlets</option>
                  <option value="8">8 Outlets</option>
                  <option value="12">12 Outlets</option>
                </select>
              </div>
            </div>
          )}

          {/* Switch - Ports */}
          {formData.deviceType === "switch" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Ports *
              </label>
              <select
                value={formData.ports || 24}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    ports: parseInt(e.target.value),
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="24">24 Ports</option>
                <option value="48">48 Ports</option>
              </select>
            </div>
          )}

          {/* MQTT Topic (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              MQTT Topic (Optional)
            </label>
            <input
              type="text"
              value={formData.mqtt_topic || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, mqtt_topic: e.target.value }))
              }
              placeholder="e.g., container/device/server_1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty if device doesn't have monitoring
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-slate-700">
          {isEditMode && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors font-medium flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
          >
            {isEditMode ? "Update Device" : "Add Device"}
          </button>
        </div>
      </Card>
    </div>
  );
}
