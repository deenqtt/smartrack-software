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
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { CoolingDashboardWidget } from "./CoolingDashboardWidget";
import { Search, CheckCircle2, AlertCircle, Fan, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// --- Helper Functions ---

// String matching utility for auto-mapping
const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = str1.toLowerCase().replace(/[_-\s]/g, "");
  const s2 = str2.toLowerCase().replace(/[_-\s]/g, "");

  if (s1 === s2) return 1; // Exact match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8; // Partial match

  return 0;
};

const findBestMatch = (
  fieldKey: string, // use key not label for matching typically better
  availableKeys: string[]
): { key: string; confidence: number } | null => {
  if (availableKeys.length === 0) return null;

  // Manual aliases mapping for common HVAC terms
  const aliases: Record<string, string[]> = {
    returnTemp: ['return_temp', 'temp_return', 'returntemp', 'temp_in', 'tin', 't_return'],
    returnHum: ['return_hum', 'hum_return', 'returnhum', 'hum_in', 'hin', 'h_return'],
    supplyTemp: ['supply_temp', 'temp_supply', 'supplytemp', 'temp_out', 'tout', 't_supply'],
    supplyHum: ['supply_hum', 'hum_supply', 'supplyhum', 'hum_out', 'hout', 'h_supply'],
    acStatus: ['status', 'state', 'power', 'run_status', 'running'],
    mode: ['mode', 'work_mode', 'operation_mode'],
  };

  const targetAliases = aliases[fieldKey] || [fieldKey];

  let bestMatch = null;
  let maxConfidence = 0;

  for (const key of availableKeys) {
    const keyLower = key.toLowerCase();
    for (const alias of targetAliases) {
        if (keyLower === alias || keyLower.includes(alias)) {
             // Prioritize exact matches or very close ones
             const confidence = keyLower === alias ? 1.0 : 0.9;
             if (confidence > maxConfidence) {
                 maxConfidence = confidence;
                 bestMatch = key;
             }
        }
    }
  }

  return bestMatch ? { key: bestMatch, confidence: maxConfidence } : null;
};

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

export interface CoolingKeyMapping {
  returnTemp?: string;
  returnHum?: string;
  supplyTemp?: string;
  supplyHum?: string;
  acStatus?: string;
  mode?: string;
}

export interface CoolingDashboardConfig {
  customName: string;
  deviceUniqId: string;
  keyMapping: CoolingKeyMapping;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: CoolingDashboardConfig) => void;
  initialConfig?: CoolingDashboardConfig;
}

