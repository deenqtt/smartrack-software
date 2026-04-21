// File: components/widgets/PDMTopology/PDMTopologyWidget.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { PDMTopologyDeviceModal } from "./PDMTopologyDeviceModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface DeviceConfig {
  id: string;
  deviceUniqId: string;
  label: string;
  enabled: boolean;
  selectedKey?: string;
}

interface PDMConfigDevice {
  enabled: boolean;
  deviceUniqId: string;
  label: string;
  selectedKey?: string;
}

interface PDMConfig {
  widgetName: string;
  location: string;
  devices: {
    pdm: PDMConfigDevice;
    ups: DeviceConfig[];
    pdu: DeviceConfig[];
    ac: DeviceConfig[];
  };
  refreshRate: number;
  thresholds: {
    voltage: { min: number; max: number };
    temperature: { max: number };
    battery: { min: number };
  };
  appearance: {
    size: "small" | "medium" | "large";
    theme: "light" | "dark";
    showLabels: boolean;
    showLines: boolean;
    showStatus: boolean;
  };
}

export type { PDMConfig };

interface Props {
  config: PDMConfig;
}

const DEFAULT_PDM_CONFIG: PDMConfig = {
  widgetName: "PDM Topology",
  location: "",
  devices: {
    pdm: { enabled: false, deviceUniqId: "", label: "Main PDM" },
    ups: [],
    pdu: [],
    ac: [],
  },
  refreshRate: 5,
  thresholds: {
    voltage: { min: 190, max: 240 },
    temperature: { max: 45 },
    battery: { min: 20 },
  },
  appearance: {
    size: "medium",
    theme: "light",
    showLabels: true,
    showLines: true,
    showStatus: true,
  },
};

