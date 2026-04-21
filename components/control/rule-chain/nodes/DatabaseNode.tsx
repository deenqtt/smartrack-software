"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface DatabaseNodeData {
  label: string;
  nodeId: string;
  config?: any;
}

export const DatabaseNode = memo(({ data, id }: NodeProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Purple - Represents DATABASE nodes (logging to database)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-purple-400 border-2 border-purple-500 min-w-[140px] max-w-[180px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={(data as any).label}
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
        className="w-3 h-3 bg-purple-600"
      />
      <div className="flex items-center gap-2">
        <Database size={16} className="text-purple-900 flex-shrink-0" />
        <div className="text-sm font-medium text-purple-900 truncate">
          {(data as any).label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-600"
      />
    </div>
  );
});

DatabaseNode.displayName = "DatabaseNode";
