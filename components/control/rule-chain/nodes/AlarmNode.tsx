"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { AlertCircle } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface AlarmNodeData {
  label: string;
  nodeId: string;
  config?: any;
}

export const AlarmNode = memo(({ data, id }: NodeProps<AlarmNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Orange - Represents ALARM nodes (alarm triggers and notifications)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-orange-400 border-2 border-orange-500 min-w-[140px] max-w-[180px]"
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
        className="w-3 h-3 bg-orange-600"
      />
      <div className="flex items-center gap-2">
        <AlertCircle size={16} className="text-orange-900 flex-shrink-0" />
        <div className="text-sm font-medium text-orange-900 truncate">
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-600"
      />
    </div>
  );
});

AlarmNode.displayName = "AlarmNode";
