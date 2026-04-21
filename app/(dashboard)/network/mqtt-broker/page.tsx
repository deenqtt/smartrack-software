// File: app/(dashboard)/network/mqtt-broker/page.tsx

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import { showToast } from "@/lib/toast-utils";
import { useMQTTStatus } from "@/hooks/useMQTTStatus";
import { useMqttServerStatus } from "@/hooks/useMqttServerStatus";
import { getEnvMQTTBrokerUrl } from "@/lib/mqtt-config";
import AccessDenied from "@/components/AccessDenied";
import MqttStatus from "@/components/mqtt-status";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2,
  Wifi,
  WifiOff,
  Settings,
  Server,
  KeyRound,
  Database,
  Cpu,
  RefreshCw,
  Activity,
  Zap,
  ShieldCheck,
  AlertCircle,
  Copy,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- Type Definitions ---
interface MqttConfigBase {
  broker_address: string;
  broker_port: number;
  username: string;
  password: string;
  mac_address?: string;
}

interface ConnectionStatus {
  status: string;
  response_time?: number;
  message?: string;
}

interface MqttConfigResponse {
  status: string;
  data: MqttConfigBase;
  connection: ConnectionStatus;
  timestamp: string;
}

// --- Helper Functions ---
const formatLabel = (key: string) => {
  return key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "connected":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "connecting":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "error":
    case "disconnected":
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    default:
      return "text-slate-500 bg-slate-500/10 border-slate-500/20";
  }
};

// =================================================================
// Sub-Components
// =================================================================

const StatCard = ({ title, value, subValue, icon: Icon, colorClass, description }: any) => (
  <Card className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:shadow-md h-full">
    <div className={cn("absolute top-0 right-0 p-6 opacity-[0.05] transition-transform duration-500 group-hover:scale-110", colorClass)}>
      <Icon className="h-20 w-20" />
    </div>
    <CardHeader className="pb-2">
      <CardDescription className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-black tracking-tight">{value}</span>
        {subValue && <span className="text-sm font-bold text-muted-foreground">{subValue}</span>}
      </div>
      {description && (
        <p className={cn("mt-2 flex items-center gap-1.5 text-[10px] font-bold uppercase", colorClass)}>
          {description}
        </p>
      )}
    </CardContent>
  </Card>
);

const ConfigField = ({ label, value, isMonospaced = false }: { label: string; value: any; isMonospaced?: boolean }) => {
  const isPassword = label.toLowerCase().includes("password");
  const isEmpty = value === null || value === undefined || String(value).trim() === "";

  return (
    <div className="space-y-1.5 p-3 rounded-xl border border-border/30 bg-muted/20 transition-colors hover:bg-muted/40">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {formatLabel(label)}
      </span>
      <div className={cn(
        "text-sm font-bold truncate",
        isMonospaced && "font-mono text-[11px]",
        isPassword && "text-primary tracking-widest"
      )}>
        {isEmpty ? (
          <span className="text-muted-foreground/50 font-medium italic">Empty</span>
        ) : isPassword ? (
          "••••••••"
        ) : (
          String(value)
        )}
      </div>
    </div>
  );
};

