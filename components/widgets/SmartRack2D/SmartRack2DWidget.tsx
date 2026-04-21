"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { 
  Server, 
  Zap, 
  Thermometer, 
  Droplets, 
  AlertTriangle,
  Info,
  Activity,
  Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { cn } from "@/lib/utils";

interface SmartRack2DProps {
  config: {
    rackType?: "MAIN" | "NORMAL";
    displayMode?: "single" | "multi";
    customName?: string;
  };
}

interface RackData {
  id: string;
  name: string;
  capacityU: number;
  rackType: string;
  usedU: number;
  utilizationPercent: number;
  devices: any[];
  _count?: {
    devices: number;
  };
}

export const SmartRack2DWidget = ({ config }: SmartRack2DProps) => {
  const [racks, setRacks] = useState<RackData[]>([]);
  const [loading, setLoading] = useState(true);
  const { subscribe, unsubscribe } = useMqttServer();

  useEffect(() => {
    const fetchRacks = async () => {
      try {
        const res = await fetch("/api/racks");
        if (res.ok) {
          const data = await res.json();
          let filteredRacks = data.racks || [];
          
          if (config.rackType) {
            filteredRacks = filteredRacks.filter((r: any) => r.rackType === config.rackType);
          }
          
          if (config.displayMode === "single" && filteredRacks.length > 0) {
            filteredRacks = [filteredRacks[0]];
          }
          
          setRacks(filteredRacks);
        }
      } catch (err) {
        console.error("Failed to fetch racks:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRacks();
  }, [config.rackType, config.displayMode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[300px]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Activity className="h-8 w-8 text-primary/50" />
        </motion.div>
      </div>
    );
  }

  if (racks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
        <Box className="h-12 w-12 text-slate-300 mb-4 opacity-50" />
        <p className="text-slate-500 font-medium">No {config.rackType || ""} Racks Found</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-6 p-2 w-full",
      racks.length > 1 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
    )}>
      <AnimatePresence mode="popLayout">
        {racks.map((rack, idx) => (
          <motion.div
            key={rack.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, delay: idx * 0.1 }}
          >
            <RackCard rack={rack} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const RackCard = ({ rack }: { rack: RackData }) => {
  return (
    <Card className="overflow-hidden border-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-200 dark:ring-slate-800 rounded-[2rem]">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
              {rack.name}
            </h3>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              Smart Rack • {rack.rackType}
            </p>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
              {rack.utilizationPercent}%
            </div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Utilization</p>
          </div>
        </div>

        {/* Rack Visual representation */}
        <div className="flex gap-8 items-start">
          {/* 2D Rack Skeleton */}
          <div className="relative w-24 h-[140px] bg-slate-900 dark:bg-black rounded-lg border-2 border-slate-700 p-1 flex flex-col justify-end gap-[2px] shadow-inner overflow-hidden">
             {/* Rack mounting rails inside */}
             <div className="absolute inset-y-0 left-1 w-[2px] bg-slate-800" />
             <div className="absolute inset-y-0 right-1 w-[2px] bg-slate-800" />
             
             {/* Rack Content (U bars) */}
             <div className="w-full bg-blue-500/20 rounded-sm" style={{ height: `${rack.utilizationPercent}%` }}>
               <motion.div 
                 initial={{ height: 0 }}
                 animate={{ height: '100%' }}
                 className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"
               />
             </div>
             
             {/* Grid overlay for U markers */}
             <div className="absolute inset-0 grid grid-rows-[repeat(10,1fr)] gap-[1px] opacity-20 pointer-events-none">
               {Array.from({ length: 10 }).map((_, i) => (
                 <div key={i} className="border-t border-white" />
               ))}
             </div>
          </div>

          {/* Info Details */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatItem 
                icon={Zap} 
                label="Power" 
                value="2.4 kW" 
                color="text-amber-500" 
                bgColor="bg-amber-500/10" 
              />
              <StatItem 
                icon={Thermometer} 
                label="Temp" 
                value="24.5°C" 
                color="text-emerald-500" 
                bgColor="bg-emerald-500/10" 
              />
              <StatItem 
                icon={Droplets} 
                label="Humidity" 
                value="65%" 
                color="text-blue-500" 
                bgColor="bg-blue-500/10" 
              />
              <StatItem 
                icon={Server} 
                label="Devices" 
                value={rack._count?.devices || rack.devices?.length || 0} 
                color="text-purple-500" 
                bgColor="bg-purple-500/10" 
              />
            </div>
            
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
                 <span>CAPACITY</span>
                 <span className="text-slate-900 dark:text-slate-200">{rack.usedU} / {rack.capacityU} U USED</span>
               </div>
               <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${rack.utilizationPercent}%` }}
                   className="h-full bg-blue-500"
                 />
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Dynamic Floor Glow */}
      <div className="h-1 w-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent blur-md" />
    </Card>
  );
};

const StatItem = ({ icon: Icon, label, value, color, bgColor }: any) => (
  <div className="space-y-1">
    <div className="flex items-center gap-1.5">
      <div className={cn("p-1.5 rounded-lg", bgColor)}>
        <Icon className={cn("h-3 w-3", color)} />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
    </div>
    <div className="text-sm font-bold text-slate-900 dark:text-slate-100 pl-1">{value}</div>
  </div>
);