export const PDMTopologyWidget: React.FC<Props> = ({ config: rawConfig = DEFAULT_PDM_CONFIG }) => {
  const config: PDMConfig = {
    ...DEFAULT_PDM_CONFIG,
    ...rawConfig,
    devices: rawConfig?.devices?.pdm !== undefined ? rawConfig.devices : DEFAULT_PDM_CONFIG.devices,
    thresholds: rawConfig?.thresholds?.voltage ? rawConfig.thresholds : DEFAULT_PDM_CONFIG.thresholds,
    appearance: rawConfig?.appearance || DEFAULT_PDM_CONFIG.appearance,
  };

  const { subscribe, unsubscribe, isReady } = useMqttServer();

  // State management
  const [deviceStates, setDeviceStates] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Derived states for UI rendering
  const [pdmStatus, setPdmStatus] = useState<"online" | "warning" | "offline">(
    "online",
  );
  const [voltage, setVoltage] = useState({ v1: 0, v2: 0, v3: 0 });
  const [current, setCurrent] = useState({ a1: 0, a2: 0, a3: 0 });
  const [frequency, setFrequency] = useState(0);
  const [temperature, setTemperature] = useState(0);
  const [batteryLevel, setBatteryLevel] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [primaryMetrics, setPrimaryMetrics] = useState<
    Array<{
      label: string;
      value: string;
    }>
  >([]);

  const subscribedTopicsRef = useRef<
    Map<string, (topic: string, payload: string, serverId: string, retained?: boolean) => void>
  >(new Map());
  const deviceStatesRef = useRef<typeof deviceStates>(deviceStates);

  // Keep ref in sync with latest deviceStates (avoids stale closure in handleMqttMessage)
  useEffect(() => {
    deviceStatesRef.current = deviceStates;
  }, [deviceStates]);

  // Initialize states from config and fetch topics
  // Use a stable key from device IDs to prevent infinite re-renders
  const deviceConfigKey = JSON.stringify(
    [
      config.devices?.pdm?.deviceUniqId,
      ...(config.devices?.ups || []).map((d: any) => d.deviceUniqId),
      ...(config.devices?.pdu || []).map((d: any) => d.deviceUniqId),
      ...(config.devices?.ac || []).map((d: any) => d.deviceUniqId),
    ].sort()
  );

  const hasConfiguredDevices = Boolean(
    (config.devices?.pdm?.enabled && config.devices.pdm.deviceUniqId) ||
    (config.devices?.ups || []).some((d) => d.enabled && d.deviceUniqId) ||
    (config.devices?.pdu || []).some((d) => d.enabled && d.deviceUniqId) ||
    (config.devices?.ac || []).some((d) => d.enabled && d.deviceUniqId),
  );

  useEffect(() => {
    const initializeAndFetch = async () => {
      // Guard: if devices sub-object is not yet hydrated, bail early
      if (!config?.devices) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { pdm, ups = [], pdu = [], ac = [] } = config.devices;

      const allDevices = [
        ...(pdm?.enabled ? [{ ...pdm, type: "pdm", id: "pdm" }] : []),
        ...ups.filter((d: any) => d.enabled).map((d: any) => ({ ...d, type: "ups" })),
        ...pdu.filter((d: any) => d.enabled).map((d: any) => ({ ...d, type: "pdu" })),
        ...ac.filter((d: any) => d.enabled).map((d: any) => ({ ...d, type: "ac" })),
      ];

      if (allDevices.length === 0) {
        setDeviceStates({});
        setVoltage({ v1: 0, v2: 0, v3: 0 });
        setCurrent({ a1: 0, a2: 0, a3: 0 });
        setTemperature(0);
        setBatteryLevel(0);
        setFrequency(0);
        setUptime(0);
        setPrimaryMetrics([]);
        setIsLoading(false);
        setPdmStatus("offline");
        return;
      }

      const initialStates: Record<string, any> = {};

      for (const deviceConfig of allDevices) {
        let topic: string | null = null;
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/devices/external/${deviceConfig.deviceUniqId}`,
          );
          if (response.ok) {
            const deviceData = await response.json();
            topic = deviceData.topic;
          }
        } catch (err) {
          console.error(
            `Failed to fetch topic for device ${deviceConfig.deviceUniqId}:`,
            err,
          );
        }

        initialStates[deviceConfig.id] = {
          config: deviceConfig,
          topic: topic,
          status: "waiting",
          lastUpdate: null,
          metrics: {},
        };
      }
      setDeviceStates(initialStates);
      setIsLoading(false);
    };

    initializeAndFetch();
  }, [deviceConfigKey]); // eslint-disable-line react-hooks/exhaustive-deps


  // MQTT message handler
  const handleMqttMessage = useCallback(
    (topic: string, payloadString: string, _serverId: string, retained?: boolean) => {
      const CANONICAL_METRICS: Record<string, string[]> = {
        Status: ["status", "battery_status", "output_status", "system_status", "state_alarm_status"],
        "Input Voltage": ["input_voltage_phase_a", "main_input_voltage", "input_voltage"],
        "Output Voltage": ["output_voltage_phase_a", "inverter_voltage", "output_voltage"],
        "Load Current": ["output_current_phase_a", "load_current", "output_current"],
        "Load Power": ["output_active_power_phase_a", "active_power", "output_active_power", "output_apparent_power"],
        Frequency: ["frequency", "output_frequency", "input_frequency"],
        "Battery SOC": ["battery_soc", "soc", "battery_percent", "battery_capacity"],
        "Battery Temp": ["battery_temperature", "internal_ups_temperature"],
        "Env. Temp": ["environment_temperature", "internal_ups_temperature"],
        Runtime: ["runtime", "battery_time", "battery_runtime_remaining", "state_total_time_on_normal"],
      };

      try {
        const payload = JSON.parse(payloadString);
        const innerPayload =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value;
        if (!innerPayload) return;

        Object.values(deviceStatesRef.current).forEach((state: any) => {
          if (state.topic === topic) {
            const finalDisplayMetrics: Record<string, any> = {};

            for (const canonicalName in CANONICAL_METRICS) {
              const possibleKeys = CANONICAL_METRICS[canonicalName];
              let found = false;
              for (const pKey in innerPayload) {
                if (found) break;
                const lowerPKey = pKey.toLowerCase();
                if (possibleKeys.some((k) => lowerPKey.includes(k))) {
                  const value = innerPayload[pKey];
                  finalDisplayMetrics[canonicalName] =
                    typeof value === "number"
                      ? parseFloat(value.toFixed(2))
                      : value;
                  found = true;
                }
              }
            }

            setDeviceStates((prev) => {
              const currentState = prev[state.config.id];
              if (!currentState) return prev;

              const newStatus = retained
                ? currentState.status === "waiting"
                  ? "stale"
                  : currentState.status
                : "ok";
              const newLastUpdate = retained
                ? currentState.lastUpdate
                : new Date();

              return {
                ...prev,
                [state.config.id]: {
                  ...currentState,
                  status: newStatus,
                  lastUpdate: newLastUpdate,
                  metrics: finalDisplayMetrics,
                },
              };
            });

            // Update main SVG display values
            const keyMap: { [key: string]: (value: number) => void } = {
              volt: (val) => setVoltage((prev) => ({ ...prev, v1: val })),
              curr: (val) => setCurrent((prev) => ({ ...prev, a1: val })),
              amp: (val) => setCurrent((prev) => ({ ...prev, a1: val })),
              freq: setFrequency,
              uptime: setUptime,
              battery: (val) =>
                setBatteryLevel(Math.min(100, Math.max(0, val))),
              soc: (val) => setBatteryLevel(Math.min(100, Math.max(0, val))),
              temp: setTemperature,
            };

            for (const key in innerPayload) {
              const lowerKey = key.toLowerCase();
              for (const match in keyMap) {
                if (lowerKey.includes(match)) {
                  const numValue = parseFloat(innerPayload[key]);
                  if (!isNaN(numValue)) {
                    keyMap[match](numValue);
                  }
                  break;
                }
              }
            }

            if (state.config.type === "pdm") {
              const priorityKeys = [
                "output_active_power",
                "input_voltage",
              ];

              const metricsToShow = priorityKeys
                .filter((metricKey) => innerPayload[metricKey] !== undefined)
                .slice(0, 3)
                .map((metricKey) => ({
                  label: formatSelectedKeyLabel(metricKey),
                  value: formatMetricValue(innerPayload[metricKey], metricKey),
                }));

              setPrimaryMetrics(metricsToShow);
            }
          }
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [],
  );

  // Manage MQTT Subscriptions
  useEffect(() => {
    if (isLoading || !isReady) return;

    const targetTopics = new Set<string>();
    Object.values(deviceStates).forEach((state: any) => {
      if (state.topic) {
        targetTopics.add(state.topic);
      }
    });

    subscribedTopicsRef.current.forEach((handler, topic) => {
      if (!targetTopics.has(topic)) {
        unsubscribe(topic, handler);
        subscribedTopicsRef.current.delete(topic);
      }
    });

    targetTopics.forEach((topic) => {
      if (!subscribedTopicsRef.current.has(topic)) {
        const handler = (
          topic: string,
          payload: string,
          serverId: string,
          retained?: boolean,
        ) => handleMqttMessage(topic, payload, serverId, retained);
        subscribe(topic, handler);
        subscribedTopicsRef.current.set(topic, handler);
      }
    });

    return () => {
      subscribedTopicsRef.current.forEach((handler, topic) => {
        unsubscribe(topic, handler);
      });
      subscribedTopicsRef.current.clear();
    };
  }, [
    deviceStates,
    isLoading,
    isReady,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Check for stale devices
  useEffect(() => {
    const interval = setInterval(
      () => {
        const now = new Date();
        const timeout = (config.refreshRate || 5) * 1000 * 2.5;

        Object.values(deviceStates).forEach((state: any) => {
          if (state.status === "ok" && state.lastUpdate) {
            if (now.getTime() - state.lastUpdate.getTime() > timeout) {
              setDeviceStates((prev) => ({
                ...prev,
                [state.config.id]: {
                  ...prev[state.config.id],
                  status: "offline",
                },
              }));
            }
          }
        });
      },
      (config.refreshRate || 5) * 1000,
    );

    return () => clearInterval(interval);
  }, [deviceStates, config.refreshRate]);

  // Check thresholds
  useEffect(() => {
    const thresholds = config?.thresholds;
    if (!thresholds) return; // guard: config not yet hydrated

    const voltMin = thresholds.voltage?.min ?? 190;
    const voltMax = thresholds.voltage?.max ?? 240;
    const tempMax = thresholds.temperature?.max ?? 45;
    const battMin = thresholds.battery?.min ?? 20;

    const voltageOk = voltage.v1 >= voltMin && voltage.v1 <= voltMax;
    const tempOk = temperature <= tempMax;
    const batteryOk = batteryLevel >= battMin;

    if (!voltageOk || !tempOk || !batteryOk) {
      setPdmStatus("warning");
    } else {
      setPdmStatus("online");
    }
  }, [voltage, temperature, batteryLevel, config?.thresholds]);

  const getPDMStatusColor = () => {
    const pdmDevice = Object.values(deviceStates).find(
      (s: any) => s?.config?.type === "pdm",
    );
    if (!pdmDevice) return "#ef4444";
    if ((pdmDevice as any).status !== "ok") return "#ef4444";
    if (pdmStatus === "warning") return "#f59e0b";
    return "#10b981";
  };

  const getPDMStatus = () => {
    const pdmDevice = Object.values(deviceStates).find(
      (s: any) => s?.config?.type === "pdm",
    );
    if (!pdmDevice) return "Offline";
    if ((pdmDevice as any).status !== "ok") return "Offline";
    if (pdmStatus === "warning") return "Warning";
    return "Online";
  };

  const formatSelectedKeyLabel = (key?: string) => {
    const labelMap: Record<string, string> = {
      input_voltage: "Input Voltage",
      output_voltage: "Output Voltage",
      output_active_power: "Active Power",
      output_apparent_power: "Apparent Power",
      output_load: "Load",
      battery_capacity: "Battery",
      internal_ups_temperature: "Temperature",
    };

    if (!key) return "Primary Metric";
    return labelMap[key] ?? key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatMetricValue = (value: unknown, key?: string) => {
    const numericValue =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;

    const unitMap: Record<string, string> = {
      input_voltage: "V",
      output_voltage: "V",
      output_active_power: "W",
      output_apparent_power: "VA",
      output_load: "%",
      battery_capacity: "%",
      internal_ups_temperature: "°C",
    };

    if (!Number.isNaN(numericValue)) {
      const display =
        Math.abs(numericValue) >= 100 ? numericValue.toFixed(0) : numericValue.toFixed(1);
      return `${display}${key && unitMap[key] ? ` ${unitMap[key]}` : ""}`;
    }

    return String(value);
  };

  const getDeviceCounts = (type: "ups" | "pdu" | "ac") => {
    const relevantDevices = Object.values(deviceStates).filter(
      (s: any) => s?.config?.type === type,
    );
    const online = relevantDevices.filter((s) => s.status === "ok").length;
    const total = relevantDevices.length;
    const offline = total - online;
    return { online, offline, total };
  };

  // Handle device click
  const handleDeviceClick = (deviceType: string) => {
    const devices = Object.values(deviceStates).filter(
      (s: any) => s?.config?.type === deviceType,
    );
    if (devices.length > 0) {
      setSelectedDevice({ type: deviceType, devices });
      setIsModalOpen(true);
    }
  };

  const upsCounts = getDeviceCounts("ups");
  const pduCounts = getDeviceCounts("pdu");
  const acCounts = getDeviceCounts("ac");

  if (!config?.devices?.pdm) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
          Widget not configured. Please open settings to configure.
        </p>
      </div>
    );
  }

  if (!hasConfiguredDevices) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
        <p className="text-sm font-medium text-red-600 dark:text-red-400 text-center">
          Please configure at least one PDM topology device.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-slate-900 rounded-xl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">
            Loading Configuration...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-gray-50 dark:bg-slate-900 rounded-xl p-6 flex flex-col font-sans relative">
      {/* Header */}
      <div className="mb-4 flex justify-end">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Click on any device to view details
        </div>
      </div>

      {/* SVG Topology - FULLSCREEN & CENTERED */}
      <div className="flex-grow w-full flex items-center justify-center">
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 1100 450"
          className="block"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.2" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Utility Icon (Left) */}
          <g>
            <circle
              cx="150"
              cy="225"
              r="35"
              className="fill-white dark:fill-slate-800"
              stroke="#29B6F6"
              strokeWidth="4"
              filter="url(#shadow)"
            />
            <path
              d="M 130 225 Q 140 215, 150 225 T 170 225"
              fill="none"
              stroke="#29B6F6"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <text
              x="150"
              y="278"
              textAnchor="middle"
              className="fill-gray-500 dark:fill-gray-400"
              fontSize="13"
            >
              Utility
            </text>
          </g>

          {/* Connection line from Utility to PDM */}
          <line
            x1="185"
            y1="225"
            x2="280"
            y2="225"
            stroke="#90CAF9"
            strokeWidth="3"
          />
          <circle cx="280" cy="225" r="5" fill="#29B6F6" />

          {/* Center Circle (PDM) - CLICKABLE */}
          {config.devices.pdm.enabled && (
            <g
              onClick={() => handleDeviceClick("pdm")}
              className="cursor-pointer transition-all hover:opacity-80"
              style={{ cursor: "pointer" }}
            >
              <circle
                cx="420"
                cy="225"
                r="110"
                className="fill-white dark:fill-slate-800"
                stroke="#29B6F6"
                strokeWidth="6"
                filter="url(#shadow)"
              />
              <circle
                cx="420"
                cy="225"
                r="115"
                className="fill-none stroke-blue-400 opacity-0 hover:opacity-30 transition-opacity"
                strokeWidth="2"
                strokeDasharray="5,5"
              />

              <text
                x="420"
                y="220"
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-200"
                fontSize="32"
                fontWeight="300"
              >
                PDM
              </text>
              <text
                x="420"
                y="255"
                textAnchor="middle"
                fill={getPDMStatusColor()}
                fontSize="14"
                fontWeight="bold"
              >
                {getPDMStatus()}
              </text>
              {primaryMetrics.length > 0 && (
                <>
                  <line
                    x1="360"
                    y1="270"
                    x2="480"
                    y2="270"
                    stroke="#cbd5e1"
                    strokeWidth="1"
                  />
                  {primaryMetrics.map((metric, index) => {
                    const y = 290 + index * 20;
                    return (
                      <g key={metric.label}>
                        <text
                          x="375"
                          y={y}
                          textAnchor="start"
                          className="fill-gray-500 dark:fill-gray-400"
                          fontSize="10"
                          fontWeight="600"
                        >
                          {metric.label}
                        </text>
                        <text
                          x="465"
                          y={y}
                          textAnchor="end"
                          className="fill-gray-700 dark:fill-gray-200"
                          fontSize="11"
                          fontWeight="700"
                        >
                          {metric.value}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </g>
          )}

          {/* Main branch line to the right */}
          <line
            x1="530"
            y1="225"
            x2="620"
            y2="225"
            stroke="#90CAF9"
            strokeWidth="3"
          />
          <circle cx="620" cy="225" r="6" fill="#29B6F6" />

          {/* Branch point - vertical lines */}
          <line
            x1="620"
            y1="225"
            x2="620"
            y2="125"
            stroke="#90CAF9"
            strokeWidth="3"
          />
          <line
            x1="620"
            y1="225"
            x2="620"
            y2="325"
            stroke="#90CAF9"
            strokeWidth="3"
          />

          {/* UPS Branch (Top) - CLICKABLE */}
          {upsCounts.total > 0 && (
            <>
              <line
                x1="620"
                y1="125"
                x2="670"
                y2="125"
                stroke="#90CAF9"
                strokeWidth="3"
              />

              <g
                onClick={() => handleDeviceClick("ups")}
                className="cursor-pointer transition-all hover:opacity-80"
                style={{ cursor: "pointer" }}
              >
                <text
                  x="730"
                  y="70"
                  textAnchor="middle"
                  className="fill-gray-500 dark:fill-gray-400"
                  fontSize="13"
                  fontWeight="600"
                >
                  UPS : {upsCounts.total}
                </text>
                <text
                  x="730"
                  y="175"
                  textAnchor="middle"
                  className="fill-green-500 dark:fill-green-400"
                  fontSize="11"
                >
                  ● Online: {upsCounts.online}
                </text>
                {upsCounts.offline > 0 && (
                  <text
                    x="730"
                    y="195"
                    textAnchor="middle"
                    className="fill-red-500 dark:fill-red-400"
                    fontSize="11"
                  >
                    ● Offline: {upsCounts.offline}
                  </text>
                )}

                <circle
                  cx="730"
                  cy="125"
                  r="32"
                  className="fill-white dark:fill-slate-800"
                  stroke="#29B6F6"
                  strokeWidth="4"
                  filter="url(#shadow)"
                />
                <circle
                  cx="730"
                  cy="125"
                  r="37"
                  className="fill-none stroke-blue-400 opacity-0 hover:opacity-30 transition-opacity"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />

                <rect
                  x="718"
                  y="115"
                  width="24"
                  height="6"
                  fill="#29B6F6"
                  rx="2"
                />
                <rect
                  x="718"
                  y="127"
                  width="24"
                  height="6"
                  fill="#29B6F6"
                  rx="2"
                />
                <rect x="720" y="121" width="4" height="6" fill="#29B6F6" />
                <rect x="726" y="121" width="4" height="6" fill="#29B6F6" />
                <rect x="732" y="121" width="4" height="6" fill="#29B6F6" />
                <rect x="738" y="121" width="4" height="6" fill="#29B6F6" />
              </g>

              {/* Connection to PDU */}
              {pduCounts.total > 0 && (
                <>
                  <line
                    x1="762"
                    y1="125"
                    x2="830"
                    y2="125"
                    stroke="#90CAF9"
                    strokeWidth="3"
                  />

                  <g
                    onClick={() => handleDeviceClick("pdu")}
                    className="cursor-pointer transition-all hover:opacity-80"
                    style={{ cursor: "pointer" }}
                  >
                    <text
                      x="890"
                      y="70"
                      textAnchor="middle"
                      className="fill-gray-500 dark:fill-gray-400"
                      fontSize="13"
                      fontWeight="600"
                    >
                      PDU : {pduCounts.total}
                    </text>
                    <text
                      x="890"
                      y="175"
                      textAnchor="middle"
                      className="fill-green-500 dark:fill-green-400"
                      fontSize="11"
                    >
                      ● Online: {pduCounts.online}
                    </text>
                    {pduCounts.offline > 0 && (
                      <text
                        x="890"
                        y="195"
                        textAnchor="middle"
                        className="fill-red-500 dark:fill-red-400"
                        fontSize="11"
                      >
                        ● Offline: {pduCounts.offline}
                      </text>
                    )}

                    <circle
                      cx="890"
                      cy="125"
                      r="32"
                      className="fill-white dark:fill-slate-800"
                      stroke="#29B6F6"
                      strokeWidth="4"
                      filter="url(#shadow)"
                    />
                    <circle
                      cx="890"
                      cy="125"
                      r="37"
                      className="fill-none stroke-blue-400 opacity-0 hover:opacity-30 transition-opacity"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />

                    <rect
                      x="878"
                      y="115"
                      width="24"
                      height="20"
                      className="fill-white dark:fill-slate-800"
                      stroke="#29B6F6"
                      strokeWidth="2.5"
                      rx="3"
                    />
                    <circle cx="884" cy="122" r="2.5" fill="#29B6F6" />
                    <circle cx="896" cy="122" r="2.5" fill="#29B6F6" />
                    <line
                      x1="882"
                      y1="128"
                      x2="898"
                      y2="128"
                      stroke="#29B6F6"
                      strokeWidth="2"
                    />
                    <circle cx="890" cy="131" r="1.5" fill="#29B6F6" />
                  </g>
                </>
              )}
            </>
          )}

          {/* A/C Branch (Bottom) - CLICKABLE */}
          {acCounts.total > 0 && (
            <>
              <line
                x1="620"
                y1="325"
                x2="670"
                y2="325"
                stroke="#90CAF9"
                strokeWidth="3"
              />

              <g
                onClick={() => handleDeviceClick("ac")}
                className="cursor-pointer transition-all hover:opacity-80"
                style={{ cursor: "pointer" }}
              >
                <text
                  x="730"
                  y="280"
                  textAnchor="middle"
                  className="fill-gray-500 dark:fill-gray-400"
                  fontSize="13"
                  fontWeight="600"
                >
                  A/C : {acCounts.total}
                </text>
                <text
                  x="730"
                  y="375"
                  textAnchor="middle"
                  className="fill-green-500 dark:fill-green-400"
                  fontSize="11"
                >
                  ● Online: {acCounts.online}
                </text>
                {acCounts.offline > 0 && (
                  <text
                    x="730"
                    y="395"
                    textAnchor="middle"
                    className="fill-red-500 dark:fill-red-400"
                    fontSize="11"
                  >
                    ● Offline: {acCounts.offline}
                  </text>
                )}

                <circle
                  cx="730"
                  cy="325"
                  r="32"
                  className="fill-white dark:fill-slate-800"
                  stroke="#29B6F6"
                  strokeWidth="4"
                  filter="url(#shadow)"
                />
                <circle
                  cx="730"
                  cy="325"
                  r="37"
                  className="fill-none stroke-blue-400 opacity-0 hover:opacity-30 transition-opacity"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                />

                {/* Fan blades */}
                <path
                  d="M 730 315 L 730 335"
                  stroke="#29B6F6"
                  strokeWidth="2.5"
                />
                <path
                  d="M 720 325 L 740 325"
                  stroke="#29B6F6"
                  strokeWidth="2.5"
                />
                <path
                  d="M 723 318 L 737 332"
                  stroke="#29B6F6"
                  strokeWidth="2"
                />
                <path
                  d="M 737 318 L 723 332"
                  stroke="#29B6F6"
                  strokeWidth="2"
                />
                <circle cx="730" cy="325" r="4" fill="#29B6F6" />
              </g>
            </>
          )}
        </svg>
      </div>

      {/* Device Details Modal */}
      <PDMTopologyDeviceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedDevice={selectedDevice}
      />
    </div>
  );
};
