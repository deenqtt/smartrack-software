"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Rss, Info, Globe, Cpu } from "lucide-react";

interface ModbusSettings {
  modbus_tcp_ip?: string;
  modbus_tcp_port?: number;
}

interface ModbusSettingsCardProps {
  settings: ModbusSettings;
  isLoading: boolean;
  onSettingsChange: (settings: Partial<ModbusSettings>) => void;
  onSave?: (settings: ModbusSettings) => void;
  onReset?: () => void;
}

const FormField = ({
  id,
  label,
  icon: Icon,
  children,
  description,
}: {
  id: string;
  label: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  description?: string;
}) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />}
      <Label htmlFor={id} className="font-semibold text-sm">
        {label}
      </Label>
    </div>
    <div className="relative">
      {children}
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {description}
        </p>
      )}
    </div>
  </div>
);

export function ModbusSettingsCard({
  settings,
  isLoading,
  onSettingsChange,
  onSave,
  onReset,
}: ModbusSettingsCardProps) {
  const [localSettings, setLocalSettings] = useState<ModbusSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleInputChange = (key: keyof ModbusSettings, value: string) => {
    const isNumberField = key === "modbus_tcp_port";
    const newValue = isNumberField ? Number(value) : value;
    setLocalSettings((prev) => ({ ...prev, [key]: newValue }));
    setHasChanges(true);
  };

  const handleSave = () => {
    // Send ALL local settings to parent (let parent handle diff detection)
    console.log("ModbusSettingsCard.handleSave - localSettings:", localSettings);
    console.log("ModbusSettingsCard.handleSave - original settings:", settings);
    onSettingsChange(localSettings);
    // Pass localSettings directly to onSave to avoid race condition
    onSave?.(localSettings);
  };

  const handleLocalReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    onReset?.();
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      );
    }

    if (Object.keys(settings).length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 bg-muted/20 p-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
            <Info className="h-7 w-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              No Modbus Data
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Waiting for settings from the server...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <FormField
          id="modbus_tcp_ip"
          label="IP Address"
          icon={Globe}
          description="Server listen address. Use 0.0.0.0 for all interfaces"
        >
          <Input
            id="modbus_tcp_ip"
            value={localSettings.modbus_tcp_ip ?? ""}
            onChange={(e) => handleInputChange("modbus_tcp_ip", e.target.value)}
            placeholder="e.g., 192.168.1.100"
            className="h-10"
          />
        </FormField>

        <FormField
          id="modbus_tcp_port"
          label="Port"
          icon={Cpu}
          description="Standard Modbus TCP port is 502 (requires root on Linux)"
        >
          <Input
            id="modbus_tcp_port"
            type="number"
            value={localSettings.modbus_tcp_port ?? ""}
            onChange={(e) => handleInputChange("modbus_tcp_port", e.target.value)}
            placeholder="e.g., 502"
            className="h-10"
            min="1"
            max="65535"
          />
        </FormField>
      </div>
    );
  };

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100/10 flex-shrink-0">
            <Rss className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl">Modbus TCP</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Port 502 requires root. Settings apply immediately.
            </CardDescription>
          </div>
        </div>
        {hasChanges && (
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 whitespace-nowrap text-white text-sm"
              size="sm"
            >
              Save
            </Button>
            <Button
              onClick={handleLocalReset}
              variant="outline"
              className="whitespace-nowrap text-sm"
              size="sm"
            >
              Reset
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
