"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Cpu, Eye, Search, QrCode, Settings, Zap, Thermometer, Activity, ArrowUpDown,
} from "lucide-react";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { DeviceQRCode } from "./DeviceQRCode";

interface ModularDevice {
  manufacturer: string;
  part_number: string;
  protocol: string;
  category?: string;
  data: Array<{ var_name: string; gpio_number: number }>;
}

interface I2CDevice {
  manufacturer: string;
  part_number: string;
  protocol: string;
  category?: string;
  data: Array<{ var_name: string }>;
}

interface ModularData {
  Modular: ModularDevice[];
  I2COUT: I2CDevice[];
}

const ICON_MAP: Record<string, any> = {
  DRYCONTACT: Activity,
  OPTOCOUPLER: Zap,
  GPIO: Settings,
  RELAY: Cpu,
  RELAYMINI: Cpu,
  AIO: Activity,
  LM75: Thermometer,
};

const COLOR_MAP: Record<string, string> = {
  DRYCONTACT: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  OPTOCOUPLER: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  GPIO: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  RELAY: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  RELAYMINI: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  AIO: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  LM75: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

interface Props {
  data: ModularData;
}

export function ModularSection({ data }: Props) {
  const [selectedDevice, setSelectedDevice] = useState<ModularDevice | I2CDevice | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const allDevices = [
    ...data.Modular.map((d) => ({ ...d, category: "Modular" })),
    ...data.I2COUT.map((d) => ({ ...d, category: "I2C Output" })),
  ];

  const { sorted, handleSort } = useSortableTable(allDevices);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(sorted, [
    "part_number", "manufacturer", "protocol", "category",
  ]);

  const getIcon = (pn: string) => ICON_MAP[pn] || Settings;
  const getColor = (pn: string) => COLOR_MAP[pn] || "bg-muted text-muted-foreground";

  const buildQRData = (device: ModularDevice | I2CDevice) => ({
    type: "modular",
    partNumber: device.part_number,
    manufacturer: device.manufacturer,
    protocol: device.protocol,
    deviceType: device.category || "Modular",
    gpioCount: device.data.length,
    version: "1.0",
  });

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Devices", value: allDevices.length, icon: Cpu, desc: "All modular devices" },
          { label: "Modular", value: data.Modular.length, icon: Settings, desc: "GPIO-based modules" },
          { label: "I2C Devices", value: data.I2COUT.length, icon: Activity, desc: "I2C output devices" },
          {
            label: "Total GPIO Pins",
            value: data.Modular.reduce((t, d) => t + d.data.length, 0),
            icon: Zap,
            desc: "Available GPIO pins",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Device List</h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search devices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-56 h-9 text-sm"
            />
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("part_number")}>
                Part Number <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("manufacturer")}>
                Manufacturer <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("category")}>
                Category <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead>Protocol</TableHead>
              <TableHead>GPIO Pins</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                  No devices found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((device: any, index: number) => {
                const Icon = getIcon(device.part_number);
                return (
                  <TableRow key={`${device.part_number}-${index}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{device.part_number}</span>
                      </div>
                    </TableCell>
                    <TableCell>{device.manufacturer}</TableCell>
                    <TableCell>
                      <Badge className={getColor(device.part_number)}>{device.category}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{device.protocol}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 focus:ring-2 focus:ring-ring transition-colors"
                        onClick={() => { setSelectedDevice(device); setShowDetailDialog(true); }}
                      >
                        {device.data?.length ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDevice(device); setShowDetailDialog(true); }}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedDevice(device); setShowQRDialog(true); }}>
                        <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedDevice?.part_number} — Pin Configuration</DialogTitle>
            <DialogDescription>
              {selectedDevice?.manufacturer} · {selectedDevice?.protocol}
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="bg-muted/40 rounded-lg border max-h-72 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Variable Name</TableHead>
                    <TableHead>GPIO Number</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDevice.data.map((pin: any, i: number) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-sm text-blue-600 dark:text-blue-400">{pin.var_name}</TableCell>
                      <TableCell>{pin.gpio_number !== undefined ? `GPIO ${pin.gpio_number}` : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Device QR Code
            </DialogTitle>
            <DialogDescription>
              Scan to identify {selectedDevice?.part_number}
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="space-y-4">
              <DeviceQRCode
                id={`qr-modular-${selectedDevice.part_number}`}
                data={buildQRData(selectedDevice)}
                label={selectedDevice.part_number}
                sublabel={selectedDevice.manufacturer}
              />
              <div className="bg-muted/50 rounded-lg p-3 text-xs space-y-1 border font-mono">
                <p className="font-sans text-xs font-semibold text-muted-foreground mb-2">QR Content:</p>
                <pre className="whitespace-pre-wrap break-all text-[10px]">
                  {JSON.stringify(buildQRData(selectedDevice), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
