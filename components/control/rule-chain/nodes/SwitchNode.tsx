import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface Operand {
  type: "deviceField" | "staticValue";
  deviceName?: string;
  deviceUniqId?: string;
  key?: string;
  value?: any;
}

interface SwitchNodeData {
  label: string;
  nodeId: string;
  config?: {
    leftOperand?: Operand;
    cases?: Array<{
      id: string;
      label: string;
      operator: string;
      rightOperand: Operand;
    }>;
    defaultCase?: {
      label: string;
    };
  };
}

export const SwitchNode = memo(({ data, id }: NodeProps<SwitchNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  const config = data.config || {};
  const cases = config.cases || [];
  const defaultCase = config.defaultCase;
  const leftOperand = config.leftOperand;

  // Generate display label for operand
  const getOperandLabel = (operand?: Operand): string => {
    if (!operand) return "Not set";
    if (operand.type === "deviceField") {
      if (operand.deviceName && operand.key) {
        return `${operand.deviceName} - ${operand.key}`;
      }
      if (operand.deviceName) return operand.deviceName;
      return "Not set";
    }
    return operand.value || "Not set";
  };

  const leftLabel = getOperandLabel(leftOperand);

  return (
    <div
      // Color: Sky - Represents SWITCH/ROUTING nodes (multi-path branching)
      className="relative px-3 py-2 shadow-lg rounded-lg bg-sky-400 border-2 border-sky-500 min-w-[160px] max-w-[200px]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={`Switch on: ${leftLabel}`} // Tooltip
    >
      {isHovered && (
        <div className="absolute -top-2 -left-2 flex gap-1 z-10">
          <DeleteButton nodeId={id} onDelete={deleteNode} />
          <EditButton nodeId={id} onEdit={onEditNode} />
        </div>
      )}

      <div className="flex items-center gap-2 mb-1">
        <GitBranch className="w-4 h-4 text-sky-900 flex-shrink-0" />
        <div className="text-sm font-bold text-sky-900 truncate">{data.label}</div>
      </div>

      <div className="text-xs text-sky-800">
        <div className="truncate" title={leftLabel}>
          Compare: {leftLabel}
        </div>
        <div>Cases: {cases.length}</div>
        {defaultCase && <div className="truncate">Default: {defaultCase.label}</div>}
      </div>

      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-sky-600"
      />

      {/* Output handles for each case */}
      {cases.map((caseItem, index) => (
        <Handle
          key={caseItem.id}
          type="source"
          position={Position.Right}
          id={caseItem.id}
          style={{
            top: `${20 + index * 25}%`,
          }}
          className="w-3 h-3 bg-sky-700"
        />
      ))}

      {/* Default case handle */}
      {defaultCase && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="w-3 h-3 bg-sky-700"
        />
      )}
    </div>
  );
});

SwitchNode.displayName = "SwitchNode";
