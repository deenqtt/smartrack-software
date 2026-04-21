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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings, Info, Shield, Bell } from "lucide-react";

interface SnmpSettings {
  [key: string]: any;
}

interface SnmpSettingsCardProps {
  settings: SnmpSettings;
  isLoading: boolean;
  onSettingsChange: (settings: Partial<SnmpSettings>) => void;
  onSave?: (settings: SnmpSettings) => void;
  onReset?: () => void;
}

const FormField = ({
  id,
  label,
  children,
  description,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  description?: string;
}) => (
  <div className="space-y-3">
    <Label htmlFor={id} className="font-semibold text-sm">
      {label}
    </Label>
    <div>
      {children}
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {description}
        </p>
      )}
    </div>
  </div>
);

export function SnmpSettingsCard({
  settings,
  isLoading,
  onSettingsChange,
  onSave,
  onReset,
}: SnmpSettingsCardProps) {
  const [localSettings, setLocalSettings] = useState<SnmpSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleValueChange = (
    key: string,
    value: string | number | boolean
  ) => {
    const originalValue = settings[key];
    let processedValue: any = value;
    if (typeof originalValue === "number" && typeof value !== "boolean") {
      processedValue = value === "" ? null : Number(value);
    }
    setLocalSettings((prev) => ({ ...prev, [key]: processedValue }));
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

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-32" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          ))}
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
              No SNMP Data
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Waiting for settings from the server...
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-8" id="snmp-form">
        {/* Agent Configuration */}
        <section>
          <h3 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
            Agent Configuration
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              id="DeviceName"
              label="Device Name"
              description="Unique identifier for this agent"
            >
              <Input
                id="DeviceName"
                value={localSettings.DeviceName ?? ""}
                onChange={(e) => handleValueChange("DeviceName", e.target.value)}
                placeholder="e.g., MyDevice"
                className="h-10"
              />
            </FormField>
            <FormField
              id="Site"
              label="Site Location"
              description="Physical location of the device"
            >
              <Input
                id="Site"
                value={localSettings.Site ?? ""}
                onChange={(e) => handleValueChange("Site", e.target.value)}
                placeholder="e.g., Jakarta Datacenter"
                className="h-10"
              />
            </FormField>
            <FormField
              id="snmpIPaddress"
              label="IP Address"
              description="Agent listening address"
            >
              <Input
                id="snmpIPaddress"
                value={localSettings.snmpIPaddress ?? ""}
                onChange={(e) =>
                  handleValueChange("snmpIPaddress", e.target.value)
                }
                placeholder="e.g., 192.168.1.50"
                className="h-10"
              />
            </FormField>
            <FormField
              id="snmpPort"
              label="Port"
              description="Default SNMP port is 161"
            >
              <Input
                id="snmpPort"
                type="number"
                value={localSettings.snmpPort ?? ""}
                onChange={(e) => handleValueChange("snmpPort", e.target.value)}
                placeholder="e.g., 161"
                className="h-10"
              />
            </FormField>
            <FormField
              id="sysOID"
              label="System OID"
              description="Enterprise OID for identification"
            >
              <Input
                id="sysOID"
                value={localSettings.sysOID ?? ""}
                onChange={(e) => handleValueChange("sysOID", e.target.value)}
                placeholder="e.g., 1.3.6.1.4.1.99999"
                className="h-10"
              />
            </FormField>
          </div>
        </section>

        {/* Security Settings */}
        <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <h3 className="text-base font-semibold mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <Shield size={18} /> Security Settings
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <FormField
              id="snmpVersion"
              label="SNMP Version"
              description="Protocol version to use"
            >
              <Select
                value={String(localSettings.snmpVersion ?? "2")}
                onValueChange={(value) =>
                  handleValueChange("snmpVersion", value)
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Version 1</SelectItem>
                  <SelectItem value="2">Version 2c</SelectItem>
                  <SelectItem value="3">Version 3</SelectItem>
                </SelectContent>
              </Select>
            </FormField>

            {String(localSettings.snmpVersion) !== "3" && (
              <FormField
                id="snmpCommunity"
                label="Community String"
                description="Authentication string (v1/v2c)"
              >
                <Input
                  id="snmpCommunity"
                  type="password"
                  value={localSettings.snmpCommunity ?? ""}
                  onChange={(e) =>
                    handleValueChange("snmpCommunity", e.target.value)
                  }
                  placeholder="e.g., public"
                  className="h-10"
                />
              </FormField>
            )}
          </div>

          {String(localSettings.snmpVersion) === "3" && (
            <div className="mt-6 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-6">
              <h4 className="font-medium text-sm">Version 3 Security</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  id="securityName"
                  label="Username"
                  description="Security name for authentication"
                >
                  <Input
                    id="securityName"
                    value={localSettings.securityName ?? ""}
                    onChange={(e) =>
                      handleValueChange("securityName", e.target.value)
                    }
                    placeholder="e.g., admin"
                    className="h-10"
                  />
                </FormField>
                <FormField
                  id="securityLevel"
                  label="Security Level"
                  description="Authentication & privacy options"
                >
                  <Select
                    value={localSettings.securityLevel ?? "noAuthNoPriv"}
                    onValueChange={(value) =>
                      handleValueChange("securityLevel", value)
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="noAuthNoPriv">
                        No Auth, No Privacy
                      </SelectItem>
                      <SelectItem value="authNoPriv">
                        Auth, No Privacy
                      </SelectItem>
                      <SelectItem value="authPriv">
                        Auth and Privacy
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              {localSettings.securityLevel !== "noAuthNoPriv" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    id="authKey"
                    label="Authentication Key"
                    description="Authentication passphrase"
                  >
                    <Input
                      id="authKey"
                      type="password"
                      value={localSettings.authKey ?? ""}
                      onChange={(e) =>
                        handleValueChange("authKey", e.target.value)
                      }
                      placeholder="••••••••"
                      className="h-10"
                    />
                  </FormField>
                  {localSettings.securityLevel === "authPriv" && (
                    <FormField
                      id="privKey"
                      label="Privacy Key"
                      description="Encryption passphrase"
                    >
                      <Input
                        id="privKey"
                        type="password"
                        value={localSettings.privKey ?? ""}
                        onChange={(e) =>
                          handleValueChange("privKey", e.target.value)
                        }
                        placeholder="••••••••"
                        className="h-10"
                      />
                    </FormField>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* SNMP Traps */}
        <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Bell size={18} /> SNMP Traps
            </h3>
            <Switch
              id="snmpTrapEnabled"
              checked={!!localSettings.snmpTrapEnabled}
              onCheckedChange={(checked) =>
                handleValueChange("snmpTrapEnabled", checked)
              }
            />
          </div>

          {localSettings.snmpTrapEnabled && (
            <div className="mt-6 space-y-6 pl-4 border-l-4 border-blue-400">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  id="ipSnmpManager"
                  label="Trap Receiver IP"
                  description="Where to send trap notifications"
                >
                  <Input
                    id="ipSnmpManager"
                    value={localSettings.ipSnmpManager ?? ""}
                    onChange={(e) =>
                      handleValueChange("ipSnmpManager", e.target.value)
                    }
                    placeholder="e.g., 192.168.1.100"
                    className="h-10"
                  />
                </FormField>
                <FormField
                  id="portSnmpManager"
                  label="Trap Receiver Port"
                  description="Default trap port is 162"
                >
                  <Input
                    id="portSnmpManager"
                    type="number"
                    value={localSettings.portSnmpManager ?? ""}
                    onChange={(e) =>
                      handleValueChange("portSnmpManager", e.target.value)
                    }
                    placeholder="e.g., 162"
                    className="h-10"
                  />
                </FormField>
                <FormField
                  id="snmpTrapVersion"
                  label="Trap Version"
                  description="Protocol version for traps"
                >
                  <Select
                    value={String(localSettings.snmpTrapVersion ?? "2")}
                    onValueChange={(value) =>
                      handleValueChange("snmpTrapVersion", value)
                    }
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Version 1</SelectItem>
                      <SelectItem value="2">Version 2c</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField
                  id="snmpTrapComunity"
                  label="Trap Community"
                  description="Authentication for traps"
                >
                  <Input
                    id="snmpTrapComunity"
                    type="password"
                    value={localSettings.snmpTrapComunity ?? ""}
                    onChange={(e) =>
                      handleValueChange("snmpTrapComunity", e.target.value)
                    }
                    placeholder="e.g., public"
                    className="h-10"
                  />
                </FormField>
                <FormField
                  id="timeDelaySnmpTrap"
                  label="Trap Delay"
                  description="Seconds between trap checks"
                >
                  <Input
                    id="timeDelaySnmpTrap"
                    type="number"
                    value={localSettings.timeDelaySnmpTrap ?? ""}
                    onChange={(e) =>
                      handleValueChange("timeDelaySnmpTrap", e.target.value)
                    }
                    placeholder="e.g., 30"
                    className="h-10"
                  />
                </FormField>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <Card className="border border-border/50 shadow-sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 sm:gap-0">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100/10 flex-shrink-0">
            <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-lg sm:text-xl">SNMP Configuration</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Configure network management parameters and traps.
            </CardDescription>
          </div>
        </div>
        {hasChanges && (
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={handleSave}
              className="bg-orange-600 hover:bg-orange-700 whitespace-nowrap text-white text-sm"
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
