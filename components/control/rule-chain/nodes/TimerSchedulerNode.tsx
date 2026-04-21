"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface TimerSchedulerNodeData {
  label: string;
  nodeId: string;
  config?: any;
}

export const TimerSchedulerNode = memo(
  ({ data, id }: NodeProps<TimerSchedulerNodeData>) => {
    const [isHovered, setIsHovered] = useState(false);
    const { deleteNode, onEditNode } = useRuleChain();

    // Determine color based on schedule type
    const getColorClass = () => {
      const scheduleType = data.config?.scheduleType;
      switch (scheduleType) {
        case "interval":
          return "bg-blue-400 border-blue-500";
        case "weekly":
          return "bg-indigo-400 border-indigo-500";
        case "cron":
          return "bg-teal-400 border-teal-500";
        case "once":
          return "bg-lime-400 border-lime-500";
        default:
          return "bg-blue-400 border-blue-500";
      }
    };

    const getIconColor = () => {
      const scheduleType = data.config?.scheduleType;
      switch (scheduleType) {
        case "interval":
          return "text-blue-900";
        case "weekly":
          return "text-indigo-900";
        case "cron":
          return "text-teal-900";
        case "once":
          return "text-lime-900";
        default:
          return "text-blue-900";
      }
    };

    const getTextColor = () => {
      const scheduleType = data.config?.scheduleType;
      switch (scheduleType) {
        case "interval":
          return "text-blue-900";
        case "weekly":
          return "text-indigo-900";
        case "cron":
          return "text-teal-900";
        case "once":
          return "text-lime-900";
        default:
          return "text-blue-900";
      }
    };

    const getSecondaryTextColor = () => {
      const scheduleType = data.config?.scheduleType;
      switch (scheduleType) {
        case "interval":
          return "text-blue-800";
        case "weekly":
          return "text-indigo-800";
        case "cron":
          return "text-teal-800";
        case "once":
          return "text-lime-800";
        default:
          return "text-blue-800";
      }
    };

    const getHandleColor = () => {
      const scheduleType = data.config?.scheduleType;
      switch (scheduleType) {
        case "interval":
          return "bg-blue-600";
        case "weekly":
          return "bg-indigo-600";
        case "cron":
          return "bg-teal-600";
        case "once":
          return "bg-lime-600";
        default:
          return "bg-blue-600";
      }
    };

    const getScheduleDescription = () => {
      const config = data.config;
      if (!config) return "";

      switch (config.scheduleType) {
        case "interval":
          return `Every ${config.intervalValue} ${config.intervalUnit}`;
        case "weekly":
          const selectedDays =
            config.weeklyDays
              ?.map((selected: boolean, index: number) => {
                const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
                return selected ? days[index] : null;
              })
              .filter(Boolean)
              .join(", ") || "No days";
          return `${selectedDays} ${config.weeklyStartTime}-${config.weeklyEndTime}`;
        case "cron":
          return `Cron: ${config.cronExpression}`;
        case "once":
          return `Once: ${new Date(config.startDateTime).toLocaleString()}`;
        default:
          return "";
      }
    };

    // Get output handles for weekly schedules (dual outputs: start and end)
    const getOutputHandles = () => {
      const config = data.config;
      if (config?.scheduleType === "weekly") {
        // Weekly nodes have 2 outputs: start time and end time
        return (
          <>
            {/* START TIME OUTPUT - Top handle (30%) */}
            <Handle
              type="source"
              position={Position.Right}
              id="start"
              style={{
                top: "30%",
              }}
              className={`w-4 h-4 ${getHandleColor()} border-2 border-white shadow-lg hover:w-5 hover:h-5 transition-all cursor-grab active:cursor-grabbing`}
              title="🟢 Start Time Output (jam mulai)"
            />

            {/* END TIME OUTPUT - Bottom handle (70%) */}
            <Handle
              type="source"
              position={Position.Right}
              id="end"
              style={{
                top: "70%",
              }}
              className={`w-4 h-4 ${getHandleColor()} border-2 border-white shadow-lg hover:w-5 hover:h-5 transition-all cursor-grab active:cursor-grabbing`}
              title="🔴 End Time Output (jam selesai)"
            />
          </>
        );
      }
      // Default single handle for other schedule types
      return (
        <Handle
          type="source"
          position={Position.Right}
          className={`w-3 h-3 ${getHandleColor()}`}
        />
      );
    };

    return (
      <div
        // Color: Blue/Indigo/Teal/Lime - Represents TIMER/SCHEDULER nodes (time-based triggers)
        // Blue = Interval, Indigo = Weekly, Teal = Cron, Lime = Once
        className={`relative px-3 py-2 shadow-lg rounded-lg border-2 min-w-[160px] max-w-[220px] ${getColorClass()}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`${data.label} - ${getScheduleDescription()}`} // Tooltip untuk info lengkap
      >
        {isHovered && (
          <div className="absolute -top-2 -left-2 flex gap-1 z-10">
            <DeleteButton nodeId={id} onDelete={deleteNode} />
            <EditButton nodeId={id} onEdit={onEditNode} />
          </div>
        )}
        <div className="flex items-center gap-2 mb-1">
          <Clock size={16} className={`${getIconColor()} flex-shrink-0`} />
          <div className={`text-sm font-medium ${getTextColor()} truncate`}>
            {data.label}
          </div>
        </div>
        <div className={`text-xs ${getSecondaryTextColor()} truncate`}>
          {getScheduleDescription()}
        </div>
        {getOutputHandles()}
      </div>
    );
  }
);

TimerSchedulerNode.displayName = "TimerSchedulerNode";
