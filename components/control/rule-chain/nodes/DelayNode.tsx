"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Timer } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface DelayNodeData {
  label: string;
  nodeId: string;
  config?: {
    mode?: "delay" | "throttle" | "debounce";
    duration?: number;
    unit?: "seconds" | "minutes";
  };
}

export const DelayNode = memo(({ data, id }: NodeProps<DelayNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Pink - Represents DELAY/THROTTLE nodes (timing control)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-pink-400 border-2 border-pink-500 min-w-[140px] max-w-[180px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={data.label}
    >
      {isHovered && (
        <div className="absolute -top-2 -left-2 flex gap-1 z-10">
          <DeleteButton nodeId={id} onDelete={deleteNode} />
          <EditButton nodeId={id} onEdit={onEditNode} />
        </div>
      )}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-pink-600"
      />
      <div className="flex items-center gap-2 mb-1">
        <Timer size={16} className="text-pink-900 flex-shrink-0" />
        <div className="text-sm font-medium text-pink-900 truncate">
          {data.label}
        </div>
      </div>
      {data.config?.mode && (
        <div className="text-xs text-pink-800 truncate">
          {data.config.mode.toUpperCase()}: {data.config.duration} {data.config.unit}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-pink-600"
      />
    </div>
  );
});

DelayNode.displayName = "DelayNode";
