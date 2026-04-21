// File: components/widgets/MqttKeyStatusCard/MqttKeyStatusCardConfigModal.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/lib/toast-utils";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2, PlusCircle, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { iconList } from "@/components/icon/IconPicker";
import type { MqttKeyItem } from "./MqttKeyStatusCardWidget";

interface MqttDevice {
  profile: { name: string; topic: string; part_number?: string };
}

interface ItemDraft extends MqttKeyItem {
  id: string;
  expanded: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

const makeItem = (): ItemDraft => ({
  id: `item-${Date.now()}-${Math.random()}`,
  customName: "",
  selectedKey: "",
  useCondition: true,
  onValue: "true",
  offValue: "false",
  onLabel: "ON",
  offLabel: "OFF",
  selectedIcon: "Zap",
  iconColor: "#FFFFFF",
  iconBgColor: "#3B82F6",
  multiply: 1,
  units: "",
  expanded: true,
});

export const MqttKeyStatusCardConfigModal = ({ isOpen, onClose, onSave, initialConfig }: Props) => {
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  const [widgetTitle, setWidgetTitle] = useState("");
  const [deviceType, setDeviceType] = useState<"modbus" | "i2c" | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<MqttDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<MqttDevice | null>(null);
  const [availableKeys, setAvailableKeys] = useState<string[]>([]);
  const [isWaitingForKey, setIsWaitingForKey] = useState(false);
  const [items, setItems] = useState<ItemDraft[]>([makeItem()]);

  const isEditMode = !!initialConfig;
  const isMulti = items.length > 1;

  const responseTopicRef = useRef<string | null>(null);
  const keySubTopicRef = useRef<string | null>(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    if (initialConfig) {
      setWidgetTitle(initialConfig.widgetTitle || "");
      // Normalize from either format
      const srcItems: MqttKeyItem[] = initialConfig.items?.length
        ? initialConfig.items
        : [{
            customName: initialConfig.customName || "",
            selectedKey: initialConfig.selectedKey || "",
            useCondition: initialConfig.useCondition ?? false,
            onValue: initialConfig.onValue || "true",
            offValue: initialConfig.offValue || "false",
            onLabel: initialConfig.onLabel || "ON",
            offLabel: initialConfig.offLabel || "OFF",
            selectedIcon: initialConfig.selectedIcon || "Zap",
            iconColor: initialConfig.iconColor || "#FFFFFF",
            iconBgColor: initialConfig.iconBgColor || "#3B82F6",
            multiply: initialConfig.multiply ?? 1,
            units: initialConfig.units || "",
          }];
      setItems(srcItems.map((it, i) => ({ ...it, id: `item-${Date.now()}-${i}`, expanded: false })));
      // Pre-seed known keys
      const knownKeys = srcItems.map((it) => it.selectedKey).filter(Boolean);
      if (knownKeys.length) setAvailableKeys([...new Set(knownKeys)]);
      if (initialConfig.deviceTopic) {
        setSelectedDevice({ profile: { name: initialConfig.widgetTitle || "", topic: initialConfig.deviceTopic } });
      }
    } else {
      setWidgetTitle("");
      setDeviceType(null);
      setDiscoveredDevices([]);
      setSelectedDevice(null);
      setAvailableKeys([]);
      setItems([makeItem()]);
    }
  }, [isOpen, initialConfig]);

  // ── Discover devices via MQTT ─────────────────────────────────────────────
  useEffect(() => {
    if (!deviceType || !isReady) return;
    const commandTopic = deviceType === "modbus" ? "command_device_modbus" : "command_device_i2c";
    const responseTopic = deviceType === "modbus" ? "response_device_modbus" : "response_device_i2c";
    setDiscoveredDevices([]); setSelectedDevice(null); setAvailableKeys([]); setIsLoadingDevices(true);
    let active = true;
    const handler = (_topic: string, message: string, retained?: boolean) => {
      if (!active || retained) return;
      try {
        const parsed = JSON.parse(message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDiscoveredDevices(parsed.map((d: any) => ({ ...d, profile: d.profile || { name: d.name, topic: d.topic } })));
          setIsLoadingDevices(false);
          unsubscribe(responseTopic, handler);
          active = false;
        }
      } catch {}
    };
    subscribe(responseTopic, handler);
    responseTopicRef.current = responseTopic;
    publish(commandTopic, JSON.stringify({ command: deviceType === "modbus" ? "getDataModbus" : "getDataI2C" }));
    const timeout = setTimeout(() => { if (active) { setIsLoadingDevices(false); unsubscribe(responseTopic, handler); showToast.error("Timeout", "Device list fetch timed out."); } }, 5000);
    return () => { active = false; clearTimeout(timeout); if (responseTopicRef.current) { unsubscribe(responseTopicRef.current, handler); } };
  }, [deviceType, isReady, publish, subscribe, unsubscribe]);

