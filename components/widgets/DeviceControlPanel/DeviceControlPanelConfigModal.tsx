// File: UI/DeviceControlPanel/DeviceControlConfigModal.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
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
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Loader2 } from "lucide-react";

// Tipe data sesuai dengan output get_controls dari DeviceControl.py
interface ControlParam {
  var_name: string;
  description: string;
  data_type: string;
  register_oid: string | number;
  valid_values: any[]; // Enum values (jika ada)
  valid_range?: { min?: number; max?: number }; // Range values
  current_value?: any; // Current value dari device
  readable_value?: string | number; // Human readable value dengan multiplier
  multiplier?: number;
  read_error?: string; // Error saat read value
}

interface DeviceProfile {
  device_name: string;
  manufacturer: string;
  part_number: string;
  protocol: string;
  controls: ControlParam[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: {
    widgetTitle: string;
    selectedDeviceName: string;
    selectedControlVar: string; // var_name
    controlType: "switch" | "input" | "dropdown"; // UI hint
    targetValue?: string; // Optional (misal untuk tombol preset)
  };
}

export const DeviceControlPanelConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { publish, subscribe, unsubscribe, isReady } = useMqttServer();

  // State Form
  const [widgetTitle, setWidgetTitle] = useState(
    initialConfig?.widgetTitle || "",
  );
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(
    initialConfig?.selectedDeviceName || null,
  );
  const [selectedControlVar, setSelectedControlVar] = useState<string | null>(
    initialConfig?.selectedControlVar || null,
  );

  // State Data
  const [availableDevices, setAvailableDevices] = useState<DeviceProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const responseTopicRef = useRef<string | null>(null);

  // Helper: Ambil device yang sedang dipilih
  const currentDevice = availableDevices.find(
    (d) => d.device_name === selectedDeviceName,
  );
  // Helper: Ambil control param yang sedang dipilih
  const currentControl = currentDevice?.controls.find(
    (c) => c.var_name === selectedControlVar,
  );

  // Reset/Init saat modal dibuka
  useEffect(() => {
    if (isOpen && isReady) {
      if (initialConfig) {
        setWidgetTitle(initialConfig.widgetTitle);
        setSelectedDeviceName(initialConfig.selectedDeviceName);
        setSelectedControlVar(initialConfig.selectedControlVar);
      } else {
        setWidgetTitle("");
        setSelectedDeviceName(null);
        setSelectedControlVar(null);
      }

      fetchControls();
    }
  }, [isOpen, isReady]);

  const fetchControls = () => {
    setIsLoading(true);
    setAvailableDevices([]);

    const commandTopic = "command_device_control";
    const responseTopic = "response_device_control";
    const payload = { command: "get_controls" };

    const handleResponse = (topic: string, message: string, serverId: string, retained?: boolean) => {
      try {
        const data = JSON.parse(message);
        if (data.status === "success" && Array.isArray(data.devices)) {
          setAvailableDevices(data.devices);
        } else {
          showToast.error("Format respon tidak valid", "Error");
        }
      } catch (e) {
        console.error("Parse error:", e);
      } finally {
        setIsLoading(false);
        unsubscribe(responseTopic, handleResponse);
      }
    };

    subscribe(responseTopic, handleResponse);
    responseTopicRef.current = responseTopic;
    publish(commandTopic, JSON.stringify(payload));

    // Timeout safety
    setTimeout(() => {
      if (isLoading) setIsLoading(false);
    }, 5000);
  };

