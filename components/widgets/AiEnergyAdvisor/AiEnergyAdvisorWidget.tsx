"use client";

import React, { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import {
  Loader2, AlertTriangle, Sparkles, RefreshCw, Clock,
  TriangleAlert, Info, Zap, WifiOff, Server, BarChart2,
} from "lucide-react";
import { AiEnergyAdvisorConfigModal, AiAdvisorConfig } from "./AiEnergyAdvisorConfigModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const AUTO_REFRESH_MS = 30 * 60 * 1000;

interface Recommendation {
  severity: "info" | "warning" | "critical";
  icon: string;
  title: string;
  description: string;
}

interface AdvisorResponse {
  recommendations: Recommendation[];
  generatedAt: string;
  sourceSummary: {
    deviceCount: number;
    logCount: number;
    deviceNames: string[];
    logNames: string[];
  };
  dataSnapshot: Record<string, any>;
}

interface Props {
  config: Partial<AiAdvisorConfig>;
  isEditMode?: boolean;
  onConfigChange?: (cfg: any) => void;
}

const SEV = {
  critical: {
    bar: "bg-red-500",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800/40",
    card: "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
    title: "text-red-700 dark:text-red-300",
    label: "KRITIS",
    Icon: () => <TriangleAlert size={10} />,
  },
  warning: {
    bar: "bg-amber-400",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40",
    card: "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
    title: "text-amber-700 dark:text-amber-300",
    label: "PERHATIAN",
    Icon: () => <Zap size={10} />,
  },
  info: {
    bar: "bg-blue-400",
    badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40",
    card: "bg-blue-50/40 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30",
    title: "text-blue-700 dark:text-blue-300",
    label: "INFO",
    Icon: () => <Info size={10} />,
  },
};

export const AiEnergyAdvisorWidget = ({ config, isEditMode, onConfigChange }: Props) => {
  const [data,         setData]         = useState<AdvisorResponse | null>(null);
  const [status,       setStatus]       = useState<"idle" | "loading" | "error" | "ok">("idle");
  const [errorMsg,     setErrorMsg]     = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetched,  setLastFetched]  = useState<Date | null>(null);
  const [minutesAgo,   setMinutesAgo]   = useState(0);
  const [modalOpen,    setModalOpen]    = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [sizes,   setSizes]   = useState({ title: 13, body: 11, label: 10, header: 48 });
  const [compact, setCompact] = useState(false);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      const hh = Math.max(40, Math.min(height * 0.2, 52));
      setCompact(width < 320 || height < 240);
      setSizes({
        title:  Math.max(11, Math.min(hh * 0.3, 14)),
        body:   Math.max(10, Math.min(width * 0.034, 12)),
        label:  Math.max(9,  Math.min(width * 0.028, 11)),
        header: hh,
      });
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    update();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!lastFetched) return;
    const tick = () => setMinutesAgo(Math.floor((Date.now() - lastFetched.getTime()) / 60000));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [lastFetched]);

  const hasSources = (config.deviceSources?.length ?? 0) + (config.logSources?.length ?? 0) > 0;

  const fetchAdvice = useCallback(async (manual = false) => {
    if (!hasSources) return;
    if (manual) setIsRefreshing(true);
    else setStatus("loading");
    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/energy-advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          deviceSources: config.deviceSources?.map(d => d.uniqId) ?? [],
          logSources:    config.logSources?.map(l => l.id) ?? [],
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Gagal memuat");
      setData(await res.json());
      setStatus("ok");
      setLastFetched(new Date());
      setMinutesAgo(0);
    } catch (e: any) {
      setErrorMsg(e.message);
      setStatus("error");
    } finally {
      setIsRefreshing(false);
    }
  }, [config.deviceSources, config.logSources, hasSources]);

  // Auto-fetch saat sources berubah
  useEffect(() => {
    if (hasSources) {
      fetchAdvice();
      const id = setInterval(fetchAdvice, AUTO_REFRESH_MS);
      return () => clearInterval(id);
    }
  }, [fetchAdvice, hasSources]);

  const dot = status === "ok" ? "bg-emerald-500"
    : status === "error" ? "bg-red-500"
    : status === "loading" ? "bg-amber-500 animate-pulse"
    : "bg-slate-400";

  /* ────── NOT CONFIGURED ────── */
  if (!hasSources) return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 bg-muted/20 flex items-center gap-2 flex-shrink-0 border-b border-border/40" style={{ height: sizes.header }}>
        <Sparkles size={sizes.title + 2} className="text-violet-500" />
        <span className="font-semibold text-foreground" style={{ fontSize: sizes.title }}>
          {config.widgetTitle || "AI Energy Advisor"}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-5 text-center">
        <div className="w-11 h-11 rounded-full bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
          <Sparkles size={22} className="text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Belum dikonfigurasi</p>
          <p className="text-xs text-muted-foreground mt-0.5">Pilih perangkat atau log sebagai sumber analisis</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-md transition-colors font-medium"
        >
          Pilih Sources
        </button>
      </div>
      <AiEnergyAdvisorConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={cfg => onConfigChange?.(cfg)}
        initialConfig={config}
      />
    </div>
  );

  /* ────── LOADING ────── */
  if (status === "loading") return (
    <div ref={containerRef} className="w-full h-full flex flex-col bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
      <div className="px-4 bg-muted/20 flex items-center gap-2 flex-shrink-0 border-b border-border/40" style={{ height: sizes.header }}>
        <Sparkles size={sizes.title + 2} className="text-violet-500" />
        <span className="font-semibold text-foreground truncate" style={{ fontSize: sizes.title }}>
          {config.widgetTitle || "AI Energy Advisor"}
        </span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
            <Sparkles size={20} className="text-violet-400" />
          </div>
          <Loader2 size={14} className="animate-spin text-violet-500 absolute -bottom-1 -right-1" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-xs font-medium text-foreground">Menganalisis data energi...</p>
          <p className="text-[10px] text-muted-foreground/60">
            {config.deviceSources?.length ?? 0} perangkat · {config.logSources?.length ?? 0} log
          </p>
        </div>
        <div className="flex gap-1">
          {[0.6,1,0.8,1.2,0.7].map((d, i) => (
            <div key={i} className="w-1 bg-violet-300 dark:bg-violet-600 rounded-full animate-pulse"
              style={{ height: 16 * d, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );

  /* ────── MAIN ────── */
  const recs = data?.recommendations ?? [];
  const src  = data?.sourceSummary;

  return (
    <>
      <div ref={containerRef} className="w-full h-full flex flex-col bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group">
        {/* ── Header ── */}
        <div className="px-4 bg-muted/20 flex items-center justify-between flex-shrink-0 border-b border-border/40" style={{ height: sizes.header }}>
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="text-violet-500 flex-shrink-0" style={{ width: sizes.title + 3, height: sizes.title + 3 }} />
            <h3 className="font-semibold text-foreground truncate" style={{ fontSize: sizes.title }}
              title={config.widgetTitle || "AI Energy Advisor"}>
              {config.widgetTitle || "AI Energy Advisor"}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Analisa Ulang button */}
            <button
              onClick={() => fetchAdvice(true)}
              disabled={isRefreshing}
              className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-800/40 disabled:opacity-40 transition-colors"
              title="Analisa ulang"
            >
              <RefreshCw size={10} className={isRefreshing ? "animate-spin" : ""} />
              {!compact && "Analisa Ulang"}
            </button>
            <div className={`rounded-full ${dot}`} style={{ width: 8, height: 8 }} />
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Source chips */}
          {!compact && src && (
            <div className="flex gap-1.5 px-3 pt-2.5 pb-1 flex-wrap flex-shrink-0">
              {src.deviceNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  <Server size={8} />{name}
                </span>
              ))}
              {src.logNames.map((name, i) => (
                <span key={i} className="flex items-center gap-1 text-[9px] bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">
                  <BarChart2 size={8} />{name}
                </span>
              ))}
            </div>
          )}

          {!compact && src && <div className="mx-3 border-t border-border/30 flex-shrink-0" />}

          {/* Error inline (tidak full screen) */}
          {status === "error" && (
            <div className="flex items-center gap-2 mx-3 mt-2 p-2.5 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 flex-shrink-0">
              <WifiOff size={13} className="text-red-400 flex-shrink-0" />
              <p className="text-[10px] text-red-600 dark:text-red-400 flex-1 min-w-0 truncate">{errorMsg}</p>
              <button onClick={() => fetchAdvice(true)} className="text-[10px] text-red-500 underline flex-shrink-0">Ulang</button>
            </div>
          )}

          {/* Rekomendasi list */}
          <div className="flex-1 overflow-y-auto scrollbar-hide px-3 py-2 flex flex-col gap-2 min-h-0">
            {recs.length === 0 && status === "ok" ? (
              <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Sparkles size={16} className="text-emerald-500" />
                </div>
                <p className="text-xs text-muted-foreground">Sistem berjalan optimal.</p>
              </div>
            ) : (
              recs.map((rec, i) => {
                const s = SEV[rec.severity] ?? SEV.info;
                return (
                  <div key={i} className={`relative flex gap-2.5 p-2.5 rounded-lg border overflow-hidden flex-shrink-0 ${s.card}`}>
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg ${s.bar}`} />
                    <span className="text-sm leading-none mt-0.5 flex-shrink-0 ml-1">{rec.icon}</span>
                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-semibold leading-tight ${s.title}`} style={{ fontSize: sizes.body }}>{rec.title}</span>
                        <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold border uppercase ${s.badge}`}>
                          <s.Icon />{s.label}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-snug" style={{ fontSize: sizes.label }}>{rec.description}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 border-t border-border/30 flex-shrink-0 bg-muted/10" style={{ fontSize: sizes.label - 1 }}>
            <span className="flex items-center gap-1 text-muted-foreground/50">
              <Clock size={9} />
              {lastFetched ? (minutesAgo === 0 ? "Baru saja" : `${minutesAgo} mnt lalu`) : "—"}
            </span>
            <span className="flex items-center gap-1 text-muted-foreground/30">
              <Sparkles size={8} className="text-violet-400/50" />
              Groq · Llama 3.3
            </span>
          </div>
        </div>
      </div>

      <AiEnergyAdvisorConfigModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={cfg => onConfigChange?.(cfg)}
        initialConfig={config}
      />
    </>
  );
};
