"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Timer, Clock, Pause } from "lucide-react";

interface DelayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mode: "delay" | "throttle" | "debounce", duration: number, unit: "seconds" | "minutes") => void;
  initialConfig?: { [key: string]: any };
}

const MODE_TYPES = [
  { id: "delay", label: "Delay", icon: Timer, description: "Wait before passing message" },
  { id: "throttle", label: "Throttle", icon: Clock, description: "Limit message rate (max per period)" },
  { id: "debounce", label: "Debounce", icon: Pause, description: "Wait for quiet period before passing" },
] as const;

export default function DelayModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: DelayModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"delay" | "throttle" | "debounce">("delay");
  const [duration, setDuration] = useState("30");
  const [unit, setUnit] = useState<"seconds" | "minutes">("seconds");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setMode(initialConfig.mode || "delay");
      setDuration(String(initialConfig.duration || "30"));
      setUnit(initialConfig.unit || "seconds");
    } else if (!isOpen) {
      setMode("delay");
      setDuration("30");
      setUnit("seconds");
    }
  }, [isOpen, initialConfig]);

  const handleConfirm = () => {
    const durationNum = parseInt(duration);
    if (isNaN(durationNum) || durationNum <= 0) {
      showToast.warning("Please enter a valid duration");
      return;
    }

    onSelect(mode, durationNum, unit);
    setMode("delay");
    setDuration("30");
    setUnit("seconds");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Timer size={20} />
            Delay / Throttle
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Mode
            </label>
            <div className="space-y-2">
              {MODE_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setMode(type.id)}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      mode === type.id
                        ? "border-pink-500 bg-pink-50 dark:bg-pink-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={18} />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{type.label}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{type.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Duration
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="1"
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-pink-500"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as "seconds" | "minutes")}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-pink-500"
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-xs text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">How it works:</p>
            <p>
              {mode === "delay" && "Messages will be delayed by the specified duration before passing through."}
              {mode === "throttle" && "Only one message per duration period will pass through. Excess messages are dropped."}
              {mode === "debounce" && "Messages are delayed and only the last one in the period is passed through."}
            </p>
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
            className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors font-medium"
          >
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
