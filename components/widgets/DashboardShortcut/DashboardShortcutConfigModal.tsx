// File: components/widgets/DashboardShortcut/DashboardShortcutConfigModal.tsx
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/lib/toast-utils";
import {
  LayoutDashboard,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DashboardOption {
  id: string;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    shortcutTitle: string;
    targetType: "dashboard" | "custom" | "manual";
    targetDashboardId?: string;
    customRoute?: string;
    icon: string;
  };
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Home,
  User,
  Users,
  UserCheck,
  Settings,
  Shield,
  Key,
  Globe,
  Star,
  Monitor,
  Zap,
  Cog,
};

const iconOptions = [
  { value: "LayoutDashboard", label: "Dashboard" },
  { value: "Home", label: "Home" },
  { value: "User", label: "User" },
  { value: "Users", label: "Users" },
  { value: "UserCheck", label: "User Check" },
  { value: "Settings", label: "Settings" },
  { value: "Shield", label: "Shield" },
  { value: "Key", label: "Key" },
  { value: "Globe", label: "Globe" },
  { value: "Star", label: "Star" },
  { value: "Monitor", label: "Monitor" },
  { value: "Zap", label: "Zap" },
  { value: "Cog", label: "Cog" },
];

export const DashboardShortcutConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const [dashboards, setDashboards] = useState<DashboardOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [shortcutTitle, setShortcutTitle] = useState("");
  const [shortcutType, setShortcutType] = useState<
    "dashboard" | "custom" | "manual"
  >("dashboard");
  const [targetDashboardId, setTargetDashboardId] = useState<string | null>(
    null
  );
  const [customRoute, setCustomRoute] = useState("");
  const [manualRoute, setManualRoute] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("LayoutDashboard");

  // useEffect untuk initialize saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      if (initialConfig) {
        setShortcutTitle(initialConfig.shortcutTitle);
        setShortcutType(initialConfig.targetType);
        setSelectedIcon(initialConfig.icon);

        if (initialConfig.targetType === "dashboard") {
          setTargetDashboardId(initialConfig.targetDashboardId || null);
        } else if (initialConfig.targetType === "custom") {
          setCustomRoute(initialConfig.customRoute || "");
        } else if (initialConfig.targetType === "manual") {
          setManualRoute(initialConfig.customRoute || "");
        }
      } else {
        // Reset untuk shortcut baru
        setShortcutTitle("");
        setShortcutType("dashboard");
        setTargetDashboardId(null);
        setCustomRoute("");
        setManualRoute("");
        setSelectedIcon("LayoutDashboard");
      }
    }
  }, [isOpen, initialConfig]);

  // useEffect terpisah untuk fetch dashboards
  useEffect(() => {
    if (isOpen && shortcutType === "dashboard" && dashboards.length === 0) {
      const fetchDashboards = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(`${API_BASE_URL}/api/dashboards`);
          if (!response.ok) throw new Error("Failed to fetch dashboards");
          setDashboards(await response.json());
        } catch (error: any) {
          showToast.error("Error", error.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchDashboards();
    }
  }, [isOpen, shortcutType, dashboards.length]);

  const handleSave = () => {
    if (!shortcutTitle.trim()) {
      showToast.warning("Incomplete", "Shortcut Title is required.");
      return;
    }

    if (shortcutType === "dashboard") {
      if (!targetDashboardId) {
        showToast.warning("Incomplete", "Please select a target dashboard.");
        return;
      }
      onSave({
        shortcutTitle,
        targetType: "dashboard",
        targetDashboardId,
        icon: selectedIcon,
      });
    } else if (shortcutType === "custom") {
      if (!customRoute.trim()) {
        showToast.warning("Incomplete", "Custom route is required.");
        return;
      }
      const route = customRoute.startsWith("/")
        ? customRoute
        : `/${customRoute}`;
      onSave({
        shortcutTitle,
        targetType: "custom",
        customRoute: route,
        icon: selectedIcon,
      });
    } else if (shortcutType === "manual") {
      if (!manualRoute.trim()) {
        showToast.warning("Incomplete", "Manual route is required.");
        return;
      }
      const route = manualRoute.startsWith("/")
        ? manualRoute
        : `/${manualRoute}`;
      onSave({
        shortcutTitle,
        targetType: "custom",
        customRoute: route,
        icon: selectedIcon,
      });
    }
  };

  const isSaveDisabled = () => {
    if (isLoading || !shortcutTitle.trim()) return true;

    if (shortcutType === "dashboard") return !targetDashboardId;
    if (shortcutType === "custom") return !customRoute.trim();
    if (shortcutType === "manual") return !manualRoute.trim();

    return false;
  };

  const handleTypeChange = (value: string) => {
    const newType = value as "dashboard" | "custom" | "manual";
    setShortcutType(newType);

    // Reset values saat switching
    setTargetDashboardId(null);
    setCustomRoute("");
    setManualRoute("");
  };

  const IconComponent = iconMap[selectedIcon];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">
            Configure Dashboard Shortcut
          </DialogTitle>
          <DialogDescription>
            Create a button that links to a dashboard or custom route.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 p-6">
          <div className="grid gap-2">
            <Label>Shortcut Title</Label>
            <Input
              value={shortcutTitle}
              onChange={(e) => setShortcutTitle(e.target.value)}
              placeholder="e.g., Go to Server Room"
            />
          </div>

          <div className="grid gap-2">
            <Label>Shortcut Icon</Label>
            <Select onValueChange={setSelectedIcon} value={selectedIcon}>
              <SelectTrigger>
                <SelectValue>
                  <div className="flex items-center gap-2">
                    {IconComponent && <IconComponent className="h-4 w-4" />}
                    <span>
                      {
                        iconOptions.find((opt) => opt.value === selectedIcon)
                          ?.label
                      }
                    </span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {iconOptions.map((icon) => {
                  const Icon = iconMap[icon.value];
                  return (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Shortcut Type</Label>
            <Select onValueChange={handleTypeChange} value={shortcutType}>
              <SelectTrigger>
                <SelectValue>
                  {shortcutType === "dashboard" && "Dashboard"}
                  {shortcutType === "custom" && "Custom Route"}
                  {shortcutType === "manual" && "Manual Route"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dashboard">Dashboard</SelectItem>
                <SelectItem value="custom">Custom Route</SelectItem>
                <SelectItem value="manual">Manual Route</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {shortcutType === "dashboard" && (
            <div className="grid gap-2">
              <Label>Target Dashboard</Label>
              {isLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  onValueChange={setTargetDashboardId}
                  value={targetDashboardId || ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a dashboard to link to" />
                  </SelectTrigger>
                  <SelectContent>
                    {dashboards.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {shortcutType === "custom" && (
            <div className="grid gap-2">
              <Label>Custom Route</Label>
              <Input
                value={customRoute}
                onChange={(e) => setCustomRoute(e.target.value)}
                placeholder="e.g., /management-user or management-user"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Enter the route path. Leading slash (/) will be added
                automatically if missing.
              </p>
            </div>
          )}

          {shortcutType === "manual" && (
            <div className="grid gap-2">
              <Label>Manual Route</Label>
              <Input
                value={manualRoute}
                onChange={(e) => setManualRoute(e.target.value)}
                placeholder="e.g., /management-user or management-user"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Enter any custom route path. Leading slash (/) will be added
                automatically if missing.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSave}
            disabled={isSaveDisabled()}
          >
            Save Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
