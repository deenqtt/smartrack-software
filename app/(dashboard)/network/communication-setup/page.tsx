"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { showToast } from "@/lib/toast-utils";
import { MqttProvider, useMqtt } from "@/contexts/MqttContext";
import { isEqual, isObject, transform } from "lodash";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Radio, Rss, Settings, CheckCircle, Wifi, Server } from "lucide-react";
import { ProtocolOutSettingsCard } from "@/components/network/ProtocolOutSettingsCard";
import { ModbusSettingsCard } from "@/components/network/ModbusSettingsCard";
import { SnmpSettingsCard } from "@/components/network/SnmpSettingsCard";
import { Card, CardContent } from "@/components/ui/card";

function difference(object: any, base: any) {
  function changes(object: any, base: any) {
    return transform(object, function (result: any, value, key) {
      if (!isEqual(value, base[key])) {
        result[key] = isObject(value) && isObject(base[key]) ? changes(value, base[key]) : value;
      }
    });
  }
  return changes(object, base);
}

interface ProtocolState {
  settings: Record<string, any>;
  initial: Record<string, any>;
  isLoading: boolean;
  hasChanges: boolean;
  isSaving: boolean;
}

const EMPTY_STATE: ProtocolState = { settings: {}, initial: {}, isLoading: true, hasChanges: false, isSaving: false };

const TABS = [
  { key: "protocols", label: "Protocols",  icon: Server,   color: "text-blue-600 dark:text-blue-400",   bg: "data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-950",   border: "data-[state=active]:border-blue-500" },
  { key: "modbus",    label: "MODBUS",     icon: Rss,      color: "text-green-600 dark:text-green-400",  bg: "data-[state=active]:bg-green-100 dark:data-[state=active]:bg-green-950",  border: "data-[state=active]:border-green-500" },
  { key: "snmp",      label: "SNMP",       icon: Settings, color: "text-orange-600 dark:text-orange-400",bg: "data-[state=active]:bg-orange-100 dark:data-[state=active]:bg-orange-950",border: "data-[state=active]:border-orange-500" },
] as const;

type TabKey = typeof TABS[number]["key"];

