// File: components/widgets/UPSDashboard/UPSDashboardWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
  useMemo,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  AlertTriangle,
  Loader2,
  Info,
} from "lucide-react";
import { UPSDetailModal } from "./UPSDetailModal";
import { UPSDiagram } from "./UPSDiagram";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

const safeParseFloat = (value: any): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? null : parsed;
};

// ─── Config Interfaces ────────────────────────────────────────────────────────
interface SectionConfig {
  deviceUniqId: string;
  keyMapping: Record<string, string>;
}

export interface UPSDashboardConfig {
  customName: string;
  bypass: SectionConfig;
  line: SectionConfig;
  battery: SectionConfig;
  output: SectionConfig;
  load: SectionConfig;
  status: SectionConfig;
  // Legacy single-device support
  deviceUniqId?: string;
  keyMapping?: Record<string, string>;
}

// ─── UPS Live Data ────────────────────────────────────────────────────────────
interface UPSData {
  status: string | null;
  runningTime: string | null;
  communicationStatus: string | null;
  bypass: { voltage: number | null; frequency: number | null };
  line: { voltage: number | null; frequency: number | null };
  battery: {
    percent: number | null;
    voltage: number | null;
    time: number | null;
    temperature: number | null;
    current: number | null;
    health: number | null;
  };
  output: { voltage: number | null; frequency: number | null; current: number | null };
  load: { percent: number | null; apparentPower: number | null; activePower: number | null };
}

interface DeviceDetails {
  id: string;
  name: string;
  topic: string;
  [key: string]: any;
}

interface Props {
  config: UPSDashboardConfig;
  isEditMode?: boolean;
}

const EMPTY_DATA: UPSData = {
  status: null, runningTime: null, communicationStatus: null,
  bypass: { voltage: null, frequency: null },
  line: { voltage: null, frequency: null },
  battery: { percent: null, voltage: null, time: null, temperature: null, current: null, health: null },
  output: { voltage: null, frequency: null, current: null },
  load: { percent: null, apparentPower: null, activePower: null },
};

const EMPTY_SECTION: SectionConfig = { deviceUniqId: "", keyMapping: {} };

// Detect if this is a legacy config (single deviceUniqId + flat keyMapping)
const isLegacyConfig = (cfg: UPSDashboardConfig): boolean => {
  return !!(cfg.deviceUniqId && !cfg.bypass?.deviceUniqId);
};

// Convert legacy config to section-based
const migrateLegacy = (cfg: UPSDashboardConfig): UPSDashboardConfig => {
  const km = cfg.keyMapping || {};
  const dId = cfg.deviceUniqId || "";
  return {
    customName: cfg.customName,
    status:  { deviceUniqId: dId, keyMapping: { status: km.status || "", runningTime: km.runningTime || "", communicationStatus: km.communicationStatus || "" } },
    bypass:  { deviceUniqId: dId, keyMapping: { voltage: km.bypassVoltage || "", frequency: km.bypassFrequency || "" } },
    line:    { deviceUniqId: dId, keyMapping: { voltage: km.lineVoltage || "", frequency: km.lineFrequency || "" } },
    battery: { deviceUniqId: dId, keyMapping: { percent: km.batteryPercent || "", voltage: km.batteryVoltage || "", time: km.batteryTime || "" } },
    output:  { deviceUniqId: dId, keyMapping: { voltage: km.outputVoltage || "", frequency: km.outputFrequency || "", current: km.outputCurrent || "" } },
    load:    { deviceUniqId: dId, keyMapping: { percent: km.loadPercent || "", apparentPower: km.apparentPower || "", activePower: km.activePower || "" } },
  };
};

