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
import { generateMockMetrics } from "@/lib/services/mock-data-service";

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

const SLOT_STORAGE_KEY = "dashboard-capacity-slots-v1";

// ─── Utility ─────────────────────────────────────────────────────────────────
const getUtilizationColor = (pct: number) => {
  if (pct < 50)
    return {
      bar: "bg-emerald-500",
      glow: "shadow-emerald-500/30",
      text: "text-emerald-400",
      badge: "bg-emerald-500/10 text-emerald-400",
    };
  if (pct < 75)
    return {
      bar: "bg-amber-500",
      glow: "shadow-amber-500/30",
      text: "text-amber-400",
      badge: "bg-amber-500/10 text-amber-400",
    };
  if (pct < 90)
    return {
      bar: "bg-orange-500",
      glow: "shadow-orange-500/30",
      text: "text-orange-400",
      badge: "bg-orange-500/10 text-orange-400",
    };
  return {
    bar: "bg-red-500",
    glow: "shadow-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500/10 text-red-400",
  };
};

// ─── StatChip ─────────────────────────────────────────────────────────────────
const StatChip = ({
  icon: Icon,
  label,
  value,
  color,
  bg,
  onClick,
}: {
  icon: any;
  label: string;
  value: string | number;
  color: string;
  bg: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center gap-4 p-4 rounded-2xl transition-all",
      bg,
      onClick &&
        "cursor-pointer hover:scale-[1.02] active:scale-95 border border-transparent hover:border-current/20 shadow-lg hover:shadow-current/10",
    )}
  >
    <div className={cn("p-2.5 rounded-xl bg-foreground/5 shadow-inner", color)}>
      <Icon className="h-6 w-6 flex-shrink-0" />
    </div>
    <div>
      <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </div>
      <div className={cn("text-xl font-black leading-none", color)}>
        {value}
      </div>
    </div>
  </div>
);

