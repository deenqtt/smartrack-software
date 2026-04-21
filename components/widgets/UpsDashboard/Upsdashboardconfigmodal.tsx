// File: components/widgets/UPSDashboard/UPSDashboardConfigModal.tsx
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
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { UPSDashboardWidget } from "./Upsdashboardwidget";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  Zap,
  Battery,
  Activity,
  Plug,
  Wind,
  Cpu,
  ChevronDown,
  X,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

// Each section has its own device + key mapping
interface SectionConfig {
  deviceUniqId: string;
  keyMapping: Record<string, string>;
}

export interface UPSDashboardConfig {
  customName: string;
  bypass: SectionConfig;
  line: SectionConfig;
  battery: SectionConfig;
  output: SectionConfig;
  load: SectionConfig;
  status: SectionConfig;
}

const DEFAULT_SECTION: SectionConfig = { deviceUniqId: "", keyMapping: {} };

const SECTIONS = [
  {
    key: "status" as const,
    label: "Status & Running Time",
    description: "Center circle — operational status and uptime",
    icon: <Cpu className="w-4 h-4 text-amber-500" />,
    color: "amber",
    fields: [
      { key: "status", label: "UPS Status", description: "e.g. Online Normal / On Battery" },
      { key: "runningTime", label: "Running Time", description: "Uptime duration" },
      { key: "communicationStatus", label: "Comm. Status", description: "Communication state" },
    ],
  },
  {
    key: "bypass" as const,
    label: "Bypass",
    description: "Bypass input voltage & frequency",
    icon: <Activity className="w-4 h-4 text-blue-500" />,
    color: "blue",
    fields: [
      { key: "voltage", label: "Voltage", description: "Bypass voltage (V)" },
      { key: "frequency", label: "Frequency", description: "Bypass frequency (Hz)" },
    ],
  },
  {
    key: "line" as const,
    label: "Line Input",
    description: "Main AC line input",
    icon: <Zap className="w-4 h-4 text-green-500" />,
    color: "green",
    fields: [
      { key: "voltage", label: "Voltage", description: "Line input voltage (V)" },
      { key: "frequency", label: "Frequency", description: "Line frequency (Hz)" },
    ],
  },
  {
    key: "battery" as const,
    label: "Battery",
    description: "Battery / BMS module data source",
    icon: <Battery className="w-4 h-4 text-rose-500" />,
    color: "rose",
    fields: [
      { key: "percent", label: "Charge Level", description: "Battery percentage (%)" },
      { key: "voltage", label: "Voltage", description: "Battery voltage (V)" },
      { key: "time", label: "Runtime", description: "Remaining runtime (min)" },
      { key: "temperature", label: "Temperature", description: "Battery temperature (°C)" },
      { key: "current", label: "Current", description: "Battery current (A)" },
      { key: "health", label: "Health", description: "State of health (%)" },
    ],
  },
  {
    key: "output" as const,
    label: "Output",
    description: "UPS output power to loads",
    icon: <Plug className="w-4 h-4 text-purple-500" />,
    color: "purple",
    fields: [
      { key: "voltage", label: "Voltage", description: "Output voltage (V)" },
      { key: "frequency", label: "Frequency", description: "Output frequency (Hz)" },
      { key: "current", label: "Current", description: "Output current (A)" },
    ],
  },
  {
    key: "load" as const,
    label: "Load",
    description: "Load consumption metrics",
    icon: <Wind className="w-4 h-4 text-indigo-500" />,
    color: "indigo",
    fields: [
      { key: "percent", label: "Load Level", description: "Load percentage (%)" },
      { key: "apparentPower", label: "Apparent Power", description: "kVA" },
      { key: "activePower", label: "Active Power", description: "kW" },
    ],
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: UPSDashboardConfig) => void;
  initialConfig?: UPSDashboardConfig;
}

