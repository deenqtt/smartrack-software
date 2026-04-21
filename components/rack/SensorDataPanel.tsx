"use client";

import { Card } from "@/components/ui/card";

interface SensorData {
  temperature?: number;
  humidity?: number;
  label: string;
  isConnected?: boolean;
}

interface DeviceData {
  id: string;
  name: string;
  type: string;
  data?: Record<string, any>;
  isConnected?: boolean;
  lastUpdate?: string;
}

interface DisplayValue {
  value: string;
  isNA: boolean;
}

interface SensorDataPanelProps {
  frontSensor?: SensorData;
  backSensor?: SensorData;
  devices?: DeviceData[];
}

export default function SensorDataPanel({
  frontSensor,
  backSensor,
  devices = [],
}: SensorDataPanelProps) {
  const renderDeviceData = (device: DeviceData) => {
    if (!device.data) {
      return (
        <div className="text-gray-400 text-sm">
          <p>No data</p>
        </div>
      );
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white text-sm">
            {device.name}
          </h4>
          <span
            className={`inline-block w-2 h-2 rounded-full animate-pulse ${
              device.isConnected
                ? "bg-green-500"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
            title={device.isConnected ? "Connected" : "Waiting for data..."}
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(device.data).map(([key, value]) => (
            <div
              key={key}
              className="bg-gray-50 dark:bg-gray-900/20 rounded p-2 border border-gray-200 dark:border-gray-700"
            >
              <p className="text-gray-600 dark:text-gray-400 font-medium capitalize">
                {key.replace(/_/g, " ")}
              </p>
              <p className="text-gray-900 dark:text-white font-semibold mt-1">
                {typeof value === "number" ? value.toFixed(2) : String(value)}
              </p>
            </div>
          ))}
        </div>

        {device.lastUpdate && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Updated: {device.lastUpdate}
          </p>
        )}
      </div>
    );
  };
  const renderSensorInfo = (sensor: SensorData | undefined) => {
    if (!sensor) {
      return (
        <div className="text-gray-400 text-sm">
          <p>No sensor configured</p>
          <p className="text-xs">N/A</p>
        </div>
      );
    }

    const tempValue = sensor.temperature !== undefined ? `${sensor.temperature.toFixed(1)}°C` : "N/A";
    const humidityValue = sensor.humidity !== undefined ? `${sensor.humidity.toFixed(0)}%` : "N/A";
    const isNA = sensor.temperature === undefined || sensor.humidity === undefined;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {sensor.label}
          </h3>
          <span
            className={`inline-block w-2 h-2 rounded-full animate-pulse ${
              sensor.isConnected
                ? "bg-green-500"
                : "bg-gray-300 dark:bg-gray-600"
            }`}
            title={sensor.isConnected ? "Connected" : "Waiting for data..."}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Temperature */}
          <div className={`rounded-lg p-3 border transition-colors ${
            isNA
              ? "bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Temperature
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              isNA
                ? "text-gray-400 dark:text-gray-500"
                : "text-red-600 dark:text-red-400"
            }`}>
              {tempValue}
            </p>
          </div>

          {/* Humidity */}
          <div className={`rounded-lg p-3 border transition-colors ${
            isNA
              ? "bg-gray-100 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
              : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          }`}>
            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
              Humidity
            </p>
            <p className={`text-2xl font-bold mt-1 ${
              isNA
                ? "text-gray-400 dark:text-gray-500"
                : "text-blue-600 dark:text-blue-400"
            }`}>
              {humidityValue}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="p-4 h-full flex flex-col bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        Sensor Data
      </h2>

      <div className="space-y-4 flex-1 overflow-y-auto">
        {/* Front Sensor - only show if exists */}
        {frontSensor && (
          <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Temperature / Humidity
            </h3>
            {renderSensorInfo(frontSensor)}
          </div>
        )}

        {/* Back Sensor - only show if exists */}
        {backSensor && (
          <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
            {renderSensorInfo(backSensor)}
          </div>
        )}

        {/* Devices with MQTT data */}
        {devices.length > 0 && (
          <div className="border-b border-gray-200 dark:border-slate-700 pb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Devices
            </h3>
            <div className="space-y-4">
              {devices.map((device) => (
                <div
                  key={device.id}
                  className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                >
                  {renderDeviceData(device)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-slate-700">
        <p>Last updated: {new Date().toLocaleTimeString()}</p>
      </div>
    </Card>
  );
}
