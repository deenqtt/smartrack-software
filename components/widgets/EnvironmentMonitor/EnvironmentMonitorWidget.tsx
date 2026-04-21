"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Loader2, AlertTriangle, Wind, Droplets, Activity, Thermometer } from "lucide-react";
import { EnvironmentMonitorConfig } from "./EnvironmentMonitorConfig";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: EnvironmentMonitorConfig;
  isEditMode?: boolean;
}

interface EnvData {
  tempFront: number | null;
  humFront: number | null;
  tempBack: number | null;
  humBack: number | null;
  waterLeak: boolean;
  vibX: number;
  vibY: number;
  vibZ: number;
}

const DEFAULT_CONFIG: EnvironmentMonitorConfig = {
  customName: "Rack Environment",
  deviceUniqId: "",
  keyMapping: {
    tempFront: "temp_front", humFront: "hum_front",
    tempBack: "temp_back", humBack: "hum_back",
    waterLeak: "water_leak", vibX: "vib_x", vibY: "vib_y", vibZ: "vib_z"
  }
};

export const EnvironmentMonitorWidget = ({ config: rawConfig = DEFAULT_CONFIG, isEditMode = false }: Props) => {
  const config = rawConfig ?? DEFAULT_CONFIG;
  const { subscribe, unsubscribe, isReady } = useMqttServer();

  const [data, setData] = useState<EnvData>({
    tempFront: null, humFront: null, tempBack: null, humBack: null,
    waterLeak: false, vibX: 0, vibY: 0, vibZ: 0
  });

  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setTopic(null);
      setStatus("error");
      setErrorMessage("Please configure a valid device.");
      return;
    }

    const fetchTopic = async () => {
      setStatus("loading");
      setErrorMessage("");
      try {
        const res = await fetch(`${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`);
        if (!res.ok) throw new Error("Device not found");
        const dev = await res.json();
        setTopic(dev.topic || null);
        if (!dev.topic) {
          setStatus("error");
          setErrorMessage("Device has no MQTT topic configured.");
        } else {
          setStatus("waiting");
        }
      } catch (err: any) {
        setTopic(null);
        setStatus("error");
        setErrorMessage(err.message);
      }
    };
    fetchTopic();
  }, [config.deviceUniqId]);

  const handleMqttMessage = useCallback((receivedTopic: string, payloadString: string) => {
    try {
      const payload = JSON.parse(payloadString);
      let inner = payload;
      if (payload.value && typeof payload.value === 'string') {
        try { inner = JSON.parse(payload.value); } catch { inner = payload; }
      } else if (payload.value && typeof payload.value === 'object') {
        inner = payload.value;
      }

      const m = config.keyMapping || DEFAULT_CONFIG.keyMapping!;

      const getFloat = (k: string) => {
        if (inner[k] === undefined) return null;
        const v = parseFloat(inner[k]);
        return isNaN(v) ? null : v;
      };

      const getBool = (k: string) => {
        if (inner[k] === undefined) return false;
        return inner[k] === true || inner[k] === "true" || inner[k] === 1 || inner[k] === "1";
      };

      setData({
        tempFront: getFloat(m.tempFront),
        humFront: getFloat(m.humFront),
        tempBack: getFloat(m.tempBack),
        humBack: getFloat(m.humBack),
        waterLeak: getBool(m.waterLeak),
        vibX: getFloat(m.vibX) || 0,
        vibY: getFloat(m.vibY) || 0,
        vibZ: getFloat(m.vibZ) || 0,
      });

      setStatus("ok");
    } catch (err) {}
  }, [config.keyMapping]);

  useEffect(() => {
    if (!topic || !isReady) return;
    subscribe(topic, handleMqttMessage);
    return () => { unsubscribe(topic, handleMqttMessage); };
  }, [topic, isReady, subscribe, unsubscribe, handleMqttMessage]);

  if (status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{errorMessage}</p>
      </div>
    );
  }

  const isTilted = Math.abs(data.vibX) > 0.5 || Math.abs(data.vibY) > 0.5;

  return (
    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-950 text-white relative flex flex-col font-mono shadow-xl border border-slate-800">
      
      {/* Dynamic Background Warning Glow */}
      <div className={`absolute inset-0 opacity-10 blur-3xl transition-colors duration-1000 ${data.waterLeak ? "bg-red-500" : isTilted ? "bg-amber-500" : "bg-emerald-500"}`} />
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between z-10 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-wider text-slate-100">{config.customName}</h3>
            <p className="text-[10px] text-slate-400 tracking-widest">{config.deviceUniqId}</p>
          </div>
        </div>
        
        {status === "waiting" && (
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
          </span>
        )}
      </div>

      {/* Grid Content */}
      <div className="flex-1 p-5 grid grid-cols-2 grid-rows-2 gap-4 z-10 relative">
        
        {/* Front Climate */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
          <div className="flex items-center text-slate-400 gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-semibold tracking-wider">FRONT CLIMATE</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-light text-slate-100">{data.tempFront?.toFixed(1) || "--"}</span>
            <span className="text-sm text-slate-400 mb-1">°C</span>
          </div>
          <div className="mt-2 text-xs font-medium text-sky-400/80 flex items-center gap-1">
            <Wind className="w-3 h-3" /> RH: {data.humFront?.toFixed(0) || "--"}%
          </div>
        </div>

        {/* Back Climate */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex flex-col justify-between">
           <div className="flex items-center text-slate-400 gap-2 mb-2">
            <Thermometer className="w-4 h-4 text-rose-400" />
            <span className="text-xs font-semibold tracking-wider">REAR CLIMATE</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-light text-slate-100">{data.tempBack?.toFixed(1) || "--"}</span>
            <span className="text-sm text-slate-400 mb-1">°C</span>
          </div>
          <div className="mt-2 text-xs font-medium text-rose-400/80 flex items-center gap-1">
            <Wind className="w-3 h-3" /> RH: {data.humBack?.toFixed(0) || "--"}%
          </div>
        </div>

        {/* Vibration / Tilt Status */}
        <div className={`rounded-xl border p-4 flex flex-col justify-between transition-colors duration-500 ${isTilted ? "bg-amber-950/40 border-amber-500/50" : "bg-slate-900/80 border-slate-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Activity className={`w-4 h-4 ${isTilted ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
            <span className={`text-xs font-semibold tracking-wider ${isTilted ? "text-amber-400" : "text-slate-400"}`}>RACK VIBRATION</span>
          </div>
          <div className="flex items-end">
            <span className={`text-2xl font-bold tracking-wider ${isTilted ? "text-amber-500" : "text-emerald-500"}`}>
              {isTilted ? "TILTED" : "STABLE"}
            </span>
          </div>
          <div className="mt-2 text-[10px] space-x-2 text-slate-500">
            <span>X:{data.vibX.toFixed(2)}</span>
            <span>Y:{data.vibY.toFixed(2)}</span>
            <span>Z:{data.vibZ.toFixed(2)}</span>
          </div>
        </div>

        {/* Water Leak Status */}
        <div className={`rounded-xl border p-4 flex flex-col justify-between transition-colors duration-500 ${data.waterLeak ? "bg-red-950/40 border-red-500/50" : "bg-slate-900/80 border-slate-800"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Droplets className={`w-4 h-4 ${data.waterLeak ? "text-red-400 animate-bounce" : "text-blue-400"}`} />
            <span className={`text-xs font-semibold tracking-wider ${data.waterLeak ? "text-red-400" : "text-slate-400"}`}>WATER LEAK</span>
          </div>
          <div className="flex items-end">
            <span className={`text-2xl font-bold tracking-wider ${data.waterLeak ? "text-red-500" : "text-blue-500"}`}>
              {data.waterLeak ? "DETECTED!" : "CLEAR"}
            </span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 uppercase">
            FLOOR SENSOR STATUS
          </div>
        </div>

      </div>

    </div>
  );
};
