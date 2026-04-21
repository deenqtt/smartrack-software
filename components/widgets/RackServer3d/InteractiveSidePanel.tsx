"use client";
import React, { useRef, useEffect, useMemo } from "react";
import {
  X,
  Pin,
  Thermometer,
  Droplets,
  Zap,
  GitCommit,
  Waves,
  ChevronsRight,
  Package,
  Server,
  Database,
  Minus,
  Cpu,
} from "lucide-react";
import type { DeviceInfo } from "./RackServer3dWidget";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Helper to get an icon based on the telemetry key
const getTelemetryIcon = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes("temp"))
    return <Thermometer className="h-3 w-3 text-red-500" />;
  if (lowerKey.includes("hum"))
    return <Droplets className="h-3 w-3 text-blue-500" />;
  if (lowerKey.includes("power") || lowerKey.includes("vt"))
    return <Zap className="h-3 w-3 text-yellow-500" />;
  if (lowerKey.includes("phase"))
    return <GitCommit className="h-3 w-3 text-purple-500" />;
  if (lowerKey.includes("freq"))
    return <Waves className="h-3 w-3 text-green-500" />;
  if (lowerKey.includes("cpu"))
    return <Cpu className="h-3 w-3 text-orange-500" />;
  if (lowerKey.includes("memory") || lowerKey.includes("ram"))
    return <Database className="h-3 w-3 text-indigo-500" />;
  if (lowerKey.includes("disk"))
    return <Package className="h-3 w-3 text-green-600" />;
  return <ChevronsRight className="h-3 w-3 text-slate-400" />;
};

