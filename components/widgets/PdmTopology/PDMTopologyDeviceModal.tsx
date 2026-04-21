// File: components/widgets/PdmTopology/PDMTopologyDeviceModal.tsx
"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, BarChart3, Circle } from "lucide-react";

interface DeviceState {
  config: {
    id: string;
    type: string;
    label: string;
    deviceUniqId: string;
  };
  status: "ok" | "offline" | "waiting" | "stale";
  lastUpdate: Date | null;
  metrics: Record<string, any>;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedDevice: {
    type: string;
    devices: DeviceState[];
  } | null;
}

export const PDMTopologyDeviceModal = ({
  isOpen,
  onClose,
  selectedDevice,
}: Props) => {
  if (!selectedDevice) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {selectedDevice.type.toUpperCase()} Devices
          </DialogTitle>
          <DialogDescription className="text-sm mt-1">
            {selectedDevice.devices.length} Device
            {selectedDevice.devices.length > 1 ? "s" : ""} Configured
          </DialogDescription>
        </DialogHeader>

        {/* Modal Body */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {selectedDevice.devices.map((device: DeviceState, index: number) => (
              <div
                key={device.config.id}
                className={`${
                  index > 0
                    ? "pt-6 border-t border-gray-200 dark:border-slate-700"
                    : ""
                }`}
              >
                {/* Device Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {device.config.label}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      ID: {device.config.deviceUniqId}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 w-fit ${
                        device.status === "ok"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : device.status === "offline"
                            ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                      }`}
                    >
                      <Circle size={8} fill="currentColor" />
                      {device.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Device Metrics */}
                {Object.keys(device.metrics || {}).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(device.metrics).map(([key, value]) => (
                      <div
                        key={key}
                        className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-4 border border-gray-200 dark:border-slate-600"
                      >
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          {key}
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono">
                          {String(value)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-8 text-center border border-gray-200 dark:border-slate-600">
                    <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                      {device.status === "waiting" ? (
                        <>
                          <Clock size={18} />
                          <span className="italic">Waiting for data...</span>
                        </>
                      ) : (
                        <>
                          <BarChart3 size={18} />
                          <span className="italic">No metrics available</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Last Update */}
                {device.lastUpdate && (
                  <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Last update:{" "}
                    {new Date(device.lastUpdate).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-4 border-t border-gray-200 dark:border-slate-600">
          <Button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
