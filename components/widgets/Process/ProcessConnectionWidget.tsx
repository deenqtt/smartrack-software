"use client";

import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { Loader2, AlertTriangle } from "lucide-react";

interface Props {
  config: {
    name: string;
    desc: string;
    connectionType: string; // single, elbow, 3-way, 4-way
    startX?: number;
    startY?: number;
    endX?: number;
    endY?: number;
    points?: Array<{ x: number; y: number }>; // For complex connections
  };
}

export const ProcessConnectionWidget = ({ config }: Props) => {
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

  const renderConnection = () => {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;

    switch (config.connectionType) {
      case "single":
        return (
          <line
            x1={20}
            y1={centerY}
            x2={width - 20}
            y2={centerY}
            stroke="#3b82f6"
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
            className="animate-pulse"
          />
        );

      case "elbow":
        return (
          <polyline
            points={`${20},${centerY} ${centerX},${centerY} ${centerX},${
              height - 20
            }`}
            stroke="#3b82f6"
            strokeWidth="3"
            fill="none"
            markerEnd="url(#arrowhead)"
            className="animate-pulse"
          />
        );

      case "3-way":
        return (
          <g>
            {/* Main line */}
            <line
              x1={20}
              y1={centerY}
              x2={width - 20}
              y2={centerY}
              stroke="#3b82f6"
              strokeWidth="3"
              markerEnd="url(#arrowhead)"
              className="animate-pulse"
            />
            {/* Branch up */}
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={20}
              stroke="#3b82f6"
              strokeWidth="3"
              markerEnd="url(#arrowhead-up)"
              className="animate-pulse"
            />
            {/* Branch down */}
            <line
              x1={centerX}
              y1={centerY}
              x2={centerX}
              y2={height - 20}
              stroke="#3b82f6"
              strokeWidth="3"
              markerEnd="url(#arrowhead-down)"
              className="animate-pulse"
            />
          </g>
        );

      case "4-way":
        return (
          <g>
            {/* Horizontal line */}
            <line
              x1={20}
              y1={centerY}
              x2={width - 20}
              y2={centerY}
              stroke="#3b82f6"
              strokeWidth="3"
              className="animate-pulse"
            />
            {/* Vertical line */}
            <line
              x1={centerX}
              y1={20}
              x2={centerX}
              y2={height - 20}
              stroke="#3b82f6"
              strokeWidth="3"
              className="animate-pulse"
            />
            {/* Arrows */}
            <polygon
              points={`${width - 15},${centerY - 5} ${width - 15},${
                centerY + 5
              } ${width - 5},${centerY}`}
              fill="#3b82f6"
              className="animate-pulse"
            />
            <polygon
              points={`${centerX - 5},${15} ${
                centerX + 5
              },${15} ${centerX},${5}`}
              fill="#3b82f6"
              className="animate-pulse"
            />
            <polygon
              points={`${centerX - 5},${height - 15} ${centerX + 5},${
                height - 15
              } ${centerX},${height - 5}`}
              fill="#3b82f6"
              className="animate-pulse"
            />
            <polygon
              points={`${15},${centerY - 5} ${15},${
                centerY + 5
              } ${5},${centerY}`}
              fill="#3b82f6"
              className="animate-pulse"
            />
          </g>
        );

      default:
        return (
          <line
            x1={20}
            y1={centerY}
            x2={width - 20}
            y2={centerY}
            stroke="#3b82f6"
            strokeWidth="3"
            markerEnd="url(#arrowhead)"
            className="animate-pulse"
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative overflow-hidden cursor-move bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ease-out group hover:scale-[1.01] transform-gpu"
      style={{ minHeight: 30 }}
    >
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
          {config.desc && dimensions.height > 60 && (
            <p
              className="text-xs text-slate-500 truncate"
              title={config.desc}
              style={{ fontSize: Math.max(dimensions.width / 25, 8) }}
            >
              {config.desc}
            </p>
          )}
        </div>

        {/* Connection visualization */}
        <div className="flex-1 relative">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="absolute inset-0"
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                  className="animate-pulse"
                />
              </marker>
              <marker
                id="arrowhead-up"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                  className="animate-pulse"
                />
              </marker>
              <marker
                id="arrowhead-down"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#3b82f6"
                  className="animate-pulse"
                />
              </marker>
            </defs>
            {renderConnection()}
          </svg>
        </div>
      </div>
    </div>
  );
};
