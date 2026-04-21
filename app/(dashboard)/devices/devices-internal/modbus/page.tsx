"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  RotateCw,
  Server,
  ArrowUpDown,
  Cpu,
  Network,
  Layers,
  Edit2,
  Trash2,
  Plus,
  Search,
  MoreHorizontal,
  Settings,
  Copy,
  AlertTriangle,
  Download,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/lib/toast-utils";
import MqttStatus from "@/components/mqtt-status";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useMQTTStatus } from "@/hooks/useMQTTStatus";
import { useMqtt } from "@/contexts/MqttContext";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";

const ITEMS_PER_PAGE = 5;

interface DeviceProfile {
  name: string;
  device_type: string;
  manufacturer: string;
  part_number: string;
  topic: string;
  interval_publish: number;
  qos: number;
}

interface ProtocolSetting {
  protocol: string;
  address?: number;
  ip_address?: string;
  port?: string | number;
  baudrate?: number;
  parity?: string;
  bytesize?: number;
  stop_bit?: number;
  timeout?: number;
  endianness?: string;
}

interface Device {
  profile: DeviceProfile;
  protocol_setting: ProtocolSetting;
}

function ProtocolBadge({ protocol }: { protocol: string }) {
  return (
    <Badge
      variant="outline"
      className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-700"
    >
      {protocol}
    </Badge>
  );
}

