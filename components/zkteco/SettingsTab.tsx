"use client";

import { useState, useEffect } from "react";
import {
  Settings2,
  Search,
  RefreshCw,
  Globe,
  Clock,
  Network,
  Save,
  AlertCircle,
  Cpu,
  ShieldCheck,
  Monitor,
  Smartphone,
  Info,
} from "lucide-react";
import { toast } from "sonner";

interface DeviceInfo {
  name: string;
  serialNumber: string;
  time: string;
  ip: string;
  mask: string;
  gateway: string;
  language: string;
}

export default function SettingsTab() {
  const [targetIp, setTargetIp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [devices, setDevices] = useState<any[]>([]);

  // New settings state
  const [newIp, setNewIp] = useState("");
  const [newMask, setNewMask] = useState("");
  const [newGateway, setNewGateway] = useState("");
  const [newLanguage, setNewLanguage] = useState("");
  const [syncTime, setSyncTime] = useState(false);

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const res = await fetch("/api/zkteco/devices");
      const data = await res.json();
      const deviceList = Array.isArray(data) ? data : data.devices || [];
      setDevices(deviceList);
      if (deviceList.length > 0) {
        setTargetIp(deviceList[0].ipAddress);
      }
    } catch (err) {
      console.error("Failed to fetch devices", err);
    }
  };

  const fetchDeviceInfo = async (ip: string) => {
    if (!ip) return;
    setIsLoading(true);
    setDeviceInfo(null);
    try {
      const res = await fetch(`/api/zkteco/devices/settings?ip=${ip}`);
      const result = await res.json();

      if (result.status === "success") {
        const data = result.data;
        setDeviceInfo(data);
        setNewIp(data.ip);
        setNewMask(data.mask);
        setNewGateway(data.gateway);
        setNewLanguage(data.language);
        toast.success(`Connected to ${data.name}`);
      } else {
        toast.error(result.error || "Failed to connect to device");
      }
    } catch (err) {
      toast.error("Network error while connecting to device");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySettings = async () => {
    if (!targetIp || !deviceInfo) return;
    setIsApplying(true);
    try {
      const res = await fetch("/api/zkteco/devices/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetIp,
          targetPort: 4370,
          settings: {
            ip: newIp !== deviceInfo.ip ? newIp : undefined,
            mask: newMask !== deviceInfo.mask ? newMask : undefined,
            gateway: newGateway !== deviceInfo.gateway ? newGateway : undefined,
            language:
              newLanguage !== deviceInfo.language ? newLanguage : undefined,
            syncTime: syncTime,
          },
        }),
      });

      const result = await res.json();
      if (result.status === "success") {
        if (result.isAdms) {
          toast.info("Commands queued for Master (ADMS).", { duration: 5000 });
        } else {
          toast.success("Settings applied successfully!");
        }
        if (!result.isAdms && newIp !== deviceInfo.ip) {
          setTargetIp(newIp);
        }
        setTimeout(() => fetchDeviceInfo(newIp), result.isAdms ? 15000 : 3000);
      } else {
        toast.error(result.error || "Failed to apply settings");
      }
    } catch (err) {
      toast.error("Network error while applying settings");
    } finally {
      setIsApplying(false);
      setSyncTime(false);
    }
  };

  return (
    <main className=" space-y-6 animate-in fade-in duration-500">
      {/* Device Selection & Search Row - Aligned and Compact */}
      <div className="bg-card border rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Manual IP Address
            </label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Network className="w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                className="w-full bg-background border rounded-lg h-10 pl-9 pr-24 transition-all outline-none text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="e.g. 192.168.1.206"
                value={targetIp}
                onChange={(e) => setTargetIp(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && fetchDeviceInfo(targetIp)
                }
              />
              <button
                onClick={() => fetchDeviceInfo(targetIp)}
                disabled={isLoading || !targetIp}
                className="absolute right-1 top-1 bottom-1 bg-primary hover:bg-primary/90 text-primary-foreground px-4 rounded-md text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                {isLoading ? "Connecting" : "Connect"}
              </button>
            </div>
          </div>

          <div className="w-full md:w-64 space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
              Quick Select
            </label>
            <select
              className="w-full bg-background border rounded-lg h-10 px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
              value={targetIp}
              onChange={(e) => {
                setTargetIp(e.target.value);
                if (e.target.value) fetchDeviceInfo(e.target.value);
              }}
            >
              <option value="">Select registered device...</option>
              {devices.map((dev: any) => (
                <option key={dev.id} value={dev.ipAddress}>
                  {dev.name} ({dev.ipAddress})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!deviceInfo && !isLoading && (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-muted/30 rounded-2xl border-2 border-dashed border-border/50 text-center">
          <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Monitor className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-lg font-bold mb-1">Device Connection Required</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Connect to a device above to access its configuration settings.
          </p>
        </div>
      )}

      {deviceInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in slide-in-from-bottom-2 duration-500">
          {/* Left Column: Device Info & Localization */}
          <div className="lg:col-span-4 space-y-6">
            {/* Device Info Card */}
            <div className="bg-card rounded-xl border p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Monitor className="w-5 h-5 text-blue-500" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Hardware Info
                </h3>
              </div>

              <div className="grid gap-4">
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Model
                  </span>
                  <span className="text-sm font-bold">{deviceInfo.name}</span>
                </div>
                <div className="flex justify-between items-center border-b pb-2">
                  <span className="text-xs text-muted-foreground font-medium">
                    Serial
                  </span>
                  <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded italic">
                    {deviceInfo.serialNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 mt-1">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="text-xs font-bold">Secure Connection</span>
                </div>
              </div>
            </div>

            {/* Localization Card */}
            <div className="bg-card rounded-xl border p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Globe className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wide">
                  Localization
                </h3>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Device Language
                  </label>
                  <select
                    className="w-full bg-background border rounded-lg h-9 px-3 text-sm font-medium outline-none focus:border-primary transition-all"
                    value={newLanguage}
                    onChange={(e) => setNewLanguage(e.target.value)}
                  >
                    <option value="en">English (US)</option>
                    <option value="id">Indonesia (ID)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column: Network Settings */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-card rounded-xl border p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl">
                    <Network className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">Network Configuration</h3>
                    <p className="text-xs text-muted-foreground">
                      Adjust static network parameters.
                    </p>
                  </div>
                </div>

                <div
                  className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${newIp !== deviceInfo.ip ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}`}
                >
                  {newIp !== deviceInfo.ip ? "Changes Pending" : "Stable"}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    IP Address
                  </label>
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    className="w-full bg-background border focus:ring-1 focus:ring-primary focus:border-primary rounded-lg h-10 px-4 font-mono text-sm font-bold outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Subnet Mask
                  </label>
                  <input
                    type="text"
                    value={newMask}
                    onChange={(e) => setNewMask(e.target.value)}
                    className="w-full bg-background border focus:ring-1 focus:ring-primary focus:border-primary rounded-lg h-10 px-4 font-mono text-sm font-bold outline-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">
                    Default Gateway
                  </label>
                  <input
                    type="text"
                    value={newGateway}
                    onChange={(e) => setNewGateway(e.target.value)}
                    className="w-full bg-background border focus:ring-1 focus:ring-primary focus:border-primary rounded-lg h-10 px-4 font-mono text-sm font-bold outline-none transition-all"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-4 bg-muted/40 border rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span className="text-xs font-bold">Time Sync</span>
                      </div>
                      <button
                        onClick={() => setSyncTime(!syncTime)}
                        className={`w-10 h-5 rounded-full transition-all relative ${syncTime ? "bg-primary" : "bg-muted-foreground/30"}`}
                      >
                        <div
                          className={`absolute top-0.5 bottom-0.5 w-4 bg-white rounded-full transition-all ${syncTime ? "right-0.5" : "left-0.5"}`}
                        ></div>
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-medium text-muted-foreground">
                      <span>Current Device Time:</span>
                      <span className="font-bold text-foreground">
                        {deviceInfo.time
                          ? new Date(deviceInfo.time).toLocaleTimeString()
                          : "--:--"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Smartphone className="w-6 h-6 opacity-30" />
                  <p className="text-[11px] max-w-[240px] leading-relaxed">
                    Network changes may cause disconnection. ADMS settings apply
                    on the next heartbeat.
                  </p>
                </div>
                <button
                  onClick={handleApplySettings}
                  disabled={isApplying}
                  className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-8 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-primary/10 disabled:opacity-50"
                >
                  {isApplying ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {isApplying ? "Applying Settings..." : "Save Configuration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
