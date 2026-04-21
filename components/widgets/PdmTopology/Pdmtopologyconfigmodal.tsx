// File: components/widgets/PDMTopology/PDMTopologyConfigModal.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { PDMTopologyWidget } from "./PDMTopologyWidget";
import { Plus, Trash2, AlertCircle, Search, CheckCircle2, XCircle, Zap } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceConfig {
  id: string;
  deviceUniqId: string;
  label: string;
  enabled: boolean;
  selectedKey?: string; // MQTT key untuk device ini
}

interface PDMConfig {
  // Widget Info
  widgetName: string;
  location: string;

  // Devices - using deviceUniqId instead of deviceId
  devices: {
    pdm: {
      enabled: boolean;
      deviceUniqId: string;
      label: string;
    };
    ups: DeviceConfig[];
    pdu: DeviceConfig[];
    ac: DeviceConfig[];
  };

  // Settings
  refreshRate: number;

  // Thresholds
  thresholds: {
    voltage: { min: number; max: number };
    temperature: { max: number };
    battery: { min: number };
  };

  // Appearance
  appearance: {
    size: "small" | "medium" | "large";
    theme: "light" | "dark";
    showLabels: boolean;
    showLines: boolean;
    showStatus: boolean;
  };
}

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: PDMConfig) => void;
  initialConfig?: PDMConfig;
}

