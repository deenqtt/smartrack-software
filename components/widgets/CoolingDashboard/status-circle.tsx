'use client';

import { Power, Snowflake, Fan, AlertCircle, Wifi, WifiOff, Hourglass, Sun } from 'lucide-react';

interface StatusCircleProps {
  acStatus?: string | null;
  mode?: string | null;
  commStatus?: string | null;
  compact?: boolean;
}

export default function StatusCircle({ 
  acStatus = "OFF", 
  mode = "Standby", 
  commStatus = "Normal",
  compact = false,
}: StatusCircleProps) {
  
  const statusStr = acStatus?.toUpperCase() || "OFF";
  const isRunning = statusStr === "ON" || statusStr === "RUNNING";
  const isError = statusStr === "ERROR" || statusStr === "ALARM";
  
  // Dynamic colors
  const ringColor1 = isError ? "rgb(239, 68, 68)" : isRunning ? "rgb(34, 197, 94)" : "rgb(86, 126, 245)";
  const ringColor2 = isError ? "rgb(185, 28, 28)" : isRunning ? "rgb(74, 222, 128)" : "rgb(99, 102, 241)";

  const isCommNormal = commStatus?.toLowerCase() === "normal" || commStatus?.toLowerCase() === "online";
  
  // Determine Mode Icon
  const getModeIcon = () => {
    const m = mode?.toLowerCase() || "";
    if (m.includes("cool")) return <Snowflake className="w-8 h-8 text-blue-500" />;
    if (m.includes("fan")) return <Fan className="w-8 h-8 text-green-500 animate-spin-slow" />;
    if (m.includes("heat")) return <Sun className="w-8 h-8 text-orange-500" />;
    return <Hourglass className="w-8 h-8 text-gray-400" />;
  };

  return (
    <div className={`relative flex items-center justify-center ${compact ? "w-32 h-32 sm:w-36 sm:h-36" : "w-40 h-40 sm:w-48 sm:h-48 lg:w-56 lg:h-56"}`}>
      {/* Animated Glow Background */}
      <div className={`absolute inset-0 rounded-full blur-2xl animate-pulse transition-colors duration-500 ${isRunning ? 'bg-green-500/20' : isError ? 'bg-red-500/20' : 'bg-blue-500/10'}`} />

      {/* Main Circle SVG (Ring Only) */}
      <svg width="100%" height="100%" viewBox="0 0 280 280" className="absolute inset-0 z-10 drop-shadow-xl">
        <defs>
          <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringColor1} stopOpacity="1" />
            <stop offset="100%" stopColor={ringColor2} stopOpacity="1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main Circle Border */}
        <circle
          cx="140"
          cy="140"
          r="125"
          fill="var(--background)" 
          stroke="url(#ringGradient)"
          strokeWidth="12"
          filter="url(#glow)"
          className="transition-colors duration-300"
        />

        {/* Inner decorative circle */}
        <circle cx="140" cy="140" r="110" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" className="text-foreground" />
      </svg>

      {/* Content Overlay */}
      <div className={`relative z-20 flex flex-col items-center justify-center rounded-full ${compact ? "w-24 h-24 sm:w-28 sm:h-28" : "w-32 h-32 sm:w-36 sm:h-36 lg:w-44 lg:h-44"}`}>
        
        {/* Section 1: AC Status */}
        <div className="flex flex-col items-center mb-2">
          <span className={`${compact ? "text-[9px]" : "text-[10px] sm:text-xs"} font-medium text-muted-foreground uppercase tracking-wider mb-1`}>Status</span>
          <div className="flex items-center gap-2">
            {isError ? (
              <AlertCircle className={`${compact ? "w-3 h-3 sm:w-4 sm:h-4" : "w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"} text-red-500`} />
            ) : (
              <Power className={`${compact ? "w-3 h-3 sm:w-4 sm:h-4" : "w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6"} ${isRunning ? 'text-green-500' : 'text-gray-400'}`} />
            )}
            <span className={`${compact ? "text-sm sm:text-base" : "text-lg sm:text-xl lg:text-2xl"} font-bold ${isError ? 'text-red-500' : isRunning ? 'text-green-500' : 'text-foreground'}`}>
              {statusStr}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className={`${compact ? "w-14 sm:w-16" : "w-20 sm:w-24 lg:w-32"} h-px bg-border my-1`} />

        {/* Section 2: Mode */}
        <div className="flex flex-col items-center my-2">
          <div className="mb-1">
             {getModeIcon()}
          </div>
          <span className={`${compact ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"} font-semibold text-foreground text-center`}>
            {mode || "Standby"}
          </span>
        </div>

        {/* Divider */}
        <div className={`${compact ? "w-14 sm:w-16" : "w-20 sm:w-24 lg:w-32"} h-px bg-border my-1`} />

        {/* Section 3: Communication */}
        <div className="flex flex-col items-center mt-2">
          <span className={`${compact ? "text-[8px]" : "text-[10px]"} font-medium text-muted-foreground uppercase tracking-wider mb-1`}>Comm</span>
          <div className="flex items-center gap-1.5">
            {isCommNormal ? (
              <Wifi className={`${compact ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3 sm:w-4 sm:h-4"} text-green-500`} />
            ) : (
              <WifiOff className={`${compact ? "w-2.5 h-2.5 sm:w-3 sm:h-3" : "w-3 h-3 sm:w-4 sm:h-4"} text-red-500`} />
            )}
            <span className={`${compact ? "text-[8px] sm:text-[9px]" : "text-[10px] sm:text-xs"} font-semibold ${isCommNormal ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
              {commStatus || "Unknown"}
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