export const UPSDashboardWidget = ({ config: rawConfig, isEditMode = false }: Props) => {
  // Migrate legacy or use new format — memoized to prevent unnecessary re-subscriptions
  const config: UPSDashboardConfig | null = useMemo(() => {
    if (!rawConfig) return null;
    if (isLegacyConfig(rawConfig)) return migrateLegacy(rawConfig);
    return {
      customName: rawConfig.customName || "UPS Dashboard",
      bypass: rawConfig.bypass || EMPTY_SECTION,
      line: rawConfig.line || EMPTY_SECTION,
      battery: rawConfig.battery || EMPTY_SECTION,
      output: rawConfig.output || EMPTY_SECTION,
      load: rawConfig.load || EMPTY_SECTION,
      status: rawConfig.status || EMPTY_SECTION,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(rawConfig)]);

  const { subscribe, unsubscribe, isReady } = useMqttServer();
  const [upsData, setUpsData] = useState<UPSData>(EMPTY_DATA);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deviceDetails, setDeviceDetails] = useState<DeviceDetails | null>(null);
  const [isDataRetained, setIsDataRetained] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Map deviceUniqId → MQTT topic
  const [topicMap, setTopicMap] = useState<Record<string, string>>({});

  // Responsive layout
  const containerRef = useRef<HTMLDivElement>(null);
  const [isCompact, setIsCompact] = useState(false);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(() => {
      const { width, height } = container.getBoundingClientRect();
      setIsCompact(width * height < 120000 || width < 400 || height < 350);
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // ── Collect unique deviceUniqIds across all sections ──────────────────────
  const uniqueDeviceIds = Array.from(
    new Set(
      [config?.bypass, config?.line, config?.battery, config?.output, config?.load, config?.status]
        .map(s => s?.deviceUniqId)
        .filter((id): id is string => !!id)
    )
  );

  useEffect(() => {
    if (uniqueDeviceIds.length === 0) {
      setUpsData(EMPTY_DATA);
      setTopicMap({});
      setLastUpdate(null);
      setStatus("error");
      setErrorMessage("Please configure at least one UPS data source.");
    }
  }, [uniqueDeviceIds.length]);

  // ── Fetch topics for all unique devices ────────────────────────────────────
  useEffect(() => {
    if (uniqueDeviceIds.length === 0) return;

    const fetchTopics = async () => {
      setStatus("loading");
      const newMap: Record<string, string> = {};
      await Promise.all(
        uniqueDeviceIds.map(async (id) => {
          try {
            const res = await fetch(`${API_BASE_URL}/api/devices/external/${id}`);
            if (res.ok) {
              const data = await res.json();
              if (data.topic) newMap[id] = data.topic;
              if (!deviceDetails) setDeviceDetails(data);
            }
          } catch { /* ignore per-device errors */ }
        })
      );
      setTopicMap(newMap);
      if (Object.keys(newMap).length === 0) {
        setStatus("error");
        setErrorMessage("Selected UPS devices do not have MQTT topics configured.");
      } else {
        setStatus("waiting");
      }
    };

    fetchTopics();
  }, [uniqueDeviceIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Parse incoming MQTT payload and update matching sections ───────────────
  const buildHandler = useCallback(
    (deviceId: string) =>
      (_topic: string, payloadString: string, _sid: string, retained?: boolean) => {
        try {
          setIsDataRetained(retained ?? false);
          const payload = JSON.parse(payloadString);
          const inner =
            typeof payload.value === "string"
              ? JSON.parse(payload.value)
              : payload.value || payload;

          const get = (km: Record<string, string>, key: string) =>
            km[key] ? inner[km[key]] ?? null : null;

          setUpsData(prev => {
            const next = { ...prev };

            if (config?.status?.deviceUniqId === deviceId) {
              const km = config.status.keyMapping;
              next.status = get(km, "status") ?? prev.status;
              next.runningTime = get(km, "runningTime") ?? prev.runningTime;
              next.communicationStatus = get(km, "communicationStatus") ?? prev.communicationStatus;
            }
            if (config?.bypass?.deviceUniqId === deviceId) {
              const km = config.bypass.keyMapping;
              next.bypass = {
                voltage: safeParseFloat(get(km, "voltage")) ?? prev.bypass.voltage,
                frequency: safeParseFloat(get(km, "frequency")) ?? prev.bypass.frequency,
              };
            }
            if (config?.line?.deviceUniqId === deviceId) {
              const km = config.line.keyMapping;
              next.line = {
                voltage: safeParseFloat(get(km, "voltage")) ?? prev.line.voltage,
                frequency: safeParseFloat(get(km, "frequency")) ?? prev.line.frequency,
              };
            }
            if (config?.battery?.deviceUniqId === deviceId) {
              const km = config.battery.keyMapping;
              next.battery = {
                percent: safeParseFloat(get(km, "percent")) ?? prev.battery.percent,
                voltage: safeParseFloat(get(km, "voltage")) ?? prev.battery.voltage,
                time: safeParseFloat(get(km, "time")) ?? prev.battery.time,
                temperature: safeParseFloat(get(km, "temperature")) ?? prev.battery.temperature,
                current: safeParseFloat(get(km, "current")) ?? prev.battery.current,
                health: safeParseFloat(get(km, "health")) ?? prev.battery.health,
              };
            }
            if (config?.output?.deviceUniqId === deviceId) {
              const km = config.output.keyMapping;
              next.output = {
                voltage: safeParseFloat(get(km, "voltage")) ?? prev.output.voltage,
                frequency: safeParseFloat(get(km, "frequency")) ?? prev.output.frequency,
                current: safeParseFloat(get(km, "current")) ?? prev.output.current,
              };
            }
            if (config?.load?.deviceUniqId === deviceId) {
              const km = config.load.keyMapping;
              next.load = {
                percent: safeParseFloat(get(km, "percent")) ?? prev.load.percent,
                apparentPower: safeParseFloat(get(km, "apparentPower")) ?? prev.load.apparentPower,
                activePower: safeParseFloat(get(km, "activePower")) ?? prev.load.activePower,
              };
            }

            return next;
          });

          setLastUpdate(new Date());
          setStatus("ok");
        } catch (e) {
          console.error("UPS MQTT parse error:", e);
        }
      },
    [config]
  );

  // ── Subscribe / unsubscribe to all unique topics ───────────────────────────
  const handlersRef = useRef<Map<string, ReturnType<typeof buildHandler>>>(new Map());

  useEffect(() => {
    if (!isReady || Object.keys(topicMap).length === 0) return;

    // Subscribe for each unique device
    const entries = Object.entries(topicMap);
    entries.forEach(([deviceId, topic]) => {
      const handler = buildHandler(deviceId);
      handlersRef.current.set(deviceId, handler);
      subscribe(topic, handler);
    });

    return () => {
      entries.forEach(([deviceId, topic]) => {
        const handler = handlersRef.current.get(deviceId);
        if (handler) { unsubscribe(topic, handler); }
      });
      handlersRef.current.clear();
    };
  }, [topicMap, isReady, subscribe, unsubscribe, buildHandler]);

  const formatValue = (value: number | null, decimals = 1): string =>
    value === null ? "---" : value.toFixed(decimals);

  const handleWidgetClick = () => { if (!isEditMode) setIsDetailModalOpen(true); };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-card border border-border/60 rounded-xl">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading UPS data...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div ref={containerRef} className="w-full h-full flex items-center justify-center bg-card border border-border/60 rounded-xl">
        <div className="text-center p-6">
          <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-sm font-medium mb-2">Configuration Error</h3>
          <p className="text-xs text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full flex flex-col bg-card border border-border/60 rounded-xl overflow-auto cursor-pointer"
        onClick={handleWidgetClick}
      >
        <div className={`flex-1 flex flex-col ${isCompact ? "p-3" : "p-6"}`}>
          {/* UPS Diagram */}
          <UPSDiagram
            bypassVoltage={upsData.bypass.voltage}
            bypassFrequency={upsData.bypass.frequency}
            lineVoltage={upsData.line.voltage}
            lineFrequency={upsData.line.frequency}
            batteryPercent={upsData.battery.percent}
            outputVoltage={upsData.output.voltage}
            outputFrequency={upsData.output.frequency}
            outputCurrent={upsData.output.current}
            status={upsData.status}
            runningTime={upsData.runningTime}
            communicationStatus={upsData.communicationStatus}
            isCompact={isCompact}
            isDataRetained={isDataRetained}
          />

          {/* Bottom Info Cards */}
          <div className={`grid grid-cols-2 ${isCompact ? "gap-2" : "gap-4"}`}>
            {/* Load Card */}
            <div className={`bg-muted/30 rounded-lg ${isCompact ? "p-3" : "p-4"} border border-border/40`}>
              <h3 className={`${isCompact ? "text-xs" : "text-sm"} font-semibold text-slate-700 dark:text-slate-300 mb-3`}>
                Load
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className={`${isCompact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 mb-1`}>Load</p>
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-slate-100`}>
                    {formatValue(upsData.load.percent)} %
                  </p>
                </div>
                <div>
                  <p className={`${isCompact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 mb-1`}>Apparent Power</p>
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-slate-100`}>
                    {formatValue(upsData.load.apparentPower, 3)} kVA
                  </p>
                </div>
                <div>
                  <p className={`${isCompact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 mb-1`}>Active Power</p>
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-slate-100`}>
                    {formatValue(upsData.load.activePower, 3)} kW
                  </p>
                </div>
              </div>
            </div>

            {/* Battery Card */}
            <div className={`bg-muted/30 rounded-lg ${isCompact ? "p-3" : "p-4"} border border-border/40`}>
              <h3 className={`${isCompact ? "text-xs" : "text-sm"} font-semibold text-slate-700 dark:text-slate-300 mb-3`}>
                Battery
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className={`${isCompact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 mb-1`}>Remaining</p>
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-slate-100`}>
                    {formatValue(upsData.battery.time)} Min
                  </p>
                </div>
                <div>
                  <p className={`${isCompact ? "text-xs" : "text-sm"} text-slate-500 dark:text-slate-400 mb-1`}>Voltage</p>
                  <p className={`${isCompact ? "text-sm" : "text-base"} font-semibold text-slate-900 dark:text-slate-100`}>
                    {formatValue(upsData.battery.voltage)} V
                  </p>
                </div>
                <div className="flex items-end">
                  <button
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 text-blue-500 dark:text-blue-400 border border-blue-300 dark:border-blue-600 rounded-lg text-xs font-medium hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1"
                    onClick={e => { e.stopPropagation(); if (!isEditMode) setIsDetailModalOpen(true); }}
                    disabled={isEditMode}
                  >
                    <Info className="w-3 h-3" />
                    Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <UPSDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        upsData={upsData}
        deviceName={deviceDetails?.name || config?.customName || "UPS Device"}
        isDataRetained={isDataRetained}
      />
    </>
  );
};
