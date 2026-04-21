"use client";

import React from "react";
import { X } from "lucide-react";

interface DeleteButtonProps {
  nodeId: string;
  onDelete: (nodeId: string) => void;
}

export const DeleteButton = ({ nodeId, onDelete }: DeleteButtonProps) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(nodeId);
      }}
      className="w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center shadow-md transition-colors"
      title="Delete node"
    >
      <X size={10} />
    </button>
  );
};
