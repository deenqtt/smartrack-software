"use client";

import React from "react";
import {
  type EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  MarkerType,
  type Edge,
} from "@xyflow/react";

interface CustomEdgeData {
  // Filter/Condition edges
  field?: string;
  operator?: string;
  value?: string;

  // Switch case edges
  caseLabel?: string;
  caseValue?: any;

  // Timer edges
  hour?: string;

  // Edge type
  edgeType?: "condition" | "switch" | "timer" | "success" | "failure" | "default";

  // Custom label
  customLabel?: string;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
  data,
  style,
  markerEnd,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge styling based on type and data
  const getEdgeStyle = () => {
    const baseStyle = {
      strokeWidth: 2,
      stroke: "#94a3b8", // default slate-400
    };

    const edgeData = data as CustomEdgeData | undefined;
    if (!edgeData) return baseStyle;

    // Edge type specific styling
    switch (edgeData.edgeType) {
      case "condition":
        // True/False conditions - green for true paths, red for false
        if (edgeData.operator === "true" || edgeData.value === "true") {
          return { ...baseStyle, stroke: "#10b981", strokeWidth: 2.5 }; // green-500
        }
        if (edgeData.operator === "false" || edgeData.value === "false") {
          return { ...baseStyle, stroke: "#ef4444", strokeWidth: 2 }; // red-500
        }
        break;

      case "switch":
        // Switch cases - different colors for each case
        return { ...baseStyle, stroke: "#3b82f6", strokeWidth: 2 }; // blue-500

      case "timer":
        // Timer triggers - cyan/teal
        return { ...baseStyle, stroke: "#06b6d4", strokeWidth: 2 }; // cyan-500

      case "success":
        return { ...baseStyle, stroke: "#10b981", strokeWidth: 2.5 }; // green-500

      case "failure":
        return { ...baseStyle, stroke: "#ef4444", strokeWidth: 2, strokeDasharray: "5,5" }; // red-500 dashed

      case "default":
        return { ...baseStyle, stroke: "#6b7280", strokeWidth: 1.5, strokeDasharray: "3,3" }; // gray-500 dotted

      default:
        break;
    }

    // Fallback: color based on operator (backward compatibility)
    if (edgeData.operator) {
      if (edgeData.operator === ">" || edgeData.operator === ">=") {
        return { ...baseStyle, stroke: "#ef4444" }; // red
      }
      if (edgeData.operator === "<" || edgeData.operator === "<=") {
        return { ...baseStyle, stroke: "#f59e0b" }; // amber
      }
      if (edgeData.operator === "==") {
        return { ...baseStyle, stroke: "#10b981" }; // green
      }
      if (edgeData.operator === "!=") {
        return { ...baseStyle, stroke: "#8b5cf6" }; // purple
      }
    }

    return baseStyle;
  };

  // Generate smart label based on edge data
  const getEdgeLabel = () => {
    const edgeData = data as CustomEdgeData | undefined;
    if (!edgeData) return label || "";

    // Custom label takes precedence
    if (edgeData.customLabel) return edgeData.customLabel;

    // Switch case label
    if (edgeData.edgeType === "switch") {
      if (edgeData.caseLabel === "default") {
        return "Default";
      }
      if (edgeData.caseLabel) {
        return edgeData.caseLabel;
      }
    }

    // Timer hour label
    if (edgeData.edgeType === "timer" && edgeData.hour) {
      return `Timer: ${edgeData.hour}`;
    }

    // Condition label with field, operator, value
    if (edgeData.field && edgeData.operator && edgeData.value !== undefined) {
      // Format operator for display
      const operatorDisplay: Record<string, string> = {
        "==": "=",
        "!=": "≠",
        ">": ">",
        "<": "<",
        ">=": "≥",
        "<=": "≤",
        "contains": "contains",
        "startsWith": "starts with",
        "endsWith": "ends with",
      };
      const displayOperator = operatorDisplay[edgeData.operator] || edgeData.operator;

      return `${edgeData.field} ${displayOperator} ${edgeData.value}`;
    }

    // Success/Failure labels
    if (edgeData.edgeType === "success") return "Success";
    if (edgeData.edgeType === "failure") return "Failure";
    if (edgeData.edgeType === "default") return "Default";

    // Fallback to provided label
    return label || "";
  };

  // Get label background color based on edge type
  const getLabelStyle = () => {
    const edgeData = data as CustomEdgeData | undefined;
    if (!edgeData) {
      return "bg-white border-slate-300 text-slate-700";
    }

    switch (edgeData.edgeType) {
      case "condition":
        if (edgeData.value === "true" || edgeData.operator === "true") {
          return "bg-green-50 border-green-300 text-green-700";
        }
        if (edgeData.value === "false" || edgeData.operator === "false") {
          return "bg-red-50 border-red-300 text-red-700";
        }
        return "bg-blue-50 border-blue-300 text-blue-700";

      case "switch":
        if (edgeData.caseLabel === "default") {
          return "bg-slate-50 border-slate-300 text-slate-700";
        }
        return "bg-sky-50 border-sky-300 text-sky-700";

      case "timer":
        return "bg-cyan-50 border-cyan-300 text-cyan-700";

      case "success":
        return "bg-green-50 border-green-300 text-green-700";

      case "failure":
        return "bg-red-50 border-red-300 text-red-700";

      case "default":
        return "bg-slate-50 border-slate-300 text-slate-600";

      default:
        // Operator-based colors (backward compatibility)
        if (edgeData.operator === ">" || edgeData.operator === ">=") {
          return "bg-red-50 border-red-300 text-red-700";
        }
        if (edgeData.operator === "<" || edgeData.operator === "<=") {
          return "bg-amber-50 border-amber-300 text-amber-700";
        }
        if (edgeData.operator === "==") {
          return "bg-green-50 border-green-300 text-green-700";
        }
        if (edgeData.operator === "!=") {
          return "bg-purple-50 border-purple-300 text-purple-700";
        }
        return "bg-white border-slate-300 text-slate-700";
    }
  };

  const edgeStyle = getEdgeStyle();
  const edgeLabel = getEdgeLabel();
  const labelStyle = getLabelStyle();

  // Don't show label if it's empty
  const shouldShowLabel = typeof edgeLabel === 'string' && edgeLabel.trim() !== "";

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...(style as object),
          ...edgeStyle,
        }}
        {...(markerEnd && { markerEnd })}
      />
      {shouldShowLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className="nodrag nopan"
          >
            <div
              className={`px-2.5 py-1 rounded-md border shadow-sm font-medium text-xs whitespace-nowrap ${labelStyle}`}
            >
              {edgeLabel}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
