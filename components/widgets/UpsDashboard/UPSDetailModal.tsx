// File: components/widgets/UPSDashboard/UPSDetailModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  Battery,
  Zap,
  Power,
  Plug,
  Activity,
  Clock,
  Wifi,
} from "lucide-react";

interface UPSData {
  status: string | null;
  runningTime: string | null;
  communicationStatus: string | null;
  bypass: {
    voltage: number | null;
    frequency: number | null;
  };
  line: {
    voltage: number | null;
    frequency: number | null;
  };
  battery: {
    percent: number | null;
    voltage: number | null;
    time: number | null;
    temperature: number | null;
    current: number | null;
    health: number | null;
  };
  output: {
    voltage: number | null;
    frequency: number | null;
    current: number | null;
  };
  load: {
    percent: number | null;
    apparentPower: number | null;
    activePower: number | null;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  upsData: UPSData;
  deviceName?: string;
  isDataRetained?: boolean;
}

const DetailRow = ({
  label,
  value,
  unit = "",
  icon: Icon,
  status = "normal",
}: {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: React.ReactNode;
  status?: "normal" | "warning" | "critical";
}) => {
  const getStatusColor = () => {
    if (status === "critical") return "text-red-600 dark:text-red-400";
    if (status === "warning") return "text-amber-600 dark:text-amber-400";
    return "text-slate-700 dark:text-slate-300";
  };

  const displayValue = value === null ? "---" : value;

  return (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 flex-1">
        {Icon && <div className="text-slate-500">{Icon}</div>}
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className={`text-right font-semibold ${getStatusColor()}`}>
        {displayValue}
        {unit && <span className="text-xs ml-1">{unit}</span>}
      </div>
    </div>
  );
};

export const UPSDetailModal = ({
  isOpen,
  onClose,
  upsData,
  deviceName = "UPS Device",
  isDataRetained = false,
}: Props) => {
  const getBatteryStatus = (): "normal" | "warning" | "critical" => {
    const percent = upsData.battery.percent;
    if (percent === null) return "normal";
    if (percent <= 20) return "critical";
    if (percent <= 50) return "warning";
    return "normal";
  };

  const getLoadStatus = (): "normal" | "warning" | "critical" => {
    const percent = upsData.load.percent;
    if (percent === null) return "normal";
    if (percent >= 90) return "critical";
    if (percent >= 70) return "warning";
    return "normal";
  };

  const getStatusIcon = (status: string | number | null) => {
    if (status === null || status === undefined || status === "") {
      return <AlertCircle className="w-4 h-4" />;
    }

    const lower = String(status).toLowerCase();
    if (lower.includes("online") || lower.includes("normal")) {
      return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
    }
    if (lower.includes("offline") || lower.includes("error")) {
      return <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
    }
    return <AlertCircle className="w-4 h-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            UPS Detailed Information
          </DialogTitle>
          <DialogDescription>{deviceName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Core Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Core Status
            </h3>
            <div className="space-y-2">
              <DetailRow
                label="UPS Status"
                value={upsData.status || "Unknown"}
                icon={getStatusIcon(upsData.status)}
              />
              <DetailRow
                label="Running Time"
                value={upsData.runningTime || "---"}
                icon={<Clock className="w-4 h-4" />}
              />
              <DetailRow
                label="Communication Status"
                value={upsData.communicationStatus || "---"}
                icon={<Activity className="w-4 h-4" />}
              />
              <DetailRow
                label="Data Source"
                value={isDataRetained ? "Retain" : "Online"}
                icon={<Wifi className="w-4 h-4" />}
                status={isDataRetained ? "warning" : "normal"}
              />
            </div>
          </div>

          {/* Input Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide">
              Input (Line & Bypass)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-3">
                  Line Input
                </p>
                <DetailRow
                  label="Voltage"
                  value={upsData.line.voltage}
                  unit="V"
                  icon={<Plug className="w-4 h-4" />}
                />
                <DetailRow
                  label="Frequency"
                  value={upsData.line.frequency}
                  unit="Hz"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 px-3">
                  Bypass Input
                </p>
                <DetailRow
                  label="Voltage"
                  value={upsData.bypass.voltage}
                  unit="V"
                  icon={<Plug className="w-4 h-4" />}
                />
                <DetailRow
                  label="Frequency"
                  value={upsData.bypass.frequency}
                  unit="Hz"
                />
              </div>
            </div>
          </div>

          {/* Battery Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Battery className="w-4 h-4" />
              Battery
            </h3>
            <div className="space-y-2">
              <DetailRow
                label="Charge Level"
                value={upsData.battery.percent}
                unit="%"
                status={getBatteryStatus()}
                icon={<Battery className="w-4 h-4" />}
              />
              <DetailRow label="Voltage" value={upsData.battery.voltage} unit="V" />
              <DetailRow label="Remaining Time" value={upsData.battery.time} unit="min" />
              {upsData.battery.temperature !== null && (
                <DetailRow label="Temperature" value={upsData.battery.temperature} unit="°C" />
              )}
              {upsData.battery.current !== null && (
                <DetailRow label="Current" value={upsData.battery.current} unit="A" />
              )}
              {upsData.battery.health !== null && (
                <DetailRow label="Health (SoH)" value={upsData.battery.health} unit="%"
                  status={upsData.battery.health < 70 ? "critical" : upsData.battery.health < 85 ? "warning" : "normal"}
                />
              )}
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Power className="w-4 h-4" />
              Output
            </h3>
            <div className="space-y-2">
              <DetailRow
                label="Voltage"
                value={upsData.output.voltage}
                unit="V"
                icon={<Power className="w-4 h-4" />}
              />
              <DetailRow label="Frequency" value={upsData.output.frequency} unit="Hz" />
              <DetailRow
                label="Current"
                value={upsData.output.current}
                unit="A"
              />
            </div>
          </div>

          {/* Load Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Load
            </h3>
            <div className="space-y-2">
              <DetailRow
                label="Load Level"
                value={upsData.load.percent}
                unit="%"
                status={getLoadStatus()}
                icon={<Activity className="w-4 h-4" />}
              />
              <DetailRow
                label="Apparent Power"
                value={upsData.load.apparentPower}
                unit="kVA"
              />
              <DetailRow
                label="Active Power"
                value={upsData.load.activePower}
                unit="kW"
              />
            </div>
          </div>

          {/* Status Legend */}
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Status Indicator
            </p>
            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span>Normal / Online</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-amber-500 rounded-full" />
                <span>Warning (Battery &lt;50% or Load &gt;70%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span>Critical (Battery &lt;20% or Load &gt;90%)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
