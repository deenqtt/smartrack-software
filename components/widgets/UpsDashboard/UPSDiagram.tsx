// File: components/widgets/UPSDashboard/UPSDiagram.tsx
"use client";

import React from "react";

interface UPSDiagramProps {
  bypassVoltage: number | null;
  bypassFrequency: number | null;
  lineVoltage: number | null;
  lineFrequency: number | null;
  batteryPercent: number | null;
  outputVoltage: number | null;
  outputFrequency: number | null;
  outputCurrent: number | null;
  status: string | null;
  runningTime: string | null;
  communicationStatus: string | null;
  isCompact: boolean;
  isDataRetained: boolean;
}

const formatValue = (value: number | null, decimals = 1): string => {
  if (value === null) return "---";
  return value.toFixed(decimals);
};

export const UPSDiagram = React.memo(
  ({
    bypassVoltage,
    bypassFrequency,
    lineVoltage,
    lineFrequency,
    batteryPercent,
    outputVoltage,
    outputFrequency,
    outputCurrent,
    status,
    runningTime,
    communicationStatus,
    isCompact,
    isDataRetained,
  }: UPSDiagramProps) => {
    return (
      <div
        className={`relative flex items-center justify-center ${
          isCompact ? "mb-3" : "mb-6"
        } flex-1`}
      >
        {/* SVG Diagram */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 1000 400"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradient untuk status circle */}
            <linearGradient
              id="statusGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                offset="0%"
                style={{ stopColor: "#fbbf24", stopOpacity: 1 }}
              />
              <stop
                offset="100%"
                style={{ stopColor: "#f59e0b", stopOpacity: 1 }}
              />
            </linearGradient>

            {/* Shadow filter */}
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3" />
              <feOffset dx="0" dy="2" result="offsetblur" />
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Garis Penghubung */}
          {/* Garis dari Bypass ke Center (Dashed) */}
          <path
            d="M 150 80 L 200 80 Q 250 80 280 120 L 380 180"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            strokeDasharray="8,4"
            fill="none"
          />
          <circle
            cx="380"
            cy="180"
            r="4"
            className="fill-slate-300 dark:fill-slate-600"
          />

          {/* Garis dari Line ke Center (Solid) */}
          <path
            d="M 150 320 L 200 320 Q 250 320 280 280 L 380 220"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="380"
            cy="220"
            r="4"
            className="fill-slate-300 dark:fill-slate-600"
          />

          {/* Garis dari Center ke Battery (Dashed) */}
          <path
            d="M 620 180 L 720 120 Q 750 80 800 80 L 850 80"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            strokeDasharray="8,4"
            fill="none"
          />
          <circle
            cx="620"
            cy="180"
            r="4"
            className="fill-slate-300 dark:fill-slate-600"
          />

          {/* Garis dari Center ke Output (Solid) */}
          <path
            d="M 620 220 L 720 280 Q 750 320 800 320 L 850 320"
            className="stroke-slate-300 dark:stroke-slate-600"
            strokeWidth="2"
            fill="none"
          />
          <circle
            cx="620"
            cy="220"
            r="4"
            className="fill-slate-300 dark:fill-slate-600"
          />

          {/* Component: Bypass (Top Left) */}
          <g transform="translate(70, 50)">
            <circle
              cx="40"
              cy="30"
              r="35"
              className="fill-blue-50 dark:fill-blue-900/30 stroke-blue-400 dark:stroke-blue-500"
              strokeWidth="2"
              filter="url(#shadow)"
            />
            {/* Icon: Bypass/Route */}
            <path
              d="M 30 20 L 50 30 L 30 40"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle
              cx="30"
              cy="30"
              r="3"
              className="fill-blue-600 dark:fill-blue-400"
            />
            <text
              x="40"
              y="-10"
              fontSize="14"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
              fontWeight="500"
            >
              Bypass
            </text>
            <text
              x="40"
              y="80"
              fontSize="13"
              className="fill-slate-800 dark:fill-slate-200"
              textAnchor="middle"
              fontWeight="600"
            >
              {formatValue(bypassVoltage)} V
            </text>
            <text
              x="40"
              y="95"
              fontSize="12"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
            >
              {formatValue(bypassFrequency)} Hz
            </text>
          </g>

          {/* Component: Line (Bottom Left) */}
          <g transform="translate(70, 290)">
            <circle
              cx="40"
              cy="30"
              r="35"
              className="fill-blue-50 dark:fill-blue-900/30 stroke-blue-400 dark:stroke-blue-500"
              strokeWidth="2"
              filter="url(#shadow)"
            />
            {/* Icon: Wave/AC */}
            <path
              d="M 25 30 Q 30 20 35 30 T 45 30 T 55 30"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
            />
            <text
              x="40"
              y="-10"
              fontSize="14"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
              fontWeight="500"
            >
              Line
            </text>
            <text
              x="40"
              y="80"
              fontSize="13"
              className="fill-slate-800 dark:fill-slate-200"
              textAnchor="middle"
              fontWeight="600"
            >
              {formatValue(lineVoltage)} V
            </text>
            <text
              x="40"
              y="95"
              fontSize="12"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
            >
              {formatValue(lineFrequency)} Hz
            </text>
          </g>

          {/* Center Status Circle */}
          <g transform="translate(500, 200)">
            <circle
              cx="0"
              cy="0"
              r="90"
              fill="url(#statusGradient)"
              filter="url(#shadow)"
            />
            <circle
              cx="0"
              cy="0"
              r="85"
              className="fill-white dark:fill-slate-800"
            />

            {/* Status Icon */}
            <path
              d="M -15 -35 L -5 -25 L 15 -45"
              className="stroke-green-500 dark:stroke-green-400"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <text
              x="0"
              y="-10"
              fontSize="16"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
            >
              {runningTime || "---"}
            </text>
            <text
              x="0"
              y="8"
              fontSize="13"
              className="fill-slate-400 dark:fill-slate-500"
              textAnchor="middle"
            >
              Running Time
            </text>

            <text
              x="0"
              y="35"
              fontSize="20"
              className="fill-green-600 dark:fill-green-400"
              textAnchor="middle"
              fontWeight="600"
            >
              {status || "Unknown"}
            </text>

            <text
              x="0"
              y="55"
              fontSize="12"
              className="fill-slate-400 dark:fill-slate-500"
              textAnchor="middle"
            >
              Data Source
            </text>
            <text
              x="0"
              y="70"
              fontSize="13"
              className={`${
                isDataRetained
                  ? "fill-amber-600 dark:fill-amber-400"
                  : "fill-green-600 dark:fill-green-400"
              }`}
              textAnchor="middle"
              fontWeight="500"
            >
              {isDataRetained ? "Retain" : "Online"}
            </text>
          </g>

          {/* Component: Battery (Top Right) */}
          <g transform="translate(890, 50)">
            <circle
              cx="40"
              cy="30"
              r="35"
              className="fill-blue-50 dark:fill-blue-900/30 stroke-blue-400 dark:stroke-blue-500"
              strokeWidth="2"
              filter="url(#shadow)"
            />
            {/* Battery Background */}
            <rect
              x="28"
              y="22"
              width="24"
              height="16"
              rx="2"
              fill="none"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
            />

            {/* Battery Fill (Dynamic based on percentage) */}
            {batteryPercent !== null && (
              <rect
                x="29"
                y="23"
                width={(batteryPercent / 100) * 22}
                height="14"
                rx="1"
                fill={
                  batteryPercent >= 50
                    ? "#10b981" // Green
                    : batteryPercent >= 20
                    ? "#f59e0b" // Amber
                    : "#ef4444" // Red
                }
                className="transition-all duration-300"
                style={{
                  transition: "width 0.3s ease-in-out, fill 0.3s ease-in-out",
                }}
                opacity="0.7"
              />
            )}

            {/* Battery Terminal */}
            <rect
              x="52"
              y="27"
              width="3"
              height="6"
              className="fill-blue-600 dark:fill-blue-400"
            />
            <rect
              x="31"
              y="25"
              width="6"
              height="10"
              className="fill-blue-600 dark:fill-blue-400"
            />
            <text
              x="40"
              y="-10"
              fontSize="14"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
              fontWeight="500"
            >
              Battery
            </text>
            <text
              x="40"
              y="80"
              fontSize="13"
              className={`${
                batteryPercent !== null
                  ? batteryPercent >= 50
                    ? "fill-green-600 dark:fill-green-400"
                    : batteryPercent >= 20
                    ? "fill-amber-600 dark:fill-amber-400"
                    : "fill-red-600 dark:fill-red-400"
                  : "fill-slate-600 dark:fill-slate-400"
              }`}
              textAnchor="middle"
              fontWeight="600"
            >
              {formatValue(batteryPercent)} %
            </text>
          </g>

          {/* Component: Output (Bottom Right) */}
          <g transform="translate(890, 290)">
            <circle
              cx="40"
              cy="30"
              r="35"
              className="fill-blue-50 dark:fill-blue-900/30 stroke-blue-400 dark:stroke-blue-500"
              strokeWidth="2"
              filter="url(#shadow)"
            />
            {/* Icon: Output/Plug */}
            <rect
              x="30"
              y="23"
              width="20"
              height="14"
              rx="2"
              fill="none"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
            />
            <line
              x1="35"
              y1="23"
              x2="35"
              y2="19"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
            />
            <line
              x1="45"
              y1="23"
              x2="45"
              y2="19"
              className="stroke-blue-600 dark:stroke-blue-400"
              strokeWidth="2"
            />
            <text
              x="40"
              y="-10"
              fontSize="14"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
              fontWeight="500"
            >
              Output
            </text>
            <text
              x="40"
              y="80"
              fontSize="13"
              className="fill-slate-800 dark:fill-slate-200"
              textAnchor="middle"
              fontWeight="600"
            >
              {formatValue(outputVoltage)} V
            </text>
            <text
              x="40"
              y="95"
              fontSize="12"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
            >
              {formatValue(outputFrequency)} Hz
            </text>
            <text
              x="40"
              y="110"
              fontSize="12"
              className="fill-slate-600 dark:fill-slate-400"
              textAnchor="middle"
            >
              {formatValue(outputCurrent)} A
            </text>
          </g>
        </svg>
      </div>
    );
  }
);

UPSDiagram.displayName = "UPSDiagram";
