"use client";

import { useEffect, useState } from "react";

function getCurrentTimeInfo() {
  const now = new Date();

  const time = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const fullDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const shortDate = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return { fullDate, shortDate, time };
}

export default function RealtimeClockWithRefresh() {
  const [timeInfo, setTimeInfo] = useState<{
    fullDate: string;
    shortDate: string;
    time: string
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    setTimeInfo(getCurrentTimeInfo());

    const timer = setInterval(() => {
      setTimeInfo(getCurrentTimeInfo());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (!hydrated || !timeInfo) return null;

  return (
    <div className="flex items-center font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap tracking-tight">
      {/* Full Date: hidden on mobile/tablet, shown on desktop */}
      <span className="hidden xl:inline text-xs md:text-sm">{timeInfo.fullDate}</span>

      {/* Short Date: hidden on mobile and desktop, shown on tablet/small laptop */}
      <span className="hidden sm:inline xl:hidden text-[10px] md:text-xs">{timeInfo.shortDate}</span>

      {/* Separator: hidden on mobile */}
      <span className="hidden sm:inline opacity-30 mx-1 sm:mx-2">|</span>

      {/* Time: always visible, bold */}
      <span className="text-slate-900 dark:text-white font-black text-xs sm:text-xs md:text-sm">
        {timeInfo.time}
      </span>
    </div>
  );
}
