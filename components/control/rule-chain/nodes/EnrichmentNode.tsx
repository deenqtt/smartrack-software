"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Database } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface EnrichmentNodeData {
  label: string;
  nodeId: string;
  config?: {
    deviceUniqId?: string;
    deviceTopic?: string;
    keyValuePairs?: Array<{ keyName: string; keyValue: string }>;
  };
}

export const EnrichmentNode = memo(({ data, id }: NodeProps<EnrichmentNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  return (
    <div
      // Color: Indigo - Represents ENRICHMENT nodes (add external data)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-indigo-400 border-2 border-indigo-500 min-w-[140px] max-w-[180px]"
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
        className="w-3 h-3 bg-indigo-600"
      />
      <div className="flex items-center gap-2 mb-1">
        <Database size={16} className="text-indigo-900 flex-shrink-0" />
        <div className="text-sm font-medium text-indigo-900 truncate">
          {data.label}
        </div>
      </div>
      {data.config?.keyValuePairs && data.config.keyValuePairs.length > 0 && (
        <div className="text-xs text-indigo-800 truncate">
          {data.config.keyValuePairs.length} field{data.config.keyValuePairs.length !== 1 ? 's' : ''}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-600"
      />
    </div>
  );
});

EnrichmentNode.displayName = "EnrichmentNode";
