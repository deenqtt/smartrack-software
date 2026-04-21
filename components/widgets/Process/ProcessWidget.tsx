// File: components/widgets/Process/ProcessWidget.tsx
"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Loader2, AlertTriangle, Activity } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    deviceUniqId: string;
    selectedKey: string;
    name: string;
    desc: string;
    processType?: string; // tank, rectangle, circle, etc.
    units?: string;
  };
  widgetType?: string; // Add widgetType prop
}

export const ProcessWidget = ({ config, widgetType }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  // Calculate connection status from active brokers
  const connectionStatus = brokers.some((broker) => broker.status === "connected")
    ? "Connected"
    : "Disconnected";
  const [displayValue, setDisplayValue] = useState<string | number | null>(
    null
  );
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "waiting">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [topic, setTopic] = useState<string | null>(null);

  // Responsive sizing
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateDimensions = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });
    };

    const resizeObserver = new ResizeObserver(updateDimensions);
    resizeObserver.observe(container);
    updateDimensions();

    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!config.deviceUniqId) {
      setStatus("error");
      setErrorMessage("Device not configured.");
      return;
    }

    const fetchDeviceTopic = async () => {
      setStatus("loading");
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/devices/external/${config.deviceUniqId}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Device not found`);
        }
        const deviceData = await response.json();
        setTopic(deviceData.topic || null);
      } catch (err: any) {
        setStatus("error");
        setErrorMessage(err.message);
      }
    };

    fetchDeviceTopic();
  }, [config.deviceUniqId]);

  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        const payload = JSON.parse(payloadString);

        // Check if payload has 'value' property (standard format)
        if (payload.hasOwnProperty("value")) {
          const innerPayload =
            typeof payload.value === "string"
              ? JSON.parse(payload.value)
              : payload.value || {};

          if (innerPayload.hasOwnProperty(config.selectedKey)) {
            const rawValue = innerPayload[config.selectedKey];
            setDisplayValue(rawValue);
            setStatus("ok");
          }
        }
        // Direct payload format (no 'value' wrapper)
        else if (payload.hasOwnProperty(config.selectedKey)) {
          const rawValue = payload[config.selectedKey];
          setDisplayValue(rawValue);
          setStatus("ok");
        }
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
      }
    },
    [config.selectedKey]
  );

  useEffect(() => {
    if (topic && isReady && connectionStatus === "Connected") {
      setStatus("waiting");
      subscribe(topic, handleMqttMessage);
      return () => {
        unsubscribe(topic, handleMqttMessage);
      };
    }
  }, [
    topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  const getStatusColor = () => {
    switch (status) {
      case "ok":
        return "stroke-emerald-500 fill-emerald-100";
      case "error":
        return "stroke-red-500 fill-red-100";
      case "loading":
      case "waiting":
        return "stroke-amber-500 fill-amber-100";
      default:
        return "stroke-slate-400 fill-slate-100";
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case "ok":
        return "bg-emerald-500";
      case "error":
        return "bg-red-500";
      case "loading":
        return "bg-amber-500 animate-pulse";
      case "waiting":
        return "bg-amber-500 animate-pulse";
      default:
        return "bg-slate-400";
    }
  };

  const formatValue = (value: string | number | null) => {
    if (value === null) return "—";
    if (typeof value === "number") {
      return value.toLocaleString(undefined, {
        maximumFractionDigits: 2,
        minimumFractionDigits: value % 1 === 0 ? 0 : 1,
      });
    }
    return String(value);
  };

  // Determine process type from widgetType
  const getProcessType = () => {
    if (config.processType) return config.processType;

    switch (widgetType) {
      case "Process Box":
        return "rectangle";
      case "Process Cylinder":
        return "tank";
      case "Process Circle":
        return "circle";
      case "Process Triangle":
        return "triangle";
      default:
        return "rectangle";
    }
  };

  const renderProcessShape = () => {
    const shapeColor = getStatusColor();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const size = Math.min(dimensions.width, dimensions.height) * 0.8;
    const processType = getProcessType();

    switch (processType) {
      case "tank":
        // Tank should be responsive to width
        const tankWidth = dimensions.width * 0.7;
        const tankHeight = dimensions.height * 0.6;
        return (
          <g>
            {/* Tank body */}
            <rect
              x={centerX - tankWidth / 2}
              y={centerY - tankHeight / 2}
              width={tankWidth}
              height={tankHeight}
              className={shapeColor}
              strokeWidth="3"
              rx="8"
            />
            {/* Tank top */}
            <ellipse
              cx={centerX}
              cy={centerY - tankHeight / 2}
              rx={tankWidth / 2}
              ry={tankHeight / 8}
              className={shapeColor}
              strokeWidth="3"
            />
          </g>
        );

      case "rectangle":
        return (
          <rect
            x={centerX - size / 2}
            y={centerY - size / 3}
            width={size}
            height={(size * 2) / 3}
            className={shapeColor}
            strokeWidth="3"
            rx="8"
          />
        );

      case "circle":
        return (
          <circle
            cx={centerX}
            cy={centerY}
            r={size / 3}
            className={shapeColor}
            strokeWidth="3"
          />
        );

      case "triangle":
        const trianglePoints = `${centerX},${centerY - size / 3} ${centerX - size / 2
          },${centerY + size / 3} ${centerX + size / 2},${centerY + size / 3}`;
        return (
          <polygon
            points={trianglePoints}
            className={shapeColor}
            strokeWidth="3"
          />
        );

      default:
        return (
          <rect
            x={centerX - size / 2}
            y={centerY - size / 3}
            width={size}
            height={(size * 2) / 3}
            className={shapeColor}
            strokeWidth="3"
            rx="8"
          />
        );
    }
  };

  const renderContent = () => {
    const isLoading =
      status === "loading" || (status === "waiting" && displayValue === null);

    if (isLoading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Loader2 className="animate-spin text-slate-400 w-8 h-8" />
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      );
    }

    if (status === "error") {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-2">
          <AlertTriangle className="text-red-500 w-8 h-8" />
          <p className="text-xs text-red-600 break-words">{errorMessage}</p>
        </div>
      );
    }

    return (
      <div className="absolute inset-0 flex flex-col">
        {/* Header - responsive sizing */}
        <div className="p-1 bg-white/90 backdrop-blur-sm border-b border-slate-200">
          <h3
            className="text-xs font-medium text-slate-700 truncate"
            title={config.name}
            style={{ fontSize: Math.max(dimensions.width / 20, 10) }}
          >
            {config.name}
          </h3>
          {config.desc && dimensions.height > 90 && (
            <p
              className="text-xs text-slate-500 truncate"
              title={config.desc}
              style={{ fontSize: Math.max(dimensions.width / 25, 8) }}
            >
              {config.desc}
            </p>
          )}
        </div>

        {/* Process shape and value */}
        <div className="flex-1 relative">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            {renderProcessShape()}
          </svg>

          {/* Value overlay - smaller text, no background */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div
                className="font-bold text-slate-900 drop-shadow-sm"
                style={{
                  fontSize: Math.max(dimensions.width / 12, 8),
                }}
              >
                {formatValue(displayValue)}
                {config.units && (
                  <span
                    className="ml-1 font-medium text-slate-600"
                    style={{
                      fontSize: Math.max(dimensions.width / 16, 6),
                    }}
                  >
                    {config.units}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status indicator - responsive sizing */}
        <div className="absolute top-1 right-1">
          <div
            className={`rounded-full ${getStatusBgColor()}`}
            style={{
              width: Math.max(dimensions.width / 20, 6),
              height: Math.max(dimensions.width / 20, 6),
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={`
        w-full h-full relative overflow-hidden cursor-move
        bg-gradient-to-br from-slate-50 to-slate-100
        border border-slate-200 rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-300 ease-out
        group hover:scale-[1.01] transform-gpu
      `}
      style={{
        minHeight: 30,
      }}
    >
      {renderContent()}
    </div>
  );
};
