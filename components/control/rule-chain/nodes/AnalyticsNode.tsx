"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { BarChart3 } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface AnalyticsNodeData {
  label: string;
  nodeId: string;
  config?: any;
}

export const AnalyticsNode = memo(({ data, id }: NodeProps<AnalyticsNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Violet - Represents ANALYTICS nodes (calculations: sum, average, bill)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-violet-400 border-2 border-violet-500 min-w-[140px] max-w-[180px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={data.label} // Tooltip untuk label yang panjang
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
        className="w-3 h-3 bg-indigo-600"
      />
      <div className="flex items-center gap-2">
        <BarChart3 size={16} className="text-violet-900 flex-shrink-0" />
        <div className="text-sm font-medium text-violet-900 truncate">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-violet-600"
      />
    </div>
  );
});

AnalyticsNode.displayName = "AnalyticsNode";
