"use client";

import React, { useState, useEffect } from "react";
import { X, Clock, Calendar, Repeat, Plus, Trash2 } from "lucide-react";

interface TimerSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeName: string, scheduleType: string, config: any) => void;
  initialConfig?: any;
}

export default function TimerSchedulerModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: TimerSchedulerModalProps) {
  // Schedule type selector
  const [scheduleType, setScheduleType] = useState<
    "once" | "interval" | "weekly"
  >("once");

  // Once-specific
  const [startDateTime, setStartDateTime] = useState("");

  // Interval (direct)
  const [intervalValue, setIntervalValue] = useState("60");
  const [intervalUnit, setIntervalUnit] = useState<
    "seconds" | "minutes" | "hours"
  >("seconds");

  // Weekly (direct)
  const [weeklyDays, setWeeklyDays] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
    false,
    false,
  ]); // Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const [weeklyStartTime, setWeeklyStartTime] = useState("09:00");
  const [weeklyEndTime, setWeeklyEndTime] = useState("17:00");

  useEffect(() => {
    if (initialConfig) {
      setScheduleType(initialConfig.scheduleType || "once");

      if (initialConfig.scheduleType === "once") {
        // startDateTime is already stored as local time string (YYYY-MM-DDTHH:mm)
        // No conversion needed
        if (initialConfig.startDateTime) {
          setStartDateTime(initialConfig.startDateTime);
        } else {
          setStartDateTime("");
        }
      } else if (initialConfig.scheduleType === "interval") {
        setIntervalValue(initialConfig.intervalValue || "60");
        setIntervalUnit(initialConfig.intervalUnit || "seconds");
      } else if (initialConfig.scheduleType === "weekly") {
        setWeeklyDays(initialConfig.weeklyDays || weeklyDays);
        setWeeklyStartTime(initialConfig.weeklyStartTime || "09:00");
        setWeeklyEndTime(initialConfig.weeklyEndTime || "17:00");
      }
    } else {
      // Reset to defaults
      setScheduleType("once");
      setStartDateTime("");
      setIntervalValue("60");
      setIntervalUnit("seconds");
    }
  }, [initialConfig, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let nodeName = "";
    let config: any = {
      scheduleType,
    };

    switch (scheduleType) {
      case "once": {
        if (!startDateTime) {
          alert("Pilih tanggal dan waktu mulai");
          return;
        }

        // Store datetime string as-is (local time), no UTC conversion
        // Format: "2025-12-03T17:03" - same as datetime-local input
        // Executor will parse this as local time without timezone conversion
        config.startDateTime = startDateTime;
        nodeName = `Timer: Once ${new Date(startDateTime).toLocaleString()}`;
        break;
      }

      case "interval": {
        config.intervalValue = parseInt(intervalValue);
        config.intervalUnit = intervalUnit;
        nodeName = `Timer: Every ${intervalValue} ${intervalUnit}`;
        break;
      }

      case "weekly": {
        const selectedDays = weeklyDays
          .map((selected, index) => (selected ? index : null))
          .filter((day) => day !== null);

        if (selectedDays.length === 0) {
          alert("Pilih minimal satu hari dalam seminggu");
          return;
        }

        config.weeklyDays = weeklyDays;
        config.weeklyStartTime = weeklyStartTime;
        config.weeklyEndTime = weeklyEndTime;

        const daysText = selectedDays
          .map((d) => ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"][d])
          .join(", ");
        nodeName = `Timer: Weekly ${daysText}`;
        break;
      }
    }

    onSelect(nodeName, scheduleType, config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Clock size={20} />
            Timer/Scheduler Configuration
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Schedule Type Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Schedule Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "once", label: "Once", icon: Clock },
                { value: "interval", label: "Interval", icon: Repeat },
                { value: "weekly", label: "Weekly", icon: Calendar },
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScheduleType(value as any)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                    scheduleType === value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ONCE Configuration */}
          {scheduleType === "once" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Jalankan sekali pada waktu yang ditentukan
              </p>
            </div>
          )}

          {/* INTERVAL Configuration */}
          {scheduleType === "interval" && (
            <div className="space-y-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Interval Settings
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={intervalValue}
                  onChange={(e) => setIntervalValue(e.target.value)}
                  min="1"
                  className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <select
                  value={intervalUnit}
                  onChange={(e) => setIntervalUnit(e.target.value as any)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                </select>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Trigger every {intervalValue} {intervalUnit}
              </p>
            </div>
          )}

          {/* WEEKLY Configuration */}
          {scheduleType === "weekly" && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>ℹ️ Dual Outputs:</strong> Weekly nodes akan punya 2
                  output connections:
                </p>
                <ul className="text-sm text-blue-600 dark:text-blue-400 mt-2 ml-4 space-y-1">
                  <li>
                    🔵 <strong>Top (Start Time)</strong> - Trigger saat jam
                    mulai (08:00)
                  </li>
                  <li>
                    🔴 <strong>Bottom (End Time)</strong> - Trigger saat jam
                    selesai (17:00)
                  </li>
                </ul>
              </div>

              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Weekly Schedule
              </label>

              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Pilih hari aktif:
                </p>
                <div className="grid grid-cols-7 gap-2">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                    (day, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          const newDays = [...weeklyDays];
                          newDays[index] = !newDays[index];
                          setWeeklyDays(newDays);
                        }}
                        className={`p-2 text-xs rounded-lg border transition-colors ${
                          weeklyDays[index]
                            ? "bg-blue-500 text-white border-blue-500"
                            : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500"
                        }`}
                      >
                        {day}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={weeklyStartTime}
                    onChange={(e) => setWeeklyStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={weeklyEndTime}
                    onChange={(e) => setWeeklyEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Clock size={16} />
              Create Timer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
