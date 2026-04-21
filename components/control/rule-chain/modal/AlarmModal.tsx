"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, AlertCircle, AlertTriangle, AlertOctagon, Info } from "lucide-react";

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    alarmType: "CRITICAL" | "MAJOR" | "MINOR",
    customMessage?: string
  ) => void;
  initialConfig?: { [key: string]: any };
}

const ALARM_TYPES = [
  {
    id: "CRITICAL",
    label: "Critical",
    icon: AlertOctagon,
    description: "Highest severity - immediate action required",
  },
  {
    id: "MAJOR",
    label: "Major",
    icon: AlertTriangle,
    description: "High severity - significant issue",
  },
  {
    id: "MINOR",
    label: "Minor",
    icon: Info,
    description: "Low severity - informational",
  },
] as const;

export default function AlarmModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: AlarmModalProps) {
  const [mounted, setMounted] = useState(false);
  const [alarmType, setAlarmType] = useState<"CRITICAL" | "MAJOR" | "MINOR">(
    "CRITICAL"
  );
  const [customMessage, setCustomMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && initialConfig) {
      setAlarmType(initialConfig.alarmType || "CRITICAL");
      setCustomMessage(initialConfig.customMessage || "");
    } else if (!isOpen) {
      setAlarmType("CRITICAL");
      setCustomMessage("");
    }
  }, [isOpen, initialConfig]);

  const handleConfirm = () => {
    onSelect(alarmType, customMessage || undefined);
    setAlarmType("CRITICAL");
    setCustomMessage("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <AlertCircle size={20} />
            Create Alarm Trigger
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Alarm Severity Type
            </label>
            <div className="space-y-2">
              {ALARM_TYPES.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.id}
                    onClick={() => setAlarmType(type.id as "CRITICAL" | "MAJOR" | "MINOR")}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left flex items-center gap-3 ${
                      alarmType === type.id
                        ? type.id === "CRITICAL"
                          ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                          : type.id === "MAJOR"
                            ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20"
                            : "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <Icon size={20} className={
                      alarmType === type.id
                        ? type.id === "CRITICAL"
                          ? "text-red-600"
                          : type.id === "MAJOR"
                            ? "text-yellow-600"
                            : "text-blue-600"
                        : "text-slate-500"
                    } />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {type.label}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {type.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Custom Message (Optional)
            </label>
            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g., Field temperature tidak ditemukan, atau Device offline..."
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-orange-500 resize-none h-20"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Ini akan jadi reason/message alarm saat di-trigger
            </p>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-xs text-orange-800 dark:text-orange-200">
            <p className="font-semibold mb-1">Cara Kerja:</p>
            <p>
              Node ini akan trigger saat receive input dari upstream. Alarm akan
              dicatat ke database dan user akan dapat notifikasi dengan message
              dan severity type yang sudah dipilih.
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
            className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