export const PDMTopologyConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [isEditMode, setIsEditMode] = useState(false);
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Widget Info
  const [widgetName, setWidgetName] = useState("");
  const [location, setLocation] = useState("");

  // PDM Device
  const [pdmEnabled, setPdmEnabled] = useState(true);
  const [pdmDeviceUniqId, setPdmDeviceUniqId] = useState<string | null>(null);
  const [pdmLabel, setPdmLabel] = useState("Main Distribution");
  const [pdmDeviceSearchOpen, setPdmDeviceSearchOpen] = useState(false);

  // UPS Devices
  const [upsDevices, setUpsDevices] = useState<DeviceConfig[]>([]);
  const [upsDeviceSearchOpen, setUpsDeviceSearchOpen] = useState<{ [key: string]: boolean; }>({});

  // PDU Devices
  const [pduDevices, setPduDevices] = useState<DeviceConfig[]>([]);
  const [pduDeviceSearchOpen, setPduDeviceSearchOpen] = useState<{ [key: string]: boolean; }>({});

  // A/C Devices
  const [acDevices, setAcDevices] = useState<DeviceConfig[]>([]);
  const [acDeviceSearchOpen, setAcDeviceSearchOpen] = useState<{ [key: string]: boolean; }>({});

  // Settings
  const [refreshRate, setRefreshRate] = useState(3);

  // Thresholds
  const [voltageMin, setVoltageMin] = useState(220);
  const [voltageMax, setVoltageMax] = useState(240);
  const [tempMax, setTempMax] = useState(28);
  const [batteryMin, setBatteryMin] = useState(20);

  // Appearance
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [showLabels, setShowLabels] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showStatus, setShowStatus] = useState(true);

  // Reset form to default state
  const resetForm = () => {
    setWidgetName("");
    setLocation("");
    setPdmEnabled(true);
    setPdmDeviceUniqId(null);
    setPdmLabel("Main Distribution");
    setUpsDevices([]);
    setPduDevices([]);
    setAcDevices([]);
    setRefreshRate(3);
    setVoltageMin(220);
    setVoltageMax(240);
    setTempMax(28);
    setBatteryMin(20);
    setSize("medium");
    setTheme("light");
    setShowLabels(true);
    setShowLines(true);
    setShowStatus(true);
  };
  
  // Fetch devices and load initial config
  useEffect(() => {
    if (!isOpen) return;

    const fetchDevices = async () => {
      setIsLoadingDevices(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
        if (!response.ok) throw new Error("Failed to fetch devices");
        setDevices(await response.json());
      } catch (error: any) {
        showToast.error(`Failed to load devices: ${error.message}`);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    fetchDevices();

    if (initialConfig) {
      setIsEditMode(true);
      const {
        widgetName, location, devices: devConfig, refreshRate,
        thresholds, appearance
      } = initialConfig;

      setWidgetName(widgetName || "");
      setLocation(location || "");
      
      if (devConfig?.pdm) {
        setPdmEnabled(devConfig.pdm.enabled);
        setPdmDeviceUniqId(devConfig.pdm.deviceUniqId || null);
        setPdmLabel(devConfig.pdm.label || "Main Distribution");
      } else {
        setPdmEnabled(true);
        setPdmDeviceUniqId(null);
        setPdmLabel("Main Distribution");
      }

      setUpsDevices(devConfig?.ups || []);
      setPduDevices(devConfig?.pdu || []);
      setAcDevices(devConfig?.ac || []);

      setRefreshRate(refreshRate || 3);
      setVoltageMin(thresholds?.voltage?.min || 220);
      setVoltageMax(thresholds?.voltage?.max || 240);
      setTempMax(thresholds?.temperature?.max || 28);
      setBatteryMin(thresholds?.battery?.min || 20);
      setSize(appearance?.size || "medium");
      setTheme(appearance?.theme || "light");
      setShowLabels(appearance?.showLabels ?? true);
      setShowLines(appearance?.showLines ?? true);
      setShowStatus(appearance?.showStatus ?? true);

    } else {
      setIsEditMode(false);
      resetForm();
    }
  }, [isOpen, initialConfig]);

  // Add device handlers
  const addUpsDevice = () => {
    const newId = `ups-${Date.now()}`;
    setUpsDevices([...upsDevices, { id: newId, deviceUniqId: "", label: `UPS ${upsDevices.length + 1}`, enabled: true }]);
  };

  const addPduDevice = () => {
    const newId = `pdu-${Date.now()}`;
    setPduDevices([...pduDevices, { id: newId, deviceUniqId: "", label: `PDU ${pduDevices.length + 1}`, enabled: true }]);
  };

  const addAcDevice = () => {
    const newId = `ac-${Date.now()}`;
    setAcDevices([...acDevices, { id: newId, deviceUniqId: "", label: `A/C ${acDevices.length + 1}`, enabled: true }]);
  };

  // Remove device handlers
  const removeUpsDevice = (id: string) => setUpsDevices(upsDevices.filter(d => d.id !== id));
  const removePduDevice = (id: string) => setPduDevices(pduDevices.filter(d => d.id !== id));
  const removeAcDevice = (id: string) => setAcDevices(acDevices.filter(d => d.id !== id));
  
  // Generic update handler for sub-devices (UPS, PDU, AC)
  const createDeviceUpdater = (setter: React.Dispatch<React.SetStateAction<DeviceConfig[]>>) => 
    (id: string, field: keyof Omit<DeviceConfig, 'selectedKey'>, value: any) => {
      setter(devices => devices.map(d => {
        if (d.id === id) {
            return { ...d, [field]: value };
        }
        return d;
    }));
  };

  const updateUpsDevice = createDeviceUpdater(setUpsDevices);
  const updatePduDevice = createDeviceUpdater(setPduDevices);
  const updateAcDevice = createDeviceUpdater(setAcDevices);

  const handleSave = () => {
    // Validation
    if (!widgetName.trim()) {
      showToast.error("Please enter a widget name");
      return;
    }

    if (pdmEnabled && !pdmDeviceUniqId) {
      showToast.error("Please select a device for the Main PDM");
      return;
    }
    
    // Create final config object
    const config: PDMConfig = {
      widgetName: widgetName.trim(),
      location: location.trim(),
      devices: {
        pdm: {
          enabled: pdmEnabled,
          deviceUniqId: pdmDeviceUniqId || "",
          label: pdmLabel.trim(),
        },
        ups: upsDevices.filter(d => d.deviceUniqId).map(d => ({...d, label: d.label.trim()})),
        pdu: pduDevices.filter(d => d.deviceUniqId).map(d => ({...d, label: d.label.trim()})),
        ac: acDevices.filter(d => d.deviceUniqId).map(d => ({...d, label: d.label.trim()})),
      },
      refreshRate,
      thresholds: {
        voltage: { min: voltageMin, max: voltageMax },
        temperature: { max: tempMax },
        battery: { min: batteryMin },
      },
      appearance: { size, theme, showLabels, showLines, showStatus },
    };

    onSave(config);
    showToast.success(isEditMode ? "Widget updated successfully" : "Widget created successfully");
    onClose();
  };

  const previewConfig: PDMConfig = {
    widgetName: widgetName.trim() || "PDM Topology Preview",
    location: location.trim(),
    devices: {
      pdm: {
        enabled: pdmEnabled,
        deviceUniqId: pdmDeviceUniqId || "",
        label: pdmLabel.trim() || "Main Distribution",
      },
      ups: upsDevices.map((d) => ({ ...d, label: d.label.trim() })),
      pdu: pduDevices.map((d) => ({ ...d, label: d.label.trim() })),
      ac: acDevices.map((d) => ({ ...d, label: d.label.trim() })),
    },
    refreshRate,
    thresholds: {
      voltage: { min: voltageMin, max: voltageMax },
      temperature: { max: tempMax },
      battery: { min: batteryMin },
    },
    appearance: { size, theme, showLabels, showLines, showStatus },
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Edit PDM Widget" : "Configure PDM Widget"}
          </DialogTitle>
          <DialogDescription>
            Configure your Power Distribution Management monitoring widget
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
          <div>
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="devices">Devices</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
              </TabsList>

          {/* BASIC TAB */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="widgetName">
                  Widget Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="widgetName"
                  value={widgetName}
                  onChange={(e) => setWidgetName(e.target.value)}
                  placeholder="e.g., PDM - Server Room A"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="location">Location / Site</Label>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Jakarta Data Center"
                />
              </div>

              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900 dark:text-blue-100">
                    <p className="font-semibold mb-1">Getting Started</p>
                    <p>
                      This widget monitors your power distribution
                      infrastructure. Start by giving it a descriptive name and
                      location to easily identify it in your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* DEVICES TAB */}
          <TabsContent value="devices" className="space-y-6 mt-4">
            {/* PDM Device */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Main PDM</Label>
                <Switch checked={pdmEnabled} onCheckedChange={setPdmEnabled} />
              </div>
              {pdmEnabled && (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="pdmDevice">Device</Label>
                      {isLoadingDevices ? (
                        <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded px-3 flex items-center text-sm text-slate-500">Loading devices...</div>
                      ) : (
                        <Popover open={pdmDeviceSearchOpen} onOpenChange={setPdmDeviceSearchOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between w-full">
                              {pdmDeviceUniqId ? devices.find((d) => d.uniqId === pdmDeviceUniqId)?.name || "Select device..." : "Select device..."}
                              <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search devices..." />
                              <CommandEmpty>No device found.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {devices.map((device) => (
                                    <CommandItem
                                      key={device.uniqId}
                                      value={device.uniqId}
                                      onSelect={(currentValue) => {
                                        const newUniqId = currentValue === pdmDeviceUniqId ? null : currentValue;
                                        setPdmDeviceUniqId(newUniqId);
                                        setPdmDeviceSearchOpen(false);
                                      }}
                                    >
                                      <CheckCircle2 className={`mr-2 h-4 w-4 ${pdmDeviceUniqId === device.uniqId ? "opacity-100" : "opacity-0"}`} />
                                      {device.name}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pdmLabel">Label</Label>
                      <Input id="pdmLabel" value={pdmLabel} onChange={(e) => setPdmLabel(e.target.value)} placeholder="Main Distribution" />
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* UPS Devices */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">UPS Units</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addUpsDevice}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add UPS
                </Button>
              </div>
              <div className="space-y-3">
                {upsDevices.map((device) => (
                  <div key={device.id} className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted/50 rounded-md border">
                    <Switch
                      className="mt-1"
                      checked={device.enabled}
                      onCheckedChange={(checked) =>
                        updateUpsDevice(device.id, "enabled", checked)
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Popover open={upsDeviceSearchOpen[device.id]} onOpenChange={(open) => setUpsDeviceSearchOpen({...upsDeviceSearchOpen, [device.id]: open})}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between w-full" size="sm">
                              {device.deviceUniqId ? devices.find((d) => d.uniqId === device.deviceUniqId)?.name || "Select..." : "Select..."}
                              <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search..." />
                              <CommandEmpty>No device found.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {devices.map((dev) => (
                                    <CommandItem
                                      key={dev.uniqId}
                                      value={dev.uniqId}
                                      onSelect={(currentValue) => {
                                        updateUpsDevice(device.id, "deviceUniqId", currentValue);
                                        setUpsDeviceSearchOpen({...upsDeviceSearchOpen, [device.id]: false});
                                      }}
                                    >
                                      <CheckCircle2 className={`mr-2 h-4 w-4 ${device.deviceUniqId === dev.uniqId ? "opacity-100" : "opacity-0"}`} />
                                      {dev.name}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={device.label}
                          onChange={(e) => updateUpsDevice(device.id, "label", e.target.value)}
                          placeholder="Label"
                          size={27}
                        />
                      </div>

                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeUpsDevice(device.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* PDU Devices */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">PDU Units</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPduDevice}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add PDU
                </Button>
              </div>
              <div className="space-y-3">
                {pduDevices.map((device) => (
                  <div key={device.id} className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted/50 rounded-md border">
                    <Switch
                      className="mt-1"
                      checked={device.enabled}
                      onCheckedChange={(checked) =>
                        updatePduDevice(device.id, "enabled", checked)
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Popover open={pduDeviceSearchOpen[device.id]} onOpenChange={(open) => setPduDeviceSearchOpen({...pduDeviceSearchOpen, [device.id]: open})}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between w-full" size="sm">
                              {device.deviceUniqId ? devices.find((d) => d.uniqId === device.deviceUniqId)?.name || "Select..." : "Select..."}
                              <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search..." />
                              <CommandEmpty>No device found.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {devices.map((dev) => (
                                    <CommandItem
                                      key={dev.uniqId}
                                      value={dev.uniqId}
                                      onSelect={(currentValue) => {
                                        updatePduDevice(device.id, "deviceUniqId", currentValue);
                                        setPduDeviceSearchOpen({...pduDeviceSearchOpen, [device.id]: false});
                                      }}
                                    >
                                      <CheckCircle2 className={`mr-2 h-4 w-4 ${device.deviceUniqId === dev.uniqId ? "opacity-100" : "opacity-0"}`} />
                                      {dev.name}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={device.label}
                          onChange={(e) =>
                            updatePduDevice(device.id, "label", e.target.value)
                          }
                          placeholder="Label"
                          size={27}
                        />
                      </div>

                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removePduDevice(device.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* A/C Devices */}
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">A/C Units</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAcDevice}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add A/C
                </Button>
              </div>
              <div className="space-y-3">
                {acDevices.map((device) => (
                  <div key={device.id} className="flex items-start gap-3 p-3 bg-muted/50 dark:bg-muted/50 rounded-md border">
                    <Switch
                      className="mt-1"
                      checked={device.enabled}
                      onCheckedChange={(checked) =>
                        updateAcDevice(device.id, "enabled", checked)
                      }
                    />
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <Popover open={acDeviceSearchOpen[device.id]} onOpenChange={(open) => setAcDeviceSearchOpen({...acDeviceSearchOpen, [device.id]: open})}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="justify-between w-full" size="sm">
                              {device.deviceUniqId ? devices.find((d) => d.uniqId === device.deviceUniqId)?.name || "Select..." : "Select..."}
                              <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                            <Command>
                              <CommandInput placeholder="Search..." />
                              <CommandEmpty>No device found.</CommandEmpty>
                              <CommandGroup>
                                <CommandList>
                                  {devices.map((dev) => (
                                    <CommandItem
                                      key={dev.uniqId}
                                      value={dev.uniqId}
                                      onSelect={(currentValue) => {
                                        updateAcDevice(device.id, "deviceUniqId", currentValue);
                                        setAcDeviceSearchOpen({...acDeviceSearchOpen, [device.id]: false});
                                      }}
                                    >
                                      <CheckCircle2 className={`mr-2 h-4 w-4 ${device.deviceUniqId === dev.uniqId ? "opacity-100" : "opacity-0"}`} />
                                      {dev.name}
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Input
                          value={device.label}
                          onChange={(e) =>
                            updateAcDevice(device.id, "label", e.target.value)
                          }
                          placeholder="Label"
                          size={27}
                        />
                      </div>

                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeAcDevice(device.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="refreshRate">Data Refresh Rate (seconds)</Label>
                <Select
                  value={String(refreshRate)}
                  onValueChange={(v) => setRefreshRate(Number(v))}
                >
                  <SelectTrigger id="refreshRate">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Real-time (1 second)</SelectItem>
                    <SelectItem value="3">Every 3 seconds</SelectItem>
                    <SelectItem value="5">Every 5 seconds</SelectItem>
                    <SelectItem value="10">Every 10 seconds</SelectItem>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold">
                  Alert Thresholds
                </Label>
                <div className="grid gap-4 mt-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="voltageMin">Min Voltage (V)</Label>
                      <Input
                        id="voltageMin"
                        type="number"
                        value={voltageMin}
                        onChange={(e) => setVoltageMin(Number(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="voltageMax">Max Voltage (V)</Label>
                      <Input
                        id="voltageMax"
                        type="number"
                        value={voltageMax}
                        onChange={(e) => setVoltageMax(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="tempMax">Max Temperature (°C)</Label>
                      <Input
                        id="tempMax"
                        type="number"
                        value={tempMax}
                        onChange={(e) => setTempMax(Number(e.target.value))}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="batteryMin">Min Battery Level (%)</Label>
                      <Input
                        id="batteryMin"
                        type="number"
                        value={batteryMin}
                        onChange={(e) => setBatteryMin(Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* APPEARANCE TAB */}
          <TabsContent value="appearance" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="size">Widget Size</Label>
                <Select value={size} onValueChange={(v: any) => setSize(v)}>
                  <SelectTrigger id="size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small (600x400)</SelectItem>
                    <SelectItem value="medium">Medium (800x600)</SelectItem>
                    <SelectItem value="large">Large (1200x800)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="theme">Theme</Label>
                <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                  <SelectTrigger id="theme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4">
                <Label className="text-base font-semibold mb-3 block">
                  Display Options
                </Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLabels" className="cursor-pointer">
                      Show Device Labels
                    </Label>
                    <Switch
                      id="showLabels"
                      checked={showLabels}
                      onCheckedChange={setShowLabels}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showLines" className="cursor-pointer">
                      Show Connection Lines
                    </Label>
                    <Switch
                      id="showLines"
                      checked={showLines}
                      onCheckedChange={setShowLines}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="showStatus" className="cursor-pointer">
                      Show Status Indicators
                    </Label>
                    <Switch
                      id="showStatus"
                      checked={showStatus}
                      onCheckedChange={setShowStatus}
                    />
                  </div>
                </div>
              </div>
            </div>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Live Preview</p>
              <p className="text-xs text-muted-foreground">
                Topologi akan berubah langsung saat device, label, dan pengaturan tampilan Anda ubah.
              </p>
            </div>
            <div className="h-[380px] rounded-xl border border-border/60 bg-muted/20 p-3 lg:sticky lg:top-0">
              <PDMTopologyWidget config={previewConfig} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {isEditMode ? "Update Widget" : "Save Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
