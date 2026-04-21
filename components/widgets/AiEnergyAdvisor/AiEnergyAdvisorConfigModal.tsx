"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles, Server, BarChart2, X, Search, CheckSquare, Square,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceSource { uniqId: string; name: string; topic: string }
interface LogSource    { id: string; customName: string; key: string; units: string }

export interface AiAdvisorConfig {
  widgetTitle:   string;
  deviceSources: { uniqId: string; name: string }[];
  logSources:    { id: string; customName: string }[];
}

interface Props {
  isOpen:        boolean;
  onClose:       () => void;
  onSave:        (config: AiAdvisorConfig) => void;
  initialConfig?: Partial<AiAdvisorConfig>;
}

export const AiEnergyAdvisorConfigModal = ({ isOpen, onClose, onSave, initialConfig }: Props) => {
  const [title,           setTitle]           = useState("AI Energy Advisor");
  const [allDevices,      setAllDevices]      = useState<DeviceSource[]>([]);
  const [allLogs,         setAllLogs]         = useState<LogSource[]>([]);
  const [selDevices,      setSelDevices]      = useState<DeviceSource[]>([]);
  const [selLogs,         setSelLogs]         = useState<LogSource[]>([]);
  const [deviceSearch,    setDeviceSearch]    = useState("");
  const [logSearch,       setLogSearch]       = useState("");
  const [loading,         setLoading]         = useState(true);
  const [activeTab,       setActiveTab]       = useState<"devices" | "logs">("devices");

  /* ── Fetch data ── */
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    Promise.all([
      fetch(`${API_BASE_URL}/api/devices/external?limit=200`).then(r => r.json()),
      fetch(`${API_BASE_URL}/api/logging-configs?limit=200`).then(r => r.json()),
    ]).then(([devRes, logRes]) => {
      setAllDevices(devRes.devices ?? devRes.data ?? devRes ?? []);
      setAllLogs(logRes.data ?? logRes.configs ?? logRes.loggingConfigs ?? logRes ?? []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [isOpen]);

  /* ── Populate from initialConfig ── */
  useEffect(() => {
    if (!isOpen) return;
    setTitle(initialConfig?.widgetTitle ?? "AI Energy Advisor");
    setSelDevices(initialConfig?.deviceSources ?? []);
    setSelLogs(initialConfig?.logSources ?? []);
    setDeviceSearch("");
    setLogSearch("");
    setActiveTab("devices");
  }, [isOpen, initialConfig]);

  /* ── Filtered lists ── */
  const filteredDevices = useMemo(() =>
    allDevices.filter(d =>
      d.name.toLowerCase().includes(deviceSearch.toLowerCase()) ||
      d.topic.toLowerCase().includes(deviceSearch.toLowerCase())
    ), [allDevices, deviceSearch]);

  const filteredLogs = useMemo(() =>
    allLogs.filter(l =>
      l.customName.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.key.toLowerCase().includes(logSearch.toLowerCase())
    ), [allLogs, logSearch]);

  /* ── Toggle helpers ── */
  const toggleDevice = (d: DeviceSource) => {
    setSelDevices(prev =>
      prev.find(x => x.uniqId === d.uniqId)
        ? prev.filter(x => x.uniqId !== d.uniqId)
        : [...prev, { uniqId: d.uniqId, name: d.name }]
    );
  };

  const toggleLog = (l: LogSource) => {
    setSelLogs(prev =>
      prev.find(x => x.id === l.id)
        ? prev.filter(x => x.id !== l.id)
        : [...prev, { id: l.id, customName: l.customName }]
    );
  };

  const isDeviceSel = (uniqId: string) => selDevices.some(x => x.uniqId === uniqId);
  const isLogSel    = (id: string)     => selLogs.some(x => x.id === id);

  const handleSave = () => {
    onSave({ widgetTitle: title || "AI Energy Advisor", deviceSources: selDevices, logSources: selLogs });
    onClose();
  };

  const totalSources = selDevices.length + selLogs.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-border/40 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles size={16} className="text-violet-500" />
            Konfigurasi AI Energy Advisor
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 min-h-0">
          {/* Widget title */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Judul Widget</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="AI Energy Advisor"
              className="h-8 text-sm"
            />
          </div>

          {/* Tab selector */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("devices")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  activeTab === "devices"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Server size={12} />
                Perangkat
                {selDevices.length > 0 && (
                  <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold px-1.5 rounded-full">
                    {selDevices.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("logs")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  activeTab === "logs"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <BarChart2 size={12} />
                Riwayat Log
                {selLogs.length > 0 && (
                  <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold px-1.5 rounded-full">
                    {selLogs.length}
                  </span>
                )}
              </button>
            </div>

            {/* ── Device tab ── */}
            {activeTab === "devices" && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Pilih perangkat yang akan dianalisis. AI akan membaca nilai real-time dari <code className="bg-muted px-1 rounded">lastPayload</code> tiap perangkat.
                </p>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={deviceSearch}
                    onChange={e => setDeviceSearch(e.target.value)}
                    placeholder="Cari nama atau topic..."
                    className="h-8 text-xs pl-7"
                  />
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
                  ) : filteredDevices.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Tidak ada perangkat ditemukan</p>
                  ) : (
                    filteredDevices.map(d => {
                      const sel = isDeviceSel(d.uniqId);
                      return (
                        <button
                          key={d.uniqId}
                          onClick={() => toggleDevice(d)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                            sel
                              ? "border-violet-300 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20"
                              : "border-border/40 bg-card hover:bg-muted/40"
                          }`}
                        >
                          {sel
                            ? <CheckSquare size={14} className="text-violet-500 flex-shrink-0" />
                            : <Square size={14} className="text-muted-foreground/40 flex-shrink-0" />
                          }
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-foreground truncate">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground truncate font-mono">{d.topic}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ── Log tab ── */}
            {activeTab === "logs" && (
              <div className="flex flex-col gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Pilih konfigurasi logging untuk analisis tren historis. AI akan membaca data log 24 jam terakhir.
                </p>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    placeholder="Cari nama atau key..."
                    className="h-8 text-xs pl-7"
                  />
                </div>
                <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)
                  ) : filteredLogs.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Tidak ada log config ditemukan</p>
                  ) : (
                    filteredLogs.map(l => {
                      const sel = isLogSel(l.id);
                      return (
                        <button
                          key={l.id}
                          onClick={() => toggleLog(l)}
                          className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                            sel
                              ? "border-violet-300 dark:border-violet-700/50 bg-violet-50 dark:bg-violet-900/20"
                              : "border-border/40 bg-card hover:bg-muted/40"
                          }`}
                        >
                          {sel
                            ? <CheckSquare size={14} className="text-violet-500 flex-shrink-0" />
                            : <Square size={14} className="text-muted-foreground/40 flex-shrink-0" />
                          }
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-xs font-medium text-foreground truncate">{l.customName}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              key: <code className="bg-muted px-0.5 rounded">{l.key}</code>
                              {l.units && <span className="ml-1 opacity-60">({l.units})</span>}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Selected summary chips */}
          {totalSources > 0 && (
            <div className="flex flex-col gap-2">
              <Label className="text-xs font-medium text-muted-foreground">
                Sources terpilih ({totalSources})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {selDevices.map(d => (
                  <span key={d.uniqId} className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40 px-2 py-0.5 rounded-full">
                    <Server size={9} /> {d.name}
                    <button onClick={() => toggleDevice(d as any)} className="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5">
                      <X size={9} />
                    </button>
                  </span>
                ))}
                {selLogs.map(l => (
                  <span key={l.id} className="flex items-center gap-1 text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-full">
                    <BarChart2 size={9} /> {l.customName}
                    <button onClick={() => toggleLog(l as any)} className="hover:text-emerald-900 dark:hover:text-emerald-100 ml-0.5">
                      <X size={9} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-4 border-t border-border/40 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={totalSources === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Sparkles size={13} className="mr-1.5" />
            Simpan & Analisa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
