"use client";

import React, { memo, useState } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { Gamepad2 } from "lucide-react";
import { DeleteButton } from "./DeleteButton";
import { EditButton } from "./EditButton";
import { useRuleChain } from "../RuleChainContext";

interface ControlNodeData {
  label: string;
  nodeId: string;
  deviceType?: "modbus" | "modular"; // modbus relay or modular relay
  controlType?: string; // on/off/toggle
  config?: any;
}

export const ControlNode = memo(({ data, id }: NodeProps<ControlNodeData>) => {
  const [isHovered, setIsHovered] = useState(false);
  const { deleteNode, onEditNode } = useRuleChain();

  // Determine background color based on device type
  const getColorClass = () => {
    if (data.deviceType === "modbus") {
      return "bg-purple-400 border-purple-500";
    } else if (data.deviceType === "modular") {
      return "bg-fuchsia-400 border-fuchsia-500";
    }
    return "bg-purple-400 border-purple-500";
  };

  const getIconColor = () => {
    if (data.deviceType === "modbus") {
      return "text-purple-900";
    } else if (data.deviceType === "modular") {
      return "text-fuchsia-900";
    }
    return "text-purple-900";
  };

  const getTextColor = () => {
    if (data.deviceType === "modbus") {
      return "text-purple-900";
    } else if (data.deviceType === "modular") {
      return "text-fuchsia-900";
    }
    return "text-purple-900";
  };

  const handleColor = () => {
    if (data.deviceType === "modbus") {
      return "bg-purple-600";
    } else if (data.deviceType === "modular") {
      return "bg-fuchsia-600";
    }
    return "bg-purple-600";
  };

  return (
    <div
      // Color: Purple/Fuchsia - Represents CONTROL nodes (device control: relay ON/OFF)
      // Purple = Modbus devices, Fuchsia = Modular devices
      className={`relative px-3 py-2 shadow-lg rounded-lg border-2 min-w-[160px] max-w-[200px] ${getColorClass()}`}
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
        className={`w-3 h-3 ${handleColor()}`}
      />
      <div className="flex items-center gap-2">
        <Gamepad2 size={16} className={`${getIconColor()} flex-shrink-0`} />
        <div className={`text-sm font-medium ${getTextColor()} truncate`}>
          {data.label}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className={`w-3 h-3 ${handleColor()}`}
      />
    </div>
  );
});

ControlNode.displayName = "ControlNode";