// ─── Section Row Component ────────────────────────────────────────────────────
const SectionRow = ({
  sectionDef,
  config,
  devices,
  onUpdate,
}: {
  sectionDef: typeof SECTIONS[0];
  config: SectionConfig;
  devices: DeviceForSelection[];
  onUpdate: (c: SectionConfig) => void;
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [availableKeys, setAvailableKeys] = useState<string[]>(
    Object.values(config.keyMapping).filter(Boolean)
  );
  const [isListening, setIsListening] = useState(false);
  const [listenFailed, setListenFailed] = useState(false);
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [keySearchOpen, setKeySearchOpen] = useState<Record<string, boolean>>({});
  const [keySearchQuery, setKeySearchQuery] = useState<Record<string, string>>({});
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});
  const subscribedTopicRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMqtt = useCallback((_t: string, payload: string) => {
    try {
      const p = JSON.parse(payload);
      const inner = typeof p.value === "string" ? JSON.parse(p.value) : (p.value || p);
      setAvailableKeys(prev => [...new Set([...prev, ...Object.keys(inner)])]);
      setPreviewValues(inner);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setListenFailed(false);
    } catch { /* ignore */ }
    finally { setIsListening(false); }
  }, []);

  useEffect(() => {
    const dev = devices.find(d => d.uniqId === config.deviceUniqId);
    const topic = dev?.topic;
    if (subscribedTopicRef.current && subscribedTopicRef.current !== topic) {
      unsubscribe(subscribedTopicRef.current, handleMqtt);
      subscribedTopicRef.current = null;
    }
    if (topic && topic !== subscribedTopicRef.current) {
      setIsListening(true);
      setListenFailed(false);
      subscribe(topic, handleMqtt);
      subscribedTopicRef.current = topic;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => { setListenFailed(true); setIsListening(false); }, 6000);
    }
    return () => {
      if (subscribedTopicRef.current) { unsubscribe(subscribedTopicRef.current, handleMqtt); subscribedTopicRef.current = null; }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [config.deviceUniqId, devices, subscribe, unsubscribe, handleMqtt]);

  const setDevice = (uniqId: string) => {
    const dev = devices.find(d => d.uniqId === uniqId);
    onUpdate({ deviceUniqId: uniqId, keyMapping: {} });
    setAvailableKeys([]);
    setPreviewValues({});
    setDeviceSearchOpen(false);
    setDeviceSearchQuery("");
  };

  const setKey = (field: string, key: string) => {
    onUpdate({ ...config, keyMapping: { ...config.keyMapping, [field]: key || "" } });
  };

  const selectedDevice = devices.find(d => d.uniqId === config.deviceUniqId);
  const mappedCount = Object.values(config.keyMapping).filter(Boolean).length;

  const colorMap: Record<string, string> = {
    amber: "border-amber-300 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/10",
    blue: "border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/10",
    green: "border-green-300 dark:border-green-700 bg-green-50/40 dark:bg-green-950/10",
    rose: "border-rose-300 dark:border-rose-700 bg-rose-50/40 dark:bg-rose-950/10",
    purple: "border-purple-300 dark:border-purple-700 bg-purple-50/40 dark:bg-purple-950/10",
    indigo: "border-indigo-300 dark:border-indigo-700 bg-indigo-50/40 dark:bg-indigo-950/10",
  };

  return (
    <div className={`border-2 rounded-xl p-4 space-y-3 ${colorMap[sectionDef.color]}`}>
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            {sectionDef.icon}
          </div>
          <div>
            <p className="font-semibold text-sm">{sectionDef.label}</p>
            <p className="text-xs text-muted-foreground">{sectionDef.description}</p>
          </div>
        </div>
        {mappedCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {mappedCount}/{sectionDef.fields.length} mapped
          </Badge>
        )}
      </div>

      {/* Device Picker */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Label className="text-xs text-muted-foreground mb-1 block">Data Source Device</Label>
          <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between text-left font-normal h-8">
                <span className="truncate text-xs">
                  {selectedDevice?.name || "Select device..."}
                </span>
                <ChevronDown className="w-3 h-3 shrink-0 opacity-50 ml-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" side="bottom" align="start">
              <Command shouldFilter={false}>
                <CommandInput placeholder="Search devices..." value={deviceSearchQuery} onValueChange={setDeviceSearchQuery} className="h-8" />
                <CommandEmpty>No devices found</CommandEmpty>
                <CommandGroup className="max-h-52 overflow-auto">
                  <CommandItem value="__none__" onSelect={() => { onUpdate(DEFAULT_SECTION); setDeviceSearchOpen(false); setAvailableKeys([]); }} className="cursor-pointer">
                    <span className="text-muted-foreground text-xs">— None / clear —</span>
                  </CommandItem>
                  {devices.filter(d => !deviceSearchQuery || d.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())).map(d => (
                    <CommandItem key={d.uniqId} value={d.uniqId} onSelect={() => setDevice(d.uniqId)} className="cursor-pointer">
                      <div className="flex items-center gap-2 w-full">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                        <span className="flex-1 truncate text-xs">{d.name}</span>
                        {config.deviceUniqId === d.uniqId && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Listening status */}
        {config.deviceUniqId && (
          <div className="pt-5 text-xs">
            {isListening ? (
              <div className="flex items-center gap-1 text-blue-500">
                <div className="w-2.5 h-2.5 border-2 border-blue-400/30 border-t-blue-500 rounded-full animate-spin" />
                <span>Listening...</span>
              </div>
            ) : listenFailed ? (
              <div className="flex items-center gap-1 text-amber-500">
                <AlertCircle className="w-3 h-3" />
                <span>No data</span>
              </div>
            ) : availableKeys.length > 0 ? (
              <div className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="w-3 h-3" />
                <span>{availableKeys.length} keys</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Key Mapping Fields */}
      {config.deviceUniqId && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
          {sectionDef.fields.map(field => {
            const mapped = config.keyMapping[field.key];
            const preview = mapped ? previewValues[mapped] : undefined;
            return (
              <div key={field.key} className="flex items-center gap-2 bg-white dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{field.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{field.description}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Key Dropdown */}
                  <Popover open={keySearchOpen[field.key] || false} onOpenChange={open => setKeySearchOpen(p => ({ ...p, [field.key]: open }))}>
                    <PopoverTrigger asChild>
                      <button
                        disabled={availableKeys.length === 0 && !mapped}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed max-w-[120px]"
                      >
                        <span className="truncate">{mapped || "— key —"}</span>
                        <ChevronDown className="w-3 h-3 shrink-0 opacity-60" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-0" side="bottom" align="end">
                      <Command shouldFilter={false}>
                        <CommandInput placeholder="Search..." value={keySearchQuery[field.key] || ""} onValueChange={q => setKeySearchQuery(p => ({ ...p, [field.key]: q }))} className="h-7 text-xs" />
                        <CommandEmpty><div className="p-2 text-center text-xs text-muted-foreground">No keys found</div></CommandEmpty>
                        <CommandGroup className="max-h-40 overflow-auto">
                          <CommandItem onSelect={() => { setKey(field.key, ""); setKeySearchOpen(p => ({ ...p, [field.key]: false })); }} className="cursor-pointer">
                            <span className="text-muted-foreground text-xs">— clear —</span>
                          </CommandItem>
                          {(availableKeys.length > 0 ? availableKeys : mapped ? [mapped] : [])
                            .filter(k => !keySearchQuery[field.key] || k.toLowerCase().includes((keySearchQuery[field.key] || "").toLowerCase()))
                            .map(k => (
                              <CommandItem key={k} onSelect={() => { setKey(field.key, k); setKeySearchOpen(p => ({ ...p, [field.key]: false })); setKeySearchQuery(p => ({ ...p, [field.key]: "" })); }} className="cursor-pointer">
                                <div className="flex items-center gap-2 w-full">
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shrink-0" />
                                  <span className="flex-1 truncate text-xs">{k}</span>
                                  {mapped === k && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {/* Preview badge */}
                  {mapped && (
                    preview !== undefined ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-green-50 text-green-700 border-green-300">{String(preview)}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-300">wait</Badge>
                    )
                  )}
                  {/* Clear key */}
                  {mapped && (
                    <button onClick={() => setKey(field.key, "")} className="text-slate-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const UPSDashboardConfigModal = ({ isOpen, onClose, onSave, initialConfig }: Props) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [customName, setCustomName] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);

  const [sections, setSections] = useState<Record<string, SectionConfig>>({
    bypass: DEFAULT_SECTION,
    line: DEFAULT_SECTION,
    battery: DEFAULT_SECTION,
    output: DEFAULT_SECTION,
    load: DEFAULT_SECTION,
    status: DEFAULT_SECTION,
  });

  // Pre-fill state on open
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSections({
        bypass: initialConfig.bypass || DEFAULT_SECTION,
        line: initialConfig.line || DEFAULT_SECTION,
        battery: initialConfig.battery || DEFAULT_SECTION,
        output: initialConfig.output || DEFAULT_SECTION,
        load: initialConfig.load || DEFAULT_SECTION,
        status: initialConfig.status || DEFAULT_SECTION,
      });
    } else if (isOpen) {
      setIsEditMode(false);
      setCustomName("");
      setSections({
        bypass: DEFAULT_SECTION,
        line: DEFAULT_SECTION,
        battery: DEFAULT_SECTION,
        output: DEFAULT_SECTION,
        load: DEFAULT_SECTION,
        status: DEFAULT_SECTION,
      });
    }
  }, [isOpen, initialConfig]);

  // Fetch devices
  useEffect(() => {
    if (!isOpen) return;
    const fetch_ = async () => {
      setIsLoadingDevices(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
        if (res.ok) setDevices(await res.json());
      } catch { /* ignore */ }
      finally { setIsLoadingDevices(false); }
    };
    fetch_();
  }, [isOpen]);

  const updateSection = (key: string, cfg: SectionConfig) => {
    setSections(prev => ({ ...prev, [key]: cfg }));
  };

  const handleSave = () => {
    if (!customName.trim()) { showToast.error("Please enter a widget name"); return; }
    const hasSomeDevice = Object.values(sections).some(s => s.deviceUniqId);
    if (!hasSomeDevice) { showToast.error("Please configure at least one data source section"); return; }

    const config: UPSDashboardConfig = {
      customName,
      bypass: sections.bypass,
      line: sections.line,
      battery: sections.battery,
      output: sections.output,
      load: sections.load,
      status: sections.status,
    };
    onSave(config);
    showToast.success(isEditMode ? "Widget updated" : "Widget created");
    onClose();
  };

  const totalMapped = Object.values(sections).reduce(
    (sum, s) => sum + Object.values(s.keyMapping).filter(Boolean).length, 0
  );
  const totalFields = SECTIONS.reduce((sum, s) => sum + s.fields.length, 0);
  const previewConfig: UPSDashboardConfig = {
    customName: customName || "UPS Dashboard Preview",
    bypass: sections.bypass,
    line: sections.line,
    battery: sections.battery,
    output: sections.output,
    load: sections.load,
    status: sections.status,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            {isEditMode ? "Edit UPS Dashboard Widget" : "Configure UPS Dashboard Widget"}
          </DialogTitle>
          <DialogDescription>
            Configure each UPS section independently — each section can read from a different MQTT device.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="space-y-5">
            {/* Widget Name */}
            <div className="grid gap-1.5">
              <Label htmlFor="customName">Widget Name *</Label>
              <Input
                id="customName"
                placeholder="e.g., Main UPS Dashboard"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
              />
            </div>

            {/* Overall progress bar */}
            {totalMapped > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Overall Mapping Progress</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">{totalMapped} of {totalFields} parameters configured</p>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round((totalMapped / totalFields) * 100)}%
                </div>
              </div>
            )}

            {/* Device loading skeleton */}
            {isLoadingDevices ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {SECTIONS.map(sectionDef => (
                  <SectionRow
                    key={sectionDef.key}
                    sectionDef={sectionDef}
                    config={sections[sectionDef.key]}
                    devices={devices}
                    onUpdate={cfg => updateSection(sectionDef.key, cfg)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Live Preview</p>
              <p className="text-xs text-muted-foreground">
                Widget akan berubah langsung saat Anda mengubah device dan key mapping.
              </p>
            </div>
            <div className="h-[420px] rounded-xl border border-border/60 bg-muted/20 p-3 lg:sticky lg:top-0">
              <UPSDashboardWidget config={previewConfig} isEditMode={true} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!customName.trim()}>
            {isEditMode ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
