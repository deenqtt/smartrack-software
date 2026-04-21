"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Code2,
  AlertCircle,
  Check,
  Radio,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface TopicForSelection {
  topic: string;
  description?: string;
}

interface MqttPayloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    topic: string,
    payload: string,
    payloadMode: "custom" | "autoForward"
  ) => void;
  initialConfig?: { [key: string]: any };
}

export default function MqttPayloadModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: MqttPayloadModalProps) {
  // Topic & Payload state
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [payload, setPayload] = useState<string>('{\n  "key": "value"\n}');
  const [payloadMode, setPayloadMode] = useState<"custom" | "autoForward">(
    "custom"
  );
  const [topics, setTopics] = useState<TopicForSelection[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [mounted, setMounted] = useState(false);

  // JSON Validation
  const [isValidJson, setIsValidJson] = useState(true);
  const [jsonError, setJsonError] = useState<string>("");

  // Set mounted untuk hydration (portal rendering)
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch topics saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      const fetchTopics = async () => {
        setIsLoadingTopics(true);
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/for-selection`
          );
          if (!response.ok) throw new Error("Failed to fetch devices");
          const devices = await response.json();

          // Extract unique topics from devices
          const uniqueTopics: TopicForSelection[] = Array.from(
            new Set(devices.map((d: any) => d.topic))
          ).map((topic: unknown) => ({
            topic: topic as string,
            description: `Topic: ${topic as string}`,
          }));

          setTopics(uniqueTopics);
        } catch (error: any) {
          showToast.error(error.message);
          onClose();
        } finally {
          setIsLoadingTopics(false);
        }
      };
      fetchTopics();

      // Pre-fill form from initialConfig
      if (initialConfig) {
        setSelectedTopic(initialConfig.topic || "");
        setPayload(initialConfig.payload || '{\n  "key": "value"\n}');
        setPayloadMode(initialConfig.payloadMode || "custom");
      }
    } else {
      // Reset state saat modal ditutup
      setSelectedTopic("");
      setPayload('{\n  "key": "value"\n}');
      setPayloadMode("custom");
      setIsValidJson(true);
      setJsonError("");
    }
  }, [isOpen, onClose, initialConfig]);

  // Validate JSON payload
  const validateJson = (jsonString: string) => {
    try {
      JSON.parse(jsonString);
      setIsValidJson(true);
      setJsonError("");
    } catch (error: any) {
      setIsValidJson(false);
      setJsonError(error.message);
    }
  };

  const handlePayloadChange = (value: string) => {
    setPayload(value);
    validateJson(value);
  };

  const handleConfirm = () => {
    // Validation
    if (!selectedTopic.trim()) {
      showToast.error("Please select a topic");
      return;
    }

    // For custom payload mode, validate JSON
    if (payloadMode === "custom") {
      if (!payload.trim()) {
        showToast.error("Please enter a payload");
        return;
      }

      if (!isValidJson) {
        showToast.error("Invalid JSON payload");
        return;
      }
    }

    onSelect(selectedTopic, payload, payloadMode);
    // Reset state
    setSelectedTopic("");
    setPayload('{\n  "key": "value"\n}');
    setPayloadMode("custom");
    setIsValidJson(true);
    setJsonError("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Send MQTT Payload
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
            <AlertCircle
              size={16}
              className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Configure the MQTT topic and payload to send. Choose between
              custom payload or auto-forward data from previous nodes.
            </p>
          </div>

          {/* Payload Mode Selection */}
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Payload Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPayloadMode("custom")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  payloadMode === "custom"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Radio
                  size={16}
                  className={
                    payloadMode === "custom"
                      ? "text-blue-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    payloadMode === "custom"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Custom Payload
                </span>
              </button>
              <button
                onClick={() => setPayloadMode("autoForward")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  payloadMode === "autoForward"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <ArrowRight
                  size={16}
                  className={
                    payloadMode === "autoForward"
                      ? "text-green-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    payloadMode === "autoForward"
                      ? "text-green-700 dark:text-green-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Auto-Forward
                </span>
              </button>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              <p>
                <strong>Custom Payload:</strong> Use your own JSON payload
              </p>
              <p>
                <strong>Auto-Forward:</strong> Send data from previous nodes
                automatically
              </p>
            </div>
          </div>

          {/* Topic Selection */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              MQTT Topic
            </label>
            <Select
              onValueChange={setSelectedTopic}
              value={selectedTopic}
              disabled={isLoadingTopics}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingTopics
                      ? "Loading topics..."
                      : "Select a topic or enter custom"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {topics.length === 0 ? (
                  <div className="p-2 text-sm text-slate-500">
                    No topics found
                  </div>
                ) : (
                  topics.map((t) => (
                    <SelectItem key={t.topic} value={t.topic}>
                      {t.topic}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select from device topics or type custom topic
            </p>
          </div>

          {/* Custom Topic Input */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Custom Topic (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., devices/sensor/command"
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Leave empty to use dropdown selection above
            </p>
          </div>

          {/* Payload Input - Only show for Custom Payload mode */}
          {payloadMode === "custom" && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Code2 size={16} />
                  JSON Payload
                </label>
                {isValidJson && payload.trim() && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Check size={14} />
                    Valid JSON
                  </span>
                )}
              </div>
              <textarea
                value={payload}
                onChange={(e) => handlePayloadChange(e.target.value)}
                placeholder='{\n  "command": "turn_on",\n  "value": 100\n}'
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400 font-mono text-sm min-h-[200px]"
              />
              {!isValidJson && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs text-red-700 dark:text-red-300">
                    <span className="font-semibold">JSON Error:</span>{" "}
                    {jsonError}
                  </p>
                </div>
              )}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter valid JSON format. Will be published as-is to the topic.
              </p>
            </div>
          )}

          {/* Auto-Forward Info */}
          {payloadMode === "autoForward" && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowRight
                  size={16}
                  className="text-green-600 dark:text-green-400"
                />
                <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                  Auto-Forward Mode
                </p>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">
                Data from previous nodes will be forwarded automatically to the
                selected topic.
              </p>
            </div>
          )}

          {/* Preview */}
          {selectedTopic && isValidJson && payload.trim() && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">
                Preview:
              </p>
              <div className="space-y-1">
                <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                  Topic: <span className="font-bold">{selectedTopic}</span>
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 font-mono">
                  Payload Size:{" "}
                  <span className="font-bold">{payload.length} bytes</span>
                </p>
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
              !selectedTopic ||
              (payloadMode === "custom" && (!payload.trim() || !isValidJson))
            }
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedTopic &&
              (payloadMode === "autoForward" ||
                (payloadMode === "custom" && payload.trim() && isValidJson))
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
