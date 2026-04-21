"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Send,
  User,
  MessageSquare,
  AlertCircle,
  Info,
  Radio,
  ArrowRight,
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";

interface TelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    recipientId: string,
    recipientName: string,
    message: string,
    messageMode: "custom" | "autoForward"
  ) => void;
  initialConfig?: { [key: string]: any };
}

export default function TelegramModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: TelegramModalProps) {
  const [mounted, setMounted] = useState(false);
  // Form state
  const [recipientType, setRecipientType] = useState<"username" | "chatId">(
    "username"
  );
  const [recipientId, setRecipientId] = useState<string>("");
  const [recipientName, setRecipientName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messageMode, setMessageMode] = useState<"custom" | "autoForward">(
    "custom"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validation state
  const [recipientError, setRecipientError] = useState<string>("");

  // Pre-fill form when modal opens with initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setRecipientType(initialConfig.recipientType || "username");
      setRecipientId(initialConfig.recipientId || "");
      setRecipientName(initialConfig.recipientName || "");
      setMessage(initialConfig.message || "");
      setMessageMode(initialConfig.messageMode || "custom");
    } else if (!isOpen) {
      // Reset form when closed
      setRecipientType("username");
      setRecipientId("");
      setRecipientName("");
      setMessage("");
      setMessageMode("custom");
      setRecipientError("");
    }
  }, [isOpen, initialConfig]);

  // Validate recipient
  const validateRecipient = (value: string, type: "username" | "chatId") => {
    if (type === "username") {
      // Username format: @username (letters, numbers, underscores)
      if (!value.match(/^@?[a-zA-Z0-9_]{5,32}$/)) {
        setRecipientError(
          "Username must be 5-32 chars (letters, numbers, underscores)"
        );
        return false;
      }
    } else {
      // Chat ID: numeric only
      if (!value.match(/^-?\d+$/)) {
        setRecipientError("Chat ID must be a number");
        return false;
      }
    }

    setRecipientError("");
    return true;
  };

  const handleRecipientChange = (value: string) => {
    setRecipientId(value);
    if (value.trim()) {
      validateRecipient(value, recipientType);
    } else {
      setRecipientError("");
    }
  };

  const handleRecipientTypeChange = (type: "username" | "chatId") => {
    setRecipientType(type);
    setRecipientId("");
    setRecipientError("");
  };

  const handleConfirm = () => {
    // Validation
    if (!recipientId.trim()) {
      showToast.error(`Please enter a ${recipientType === "username" ? "username" : "Chat ID"}`);
      return;
    }

    if (!validateRecipient(recipientId, recipientType)) {
      showToast.error(recipientError);
      return;
    }

    if (!recipientName.trim()) {
      showToast.error("Please enter recipient name");
      return;
    }

    // For custom message mode, validate message
    if (messageMode === "custom") {
      if (!message.trim()) {
        showToast.error("Please enter message");
        return;
      }
    }

    onSelect(recipientId, recipientName, message, messageMode);

    // Reset state
    setRecipientId("");
    setRecipientName("");
    setMessage("");
    setMessageMode("custom");
    setRecipientError("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const isRecipientValid =
    recipientId.trim() &&
    !recipientError &&
    (recipientType === "username"
      ? /^@?[a-zA-Z0-9_]{5,32}$/.test(recipientId)
      : /^-?\d+$/.test(recipientId));

  const isFormValid =
    isRecipientValid &&
    recipientName.trim() &&
    (messageMode === "autoForward" || message.trim());

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Send Telegram
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
              Configure Telegram message details. The message will be sent when
              this node is triggered.
            </p>
          </div>

          {/* Recipient Type Selection */}
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Recipient Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRecipientTypeChange("username")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  recipientType === "username"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Radio
                  size={16}
                  className={
                    recipientType === "username"
                      ? "text-blue-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    recipientType === "username"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Username
                </span>
              </button>
              <button
                onClick={() => handleRecipientTypeChange("chatId")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  recipientType === "chatId"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Radio
                  size={16}
                  className={
                    recipientType === "chatId"
                      ? "text-blue-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    recipientType === "chatId"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Chat ID
                </span>
              </button>
            </div>
          </div>

          {/* Recipient Input */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User size={16} />
              {recipientType === "username" ? "Username" : "Chat ID"}
            </label>
            <input
              type="text"
              placeholder={
                recipientType === "username"
                  ? "e.g., @johndoe or johndoe"
                  : "e.g., 123456789 or -987654321"
              }
              value={recipientId}
              onChange={(e) => handleRecipientChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors placeholder-slate-500 dark:placeholder-slate-400 ${
                recipientError
                  ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:border-red-500 dark:focus:border-red-400"
                  : isRecipientValid
                  ? "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 focus:border-green-500 dark:focus:border-green-400"
                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400"
              } text-slate-900 dark:text-slate-100`}
            />
            {recipientError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {recipientError}
              </p>
            )}
            {isRecipientValid && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Valid {recipientType === "username" ? "username" : "Chat ID"}
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {recipientType === "username"
                ? "Username must be 5-32 characters"
                : "Chat ID is a numeric identifier"}
            </p>
          </div>

          {/* Recipient Name */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User size={16} />
              Recipient Name
            </label>
            <input
              type="text"
              placeholder="e.g., John Doe, Support Team"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Name to identify recipient
            </p>
          </div>

          {/* Message Mode Selection */}
          <div className="grid gap-3">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Message Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMessageMode("custom")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  messageMode === "custom"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <Radio
                  size={16}
                  className={
                    messageMode === "custom"
                      ? "text-blue-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    messageMode === "custom"
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-slate-700 dark:text-slate-300"
                  }`}
                >
                  Custom Message
                </span>
              </button>
              <button
                onClick={() => setMessageMode("autoForward")}
                className={`p-3 rounded-lg border-2 transition-all text-left flex items-center gap-2 ${
                  messageMode === "autoForward"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                }`}
              >
                <ArrowRight
                  size={16}
                  className={
                    messageMode === "autoForward"
                      ? "text-green-600"
                      : "text-slate-600"
                  }
                />
                <span
                  className={`text-sm font-medium ${
                    messageMode === "autoForward"
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
                <strong>Custom Message:</strong> Use your own message text
              </p>
              <p>
                <strong>Auto-Forward:</strong> Send data from previous nodes
                automatically
              </p>
            </div>
          </div>

          {/* Message - Only show for Custom Message mode */}
          {messageMode === "custom" && (
            <div className="grid gap-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <MessageSquare size={16} />
                Message
              </label>
              <textarea
                placeholder="Enter your Telegram message here...&#10;&#10;Tip: You can use variables like {{deviceName}}, {{timestamp}}, {{alert}}"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400 min-h-[120px] resize-none"
              />
              <div className="flex items-start gap-2">
                <Info
                  size={14}
                  className="text-slate-500 dark:text-slate-400 flex-shrink-0 mt-0.5"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Message length: {message.length} characters
                </p>
              </div>
            </div>
          )}

          {/* Auto-Forward Info */}
          {messageMode === "autoForward" && (
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
                Data from previous nodes will be forwarded automatically as the
                message.
              </p>
            </div>
          )}

          {/* Preview */}
          {isFormValid && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg space-y-3">
              <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                Message Preview:
              </p>
              <div className="space-y-2 text-xs">
                <div>
                  <p className="text-green-700 dark:text-green-300 font-semibold">
                    To: {recipientName}
                  </p>
                  <p className="text-green-600 dark:text-green-400 font-mono">
                    {recipientType === "username"
                      ? recipientId.startsWith("@")
                        ? recipientId
                        : `@${recipientId}`
                      : `Chat ID: ${recipientId}`}
                  </p>
                </div>
                <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded border border-green-200 dark:border-green-800">
                  <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
                    {message}
                  </p>
                </div>
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
            disabled={!isFormValid}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              isFormValid
                ? "bg-blue-600 text-white hover:bg-blue-700 dark:hover:bg-blue-500"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
            }`}
          >
            <Send size={16} />
            Add Node
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
