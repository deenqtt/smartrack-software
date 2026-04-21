"use client";

import SensorCard from "./sensor-card";
import StatusCircle from "./status-circle";
import AirFlowVisualizer from "./air-flow-visualizer";

interface HVACData {
  returnTemp?: number | null;
  returnHum?: number | null;
  supplyTemp?: number | null;
  supplyHum?: number | null;
  acStatus?: string | null;
  mode?: string | null;
  commStatus?: string | null;
}

interface HVACStatusProps {
  data: HVACData;
  compact?: boolean;
}

export default function HVACStatus({ data, compact = false }: HVACStatusProps) {
  return (
    <div className={`w-full h-full relative bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 ${compact ? "p-2 sm:p-3" : "p-3 sm:p-4 lg:p-6"} flex flex-col items-center justify-center overflow-hidden`}>
      {/* Background Flow Lines (Decorative) */}
      <div className="absolute top-1/2 left-0 w-full h-px border-t border-dashed border-slate-300 dark:border-slate-700 -translate-y-1/2 z-0" />

      <div className={`w-full ${compact ? "max-w-md" : "max-w-4xl"} relative z-10`}>
        <div className={`flex items-center justify-between ${compact ? "gap-3" : "gap-5 lg:gap-10"} ${compact ? "flex-row" : "flex-col lg:flex-row"}`}>
          {/* Left: Return Air (Hot Side) */}
          <div className={`flex-1 w-full flex flex-col items-center ${compact ? "" : "lg:items-end"} relative group`}>
            {/* Arrow indicator pointing to center */}
            <div className={`absolute top-1/2 transform -translate-y-1/2 z-0 ${compact ? "hidden" : "hidden lg:block -right-8"}`}>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-orange-200 dark:border-l-orange-900 border-b-[8px] border-b-transparent" />
            </div>

            <SensorCard
              temperature={data.returnTemp ?? 0}
              humidity={data.returnHum ?? 0}
              icon="return"
              compact={compact}
              className={`${compact ? "max-w-[110px] sm:max-w-[120px]" : "max-w-[200px] sm:max-w-[220px] lg:max-w-[240px]"} w-full transform transition-transform hover:-translate-y-1 hover:shadow-lg ring-1 ring-orange-100 dark:ring-orange-900/30 relative z-10`}
            />
          </div>

          {/* Center: Status Core */}
          <div className="flex-shrink-0 flex items-center justify-center relative">
            {/* Left Flow Animation */}
            <div className={`${compact ? "hidden" : "hidden lg:block"} absolute -left-12 opacity-60 scale-90`}>
              <AirFlowVisualizer direction="left" compact={compact} />
            </div>

            <div className="relative z-20 bg-white dark:bg-slate-900 rounded-full shadow-2xl shadow-slate-200 dark:shadow-slate-950 p-2">
              <StatusCircle
                acStatus={data.acStatus}
                mode={data.mode}
                commStatus={data.commStatus}
                compact={compact}
              />
            </div>

            {/* Right Flow Animation */}
            <div className={`${compact ? "hidden" : "hidden lg:block"} absolute -right-12 opacity-60 scale-90`}>
              <AirFlowVisualizer direction="right" compact={compact} />
            </div>
          </div>

          {/* Right: Supply Air (Cold Side) */}
          <div className={`flex-1 w-full flex flex-col items-center ${compact ? "" : "lg:items-start"} relative`}>
            {/* Arrow indicator pointing away from center */}
            <div className={`absolute top-1/2 transform -translate-y-1/2 z-0 ${compact ? "hidden" : "hidden lg:block -left-8"}`}>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-blue-200 dark:border-l-blue-900 border-b-[8px] border-b-transparent" />
            </div>

            <SensorCard
              temperature={data.supplyTemp ?? 0}
              humidity={data.supplyHum ?? 0}
              icon="supply"
              compact={compact}
              className={`${compact ? "max-w-[110px] sm:max-w-[120px]" : "max-w-[200px] sm:max-w-[220px] lg:max-w-[240px]"} w-full transform transition-transform hover:-translate-y-1 hover:shadow-lg ring-1 ring-blue-100 dark:ring-blue-900/30 relative z-10`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