function CommunicationSetupPage() {
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();
  const subscribed = useRef(false);
  const [activeTab, setActiveTab] = useState<TabKey>("modbus");

  const [states, setStates] = useState<Record<TabKey, ProtocolState>>({
    protocols: { ...EMPTY_STATE },
    modbus:    { ...EMPTY_STATE },
    snmp:      { ...EMPTY_STATE },
  });

  const setProtocol = (key: TabKey, updater: (prev: ProtocolState) => ProtocolState) => {
    setStates((prev) => ({ ...prev, [key]: updater(prev[key]) }));
  };

  const handleMqttMessage = useCallback((topic: string, payloadStr: string) => {
    try {
      const message = JSON.parse(payloadStr);

      if (topic === "IOT/Containment/config/response") {
        const { status, target, config, message: msg } = message;
        const targetMap: Record<string, TabKey> = { protocolout: "protocols", modbus_tcp: "modbus", snmp: "snmp" };
        const key = targetMap[target];
        if (!key) return;

        setProtocol(key, (prev) => {
          if (status === "success") {
            if (config) return { ...prev, settings: config, initial: JSON.parse(JSON.stringify(config)), isLoading: false, hasChanges: false };
            showToast.success("Settings Updated", msg || "Settings updated!");
            return { ...prev, initial: JSON.parse(JSON.stringify(prev.settings)), hasChanges: false, isSaving: false };
          }
          showToast.error("Protocol Error", msg || "An error occurred.");
          return { ...prev, isLoading: false, isSaving: false };
        });
        return;
      }

      // Legacy tibbit/config/response
      const { protocol, data, status, message: msg } = message;
      const legacyMap: Record<string, TabKey> = { PROTOCOL_OUT: "protocols", MODBUS_TCP: "modbus", SNMP: "snmp" };
      const key = legacyMap[protocol];
      if (!key) return;

      setProtocol(key, (prev) => {
        if (status === "success") {
          if (data) return { ...prev, settings: data, initial: JSON.parse(JSON.stringify(data)), isLoading: false, hasChanges: false };
          showToast.success("Settings Saved", msg || "Settings saved!");
          return { ...prev, initial: { ...prev.settings }, hasChanges: false, isSaving: false };
        }
        showToast.error("Protocol Error", msg || "An error occurred.");
        return { ...prev, isLoading: false, isSaving: false };
      });
    } catch (e) {
      console.error(`Error parsing MQTT message from ${topic}:`, e);
    }
  }, []);

  useEffect(() => {
    if (isReady && !subscribed.current) {
      subscribed.current = true;
      subscribe("IOT/Containment/config/response", handleMqttMessage);
      subscribe("tibbit/config/response", handleMqttMessage);

      setTimeout(() => {
        publish("IOT/Containment/config/request", JSON.stringify({ action: "get", target: "protocolout" }));
        publish("IOT/Containment/config/request", JSON.stringify({ action: "get", target: "modbus_tcp" }));
        publish("IOT/Containment/config/request", JSON.stringify({ action: "get", target: "snmp" }));
      }, 500);

      return () => {
        unsubscribe("IOT/Containment/config/response", handleMqttMessage);
        unsubscribe("tibbit/config/response", handleMqttMessage);
        subscribed.current = false;
      };
    }
  }, [isReady, publish, subscribe, unsubscribe, handleMqttMessage]);

  const handleChange = (key: TabKey, changed: Record<string, any>) => {
    setProtocol(key, (prev) => {
      const newSettings = { ...prev.settings, ...changed };
      return { ...prev, settings: newSettings, hasChanges: !isEqual(newSettings, prev.initial) };
    });
  };

  const handleSave = (key: TabKey, savedSettings?: Record<string, any>) => {
    if (!isReady) { showToast.error("MQTT Error", "MQTT not connected."); return; }
    const current = savedSettings || states[key].settings;
    const updates = difference(current, states[key].initial);
    if (Object.keys(updates).length === 0) { showToast.info("No Changes", "No changes to save."); return; }
    setProtocol(key, (p) => ({ ...p, isSaving: true }));
    const targetMap: Record<TabKey, string> = { protocols: "protocolout", modbus: "modbus_tcp", snmp: "snmp" };
    publish("IOT/Containment/config/request", JSON.stringify({ action: "update", target: targetMap[key], config: updates }));
  };

  const handleReset = (key: TabKey) => {
    setProtocol(key, (prev) => ({ ...prev, settings: { ...prev.initial }, hasChanges: false }));
    showToast.info("Reset", "Changes have been reset.");
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Radio className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Communication Setup</h1>
            <p className="text-sm text-muted-foreground">Manage industrial communication protocol configurations</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-card text-sm font-medium">
          {isReady
            ? <><CheckCircle className="h-4 w-4 text-green-500" /><span className="text-green-600 dark:text-green-400">Connected</span></>
            : <><Wifi className="h-4 w-4 text-yellow-500 animate-pulse" /><span className="text-yellow-600 dark:text-yellow-400">Connecting</span></>
          }
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabKey)} className="space-y-4">
        <TabsList className="flex w-full bg-card p-2 rounded-xl shadow-sm border h-auto gap-2">
          {TABS.map(({ key, label, icon: Icon, color, bg, border }) => (
            <TabsTrigger
              key={key}
              value={key}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold text-sm transition-all border border-transparent ${color} ${bg} ${border} data-[state=active]:shadow-sm hover:bg-muted/50`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span>{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <Card>
          <CardContent className="p-0">
            <TabsContent value="protocols" className="m-0">
              <div className="p-4 sm:p-6 md:p-8">
                <ProtocolOutSettingsCard
                  settings={states.protocols.settings}
                  isLoading={states.protocols.isLoading}
                  onSettingsChange={(c) => handleChange("protocols", c)}
                  onSave={(s) => handleSave("protocols", s)}
                  onReset={() => handleReset("protocols")}
                />
              </div>
            </TabsContent>

            <TabsContent value="modbus" className="m-0">
              <div className="p-4 sm:p-6 md:p-8">
                <ModbusSettingsCard
                  settings={states.modbus.settings}
                  isLoading={states.modbus.isLoading}
                  onSettingsChange={(c) => handleChange("modbus", c)}
                  onSave={(s) => handleSave("modbus", s)}
                  onReset={() => handleReset("modbus")}
                />
              </div>
            </TabsContent>

            <TabsContent value="snmp" className="m-0">
              <div className="p-4 sm:p-6 md:p-8">
                <SnmpSettingsCard
                  settings={states.snmp.settings}
                  isLoading={states.snmp.isLoading}
                  onSettingsChange={(c) => handleChange("snmp", c)}
                  onSave={(s) => handleSave("snmp", s)}
                  onReset={() => handleReset("snmp")}
                />
              </div>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}

export default function CommunicationSetupPageWithProvider() {
  return (
    <MqttProvider>
      <CommunicationSetupPage />
    </MqttProvider>
  );
}
