// File: components/widgets/ButtonControlModbus/ButtonControlModbusWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  Loader2,
  Power,
  AlertTriangle,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { showToast } from "@/lib/toast-utils";

// Tipe untuk data perangkat dari respons MQTT
interface MqttDevice {
  profile: {
    name: string;
    topic: string;
  };
  protocol_setting: any;
}

interface Props {
  config: {
    widgetTitle: string;
    selectedDevice: MqttDevice;
    selectedKey: string;
    onValue: string;
    offValue: string;
  };
}

// Helper function to map pin name to address
const mapPinToAddress = (key: string): number => {
  const match = key.match(/\d+/);
  return match ? parseInt(match[0], 10) + 8 : 9;
};

export const ButtonControlModbusWidget = ({ config }: Props) => {
  const { publish, subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const connectionStatus = brokers.some(broker => broker.status === 'connected') ? 'Connected' : 'Disconnected';

  const [currentState, setCurrentState] = useState<"UNKNOWN" | "ON" | "OFF">(
    "UNKNOWN"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [macAddress, setMacAddress] = useState<string | null>(null);

  // Responsive system - SAMA SEPERTI WIDGET LAIN
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 12,
    buttonSize: 96,
    iconSize: 48,
    statusFontSize: 11,
    padding: 16,
    headerHeight: 40,
  });

  // RESPONSIVE CALCULATION
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      setDimensions({ width: w, height: h });

      // Calculate header height
      const headerHeight = Math.max(36, Math.min(h * 0.12, 48));
      const availableHeight = h - headerHeight;

      // Dynamic sizing
      const baseSize = Math.sqrt(w * h);
      const minDimension = Math.min(w, h);

      // Button size - max 40% of available height, or 30% of width
      const maxButtonSize = Math.min(availableHeight * 0.5, w * 0.4, 120);
      const buttonSize = Math.max(64, Math.min(baseSize * 0.3, maxButtonSize));

      setDynamicSizes({
        titleFontSize: Math.max(11, Math.min(headerHeight * 0.35, 16)),
        buttonSize: Math.round(buttonSize),
        iconSize: Math.round(buttonSize * 0.5),
        statusFontSize: Math.max(9, Math.min(baseSize * 0.04, 13)),
        padding: Math.max(12, Math.min(baseSize * 0.05, 20)),
        headerHeight,
      });
    };

    updateLayout();
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  // Subscribe ke 2 topik: status device dan config global (untuk MAC)
  useEffect(() => {
    if (
      !config.selectedDevice?.profile.topic ||
      !isReady ||
      connectionStatus !== "Connected"
    ) {
      setIsLoading(false);
      return;
    }

    const deviceTopic = config.selectedDevice.profile.topic;
    const configTopic = "mqtt_config";

    const handleMessage = (topic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);
        if (topic === configTopic) {
          setMacAddress(payload.mac || null);
        } else if (topic === deviceTopic) {
          const innerPayload =
            typeof payload.value === "string"
              ? JSON.parse(payload.value)
              : payload.value || {};
          if (innerPayload.hasOwnProperty(config.selectedKey)) {
            const rawValue = String(innerPayload[config.selectedKey]);
            if (rawValue === String(config.onValue)) {
              setCurrentState("ON");
            } else if (rawValue === String(config.offValue)) {
              setCurrentState("OFF");
            } else {
              setCurrentState("UNKNOWN");
            }
            setIsLoading(false);
          }
        }
      } catch (e) {
        console.error("Failed to parse payload:", e);
      }
    };

    setIsLoading(true);
    subscribe(deviceTopic, handleMessage);
    subscribe(configTopic, handleMessage);

    return () => {
      unsubscribe(deviceTopic, handleMessage);
      unsubscribe(configTopic, handleMessage);
    };
  }, [config, isReady, connectionStatus, subscribe, unsubscribe]);

  // Handle toggle button
  const handleToggle = () => {
    if (currentState === "UNKNOWN" || !macAddress) {
      showToast.warning(
        "Incomplete",
        "All fields are required."
      );
      return;
    }

    const { selectedDevice, selectedKey, onValue, offValue } = config;
    const { protocol_setting } = selectedDevice;
    const newValue = currentState === "ON" ? offValue : onValue;

    const commandPayload = {
      mac: macAddress,
      number_address: protocol_setting.address,
      value: {
        address: mapPinToAddress(selectedKey),
        value: Number(newValue),
      },
      port: protocol_setting.port,
      baudrate: protocol_setting.baudrate,
      parity: protocol_setting.parity,
      bytesize: protocol_setting.bytesize,
      stop_bit: protocol_setting.stop_bit,
      timeout: protocol_setting.timeout,
      endianness: protocol_setting.endianness,
      data_type: "UINT16",
      function: "single",
    };

    const commandTopic = "modbus/control/command";
    publish(commandTopic, JSON.stringify(commandPayload));
  };

  // Status styling - KONSISTEN DENGAN WIDGET LAIN
  const getStatusStyles = () => {
    const baseStyles = {
      title: "text-slate-700 dark:text-slate-300",
    };

    switch (currentState) {
      case "ON":
        return {
          ...baseStyles,
          indicator: "bg-emerald-500 dark:bg-emerald-500",
          pulse: true,
          buttonBg: "bg-green-500 dark:bg-green-600",
          buttonHover: "hover:bg-green-600 dark:hover:bg-green-700",
          buttonShadow:
            "shadow-lg shadow-green-500/50 dark:shadow-green-900/50",
          buttonText: "text-white dark:text-white",
        };
      case "OFF":
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
          buttonBg: "bg-slate-400 dark:bg-slate-600",
          buttonHover: "hover:bg-slate-500 dark:hover:bg-slate-700",
          buttonShadow: "",
          buttonText: "text-white dark:text-slate-200",
        };
      case "UNKNOWN":
        return {
          ...baseStyles,
          indicator: "bg-amber-500 dark:bg-amber-500",
          pulse: true,
          buttonBg: "bg-amber-400 dark:bg-amber-600",
          buttonHover: "",
          buttonShadow: "",
          buttonText: "text-white dark:text-amber-100",
        };
      default:
        return {
          ...baseStyles,
          indicator: "bg-slate-400 dark:bg-slate-500",
          pulse: false,
          buttonBg: "bg-slate-400",
          buttonHover: "",
          buttonShadow: "",
          buttonText: "text-white",
        };
    }
  };

  // Render content based on state
  const renderContent = () => {
    const styles = getStatusStyles();

    // Loading state
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center gap-3 h-full">
          <Loader2
            className="animate-spin text-slate-400 dark:text-slate-500"
            style={{
              width: dynamicSizes.buttonSize * 0.5,
              height: dynamicSizes.buttonSize * 0.5,
            }}
          />
          <p
            className="font-medium text-slate-600 dark:text-slate-400"
            style={{ fontSize: `${dynamicSizes.statusFontSize}px` }}
          >
            Loading...
          </p>
        </div>
      );
    }

    // Success state - show button
    return (
      <div className="flex flex-col items-center justify-center gap-4 h-full">
        {/* Control Button */}
        <button
          onClick={handleToggle}
          disabled={currentState === "UNKNOWN"}
          className={cn(
            "rounded-full flex items-center justify-center",
            "transition-all duration-300 ease-out",
            "transform active:scale-90",
            "border-2 border-transparent",
            styles.buttonBg,
            styles.buttonHover,
            styles.buttonShadow,
            styles.buttonText,
            currentState === "UNKNOWN" && "cursor-not-allowed opacity-75",
            currentState !== "UNKNOWN" && "hover:scale-105"
          )}
          style={{
            width: dynamicSizes.buttonSize,
            height: dynamicSizes.buttonSize,
          }}
        >
          <Power
            style={{
              width: dynamicSizes.iconSize,
              height: dynamicSizes.iconSize,
            }}
          />
        </button>

        {/* Status Text */}
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "rounded-full transition-all duration-300",
              styles.indicator,
              styles.pulse ? "animate-pulse" : ""
            )}
            style={{
              width: Math.max(dynamicSizes.statusFontSize * 0.7, 8),
              height: Math.max(dynamicSizes.statusFontSize * 0.7, 8),
            }}
          />
          <p
            className={cn(
              "font-semibold",
              currentState === "ON" && "text-green-600 dark:text-green-400",
              currentState === "OFF" && "text-slate-600 dark:text-slate-400",
              currentState === "UNKNOWN" && "text-amber-600 dark:text-amber-400"
            )}
            style={{ fontSize: `${dynamicSizes.statusFontSize}px` }}
          >
            {currentState}
          </p>
        </div>
      </div>
    );
  };

  const styles = getStatusStyles();

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-card dark:bg-card 
                 border border-border/60 dark:border-border/40 
                 rounded-xl shadow-sm hover:shadow-md 
                 transition-all duration-300 ease-out 
                 overflow-hidden group"
      style={{
        minWidth: 100,
        minHeight: 80,
      }}
    >
      {/* HEADER - Fixed position dengan pattern konsisten */}
      <div
        className="absolute top-0 left-0 right-0 px-4
                   bg-muted/20
                   flex items-center justify-between flex-shrink-0
                   border-b border-border/40"
        style={{ height: `${dynamicSizes.headerHeight}px` }}
      >
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap
            className="text-slate-500 dark:text-slate-400 flex-shrink-0"
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
              height: Math.max(dynamicSizes.titleFontSize * 1.1, 14),
            }}
          />
          <h3
            className={cn(
              "font-medium truncate transition-colors duration-200",
              styles.title
            )}
            style={{
              fontSize: `${dynamicSizes.titleFontSize}px`,
              lineHeight: 1.3,
            }}
            title={config.widgetTitle}
          >
            {config.widgetTitle}
          </h3>
        </div>

        {/* Right: Status indicators - KONSISTEN DENGAN WIDGET LAIN */}
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {/* Wifi status icon */}
          {connectionStatus === "Connected" && isReady ? (
            <Wifi
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          ) : (
            <WifiOff
              className="text-slate-400 dark:text-slate-500"
              style={{
                width: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
                height: Math.max(dynamicSizes.titleFontSize * 0.9, 12),
              }}
            />
          )}

          {/* Status indicator dot */}
          <div
            className={cn(
              "rounded-full transition-all duration-300",
              styles.indicator,
              styles.pulse ? "animate-pulse" : ""
            )}
            style={{
              width: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
              height: Math.max(dynamicSizes.titleFontSize * 0.65, 8),
            }}
          />
        </div>
      </div>

      {/* CONTENT - with proper spacing from header */}
      <div
        className="w-full h-full flex items-center justify-center"
        style={{
          paddingTop: dynamicSizes.headerHeight + dynamicSizes.padding * 0.5,
          paddingBottom: dynamicSizes.padding,
          paddingLeft: dynamicSizes.padding,
          paddingRight: dynamicSizes.padding,
        }}
      >
        {renderContent()}
      </div>

      {/* Minimal hover effect - KONSISTEN DENGAN WIDGET LAIN */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/2 dark:from-slate-900/5 via-transparent to-transparent pointer-events-none rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
};
