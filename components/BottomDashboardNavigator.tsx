"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  BarChart3,
  Zap,
  Battery,
  Wind,
  LayoutDashboard,
  Server,
  Leaf
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DashboardCategory = "Overview" | "Capacity" | "Security" | "Analytic" | "Power" | "UPS" | "Cooling" | "Environment";

interface BottomDashboardNavigatorProps {
  activeCategory: DashboardCategory;
  onCategoryChange: (category: DashboardCategory) => void;
}

const categories: { id: DashboardCategory; label: string; icon: any; color: string }[] = [
  { id: "Overview", label: "Overview", icon: LayoutDashboard, color: "text-blue-500" },
  { id: "Capacity", label: "Capacity", icon: Server, color: "text-emerald-500" },
  { id: "Security", label: "Security", icon: Shield, color: "text-red-500" },
  { id: "Analytic", label: "Analytic", icon: BarChart3, color: "text-purple-500" },
  { id: "Power", label: "Power", icon: Zap, color: "text-yellow-500" },
  { id: "UPS", label: "UPS", icon: Battery, color: "text-green-500" },
  { id: "Cooling", label: "Cooling", icon: Wind, color: "text-cyan-500" },
  { id: "Environment", label: "Environment", icon: Leaf, color: "text-green-600" },
];

export function BottomDashboardNavigator({
  activeCategory,
  onCategoryChange,
}: BottomDashboardNavigatorProps) {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const resetHideTimer = () => {
      setIsVisible(true);

      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 60000);
    };

    const events: Array<keyof WindowEventMap> = [
      "pointerdown",
      "pointermove",
      "touchstart",
      "keydown",
      "scroll",
    ];

    resetHideTimer();

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetHideTimer, { passive: true });
    });

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }

      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetHideTimer);
      });
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed bottom-0 sm:bottom-6 left-0 sm:left-1/2 sm:-translate-x-1/2 w-full sm:w-auto z-50 px-2 pb-2 sm:px-0 sm:pb-0 transition-all duration-500",
        isVisible
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full sm:translate-y-6 opacity-0 pointer-events-none",
      )}
    >
      <div className="flex items-center justify-around sm:justify-start gap-1 p-1.5 sm:p-2 bg-white/90 dark:bg-gray-950/90 backdrop-blur-2xl border-t sm:border border-border shadow-[0_-8px_30px_rgb(0,0,0,0.12)] sm:rounded-2xl max-w-full sm:max-w-none mx-auto overflow-x-auto no-scrollbar rounded-t-2xl sm:rounded-2xl">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onCategoryChange(cat.id)}
              className={cn(
                "relative flex flex-col items-center justify-center py-2 sm:py-2.5 px-2 sm:px-4 rounded-xl transition-all duration-300 flex-1 sm:flex-none min-w-[56px] sm:min-w-[80px] group",
                isActive 
                  ? "bg-primary/10 text-primary scale-105 sm:scale-100" 
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon 
                className={cn(
                  "h-5 w-5 sm:h-5 sm:w-5 transition-transform duration-300 group-hover:scale-110",
                  isActive ? cat.color : "opacity-70"
                )} 
              />
              <span className={cn(
                "text-[9px] sm:text-[10px] font-black uppercase tracking-tighter mt-1 block",
                isActive ? "opacity-100" : "opacity-40"
              )}>
                {cat.label}
              </span>
              
              {isActive && (
                <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-primary animate-pulse hidden sm:block" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