const SpaceUtilizationView = ({
  rackCapacity,
  allRackDevices,
}: {
  rackCapacity: number;
  allRackDevices: DeviceInfo[];
}) => {
  const { usedU, freeU, utilizationPercent } = useMemo(() => {
    const used = allRackDevices.reduce((sum, d) => sum + (d.height || 0), 0);
    const total = rackCapacity > 0 ? rackCapacity : 42;
    const free = total - used;
    const percent = total > 0 ? Math.round((used / total) * 100) : 0;
    return { usedU: used, freeU: free, utilizationPercent: percent };
  }, [allRackDevices, rackCapacity]);

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {rackCapacity}U
          </p>
          <p className="text-xs font-medium text-blue-600/70 dark:text-blue-400/70 mt-1">
            Total
          </p>
        </div>
        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {usedU}U
          </p>
          <p className="text-xs font-medium text-green-600/70 dark:text-green-400/70 mt-1">
            Used
          </p>
        </div>
        <div className="p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <p className="text-2xl font-bold text-slate-600 dark:text-slate-400">
            {freeU}U
          </p>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-500 mt-1">
            Free
          </p>
        </div>
      </div>
      <div className="text-center text-sm text-muted-foreground">
        Utilization: <span className="font-bold">{utilizationPercent}%</span>
      </div>
      <div className="pt-4 border-t">
        <h4 className="text-sm font-semibold mb-2">Installed Devices</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
          {allRackDevices.map((device) => (
            <div
              key={device.id}
              className="flex justify-between items-center text-xs p-2 rounded-md bg-muted/50"
            >
              <span>{device.name}</span>
              <span className="font-mono text-blue-500">{device.height}U</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const InteractiveSidePanel = ({
  isOpen,
  onClose,
  title,
  devices,
  onHoverDevice,
  hoveredDeviceId,
  viewMode,
  rackCapacity = 42,
  allRackDevices = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  devices: DeviceInfo[];
  onHoverDevice: (deviceId: string | null) => void;
  hoveredDeviceId: string | null;
  viewMode: "normal" | "temp" | "power" | "cooling" | "space" | "serverDetail";
  rackCapacity?: number;
  allRackDevices?: DeviceInfo[];
}) => {
  const deviceListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hoveredDeviceId && viewMode !== "space") {
      const el = deviceListRef.current?.querySelector(
        `[data-device-id="${hoveredDeviceId}"]`,
      );
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [hoveredDeviceId, viewMode]);

  const renderContent = () => {
    if (viewMode === "space") {
      return (
        <SpaceUtilizationView
          rackCapacity={rackCapacity}
          allRackDevices={allRackDevices}
        />
      );
    }

    if (devices.length === 0) {
      return (
        <div className="text-center py-10">
          <p className="text-sm text-slate-400">
            No devices configured for this view.
          </p>
        </div>
      );
    }

    return (
      <TooltipProvider>
        {Object.values(
          devices.reduce(
            (acc, device) => {
              if (!acc[device.deviceId]) {
                acc[device.deviceId] = {
                  ...device,
                  telemetry: {},
                  allKeys: new Set<string>(),
                  hasOnlineStatus: false,
                  hasErrorStatus: false,
                  allRetained: true,
                };
              }
              if (device.telemetry) {
                acc[device.deviceId].telemetry = {
                  ...acc[device.deviceId].telemetry,
                  ...device.telemetry,
                };
              }
              if (device.keys) {
                device.keys.forEach((key) =>
                  acc[device.deviceId].allKeys.add(key),
                );
              }
              if (device.connectivity === "online")
                acc[device.deviceId].hasOnlineStatus = true;
              if (device.connectivity === "error")
                acc[device.deviceId].hasErrorStatus = true;
              if (!device.isRetain) acc[device.deviceId].allRetained = false;
              return acc;
            },
            {} as {
              [key: string]: DeviceInfo & {
                allKeys: Set<string>;
                hasOnlineStatus: boolean;
                hasErrorStatus: boolean;
                allRetained: boolean;
              };
            },
          ),
        ).map((groupedDevice) => {
          let displayConnectivity = "offline";
          if (groupedDevice.hasErrorStatus) displayConnectivity = "error";
          else if (groupedDevice.hasOnlineStatus)
            displayConnectivity = "online";

          return (
            <div
              key={groupedDevice.deviceId}
              data-device-id={groupedDevice.deviceId}
              onMouseEnter={() => onHoverDevice(groupedDevice.deviceId)}
              onMouseLeave={() => onHoverDevice(null)}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer ${
                hoveredDeviceId === groupedDevice.deviceId
                  ? "bg-blue-50 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 shadow-md"
                  : "bg-white/50 dark:bg-slate-800/50 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
              }`}
            >
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                  {groupedDevice.name}
                </p>
                <div className="flex items-center gap-2">
                  {groupedDevice.allRetained && (
                    <Tooltip>
                      <TooltipTrigger>
                        <Pin className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>This is retained data from the broker.</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      groupedDevice.allRetained
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : displayConnectivity === "online"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : displayConnectivity === "error"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                    }`}
                  >
                    {groupedDevice.allRetained
                      ? "RETAIN"
                      : displayConnectivity || "offline"}
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                {[...groupedDevice.allKeys].length > 0 ? (
                  <div className="space-y-2">
                    {[...groupedDevice.allKeys].map((key) => (
                      <div
                        key={key}
                        className="flex items-start justify-between text-xs"
                      >
                        <div className="flex items-center gap-1.5 flex-grow pr-2">
                          {getTelemetryIcon(key)}
                          <span className="text-slate-500 dark:text-slate-400 capitalize whitespace-normal break-words">
                            {key.replace(/_/g, " ")}:
                          </span>
                        </div>
                        <span className="font-medium text-slate-800 dark:text-slate-100 flex-shrink-0 text-right">
                          {groupedDevice.telemetry &&
                          groupedDevice.telemetry[key] !== undefined
                            ? String(groupedDevice.telemetry[key])
                            : "N/A"}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-center text-slate-400 dark:text-slate-500 py-1">
                    - No Data -
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </TooltipProvider>
    );
  };

  return (
    <div
      className={`absolute top-0 right-0 h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-l border-slate-200 dark:border-slate-700 shadow-2xl transition-transform duration-300 ease-in-out z-20 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
      style={{ width: "320px" }}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
        <h4 className="font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h4>
        <button
          onClick={onClose}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-slate-500" />
        </button>
      </div>
      <div
        ref={deviceListRef}
        className="p-2 space-y-2 overflow-y-auto h-[calc(100%-65px)] custom-scrollbar"
      >
        {renderContent()}
      </div>
    </div>
  );
};