export const CoolingDashboardConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);

  // Form state
  const [customName, setCustomName] = useState("");
  const [selectedDeviceUniqId, setSelectedDeviceUniqId] = useState<string | null>(null);
  const [keyMapping, setKeyMapping] = useState<CoolingKeyMapping>({});

  // MQTT state
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [listeningFailed, setListeningFailed] = useState(false);
  const [keyPreviewValues, setKeyPreviewValues] = useState<Record<string, any>>({});
  const subscribedTopicRef = useRef<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit mode tracking
  const [isEditMode, setIsEditMode] = useState(false);

  // UI state
  const [deviceSearchOpen, setDeviceSearchOpen] = useState(false);
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [deviceNotFound, setDeviceNotFound] = useState(false);
  const [deviceValidationError, setDeviceValidationError] = useState<string | null>(null);
  const [autoMappedFields, setAutoMappedFields] = useState<Set<string>>(new Set());

  // Key search dropdown state
  const [keySearchOpen, setKeySearchOpen] = useState<{ [key: string]: boolean }>({});
  const [keySearchQuery, setKeySearchQuery] = useState<{ [key: string]: string }>({});

  const keyMappingFields = [
    {
      category: "Return Air",
      fields: [
        { key: "returnTemp", label: "Temperature", description: "Return air temperature (°C)" },
        { key: "returnHum", label: "Humidity", description: "Return air humidity (%)" },
      ],
    },
    {
      category: "Supply Air",
      fields: [
        { key: "supplyTemp", label: "Temperature", description: "Supply air temperature (°C)" },
        { key: "supplyHum", label: "Humidity", description: "Supply air humidity (%)" },
      ],
    },
    {
      category: "Status",
      fields: [
        { key: "acStatus", label: "AC Status", description: "ON/OFF status" },
        { key: "mode", label: "Mode", description: "Cooling/Heating/Fan/Standby" },
      ],
    },
  ];

  // Pre-fill data if editing
  useEffect(() => {
    if (isOpen && initialConfig) {
      setIsEditMode(true);
      setCustomName(initialConfig.customName || "");
      setSelectedDeviceUniqId(initialConfig.deviceUniqId || null);
      setKeyMapping(initialConfig.keyMapping || {});
      
      const existingKeys = Object.values(initialConfig.keyMapping || {}).filter(Boolean) as string[];
      setAvailableKeys(existingKeys);
    } else if (isOpen) {
      setIsEditMode(false);
      setCustomName("");
      setSelectedDeviceUniqId(null);
      setKeyMapping({});
      setAvailableKeys([]);
      setKeyPreviewValues({});
      setIsWaitingForKey(false);
      setListeningFailed(false);
      setAutoMappedFields(new Set());
      setDeviceNotFound(false);
    } else {
      // Cleanup on close
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (subscribedTopicRef.current) {
          unsubscribe(subscribedTopicRef.current, handleMqttMessage);
          subscribedTopicRef.current = null;
      }
    }
  }, [isOpen, initialConfig]);

  // Fetch devices
  useEffect(() => {
    if (isOpen) {
      const fetchDevices = async () => {
        setIsLoadingDevices(true);
        setDeviceNotFound(false);
        setDeviceValidationError(null);
        try {
          const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
          if (!response.ok) throw new Error("Failed to fetch devices");
          const fetchedDevices = await response.json();
          setDevices(fetchedDevices);

          if (selectedDeviceUniqId && !fetchedDevices.find((d: DeviceForSelection) => d.uniqId === selectedDeviceUniqId)) {
            setDeviceNotFound(true);
            setDeviceValidationError("The selected device was deleted or is no longer available.");
          }
        } catch (error: any) {
          showToast.error("Failed to load devices: " + error.message);
          onClose();
        } finally {
          setIsLoadingDevices(false);
        }
      };
      fetchDevices();
    }
  }, [isOpen, onClose, selectedDeviceUniqId]);

  // Handle MQTT message
  const handleMqttMessage = useCallback((topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        let innerPayload = payload;
        
        // Handle common wrappers
        if (payload.value && typeof payload.value === 'string') {
            try { innerPayload = JSON.parse(payload.value); } catch {}
        } else if (payload.value && typeof payload.value === 'object') {
            innerPayload = payload.value;
        }

        const keys = Object.keys(innerPayload);
        
        setAvailableKeys(prev => [...new Set([...prev, ...keys])]);
        setKeyPreviewValues(innerPayload);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setListeningFailed(false);
        setIsWaitingForKey(false);
      } catch (e) {
        console.error("Failed to parse MQTT payload", e);
      }
  }, []);

  // Subscribe logic
  useEffect(() => {
    const selectedDevice = devices.find(d => d.uniqId === selectedDeviceUniqId);
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
        if (!isEditMode) {
            setAvailableKeys([]);
            setKeyPreviewValues({});
        }
        setIsWaitingForKey(true);
        setListeningFailed(false);
        subscribe(newTopic, handleMqttMessage);
        subscribedTopicRef.current = newTopic;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            setListeningFailed(true);
            setIsWaitingForKey(false);
        }, 5000);
    }

    return () => {
        if (subscribedTopicRef.current) {
            unsubscribe(subscribedTopicRef.current, handleMqttMessage);
            subscribedTopicRef.current = null;
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [selectedDeviceUniqId, devices, subscribe, unsubscribe, handleMqttMessage, isEditMode]);

  const handleDeviceChange = (deviceUniqId: string) => {
    setSelectedDeviceUniqId(deviceUniqId);
    setDeviceNotFound(false);
    setDeviceValidationError(null);
    if (!isEditMode) {
      setKeyMapping({});
      setKeyPreviewValues({});
      setAutoMappedFields(new Set());
    }
  };

  const performAutoMapping = (keys: string[]) => {
      const newMapping = { ...keyMapping };
      const autoMapped = new Set<string>();

      keyMappingFields.forEach(group => {
          group.fields.forEach(field => {
              if (newMapping[field.key as keyof CoolingKeyMapping]) return; // Already mapped

              const match = findBestMatch(field.key, keys);
              if (match && match.confidence > 0.7) {
                  newMapping[field.key as keyof CoolingKeyMapping] = match.key;
                  autoMapped.add(field.key);
              }
          });
      });

      setKeyMapping(newMapping);
      setAutoMappedFields(autoMapped);
      if (autoMapped.size > 0) {
          showToast.success(`Auto-mapped ${autoMapped.size} fields`);
      }
  };

  // Trigger auto-mapping when keys arrive
  useEffect(() => {
      if (availableKeys.length > 0 && !isEditMode && autoMappedFields.size === 0 && !isWaitingForKey) {
          performAutoMapping(availableKeys);
      }
  }, [isWaitingForKey, isEditMode]);

  const handleSave = () => {
    if (!customName.trim()) {
      showToast.error("Please enter a widget name");
      return;
    }
    if (!selectedDeviceUniqId) {
      showToast.error("Please select a device");
      return;
    }
    if (deviceNotFound) {
        showToast.error("Selected device is invalid.");
        return;
    }

    // Ensure at least one key is mapped or force save if user really wants to rely on internal logic (though internal logic should be replaced by this config)
    const mappedCount = Object.values(keyMapping).filter(Boolean).length;
    if (mappedCount === 0) {
        showToast.error("Please map at least one data key");
        return;
    }

    const config: CoolingDashboardConfig = {
      customName,
      deviceUniqId: selectedDeviceUniqId,
      keyMapping,
    };

    onSave(config);
    showToast.success(isEditMode ? "Widget updated" : "Widget created");
    onClose();
  };

  const getSelectedDevice = () => devices.find(d => d.uniqId === selectedDeviceUniqId);
  const previewConfig: CoolingDashboardConfig = {
    customName: customName || "Cooling Dashboard Preview",
    deviceUniqId: selectedDeviceUniqId || "",
    keyMapping,
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fan className="w-5 h-5 text-blue-600" />
            {isEditMode ? "Edit Cooling Dashboard Widget" : "Configure Cooling Dashboard Widget"}
          </DialogTitle>
          <DialogDescription>
            Select a device and map data keys.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
          <div className="space-y-6">
             {/* Widget Name */}
             <div className="grid gap-2">
              <Label htmlFor="customName">Widget Name *</Label>
              <Input
                id="customName"
                placeholder="e.g., Main Server Room AC"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            {/* Device Selection */}
            <div className="grid gap-2">
              <Label>Select HVAC Device *</Label>
              {isLoadingDevices ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Popover open={deviceSearchOpen} onOpenChange={setDeviceSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="justify-between w-full">
                      {selectedDeviceUniqId ? getSelectedDevice()?.name || "Select device..." : "Select device..."}
                      <Search className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                          <CommandInput placeholder="Search devices..." onValueChange={setDeviceSearchQuery} />
                          <CommandEmpty>No devices found.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                              {devices.filter(d => !deviceSearchQuery || d.name.toLowerCase().includes(deviceSearchQuery.toLowerCase())).map(device => (
                                  <CommandItem key={device.uniqId} value={device.uniqId} onSelect={() => {
                                      handleDeviceChange(device.uniqId);
                                      setDeviceSearchOpen(false);
                                  }}>
                                      <CheckCircle2 className={`mr-2 h-4 w-4 ${selectedDeviceUniqId === device.uniqId ? "opacity-100" : "opacity-0"}`} />
                                      {device.name}
                                  </CommandItem>
                              ))}
                          </CommandGroup>
                      </Command>
                  </PopoverContent>
                </Popover>
              )}

              {/* Status */}
              <div className="flex items-center gap-2 text-sm mt-1">
                  {isWaitingForKey ? (
                      <span className="text-blue-600 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Listening for data...</span>
                  ) : listeningFailed ? (
                      <span className="text-amber-600 flex items-center gap-2"><AlertCircle className="w-3 h-3"/> No data received. Device offline?</span>
                  ) : availableKeys.length > 0 ? (
                      <span className="text-green-600 flex items-center gap-2"><CheckCircle2 className="w-3 h-3"/> Data received ({availableKeys.length} keys)</span>
                  ) : null}
              </div>
            </div>

            {/* Key Mapping */}
            {selectedDeviceUniqId && (
                <div className="space-y-6 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Data Key Mapping</h3>
                        {autoMappedFields.size > 0 && (
                            <span className="text-xs text-muted-foreground">{autoMappedFields.size} fields auto-mapped</span>
                        )}
                    </div>
                    
                    {keyMappingFields.map(group => (
                        <div key={group.category} className="space-y-3">
                            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">{group.category}</h4>
                            <div className="grid gap-3">
                                {group.fields.map(field => {
                                    const mappedKey = keyMapping[field.key as keyof CoolingKeyMapping];
                                    const previewValue = mappedKey ? keyPreviewValues[mappedKey] : null;

                                    return (
                                        <div key={field.key} className="grid grid-cols-[1fr,2fr,auto] gap-3 items-center p-3 rounded-lg border bg-white dark:bg-slate-800">
                                            <div>
                                                <Label className="text-sm font-medium">{field.label}</Label>
                                                <p className="text-xs text-muted-foreground">{field.description}</p>
                                            </div>
                                            
                                            <Popover open={keySearchOpen[field.key]} onOpenChange={(o) => setKeySearchOpen(prev => ({...prev, [field.key]: o}))}>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" className="justify-between font-normal">
                                                        {mappedKey || "Select key..."}
                                                        <Search className="ml-2 h-4 w-4 opacity-50" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-[250px] p-0" align="start">
                                                    <Command>
                                                        <CommandInput placeholder="Search keys..." />
                                                        <CommandEmpty>No keys found.</CommandEmpty>
                                                        <CommandGroup className="max-h-48 overflow-auto">
                                                            {availableKeys.map(key => (
                                                                <CommandItem key={key} value={key} onSelect={() => {
                                                                    setKeyMapping(prev => ({...prev, [field.key]: key}));
                                                                    setKeySearchOpen(prev => ({...prev, [field.key]: false}));
                                                                }}>
                                                                    <CheckCircle2 className={`mr-2 h-4 w-4 ${mappedKey === key ? "opacity-100" : "opacity-0"}`} />
                                                                    {key}
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </Command>
                                                </PopoverContent>
                                            </Popover>

                                            <div className="min-w-[80px] text-right">
                                                {mappedKey && (
                                                    <Badge variant="outline" className="bg-slate-50">
                                                        {previewValue !== undefined ? String(previewValue) : "---"}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-semibold">Live Preview</p>
              <p className="text-xs text-muted-foreground">
                Widget akan berubah langsung saat device dan key mapping Anda ubah.
              </p>
            </div>
            <div className="h-[380px] rounded-xl border border-border/60 bg-muted/20 p-3 lg:sticky lg:top-0">
              <CoolingDashboardWidget config={previewConfig} isEditMode={true} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!selectedDeviceUniqId || deviceNotFound}>
              {isEditMode ? "Update Widget" : "Create Widget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
