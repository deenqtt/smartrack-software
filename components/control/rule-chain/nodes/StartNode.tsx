"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface StartNodeData {
  label: string;
  nodeId: string;
  config?: {
    nodeName?: string;
  };
}

export const StartNode = memo(({ data, id }: NodeProps<StartNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Emerald - Represents START nodes (manual trigger entry points)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-emerald-400 border-2 border-emerald-500 min-w-[120px] max-w-[180px]"
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
      <div className="flex items-center gap-2">
        <Play size={16} className="text-emerald-900 flex-shrink-0" />
        <div className="text-sm font-medium text-emerald-900 truncate">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-emerald-600"
      />
    </div>
  );
});

StartNode.displayName = "StartNode";
