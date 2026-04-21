"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMqtt } from "@/contexts/MqttContext";
import { showToast } from "@/lib/toast-utils";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";

// --- UI Components & Icons ---
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Cable,
  Radio,
  AlertCircle,
  Server,
  RefreshCw,
  Activity,
  Globe,
  ShieldCheck,
  Settings2,
  Database,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Import Components ---
import { EthernetSettingsCard } from "@/components/network/EthernetSettingsCard";

// --- Type Definitions ---
interface ModbusSettings {
  modbusTCP_IP: string;
  modbusTCP_Port: number | string;
}

// --- Mock Data Fallbacks ---
const MOCK_NETWORK_CONFIG = {
  eth0: {
    interface: "eth0",
    method: "static",
    ip_address: "192.168.10.50",
    static_ip: "192.168.10.50",
    netmask: "255.255.255.0",
    gateway: "192.168.10.1",
    dns: "8.8.8.8"
  }
};

const MOCK_MODBUS_SETTINGS = {
  modbusTCP_IP: "192.168.10.51",
  modbusTCP_Port: 502
};

const MOCK_MODBUS_STATUS = "CONNECTED";

// =================================================================
// --- Main Page Component ---
// =================================================================
function NetworkSettingsPage() {
  const { canView } = useMenuItemPermissions("network-settings");
  const { loading: menuLoading } = useMenu();
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();

  // State hooks
  const [networkConfig, setNetworkConfig] = useState<any>(null);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(true);
  const [modbusSettings, setModbusSettings] = useState<ModbusSettings | null>(null);
  const [isLoadingModbus, setIsLoadingModbus] = useState(true);
  const [modbusStatus, setModbusStatus] = useState<any>(null);

  // Access Control
  const hasAccess = !menuLoading && canView;

  // =================================================================
  // MQTT Message Handler
  // =================================================================
  const handleMqttMessage = useCallback(
    (topic: string, payloadStr: string) => {
      try {
        const data = JSON.parse(payloadStr);

        switch (topic) {
          case "rpi/network/response":
            if (data.action === "get_network_config") {
              setNetworkConfig(data.network_config);
              setIsLoadingNetwork(false);
            } else if (data.action === "set_network_config") {
              if (data.status === "success") {
                showToast.success(`Configuration Applied: ${data.message}`);
                setTimeout(() => publish("rpi/network/get", "{}"), 2000);
              } else {
                showToast.error(`Configuration Failed: ${data.message}`);
              }
            }
            break;

          case "IOT/Containment/modbustcp/setting/data":
            setModbusSettings({
              modbusTCP_IP: data.modbus_tcp_ip,
              modbusTCP_Port: data.modbus_tcp_port,
            });
            setIsLoadingModbus(false);
            break;

          case "IOT/Containment/modbustcp/status":
            setModbusStatus(data.modbusTCPStatus);
            break;
        }
      } catch (e) {
        console.error(`Error parsing MQTT message from ${topic}:`, e);
      }
    },
    [publish]
  );

  // =================================================================
  // Subscribe to MQTT Topics on Mount
  // =================================================================
  useEffect(() => {
    if (isReady) {
      const topics = ["rpi/network/response", "IOT/Containment/modbustcp/setting/data", "IOT/Containment/modbustcp/status"];
      topics.forEach((t) => subscribe(t, handleMqttMessage));

      publish("rpi/network/get", "{}");
      publish("IOT/Containment/modbustcp/setting/command", JSON.stringify({ command: "read" }));

      return () => topics.forEach((t) => unsubscribe(t, handleMqttMessage));
    }
  }, [isReady, publish, subscribe, unsubscribe, handleMqttMessage]);

  const handleConfigureEthernet = (payload: any) => {
    publish("rpi/network/set", JSON.stringify(payload));
  };

  const handleRefreshAll = () => {
    if (!isReady) {
      showToast.error("MQTT not connected.");
      return;
    }
    showToast.info("Refreshing network data...");
    publish("rpi/network/get", "{}");
    publish("IOT/Containment/modbustcp/setting/command", JSON.stringify({ command: "read" }));
  };

  // Data Fallback Logic
  const displayNetworkConfig = networkConfig || MOCK_NETWORK_CONFIG;
  const displayModbusSettings = modbusSettings || MOCK_MODBUS_SETTINGS;
  const displayModbusStatus = modbusStatus || MOCK_MODBUS_STATUS;
  const isMockData = !networkConfig && !modbusSettings;

  const networkStats = useMemo(() => ({
    ethernetConfigured: !!(networkConfig && Object.keys(networkConfig).length > 0),
    modbusConfigured: !!(modbusSettings && Object.keys(modbusSettings).length > 0),
    ipAddress: displayNetworkConfig?.eth0?.static_ip || displayNetworkConfig?.eth0?.ip_address || "N/A"
  }), [networkConfig, modbusSettings, displayNetworkConfig]);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="p-4 bg-muted rounded-full">
          <AlertCircle className="h-10 w-10 text-muted-foreground" />
        </div>
        <h2 className="text-2xl font-bold">Access Denied</h2>
        <p className="text-muted-foreground max-w-md">You don't have the required permissions to view or manage network configurations.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-4 sm:p-6 lg:p-8 space-y-8 ">
        {/* Header Section */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between border-b pb-8 border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Globe className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight uppercase">Network Architecture</h1>
            </div>
            <p className="text-muted-foreground ml-11">Infrastructure connectivity and protocol interface management</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 ml-11 md:ml-0">
            {isMockData && (
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 px-3 py-1 gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                <Database className="h-3 w-3" />
                Demo Mode Active
              </Badge>
            )}
            <Badge variant={isReady ? "default" : "destructive"} className="px-3 py-1 gap-1.5 font-mono text-xs uppercase tracking-wider">
              <Activity className={`h-3.5 w-3.5 ${isReady ? "animate-pulse" : ""}`} />
              MQTT: {isReady ? "Synchronized" : "Disconnected"}
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={!isReady} className="h-9 gap-2 bg-background/50 backdrop-blur-sm">
              <RefreshCw className="h-4 w-4" />
              <span>SYNC DATA</span>
            </Button>
          </div>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

          {/* Main Configuration Area */}
          <div className="xl:col-span-2 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Cable className="h-5 w-5 text-blue-500" />
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Ethernet Interface Configuration</h2>
              </div>

              <EthernetSettingsCard
                networkConfig={displayNetworkConfig}
                isLoading={isLoadingNetwork && !networkConfig}
                onConfigure={handleConfigureEthernet}
              />
            </section>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-4 items-start"
            >
              <div className="p-2 bg-amber-500/10 rounded-lg shrink-0 mt-1">
                <AlertCircle className="h-5 w-5 text-amber-500" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-amber-600 dark:text-amber-400 text-sm uppercase">Operational Warning</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Modifying IP assignments or gateway settings will trigger a network interface restart. This may cause a temporary loss of connectivity to the management console. Ensure local serial access is available if configuring remote gateways.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Sidebar Status Area */}
          <div className="space-y-8">
            <Card className="border-0 shadow-2xl bg-slate-900 text-white overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs font-black uppercase tracking-[0.2em] opacity-60">System Connectivity</CardTitle>
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 font-medium">Core IP Address</span>
                    <span className="font-mono text-emerald-400">{networkStats.ipAddress}</span>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 font-medium">Ethernet Node</span>
                    <Badge variant="outline" className="border-white/20 text-white font-mono text-[10px]">
                      {networkStats.ethernetConfigured ? "VALIDATED" : "OFFLINE_MOCK"}
                    </Badge>
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-white/40 font-medium">Modbus TCP/IP</span>
                    <Badge variant="outline" className="border-white/20 text-white font-mono text-[10px]">
                      {networkStats.modbusConfigured ? "ACTIVE" : "STANDBY"}
                    </Badge>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-center gap-2 opacity-60">
                      <Server className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Environment Meta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">TCP Port</p>
                        <p className="text-sm font-mono mt-0.5">{displayModbusSettings?.modbusTCP_Port || "502"}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase font-black">Status</p>
                        <p className="text-sm font-mono mt-0.5 text-emerald-500">{displayModbusStatus || "IDLE"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">Advanced Parameters</h3>
              </div>
              <div className="grid gap-3">
                <div className="p-4 bg-background border rounded-xl hover:border-primary/30 transition-colors group cursor-not-allowed opacity-60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold opacity-80">SNMP Community</p>
                        <p className="text-[10px] text-muted-foreground">Standardized V2c Strings</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[8px] h-4">LEGACY</Badge>
                  </div>
                </div>

                <div className="p-4 bg-background border rounded-xl hover:border-primary/30 transition-colors group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/5 rounded-lg">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold">Network Firewall</p>
                        <p className="text-[10px] text-muted-foreground">Internal Rule Chain</p>
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default NetworkSettingsPage;
