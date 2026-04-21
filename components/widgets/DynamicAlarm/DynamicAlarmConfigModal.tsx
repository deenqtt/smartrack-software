"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Trash2,
  Edit,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Settings,
  Palette,
  Database,
  Target,
  Wifi,
} from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import type { DynamicAlarmConfig, AlarmItemConfig, DeviceInfo } from './types';
import { generateAlarmItemId, validateAlarmConfig } from './utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DynamicAlarmConfig) => void;
  initialConfig?: DynamicAlarmConfig;
}

interface DeviceOption {
  uniqId: string;
  name: string;
  topic: string;
}

interface KeyOption {
  key: string;
  sampleValue: any;
  type: string;
}

export const DynamicAlarmConfigModal = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: Props) => {
  // Main configuration state
  const [config, setConfig] = useState<DynamicAlarmConfig>({
    widgetTitle: "Dynamic Alarm Monitor",
    showOfflineDevices: true,
    autoRefreshInterval: 30,
    items: [],
  });

  // UI state
  const [activeTab, setActiveTab] = useState<"general" | "items">("general");
  const [editingItem, setEditingItem] = useState<AlarmItemConfig | null>(null);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);

  // Data state
  const [devices, setDevices] = useState<DeviceOption[]>([]);

  // Initialize config from props
  useEffect(() => {
    if (initialConfig) {
      setConfig({
        ...initialConfig,
        items: initialConfig.items || [],
        widgetTitle: initialConfig.widgetTitle || "Dynamic Alarm Monitor",
        showOfflineDevices: initialConfig.showOfflineDevices ?? true,
        autoRefreshInterval: initialConfig.autoRefreshInterval || 30,
      });
    }
  }, [initialConfig]);

  // Load devices - only drycontact devices
  useEffect(() => {
    const loadDevices = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`);
        if (response.ok) {
          const devicesData = await response.json();
          // Filter to only show drycontact devices
          const drycontactDevices = devicesData.filter((device: any) =>
            device.name.toLowerCase().includes('drycontact')
          );
          const deviceOptions = drycontactDevices.map((device: any) => ({
            uniqId: device.uniqId,
            name: device.name,
            topic: device.topic,
          }));
          setDevices(deviceOptions);
        } else {
          showToast.error("Error", "Failed to load devices");
        }
      } catch (error) {
        console.error("Failed to load devices:", error);
        showToast.error("Error", "Failed to load devices");
      }
    };

    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);



  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: AlarmItemConfig) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleDeleteItem = (itemId: string) => {
    setConfig(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId),
    }));
  };

  const handleSaveItem = (item: AlarmItemConfig) => {
    setConfig(prev => {
      const existingIndex = prev.items.findIndex(i => i.id === item.id);
      if (existingIndex >= 0) {
        // Update existing
        const newItems = [...prev.items];
        newItems[existingIndex] = item;
        return { ...prev, items: newItems };
      } else {
        // Add new
        return { ...prev, items: [...prev.items, item] };
      }
    });
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6" />
              <div>
                <DialogTitle className="text-xl font-semibold text-slate-800 dark:text-slate-200">
                  Dynamic Alarm Monitor
                </DialogTitle>
                <DialogDescription className="text-slate-600 dark:text-slate-400 mt-1">
                  Configure real-time monitoring with customizable alerts and display styles
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "general" | "items")} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg mb-6">
              <TabsTrigger
                value="general"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
              >
                <Settings className="h-4 w-4 mr-2" />
                General Settings
              </TabsTrigger>
              <TabsTrigger
                value="items"
                className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm dark:data-[state=active]:bg-slate-700"
              >
                <Target className="h-4 w-4 mr-2" />
                Alarm Items ({config.items.length})
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto">
              <TabsContent value="general" className="space-y-6 mt-0">
                {/* Widget Configuration Card */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Database className="h-5 w-5 text-blue-500" />
                      Widget Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Widget Title */}
                      <div className="space-y-3">
                        <Label htmlFor="widgetTitle" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Widget Title
                        </Label>
                        <Input
                          id="widgetTitle"
                          value={config.widgetTitle}
                          onChange={(e) => setConfig(prev => ({ ...prev, widgetTitle: e.target.value }))}
                          placeholder="e.g., Data Center Alarms"
                          className="h-10 border-slate-200 dark:border-slate-700 focus:border-blue-500"
                        />
                      </div>

                      {/* Auto Refresh Interval */}
                      <div className="space-y-3">
                        <Label htmlFor="refreshInterval" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Auto Refresh Interval
                        </Label>
                        <div className="relative">
                          <Input
                            id="refreshInterval"
                            type="number"
                            min="5"
                            max="300"
                            value={config.autoRefreshInterval}
                            onChange={(e) => setConfig(prev => ({
                              ...prev,
                              autoRefreshInterval: parseInt(e.target.value) || 30
                            }))}
                            className="h-10 border-slate-200 dark:border-slate-700 focus:border-blue-500 pr-12"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            seconds
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Show Offline Devices Toggle */}
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                          Show Offline Devices
                        </Label>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Display monitoring items from disconnected devices
                        </p>
                      </div>
                      <Switch
                        checked={config.showOfflineDevices}
                        onCheckedChange={(checked) =>
                          setConfig(prev => ({ ...prev, showOfflineDevices: checked }))
                        }
                        className="data-[state=checked]:bg-blue-500"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Display Styles Guide */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 shadow-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-800 dark:text-slate-200">
                      <Palette className="h-5 w-5 text-purple-500" />
                      Display Styles Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Each alarm item can be displayed in different styles. Choose the best visualization for your monitoring needs:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl border border-blue-200/60 dark:border-blue-800/60">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                          <span className="font-semibold text-blue-800 dark:text-blue-200">Badges</span>
                        </div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Compact horizontal layout perfect for dashboards with limited space
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl border border-green-200/60 dark:border-green-800/60">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-green-800 dark:text-green-200">Cards</span>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Detailed vertical layout with comprehensive information display
                        </p>
                      </div>

                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl border border-purple-200/60 dark:border-purple-800/60">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="font-semibold text-purple-800 dark:text-purple-200">List</span>
                        </div>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Table-style layout for bulk monitoring with sortable columns
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="items" className="space-y-6 mt-0">
                {/* Header with Add Button */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Alarm Items</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      Configure individual monitoring parameters and alert thresholds
                    </p>
                  </div>
                  <Button
                    onClick={handleAddItem}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Alarm Item
                  </Button>
                </div>

                {config.items.length === 0 ? (
                  <Card className="border-dashed border-slate-300 dark:border-slate-600">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                        <AlertTriangle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        No Alarm Items Configured
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-6 max-w-md">
                        Start monitoring your devices by adding alarm items. Configure thresholds, display styles, and notification preferences.
                      </p>
                      <Button
                        onClick={handleAddItem}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Alarm Item
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {config.items.map((item, index) => {
                      const IconComponent = getIconComponent(item.selectedIcon || "Zap");
                      const device = devices.find(d => d.uniqId === item.deviceUniqId);

                      return (
                        <Card key={item.id} className="border-slate-200/60 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div
                                  className="flex items-center justify-center rounded-xl shadow-sm"
                                  style={{
                                    backgroundColor: item.iconBgColor,
                                    color: item.iconColor,
                                    width: 48,
                                    height: 48,
                                  }}
                                >
                                  {IconComponent && <IconComponent size={20} />}
                                </div>
                                <div className="space-y-1">
                                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                                    {item.customName}
                                  </h4>
                                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                    <span>{device?.name || 'Unknown Device'}</span>
                                    <span>•</span>
                                    <span className="font-mono">{item.selectedKey}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                {/* Status Badges */}
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={item.enabled ? "default" : "secondary"}
                                    className={`text-xs font-medium ${
                                      item.enabled
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                  >
                                    {item.enabled ? '● Active' : '○ Disabled'}
                                  </Badge>

                                  <Badge
                                    variant="secondary"
                                    className="text-xs capitalize font-medium"
                                    style={{
                                      backgroundColor:
                                        item.displayStyle === 'badges' ? '#dbeafe' :
                                        item.displayStyle === 'cards' ? '#dcfce7' : '#ede9fe',
                                      color:
                                        item.displayStyle === 'badges' ? '#1e40af' :
                                        item.displayStyle === 'cards' ? '#166534' : '#6b21a8'
                                    }}
                                  >
                                    {item.displayStyle}
                                  </Badge>

                                  {item.alarmThreshold?.enabled && (
                                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-300">
                                      Threshold: {item.alarmThreshold.min || 0} - {item.alarmThreshold.max || '∞'}
                                    </Badge>
                                  )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditItem(item)}
                                    className="h-8 w-8 p-0 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  >
                                    <Edit className="h-4 w-4 text-blue-500" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          <DialogFooter className="border-t border-slate-200 dark:border-slate-700 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
            >
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item Configuration Modal */}
      <AlarmItemModal
        isOpen={isItemModalOpen}
        onClose={() => {
          setIsItemModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        initialItem={editingItem}
        devices={devices}
      />
    </>
  );
};

// Separate component for item configuration
interface AlarmItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: AlarmItemConfig) => void;
  initialItem?: AlarmItemConfig | null;
  devices: DeviceOption[];
}

