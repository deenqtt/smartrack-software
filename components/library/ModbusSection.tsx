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
  Eye, Search, QrCode, ArrowUpDown, Wind, Zap, Battery, Activity,
  Cpu, Droplets, Radio, Thermometer, Server, ToggleLeft, Copy
} from "lucide-react";
import { showToast } from "@/lib/toast-utils";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { DeviceQRCode } from "./DeviceQRCode";

interface ModbusVariable {
  var_name: string;
  relative_address?: number;
  register_type?: string;
  word_length?: number;
  data_type?: string;
  multiplier?: number;
  oid?: string;
  is_table?: number;
  total_row?: number;
  write_access?: number;
}

interface ModbusDevice {
  manufacturer: string;
  part_number: string;
  protocol: string;
  datasheet?: string;
  data: ModbusVariable[];
}

type ModbusData = Record<string, ModbusDevice[]>;

const DEVICE_TYPE_LABELS: Record<string, string> = {
  aircond: "Air Conditioner",
  pdu: "PDU",
  rectifier: "Rectifier",
  ups: "UPS",
  battery: "Battery",
  power_meter: "Power Meter",
  switch: "Switch",
  pfc: "PFC",
  Controller: "Controller",
  environment: "Environment",
  water: "Water",
  Sensor_RS485: "Sensor RS485",
  Breaker_Hongfa: "Breaker",
};

const DEVICE_TYPE_ICONS: Record<string, any> = {
  aircond: Wind,
  pdu: Server,
  rectifier: Zap,
  ups: Battery,
  battery: Battery,
  power_meter: Activity,
  switch: ToggleLeft,
  pfc: Zap,
  Controller: Cpu,
  environment: Thermometer,
  water: Droplets,
  Sensor_RS485: Radio,
  Breaker_Hongfa: ToggleLeft,
};

