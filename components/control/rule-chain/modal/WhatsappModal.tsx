"use client";
import { showToast } from "@/lib/toast-utils";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Phone,
  User,
  MessageSquare,
  AlertCircle,
  Info,
  Radio,
  ArrowRight,
} from "lucide-react";

interface WhatsappModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (
    phoneNumber: string,
    contactName: string,
    message: string,
    messageMode: "custom" | "autoForward"
  ) => void;
  initialConfig?: { [key: string]: any };
}

export default function WhatsappModal({
  isOpen,
  onClose,
  onSelect,
  initialConfig,
}: WhatsappModalProps) {
  const [mounted, setMounted] = useState(false);
  // Form state
  const [phoneNumber, setPhoneNumber] = useState<string>("");
  const [contactName, setContactName] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [messageMode, setMessageMode] = useState<"custom" | "autoForward">(
    "custom"
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Validation state
  const [phoneError, setPhoneError] = useState<string>("");

  // Pre-fill form when modal opens with initialConfig
  useEffect(() => {
    if (isOpen && initialConfig) {
      setPhoneNumber(initialConfig.phoneNumber || "");
      setContactName(initialConfig.contactName || "");
      setMessage(initialConfig.message || "");
      setMessageMode(initialConfig.messageMode || "custom");
    } else if (!isOpen) {
      // Reset form when closed
      setPhoneNumber("");
      setContactName("");
      setMessage("");
      setMessageMode("custom");
      setPhoneError("");
    }
  }, [isOpen, initialConfig]);

  // Validate phone number
  const validatePhoneNumber = (phone: string) => {
    // Remove spaces, dashes, etc
    const cleaned = phone.replace(/\D/g, "");

    // Check if contains at least 10 digits
    if (cleaned.length < 10) {
      setPhoneError("Phone number must be at least 10 digits");
      return false;
    }

    // Check if starts with country code or 0
    if (!cleaned.match(/^(62|\d{10,})/)) {
      setPhoneError("Invalid phone format");
      return false;
    }

    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    setPhoneNumber(value);
    if (value.trim()) {
      validatePhoneNumber(value);
    } else {
      setPhoneError("");
    }
  };

  const handleConfirm = () => {
    // Validation
    if (!phoneNumber.trim()) {
      showToast.error("Please enter a phone number");
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      showToast.error(phoneError);
      return;
    }

    if (!contactName.trim()) {
      showToast.error("Please enter a contact name");
      return;
    }

    // For custom message mode, validate message
    if (messageMode === "custom") {
      if (!message.trim()) {
        showToast.error("Please enter a message");
        return;
      }
    }

    onSelect(phoneNumber, contactName, message, messageMode);

    // Reset state
    setPhoneNumber("");
    setContactName("");
    setMessage("");
    setMessageMode("custom");
    setPhoneError("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  const isPhoneValid =
    phoneNumber.trim() &&
    !phoneError &&
    phoneNumber.replace(/\D/g, "").length >= 10;
  const isFormValid =
    isPhoneValid &&
    contactName.trim() &&
    (messageMode === "autoForward" || message.trim());

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-900">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Send WhatsApp
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
              Configure WhatsApp message details. The message will be sent when
              this node is triggered.
            </p>
          </div>

          {/* Phone Number */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Phone size={16} />
              Phone Number
            </label>
            <input
              type="text"
              placeholder="e.g., +62 812-3456-7890 or 081234567890"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none transition-colors placeholder-slate-500 dark:placeholder-slate-400 ${
                phoneError
                  ? "border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 focus:border-red-500 dark:focus:border-red-400"
                  : phoneNumber.trim() && !phoneError
                  ? "border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20 focus:border-green-500 dark:focus:border-green-400"
                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus:border-blue-500 dark:focus:border-blue-400"
              } text-slate-900 dark:text-slate-100`}
            />
            {phoneError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                <AlertCircle size={12} />
                {phoneError}
              </p>
            )}
            {isPhoneValid && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ✓ Valid phone number
              </p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Include country code (e.g., +62) for international numbers
            </p>
          </div>

          {/* Contact Name */}
          <div className="grid gap-2">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <User size={16} />
              Contact Name
            </label>
            <input
              type="text"
              placeholder="e.g., John Doe, Customer Support"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Name to identify this contact
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
                placeholder="Enter your message here...&#10;&#10;Tip: You can use variables like {{deviceName}}, {{temperature}}, {{timestamp}}"
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
                    To: {contactName}
                  </p>
                  <p className="text-green-600 dark:text-green-400 font-mono">
                    {phoneNumber}
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
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              isFormValid
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