export default function DeviceManagerPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceToUpdate, setDeviceToUpdate] = useState<string>("");

  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [alertDialogContent, setAlertDialogContent] = useState<{
    title: string;
    description: string;
  }>({ title: "", description: "" });

  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [confirmationDialogContent, setConfirmationDialogContent] = useState<{
    title: string;
    description: string;
    confirmAction: () => void;
  }>({ title: "", description: "", confirmAction: () => { } });

  const showAlert = (title: string, description: string) => {
    setAlertDialogContent({ title, description });
    setAlertDialogOpen(true);
  };

  const showConfirmation = (
    title: string,
    description: string,
    confirmAction: () => void,
  ) => {
    setConfirmationDialogContent({ title, description, confirmAction });
    setConfirmationDialogOpen(true);
  };

  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);
  const [manufacturers, setManufacturers] = useState<string[]>([]);
  const [partNumbers, setPartNumbers] = useState<string[]>([]);
  const [deviceLibraryLoading, setDeviceLibraryLoading] = useState(false);
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {
      name: "",
      device_type: "",
      manufacturer: "",
      part_number: "",
      topic: "",
      interval_publish: 60,
      qos: 1,
    },
    protocol_setting: {
      protocol: "Modbus RTU",
      address: 1,
      ip_address: "",
      port: "",
      baudrate: 9600,
      parity: "NONE",
      bytesize: 8,
      stop_bit: 1,
      timeout: 1000,
      endianness: "Little Endian",
    },
  });

  const status = useMQTTStatus();
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  const requestDeviceTypes = useCallback(() => {
    if (isReady) {
      setDeviceLibraryLoading(true);
      publish("command_device_selection", JSON.stringify({ command: "getDeviceTypes" }));
    }
  }, [isReady, publish]);

  const requestManufacturers = useCallback(
    (deviceType: string) => {
      if (isReady && deviceType) {
        setDeviceLibraryLoading(true);
        publish(
          "command_device_selection",
          JSON.stringify({ command: "getManufacturers", device_type: deviceType }),
        );
      }
    },
    [isReady, publish],
  );

  const requestPartNumbers = useCallback(
    (deviceType: string, manufacturer: string) => {
      if (isReady && deviceType && manufacturer) {
        setDeviceLibraryLoading(true);
        publish(
          "command_device_selection",
          JSON.stringify({ command: "getPartNumbers", device_type: deviceType, manufacturer }),
        );
      }
    },
    [isReady, publish],
  );

  const handleDeviceTypeChange = useCallback(
    (deviceType: string) => {
      setNewDevice((prev) => ({
        ...prev,
        profile: { ...prev.profile, device_type: deviceType, manufacturer: "", part_number: "" },
      }));
      setManufacturers([]);
      setPartNumbers([]);
      if (deviceType) requestManufacturers(deviceType);
    },
    [requestManufacturers],
  );

  const handleManufacturerChange = useCallback(
    (manufacturer: string) => {
      setNewDevice((prev) => ({
        ...prev,
        profile: { ...prev.profile, manufacturer, part_number: "" },
      }));
      setPartNumbers([]);
      if (manufacturer && newDevice.profile.device_type) {
        requestPartNumbers(newDevice.profile.device_type, manufacturer);
      }
    },
    [requestPartNumbers, newDevice.profile.device_type],
  );

  const handlePartNumberChange = useCallback((partNumber: string) => {
    setNewDevice((prev) => ({ ...prev, profile: { ...prev.profile, part_number: partNumber } }));
  }, []);

  const handleProtocolChange = useCallback((protocol: string) => {
    if (protocol === "Modbus RTU") {
      setNewDevice((prev: Device) => ({
        ...prev,
        protocol_setting: {
          protocol: "Modbus RTU",
          address: 1,
          port: "",
          baudrate: 9600,
          parity: "NONE",
          bytesize: 8,
          stop_bit: 1,
          timeout: 1000,
          endianness: "Little Endian",
        },
      }));
    }
  }, []);

  useEffect(() => {
    if (!isReady) {
      console.warn("MQTT not ready.");
      return;
    }

    const handleMessage = (topic: string, payload: string) => {
      if (topic !== "response_device_modbus" && topic !== "response_device_selection") return;

      try {
        const parsedPayload = JSON.parse(payload);

        if (topic === "response_device_selection") {
          setDeviceLibraryLoading(false);
          if (parsedPayload.status === "success") {
            const command = parsedPayload.message;
            if (command.includes("Device types")) setDeviceTypes(parsedPayload.data || []);
            else if (command.includes("Manufacturers")) setManufacturers(parsedPayload.data || []);
            else if (command.includes("Part numbers")) setPartNumbers(parsedPayload.data || []);
          } else {
            showToast.error("Device Library Error", parsedPayload.message);
          }
          return;
        }

        if (Array.isArray(parsedPayload)) {
          setDevices(parsedPayload);
        } else if (parsedPayload && typeof parsedPayload === "object" && parsedPayload.status) {
          if (parsedPayload.status === "success") {
            showToast.success("Success", parsedPayload.message || "Operation completed successfully");
            if (showDialog) setShowDialog(false);
            setTimeout(() => {
              publish("command_device_modbus", JSON.stringify({ command: "getDataModbus" }));
            }, 500);
          } else if (parsedPayload.status === "error") {
            showToast.error("Error", parsedPayload.message || "Operation failed");
          }
        }
      } catch (error) {
        console.error(
          "[MQTT] DeviceManagerPage: Invalid JSON or processing error:",
          error,
          "Raw payload:",
          payload,
        );
      }
    };

    subscribe("response_device_modbus", handleMessage);
    subscribe("response_device_selection", handleMessage);
    publish("command_device_modbus", JSON.stringify({ command: "getDataModbus" }));
    setTimeout(() => requestDeviceTypes(), 500);

    return () => {
      unsubscribe("response_device_modbus", handleMessage);
      unsubscribe("response_device_selection", handleMessage);
    };
  }, [isReady, publish, subscribe, unsubscribe, showDialog]);

  const handleSubmit = () => {
    showToast.info("Processing...", isUpdateMode ? "Updating device..." : "Adding device...");
    const command = JSON.stringify({
      command: isUpdateMode ? "updateDevice" : "addDevice",
      device: newDevice,
      ...(isUpdateMode && deviceToUpdate && { old_name: deviceToUpdate }),
    });
    publish("command_device_modbus", command);
    setShowDialog(false);
  };

  const handleEdit = (device: Device) => {
    setIsUpdateMode(true);
    setDeviceToUpdate(device.profile.name);
    setNewDevice({
      profile: {
        name: device.profile.name || "",
        device_type: device.profile.device_type || "",
        manufacturer: device.profile.manufacturer || "",
        part_number: device.profile.part_number || "",
        topic: device.profile.topic || "",
        interval_publish:
          typeof device.profile.interval_publish === "string"
            ? parseInt(device.profile.interval_publish)
            : device.profile.interval_publish || 60,
        qos:
          typeof device.profile.qos === "string"
            ? parseInt(device.profile.qos)
            : device.profile.qos || 1,
      },
      protocol_setting: {
        protocol: device.protocol_setting.protocol || "Modbus RTU",
        address:
          typeof device.protocol_setting.address === "string"
            ? parseInt(device.protocol_setting.address)
            : device.protocol_setting.address || 1,
        ip_address: device.protocol_setting.ip_address || "",
        port: device.protocol_setting.port || "",
        baudrate:
          typeof device.protocol_setting.baudrate === "string"
            ? parseInt(device.protocol_setting.baudrate)
            : device.protocol_setting.baudrate || 9600,
        parity: device.protocol_setting.parity || "NONE",
        bytesize:
          typeof device.protocol_setting.bytesize === "string"
            ? parseInt(device.protocol_setting.bytesize)
            : device.protocol_setting.bytesize || 8,
        stop_bit:
          typeof device.protocol_setting.stop_bit === "string"
            ? parseInt(device.protocol_setting.stop_bit)
            : device.protocol_setting.stop_bit || 1,
        timeout:
          typeof device.protocol_setting.timeout === "string"
            ? parseInt(device.protocol_setting.timeout)
            : device.protocol_setting.timeout || 1000,
        endianness: device.protocol_setting.endianness || "Little Endian",
      },
    });

    if (device.profile.device_type) {
      requestManufacturers(device.profile.device_type);
      if (device.profile.manufacturer) {
        setTimeout(
          () => requestPartNumbers(device.profile.device_type, device.profile.manufacturer),
          500,
        );
      }
    }
    setShowDialog(true);
  };

  const handleDelete = (name: string) => {
    showConfirmation(
      `Delete "${name}"?`,
      "This action cannot be undone. The device will be permanently removed.",
      () => {
        showToast.info("Deleting...", `Removing ${name}...`);
        publish("command_device_modbus", JSON.stringify({ command: "deleteDevice", name }));
      },
    );
  };

  const copyToClipboard = async (text: string | number, label: string) => {
    try {
      if (text !== undefined && text !== null) {
        await navigator.clipboard.writeText(text.toString());
        showToast.success("Copied!", `${label} copied to clipboard.`);
      }
    } catch (e) {
      showToast.error("Failed", "Could not copy to clipboard.");
    }
  };

  // Export: client-side dari devices state
  const handleExport = () => {
    if (devices.length === 0) {
      showToast.error("No Data", "No modbus devices to export.");
      return;
    }
    const payload = {
      smartrack_type: "MODBUS_DEVICES",
      version: "1.0",
      data: devices,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modbus-devices-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success("Exported", `${devices.length} device(s) exported.`);
  };

  // Import: baca JSON → publish importDevices via MQTT → middleware proses
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);
        const devicesToImport = Array.isArray(json)
          ? json
          : json.smartrack_type === "MODBUS_DEVICES" && Array.isArray(json.data)
          ? json.data
          : null;

        if (!devicesToImport) {
          showToast.error("Invalid Format", "File must be a modbus devices export.");
          return;
        }

        showToast.info("Importing...", `Sending ${devicesToImport.length} device(s) to middleware.`);
        publish(
          "command_device_modbus",
          JSON.stringify({ command: "importDevices", devices: devicesToImport, mode: "add_only" })
        );

        setTimeout(() => {
          publish("command_device_modbus", JSON.stringify({ command: "getDataModbus" }));
        }, 1000);
      } catch {
        showToast.error("Parse Error", "Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(devices);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(sorted, [
    "profile.name",
    "profile.part_number",
    "profile.topic",
    "protocol_setting.address",
    "protocol_setting.ip_address",
  ]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const nameCounts: Record<string, number> = {};
  const addrCounts: Record<string, number> = {};
  const ipCounts: Record<string, number> = {};

  devices.forEach((d) => {
    const nKey = d.profile?.name?.toLowerCase();
    const prot = d.protocol_setting?.protocol?.toLowerCase();
    const addrKey = d.protocol_setting?.address?.toString();
    const ipKey = d.protocol_setting?.ip_address?.toString().toLowerCase();

    if (nKey) nameCounts[nKey] = (nameCounts[nKey] || 0) + 1;
    if (prot === "modbus rtu" && addrKey) {
      addrCounts[addrKey] = (addrCounts[addrKey] || 0) + 1;
    }
  });

  const modbusCount = devices.filter(
    (d) => d.protocol_setting?.protocol?.toLowerCase() === "modbus rtu",
  ).length;
  const mostUsedProtocol = modbusCount > 0 ? "Modbus RTU" : "N/A";

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Modbus Devices</h2>
            <p className="text-xs text-muted-foreground">Manage serial and network protocol devices</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <MqttStatus />
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <Button variant="outline" size="sm" onClick={() => importInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              publish("command_device_modbus", JSON.stringify({ command: "getDataModbus" }))
            }
          >
            <RotateCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewDevice({
                profile: {
                  name: "",
                  device_type: "",
                  manufacturer: "",
                  part_number: "",
                  topic: "",
                  interval_publish: 60,
                  qos: 1,
                },
                protocol_setting: {
                  protocol: "Modbus RTU",
                  address: 1,
                  ip_address: "",
                  port: "",
                  baudrate: 9600,
                  parity: "NONE",
                  bytesize: 8,
                  stop_bit: 1,
                  timeout: 1000,
                  endianness: "Little Endian",
                },
              });
              setManufacturers([]);
              setPartNumbers([]);
              setDeviceToUpdate("");
              setIsUpdateMode(false);
              setShowDialog(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Device
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Devices
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <Cpu className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-3xl font-bold">{devices.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered devices</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Protocol Breakdown
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30">
              <Network className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm">Modbus RTU</span>
              </div>
              <Badge variant="secondary">{modbusCount}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Used Protocol
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <Layers className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold">{mostUsedProtocol}</div>
            <p className="text-xs text-muted-foreground mt-1">Dominant protocol type</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Device List</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name, PN, topic..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-60"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-10 pl-6 text-xs">#</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("profile.name")}
                >
                  <div className="flex items-center gap-1">
                    Device Name <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("profile.part_number")}
                >
                  <div className="flex items-center gap-1">
                    Part Number <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead>Protocol</TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("protocol_setting.address")}
                >
                  <div className="flex items-center gap-1">
                    Address / IP <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("profile.topic")}
                >
                  <div className="flex items-center gap-1">
                    Topic <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead className="text-right pr-6 text-xs w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedDevices.length > 0 ? (
                paginatedDevices.map((device, index) => {
                  const nKey = device.profile?.name?.toLowerCase();
                  const prot = device.protocol_setting?.protocol?.toLowerCase();
                  const addrKey = device.protocol_setting?.address?.toString();
                  const ipKey = device.protocol_setting?.ip_address?.toString().toLowerCase();

                  const hasNameConflict = nKey ? nameCounts[nKey] > 1 : false;

                  let hasAddressConflict = false;
                  if (prot === "modbus rtu" && addrKey) hasAddressConflict = addrCounts[addrKey] > 1;

                  return (
                    <TableRow
                      key={device.profile?.name || `device-${index}`}
                      className="hover:bg-muted/40 group"
                    >
                      <TableCell className="pl-6 text-muted-foreground font-mono text-xs">
                        {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{device.profile?.name}</p>
                            {hasNameConflict && (
                              <Badge variant="destructive" className="h-4 text-[9px] px-1 py-0 leading-none gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" /> Duplicate
                              </Badge>
                            )}
                          </div>
                          {device.profile?.manufacturer && (
                            <p className="text-xs text-muted-foreground">
                              {device.profile.manufacturer}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {device.profile?.part_number ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            {device.profile.part_number}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ProtocolBadge protocol={device.protocol_setting?.protocol} />
                      </TableCell>
                      <TableCell className="font-mono text-sm max-w-[140px]">
                        <div className="group/addr flex items-center gap-1.5 w-full">
                          <span className="truncate">
                            {device.protocol_setting?.protocol === "Modbus RTU"
                              ? device.protocol_setting?.address
                              : device.protocol_setting?.ip_address}
                          </span>
                          {hasAddressConflict && (
                            <Badge variant="destructive" className="h-4 text-[9px] px-1 py-0 leading-none" title="Address/IP is possibly duplicated">
                              Conflict
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 group-hover/addr:opacity-100 transition-opacity flex-shrink-0"
                            onClick={() => copyToClipboard(device.protocol_setting?.protocol === "Modbus RTU" ? (device.protocol_setting?.address || '') : (device.protocol_setting?.ip_address || ''), "Address/IP")}
                            title="Copy"
                          >
                            <Copy className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="group/topic flex items-center gap-1.5 w-full">
                          <span
                            className="text-xs text-muted-foreground truncate"
                            title={device.profile?.topic}
                          >
                            {device.profile?.topic}
                          </span>
                          {device.profile?.topic && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 opacity-0 group-hover/topic:opacity-100 transition-opacity flex-shrink-0"
                              onClick={() => copyToClipboard(device.profile?.topic, "Topic")}
                              title="Copy Topic"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleEdit(device)} className="text-xs cursor-pointer">
                              <Edit2 className="mr-2 h-4 w-4 text-blue-600" />
                              Edit Device
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => {
                              setNewDevice({
                                ...device,
                                profile: {
                                  ...device.profile,
                                  name: `${device.profile?.name}-copy`,
                                }
                              });
                              setDeviceToUpdate("");
                              setIsUpdateMode(false);
                              setShowDialog(true);
                            }}
                              className="text-xs cursor-pointer"
                            >
                              <Copy className="mr-2 h-4 w-4 text-emerald-600" />
                              Duplicate Device
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(device.profile?.name)}
                              className="text-xs text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20 cursor-pointer"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Device
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-36">
                    <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
                      <Settings className="h-12 w-12 opacity-20" />
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-medium">No devices configured</p>
                        <p className="text-xs">
                          Add a new internal device to start monitoring
                        </p>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="border-t px-6 py-3">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                      href="#"
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        href="#"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                      href="#"
                      aria-disabled={currentPage === totalPages}
                      className={
                        currentPage === totalPages ? "pointer-events-none opacity-50" : ""
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Device Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              {isUpdateMode ? `Edit Device — ${deviceToUpdate}` : "Add New Device"}
            </DialogTitle>
            <DialogDescription>
              {isUpdateMode
                ? "Modify the device profile and protocol settings below."
                : "Configure a new Modbus RTU device."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── Device Profile ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  Device Profile
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="deviceName">
                    Device Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="deviceName"
                    value={newDevice.profile.name}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        profile: { ...newDevice.profile, name: e.target.value },
                      })
                    }
                    placeholder="e.g., PDU-Rack-01"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="deviceType">Device Type</Label>
                  <SearchableSelect
                    options={deviceTypes.map(type => ({ label: type, value: type }))}
                    value={newDevice.profile.device_type || ""}
                    onValueChange={handleDeviceTypeChange}
                    placeholder={deviceLibraryLoading ? "Loading..." : "Select device type"}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="manufacturer">Manufacturer</Label>
                  <SearchableSelect
                    options={manufacturers.map(m => ({ label: m, value: m }))}
                    value={newDevice.profile.manufacturer || ""}
                    onValueChange={handleManufacturerChange}
                    disabled={!newDevice.profile.device_type || deviceLibraryLoading}
                    placeholder={
                      !newDevice.profile.device_type
                        ? "Select device type first"
                        : deviceLibraryLoading
                          ? "Loading..."
                          : "Select manufacturer"
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="partNumber">
                    Part Number <span className="text-destructive">*</span>
                  </Label>
                  <SearchableSelect
                    options={partNumbers.map(pn => ({ label: pn, value: pn }))}
                    value={newDevice.profile.part_number || ""}
                    onValueChange={handlePartNumberChange}
                    disabled={!newDevice.profile.manufacturer || deviceLibraryLoading}
                    placeholder={
                      !newDevice.profile.manufacturer
                        ? "Select manufacturer first"
                        : deviceLibraryLoading
                          ? "Loading..."
                          : "Select part number"
                    }
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="topic">
                    MQTT Topic Payload (Optional)
                  </Label>
                  <div className="relative group">
                    <Input
                      id="topic"
                      value={newDevice.profile.topic}
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          profile: { ...newDevice.profile, topic: e.target.value },
                        })
                      }
                      placeholder="e.g., TBGPower/POCGSPE/parameters"
                      className="mt-1 font-mono text-xs pr-10"
                    />
                    {newDevice.profile.topic && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1.5 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => copyToClipboard(newDevice.profile.topic, "Topic")}
                        title="Copy Topic"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
                    Leave blank for default.
                  </p>
                </div>

                <div>
                  <Label htmlFor="intervalPublish">Publish Interval (seconds)</Label>
                  <Input
                    id="intervalPublish"
                    type="number"
                    value={newDevice.profile.interval_publish}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        profile: {
                          ...newDevice.profile,
                          interval_publish: parseInt(e.target.value) || 60,
                        },
                      })
                    }
                    placeholder="60"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="qos">QoS Level</Label>
                  <Select
                    value={newDevice.profile.qos?.toString() || ""}
                    onValueChange={(value) =>
                      setNewDevice({
                        ...newDevice,
                        profile: { ...newDevice.profile, qos: parseInt(value) },
                      })
                    }
                  >
                    <SelectTrigger id="qos" className="mt-1">
                      <SelectValue placeholder="Select QoS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 — At most once</SelectItem>
                      <SelectItem value="1">1 — At least once</SelectItem>
                      <SelectItem value="2">2 — Exactly once</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* ── Protocol Settings ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  Protocol Settings
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="protocol">
                    Protocol <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={newDevice.protocol_setting.protocol}
                    onValueChange={handleProtocolChange}
                  >
                    <SelectTrigger id="protocol" className="mt-1 sm:w-1/2">
                      <SelectValue placeholder="Select protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Modbus RTU">Modbus RTU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Modbus RTU Fields */}
                {newDevice.protocol_setting.protocol === "Modbus RTU" && (
                  <>
                    <div>
                      <Label htmlFor="address">
                        Modbus Address <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="address"
                        type="number"
                        value={newDevice.protocol_setting.address}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              address: parseInt(e.target.value) || 0,
                            },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="port">
                        Serial Port <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={newDevice.protocol_setting.port?.toString() || ""}
                        onValueChange={(value) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: { ...newDevice.protocol_setting, port: value },
                          })
                        }
                      >
                        <SelectTrigger id="port" className="mt-1">
                          <SelectValue placeholder="Select port" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="/dev/ttyUSB0">/dev/ttyUSB0</SelectItem>
                          <SelectItem value="/dev/ttyAMA0">/dev/ttyAMA0</SelectItem>
                          <SelectItem value="/dev/ttyAMA1">/dev/ttyAMA1</SelectItem>
                          <SelectItem value="/dev/ttyAMA2">/dev/ttyAMA2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="baudrate">
                        Baud Rate <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={newDevice.protocol_setting.baudrate?.toString() || ""}
                        onValueChange={(value) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              baudrate: parseInt(value),
                            },
                          })
                        }
                      >
                        <SelectTrigger id="baudrate" className="mt-1">
                          <SelectValue placeholder="Select baud rate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="9600">9600</SelectItem>
                          <SelectItem value="19200">19200</SelectItem>
                          <SelectItem value="38400">38400</SelectItem>
                          <SelectItem value="57600">57600</SelectItem>
                          <SelectItem value="115200">115200</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="parity">Parity</Label>
                      <Select
                        value={newDevice.protocol_setting.parity}
                        onValueChange={(value) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: { ...newDevice.protocol_setting, parity: value },
                          })
                        }
                      >
                        <SelectTrigger id="parity" className="mt-1">
                          <SelectValue placeholder="Select parity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NONE">None</SelectItem>
                          <SelectItem value="EVEN">Even</SelectItem>
                          <SelectItem value="ODD">Odd</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="bytesize">Byte Size</Label>
                      <Input
                        id="bytesize"
                        type="number"
                        value={newDevice.protocol_setting.bytesize}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              bytesize: parseInt(e.target.value) || 8,
                            },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stopBit">Stop Bit</Label>
                      <Input
                        id="stopBit"
                        type="number"
                        value={newDevice.protocol_setting.stop_bit}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              stop_bit: parseInt(e.target.value) || 1,
                            },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeout">Timeout (ms)</Label>
                      <Input
                        id="timeout"
                        type="number"
                        value={newDevice.protocol_setting.timeout}
                        onChange={(e) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              timeout: parseInt(e.target.value) || 1000,
                            },
                          })
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endianness">Endianness</Label>
                      <Select
                        value={newDevice.protocol_setting.endianness}
                        onValueChange={(value) =>
                          setNewDevice({
                            ...newDevice,
                            protocol_setting: {
                              ...newDevice.protocol_setting,
                              endianness: value,
                            },
                          })
                        }
                      >
                        <SelectTrigger id="endianness" className="mt-1">
                          <SelectValue placeholder="Select endianness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Little Endian">Little Endian</SelectItem>
                          <SelectItem value="Big Endian">Big Endian</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {isUpdateMode ? "Save Changes" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog */}
      <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{alertDialogContent.title}</AlertDialogTitle>
            <AlertDialogDescription>{alertDialogContent.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertDialogOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        type="destructive"
        title={confirmationDialogContent.title}
        description={confirmationDialogContent.description}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmationDialogContent.confirmAction}
        onCancel={() => setConfirmationDialogOpen(false)}
      />
    </div>
  );
}
