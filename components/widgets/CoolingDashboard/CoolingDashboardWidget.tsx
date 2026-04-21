"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Loader2, AlertTriangle } from "lucide-react";
import HVACStatus from "./hvac-status";
import { CoolingDashboardConfig, CoolingKeyMapping } from "./CoolingDashboardConfigModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: CoolingDashboardConfig;
  isEditMode?: boolean;
}

interface HVACData {
  returnTemp?: number | null;
  returnHum?: number | null;
  supplyTemp?: number | null;
  supplyHum?: number | null;
  acStatus?: string | null;
  mode?: string | null;
  commStatus?: string | null;
}

const DEFAULT_COOLING_CONFIG: CoolingDashboardConfig = {
  customName: "Cooling Dashboard",
  deviceUniqId: "",
  keyMapping: {} as CoolingKeyMapping,
};

export const CoolingDashboardWidget = ({ config: rawConfig = DEFAULT_COOLING_CONFIG, isEditMode = false }: Props) => {
  const config = rawConfig || DEFAULT_COOLING_CONFIG;

  const { subscribe, unsubscribe, isReady } = useMqttServer();
  const [data, setData] = useState<HVACData>({
    returnTemp: null,
    returnHum: null,
    supplyTemp: null,
    supplyHum: null,
    acStatus: "OFF",
    mode: "Standby",
    commStatus: "Unknown",
  });

  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // Fetch device topic
  useEffect(() => {
    if (!config.deviceUniqId) {
      setTopic(null);
      setStatus("error");
      setErrorMessage("Please configure a valid HVAC device.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      setErrorMessage("");
      setTopic(null);
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
        );
        if (!response.ok) {
          throw new Error("Device not found");
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
        if (!deviceData.topic) {
            setStatus("error");
            setErrorMessage("Device has no MQTT topic configured.");
        }
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchDeviceTopic();
  }, [config.deviceUniqId]);

  // Handle MQTT messages
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        let innerPayload = payload;
        
        // Handle common wrappers (value, d, etc.) or flat payload
        if (payload.value && typeof payload.value === 'string') {
            try {
                innerPayload = JSON.parse(payload.value);
            } catch {
                innerPayload = payload; // Fallback
            }
        } else if (payload.value && typeof payload.value === 'object') {
            innerPayload = payload.value;
        }

        // --- STRICT MAPPING LOGIC ---
        const mapping = config.keyMapping || {};

        const returnTempKey = mapping.returnTemp;
        const returnHumKey = mapping.returnHum;
        const supplyTempKey = mapping.supplyTemp;
        const supplyHumKey = mapping.supplyHum;
        const statusKey = mapping.acStatus;
        const modeKey = mapping.mode;
        // commKey removed from mapping

        // Determine Communication Status
        let commStatus = "Online";
        if (retained) {
            commStatus = "Retained";
        }

        // Helper to parse float safely
        const getFloat = (key: string | undefined) => {
            if (!key || innerPayload[key] === undefined) return null;
            const val = parseFloat(innerPayload[key]);
            return isNaN(val) ? null : val;
        };

        // Helper to get string safely
        const getString = (key: string | undefined) => {
             if (!key || innerPayload[key] === undefined) return null;
             const val = innerPayload[key];
             return val !== null ? String(val) : null;
        };

        setData({
          returnTemp: getFloat(returnTempKey),
          returnHum: getFloat(returnHumKey),
          supplyTemp: getFloat(supplyTempKey),
          supplyHum: getFloat(supplyHumKey),
          acStatus: getString(statusKey) || "OFF",
          mode: getString(modeKey) || "Standby",
          commStatus: commStatus,
        });

        setStatus("ok");
      } catch (err) {
        console.error("Failed to parse MQTT payload:", err);
      }
    },
    [config.keyMapping] 
  );

  // Subscribe to MQTT topic
  useEffect(() => {
    if (!topic || !isReady) return;

    setStatus("waiting");
    subscribe(topic, handleMqttMessage);

    return () => {
      unsubscribe(topic, handleMqttMessage);
    };
  }, [topic, isReady, subscribe, unsubscribe, handleMqttMessage]);

  if (status === "loading") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white dark:bg-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-slate-900 p-4 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{errorMessage}</p>
        <p className="text-xs text-slate-500 mt-1">Please check widget configuration.</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm relative group">
      {status === "waiting" && (
        <div className="absolute top-2 right-2 z-20">
            <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
            </span>
        </div>
      )}
      <HVACStatus data={data} compact={isEditMode} />
    </div>
  );
};