  // ── Discover keys from live topic ─────────────────────────────────────────
  const handleKeyResponse = useCallback((topic: string, payloadString: string) => {
    try {
      const payload = JSON.parse(payloadString);
      const inner = typeof payload.value === "string" ? JSON.parse(payload.value) : payload.value || {};
      setAvailableKeys((prev) => [...new Set([...prev, ...Object.keys(inner)])]);
    } catch {} finally {
      setIsWaitingForKey(false);
      unsubscribe(topic, handleKeyResponse);
      keySubTopicRef.current = null;
    }
  }, [unsubscribe]);

  useEffect(() => {
    const topic = selectedDevice?.profile.topic;
    if (keySubTopicRef.current && keySubTopicRef.current !== topic) { unsubscribe(keySubTopicRef.current, handleKeyResponse); keySubTopicRef.current = null; }
    if (topic && topic !== keySubTopicRef.current) {
      if (!isEditMode) setAvailableKeys([]);
      setIsWaitingForKey(true);
      subscribe(topic, handleKeyResponse);
      keySubTopicRef.current = topic;
    }
  }, [selectedDevice, subscribe, unsubscribe, handleKeyResponse, isEditMode]);

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateItem = (id: string, field: keyof ItemDraft, value: any) =>
    setItems((prev) => prev.map((it) => it.id === id ? { ...it, [field]: value } : it));
  const addItem = () => setItems((prev) => [...prev, makeItem()]);
  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));
  const toggleExpand = (id: string) => {
    const item = items.find((it) => it.id === id);
    if (item) updateItem(id, "expanded", !item.expanded);
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (!widgetTitle) { showToast.warning("Incomplete", "Widget title is required."); return; }
    if (!selectedDevice) { showToast.warning("Incomplete", "Device is required."); return; }
    for (const item of items) {
      if (!item.selectedKey) { showToast.warning("Incomplete", `An item is missing a key selection.`); return; }
    }

    const cleanItems = items.map(({ id, expanded, ...rest }) => ({ ...rest, multiply: Number(rest.multiply) || 1 }));

    if (cleanItems.length === 1) {
      // Save in single-key format for backward compat
      const it = cleanItems[0];
      onSave({ widgetTitle, deviceTopic: selectedDevice.profile.topic, selectedKey: it.selectedKey, useCondition: it.useCondition, onValue: it.onValue, offValue: it.offValue, onLabel: it.onLabel, offLabel: it.offLabel, selectedIcon: it.selectedIcon, iconColor: it.iconColor, iconBgColor: it.iconBgColor, multiply: it.multiply, units: it.units });
    } else {
      // Save in multi-key format
      onSave({ widgetTitle, deviceTopic: selectedDevice.profile.topic, items: cleanItems });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="text-xl">{isEditMode ? "Edit MQTT Status Card" : "Configure MQTT Status Card"}</DialogTitle>
          <DialogDescription>Select a device and configure one or more keys to monitor.</DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4 max-h-[72vh] overflow-y-auto">
          {/* Widget title */}
          <div className="grid gap-2">
            <Label>Widget Title</Label>
            <Input value={widgetTitle} onChange={(e) => setWidgetTitle(e.target.value)} placeholder="e.g., Door Status" />
          </div>

          {/* Device type + device selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Device Type</Label>
              <Select onValueChange={(v) => setDeviceType(v as any)} value={deviceType || ""}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="modbus">Modbus</SelectItem>
                  <SelectItem value="i2c">Modular / Modbit (I2C)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Device</Label>
              {isLoadingDevices ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground h-10"><Loader2 className="h-4 w-4 animate-spin" /> Discovering...</div>
              ) : (
                <Select onValueChange={(topic) => { const d = discoveredDevices.find((d) => d.profile.topic === topic); setSelectedDevice(d || null); }} value={selectedDevice?.profile.topic || ""} disabled={!deviceType || discoveredDevices.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select a device" /></SelectTrigger>
                  <SelectContent>{discoveredDevices.map((d) => <SelectItem key={d.profile.topic} value={d.profile.topic}>{d.profile.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
              {isWaitingForKey && <p className="text-xs text-blue-600 animate-pulse">Waiting for live data...</p>}
              {availableKeys.length > 0 && !isWaitingForKey && <p className="text-xs text-green-600">{availableKeys.length} keys available</p>}
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Keys ({items.length})</Label>
            {items.map((item, idx) => (
              <div key={item.id} className="border rounded-lg overflow-hidden">
                {/* Item header */}
                <div className="flex items-center justify-between px-3 py-2 bg-muted/40 cursor-pointer select-none" onClick={() => toggleExpand(item.id)}>
                  <span className="text-sm font-medium truncate">
                    {item.customName || `Key ${idx + 1}`}
                    {item.selectedKey ? ` — ${item.selectedKey}` : ""}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {items.length > 1 && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                    {item.expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {item.expanded && (
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Custom name (only shown in multi mode) */}
                      {isMulti && (
                        <div className="grid gap-2">
                          <Label>Custom Name</Label>
                          <Input value={item.customName || ""} onChange={(e) => updateItem(item.id, "customName", e.target.value)} placeholder="e.g., Front Door" />
                        </div>
                      )}
                      {/* Key */}
                      <div className="grid gap-2">
                        <Label>Data Key</Label>
                        <Select onValueChange={(v) => updateItem(item.id, "selectedKey", v)} value={item.selectedKey || ""} disabled={!selectedDevice || availableKeys.length === 0}>
                          <SelectTrigger><SelectValue placeholder={isWaitingForKey ? "Waiting..." : "Select key"} /></SelectTrigger>
                          <SelectContent>{availableKeys.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Condition toggle */}
                    <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/40">
                      <div>
                        <p className="text-sm font-medium">Condition Mode</p>
                        <p className="text-xs text-muted-foreground">{item.useCondition ? "Compare value → show ON/OFF label" : "Show raw value directly"}</p>
                      </div>
                      <Switch checked={!!item.useCondition} onCheckedChange={(v) => updateItem(item.id, "useCondition", v)} />
                    </div>

                    {/* Condition fields */}
                    {item.useCondition ? (
                      <div className="grid grid-cols-2 gap-3 p-3 border rounded-lg bg-muted/30">
                        <div className="space-y-1">
                          <Label className="text-xs text-emerald-600 font-semibold">ON if value =</Label>
                          <Input value={item.onValue || ""} onChange={(e) => updateItem(item.id, "onValue", e.target.value)} placeholder="1, true, yes…" className="border-emerald-300 focus-visible:ring-emerald-400" />
                          <Label className="text-xs text-muted-foreground">Label when ON</Label>
                          <Input value={item.onLabel || ""} onChange={(e) => updateItem(item.id, "onLabel", e.target.value)} placeholder="ON, OPEN, ACTIVE…" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 font-semibold">OFF if value =</Label>
                          <Input value={item.offValue || ""} onChange={(e) => updateItem(item.id, "offValue", e.target.value)} placeholder="0, false, no…" />
                          <Label className="text-xs text-muted-foreground">Label when OFF</Label>
                          <Input value={item.offLabel || ""} onChange={(e) => updateItem(item.id, "offLabel", e.target.value)} placeholder="OFF, CLOSED…" />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2"><Label>Units</Label><Input value={item.units || ""} onChange={(e) => updateItem(item.id, "units", e.target.value)} placeholder="°C, V, A…" /></div>
                        <div className="grid gap-2"><Label>Multiplier</Label><Input type="number" value={String(item.multiply ?? 1)} onChange={(e) => updateItem(item.id, "multiply", parseFloat(e.target.value) || 1)} /></div>
                      </div>
                    )}

                    {/* Appearance */}
                    <div className="pt-2 border-t space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Appearance</Label>
                      <div className="grid grid-cols-6 sm:grid-cols-8 gap-1 max-h-[100px] overflow-y-auto p-1 border rounded">
                        {iconList.map(({ name, icon: Icon }) => (
                          <button key={name} onClick={() => updateItem(item.id, "selectedIcon", name)}
                            className={`flex items-center justify-center p-1.5 rounded transition-all ${item.selectedIcon === name ? "ring-2 ring-primary bg-primary/10" : "bg-muted hover:bg-muted/80"}`}>
                            <Icon className="h-4 w-4" />
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1"><Label className="text-xs">Icon Color</Label><Input type="color" value={item.iconColor || "#FFFFFF"} onChange={(e) => updateItem(item.id, "iconColor", e.target.value)} className="h-9" /></div>
                        <div className="grid gap-1"><Label className="text-xs">Background</Label><Input type="color" value={item.iconBgColor || "#3B82F6"} onChange={(e) => updateItem(item.id, "iconBgColor", e.target.value)} className="h-9" /></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <Button variant="outline" onClick={addItem} className="w-full" disabled={!selectedDevice}>
              <PlusCircle className="h-4 w-4 mr-2" /> Add Another Key
            </Button>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 sm:justify-end">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" onClick={handleSave}>{isEditMode ? "Update Widget" : "Save Widget"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
