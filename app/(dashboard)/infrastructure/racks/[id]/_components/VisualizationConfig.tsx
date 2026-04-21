"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { showToast } from "@/lib/toast-utils";
import {
  Save,
  Trash2,
  PlusCircle,
  Check,
  ChevronsUpDown,
  Search,
  X,
  Thermometer,
  Zap,
  Package,
  Info,
  Fan,
  Cpu,
} from "lucide-react";
import { useMqttServer } from "@/contexts/MqttServerProvider";

// Interfaces
interface DeviceVisConfig {
  deviceId: string;
  topic: string;
  keys: string[];
}

interface DeviceVisItem extends DeviceVisConfig {
  id: string;
}

interface VisModeConfig {
  enabled: boolean;
  devices: DeviceVisItem[];
}

interface SpaceVisModeConfig {
  enabled: boolean;
  devices?: DeviceVisItem[]; // Devices are not needed for space utilization
}

interface VisualizationConfigs {
  temp: VisModeConfig;
  power: VisModeConfig;
  cooling: VisModeConfig;
  space: SpaceVisModeConfig;
  serverDetail: VisModeConfig; // Add serverDetail mode
  environment: VisModeConfig; // Environment sensors (front/back temp, vibration, leak)
}

interface Rack {
  id: string;
  visualizationConfigs: VisualizationConfigs | null;
}

interface Props {
  rack: Rack;
  onConfigSave: () => void; // Callback to trigger re-fetch on parent
}

