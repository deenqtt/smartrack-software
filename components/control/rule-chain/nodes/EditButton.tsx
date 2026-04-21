"use client";

import React from "react";
import { Edit2 } from "lucide-react";

interface EditButtonProps {
  nodeId: string;
  onEdit: (nodeId: string) => void;
}

export const EditButton = ({ nodeId, onEdit }: EditButtonProps) => {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onEdit(nodeId);
      }}
      className="w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center shadow-md transition-colors"
      title="Edit node"
    >
      <Edit2 size={10} />
    </button>
  );
};