// ─── RackCard ─────────────────────────────────────────────────────────────────
const RackCard = ({
  rack,
  isFeatured = false,
  slotLabel,
  telemetry,
}: {
  rack: RackData;
  isFeatured?: boolean;
  slotLabel?: string;
  telemetry?: RackTelemetry;
}) => {
  const [selectedDevice, setSelectedDevice] = useState<
    (typeof rack.devices)[number] | null
  >(null);
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
            ? "border-blue-500/30 bg-card shadow-2xl shadow-blue-500/10"
            : "border-emerald-500/20 bg-card backdrop-blur-xl hover:border-emerald-500/40",
        )}
      >
        {/* Top glow accent */}
        <div
          className={cn(
            "absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent",
            isFeatured ? "via-blue-500/60" : "via-emerald-500/60",
          )}
        />

        {/* Slot label badge */}
        {slotLabel && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={cn(
                "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border",
                isFeatured
                  ? "bg-blue-950/50 text-blue-400 border-blue-500/30"
                  : "bg-emerald-950/50 text-emerald-400 border-emerald-500/30",
              )}
            >
              {slotLabel}
            </span>
          </div>
        )}

        <div
          className={cn("flex flex-col h-full p-5", isFeatured ? "p-6" : "p-5")}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div
                  className={cn(
                    "h-2 w-2 rounded-full animate-pulse flex-shrink-0",
                    isFeatured ? "bg-blue-400" : "bg-emerald-400",
                  )}
                />
                <h3
                  className={cn(
                    "font-black tracking-tight truncate text-foreground",
                    isFeatured ? "text-2xl" : "text-lg",
                  )}
                >
                  {rack.name}
                </h3>
                {rack.rackType === "MAIN" && (
                  <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30 text-[9px] font-black uppercase tracking-widest px-1.5 flex-shrink-0">
                    <Star className="h-2.5 w-2.5 mr-1" />
                    MAIN
                  </Badge>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                Smart Rack • {rack.rackType}
                {rack.location && ` • ${rack.location}`}
              </p>
            </div>
            <div className="flex flex-col items-end ml-4">
              <div
                className={cn(
                  "font-black tracking-tighter leading-none",
                  isFeatured ? "text-4xl" : "text-2xl",
                  colors.text,
                )}
              >
                {rack.utilizationPercent}%
              </div>
              <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">
                Utilization
              </p>
            </div>
          </div>

          {/* Main content */}
          <div className="flex gap-5 items-start flex-1">
            {/* 2D Rack Visual */}
            <div className="flex-shrink-0 relative">
              <div
                className={cn(
                  "relative rounded-2xl border-2 overflow-hidden cursor-pointer group",
                  "bg-gradient-to-b from-background to-muted shadow-inner",
                  "w-32 h-[420px] transition-all duration-300",
                  isFeatured ? "border-blue-500/40" : "border-emerald-500/50",
                )}
                onClick={() => setIsDoorOpen(!isDoorOpen)}
                style={{
                  boxShadow: isFeatured
                    ? "inset 0 0 20px rgba(59,130,246,0.1), 0 0 15px rgba(59,130,246,0.1)"
                    : "inset 0 0 20px rgba(16,185,129,0.1), 0 0 15px rgba(16,185,129,0.1)",
                }}
              >
                <div
                  className={cn(
                    "absolute inset-y-0 left-1.5 w-[2px] rounded-full",
                    isFeatured ? "bg-blue-500/20" : "bg-emerald-500/20",
                  )}
                />
                <div
                  className={cn(
                    "absolute inset-y-0 right-1.5 w-[2px] rounded-full",
                    isFeatured ? "bg-blue-500/20" : "bg-emerald-500/20",
                  )}
                />
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
                            : "bg-muted-foreground/20",
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
                      : "bg-emerald-500/10 border-emerald-400/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.1)]",
                  )}
                  style={{
                    transformOrigin: "right center",
                    backgroundImage: `linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.02) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.02) 75%, rgba(255,255,255,0.02) 100%)`,
                    backgroundSize: "4px 4px",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsDoorOpen(!isDoorOpen);
                  }}
                >
                  {/* Glass reflections */}
                  <div className="absolute top-0 left-0 w-full h-[200%] bg-gradient-to-b from-white/10 via-white/5 to-transparent skew-y-[-45deg] translate-y-[-50%]" />

                  {/* Door Handle */}
                  <div
                    className={cn(
                      "absolute top-1/2 left-2 w-1.5 h-10 -translate-y-1/2 rounded-full border border-white/20 shadow-lg",
                      isFeatured ? "bg-blue-900/60" : "bg-emerald-900/60",
                    )}
                  />

                  {/* Door Status Text (Subtle) */}
                  <div className="absolute bottom-2 right-2 opacity-20 pointer-events-none">
                    <span className="text-[6px] font-black uppercase text-white tracking-widest">
                      {isDoorOpen ? "Open" : "Locked"}
                    </span>
                  </div>

                  {/* SmartRack Display (if featured/main) */}
                  {rack.rackType === "MAIN" && !isDoorOpen && (
                    <div className="absolute top-12 inset-x-2 h-16 bg-slate-950/90 border border-blue-500/40 rounded-lg flex flex-col items-center justify-center p-1 shadow-[0_0_15px_rgba(59,130,246,0.4)]">
                      <div className="w-full h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent mb-1" />
                      <div className="flex items-center gap-1 mb-1">
                        <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                        <span className="text-[6px] text-blue-400 font-black uppercase tracking-[0.2em]">
                          Live Node
                        </span>
                      </div>
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-sm text-white font-black leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                          {rack.utilizationPercent}
                        </span>
                        <span className="text-[7px] text-blue-500 font-black">
                          %
                        </span>
                      </div>
                      <div className="mt-1 flex gap-0.5">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="h-0.5 w-2 bg-blue-500/30 rounded-full"
                          />
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
                <div
                  className={cn(
                    "p-1 rounded-md border flex items-center justify-center shadow-md",
                    isDoorOpen
                      ? "bg-muted border-border text-muted-foreground"
                      : isFeatured
                        ? "bg-blue-600 border-blue-400 text-white"
                        : "bg-emerald-600 border-emerald-400 text-white",
                  )}
                >
                  {isDoorOpen ? (
                    <DoorOpen className="h-2 w-2" />
                  ) : (
                    <DoorClosed className="h-2 w-2" />
                  )}
                </div>
              </div>

              <div className="text-center mt-2">
                <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  Capacity
                </div>
                <div className="text-xs font-black text-foreground">
                  {rack.usedU}/{rack.capacityU}U
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 flex flex-col justify-between py-2">
              <div className="grid grid-cols-2 gap-4">
                <StatChip
                  icon={Zap}
                  label="Power"
                  value={`${telemetry?.powerKW?.toFixed(1) ?? "-"} kW`}
                  color="text-amber-400"
                  bg="bg-amber-500/10"
                />
                <StatChip
                  icon={Thermometer}
                  label="Temp"
                  value={`${telemetry?.tempFront?.toFixed(1) ?? "-"}°C`}
                  color="text-emerald-400"
                  bg="bg-emerald-500/10"
                />
                <StatChip
                  icon={Droplets}
                  label="Humidity"
                  value={`${telemetry?.humFront?.toFixed(0) ?? "-"}%`}
                  color="text-blue-400"
                  bg="bg-blue-500/10"
                />
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
              <div className="mt-6 p-5 rounded-3xl bg-muted/50 border border-border/50 shadow-lg">
                <div className="flex items-center justify-between text-xs font-black text-muted-foreground mb-3 uppercase tracking-widest">
                  <span>Capacity Utilization</span>
                  <span className="text-foreground">
                    {rack.usedU} / {rack.capacityU} U
                  </span>
                </div>
                <div className="h-4 w-full bg-muted rounded-full overflow-hidden shadow-inner">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${rack.utilizationPercent}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                      "h-full rounded-full",
                      colors.bar,
                      "shadow-lg",
                      colors.glow,
                    )}
                  />
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                  <span>{rack.availableU}U available</span>
                  <span className={colors.text}>
                    {rack.utilizationPercent}% filled
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Device Detail Dialog */}
      <Dialog
        open={!!selectedDevice}
        onOpenChange={(open) => !open && setSelectedDevice(null)}
      >
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={cn("p-2 rounded-xl", colors.badge)}>
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black">
                  {selectedDevice?.name}
                </DialogTitle>
                <DialogDescription className="text-muted-foreground text-xs font-medium">
                  ID: {selectedDevice?.uniqId}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            <div className="p-4 rounded-3xl bg-muted/50 border border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Position
              </p>
              <p className="text-lg font-black text-foreground">
                U-{selectedDevice?.positionU}
              </p>
            </div>
            <div className="p-4 rounded-3xl bg-muted/50 border border-border/50">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                Size
              </p>
              <p className="text-lg font-black text-foreground">
                {selectedDevice?.sizeU}U
              </p>
            </div>
            <div className="col-span-2 p-4 rounded-3xl bg-muted/50 border border-border/50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">
                  Status
                </p>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-bold text-foreground uppercase tracking-wider">
                    Operational
                  </p>
                </div>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                Online
              </Badge>
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl h-11">
              <Activity className="h-4 w-4 mr-2" /> Live Monitor
            </Button>
            <Button variant="outline" className="h-11 w-11 p-0 rounded-2xl">
              <Info className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rack Device List Dialog */}
      <Dialog open={showDeviceList} onOpenChange={setShowDeviceList}>
        <DialogContent className="max-w-lg rounded-3xl p-0 overflow-hidden">
          <div className="p-6 pb-4 border-b border-border">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <List className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black">
                    {rack.name}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    Assigned Equipment ({rack.devices.length})
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="max-h-[400px] overflow-y-auto p-4 space-y-2 custom-scrollbar">
            {rack.devices.length > 0 ? (
              rack.devices
                .sort((a, b) => (b.positionU || 0) - (a.positionU || 0))
                .map((device) => (
                  <div
                    key={device.id}
                    onClick={() => {
                      setShowDeviceList(false);
                      setSelectedDevice(device);
                    }}
                    className="group flex items-center justify-between p-3 rounded-2xl bg-muted/40 border border-border/50 hover:border-blue-500/30 hover:bg-blue-600/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-background border border-border flex items-center justify-center text-[10px] font-black group-hover:border-blue-500/50 group-hover:text-blue-400">
                        U{device.positionU}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-foreground group-hover:text-foreground truncate max-w-[180px]">
                          {device.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          Size: {device.sizeU}U • {device.uniqId}
                        </p>
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
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 border border-border/50">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-foreground font-bold">No Devices Found</h3>
                <p className="text-muted-foreground text-xs mt-1">
                  This rack is currently empty or has no assigned devices.
                </p>
              </div>
            )}
          </div>

          <div className="p-4 bg-muted/30 border-t border-border">
            <Button
              onClick={() => setShowDeviceList(false)}
              variant="outline"
              className="w-full font-black rounded-2xl"
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
            "border-border hover:border-blue-500/50 bg-muted/20 hover:bg-blue-500/5",
          )}
        >
          <div className="h-12 w-12 rounded-2xl bg-muted group-hover:bg-blue-900/40 flex items-center justify-center transition-colors border border-border group-hover:border-blue-500/40">
            <PlusCircle className="h-6 w-6 text-muted-foreground group-hover:text-blue-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-muted-foreground group-hover:text-blue-400 transition-colors">
              Slot {slotNumber}
            </p>
            <p className="text-[11px] text-muted-foreground/60 mt-0.5">
              Click to select a rack
            </p>
          </div>
        </motion.button>
      )}

      {/* Dropdown Picker */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              className="absolute top-4 left-4 z-50 w-72 rounded-2xl border border-border bg-popover shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="text-sm font-black text-foreground">
                    Select Rack
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    for Slot {slotNumber}
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Rack list */}
              <div className="max-h-64 overflow-y-auto">
                {availableRacks.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No other racks available
                  </div>
                ) : (
                  availableRacks.map((rack) => {
                    const isSelected = rack.id === selectedRackId;
                    const colors = getUtilizationColor(rack.utilizationPercent);
                    return (
                      <button
                        key={rack.id}
                        onClick={() => {
                          onSelect(rack.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-3 p-3 hover:bg-muted/60 transition-colors text-left",
                          isSelected && "bg-blue-500/10",
                        )}
                      >
                        {/* Mini rack visual */}
                        <div className="flex-shrink-0 w-8 h-14 rounded bg-background border border-border relative overflow-hidden">
                          <div
                            className={cn(
                              "absolute inset-x-0 bottom-0 transition-all",
                              colors.bar,
                              "opacity-60",
                            )}
                            style={{ height: `${rack.utilizationPercent}%` }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-black text-foreground truncate">
                              {rack.name}
                            </p>
                            {rack.rackType === "MAIN" && (
                              <Star className="h-2.5 w-2.5 text-blue-400 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {rack.usedU}/{rack.capacityU}U •{" "}
                            {rack.utilizationPercent}% used
                          </p>
                          {rack.location && (
                            <p className="text-[10px] text-muted-foreground/60 truncate">
                              {rack.location}
                            </p>
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
                <div className="p-3 border-t border-border">
                  <button
                    onClick={() => {
                      onClear();
                      setOpen(false);
                    }}
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

import { useMqttServer } from "@/contexts/MqttServerProvider";

interface RackTelemetry {
  tempFront: number;
  tempBack: number;
  humFront: number;
  humBack: number;
  powerKW: number;
  waterLeak: boolean;
  vibrationX: number;
  vibrationY: number;
  lastUpdate: string;
}

export function CapacityView() {
  const { subscribe, unsubscribe } = useMqttServer();

  const [racks, setRacks] = useState<RackData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [telemetry, setTelemetry] = useState<Record<string, RackTelemetry>>({});

  // Slot selections: slot2, slot3, slot4 → rack ID or null
  const [slots, setSlots] = useState<
    [string | null, string | null, string | null]
  >([null, null, null]);
  const [isReady, setIsReady] = useState(false);

  // Load saved slots from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SLOT_STORAGE_KEY);
      if (saved) setSlots(JSON.parse(saved));
    } catch {}
    setIsReady(true);
  }, []);

  // Save slots to localStorage whenever they change
  useEffect(() => {
    if (isReady) {
      try {
        localStorage.setItem(SLOT_STORAGE_KEY, JSON.stringify(slots));
      } catch {}
    }
  }, [slots, isReady]);

  // MQTT Message Handler
  const onMqttMessage = useCallback(
    (topic: string, payload: string, serverId: string) => {
      // MOCK MODE: Silently ignore incoming MQTT to avoid overwriting mock data
    },
    [],
  );

  // MOCK DATA SIMULATION EFFECT
  useEffect(() => {
    const interval = setInterval(() => {
      const mock = generateMockMetrics();
      setTelemetry((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach(rackId => {
          next[rackId] = {
            ...next[rackId],
            tempFront: parseFloat(mock.temp) + (Math.random() - 0.5),
            humFront: parseFloat(mock.humidity) + (Math.random() - 0.5),
            powerKW: Math.random() * 5,
            lastUpdate: new Date().toISOString(),
          };
        });
        return next;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchRacks = useCallback(
    async (silent = false) => {
      // MOCK MODE: Skip API fetch and provide static mock data
      const mockRacks = [
        {
          id: "smartrack-rack-1",
          name: "Rack 1 (Smartrack)",
          capacityU: 42,
          rackType: "MAIN",
          location: "Data Center A",
          usedU: 25,
          availableU: 17,
          utilizationPercent: 60,
          devices: [{ id: "dev-1", name: "UPS", positionU: 1, sizeU: 4, uniqId: "smartrack-ups-1" }]
        },
        {
          id: "smartrack-rack-2",
          name: "Rack 2 (Smartrack)",
          capacityU: 42,
          rackType: "NORMAL",
          location: "Data Center B",
          usedU: 10,
          availableU: 32,
          utilizationPercent: 24,
          devices: []
        }
      ];
      setRacks(mockRacks as RackData[]);
      setLoading(false);
      setLastRefresh(new Date());
    },
    [],
  );

  useEffect(() => {
    fetchRacks();
    // Defer MQTT subscribe until after initial fetch completed
    return () => {
      // Cleanup unsubscribe all topics on unmount
      Object.keys(telemetry).forEach((rackId) => {
        try {
          unsubscribe(`rack/${rackId}/environment`, onMqttMessage);
          unsubscribe(`rack/${rackId}/power`, onMqttMessage);
        } catch {}
      });
    };
  }, [fetchRacks, unsubscribe, onMqttMessage, telemetry]);

  useEffect(() => {
    const interval = setInterval(() => fetchRacks(true), 30_000);
    return () => clearInterval(interval);
  }, [fetchRacks]);

  const setSlot = (idx: number, rackId: string | null) => {
    setSlots((prev) => {
      const next = [...prev] as [string | null, string | null, string | null];
      next[idx] = rackId;
      return next;
    });
  };

  const [selectedRack, setSelectedRack] = useState<RackData | null>(null);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <RefreshCw className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">
          Synchronizing capacity data...
        </p>
      </div>
    );
  }

  const mainRack = racks.find((r) => r.rackType === "MAIN");
  const getAvailableForSlot = (slotIdx: number) => {
    const otherSlots = slots.filter((_, i) => i !== slotIdx);
    return racks.filter(
      (r) => r.rackType !== "MAIN" && !otherSlots.includes(r.id),
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-3xl border border-border backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Layers className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-foreground tracking-tight">
                Capacity Monitor
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Live rack utilization overview • {racks.length} racks total
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-[11px] font-bold text-foreground">
            <Clock className="h-3.5 w-3.5 text-emerald-500" />
            <span>Last Sync: {lastRefresh.toLocaleTimeString()}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-10 px-4"
            onClick={() => fetchRacks(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", refreshing && "animate-spin")}
            />
            Sync Data
          </Button>
        </div>
      </div>

      {/* ── Rack List Table ───────────────────────────────────────────────────── */}
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="grid grid-cols-12 gap-4 px-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="col-span-4">Rack Name</div>
            <div className="col-span-2 text-center">Type</div>
            <div className="col-span-2 text-center">Capacity</div>
            <div className="col-span-2 text-center">Utilization</div>
            <div className="col-span-2 text-center">Devices</div>
          </div>
        </div>

        <div className="divide-y divide-border/50">
          {racks
            .sort((a, b) => {
              if (a.rackType === "MAIN") return -1;
              if (b.rackType === "MAIN") return 1;
              return b.utilizationPercent - a.utilizationPercent;
            })
            .map((rack) => {
              const colors = getUtilizationColor(rack.utilizationPercent);
              return (
                <motion.div
                  key={rack.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ backgroundColor: "rgba(59, 130, 246, 0.05)" }}
                  onClick={() => setSelectedRack(rack)}
                  className="grid grid-cols-12 gap-4 px-4 py-4 cursor-pointer transition-all hover:bg-blue-500/5 group"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "h-2 w-2 rounded-full flex-shrink-0",
                        rack.rackType === "MAIN"
                          ? "bg-blue-400"
                          : "bg-emerald-400",
                      )}
                    />
                    <div>
                      <p className="font-bold text-foreground group-hover:text-blue-500 transition-colors">
                        {rack.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {rack.location || "No location"}
                      </p>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    {rack.rackType === "MAIN" ? (
                      <Badge className="bg-blue-600/20 text-blue-400 border border-blue-500/30">
                        MAIN
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-muted/50 text-muted-foreground"
                      >
                        NORMAL
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <span className="font-bold text-foreground">
                      {rack.usedU} / {rack.capacityU} U
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", colors.bar)}
                        style={{ width: `${rack.utilizationPercent}%` }}
                      />
                    </div>
                    <span className={cn("font-bold", colors.text)}>
                      {rack.utilizationPercent}%
                    </span>
                  </div>

                  <div className="col-span-2 flex items-center justify-center">
                    <span className="font-bold text-muted-foreground">
                      {rack._count?.devices ?? rack.devices.length}
                    </span>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Rack Detail Modal */}
      <Dialog
        open={!!selectedRack}
        onOpenChange={(open) => !open && setSelectedRack(null)}
      >
        <DialogContent className="max-w-5xl rounded-3xl p-0 overflow-hidden">
          {selectedRack && (
            <div className="p-1">
              <RackCard
                rack={selectedRack}
                isFeatured={selectedRack.rackType === "MAIN"}
                telemetry={telemetry[selectedRack.id]}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
