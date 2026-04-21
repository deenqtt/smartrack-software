'use client';

import { Thermometer, Droplets } from 'lucide-react';

interface SensorCardProps {
  temperature: number;
  humidity: number;
  icon?: 'return' | 'supply';
  className?: string;
  compact?: boolean;
}

export default function SensorCard({
  temperature,
  humidity,
  icon = 'return',
  className = '',
  compact = false,
}: SensorCardProps) {
  
  const isReturn = icon === 'return';
  // Return air (Warm) -> Red/Orange accents
  // Supply air (Cool) -> Blue/Cyan accents
  const accentColor = isReturn ? 'text-orange-500' : 'text-blue-500';
  const bgAccent = isReturn ? 'bg-orange-500/10' : 'bg-blue-500/10';
  const borderAccent = isReturn ? 'border-orange-200 dark:border-orange-900' : 'border-blue-200 dark:border-blue-900';
  const label = isReturn ? "Return Air" : "Supply Air";

  return (
    <div className={`relative overflow-hidden rounded-3xl border ${borderAccent} bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl ${compact ? "p-3" : "p-6"} shadow-sm transition-all duration-300 hover:shadow-md ${className}`}>
      
      {/* Decorative gradient blob */}
      <div className={`absolute ${compact ? "-top-6 -right-6 w-20 h-20 blur-2xl" : "-top-10 -right-10 w-32 h-32 blur-3xl"} rounded-full opacity-20 ${isReturn ? 'bg-orange-500' : 'bg-blue-500'}`} />
      
      {/* Header Label */}
      <div className={`${compact ? "mb-3" : "mb-6"} flex items-center gap-2`}>
        <div className={`${compact ? "h-1.5 w-1.5" : "h-2 w-2"} rounded-full ${isReturn ? 'bg-orange-500' : 'bg-blue-500'}`} />
        <h3 className={`${compact ? "text-[11px]" : "text-sm"} font-semibold uppercase tracking-wider text-muted-foreground`}>
          {label}
        </h3>
      </div>

      <div className={`grid grid-cols-2 ${compact ? "gap-2" : "gap-4"}`}>
        {/* Temperature Column */}
        <div className="flex flex-col">
          <div className={`flex items-center gap-2 ${compact ? "mb-0.5" : "mb-1"}`}>
            <Thermometer className={`${compact ? "w-3 h-3" : "w-4 h-4"} ${accentColor}`} />
            <span className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground font-medium`}>Temp</span>
          </div>
          <div className="flex items-baseline">
            <span className={`${compact ? "text-xl" : "text-3xl"} font-bold text-foreground tracking-tight`}>
              {temperature != null ? temperature.toFixed(1) : "--"}
            </span>
            <span className={`ml-1 ${compact ? "text-xs" : "text-sm"} font-medium text-muted-foreground`}>°C</span>
          </div>
        </div>

        {/* Humidity Column */}
        <div className={`flex flex-col border-l border-border ${compact ? "pl-2" : "pl-4"}`}>
          <div className={`flex items-center gap-2 ${compact ? "mb-0.5" : "mb-1"}`}>
            <Droplets className={`${compact ? "w-3 h-3" : "w-4 h-4"} ${isReturn ? 'text-orange-400' : 'text-blue-400'}`} />
            <span className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground font-medium`}>Hum</span>
          </div>
          <div className="flex items-baseline">
            <span className={`${compact ? "text-xl" : "text-3xl"} font-bold text-foreground tracking-tight`}>
              {humidity != null ? humidity.toFixed(1) : "--"}
            </span>
            <span className={`ml-1 ${compact ? "text-xs" : "text-sm"} font-medium text-muted-foreground`}>%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
