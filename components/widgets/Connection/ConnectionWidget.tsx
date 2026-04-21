"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { Loader2, AlertTriangle, Database, Wifi, WifiOff, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    deviceUniqId: string;
    selectedKey: string;
    name: string;
    desc: string;
    connectionType: string; // pipe, line, arrow, etc.
    flowDirection: "forward" | "reverse" | "bidirectional";
    animated: boolean;
    animationSpeed: number;
    color: string;
    thickness: number;
    showFlow: boolean;
  };
  isEditMode?: boolean;
}

export const ConnectionWidget = ({ config, isEditMode = false }: Props) => {
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

  // Modal and device details state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

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
        let dataObject = payload;

        // Check if payload has 'value' property
        if (payload.hasOwnProperty("value")) {
          // Handle different value formats
          if (typeof payload.value === "string") {
            try {
              dataObject = JSON.parse(payload.value);
            } catch (e) {
              // If parsing fails, use the string directly as value
              if (config.selectedKey === "value") {
                setDisplayValue(payload.value);
                setStatus("ok");
                return;
              }
              dataObject = payload;
            }
          } else if (
            typeof payload.value === "object" &&
            payload.value !== null
          ) {
            dataObject = payload.value;
          } else {
            // value is a primitive, use it directly if selectedKey is "value"
            if (config.selectedKey === "value") {
              setDisplayValue(payload.value);
              setStatus("ok");
              return;
            }
            dataObject = payload;
          }
        }

        // Extract value from data object
        if (
          dataObject &&
          typeof dataObject === "object" &&
          dataObject.hasOwnProperty(config.selectedKey)
        ) {
          const rawValue = dataObject[config.selectedKey];
          setDisplayValue(rawValue);
          setStatus("ok");
        } else if (
          config.selectedKey === "value" &&
          payload.hasOwnProperty("value")
        ) {
          // Special case for when selectedKey is "value"
          setDisplayValue(payload.value);
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

  const renderConnectionShape = () => {
    const shapeColor = getStatusColor();
    const centerX = dimensions.width / 2;
    const centerY = dimensions.height / 2;
    const length = Math.min(dimensions.width * 0.8, 200); // Max length
    const startX = centerX - length / 2;
    const endX = centerX + length / 2;
    const y = centerY;

    switch (config.connectionType) {
      case "pipe":
        return (
          <g>
            {/* Pipe body */}
            <rect
              x={startX}
              y={y - config.thickness / 2}
              width={length}
              height={config.thickness}
              className={shapeColor}
              strokeWidth="1"
              rx="4"
            />
            {/* Pipe ends */}
            <circle
              cx={startX}
              cy={y}
              r={config.thickness / 2}
              className={shapeColor}
              strokeWidth="1"
            />
            <circle
              cx={endX}
              cy={y}
              r={config.thickness / 2}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      case "line":
        return (
          <line
            x1={startX}
            y1={y}
            x2={endX}
            y2={y}
            className={shapeColor}
            strokeWidth={config.thickness}
            strokeLinecap="round"
          />
        );

      case "arrow":
        const arrowSize = config.thickness * 2;
        return (
          <g>
            {/* Arrow line */}
            <line
              x1={startX}
              y1={y}
              x2={endX - arrowSize}
              y2={y}
              className={shapeColor}
              strokeWidth={config.thickness}
              strokeLinecap="round"
            />
            {/* Arrow head */}
            <polygon
              points={`${endX - arrowSize},${y - arrowSize / 2} ${endX},${y} ${endX - arrowSize
                },${y + arrowSize / 2}`}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      case "double-arrow":
        const doubleArrowSize = config.thickness * 2;
        return (
          <g>
            {/* Arrow line */}
            <line
              x1={startX + doubleArrowSize}
              y1={y}
              x2={endX - doubleArrowSize}
              y2={y}
              className={shapeColor}
              strokeWidth={config.thickness}
              strokeLinecap="round"
            />
            {/* Left arrow head */}
            <polygon
              points={`${startX + doubleArrowSize},${y + doubleArrowSize / 2
                } ${startX},${y} ${startX + doubleArrowSize},${y - doubleArrowSize / 2
                }`}
              className={shapeColor}
              strokeWidth="1"
            />
            {/* Right arrow head */}
            <polygon
              points={`${endX - doubleArrowSize},${y - doubleArrowSize / 2
                } ${endX},${y} ${endX - doubleArrowSize},${y + doubleArrowSize / 2
                }`}
              className={shapeColor}
              strokeWidth="1"
            />
          </g>
        );

      default:
        return (
          <line
            x1={startX}
            y1={y}
            x2={endX}
            y2={y}
            className={shapeColor}
            strokeWidth={config.thickness}
            strokeLinecap="round"
          />
        );
    }
  };

  const renderFlowAnimation = () => {
    if (!config.animated || !config.showFlow || status !== "ok") return null;

    const particles = [];
    const particleCount = 3;
    const length = Math.min(dimensions.width * 0.8, 200);

    for (let i = 0; i < particleCount; i++) {
      const delay = i * (1 / config.animationSpeed);
      const startX = dimensions.width / 2 - length / 2;
      const endX = dimensions.width / 2 + length / 2;

      particles.push(
        <circle
          key={i}
          r={config.thickness / 3}
          fill="#ffffff"
          opacity="0.8"
          style={{
            animation: `flow-${config.flowDirection} ${2 / config.animationSpeed
              }s linear ${delay}s infinite`,
          }}
        >
          <animateMotion
            dur={`${2 / config.animationSpeed}s`}
            begin={`${delay}s`}
            repeatCount="indefinite"
            path={`M ${startX} ${dimensions.height / 2} L ${endX} ${dimensions.height / 2
              }`}
          />
        </circle>
      );
    }

    return <g>{particles}</g>;
  };

  // Click handler for showing device details
  const handleWidgetClick = async (e: React.MouseEvent) => {
    // Don't show details if in edit mode
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);

    try {
      // Fetch detailed device information
      const deviceResponse = await fetch(`${API_BASE_URL}/api/devices/external`, {
        credentials: 'include'
      });

      if (deviceResponse.ok) {
        const devices = await deviceResponse.json();
        const deviceDetail = devices.find((d: any) => d.uniqId === config.deviceUniqId);

        if (deviceDetail) {
          setDeviceDetails(deviceDetail);
        }
      }
    } catch (error) {
      console.error('Failed to fetch device details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const getStatusIndicatorClass = (status: "loading" | "error" | "ok" | "waiting") => {
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
        {/* Header */}
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

        {/* Connection shape and value */}
        <div className="flex-1 relative">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            {renderConnectionShape()}
            {renderFlowAnimation()}
          </svg>

          {/* Value overlay */}
          <div className="absolute bottom-1 left-1">
            <div
              className="font-bold text-slate-900 drop-shadow-sm bg-white/80 px-1 rounded"
              style={{
                fontSize: Math.max(dimensions.width / 16, 8),
              }}
            >
              {formatValue(displayValue)}
            </div>
          </div>
        </div>

        {/* Status indicator */}
        <div className="absolute top-1 right-1">
          <div
            className={`rounded-full ${getStatusIndicatorClass(status)}`}
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
    <>
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              Device Details: {config.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                <span className="text-sm">Loading...</span>
              </div>
            ) : deviceDetails ? (
              <div className="space-y-4">
                {/* Header with Device Name and Status */}
                <div className="flex items-center justify-between pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-emerald-500`} />
                    <span className="font-medium">{deviceDetails.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {connectionStatus === "Connected" ? (
                      <Wifi className="w-4 h-4 text-green-500" />
                    ) : (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    )}
                    <span>{connectionStatus}</span>
                  </div>
                </div>

                {/* Current Value Display */}
                {displayValue !== null && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                          {formatValue(displayValue)}
                        </span>
                        <span className="text-lg text-blue-600 dark:text-blue-400">
                          Value
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>Connection monitoring active</span>
                    </div>
                  </div>
                )}

                {/* Key Information Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Device ID</div>
                    <div className="font-mono text-sm truncate" title={deviceDetails.uniqId}>
                      {deviceDetails.uniqId}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">MQTT Topic</div>
                    <div className="font-mono text-sm truncate" title={deviceDetails.topic}>
                      {deviceDetails.topic}
                    </div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Parameter</div>
                    <div className="font-medium text-sm">{config.selectedKey}</div>
                  </div>

                  <div className="bg-card border rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Connection Type</div>
                    <div className="font-medium text-sm">{config.connectionType}</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      // Could add navigation to device management page
                      console.log('Navigate to device management');
                    }}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Manage Device
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(deviceDetails.uniqId);
                      // Could add toast notification here
                    }}
                  >
                    Copy ID
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <AlertTriangle className="mx-auto h-8 w-8 text-red-500 mb-3" />
                <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-1">
                  Device Not Found
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Unable to load device information.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div
        ref={containerRef}
        className={`w-full h-full relative overflow-hidden
          ${isEditMode ? "cursor-grab active:cursor-grabbing" : "cursor-pointer hover:scale-[1.01]"}
          bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl
          shadow-sm ${isEditMode ? "" : "hover:shadow-md"}
          transition-all duration-300 ease-out group transform-gpu`}
        style={{
          minHeight: 30,
        }}
        onClick={handleWidgetClick}
        title={isEditMode ? "Drag to move widget" : "Click to view device details"}
      >
        {renderContent()}
      </div>
    </>
  );
};
