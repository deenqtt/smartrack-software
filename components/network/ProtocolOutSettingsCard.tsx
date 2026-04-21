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
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Info, Database, Rss, Settings, Zap, HardDrive, Radio, Cloud, Wifi, Cpu, Activity, Plug } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProtocolOutSettings {
  [key: string]: boolean;
}

interface ProtocolOutSettingsCardProps {
  settings: ProtocolOutSettings;
  isLoading: boolean;
  onSettingsChange: (settings: Partial<ProtocolOutSettings>) => void;
  onSave?: (settings: ProtocolOutSettings) => void;
  onReset?: () => void;
}

const PROTOCOL_INFO = {
  MODBUS_TCP: { icon: Rss, color: "bg-green-500/10 text-green-700 dark:text-green-400", label: "Modbus TCP" },
  SNMP: { icon: Settings, color: "bg-orange-500/10 text-orange-700 dark:text-orange-400", label: "SNMP" },
  BACNET: { icon: Database, color: "bg-sky-500/10 text-sky-700 dark:text-sky-400", label: "BACnet/IP" },
  GOOSE: { icon: Zap, color: "bg-red-500/10 text-red-700 dark:text-red-400", label: "GOOSE" },
  PROFINET: { icon: HardDrive, color: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400", label: "PROFINET" },
  SPARKPLUG: { icon: Cloud, color: "bg-purple-500/10 text-purple-700 dark:text-purple-400", label: "Sparkplug B" },
  ETHERNETIP: { icon: Wifi, color: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400", label: "EtherNet/IP" },
  OPCUA: { icon: Cpu, color: "bg-teal-500/10 text-teal-700 dark:text-teal-400", label: "OPC UA" },
  IEC104: { icon: Activity, color: "bg-amber-500/10 text-amber-700 dark:text-amber-400", label: "IEC 104" },
  LORA: { icon: Radio, color: "bg-rose-500/10 text-rose-700 dark:text-rose-400", label: "LoRa" },
  OCPP: { icon: Plug, color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", label: "OCPP" },
};

export function ProtocolOutSettingsCard({
  settings,
  isLoading,
  onSettingsChange,
  onSave,
  onReset,
}: ProtocolOutSettingsCardProps) {
  const [localSettings, setLocalSettings] = useState<ProtocolOutSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleValueChange = (key: string, value: boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
    onSave?.(localSettings);
  };

  const handleLocalReset = () => {
    setLocalSettings(settings);
    setHasChanges(false);
    onReset?.();
  };

  const enabledCount = Object.values(localSettings).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border border-border/50 shadow-sm bg-card/50 backdrop-blur-xs">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Active Protocols
                </p>
                <p className="text-3xl font-bold mt-2 text-foreground">
                  {enabledCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{`of ${Object.keys(settings).length}`}</p>
              </div>
              <div className="p-3 bg-blue-100/10 rounded-lg">
                <Server className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/50 shadow-sm bg-card/50 backdrop-blur-xs">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  System Status
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-lg font-semibold text-green-600 dark:text-green-400">Ready</p>
                </div>
              </div>
              <div className="p-3 bg-green-100/10 rounded-lg">
                <Database className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="border border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-start justify-between pb-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Server className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle>Protocol Services</CardTitle>
              <CardDescription>
                Enable or disable individual protocol services. Changes apply immediately.
              </CardDescription>
            </div>
          </div>
          {hasChanges && (
            <div className="flex gap-2 ml-4 flex-shrink-0">
              <Button
                onClick={handleSave}
                className="bg-green-600 hover:bg-green-700 whitespace-nowrap text-white"
                size="sm"
              >
                Save
              </Button>
              <Button
                onClick={handleLocalReset}
                variant="outline"
                className="whitespace-nowrap"
                size="sm"
              >
                Reset
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-card/30 p-4 space-y-3"
                >
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : Object.keys(localSettings).length > 0 ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                {Object.entries(localSettings).map(([key, value]) => {
                  const info = PROTOCOL_INFO[key as keyof typeof PROTOCOL_INFO];
                  const Icon = info?.icon || Server;

                  return (
                    <div
                      key={key}
                      className={`relative rounded-lg border p-4 transition-all duration-200 ${
                        value
                          ? "border-green-300/50 bg-green-50/5 dark:bg-green-900/5"
                          : "border-border/50 bg-card/30 hover:border-border/70 hover:bg-card/50"
                      }`}
                    >
                      {/* Active indicator */}
                      {value && (
                        <div className="absolute top-0 left-0 h-1 w-full rounded-t-lg bg-gradient-to-r from-green-400 to-green-600"></div>
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg ${info?.color} mb-3`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <Label className="block font-semibold text-sm mb-2">
                            {info?.label || key.replace("_", " ")}
                          </Label>
                          {value ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                              Enabled
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Disabled
                            </Badge>
                          )}
                        </div>

                        <Switch
                          id={key}
                          checked={value}
                          onCheckedChange={(checked) =>
                            handleValueChange(key, checked)
                          }
                          className="mt-1"
                        />
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/50 bg-muted/20 p-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
                <Info className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-foreground">
                  No Protocol Data
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Waiting for settings from the server...
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