const AlarmItemModal = ({
  isOpen,
  onClose,
  onSave,
  initialItem,
  devices,
}: AlarmItemModalProps) => {
  const { subscribe, unsubscribe } = useMqttServer();
  const subscribedTopicRef = useRef<string | null>(null);

  const [item, setItem] = useState<AlarmItemConfig>({
    id: generateAlarmItemId(),
    deviceUniqId: "",
    selectedKey: "",
    customName: "",
    selectedIcon: "Zap",
    iconColor: "#FFFFFF",
    iconBgColor: "#64748B",
    displayStyle: "badges",
    alarmThreshold: {
      min: undefined,
      max: undefined,
      enabled: false,
    },
    enabled: true,
  });

  // State for MQTT-based key loading
  const [availableKeys, setAvailableKeys] = useState<KeyOption[]>([]);
  const [isWaitingForKeys, setIsWaitingForKeys] = useState(false);
  const [keyCollectionTimeout, setKeyCollectionTimeout] = useState<NodeJS.Timeout | null>(null);

  // Initialize from props
  useEffect(() => {
    if (initialItem) {
      setItem(initialItem);
      // If editing, pre-populate available keys if we have them
      if (initialItem.selectedKey) {
        setAvailableKeys([{
          key: initialItem.selectedKey,
          sampleValue: 'configured',
          type: 'string'
        }]);
      }
    } else {
      setItem({
        id: generateAlarmItemId(),
        deviceUniqId: "",
        selectedKey: "",
        customName: "",
        selectedIcon: "Zap",
        iconColor: "#FFFFFF",
        iconBgColor: "#64748B",
        displayStyle: "badges",
        alarmThreshold: {
          min: undefined,
          max: undefined,
          enabled: false,
        },
        enabled: true,
      });
      setAvailableKeys([]);
    }
  }, [initialItem, isOpen]);

  // MQTT message handler for extracting keys
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        if (typeof payload.value === "string") {
          const innerPayload = JSON.parse(payload.value);
          const newKeys = Object.keys(innerPayload).map(key => ({
            key,
            sampleValue: innerPayload[key],
            type: typeof innerPayload[key] === 'number' ? 'number' :
                  typeof innerPayload[key] === 'boolean' ? 'boolean' : 'string'
          }));

          setAvailableKeys(prevKeys => {
            // Create a map to deduplicate by key
            const keyMap = new Map();

            // Add existing keys
            prevKeys.forEach(keyOption => {
              keyMap.set(keyOption.key, keyOption);
            });

            // Add new keys (will overwrite if key already exists)
            newKeys.forEach(keyOption => {
              keyMap.set(keyOption.key, keyOption);
            });

            // Convert back to array
            return Array.from(keyMap.values());
          });
        } else {
          console.warn("Payload 'value' is not a JSON string:", payload.value);
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    []
  );

  // Subscribe to MQTT topic when device changes
  useEffect(() => {
    const selectedDevice = devices.find(d => d.uniqId === item.deviceUniqId);
    const newTopic = selectedDevice?.topic;

    // Clear existing timeout
    if (keyCollectionTimeout) {
      clearTimeout(keyCollectionTimeout);
      setKeyCollectionTimeout(null);
    }

    if (subscribedTopicRef.current && subscribedTopicRef.current !== newTopic) {
      unsubscribe(subscribedTopicRef.current, handleMqttMessage);
      subscribedTopicRef.current = null;
    }

    if (newTopic && newTopic !== subscribedTopicRef.current) {
      if (!initialItem || item.deviceUniqId !== initialItem.deviceUniqId) {
        setAvailableKeys([]);
      }
      setIsWaitingForKeys(true);
      subscribe(newTopic, handleMqttMessage);
      subscribedTopicRef.current = newTopic;

      // Set timeout to stop collecting keys after 15 seconds
      const timeout = setTimeout(() => {
        setIsWaitingForKeys(false);
        if (subscribedTopicRef.current) {
          unsubscribe(subscribedTopicRef.current, handleMqttMessage);
          subscribedTopicRef.current = null;
        }
        setKeyCollectionTimeout(null);
      }, 15000); // 15 seconds

      setKeyCollectionTimeout(timeout);
    }

    return () => {
      if (keyCollectionTimeout) {
        clearTimeout(keyCollectionTimeout);
        setKeyCollectionTimeout(null);
      }
      if (subscribedTopicRef.current) {
        unsubscribe(subscribedTopicRef.current, handleMqttMessage);
        subscribedTopicRef.current = null;
      }
    };
  }, [item.deviceUniqId, devices, subscribe, unsubscribe, handleMqttMessage, initialItem]);

  const handleSave = () => {
    const validation = validateAlarmConfig(item);
    if (!validation.valid) {
      // Show validation errors with toast
      showToast.error("Validation Error", validation.errors.join(", "));
      return;
    }
    onSave(item);
  };

  // Check if the form is valid for enabling the save button
  const isFormValid = item.customName?.trim() && item.deviceUniqId && item.selectedKey && item.selectedIcon;

  const selectedDevice = devices.find(d => d.uniqId === item.deviceUniqId);
  const IconComponent = getIconComponent(item.selectedIcon || "Zap");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="text-blue-500" size={20} />
            {initialItem ? "Edit Alarm Item" : "Add Alarm Item"}
          </DialogTitle>
          <DialogDescription>
            Configure monitoring parameters and display settings for this alarm item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customName">Display Name *</Label>
              <Input
                id="customName"
                value={item.customName}
                onChange={(e) => setItem(prev => ({ ...prev, customName: e.target.value }))}
                placeholder="e.g., Server Temperature"
              />
            </div>

            <div className="space-y-2">
              <Label>Device *</Label>
              <Select
                value={item.deviceUniqId}
                onValueChange={(value) => setItem(prev => ({
                  ...prev,
                  deviceUniqId: value,
                  selectedKey: "", // Reset key when device changes
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select device" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.uniqId} value={device.uniqId}>
                      {device.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Data Key */}
          <div className="space-y-2">
            <Label>Data Key *</Label>
            <Select
              value={item.selectedKey}
              onValueChange={(value) => setItem(prev => ({ ...prev, selectedKey: value }))}
              disabled={!item.deviceUniqId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isWaitingForKeys
                      ? "Waiting for device data..."
                      : item.deviceUniqId
                        ? "Select data key"
                        : "Select device first"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableKeys.map((keyOption) => (
                  <SelectItem key={keyOption.key} value={keyOption.key}>
                    {keyOption.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {item.deviceUniqId && !isWaitingForKeys && availableKeys.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No keys received. Ensure the device is publishing data.
              </p>
            )}
          </div>



          {/* Display Style */}
          <div className="space-y-2">
            <Label>Display Style *</Label>
            <Select
              value={item.displayStyle}
              onValueChange={(value: 'badges' | 'cards' | 'list') =>
                setItem(prev => ({ ...prev, displayStyle: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="badges">Badges (Compact horizontal layout)</SelectItem>
                <SelectItem value="cards">Cards (Detailed vertical layout)</SelectItem>
                <SelectItem value="list">List (Table-style layout)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Icon Configuration */}
          <div className="space-y-4">
            <Label>Icon & Colors</Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Icon:</Label>
                <Select
                  value={item.selectedIcon}
                  onValueChange={(value) => setItem(prev => ({ ...prev, selectedIcon: value }))}
                >
                  <SelectTrigger className="w-16">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Zap">
                      <Zap className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Thermometer">
                      <Clock className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Droplets">
                      <AlertTriangle className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Gauge">
                      <Target className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Activity">
                      <CheckCircle className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Battery">
                      <Settings className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Wifi">
                      <Wifi className="h-4 w-4" />
                    </SelectItem>
                    <SelectItem value="Shield">
                      <Database className="h-4 w-4" />
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Background:</Label>
                <input
                  type="color"
                  value={item.iconBgColor}
                  onChange={(e) => setItem(prev => ({ ...prev, iconBgColor: e.target.value }))}
                  className="w-8 h-8 rounded border"
                />
              </div>

              <div className="flex items-center gap-2">
                <Label className="text-sm">Icon Color:</Label>
                <input
                  type="color"
                  value={item.iconColor}
                  onChange={(e) => setItem(prev => ({ ...prev, iconColor: e.target.value }))}
                  className="w-8 h-8 rounded border"
                />
              </div>

              {/* Preview */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Preview:</Label>
                <div
                  className="flex items-center justify-center rounded-lg w-10 h-10"
                  style={{
                    backgroundColor: item.iconBgColor,
                    color: item.iconColor,
                  }}
                >
                  {IconComponent && <IconComponent size={20} />}
                </div>
              </div>
            </div>
          </div>

          {/* Status Toggle */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Status</Label>
                <p className="text-sm text-muted-foreground">
                  {item.enabled
                    ? "Item aktif dan akan ditampilkan terlebih dahulu"
                    : "Item tidak aktif dan akan ditampilkan di bagian bawah dengan opacity rendah"
                  }
                </p>
              </div>
              <Switch
                checked={item.enabled}
                onCheckedChange={(checked) =>
                  setItem(prev => ({ ...prev, enabled: checked }))
                }
              />
            </div>
          </div>

          {/* Alarm Threshold */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Alarm Threshold</Label>
              <Switch
                checked={item.alarmThreshold?.enabled || false}
                onCheckedChange={(checked) =>
                  setItem(prev => ({
                    ...prev,
                    alarmThreshold: {
                      ...prev.alarmThreshold,
                      enabled: checked,
                    }
                  }))
                }
              />
            </div>

            {item.alarmThreshold?.enabled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label htmlFor="minThreshold">Minimum Threshold</Label>
                  <Input
                    id="minThreshold"
                    type="number"
                    value={item.alarmThreshold?.min || ""}
                    onChange={(e) => setItem(prev => ({
                      ...prev,
                      alarmThreshold: {
                        min: e.target.value ? parseFloat(e.target.value) : undefined,
                        max: prev.alarmThreshold?.max,
                        enabled: prev.alarmThreshold?.enabled || false,
                      }
                    }))}
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxThreshold">Maximum Threshold</Label>
                  <Input
                    id="maxThreshold"
                    type="number"
                    value={item.alarmThreshold?.max || ""}
                    onChange={(e) => setItem(prev => ({
                      ...prev,
                      alarmThreshold: {
                        min: prev.alarmThreshold?.min,
                        max: e.target.value ? parseFloat(e.target.value) : undefined,
                        enabled: prev.alarmThreshold?.enabled || false,
                      }
                    }))}
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid}>
            {initialItem ? "Update Item" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