// Sub-component for a single device data source configuration
const DeviceItemForm = ({
  item,
  onUpdate,
  onRemove,
  allDevices,
}: {
  item: DeviceVisItem;
  onUpdate: (field: "deviceId" | "keys", value: string | string[]) => void;
  onRemove: () => void;
  allDevices: Array<{ uniqId: string; name: string; topic: string }>;
}) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const subscribedTopicRef = useRef<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [multiSelectOpen, setMultiSelectOpen] = useState(false);

  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string" ? JSON.parse(payload.value) : {};
        setAvailableKeys((prevKeys) => [
          ...new Set([...prevKeys, ...Object.keys(innerPayload)]),
        ]);
      } catch (e) {
        console.error("Failed to parse MQTT payload in device item form:", e);
      } finally {
        setIsWaitingForKey(false);
        unsubscribe(topic, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    },
    [unsubscribe],
  );

  useEffect(() => {
    if (item.keys && item.keys.length > 0) {
      setAvailableKeys((prev) => [...new Set([...prev, ...item.keys])]);
    }
  }, [item.keys]);

  useEffect(() => {
    const selectedDevice = allDevices.find((d) => d.uniqId === item.deviceId);
    const newTopic = selectedDevice?.topic;

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      setAvailableKeys(item.keys || []);
      setIsWaitingForKey(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;
    }

    return () => {
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [
    item.deviceId,
    allDevices,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    item.keys,
  ]);

  const handleDeviceChange = (deviceId: string) => {
    onUpdate("deviceId", deviceId);
    setPopoverOpen(false);
    setSearchQuery("");
  };

  const handleKeySelect = (key: string) => {
    const newKeys = item.keys.includes(key)
      ? item.keys.filter((k) => k !== key)
      : [...item.keys, key];
    onUpdate("keys", newKeys);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg relative bg-muted/50">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-xs">Device</Label>
          <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="h-9 w-full justify-between text-left font-normal"
              >
                {item.deviceId
                  ? allDevices.find((d) => d.uniqId === item.deviceId)?.name
                  : "Select device..."}
                <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] max-h-[--radix-popover-content-available-height] p-0"
              side="bottom"
              sideOffset={4}
              align="start"
            >
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder="Search..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="h-9"
                />
                <CommandEmpty>No devices found.</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-auto">
                  {allDevices
                    .filter((d) =>
                      d.name.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((device) => (
                      <CommandItem
                        key={device.uniqId}
                        value={device.uniqId}
                        onSelect={() => handleDeviceChange(device.uniqId)}
                      >
                        {device.name}
                      </CommandItem>
                    ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Telemetry Keys</Label>
          <Popover open={multiSelectOpen} onOpenChange={setMultiSelectOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-auto w-full justify-between text-left font-normal min-h-[2.25rem]"
                disabled={
                  !item.deviceId ||
                  isWaitingForKey ||
                  availableKeys.length === 0
                }
              >
                <div className="flex flex-wrap gap-1 items-center">
                  {item.keys.length === 0 ? (
                    <span className="text-muted-foreground text-sm">
                      {isWaitingForKey
                        ? "Waiting for data..."
                        : "Select keys..."}
                    </span>
                  ) : (
                    item.keys.map((key) => (
                      <Badge
                        key={key}
                        variant="secondary"
                        className="font-normal"
                      >
                        {key}
                        <span
                          role="button"
                          tabIndex={0}
                          aria-label={`Remove ${key}`}
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleKeySelect(key);
                            }
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleKeySelect(key);
                          }}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </span>
                      </Badge>
                    ))
                  )}
                </div>
                <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <Command>
                <CommandInput placeholder="Search keys..." />
                <CommandEmpty>No keys found.</CommandEmpty>
                <CommandGroup className="max-h-60 overflow-auto">
                  {availableKeys.map((key) => (
                    <CommandItem
                      key={key}
                      onSelect={() => handleKeySelect(key)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${item.keys.includes(key) ? "opacity-100" : "opacity-0"
                          }`}
                      />
                      {key}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export function VisualizationConfig({ rack, onConfigSave }: Props) {
  const [visualizationConfigs, setVisualizationConfigs] =
    useState<VisualizationConfigs>({
      temp: { enabled: false, devices: [] },
      power: { enabled: false, devices: [] },
      cooling: { enabled: false, devices: [] },
      space: { enabled: false, devices: [] },
      serverDetail: { enabled: false, devices: [] }, // Initialize serverDetail
      environment: { enabled: false, devices: [] },
    });
  const [allDevices, setAllDevices] = useState<
    Array<{ uniqId: string; name: string; topic: string }>
  >([]);
  const [isLoadingAllDevices, setIsLoadingAllDevices] = useState(false);

  useEffect(() => {

    // Define a default structure to ensure all keys are present

    const defaultConfig: VisualizationConfigs = {

      temp: { enabled: false, devices: [] },

      power: { enabled: false, devices: [] },

      cooling: { enabled: false, devices: [] },

      space: { enabled: false, devices: [] },

      serverDetail: { enabled: false, devices: [] },
      
      environment: { enabled: false, devices: [] },

    };



    // Merge database config with defaults to prevent undefined errors

    const dbConfig = (rack.visualizationConfigs || {}) as Partial<VisualizationConfigs>;

    const mergedConfig: VisualizationConfigs = {

      temp: { ...defaultConfig.temp, ...(dbConfig.temp || {}) },

      power: { ...defaultConfig.power, ...(dbConfig.power || {}) },

      cooling: { ...defaultConfig.cooling, ...(dbConfig.cooling || {}) },

      space: { ...defaultConfig.space, ...(dbConfig.space || {}) },

      serverDetail: { ...defaultConfig.serverDetail, ...(dbConfig.serverDetail || {}) },
      
      environment: { ...defaultConfig.environment, ...(dbConfig.environment || {}) },

    };



    // Ensure devices are initialized with temporary unique IDs for form keys

    for (const mode in mergedConfig) {

      const key = mode as keyof VisualizationConfigs;

      if (mergedConfig[key] && mergedConfig[key].devices) {

        mergedConfig[key].devices = (mergedConfig[key].devices || []).map(

          (d: DeviceVisConfig, i: number) => ({

            ...d,

            id: `device-init-${mode}-${i}-${Date.now()}`,

          }),

        );

      }

    }



    setVisualizationConfigs(mergedConfig);



  }, [rack]);

  useEffect(() => {
    // Fetch all devices for selection dropdowns
    const fetchAllDevicesForSelection = async () => {
      setIsLoadingAllDevices(true);
      try {
        const devicesRes = await fetch("/api/devices/for-selection");
        if (devicesRes.ok) {
          setAllDevices(await devicesRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch all devices for selection:", error);
      } finally {
        setIsLoadingAllDevices(false);
      }
    };
    fetchAllDevicesForSelection();
  }, []);

  const addDevice = (mode: "temp" | "power" | "cooling" | "space" | "serverDetail" | "environment") => {
    setVisualizationConfigs((prev) => {
      const modeConfig = prev[mode] || { enabled: false, devices: [] };
      return {
        ...prev,
        [mode]: {
          ...modeConfig,
          devices: [
            ...(modeConfig.devices || []),
            { id: `device-${Date.now()}`, deviceId: "", topic: "", keys: [] },
          ],
        },
      };
    });
  };

  const removeDevice = (
    mode: "temp" | "power" | "cooling" | "space" | "serverDetail" | "environment",
    id: string,
  ) => {
    setVisualizationConfigs((prev) => {
      const modeConfig = prev[mode] || { enabled: false, devices: [] };
      return {
        ...prev,
        [mode]: {
          ...modeConfig,
          devices: (modeConfig.devices || []).filter((d) => d.id !== id),
        },
      };
    });
  };

  const updateDevice = (
    mode: "temp" | "power" | "cooling" | "serverDetail" | "environment", // 'space' is excluded as it doesn't use this form
    id: string,
    field: "deviceId" | "keys",
    value: string | string[],
  ) => {
    setVisualizationConfigs((prev) => {
      const modeConfig = prev[mode] || { enabled: false, devices: [] };
      const newDevices = (modeConfig.devices || []).map((d) => {
        if (d.id !== id) return d;
        if (field === "deviceId" && typeof value === "string") {
          const selectedDevice = allDevices.find((dev) => dev.uniqId === value);
          return {
            ...d,
            deviceId: value,
            topic: selectedDevice?.topic || "",
            keys: [],
          };
        }
        return { ...d, [field]: value };
      });
      return {
        ...prev,
        [mode]: {
          ...modeConfig,
          devices: newDevices
        }
      };
    });
  };

  const handleSave = async () => {
    const finalVisConfigs = JSON.parse(JSON.stringify(visualizationConfigs));
    for (const mode in finalVisConfigs) {
      const modeConfig = finalVisConfigs[mode as keyof VisualizationConfigs];
      if (modeConfig && modeConfig.devices) {
        modeConfig.devices = modeConfig.devices.map(
          ({ id, ...rest }: DeviceVisItem) => rest,
        );
      }
    }

    try {
      const response = await fetch(`/api/racks/${rack.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualizationConfigs: finalVisConfigs }),
      });

      if (!response.ok) {
        throw new Error("Failed to save visualization settings");
      }

      showToast.success("Success", "Visualization settings saved successfully.");
      onConfigSave(); // Trigger re-fetch on parent page
    } catch (error) {
      console.error("Error saving visualization settings:", error);
      showToast.error("Error", "Could not save visualization settings.");
    }
  };

  const renderVisModeConfig = (
    mode: "temp" | "power" | "cooling" | "space" | "serverDetail" | "environment", // Add serverDetail and environment
  ) => {
    const titles = {
      temp: "Temperature Heatmap",
      power: "Power Consumption",
      cooling: "Cooling System",
      space: "Space Utilization",
      serverDetail: "Server Detail Telemetry", // Add title for serverDetail
      environment: "Environment Sensors (Leak, Vibration, Climate)", // For 3 new sensors
    };

    const descriptions = {
      temp: "Visualize device temperatures as a color-coded heatmap on the 3D model.",
      power: "Display real-time power usage for each configured device.",
      cooling: "Monitor cooling system performance and status.",
      space: "Highlight occupied vs. empty space based on installed devices.",
      serverDetail:
        "Show detailed telemetry for selected servers (CPU, Memory, Disk, etc.).", // Add description
      environment: "Map MQTT sources for front/rear temperatures, vibration limits, and water leak detection.",
    };

    const icons = {
      temp: <Thermometer className="h-6 w-6 text-red-500" />,
      power: <Zap className="h-6 w-6 text-yellow-500" />,
      cooling: <Fan className="h-6 w-6 text-blue-500" />,
      space: <Package className="h-6 w-6 text-blue-500" />,
      serverDetail: <Cpu className="h-6 w-6 text-indigo-500" />, // Add icon
      environment: <Thermometer className="h-6 w-6 text-emerald-500" />,
    };

    const config = visualizationConfigs[mode];

    return (
      <div className="p-4 bg-background/50 rounded-lg border-2 border-transparent hover:border-primary/20 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-muted rounded-full mt-1">{icons[mode]}</div>
            <div>
              <Label
                htmlFor={`${mode}-mode`}
                className="text-lg font-semibold flex-1 cursor-pointer"
              >
                {titles[mode]}
              </Label>
              <p className="text-sm text-muted-foreground">
                {descriptions[mode]}
              </p>
            </div>
          </div>
          <Switch
            id={`${mode}-mode`}
            checked={config.enabled}
            onCheckedChange={(checked) =>
              setVisualizationConfigs((prev) => ({
                ...prev,
                [mode]: { ...prev[mode], enabled: checked },
              }))
            }
          />
        </div>

        {config.enabled && (
          <div className="mt-4 space-y-4 pt-4 border-t pl-16">
            {mode === "space" ? (
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  This mode uses the device list from the 'Rack Details' tab. No
                  extra data source is needed.
                </p>
              </div>
            ) : (
              <>
                {isLoadingAllDevices ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="space-y-4">
                    {(config.devices || []).map((item) => (
                      <DeviceItemForm
                        key={item.id}
                        item={item}
                        onRemove={() => removeDevice(mode, item.id)}
                        onUpdate={(field, value) =>
                          updateDevice(mode, item.id, field, value)
                        }
                        allDevices={allDevices}
                      />
                    ))}
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={() => addDevice(mode)}
                  className="w-full"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Device Source
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Source Visualization</CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure real-time data sources for 3D visualization modes.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderVisModeConfig("temp")}
        {renderVisModeConfig("power")}
        {renderVisModeConfig("cooling")}
        {renderVisModeConfig("space")}
        {renderVisModeConfig("serverDetail")}
        {renderVisModeConfig("environment")}
      </CardContent>
      <CardFooter className="border-t px-6 py-4">
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </CardFooter>
    </Card>
  );
}