// Reusable Config Card for Modbus/Modular
const DeviceConfigCard = ({
  title,
  icon: Icon,
  config,
  connection,
  isLoading,
  onEdit,
  description,
  colorScheme = "blue"
}: any) => {
  const isConnected = connection?.status === "connected";
  const accentColor = colorScheme === "blue" ? "text-blue-500" : "text-emerald-500";
  const bgColor = colorScheme === "blue" ? "bg-blue-500/10" : "bg-emerald-500/10";

  return (
    <Card className="overflow-hidden border-border/50 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="border-b border-border/50 pb-4 bg-muted/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-xl", bgColor)}>
              <Icon className={cn("h-5 w-5", accentColor)} />
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight">{title}</CardTitle>
              <CardDescription className="text-[10px] font-bold uppercase tracking-wider">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {connection && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider",
                getStatusColor(connection.status)
              )}>
                {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                {isConnected ? "Connected" : "Disconnected"}
              </div>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onEdit} disabled={isLoading}>
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : config ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ConfigField label="Broker" value={`${config.broker_address}:${config.broker_port}`} isMonospaced />
            <ConfigField label="Username" value={config.username} />
            <ConfigField label="MAC Address" value={config.mac_address} isMonospaced />
            <ConfigField label="Authentication" value={config.password ? "Enabled" : "Disabled"} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
            <Icon className="h-10 w-10 mb-2" />
            <p className="text-xs font-bold uppercase tracking-widest">No Configuration Loaded</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =================================================================
// Edit Dialog Component
// =================================================================
const ConfigEditDialog = ({ isOpen, onOpenChange, title, initialConfig, onSave, isSubmitting }: any) => {
  const [formData, setFormData] = useState<MqttConfigBase>({
    broker_address: "",
    broker_port: 1883,
    username: "",
    password: "",
  });

  useEffect(() => {
    if (initialConfig && isOpen) {
      setFormData({
        broker_address: initialConfig.broker_address || "",
        broker_port: initialConfig.broker_port || 1883,
        username: initialConfig.username || "",
        password: initialConfig.password || "",
      });
    }
  }, [isOpen, initialConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] gap-6 rounded-[24px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit {title}</DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium">
            Configure the MQTT broker connection parameters for this device group.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-2">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="address" className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground col-span-1">Broker</Label>
            <Input id="address" className="col-span-3 rounded-xl" placeholder="localhost" value={formData.broker_address} onChange={(e) => setFormData({ ...formData, broker_address: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="port" className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground col-span-1">Port</Label>
            <Input id="port" type="number" className="col-span-3 rounded-xl" placeholder="1883" value={formData.broker_port} onChange={(e) => setFormData({ ...formData, broker_port: parseInt(e.target.value) || 0 })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="user" className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground col-span-1">User</Label>
            <Input id="user" className="col-span-3 rounded-xl" placeholder="MQTT Username" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pass" className="text-right text-[10px] font-black uppercase tracking-widest text-muted-foreground col-span-1">Pass</Label>
            <Input id="pass" type="password" className="col-span-3 rounded-xl" placeholder="••••••••" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="sm:justify-end gap-2">
          <Button variant="outline" className="rounded-xl px-6" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-xl px-6" onClick={() => onSave(formData)} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =================================================================
// Main Page component
// =================================================================
export default function MqttBrokerPage() {
  const { canView, canUpdate } = useMenuItemPermissions('network-mqtt-broker');
  const { loading: menuLoading } = useMenu();
  const { isReady, publish, subscribe, unsubscribe } = useMqtt();
  const status = useMQTTStatus(); // App connection status
  const serverStatus = useMqttServerStatus(); // System brokers status
  const wrapperRef = useRef<HTMLDivElement>(null);

  // States
  const [modbusConfig, setModbusConfig] = useState<MqttConfigBase | null>(null);
  const [modbusConnection, setModbusConnection] = useState<ConnectionStatus | null>(null);
  const [isModbusLoading, setIsModbusLoading] = useState(true);
  const [isModbusModalOpen, setIsModbusModalOpen] = useState(false);

  const [modularConfig, setModularConfig] = useState<MqttConfigBase | null>(null);
  const [modularConnection, setModularConnection] = useState<ConnectionStatus | null>(null);
  const [isModularLoading, setIsModularLoading] = useState(true);
  const [isModularModalOpen, setIsModularModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [brokerUrl, setBrokerUrl] = useState<string>("");
  const [isReloading, setIsReloading] = useState(false);

  // Connection parsing for core config
  const connectionDetails = useMemo(() => {
    try {
      const url = getEnvMQTTBrokerUrl();
      const urlObj = new URL(url);
      return {
        url,
        host: urlObj.hostname,
        port: urlObj.port || (url.startsWith("wss") || url.startsWith("https") ? "443" : "80"),
        protocol: urlObj.protocol.replace(":", ""),
      };
    } catch {
      return { url: "", host: "N/A", port: "N/A", protocol: "N/A" };
    }
  }, []);

  useEffect(() => { setBrokerUrl(connectionDetails.url); }, [connectionDetails]);

  // MQTT Subscriptions for Modbus & Modular
  useEffect(() => {
    if (!isReady) return;

    const handler = (setCfg: any, setConn: any, setLoad: any) => (topic: string, payloadStr: string) => {
      try {
        const response: MqttConfigResponse = JSON.parse(payloadStr);
        if (response.status === "success" && response.data) {
          setCfg(response.data);
          setConn(response.connection);
        }
      } catch (e) { console.error("MQTT Parse Error:", e); }
      finally { setLoad(false); }
    };

    const modbusHook = handler(setModbusConfig, setModbusConnection, setIsModbusLoading);
    const modularHook = handler(setModularConfig, setModularConnection, setIsModularLoading);

    subscribe("mqtt_config/modbus/response", modbusHook);
    subscribe("mqtt_config/modular/response", modularHook);

    const timer = setTimeout(() => {
      setIsModbusLoading(false);
      setIsModularLoading(false);
    }, 8000);

    return () => {
      clearTimeout(timer);
      unsubscribe("mqtt_config/modbus/response", modbusHook);
      unsubscribe("mqtt_config/modular/response", modularHook);
    };
  }, [isReady, subscribe, unsubscribe]);

  const handleSave = (type: 'modbus' | 'modular', config: MqttConfigBase) => {
    setIsSubmitting(true);
    const topic = `mqtt_config/${type}/command`;
    const command = type === 'modbus' ? 'updateMqttModbus' : 'updateMqttModular';

    publish(topic, JSON.stringify({ command, data: config }));

    setTimeout(() => {
      setIsSubmitting(false);
      type === 'modbus' ? setIsModbusModalOpen(false) : setIsModularModalOpen(false);
      showToast.success(`${type.toUpperCase()} Config Updated`, "MQTT configuration refresh pending...");
    }, 500);
  };

  const handleReload = async () => {
    setIsReloading(true);
    try {
      await fetch("/api/mqtt-config/reload", { method: "POST" });
      await serverStatus.refresh();
      showToast.success("System Reloaded", "Successfully refreshed core broker settings.");
    } catch {
      showToast.error("Reload Failed", "Could not refresh MQTT configuration.");
    } finally { setIsReloading(false); }
  };

  if (!menuLoading && !canView) return <AccessDenied />;

  const statusSummary = serverStatus.getSummary();

  return (
    <TooltipProvider>
      <div ref={wrapperRef} className="p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen bg-transparent">

        {/* Unified Header */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-[20px] bg-primary/10 p-3 shadow-inner">
              <Activity className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">
                MQTT <span className="text-primary italic">Broker</span> Interface
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/80">
                System telemetry & distributed node management
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/50 backdrop-blur-md">
            <MqttStatus />
            <div className="h-6 w-px bg-border/50 mx-1" />
            <Button
              variant="default"
              size="sm"
              onClick={handleReload}
              disabled={isReloading || serverStatus.loading}
              className="rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-bold text-[10px] uppercase tracking-wider"
            >
              {isReloading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-2 h-3.5 w-3.5" />}
              Sync Assets
            </Button>
          </div>
        </header>

        {/* Unified Stats Row */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Nodes Health"
            value={statusSummary.connected}
            subValue={`/ ${statusSummary.total}`}
            icon={Server}
            colorClass="text-emerald-500"
            description={
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Active Clusters Online
              </>
            }
          />
          <StatCard
            title="Telemetric Flow"
            value={serverStatus.servers.reduce((acc, s) => acc + s.messageCount, 0).toLocaleString()}
            icon={Zap}
            colorClass="text-blue-500"
            description="Pkts processed (Real-time)"
          />
          <StatCard
            title="Data Throughput"
            value={(serverStatus.servers.reduce((acc, s) => acc + s.bytesSent + s.bytesReceived, 0) / 1024).toFixed(1)}
            subValue="KB"
            icon={Database}
            colorClass="text-purple-500"
            description="Aggregate I/O volume"
          />
          <StatCard
            title="System Connection"
            value={isReady ? "READY" : "OFFLINE"}
            icon={isReady ? Wifi : WifiOff}
            colorClass={isReady ? "text-primary" : "text-rose-500"}
            description={isReady ? "Internal Bus Connected" : "Connection Error Detected"}
          />
        </section>

        {/* Navigation Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <div className="flex items-center justify-center sm:justify-start">
            <TabsList className="bg-muted/50 p-1 rounded-2xl border border-border/50 h-auto">
              <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
                <Activity className="h-3.5 w-3.5 mr-2" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="configuration" className="rounded-xl px-6 py-2.5 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground shadow-sm">
                <Settings className="h-3.5 w-3.5 mr-2" />
                Configurations
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Monitoring Section (Left Side) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Active Node Clusters</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                    <Clock className="h-3 w-3" />
                    Sync: {serverStatus.lastUpdate ? new Date(serverStatus.lastUpdate).toLocaleTimeString() : "Never"}
                  </div>
                </div>

                <div className="rounded-[32px] border border-border/50 shadow-xl overflow-hidden bg-card/10 backdrop-blur-sm">
                  {serverStatus.loading ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                      <Loader2 className="h-10 w-10 animate-spin text-primary/40" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Synchronizing Node Data...</span>
                    </div>
                  ) : serverStatus.servers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                      <Server className="h-16 w-16 text-muted-foreground/20 mb-4" />
                      <h3 className="text-sm font-black uppercase">No Node Clusters Found</h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xs">Clusters must be defined in system settings and verified online.</p>
                    </div>
                  ) : (
                    <div className={cn(
                      "grid divide-x divide-y divide-border/30",
                      serverStatus.servers.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"
                    )}>
                      {serverStatus.servers.map((server) => (
                        <div key={server.id} className="group p-6 hover:bg-primary/5 transition-colors relative">
                          <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "p-2.5 rounded-2xl border bg-card shadow-sm transition-transform group-hover:scale-110",
                                server.status === "connected" ? "border-emerald-500/20" : "border-border/50"
                              )}>
                                {server.status === "connected" ?
                                  <Wifi className="h-5 w-5 text-emerald-500" /> :
                                  <WifiOff className="h-5 w-5 text-muted-foreground/50" />
                                }
                              </div>
                              <div>
                                <h4 className="text-sm font-black uppercase tracking-tight group-hover:text-primary transition-colors">{server.name || "Default Broker"}</h4>
                                <p className="text-[9px] font-mono text-muted-foreground mt-0.5 max-w-[150px] truncate">{server.brokerUrl}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                              getStatusColor(server.status)
                            )}>
                              {server.status}
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: "Pkts", val: server.messageCount.toLocaleString() },
                              { label: "TX (KB)", val: (server.bytesSent / 1024).toFixed(1) },
                              { label: "RX (KB)", val: (server.bytesReceived / 1024).toFixed(1) }
                            ].map(it => (
                              <div key={it.label} className="bg-muted/30 rounded-xl p-2.5 border border-border/20">
                                <span className="block text-[8px] font-black uppercase text-muted-foreground/70 mb-0.5">{it.label}</span>
                                <span className="text-xs font-black tabular-nums">{it.val}</span>
                              </div>
                            ))}
                          </div>

                          {server.lastError && (
                            <div className="mt-4 p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 flex items-start gap-2">
                              <AlertCircle className="h-3 w-3 text-rose-500 shrink-0 mt-0.5" />
                              <p className="text-[9px] font-bold text-rose-500 leading-tight">{server.lastError}</p>
                            </div>
                          )}
                          <ArrowUpRight className="absolute top-4 right-4 h-4 w-4 text-primary opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* System Details Section (Right Side Sidebar) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Environment Details</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Broker URL Card */}
                    <div className="p-5 rounded-[32px] border border-border/50 bg-card/30 backdrop-blur-md space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Broker Endpoint</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[9px] font-bold uppercase rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => {
                            navigator.clipboard.writeText(brokerUrl);
                            showToast.success("Copied to Clipboard");
                          }}
                        >
                          <Copy className="h-3 w-3 mr-1.5" /> Copy
                        </Button>
                      </div>
                      <div className="break-all font-mono text-[11px] leading-relaxed text-primary/80 bg-primary/5 p-4 rounded-2xl border border-primary/20 shadow-inner">
                        {brokerUrl || "ENVIRONMENT_VARIABLE_NOT_SET"}
                      </div>
                    </div>

                    {/* Compact Info Grid */}
                    <div className="grid grid-cols-3 lg:grid-cols-2 gap-3">
                      {[
                        { l: "Host", v: connectionDetails.host, i: Server },
                        { l: "Port", v: connectionDetails.port, i: Settings },
                        { l: "Type", v: connectionDetails.protocol?.toUpperCase(), i: Zap }
                      ].map(it => (
                        <div key={it.l} className="p-4 rounded-[24px] border border-border/50 bg-muted/20 backdrop-blur-sm group hover:border-primary/30 transition-colors">
                          <span className="block text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">{it.l}</span>
                          <span className="text-xs font-black tracking-tight">{it.v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Runtime Status Card */}
                    <div className="p-5 rounded-[32px] border border-border/50 bg-card/50 backdrop-blur-md shadow-sm transition-all hover:shadow-md">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Runtime Status</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-wider",
                          status === "connected" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-rose-500 border-rose-500/20 bg-rose-500/10"
                        )}>
                          {status}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-3 w-3 rounded-full",
                          status === "connected" ? "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)] animate-pulse" : "bg-muted"
                        )} />
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-tight leading-none">{status === "connected" ? "All systems nominal" : "System disconnected"}</p>
                          <p className="text-[9px] font-bold text-muted-foreground mt-1">Ready for telemetry flow</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="configuration" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DeviceConfigCard
                title="Modbus Infrastructure"
                description="RS485 & TCP Field Communication"
                icon={Database}
                config={modbusConfig}
                connection={modbusConnection}
                isLoading={isModbusLoading}
                onEdit={() => setIsModbusModalOpen(true)}
                colorScheme="blue"
              />
              <DeviceConfigCard
                title="Modular I2C Bus"
                description="Short-range Sensor Networks"
                icon={Cpu}
                config={modularConfig}
                connection={modularConnection}
                isLoading={isModularLoading}
                onEdit={() => setIsModularModalOpen(true)}
                colorScheme="emerald"
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Dialogs */}
        <ConfigEditDialog
          isOpen={isModbusModalOpen}
          onOpenChange={setIsModbusModalOpen}
          title="Modbus Infrastructure"
          initialConfig={modbusConfig}
          onSave={(cfg: any) => handleSave('modbus', cfg)}
          isSubmitting={isSubmitting}
        />
        <ConfigEditDialog
          isOpen={isModularModalOpen}
          onOpenChange={setIsModularModalOpen}
          title="Modular I2C Bus"
          initialConfig={modularConfig}
          onSave={(cfg: any) => handleSave('modular', cfg)}
          isSubmitting={isSubmitting}
        />

      </div>
    </TooltipProvider>
  );
}
