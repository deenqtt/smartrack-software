"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Database, AlertCircle } from "lucide-react";

interface LogToDbModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeName: string, config: any) => void;
  initialConfig?: { [key: string]: any };
}

export default function LogToDbModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: LogToDbModalProps) {
  const [mounted, setMounted] = useState(false);
  const [customName, setCustomName] = useState("");
  const [error, setError] = useState("");

  const nodeName = "Log to Database";

  useEffect(() => {
    setMounted(true);
    // Load initial config if editing
    if (initialConfig) {
      setCustomName(initialConfig.customName || "");
    }
  }, [initialConfig]);

  const handleConfirm = () => {
    if (!customName.trim()) {
      setError("Custom Name is required");
      return;
    }

    const config = {
      nodeSubType: "logToDb",
      customName: customName.trim(),
    };

    onSelect(nodeName, config);
    onClose();
    // Reset form
    setCustomName("");
    setError("");
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Database size={20} />
            Add 'Log to Database' Node
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">How it works:</p>
            <p>
              This node will take the incoming payload and send it via a POST
              request to a backend API endpoint for logging. Configure the
              logging configuration ID and optionally specify which field
              contains the value to log.
            </p>
          </div>

          {/* Configuration Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Logging Configuration Custom Name *
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Temperature Sensor, Humidity Monitor"
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Custom name of the logging configuration (not the ID)
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle
                  size={16}
                  className="text-red-600 dark:text-red-400"
                />
                <p className="text-sm text-red-800 dark:text-red-200">
                  {error}
                </p>
              </div>
            </div>
          )}

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
              Node Configuration:
            </p>
            <div className="space-y-1 text-xs text-green-700 dark:text-green-300">
              <p>
                <span className="font-medium">Node Name:</span> {nodeName}
              </p>
              <p>
                <span className="font-medium">Action:</span> POST to logging API
              </p>
              <p>
                <span className="font-medium">Custom Name:</span>{" "}
                {customName || "Not set"}
              </p>
              <p>
                <span className="font-medium">Value Source:</span> Auto-detect
                from payload
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-medium text-slate-700 dark:text-slate-300"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
