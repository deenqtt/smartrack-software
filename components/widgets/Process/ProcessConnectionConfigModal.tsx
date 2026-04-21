"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showToast } from "@/lib/toast-utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    name?: string;
    desc?: string;
    connectionType?: string;
  };
}

const connectionTypes = [
  { value: "single", label: "Single Line" },
  { value: "elbow", label: "Elbow (L-Shape)" },
  { value: "3-way", label: "3-Way Junction" },
  { value: "4-way", label: "4-Way Junction" },
];

export const ProcessConnectionConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [connectionType, setConnectionType] = useState("single");

  useEffect(() => {
    if (isOpen) {
      // Load initial values if editing
      if (initialConfig) {
        setName(initialConfig.name || "");
        setDesc(initialConfig.desc || "");
        setConnectionType(initialConfig.connectionType || "single");
      }
    } else {
      // Reset form saat modal ditutup
      setTimeout(() => {
        setName("");
        setDesc("");
        setConnectionType("single");
      }, 200);
    }
  }, [isOpen, initialConfig]);

  const handleSave = () => {
    if (!name || !connectionType) {
      showToast.warning("Incomplete", "Please fill all required fields.");
      return;
    }
    onSave({
      name,
      desc,
      connectionType,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            {initialConfig
              ? "Edit Process Connection"
              : "Configure Process Connection"}
          </DialogTitle>
          <DialogDescription>
            Configure animated connection lines between process shapes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 p-6">
          <div className="space-y-4 p-4 bg-blue-50 rounded-lg border">
            <h4 className="text-sm font-medium text-slate-700">
              Connection Properties
            </h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Connection Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Flow to Tank B, Process Link"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="desc">Description (Optional)</Label>
                <Input
                  id="desc"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="e.g., Connection between Reactor A and Tank B"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="connectionType">Connection Type *</Label>
                <Select
                  onValueChange={setConnectionType}
                  value={connectionType}
                >
                  <SelectTrigger id="connectionType">
                    <SelectValue placeholder="Select connection type" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSave}>
            Save Connection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