  const handleSave = () => {
    if (
      !widgetTitle ||
      !selectedDeviceName ||
      !selectedControlVar ||
      !currentControl
    ) {
      showToast.warning("Mohon lengkapi semua field", "Validasi");
      return;
    }

    // Tentukan tipe UI berdasarkan karakteristik data
    let uiType = "input"; // Default: Input Box
    if (
      currentControl.data_type === "INTEGER" ||
      currentControl.data_type === "UINT16"
    ) {
      // Jika ada values enum -> Dropdown
      if (currentControl.valid_values && currentControl.valid_values.length > 0) {
        uiType = "dropdown";
      }
      // Heuristic: Jika range nilai kecil (0-1) -> Switch
      // (Ini bisa ditingkatkan nanti dengan metadata tambahan dari backend)
      else if (
        currentControl.description?.toLowerCase().includes("switch") ||
        currentControl.description?.toLowerCase().includes("enable")
      ) {
        uiType = "switch";
      }
    }

    onSave({
      widgetTitle,
      selectedDeviceName,
      selectedControlVar,
      controlType: uiType,
      // Metadata tambahan untuk membantu widget tanpa perlu fetch ulang
      meta: {
        manufacturer: currentDevice?.manufacturer,
        part_number: currentDevice?.part_number,
        protocol: currentDevice?.protocol,
        description: currentControl.description,
        data_type: currentControl.data_type,
        values: currentControl.valid_values || [],
        valid_range: currentControl.valid_range,
        multiplier: currentControl.multiplier,
      },
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Konfigurasi Modbus RTU Control</DialogTitle>
          <DialogDescription>
            Pilih device Modbus RTU dan parameter yang ingin dikontrol.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Widget Title */}
          <div className="grid gap-2">
            <Label>Judul Widget</Label>
            <Input
              value={widgetTitle}
              onChange={(e) => setWidgetTitle(e.target.value)}
              placeholder="Misal: AC Server Suhu"
            />
          </div>

          {/* Device Selection */}
          <div className="grid gap-2">
            <Label>Pilih Device</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Mencari device...
              </div>
            ) : (
              <Select
                value={selectedDeviceName || ""}
                onValueChange={(val) => {
                  setSelectedDeviceName(val);
                  setSelectedControlVar(null); // Reset parameter saat device ganti
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Device..." />
                </SelectTrigger>
                <SelectContent>
                  {availableDevices.map((dev) => (
                    <SelectItem key={dev.device_name} value={dev.device_name}>
                      {dev.device_name} ({dev.protocol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Parameter Selection */}
          <div className="grid gap-2">
            <Label>Parameter Kontrol</Label>
            <Select
              value={selectedControlVar || ""}
              onValueChange={setSelectedControlVar}
              disabled={!selectedDeviceName}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={selectedDeviceName ? "Pilih Parameter..." : "-"}
                />
              </SelectTrigger>
              <SelectContent>
                {currentDevice?.controls.map((ctrl) => (
                  <SelectItem key={ctrl.var_name} value={ctrl.var_name}>
                    <div className="flex flex-col">
                      <span className="font-medium">{ctrl.var_name}</span>
                      {ctrl.description && (
                        <span className="text-xs text-muted-foreground">
                          {ctrl.description}
                        </span>
                      )}
                      {ctrl.current_value !== null && ctrl.current_value !== undefined && (
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                          Current: {ctrl.current_value}
                          {ctrl.readable_value && ` (${ctrl.readable_value})`}
                        </span>
                      )}
                      {ctrl.read_error && (
                        <span className="text-xs text-red-500">
                          Error: {ctrl.read_error}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentControl && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold">Type:</span> {currentControl.data_type}
                  {currentControl.valid_values?.length > 0 && (
                    <span> | <span className="font-semibold">Options:</span> {currentControl.valid_values.join(", ")}</span>
                  )}
                  {currentControl.valid_range && (
                    <span> | <span className="font-semibold">Range:</span> {currentControl.valid_range.min ?? "—"} - {currentControl.valid_range.max ?? "—"}</span>
                  )}
                </p>
                {currentControl.current_value !== null && currentControl.current_value !== undefined && (
                  <p className="text-xs">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      Current Value: {currentControl.current_value}
                    </span>
                    {currentControl.readable_value && (
                      <span className="text-muted-foreground ml-1">
                        ({currentControl.readable_value})
                      </span>
                    )}
                  </p>
                )}
                {currentControl.read_error && (
                  <p className="text-xs text-red-500">
                    ⚠️ {currentControl.read_error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || !selectedDeviceName || !selectedControlVar}
          >
            Simpan Widget
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
