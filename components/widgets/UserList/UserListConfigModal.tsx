"use client";

import React, { useState, useEffect } from "react";
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
import { showToast } from "@/lib/toast-utils";
import { Users, Settings, RefreshCw } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const UserListConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // ===== FORM STATE =====
  const [config, setConfig] = useState({
    customName: "User Management",
    refreshInterval: 30,
  });

  // ===== EDIT MODE HANDLING =====
  useEffect(() => {
    if (isOpen && initialConfig) {
      setConfig({
        customName: initialConfig.customName || "User Management",
        refreshInterval: initialConfig.refreshInterval || 30,
      });
    } else if (isOpen) {
      setConfig({
        customName: "User Management",
        refreshInterval: 30,
      });
    }
  }, [isOpen, initialConfig]);

  // ===== VALIDATION & SAVE =====
  const handleSave = () => {
    if (!config.customName.trim()) {
      showToast.error("Please enter a widget name.");
      return;
    }

    if (config.refreshInterval < 10 || config.refreshInterval > 3600) {
      showToast.error("Refresh interval must be between 10 and 3600 seconds.");
      return;
    }

    onSave(config);
  };

  // ===== RENDER =====
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            {initialConfig ? "Edit" : "Configure"} User List Widget
          </DialogTitle>
          <DialogDescription>
            Configure basic settings for the user management table. This widget displays all system users with built-in sorting and pagination.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          <div className="grid gap-6">
            <div className="grid gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">
                <Settings className="w-4 h-4" />
                Display Settings
              </div>
              <div className="pl-6 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="customName" className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    Widget Display Name
                  </Label>
                  <Input
                    id="customName"
                    value={config.customName}
                    onChange={(e) => setConfig({ ...config, customName: e.target.value })}
                    placeholder="e.g., System Users"
                    className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="refreshInterval" className="text-xs uppercase tracking-wider text-slate-500 font-bold">
                    Auto-refresh Interval (seconds)
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="refreshInterval"
                      type="number"
                      min="10"
                      max="3600"
                      value={config.refreshInterval}
                      onChange={(e) => setConfig({ ...config, refreshInterval: parseInt(e.target.value) || 30 })}
                      className="bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-800 w-32"
                    />
                    <span className="text-xs text-slate-400">Updates the table data automatically Every {config.refreshInterval}s</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
              <h4 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-400 mb-2">
                <RefreshCw className="w-4 h-4" />
                Automatic Configuration
              </h4>
              <ul className="text-xs text-blue-600 dark:text-blue-300 space-y-2 list-disc pl-4">
                <li><strong>All Users:</strong> The widget is now configured to show all users by default.</li>
                <li><strong>Pagination:</strong> Data is automatically split into pages of 10 items.</li>
                <li><strong>Sorting:</strong> Click on column headers (Email, Role, Joined) to sort data instantly.</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4 border-slate-100 dark:border-slate-800">
          <Button variant="ghost" onClick={onClose} className="text-slate-500 hover:text-slate-900">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all active:scale-95">
            <Users className="w-4 h-4" />
            {initialConfig ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
