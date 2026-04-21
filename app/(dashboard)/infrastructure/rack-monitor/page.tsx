"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  Zap,
  Thermometer,
  Droplets,
  Activity,
  Box,
  LayoutGrid,
  RefreshCw,
  Star,
  Clock,
  HardDrive,
  BarChart2,
  ChevronDown,
  PlusCircle,
  X,
  Check,
  Layers,
  Cpu,
  Info,
  List,
  AlertCircle,
  DoorOpen,
  DoorClosed,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface RackData {
  id: string;
  name: string;
  capacityU: number;
  rackType: "MAIN" | "NORMAL";
  location: string | null;
  usedU: number;
  availableU: number;
  utilizationPercent: number;
  devices: Array<{
    id: string;
    name: string;
    positionU: number | null;
    sizeU: number;
    uniqId: string;
  }>;
  _count?: { devices: number };
}

const SLOT_STORAGE_KEY = "rack-monitor-slots-v1";

// ─── Utility ─────────────────────────────────────────────────────────────────
const getUtilizationColor = (pct: number) => {
  if (pct < 50) return { bar: "bg-emerald-500", glow: "shadow-emerald-500/30", text: "text-emerald-400", badge: "bg-emerald-500/10 text-emerald-400" };
  if (pct < 75) return { bar: "bg-amber-500", glow: "shadow-amber-500/30", text: "text-amber-400", badge: "bg-amber-500/10 text-amber-400" };
  if (pct < 90) return { bar: "bg-orange-500", glow: "shadow-orange-500/30", text: "text-orange-400", badge: "bg-orange-500/10 text-orange-400" };
  return { bar: "bg-red-500", glow: "shadow-red-500/30", text: "text-red-400", badge: "bg-red-500/10 text-red-400" };
};

// ─── StatChip ─────────────────────────────────────────────────────────────────
const StatChip = ({ icon: Icon, label, value, color, bg, onClick }: {
  icon: any; label: string; value: string | number; color: string; bg: string; onClick?: () => void;
}) => (
  <div 
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 p-4 rounded-2xl transition-all",
      bg,
      onClick && "cursor-pointer hover:scale-[1.02] active:scale-95 border border-transparent hover:border-current/20 shadow-lg hover:shadow-current/10"
    )}
  >
    <div className={cn("p-2 rounded-xl bg-white/5", color)}>
      <Icon className="h-5 w-5 flex-shrink-0" />
    </div>
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-0.5">{label}</div>
      <div className={cn("text-xl font-black leading-none", color)}>{value}</div>
    </div>
  </div>
);

