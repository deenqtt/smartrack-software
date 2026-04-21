"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Network,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Cable,
  Settings2,
  Info,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface NetworkConfig {
  [interfaceName: string]: {
    state?: string;
    connection?: string;
    type?: string;
    method?: string; // ipv4 method
    address?: string; // ipv4 address
    cidr?: string;
    netmask?: string;
    gateway?: string;
    "dns-nameservers"?: string;
    current_address?: string;
    device_state?: string;

    ipv6_method?: string;
    ipv6_address?: string;
    ipv6_prefix?: string;
    ipv6_gateway?: string;
    ipv6_dns1?: string;
    ipv6_dns2?: string;
  } | undefined;
}

interface EthernetSettingsCardProps {
  networkConfig: NetworkConfig | null;
  isLoading: boolean;
  onConfigure: (config: any) => void;
  onRefresh?: () => void;
}

export function EthernetSettingsCard({
  networkConfig,
  isLoading,
  onConfigure,
  onRefresh,
}: EthernetSettingsCardProps) {
  // Master switch for global network method: "dhcp" | "manual"
  const [assignmentMode, setAssignmentMode] = useState<"dhcp" | "manual">("dhcp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // IPv4 State
  const [ipv4Enabled, setIpv4Enabled] = useState(true);
  const [ipv4Ip, setIpv4Ip] = useState("");
  const [ipv4Netmask, setIpv4Netmask] = useState("255.255.255.0");
  const [ipv4Gateway, setIpv4Gateway] = useState("");
  const [ipv4Dns, setIpv4Dns] = useState("");

  // IPv6 State
  const [ipv6Enabled, setIpv6Enabled] = useState(false);
  const [ipv6Ip, setIpv6Ip] = useState("");
  const [ipv6Prefix, setIpv6Prefix] = useState("64");
  const [ipv6Gateway, setIpv6Gateway] = useState("");
  const [ipv6Dns, setIpv6Dns] = useState("");

  // Dynamic detection of Ethernet interface name
  const [activeInterface, setActiveInterface] = useState<string>("eth0");

  useEffect(() => {
    let ethData = networkConfig?.eth0;
    let foundInterface = "eth0";

    if (networkConfig) {
      for (const [key, value] of Object.entries(networkConfig)) {
        if (value?.type === "ethernet") {
          foundInterface = key;
          ethData = value;
          break;
        }
      }
    }

    setActiveInterface(foundInterface);

    if (ethData) {
      const v4Method = ethData.method || "dhcp";
      const v6Method = ethData.ipv6_method || "ignore";

      // Calculate global assignment mode for the UI
      if (v4Method === "static" || v6Method === "static") {
        setAssignmentMode("manual");
      } else {
        setAssignmentMode("dhcp");
      }

      setIpv4Enabled(v4Method !== "disabled");
      setIpv4Ip(ethData.address || "");
      setIpv4Netmask(ethData.netmask || "255.255.255.0");
      setIpv4Gateway(ethData.gateway || "");
      setIpv4Dns(ethData["dns-nameservers"] || "");

      setIpv6Enabled(v6Method !== "ignore" && v6Method !== "disabled");
      setIpv6Ip(ethData.ipv6_address || "");
      setIpv6Prefix(ethData.ipv6_prefix || "64");
      setIpv6Gateway(ethData.ipv6_gateway || "");
      let dnsFull = (ethData.ipv6_dns1 ? ethData.ipv6_dns1 + " " : "") + (ethData.ipv6_dns2 || "");
      setIpv6Dns(dnsFull.trim());
    }
  }, [networkConfig]);

  const handleSubmit = async () => {
    // Validation
    if (assignmentMode === "manual") {
      if (ipv4Enabled) {
        if (!ipv4Ip) return Swal.fire({ icon: "warning", title: "Missing IPv4", text: "Please enter a valid IPv4 address." });
        if (!ipv4Netmask) return Swal.fire({ icon: "warning", title: "Missing Netmask", text: "Please enter a valid netmask." });
      }
      if (ipv6Enabled) {
        if (!ipv6Ip) return Swal.fire({ icon: "warning", title: "Missing IPv6", text: "Please enter a valid IPv6 address." });
        if (!ipv6Prefix) return Swal.fire({ icon: "warning", title: "Missing Prefix", text: "Please enter a valid IPv6 prefix." });
      }
      if (!ipv4Enabled && !ipv6Enabled) {
        return Swal.fire({ icon: "warning", title: "All Protocols Disabled", text: "Please enable at least IPv4 or IPv6." });
      }
    }

    setIsSubmitting(true);

    try {
      const payload: any = {
        action: "set_network_config",
        interface: activeInterface,
        method: "unified", // new middleware unified method
        config: {
          ipv4_enabled: assignmentMode === "dhcp" ? true : ipv4Enabled,
          ipv4_method: assignmentMode === "dhcp" ? "dhcp" : (ipv4Enabled ? "static" : "disabled"),
          ipv4_ip: ipv4Ip,
          ipv4_netmask: ipv4Netmask,
          ipv4_gateway: ipv4Gateway,
          ipv4_dns: ipv4Dns,

          ipv6_enabled: assignmentMode === "dhcp" ? true : ipv6Enabled,
          ipv6_method: assignmentMode === "dhcp" ? "dhcp" : (ipv6Enabled ? "static" : "disabled"),
          ipv6_ip: ipv6Ip,
          ipv6_prefix: ipv6Prefix,
          ipv6_gateway: ipv6Gateway,
          ipv6_dns: ipv6Dns
        }
      };

      onConfigure(payload);

      Swal.fire({
        title: "Applying Configuration...",
        text: "Please wait while the network configuration is being applied. The device might disconnect.",
        icon: "info",
        allowOutsideClick: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading();
        },
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Configuration Failed",
        text: "An error occurred while applying the configuration.",
      });
    } finally {
      setTimeout(() => {
        setIsSubmitting(false);
      }, 2000);
    }
  };

  const handleRefresh = () => {
    if (onRefresh) onRefresh();
  };

  const getConnectionStatus = () => {
    if (!networkConfig || !networkConfig[activeInterface]) {
      return { variant: "secondary" as const, icon: <AlertCircle className="h-4 w-4" />, text: "Unknown" };
    }
    const state = networkConfig[activeInterface]?.state?.toLowerCase();
    if (state === "connected") return { variant: "default" as const, icon: <CheckCircle2 className="h-4 w-4" />, text: "Connected" };
    if (state === "disconnected" || state === "unavailable" || state === "unmanaged") return { variant: "destructive" as const, icon: <XCircle className="h-4 w-4" />, text: "Disconnected" };
    return { variant: "secondary" as const, icon: <AlertCircle className="h-4 w-4" />, text: state || "Unknown" };
  };

  const connectionStatus = getConnectionStatus();
  const ethData = networkConfig?.[activeInterface];

  return (
    <Card className="shadow-lg border-2 border-slate-200 dark:border-slate-800">
      <CardHeader className="space-y-4 pb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Cable className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl">Ethernet Configuration</CardTitle>
              <CardDescription className="text-sm mt-1">
                Configure both IPv4 and IPv6 settings ({activeInterface})
              </CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Status Indicator */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Network className="h-4 w-4" /> Current Status
            </Label>
            <Badge variant={connectionStatus.variant} className="gap-1.5">
              {connectionStatus.icon} {connectionStatus.text}
            </Badge>
          </div>

          <div className="rounded-xl border-2 border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-5 dark:border-slate-800 dark:from-slate-900 dark:to-slate-800">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ) : ethData ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Connection</span>
                  <p className="text-sm font-mono">{ethData.connection || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IPv4 Mode</span>
                  <div className="text-sm font-mono"><Badge variant={ethData.method === "static" ? "default" : "secondary"}>{ethData.method?.toUpperCase() || "N/A"}</Badge></div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IPv4 Address</span>
                  <p className="text-sm font-mono font-semibold">{ethData.current_address || ethData.address || "Not assigned"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">IPv6 Address</span>
                  <p className="text-sm font-mono font-semibold line-clamp-1" title={ethData.ipv6_address || "Not assigned"}>{ethData.ipv6_address || "Not assigned"}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm">No ethernet interface detected or data not available.</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Unified IP Settings */}
        <div className="space-y-6">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Edit Network IP Settings
          </Label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 border-2 rounded-xl bg-card">

            {/* IP Assignment Type */}
            <div className="space-y-2 col-span-full">
              <Label htmlFor="method" className="font-medium">IP assignment</Label>
              <Select value={assignmentMode} onValueChange={(val: "dhcp" | "manual") => setAssignmentMode(val)}>
                <SelectTrigger id="method" className="h-11 md:w-1/2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dhcp">
                    <span className="flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Automatic (DHCP for IPv4 & IPv6)</span>
                  </SelectItem>
                  <SelectItem value="manual">
                    <span className="flex items-center gap-2"><Settings2 className="h-4 w-4" /> Manual Configuration</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {assignmentMode === "manual" ? "Manually configure IP paths. You can toggle IPv4 or IPv6 separately." : "DHCP applies to both IPv4 and IPv6 automatically."}
              </p>
            </div>

            {/* MANUAL SETTINGS ONLY */}
            {assignmentMode === "manual" && (
              <>
                {/* IPv4 Form */}
                <div className="space-y-4 pt-4 border-t md:border-t-0 md:border-l md:pl-6 md:-ml-3 border-border col-span-1">
                  <div className="flex items-center gap-4 mb-2">
                    <Label className="text-lg font-bold">IPv4</Label>
                    <Switch checked={ipv4Enabled} onCheckedChange={setIpv4Enabled} id="ipv4-switch" />
                    <Label htmlFor="ipv4-switch" className="text-muted-foreground text-sm cursor-pointer">{ipv4Enabled ? "On" : "Off"}</Label>
                  </div>

                  {ipv4Enabled && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <Label>IP address</Label>
                        <Input placeholder="e.g. 192.168.0.100" value={ipv4Ip} onChange={e => setIpv4Ip(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Subnet mask</Label>
                        <Input placeholder="e.g. 255.255.255.0" value={ipv4Netmask} onChange={e => setIpv4Netmask(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gateway</Label>
                        <Input placeholder="e.g. 192.168.0.1" value={ipv4Gateway} onChange={e => setIpv4Gateway(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>DNS Servers</Label>
                        <Input placeholder="e.g. 8.8.8.8" value={ipv4Dns} onChange={e => setIpv4Dns(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>

                {/* IPv6 Form */}
                <div className="space-y-4 pt-4 border-t md:border-t-0 md:border-l md:pl-6 md:-ml-3 border-border col-span-1">
                  <div className="flex items-center gap-4 mb-2">
                    <Label className="text-lg font-bold">IPv6</Label>
                    <Switch checked={ipv6Enabled} onCheckedChange={setIpv6Enabled} id="ipv6-switch" />
                    <Label htmlFor="ipv6-switch" className="text-muted-foreground text-sm cursor-pointer">{ipv6Enabled ? "On" : "Off"}</Label>
                  </div>

                  {ipv6Enabled && (
                    <div className="space-y-4 animate-in fade-in duration-300">
                      <div className="space-y-2">
                        <Label>IP address</Label>
                        <Input placeholder="e.g. 2001:db8::1" value={ipv6Ip} onChange={e => setIpv6Ip(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Subnet prefix length</Label>
                        <Input placeholder="e.g. 64" type="number" value={ipv6Prefix} onChange={e => setIpv6Prefix(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Gateway</Label>
                        <Input placeholder="e.g. 2001:db8::ff" value={ipv6Gateway} onChange={e => setIpv6Gateway(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>DNS Servers</Label>
                        <Input placeholder="e.g. 2001:4860:4860::8888" value={ipv6Dns} onChange={e => setIpv6Dns(e.target.value)} />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Warning when both manual and both toggled OFF */}
            {assignmentMode === "manual" && !ipv4Enabled && !ipv6Enabled && (
              <Alert className="col-span-full border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-sm text-amber-700 dark:text-amber-300">
                  Both IPv4 and IPv6 are turned off. This will disconnect the device entirely! Please reconsider.
                </AlertDescription>
              </Alert>
            )}

            {assignmentMode === "dhcp" && (
              <Alert className="col-span-full border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-sm text-green-700 dark:text-green-300">
                  <strong>Automatic DHCP Mode:</strong> The connection will pull its IP settings from an external router or DHCP server.
                </AlertDescription>
              </Alert>
            )}

          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-3 pt-6">
        <Button onClick={handleSubmit} disabled={isSubmitting || isLoading} className="flex-1 h-11 gap-2" size="lg">
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Applying..." : "Save Configuration"}
        </Button>
      </CardFooter>
    </Card>
  );
}
