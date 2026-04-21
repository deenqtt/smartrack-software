"use client";

import React, { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Server, Wind, Droplets, Activity } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export interface EnvironmentKeyMapping {
  tempFront: string;
  humFront: string;
  tempBack: string;
  humBack: string;
  waterLeak: string;
  vibX: string;
  vibY: string;
  vibZ: string;
}

export interface EnvironmentMonitorConfig {
  customName: string;
  deviceUniqId: string;
  keyMapping?: EnvironmentKeyMapping;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: EnvironmentMonitorConfig) => void;
  initialConfig?: EnvironmentMonitorConfig;
}

export const EnvironmentMonitorConfigModal = ({ isOpen, onClose, onSave, initialConfig }: Props) => {
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);

  const [customName, setCustomName] = useState(initialConfig?.customName || "Environment Monitor");
  const [deviceUniqId, setDeviceUniqId] = useState(initialConfig?.deviceUniqId || "");
  
  const [keyMapping, setKeyMapping] = useState<EnvironmentKeyMapping>({
    tempFront: initialConfig?.keyMapping?.tempFront || "temp_front",
    humFront: initialConfig?.keyMapping?.humFront || "hum_front",
    tempBack: initialConfig?.keyMapping?.tempBack || "temp_back",
    humBack: initialConfig?.keyMapping?.humBack || "hum_back",
    waterLeak: initialConfig?.keyMapping?.waterLeak || "water_leak",
    vibX: initialConfig?.keyMapping?.vibX || "vib_x",
    vibY: initialConfig?.keyMapping?.vibY || "vib_y",
    vibZ: initialConfig?.keyMapping?.vibZ || "vib_z",
  });

  useEffect(() => {
    const fetchDevices = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/devices/external");
        if (res.ok) {
          const data = await res.json();
          setDevices(data);
        }
      } catch (err) {
        console.error("Failed to load devices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDevices();
  }, []);

  const handleSave = () => {
    onSave({
      customName,
      deviceUniqId,
      keyMapping,
    });
    onClose();
  };

  const updateMapping = (field: keyof EnvironmentKeyMapping, val: string) => {
    setKeyMapping(prev => ({ ...prev, [field]: val }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-600" />
            Environment Sensor Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your environment monitor and map MQTT payload keys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customName">Widget Title</Label>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900"
              placeholder="e.g. Rack 1 Environment"
            />
          </div>

          <div className="grid gap-2">
            <Label>Target Device (Controller)</Label>
            {loading ? (
              <div className="h-10 flex items-center px-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900">
                <Loader2 className="w-4 h-4 animate-spin text-slate-500 mr-2" />
                <span className="text-sm text-slate-500">Loading devices...</span>
              </div>
            ) : (
              <Select value={deviceUniqId} onValueChange={setDeviceUniqId}>
                <SelectTrigger className="bg-slate-50 dark:bg-slate-900">
                  <SelectValue placeholder="Select an environment controller" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((d) => (
                    <SelectItem key={d.deviceId || d.id} value={d.deviceId || d.id}>
                      {d.name} ({d.deviceId || d.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Payload Key Mapping</h4>
        <p className="text-xs text-slate-500 mb-4">Map the JSON keys from your MQTT payload to the corresponding sensor values.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Temperature & Humidity */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-semibold text-blue-500 flex items-center gap-1"><Wind className="w-3 h-3" /> Climate</h5>
            <div className="grid gap-2">
              <Label className="text-xs">Temp Front Key</Label>
              <Input value={keyMapping.tempFront} onChange={(e) => updateMapping('tempFront', e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Hum Front Key</Label>
              <Input value={keyMapping.humFront} onChange={(e) => updateMapping('humFront', e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid gap-2 mt-2">
              <Label className="text-xs">Temp Back Key</Label>
              <Input value={keyMapping.tempBack} onChange={(e) => updateMapping('tempBack', e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Hum Back Key</Label>
              <Input value={keyMapping.humBack} onChange={(e) => updateMapping('humBack', e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          {/* Environment Alerts */}
          <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-800">
            <h5 className="text-xs font-semibold text-rose-500 flex items-center gap-1"><Droplets className="w-3 h-3" /> Safety</h5>
            <div className="grid gap-2">
              <Label className="text-xs">Water Leak Key (Boolean)</Label>
              <Input value={keyMapping.waterLeak} onChange={(e) => updateMapping('waterLeak', e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            
            <h5 className="text-xs font-semibold text-amber-500 flex items-center gap-1 mt-4"><Activity className="w-3 h-3" /> Vibration / Tilt</h5>
            <div className="grid gap-2">
              <Label className="text-xs">X-Axis Key</Label>
              <Input value={keyMapping.vibX} onChange={(e) => updateMapping('vibX', e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Y-Axis Key</Label>
              <Input value={keyMapping.vibY} onChange={(e) => updateMapping('vibY', e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Z-Axis Key</Label>
              <Input value={keyMapping.vibZ} onChange={(e) => updateMapping('vibZ', e.target.value)} className="h-8 text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!deviceUniqId}>Save Widget</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