// ─── RackCard ─────────────────────────────────────────────────────────────────
const RackCard = ({
  rack,
  isFeatured = false,
  slotLabel,
}: {
  rack: RackData;
  isFeatured?: boolean;
  slotLabel?: string;
}) => {
  const [selectedDevice, setSelectedDevice] = useState<(typeof rack.devices)[number] | null>(null);
  const [showDeviceList, setShowDeviceList] = useState(false);
  const [isDoorOpen, setIsDoorOpen] = useState(false);

  const colors = getUtilizationColor(rack.utilizationPercent);
  const uSlots = rack.capacityU;
  const deviceMap = new Map<number, (typeof rack.devices)[number]>();
  rack.devices.forEach((d) => {
    if (d.positionU != null) {
      for (let i = 0; i < d.sizeU; i++) deviceMap.set(d.positionU + i, d);
    }
  });

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden rounded-3xl border transition-all duration-300 h-full",
          isFeatured
            ? "border-blue-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/30 shadow-2xl shadow-blue-500/10"
            : "border-emerald-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 backdrop-blur-xl hover:border-emerald-500/40"
        )}
      >
        {/* Top glow accent */}
        <div className={cn(
          "absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isFeatured ? "via-blue-500/60" : "via-emerald-500/60"
        )} />

        {/* Slot label badge */}
        {slotLabel && (
          <div className="absolute top-3 right-3 z-10">
            <span className={cn(
              "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
              isFeatured 
                ? "bg-blue-950/50 text-blue-400 border-blue-500/30" 
                : "bg-emerald-950/50 text-emerald-400 border-emerald-500/30"
            )}>
              {slotLabel}
            </span>
          </div>
        )}

        <div className={cn("flex flex-col h-full p-5", isFeatured ? "p-6" : "p-5")}>
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  "h-2 w-2 rounded-full animate-pulse flex-shrink-0",
                  isFeatured ? "bg-blue-400" : "bg-emerald-400"
                )} />
                <h3 className={cn(
                  "font-black tracking-tight truncate",
                  isFeatured ? "text-2xl text-white" : "text-lg text-white"
                )}>
                  {rack.name}
                </h3>
                {rack.rackType === "MAIN" && (
                  <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest px-1.5 flex-shrink-0">
                    <Star className="h-2.5 w-2.5 mr-1" />MAIN
                  </Badge>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500">
                Smart Rack • {rack.rackType}
                {rack.location && ` • ${rack.location}`}
              </p>
            </div>
            <div className="flex flex-col items-end ml-4">
              <div className={cn(
                "font-black tracking-tighter leading-none",
                isFeatured ? "text-4xl" : "text-2xl",
                colors.text
              )}>
                {rack.utilizationPercent}%
              </div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">Utilization</p>
            </div>
          </div>

          {/* Main content */}
          <div className="flex gap-5 items-start flex-1">
            {/* 2D Rack Visual */}
            <div className="flex-shrink-0 relative">
              <div
                className={cn(
                  "relative rounded-xl border-2 overflow-hidden cursor-pointer group",
                  "bg-gradient-to-b from-slate-950 to-slate-900 shadow-inner",
                  "w-24 h-80 transition-all duration-300",
                  isFeatured ? "border-blue-500/40" : "border-emerald-500/50"
                )}
                onClick={() => setIsDoorOpen(!isDoorOpen)}
                style={{ boxShadow: isFeatured 
                  ? "inset 0 0 20px rgba(59,130,246,0.1), 0 0 15px rgba(59,130,246,0.1)" 
                  : "inset 0 0 20px rgba(16,185,129,0.1), 0 0 15px rgba(16,185,129,0.1)" 
                }}
              >
                <div className={cn(
                  "absolute inset-y-0 left-1.5 w-[2px] rounded-full",
                  isFeatured ? "bg-blue-500/20" : "bg-emerald-500/20"
                )} />
                <div className={cn(
                  "absolute inset-y-0 right-1.5 w-[2px] rounded-full",
                  isFeatured ? "bg-blue-500/20" : "bg-emerald-500/20"
                )} />
                <div className="absolute inset-x-4 inset-y-2 flex flex-col-reverse gap-[1px]">
                  {Array.from({ length: Math.min(uSlots, 42) }).map((_, i) => {
                    const device = deviceMap.get(i + 1);
                    return (
                      <motion.div
                        key={i}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ delay: i * 0.01, duration: 0.3 }}
                        onClick={(e) => {
                          if (device) {
                            e.stopPropagation();
                            setSelectedDevice(device);
                          }
                        }}
                        className={cn(
                          "w-full rounded-[1px] flex-1",
                          device 
                            ? `${colors.bar} opacity-80 cursor-pointer hover:opacity-100 hover:scale-x-110 transition-all` 
                            : "bg-slate-800/60"
                        )}
                        style={{ minHeight: "4px" }}
                      />
                    );
                  })}
                </div>

                {/* Door Overlay */}
                <motion.div
                  initial={false}
                  animate={{ 
                    scaleX: isDoorOpen ? 0.2 : 1,
                    x: isDoorOpen ? 5 : 0,
                    opacity: isDoorOpen ? 0.6 : 1,
                  }}
                  transition={{ type: "spring", stiffness: 100, damping: 20 }}
                  className={cn(
                    "absolute inset-0 z-10 border-l border-white/10 overflow-hidden backdrop-blur-[1.5px] cursor-pointer",
                    isFeatured 
                      ? "bg-blue-500/10 border-blue-400/20 shadow-[inset_0_0_15px_rgba(59,130,246,0.1)]" 
                      : "bg-emerald-500/10 border-emerald-400/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]"
                  )}
                  style={{ 
                    transformOrigin: "right center",
                    backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.02) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02) 100%)`,
                    backgroundSize: "4px 4px"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDoorOpen(!isDoorOpen);
                  }}
                >
                  {/* Glass reflections */}
                  <div className="absolute top-0 left-0 w-full h-[200%] bg-gradient-to-b from-white/10 via-white/5 to-transparent skew-y-[-45deg] translate-y-[-50%]" />
                  
                  {/* Door Handle */}
                  <div className={cn(
                    "absolute top-1/2 left-2 w-1.5 h-10 -translate-y-1/2 rounded-full border border-white/20 shadow-lg",
                    isFeatured ? "bg-blue-900/60" : "bg-emerald-900/60"
                  )} />

                  {/* Door Status Text (Subtle) */}
                  <div className="absolute bottom-2 right-2 opacity-20 pointer-events-none">
                    <span className="text-[6px] font-black uppercase text-white tracking-widest">{isDoorOpen ? 'Open' : 'Locked'}</span>
                  </div>

                  {/* SmartRack Display (if featured/main) */}
                  {rack.rackType === "MAIN" && !isDoorOpen && (
                    <div className="absolute top-12 inset-x-2 h-16 bg-slate-950/90 border border-blue-500/40 rounded-lg flex flex-col items-center justify-center p-1 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-1" />
                      <div className="flex items-center gap-1 mb-1">
                        <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[6px] text-blue-400 font-black uppercase tracking-[0.2em]">Live Node</span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-sm text-white font-black leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{rack.utilizationPercent}</span>
                        <span className="text-[7px] text-blue-500 font-black">%</span>
                      </div>
                      <div className="mt-1 flex gap-0.5">
                         {[...Array(3)].map((_, i) => (
                           <div key={i} className="h-0.5 w-2 bg-blue-500/30 rounded-full" />
                         ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Door Toggle Prompt (Mini indicator) */}
              <div 
                className="absolute -bottom-1 -left-1 z-20 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDoorOpen(!isDoorOpen);
                }}
              >
                 <div className={cn(
                   "p-1 rounded-md border flex items-center justify-center shadow-md",
                   isDoorOpen 
                     ? "bg-slate-800 border-slate-700 text-slate-400" 
                     : isFeatured
                       ? "bg-blue-600 border-blue-400 text-white"
                       : "bg-emerald-600 border-emerald-400 text-white"
                 )}>
                   {isDoorOpen ? <DoorOpen className="h-2 w-2" /> : <DoorClosed className="h-2 w-2" />}
                 </div>
              </div>

              <div className="text-center mt-2">
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Capacity</div>
                <div className="text-xs font-black text-slate-300">{rack.usedU}/{rack.capacityU}U</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <StatChip icon={Zap} label="Power" value="2.4 kW" color="text-amber-400" bg="bg-amber-500/10" />
                <StatChip icon={Thermometer} label="Temp" value="24.5°C" color="text-emerald-400" bg="bg-emerald-500/10" />
                <StatChip icon={Droplets} label="Humidity" value="65%" color="text-blue-400" bg="bg-blue-500/10" />
                <StatChip 
                  icon={Server} 
                  label="Devices" 
                  value={rack._count?.devices ?? rack.devices.length} 
                  color="text-purple-400" 
                  bg="bg-purple-500/10" 
                  onClick={() => setShowDeviceList(true)}
                />
              </div>

              {/* Capacity bar */}
              <div className="p-5 rounded-3xl bg-slate-800/50 border border-slate-700/50">
                <div className="flex items-center justify-between text-xs font-black text-slate-500 mb-3 uppercase tracking-widest">
                  <span>Capacity Utilization</span>
                  <span className="text-slate-300">{rack.usedU} / {rack.capacityU} U</span>
                </div>
                <div className="h-4 w-full bg-slate-700 rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rack.utilizationPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", colors.bar, "shadow-lg", colors.glow)}
                  />
                </div>
                <div className="flex justify-between mt-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <span>{rack.availableU}U available</span>
                  <span className={colors.text}>{rack.utilizationPercent}% filled</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Device Detail Dialog */}
      <Dialog open={!!selectedDevice} onOpenChange={(open) => !open && setSelectedDevice(null)}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-xl", colors.badge)}>
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">{selectedDevice?.name}</DialogTitle>
                <DialogDescription className="text-slate-500 text-xs font-medium">
                  ID: {selectedDevice?.uniqId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="p-4 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Position</p>
              <p className="text-lg font-black text-white">U-{selectedDevice?.positionU}</p>
            </div>
            <div className="p-4 rounded-3xl bg-slate-800/50 border border-slate-700/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Size</p>
              <p className="text-lg font-black text-white">{selectedDevice?.sizeU}U</p>
            </div>
            <div className="col-span-2 p-4 rounded-3xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-bold text-white uppercase tracking-wider">Operational</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Online</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl h-11">
              <Activity className="h-4 w-4 mr-2" /> Live Monitor
            </Button>
            <Button variant="outline" className="h-11 w-11 p-0 rounded-2xl border-slate-700">
              <Info className="h-4 w-4 text-slate-400" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rack Device List Dialog */}
      <Dialog open={showDeviceList} onOpenChange={setShowDeviceList}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg rounded-3xl p-0 overflow-hidden">
          <div className="p-6 pb-4 border-b border-slate-800">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <List className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black">{rack.name}</DialogTitle>
                  <DialogDescription className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
                    Assigned Equipment ({rack.devices.length})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {rack.devices.length > 0 ? (
              rack.devices.sort((a,b) => (b.positionU || 0) - (a.positionU || 0)).map((device) => (
                <div 
                  key={device.id}
                  onClick={() => {
                    setShowDeviceList(false);
                    setSelectedDevice(device);
                  }}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-[10px] font-black group-hover:border-blue-500/50 group-hover:text-blue-400">
                      U{device.positionU}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-200 group-hover:text-white truncate max-w-[180px]">
                        {device.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">Size: {device.sizeU}U • {device.uniqId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <ChevronDown className="h-4 w-4 text-slate-600 rotate-[-90deg]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-700/50">
                  <AlertCircle className="h-8 w-8 text-slate-600" />
                </div>
                <h3 className="text-slate-300 font-bold">No Devices Found</h3>
                <p className="text-slate-500 text-xs mt-1">This rack is currently empty or has no assigned devices.</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-slate-950/50 border-t border-slate-800">
            <Button 
              onClick={() => setShowDeviceList(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black rounded-2xl"
            >
              Close List
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── RackSlotPicker ───────────────────────────────────────────────────────────
const RackSlotPicker = ({
  slotNumber,
  selectedRackId,
  availableRacks,
  onSelect,
  onClear,
}: {
  slotNumber: number;
  selectedRackId: string | null;
  availableRacks: RackData[];
  onSelect: (id: string) => void;
  onClear: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const selected = availableRacks.find((r) => r.id === selectedRackId);

  return (
    <div className="relative h-full">
      {selected ? (
        <div className="h-full group">
          <RackCard rack={selected} slotLabel={`Slot ${slotNumber}`} />
          {/* Change / Remove overlay */}
          <div className="absolute top-3 left-3 z-20 hidden group-hover:flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              <ChevronDown className="h-3 w-3" /> Change
            </button>
            <button
              onClick={onClear}
              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full bg-red-900/80 text-red-300 shadow-lg hover:bg-red-800 transition-colors"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setOpen(true)}
          className={cn(
            "w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed transition-all duration-300 group",
            "border-slate-700 hover:border-blue-500/50 bg-slate-900/30 hover:bg-blue-950/20"
          )}
        >
          <div className="h-12 w-12 rounded-2xl bg-slate-800 group-hover:bg-blue-900/40 flex items-center justify-center transition-colors border border-slate-700 group-hover:border-blue-500/40">
            <PlusCircle className="h-6 w-6 text-slate-500 group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-400 group-hover:text-blue-400 transition-colors">
              Slot {slotNumber}
            </p>
            <p className="text-[11px] text-slate-600 mt-0.5">Click to select a rack</p>
          </div>
        </motion.button>
      )}

      {/* Dropdown Picker */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              className="absolute top-4 left-4 z-50 w-72 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800">
                <div>
                  <p className="text-sm font-black text-white">Select Rack</p>
                  <p className="text-[10px] text-slate-500">for Slot {slotNumber}</p>
                </div>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Rack list */}
              <div className="max-h-64 overflow-y-auto">
                {availableRacks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-slate-500">No other racks available</div>
                ) : (
                  availableRacks.map((rack) => {
                    const isSelected = rack.id === selectedRackId;
                    const colors = getUtilizationColor(rack.utilizationPercent);
                    return (
                      <button
                        key={rack.id}
                        onClick={() => { onSelect(rack.id); setOpen(false); }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-slate-800/60 transition-colors text-left",
                          isSelected && "bg-blue-900/20"
                        )}
                      >
                        {/* Mini rack visual */}
                        <div className="flex-shrink-0 w-8 h-14 rounded bg-slate-950 border border-slate-700 relative overflow-hidden">
                          <div
                            className={cn("absolute inset-x-0 bottom-0 transition-all", colors.bar, "opacity-60")}
                            style={{ height: `${rack.utilizationPercent}%` }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-black text-white truncate">{rack.name}</p>
                            {rack.rackType === "MAIN" && (
                              <Star className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500">
                            {rack.usedU}/{rack.capacityU}U • {rack.utilizationPercent}% used
                          </p>
                          {rack.location && (
                            <p className="text-[10px] text-slate-600 truncate">{rack.location}</p>
                          )}
                        </div>

                        {isSelected && (
                          <Check className="h-4 w-4 text-blue-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {selectedRackId && (
                <div className="p-3 border-t border-slate-800">
                  <button
                    onClick={() => { onClear(); setOpen(false); }}
                    className="w-full text-center text-xs text-red-400 hover:text-red-300 font-bold py-1"
                  >
                    Remove from slot
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function RackMonitorPage() {
  const [racks, setRacks] = useState<RackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Slot selections: slot2, slot3, slot4 → rack ID or null
  const [slots, setSlots] = useState<[string | null, string | null, string | null]>([null, null, null]);
  const [isReady, setIsReady] = useState(false);

  const { canView } = useMenuItemPermissions("rack-monitor");
  const { loading: menuLoading } = useMenu();

  // Load saved slots from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SLOT_STORAGE_KEY);
      if (saved) setSlots(JSON.parse(saved));
    } catch {}
    setIsReady(true);
  }, []);

  // Save slots to localStorage whenever they change, but only after initial load is ready
  useEffect(() => {
    if (isReady) {
      try { 
        localStorage.setItem(SLOT_STORAGE_KEY, JSON.stringify(slots)); 
      } catch {}
    }
  }, [slots, isReady]);

  const fetchRacks = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await fetch("/api/racks");
      if (res.ok) {
        const data = await res.json();
        setRacks(data.racks || []);
        setLastRefresh(new Date());
      }
    } catch (err) {
      console.error("Failed to fetch racks:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRacks(); }, [fetchRacks]);
  useEffect(() => {
    const interval = setInterval(() => fetchRacks(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchRacks]);

  const setSlot = (idx: 0 | 1 | 2, rackId: string | null) => {
    setSlots((prev) => {
      const next = [...prev] as [string | null, string | null, string | null];
      next[idx] = rackId;
      return next;
    });
  };

  // Hydration fix: only render time on client
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view the Rack Monitor."
        showActions
      />
    );
  }

  const mainRack = racks.find((r) => r.rackType === "MAIN");
  // For each selectable slot, exclude MAIN rack and racks already chosen in other slots
  const getAvailableForSlot = (slotIdx: 0 | 1 | 2) => {
    const otherSlots = slots.filter((_, i) => i !== slotIdx);
    return racks.filter(
      (r) => r.rackType !== "MAIN" && !otherSlots.includes(r.id)
    );
  };

  const totalCapacity = racks.reduce((s, r) => s + r.capacityU, 0);
  const totalUsed = racks.reduce((s, r) => s + r.usedU, 0);
  const totalDevices = racks.reduce((s, r) => s + (r._count?.devices ?? r.devices.length), 0);
  const avgUtilization = racks.length > 0
    ? Math.round(racks.reduce((s, r) => s + r.utilizationPercent, 0) / racks.length)
    : 0;

  const slotRacks = slots.map((id) => racks.find((r) => r.id === id) ?? null);
  const filledSlots = slots.filter(Boolean).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1800px] mx-auto">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <Layers className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Rack Monitor
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                1 Main Rack + {filledSlots}/3 optional slots selected
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Slot usage indicator */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-6 rounded-full transition-all",
                  slots[i] ? "bg-blue-500" : "bg-slate-600"
                )}
              />
            ))}
            <span className="text-[10px] font-black text-slate-400 ml-1 uppercase tracking-wider">
              {filledSlots}/3 Slots
            </span>
          </div>

          {/* Last refresh */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <Clock className="h-3.5 w-3.5" />
            <span>Updated {mounted ? lastRefresh.toLocaleTimeString() : "--:--:--"}</span>
          </div>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-700 text-slate-400 hover:text-white"
            onClick={() => fetchRacks(true)}
            disabled={refreshing}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Racks", value: racks.length, icon: Box, color: "blue", sub: `${racks.filter(r => r.rackType === "MAIN").length} main` },
          { label: "Total Capacity", value: `${totalCapacity}U`, icon: HardDrive, color: "purple", sub: `${totalUsed}U used` },
          { label: "Total Devices", value: totalDevices, icon: Server, color: "emerald", sub: "across all racks" },
          { label: "Avg Utilization", value: `${avgUtilization}%`, icon: BarChart2, color: avgUtilization < 75 ? "emerald" : "amber", sub: "overall load" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className={cn(
              "border-0 shadow-md overflow-hidden bg-gradient-to-br",
              stat.color === "blue" && "from-blue-500/5 to-blue-600/5 dark:from-blue-500/10 dark:to-blue-600/10",
              stat.color === "purple" && "from-purple-500/5 to-purple-600/5 dark:from-purple-500/10 dark:to-purple-600/10",
              stat.color === "emerald" && "from-emerald-500/5 to-emerald-600/5 dark:from-emerald-500/10 dark:to-emerald-600/10",
              stat.color === "amber" && "from-amber-500/5 to-amber-600/5 dark:from-amber-500/10 dark:to-amber-600/10",
            )}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn("p-2.5 rounded-xl",
                  stat.color === "blue" && "bg-blue-500/10",
                  stat.color === "purple" && "bg-purple-500/10",
                  stat.color === "emerald" && "bg-emerald-500/10",
                  stat.color === "amber" && "bg-amber-500/10",
                )}>
                  <stat.icon className={cn("h-5 w-5",
                    stat.color === "blue" && "text-blue-500",
                    stat.color === "purple" && "text-purple-500",
                    stat.color === "emerald" && "text-emerald-500",
                    stat.color === "amber" && "text-amber-500",
                  )} />
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</div>
                  <div className="text-2xl font-black text-slate-900 dark:text-white leading-none mt-0.5">{stat.value}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{stat.sub}</div>
                </div>
              </CardContent>
              <div className={cn("h-0.5 w-full opacity-30",
                stat.color === "blue" && "bg-blue-500",
                stat.color === "purple" && "bg-purple-500",
                stat.color === "emerald" && "bg-emerald-500",
                stat.color === "amber" && "bg-amber-500",
              )} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── 4-Slot Rack Layout ────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={cn("rounded-3xl bg-slate-800/30 animate-pulse", i === 0 ? "h-80 col-span-2 row-span-2" : "h-56")} />
          ))}
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key="rack-grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Helper hint */}
            <div className="flex items-center gap-2 mb-4 text-[11px] text-slate-500">
              <Activity className="h-3.5 w-3.5" />
              <span>
                <strong className="text-slate-400">Slot 1</strong> is locked to your Main Rack.
                Hover over Slot 2–4 to change or remove the selected rack.
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* ── SLOT 1: MAIN RACK (always) ── */}
              <div>
                {mainRack ? (
                  <RackCard rack={mainRack} isFeatured slotLabel="Slot 1 · MAIN" />
                ) : (
                  <div className="h-full min-h-[200px] flex flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/30 p-8 text-center">
                    <Star className="h-10 w-10 text-slate-600" />
                    <div>
                      <p className="font-black text-slate-400">No Main Rack Assigned</p>
                      <p className="text-xs text-slate-600 mt-1">
                        Set a rack as MAIN in Infrastructure → Rack Management.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ── SLOT 2 ── */}
              <div className="min-h-[180px]">
                <RackSlotPicker
                  slotNumber={2}
                  selectedRackId={slots[0]}
                  availableRacks={getAvailableForSlot(0)}
                  onSelect={(id) => setSlot(0, id)}
                  onClear={() => setSlot(0, null)}
                />
              </div>

              {/* ── SLOT 3 ── */}
              <div className="min-h-[180px]">
                <RackSlotPicker
                  slotNumber={3}
                  selectedRackId={slots[1]}
                  availableRacks={getAvailableForSlot(1)}
                  onSelect={(id) => setSlot(1, id)}
                  onClear={() => setSlot(1, null)}
                />
              </div>

              {/* ── SLOT 4 ── */}
              <div className="min-h-[180px]">
                <RackSlotPicker
                  slotNumber={4}
                  selectedRackId={slots[2]}
                  availableRacks={getAvailableForSlot(2)}
                  onSelect={(id) => setSlot(2, id)}
                  onClear={() => setSlot(2, null)}
                />
              </div>

            </div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
