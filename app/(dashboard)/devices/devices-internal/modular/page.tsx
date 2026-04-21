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
} from "@/components/ui/dialog";
import {
  RotateCw,
  Cpu,
  ArrowUpDown,
  Microchip,
  LayoutGrid,
  Trash2,
  Plus,
  Search,
  Settings,
  MoreHorizontal,
  Edit2,
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
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import MqttStatus from "@/components/mqtt-status";
import { useMqtt } from "@/contexts/MqttContext";
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
import ScanAddressDialog from "@/components/ScanAddressDialog";

const ITEMS_PER_PAGE = 5;

interface Device {
  profile: {
    name: string;
    device_type: string;
    manufacturer: string;
    part_number: string;
    topic: string;
  };
  protocol_setting: {
    protocol: string;
    address: number;
    device_bus: number;
  };
}

export default function DeviceManagerPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceToUpdate, setDeviceToUpdate] = useState<string>("");
  const [newDevice, setNewDevice] = useState<Device>({
    profile: {
      name: "",
      device_type: "Modular",
      manufacturer: "IOT",
      part_number: "",
      topic: "",
    },
    protocol_setting: {
      protocol: "Modular",
      address: 0,
      device_bus: 0,
    },
  });

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

  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  const requestDeviceTypes = useCallback(() => {
    if (isReady) {
      publish(
        "command_i2c_device_selection",
        JSON.stringify({ command: "getDeviceTypes" }),
      );
    }
  }, [isReady, publish]);

  const requestManufacturers = useCallback(
    (deviceType: string) => {
      if (isReady && deviceType) {
        publish(
          "command_i2c_device_selection",
          JSON.stringify({ command: "getManufacturers", device_type: deviceType }),
        );
      }
    },
    [isReady, publish],
  );

  const requestPartNumbers = useCallback(
    (deviceType: string, manufacturer: string) => {
      if (isReady && deviceType && manufacturer) {
        publish(
          "command_i2c_device_selection",
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

  useEffect(() => {
    if (!isReady) {
      console.warn("MQTT not ready.");
      return;
    }

    const handleMessage = (topic: string, payload: string) => {
      try {
        const parsedPayload = JSON.parse(payload);

        if (topic === "response_device_i2c") {
          if (Array.isArray(parsedPayload)) {
            setDevices(parsedPayload);
          } else if (parsedPayload && typeof parsedPayload === "object" && parsedPayload.status) {
            if (parsedPayload.status === "success") {
              showToast.success("Success", parsedPayload.message || "Operation completed successfully");
              setTimeout(() => {
                publish("command_device_i2c", JSON.stringify({ command: "getDataI2C" }));
              }, 500);
            } else if (parsedPayload.status === "error") {
              showToast.error("Error", parsedPayload.message || "Operation failed");
            }
          }
        } else if (topic === "response_i2c_device_selection") {
          if (parsedPayload.status === "success" && parsedPayload.data) {
            if (parsedPayload.command === "getDeviceTypes") {
              setDeviceTypes(parsedPayload.data || []);
            } else if (parsedPayload.command === "getManufacturers") {
              setManufacturers(parsedPayload.data || []);
            } else if (parsedPayload.command === "getPartNumbers") {
              setPartNumbers(parsedPayload.data || []);
            }
          } else if (parsedPayload.status === "error") {
            showToast.error("Error", parsedPayload.message || "Failed to load device data");
          }
        }
      } catch (error) {
        console.error(
          `[MQTT] DeviceManagerPage (I2C): Invalid JSON from topic '${topic}':`,
          error,
          "Raw payload:",
          payload,
        );
      }
    };

    subscribe("response_device_i2c", handleMessage);
    subscribe("response_i2c_device_selection", handleMessage);
    publish("command_device_i2c", JSON.stringify({ command: "getDataI2C" }));
    requestDeviceTypes();

    return () => {
      unsubscribe("response_device_i2c", handleMessage);
      unsubscribe("response_i2c_device_selection", handleMessage);
    };
  }, [isReady, publish, subscribe, unsubscribe, requestDeviceTypes]);

  const handleSubmit = () => {
    const deviceToSend = {
      ...newDevice,
      protocol_setting: {
        ...newDevice.protocol_setting,
        protocol: "Modular",
        address: parseInt(newDevice.protocol_setting.address.toString()) || 0,
        device_bus: parseInt(newDevice.protocol_setting.device_bus.toString()) || 0,
      },
    };

    const command = JSON.stringify({
      command: isUpdateMode ? "updateDevice" : "addDevice",
      device: deviceToSend,
      ...(isUpdateMode && deviceToUpdate && { old_name: deviceToUpdate }),
    });

    showToast.info("Processing...", isUpdateMode ? "Updating device..." : "Adding device...");

    publish("command_device_i2c", command);
    setShowDialog(false);
  };

  const handleDelete = (name: string) => {
    showConfirmation(
      `Delete "${name}"?`,
      "This action cannot be undone. The device will be permanently removed.",
      () => {
        showToast.info("Deleting...", `Removing ${name}...`);
        publish("command_device_i2c", JSON.stringify({ command: "deleteDevice", name }));
      },
    );
  };

  const handleSelectScannedAddress = (address: string) => {
    setNewDevice((prev: Device) => ({
      ...prev,
      protocol_setting: {
        ...prev.protocol_setting,
        address: parseInt(address) || 0,
      },
    }));
  };

  // Export: client-side, ambil dari state devices langsung
  const handleExport = () => {
    if (devices.length === 0) {
      showToast.error("No Data", "No modular devices to export.");
      return;
    }
    const payload = {
      smartrack_type: "MODULAR_DEVICES",
      version: "1.0",
      data: devices,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `modular-devices-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast.success("Exported", `${devices.length} device(s) exported.`);
  };

  // Import: baca JSON → publish importDevices via MQTT → middleware yang proses
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const json = JSON.parse(ev.target?.result as string);

        // Support raw array atau format smartrack_type
        const devicesToImport = Array.isArray(json)
          ? json
          : json.smartrack_type === "MODULAR_DEVICES" && Array.isArray(json.data)
          ? json.data
          : null;

        if (!devicesToImport) {
          showToast.error("Invalid Format", "File must be a modular devices export.");
          return;
        }

        showToast.info("Importing...", `Sending ${devicesToImport.length} device(s) to middleware.`);
        publish(
          "command_device_i2c",
          JSON.stringify({ command: "importDevices", devices: devicesToImport, mode: "add_only" })
        );

        // Refresh setelah jeda singkat untuk beri waktu middleware proses
        setTimeout(() => {
          publish("command_device_i2c", JSON.stringify({ command: "getDataI2C" }));
        }, 1000);
      } catch {
        showToast.error("Parse Error", "Invalid JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (text) {
        await navigator.clipboard.writeText(text);
        showToast.success("Copied!", `${label} copied to clipboard.`);
      }
    } catch (e) {
      showToast.error("Failed", "Could not copy to clipboard.");
    }
  };

  const { sorted, sortField, sortDirection, handleSort } = useSortableTable(devices);
  const { searchQuery, setSearchQuery, filteredData } = useSearchFilter(sorted, [
    "profile.name",
    "profile.part_number",
    "profile.topic",
    "protocol_setting.address",
    "protocol_setting.device_bus",
  ]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedDevices = filteredData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const nameCounts: Record<string, number> = {};
  const addrCounts: Record<string, number> = {};

  devices.forEach((d) => {
    const nKey = d.profile?.name?.toLowerCase();
    const aKey = `${d.protocol_setting?.device_bus}_${d.protocol_setting?.address}`;
    if (nKey) nameCounts[nKey] = (nameCounts[nKey] || 0) + 1;
    if (aKey) addrCounts[aKey] = (addrCounts[aKey] || 0) + 1;
  });

  const deviceTypeBreakdown = devices.reduce(
    (acc: { [key: string]: number }, device) => {
      const type = device.profile?.part_number || "Unknown";
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    },
    {},
  );

  const topPartNumber = (() => {
    const counts: { [key: string]: number } = {};
    devices.forEach((d) => {
      const type = d.profile?.part_number || "Unknown";
      counts[type] = (counts[type] || 0) + 1;
    });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    return top ? `${top[0]} (${top[1]})` : "N/A";
  })();

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <Cpu className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Modular Devices</h2>
            <p className="text-xs text-muted-foreground">Manage I2C bus modular sensor devices</p>
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
              publish("command_device_i2c", JSON.stringify({ command: "getDataI2C" }))
            }
          >
            <RotateCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setNewDevice({
                profile: { name: "", device_type: "", manufacturer: "", part_number: "", topic: "" },
                protocol_setting: { protocol: "Modular", address: 0, device_bus: 0 },
              });
              setDeviceTypes([]);
              setManufacturers([]);
              setPartNumbers([]);
              requestDeviceTypes();
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
              <Microchip className="h-4 w-4 text-emerald-600" />
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
              Part Number Breakdown
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/30">
              <LayoutGrid className="h-4 w-4 text-teal-600" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {Object.keys(deviceTypeBreakdown).length > 0 ? (
              <div className="space-y-1.5">
                {Object.entries(deviceTypeBreakdown)
                  .slice(0, 3)
                  .map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                        {type}
                      </span>
                      <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                        {String(count)}
                      </Badge>
                    </div>
                  ))}
                {Object.keys(deviceTypeBreakdown).length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{Object.keys(deviceTypeBreakdown).length - 3} more
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No devices yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Most Common Type
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/30">
              <Badge variant="secondary" className="text-xs px-1.5">
                Top
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-lg font-bold leading-tight break-words">{topPartNumber}</div>
            <p className="text-xs text-muted-foreground mt-1">By part number count</p>
          </CardContent>
        </Card>
      </div>

      {/* Device List */}
      <Card>
        <CardHeader className="px-6 py-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">Device List</CardTitle>
              <ScanAddressDialog onSelectAddress={handleSelectScannedAddress} />
            </div>
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
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("protocol_setting.address")}
                >
                  <div className="flex items-center gap-1">
                    I2C Address <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:text-foreground"
                  onClick={() => handleSort("protocol_setting.device_bus")}
                >
                  <div className="flex items-center gap-1">
                    Bus <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
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
                  const aKey = `${device.protocol_setting?.device_bus}_${device.protocol_setting?.address}`;
                  const hasNameConflict = nKey ? nameCounts[nKey] > 1 : false;
                  const hasAddressConflict = aKey && device.protocol_setting?.address !== undefined ? addrCounts[aKey] > 1 : false;

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
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm bg-muted/50 px-1.5 py-0.5 rounded text-xs tabular-nums">
                            0x{device.protocol_setting?.address?.toString(16).toUpperCase().padStart(2, "0")} <span className="text-muted-foreground ml-1">({device.protocol_setting?.address})</span>
                          </span>
                          {hasAddressConflict && (
                            <Badge variant="destructive" className="h-4 text-[9px] px-1 py-0 leading-none" title="Address/Bus combination is duplicated">
                              Conflict
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="text-xs font-mono border-muted-foreground/30"
                        >
                          Bus {device.protocol_setting?.device_bus}
                        </Badge>
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
                              className="h-5 w-5 opacity-0 group-hover/topic:opacity-100 transition-opacity"
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
                            <DropdownMenuItem onClick={() => {
                              setNewDevice(device);
                              setDeviceToUpdate(device.profile?.name);
                              setIsUpdateMode(true);
                              setShowDialog(true);
                            }}
                              className="text-xs cursor-pointer"
                            >
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
                          Add a new modular device to start monitoring
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

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Microchip className="h-5 w-5 text-primary" />
              {isUpdateMode ? `Edit Device — ${deviceToUpdate}` : "Add New Modular Device"}
            </DialogTitle>
            <DialogDescription>
              {isUpdateMode
                ? "Modify the device configuration below."
                : "Configure a new I2C modular device."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* ── Device Information ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  Device Information
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div>
                <Label htmlFor="deviceName">
                  Device Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="deviceName"
                  placeholder="e.g., Temp-Sensor-Rack-01"
                  value={newDevice.profile.name}
                  onChange={(e) =>
                    setNewDevice({
                      ...newDevice,
                      profile: { ...newDevice.profile, name: e.target.value },
                    })
                  }
                  className="mt-1"
                />
              </div>
            </div>

            {/* ── Device Selection ── */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                  Device Selection
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="deviceType">
                    Device Type <span className="text-destructive">*</span>
                  </Label>
                  <SearchableSelect
                    options={deviceTypes.map(type => ({ label: type, value: type }))}
                    value={newDevice.profile.device_type}
                    onValueChange={handleDeviceTypeChange}
                    placeholder={deviceTypes.length > 0 ? "Select device type" : "Loading device types..."}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">
                    Manufacturer <span className="text-destructive">*</span>
                  </Label>
                  <SearchableSelect
                    options={manufacturers.map(m => ({ label: m, value: m }))}
                    value={newDevice.profile.manufacturer}
                    onValueChange={handleManufacturerChange}
                    disabled={!newDevice.profile.device_type}
                    placeholder={
                      manufacturers.length > 0
                        ? "Select manufacturer"
                        : newDevice.profile.device_type
                          ? "Loading manufacturers..."
                          : "Select device type first"
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
                    value={newDevice.profile.part_number}
                    onValueChange={handlePartNumberChange}
                    disabled={!newDevice.profile.manufacturer}
                    placeholder={
                      partNumbers.length > 0
                        ? "Select part number"
                        : newDevice.profile.manufacturer
                          ? "Loading part numbers..."
                          : "Select manufacturer first"
                    }
                    className="mt-1"
                  />
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
                <div>
                  <Label htmlFor="i2cAddress">
                    I2C Address (Decimal) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="i2cAddress"
                      type="number"
                      placeholder="e.g., 39"
                      value={newDevice.protocol_setting.address || ""}
                      onChange={(e) =>
                        setNewDevice({
                          ...newDevice,
                          protocol_setting: {
                            ...newDevice.protocol_setting,
                            address: parseInt(e.target.value) || 0,
                          },
                        })
                      }
                      className="mt-1 font-mono pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded opacity-70 mt-0.5">
                      0x{newDevice.protocol_setting.address?.toString(16).toUpperCase().padStart(2, "0")}
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="deviceBus">Device Bus</Label>
                  <Select
                    value={String(newDevice.protocol_setting.device_bus)}
                    onValueChange={(val) =>
                      setNewDevice({
                        ...newDevice,
                        protocol_setting: {
                          ...newDevice.protocol_setting,
                          device_bus: parseInt(val),
                        },
                      })
                    }
                  >
                    <SelectTrigger id="deviceBus" className="mt-1 font-mono">
                      <SelectValue placeholder="Select Bus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Bus 1</SelectItem>
                      <SelectItem value="3">Bus 3</SelectItem>
                      <SelectItem value="4">Bus 4</SelectItem>
                      <SelectItem value="5">Bus 5</SelectItem>
                      <SelectItem value="6">Bus 6</SelectItem>
                      <SelectItem value="7">Bus 7</SelectItem>
                      <SelectItem value="8">Bus 8</SelectItem>
                      <SelectItem value="9">Bus 9</SelectItem>
                      <SelectItem value="10">Bus 10</SelectItem>
                      <SelectItem value="11">Bus 11</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="mqttTopic">MQTT Topic Payload (Optional)</Label>
                <div className="relative group">
                  <Input
                    id="mqttTopic"
                    placeholder="e.g., NEW_TOPIC/..."
                    value={newDevice.profile.topic}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        profile: { ...newDevice.profile, topic: e.target.value },
                      })
                    }
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
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  Leaving it blank will auto-generate according to Node config
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button onClick={handleSubmit} className="flex-1">
                {isUpdateMode ? "Save Changes" : "Add Device"}
              </Button>
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
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