const DEVICE_TYPE_COLORS: Record<string, string> = {
  aircond: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  pdu: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
  rectifier: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  ups: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  battery: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  power_meter: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  switch: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  pfc: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  Controller: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  environment: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  water: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  Sensor_RS485: "bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-200",
  Breaker_Hongfa: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

const PROTOCOL_COLORS: Record<string, string> = {
  "Modbus RTU": "bg-blue-50 text-blue-700 border-blue-200",
  "Modbus TCP": "bg-indigo-50 text-indigo-700 border-indigo-200",
};

interface Props {
  data: ModbusData;
}

export function ModbusSection({ data }: Props) {
  const deviceTypes = Object.keys(data);
  const [activeType, setActiveType] = useState<string>(deviceTypes[0] || "");
  const [selectedDevice, setSelectedDevice] = useState<(ModbusDevice & { device_type: string }) | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);

  const currentDevices = (data[activeType] || []).map((d) => ({
    ...d,
    device_type: activeType,
  }));

  const totalDevices = Object.values(data).reduce((t, arr) => t + arr.length, 0);
  const totalVars = Object.values(data)
    .flat()
    .reduce((t, d) => t + d.data.length, 0);
  const protocols = [...new Set(Object.values(data).flat().map((d) => d.protocol))];

  const { sorted, handleSort } = useSortableTable(currentDevices);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(sorted, [
    "part_number", "manufacturer", "protocol",
  ]);

  const buildQRData = (device: ModbusDevice & { device_type: string }) => ({
    type: "modbus",
    partNumber: device.part_number,
    manufacturer: device.manufacturer,
    protocol: device.protocol,
    deviceType: DEVICE_TYPE_LABELS[device.device_type] || device.device_type,
    varCount: device.data.length,
    version: "1.0",
  });

  const handleCopyAddress = (val: string | number) => {
    navigator.clipboard.writeText(String(val));
    showToast.success("Address Copied", `Value ${val} copied to clipboard!`);
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Devices", value: totalDevices, icon: Cpu, desc: "All modbus devices" },
          { label: "Device Types", value: deviceTypes.length, icon: Activity, desc: "Categories" },
          { label: "Total Variables", value: totalVars.toLocaleString(), icon: Radio, desc: "All register vars" },
          { label: "Protocols", value: protocols.length, icon: Zap, desc: protocols.join(", ") },
        ].map((stat) => (
          <div key={stat.label} className="bg-card border rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Device Type Tabs */}
      <div className="flex flex-wrap gap-2">
        {deviceTypes.map((type) => {
          const Icon = DEVICE_TYPE_ICONS[type] || Cpu;
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => { setActiveType(type); setSearchQuery(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isActive
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-card border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {DEVICE_TYPE_LABELS[type] || type}
              <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-black ${isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted"
                }`}>
                {data[type].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {(() => {
              const Icon = DEVICE_TYPE_ICONS[activeType] || Cpu;
              return <Icon className="h-4 w-4 text-muted-foreground" />;
            })()}
            <h3 className="font-semibold">{DEVICE_TYPE_LABELS[activeType] || activeType}</h3>
            <Badge variant="secondary">{currentDevices.length} devices</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-48 h-9 text-sm"
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
              <TableHead className="cursor-pointer" onClick={() => handleSort("protocol")}>
                Protocol <ArrowUpDown className="inline ml-1 h-3 w-3" />
              </TableHead>
              <TableHead>Variables</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  No devices found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((device: any, index: number) => (
                <TableRow key={`${device.manufacturer}-${device.part_number}-${index}`}>
                  <TableCell className="font-medium">{device.part_number}</TableCell>
                  <TableCell>{device.manufacturer}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={PROTOCOL_COLORS[device.protocol] || ""}
                    >
                      {device.protocol}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80 focus:ring-2 focus:ring-ring transition-colors"
                      onClick={() => { setSelectedDevice(device); setShowDetailDialog(true); }}
                    >
                      {device.data?.length ?? 0} vars
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedDevice(device); setShowDetailDialog(true); }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" /> Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setSelectedDevice(device); setShowQRDialog(true); }}
                    >
                      <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedDevice?.part_number} — Register Map
            </DialogTitle>
            <DialogDescription>
              {selectedDevice?.manufacturer} · {selectedDevice?.protocol} ·{" "}
              {selectedDevice?.data.length} variables
            </DialogDescription>
          </DialogHeader>
          {selectedDevice && (
            <div className="bg-muted/40 rounded-lg border flex-1 overflow-auto min-h-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Variable Name</TableHead>
                    <TableHead className="text-xs">Address</TableHead>
                    <TableHead className="text-xs">Register Type</TableHead>
                    <TableHead className="text-xs">Data Type</TableHead>
                    <TableHead className="text-xs">Multiplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDevice.data.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-muted-foreground text-xs">{i + 1}</TableCell>
                      <TableCell className="font-mono text-xs text-blue-600 dark:text-blue-400">
                        {v.var_name}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {v.relative_address !== undefined ? (
                          <button
                            type="button"
                            className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-transparent hover:border-border hover:bg-muted transition-colors w-full text-left focus:outline-none max-w-[150px] sm:max-w-xs md:max-w-md lg:max-w-xl"
                            onClick={() => handleCopyAddress(v.relative_address!)}
                          >
                            <span className="truncate flex-1" title={String(v.relative_address)}>
                              {v.relative_address}
                            </span>
                            <Copy className="h-3 w-3 text-muted-foreground shrink-0" />
                          </button>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.register_type ? (
                          <Badge variant="outline" className="text-[10px]">{v.register_type}</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {v.data_type || "—"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {v.multiplier !== undefined && v.multiplier !== 1 ? `×${v.multiplier}` : "—"}
                      </TableCell>
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
                id={`qr-modbus-${selectedDevice.manufacturer}-${selectedDevice.part_number}`}
                data={buildQRData(selectedDevice)}
                label={selectedDevice.part_number}
                sublabel={`${selectedDevice.manufacturer} · ${selectedDevice.protocol}`}
              />
              <div className="bg-muted/50 rounded-lg p-3 border">
                <p className="text-xs font-semibold text-muted-foreground mb-2">QR Content:</p>
                <pre className="whitespace-pre-wrap break-all text-[10px] font-mono">
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
