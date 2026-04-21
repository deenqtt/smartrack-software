"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, Filter, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

interface EdgeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfig: (
    field: string,
    operator: string,
    value: string,
    label: string,
    edgeData?: any
  ) => void;
  pendingConnection?: {
    source: string;
    target: string;
  } | null;
  sourceNodeType?: string;
}

const OPERATORS = [
  // Comparison operators
  { value: ">", label: "Greater Than (>)" },
  { value: "<", label: "Less Than (<)" },
  { value: ">=", label: "Greater or Equal (>=)" },
  { value: "<=", label: "Less or Equal (<=)" },
  { value: "==", label: "Equal (==)" },
  { value: "!=", label: "Not Equal (!=)" },

  // String operators
  { value: "contains", label: "Contains" },
  { value: "startsWith", label: "Starts With" },
  { value: "endsWith", label: "Ends With" },

  // Range operators
  { value: "between", label: "Between" },
  { value: "in", label: "In Array" },
  { value: "notIn", label: "Not In Array" },

  // Existence operators
  { value: "exists", label: "Exists" },
  { value: "isEmpty", label: "Is Empty" },
];

// Detect value type from input string
const detectValueType = (
  input: string
): { type: string; displayValue: string } => {
  if (!input.trim()) {
    return { type: "empty", displayValue: "empty" };
  }

  const trimmed = input.trim();

  // Check for null
  if (trimmed.toLowerCase() === "null") {
    return { type: "null", displayValue: "null" };
  }

  // Check for boolean
  if (trimmed.toLowerCase() === "true" || trimmed.toLowerCase() === "false") {
    return { type: "boolean", displayValue: trimmed.toLowerCase() };
  }

  // Check for array (starts with [ and ends with ])
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return { type: "array", displayValue: trimmed };
  }

  // Check for quoted string (starts and ends with quotes)
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return { type: "string", displayValue: trimmed };
  }

  // Check for number
  if (!isNaN(Number(trimmed)) && trimmed !== "") {
    return { type: "number", displayValue: trimmed };
  }

  // Default to string (unquoted)
  return { type: "string", displayValue: trimmed };
};

const EDGE_TYPES = [
  { value: "condition", label: "Conditional", description: "IF field = value", icon: Filter },
  { value: "success", label: "Success", description: "Green success path", icon: CheckCircle2 },
  { value: "failure", label: "Failure", description: "Red error path", icon: XCircle },
  { value: "default", label: "Default", description: "No condition", icon: ArrowRight },
];

export default function EdgeConfigModal({
  isOpen,
  onClose,
  onConfig,
  pendingConnection,
  sourceNodeType,
}: EdgeConfigModalProps) {
  const [edgeType, setEdgeType] = useState<"default" | "condition" | "success" | "failure">("condition");
  const [operator, setOperator] = useState("==");
  const [value, setValue] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-detect value type
  const detectedType = useMemo(() => detectValueType(value), [value]);

  const generateLabel = () => {
    return `${operator} ${value}`;
  };

  const handleConfirm = () => {
    // Prevent multiple submissions
    if (isSubmitting) return;

    // Validate based on edge type
    if (edgeType === "condition" && (!operator || !value.trim())) {
      alert("Please fill operator and value for conditional edge");
      return;
    }

    setIsSubmitting(true);

    // Build edge data based on type
    const edgeData: any = {
      edgeType,
    };

    let label = customLabel || "";

    if (edgeType === "condition") {
      edgeData.operator = operator;
      edgeData.value = value;
      if (!label) {
        label = generateLabel();
      }
    } else if (edgeType === "success") {
      if (!label) label = "Success";
    } else if (edgeType === "failure") {
      if (!label) label = "Failure";
    } else if (edgeType === "default") {
      if (!label) label = "";
    }

    if (customLabel) {
      edgeData.customLabel = customLabel;
    }

    console.log("🎯 EdgeConfigModal.handleConfirm called");
    console.log("📍 Edge Type:", edgeType);
    console.log("📍 Edge Data:", edgeData);

    // Pass edge data to parent
    onConfig("", operator, value, label, edgeData);

    // Reset after submission
    setTimeout(() => {
      setIsSubmitting(false);
    }, 100);
  };

  // Reset form when modal closes
  const handleClose = () => {
    setIsSubmitting(false);
    setEdgeType("condition");
    setOperator("==");
    setValue("");
    setCustomLabel("");
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            Configure Edge
          </h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Edge Type Selection - Single Row */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
              Connection Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EDGE_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setEdgeType(type.value as any)}
                  className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1 ${
                    edgeType === type.value
                      ? type.value === "success" ? "border-green-500 bg-green-50 dark:bg-green-900/20" :
                        type.value === "failure" ? "border-red-500 bg-red-50 dark:bg-red-900/20" :
                        type.value === "condition" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" :
                        "border-slate-500 bg-slate-50 dark:bg-slate-800/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {React.createElement(type.icon, { size: 24, className: "text-slate-600 dark:text-slate-400" })}
                  <div className="font-medium text-xs text-slate-900 dark:text-slate-100">{type.label}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 text-center">{type.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields - Only show for "condition" type */}
          {edgeType === "condition" && (
            <>
                  <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Operator
                </label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
                >
                  {OPERATORS.map((op) => (
                    <option
                      key={op.value}
                      value={op.value}
                      className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                    >
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Value Input */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                  Value
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 ml-2">
                    (auto-detects type)
                  </span>
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleConfirm();
                    }
                  }}
                  placeholder='e.g., 30, "active", true, [1,2,3], null'
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 placeholder-slate-500 dark:placeholder-slate-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Formats: Number (30), String ("text"), Boolean (true), Array ([a,b]), Null (null)
                </p>
              </div>
            </>
          )}

          {/* Custom Label (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Custom Label (Optional)
            </label>
            <input
              type="text"
              value={customLabel}
              onChange={(e) => setCustomLabel(e.target.value)}
              placeholder="e.g., High Temperature Path"
              className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:border-blue-500 dark:focus:border-blue-400"
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Edge Preview
            </label>
            <div className={`p-4 border rounded-lg ${
              edgeType === "success" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" :
              edgeType === "failure" ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" :
              edgeType === "condition" ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" :
              "bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-700"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${
                  edgeType === "success" ? "bg-green-500" :
                  edgeType === "failure" ? "bg-red-500" :
                  edgeType === "condition" ? "bg-blue-500" :
                  "bg-slate-400"
                }`} />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {customLabel || (
                    edgeType === "condition" ? `IF [field] ${operator} ${value || "(value)"}` :
                    edgeType === "success" ? "Success" :
                    edgeType === "failure" ? "Failure" :
                    "Default connection"
                  )}
                </p>
              </div>
              {edgeType === "condition" && value && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                    Type: {detectedType.type}
                  </span>
                  <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded">
                    {detectedType.displayValue}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleConfirm();
            }}
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 dark:disabled:bg-blue-800 disabled:cursor-not-allowed transition-colors font-medium cursor-pointer"
          >
            {isSubmitting ? "Creating..." : "Create Edge"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
