"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Camera, Cpu, Radio, CheckCircle2, XCircle, Package,
  Layers, Network, ScanLine, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { ModularSection } from "@/components/library/ModularSection";
import { ModbusSection } from "@/components/library/ModbusSection";

interface ModularData {
  Modular: any[];
  I2COUT: any[];
}

type ModbusData = Record<string, any[]>;

export default function DeviceCatalogPage() {
  const [modularData, setModularData] = useState<ModularData | null>(null);
  const [modbusData, setModbusData] = useState<ModbusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scannedDevice, setScannedDevice] = useState<any | null>(null);
  const [scannedType, setScannedType] = useState<"modular" | "modbus" | null>(null);
  const [activeTab, setActiveTab] = useState("modular");

  useEffect(() => {
    const load = async () => {
      try {
        const [modularRes, modbusRes] = await Promise.all([
          fetch("/library/modular.json"),
          fetch("/library/modbus.json"),
        ]);
        if (modularRes.ok) setModularData(await modularRes.json());
        if (modbusRes.ok) setModbusData(await modbusRes.json());
      } catch {
        toast.error("Failed to load device library");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // QR Scanner
  useEffect(() => {
    if (!showScanDialog) {
      setScannedDevice(null);
      setScannedType(null);
      const el = document.getElementById("qr-reader");
      if (el) el.innerHTML = "";
      return;
    }

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        const el = document.getElementById("qr-reader");
        if (!el) return;
        el.innerHTML = "";

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0 },
          false
        );

        scanner.render(
          (decodedText: string) => {
            try {
              const qrData = JSON.parse(decodedText);
              // support both camelCase (new) and snake_case (legacy)
              const partNum = qrData.partNumber ?? qrData.part_number;
              const mfr = qrData.manufacturer;

              if (!partNum || !mfr) {
                toast.error("Invalid QR format");
                return;
              }

              let found: any = null;

              if (qrData.type === "modular" && modularData) {
                const all = [
                  ...modularData.Modular.map((d) => ({ ...d, category: "Modular" })),
                  ...modularData.I2COUT.map((d) => ({ ...d, category: "I2C Output" })),
                ];
                found = all.find(
                  (d) => d.part_number === partNum && d.manufacturer === mfr
                );
                if (found) setScannedType("modular");
              } else if (qrData.type === "modbus" && modbusData) {
                for (const [type, devices] of Object.entries(modbusData)) {
                  const match = (devices as any[]).find(
                    (d) => d.part_number === partNum && d.manufacturer === mfr
                  );
                  if (match) {
                    found = { ...match, device_type: type };
                    setScannedType("modbus");
                    break;
                  }
                }
              }

              if (found) {
                setScannedDevice(found);
                scanner.clear();
                toast.success(`Found: ${found.part_number} — ${found.manufacturer}`);
              } else {
                toast.error("Device not found in library");
              }
            } catch {
              toast.error("Failed to parse QR code");
            }
          },
          (err: string) => console.debug("QR scan:", err)
        );

        (window as any).__qrScanner = scanner;
      } catch {
        const el = document.getElementById("qr-reader");
        if (el) {
          el.innerHTML = `<div class="flex flex-col items-center justify-center p-10 text-muted-foreground">
            <p class="text-sm font-medium">Camera not available</p>
            <p class="text-xs mt-1">Check camera permissions and try again</p>
          </div>`;
        }
      }
    };

    const t = setTimeout(initScanner, 100);
    return () => {
      clearTimeout(t);
      const s = (window as any).__qrScanner;
      if (s) { s.clear().catch(() => {}); delete (window as any).__qrScanner; }
    };
  }, [showScanDialog, modularData, modbusData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="text-muted-foreground text-sm">Loading device catalog...</span>
      </div>
    );
  }

  const totalModular = modularData
    ? modularData.Modular.length + modularData.I2COUT.length
    : 0;
  const totalModbus = modbusData
    ? Object.values(modbusData).reduce((t, arr) => t + arr.length, 0)
    : 0;
  const totalDevices = totalModular + totalModbus;

  const modbusCategories = modbusData ? Object.keys(modbusData).length : 0;
  const modularCategories = modularData ? 2 : 0; // Modular + I2COUT
  const totalCategories = modbusCategories + modularCategories;

  const stats = [
    {
      label: "Total Devices",
      value: totalDevices,
      icon: Package,
      color: "text-violet-500",
      bg: "bg-violet-50 dark:bg-violet-950/30",
      border: "border-violet-200 dark:border-violet-800",
    },
    {
      label: "Modular / I2C",
      value: totalModular,
      icon: Cpu,
      color: "text-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
    },
    {
      label: "Modbus",
      value: totalModbus,
      icon: Radio,
      color: "text-indigo-500",
      bg: "bg-indigo-50 dark:bg-indigo-950/30",
      border: "border-indigo-200 dark:border-indigo-800",
    },
    {
      label: "Device Types",
      value: totalCategories,
      icon: Layers,
      color: "text-amber-500",
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
    },
  ];

  const isModbus = scannedType === "modbus";
  const familyColor = isModbus
    ? "border-indigo-300 dark:border-indigo-700 bg-indigo-50/60 dark:bg-indigo-950/30"
    : "border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30";
  const familyBadgeClass = isModbus
    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700"
    : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700";
  const familyDot = isModbus ? "bg-indigo-500" : "bg-emerald-500";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Device Catalog</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Katalog hardware resmi — modular IoT &amp; protokol Modbus
            </p>
          </div>
        </div>
        <Button
          onClick={() => setShowScanDialog(true)}
          className="gap-2 self-start sm:self-auto"
        >
          <ScanLine className="h-4 w-4" />
          Scan QR Code
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label} className={`border ${s.border} ${s.bg}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-white/60 dark:bg-black/20`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-10 p-1 gap-1">
            <TabsTrigger
              value="modular"
              className="flex items-center gap-2 px-4 data-[state=active]:shadow-sm"
            >
              <Cpu className="h-4 w-4 text-emerald-500" />
              <span>Modular / I2C</span>
              <Badge
                variant="secondary"
                className="ml-1 text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
              >
                {totalModular}
              </Badge>
            </TabsTrigger>
            <TabsTrigger
              value="modbus"
              className="flex items-center gap-2 px-4 data-[state=active]:shadow-sm"
            >
              <Network className="h-4 w-4 text-indigo-500" />
              <span>Modbus</span>
              <Badge
                variant="secondary"
                className="ml-1 text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              >
                {totalModbus}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <p className="text-xs text-muted-foreground hidden sm:block">
            {activeTab === "modular"
              ? `${modularData?.Modular.length ?? 0} Modular · ${modularData?.I2COUT.length ?? 0} I2C Output`
              : `${modbusCategories} kategori · ${totalModbus} perangkat`}
          </p>
        </div>

        <TabsContent value="modular" className="mt-4">
          {modularData ? (
            <ModularSection data={modularData} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Cpu className="h-10 w-10 opacity-30" />
              <p className="text-sm">No modular data available</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="modbus" className="mt-4">
          {modbusData ? (
            <ModbusSection data={modbusData} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <Radio className="h-10 w-10 opacity-30" />
              <p className="text-sm">No modbus data available</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Scanner Dialog */}
      <Dialog open={showScanDialog} onOpenChange={setShowScanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-primary" />
              Scan Device QR Code
            </DialogTitle>
            <DialogDescription>
              Arahkan kamera ke QR code perangkat untuk menemukan detail di katalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Scanner viewport */}
            {!scannedDevice && (
              <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/25 bg-muted">
                <div
                  id="qr-reader"
                  className="w-full min-h-[260px] flex items-center justify-center"
                >
                  <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Camera className="h-10 w-10 opacity-40" />
                    <p className="text-sm">Initializing camera...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Result card */}
            {scannedDevice && (
              <div className={`rounded-xl border-2 p-4 space-y-3 ${familyColor}`}>
                {/* Header row */}
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${familyDot} shrink-0`} />
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-semibold">Device Found!</span>
                  </div>
                  <Badge
                    variant="outline"
                    className={`ml-auto text-xs font-medium border ${familyBadgeClass}`}
                  >
                    {scannedType === "modular"
                      ? scannedDevice.category || "Modular"
                      : `Modbus · ${scannedDevice.device_type}`}
                  </Badge>
                </div>

                {/* Part number highlight */}
                <div className="bg-white/70 dark:bg-black/20 rounded-lg px-3 py-2 text-center">
                  <p className="font-mono text-lg font-bold tracking-wide">
                    {scannedDevice.part_number}
                  </p>
                  <p className="text-xs text-muted-foreground">{scannedDevice.manufacturer}</p>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Protocol", value: scannedDevice.protocol },
                    {
                      label: scannedType === "modular" ? "GPIO Pins" : "Variables",
                      value: scannedDevice.data?.length ?? 0,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white/50 dark:bg-black/15 rounded-lg p-2.5 text-center"
                    >
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="text-sm font-semibold mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Rescan button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setScannedDevice(null);
                    setScannedType(null);
                  }}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Scan Another Device
                </Button>
              </div>
            )}

            {/* Error state placeholder hidden in DOM for scanner */}
            {scannedDevice && <div id="qr-reader" className="hidden" />}

            {/* Footer action */}
            <Button
              className="w-full"
              variant={scannedDevice ? "default" : "secondary"}
              disabled={!scannedDevice}
              onClick={() => {
                setShowScanDialog(false);
                if (scannedDevice) {
                  setActiveTab(scannedType === "modbus" ? "modbus" : "modular");
                }
              }}
            >
              {scannedDevice ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Lihat di Katalog
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2 opacity-50" />
                  Menunggu scan...
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
