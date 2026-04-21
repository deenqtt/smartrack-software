"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Settings,
  Trash2,
  MapPin,
  Monitor,
  Server,
  RadioTower,
  Database,
  Activity,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Star,
  Edit,
  ArrowRightLeft,
  AlertTriangle,
  Info,
  LayoutGrid,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface Device {
  id: string;
  name: string;
  serialNumber: string;
  connectionType: "adms" | "sdk" | "http" | "tcp" | "ip";
  ipAddress: string;
  port: number;
  status: "online" | "offline" | "connecting" | "error";
  lastSeen?: string;
  location?: string;
  isMaster?: boolean;
  createdAt: string;
}

export default function DevicesTab() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogMode, setDialogMode] = useState<
    "master" | "slave" | "edit" | null
  >(null);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [switchMasterDialogOpen, setSwitchMasterDialogOpen] = useState(false);
  const [selectedSlaveForMaster, setSelectedSlaveForMaster] =
    useState<Device | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    serialNumber: "",
    connectionType: "adms" as Device["connectionType"],
    ipAddress: "",
    port: 4370,
    isMaster: false,
  });

  const loadDevices = async () => {
    setLoading(true);
    try {
      // Using relative path via Next.js proxy if available, else direct
      const response = await fetch("/api/zkteco/devices");
      if (response.ok) {
        const data = await response.json();
        setDevices(data.devices || []);
      } else {
        setDevices([]);
        toast.error("Could not load devices. Is the server running?");
      }
    } catch (error) {
      console.error("Error loading devices:", error);
      setDevices([]);
      toast.error("Failed to fetch devices. Check server connection.");
    } finally {
      setLoading(false);
    }
  };

  const addDevice = async () => {
    if (!dialogMode) return;
    try {
      const response = await fetch("/api/zkteco/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        await loadDevices();
        setDialogMode(null);
        resetForm();
        toast.success(result.message || "Device added successfully!");
      } else {
        toast.error(result.error || "Failed to add device");
      }
    } catch (error) {
      console.error("Error adding device:", error);
      toast.error("Error adding device");
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!confirm("Are you sure you want to remove this device?")) return;
    try {
      const response = await fetch(`/api/zkteco/devices/${deviceId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (response.ok) {
        await loadDevices();
        toast.success(result.message || "Device removed successfully!");
      } else {
        toast.error(result.error || "Failed to remove device");
      }
    } catch (error) {
      console.error("Error removing device:", error);
      toast.error("Error removing device");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      serialNumber: "",
      connectionType: "adms",
      ipAddress: "",
      port: 4370,
      isMaster: false,
    });
    setEditingDevice(null);
  };

  const handleOpenDialog = (mode: "master" | "slave") => {
    resetForm();
    if (mode === "slave") {
      setFormData((prev) => ({
        ...prev,
        connectionType: "sdk",
        port: 4370,
        serialNumber: `SDK-${uuidv4()}`,
        isMaster: false,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        connectionType: "adms",
        port: 4370,
        serialNumber: "",
        isMaster: true,
      }));
    }
    setDialogMode(mode);
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      serialNumber: device.serialNumber,
      connectionType: device.connectionType,
      ipAddress: device.ipAddress,
      port: device.port,
      isMaster: device.isMaster || false,
    });
    setDialogMode("edit");
  };

  const updateDevice = async () => {
    if (!editingDevice) return;
    try {
      const response = await fetch(`/api/zkteco/devices/${editingDevice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (response.ok) {
        await loadDevices();
        setDialogMode(null);
        resetForm();
        toast.success(result.message || "Device updated successfully!");
      } else {
        toast.error(result.error || "Failed to update device");
      }
    } catch (error) {
      console.error("Error updating device:", error);
      toast.error("Error updating device");
    }
  };

  const handleSwitchMaster = async (slaveDevice: Device) => {
    setSelectedSlaveForMaster(slaveDevice);
    setSwitchMasterDialogOpen(true);
  };

  const confirmSwitchMaster = async () => {
    if (!selectedSlaveForMaster) return;
    try {
      const response = await fetch(
        `/api/zkteco/devices/${selectedSlaveForMaster.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isMaster: true }),
        },
      );

      const result = await response.json();
      if (response.ok) {
        await loadDevices();
        setSwitchMasterDialogOpen(false);
        setSelectedSlaveForMaster(null);
        toast.success(
          `Successfully switched Master to ${selectedSlaveForMaster.name}`,
        );
      } else {
        toast.error(result.error || "Failed to switch master device");
      }
    } catch (error) {
      console.error("Error switching master:", error);
      toast.error("Error switching master device");
    }
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.serialNumber.includes(searchTerm) ||
      device.ipAddress.includes(searchTerm),
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "online":
        return (
          <div className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/10">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            ONLINE
          </div>
        );
      case "offline":
        return (
          <div className="inline-flex items-center gap-1.5 bg-gray-500/10 text-gray-500 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-gray-500/10">
            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
            OFFLINE
          </div>
        );
      default:
        return (
          <div className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-500/10">
            <RefreshCw className="w-3 h-3 animate-spin" />
            {status?.toUpperCase() || "UNKNOWN"}
          </div>
        );
    }
  };

  const masterDevice = filteredDevices.find((d) => d.isMaster);
  const slaveDevices = filteredDevices.filter((d) => !d.isMaster);

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className=" space-y-6 animate-in fade-in duration-500">
      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-blue-500/10 rounded-lg">
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Total Assets
            </p>
            <p className="text-xl font-bold leading-none">{devices.length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-green-500/10 rounded-lg">
            <Server className="w-5 h-5 text-green-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Master Unit
            </p>
            <p
              className={`text-xl font-bold leading-none ${masterDevice ? "text-green-500" : "text-destructive"}`}
            >
              {masterDevice ? "ONLINE" : "NONE"}
            </p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-orange-500/10 rounded-lg">
            <RadioTower className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Slave Units
            </p>
            <p className="text-xl font-bold leading-none">
              {slaveDevices.length}
            </p>
          </div>
        </div>
        <div className="bg-card border rounded-xl p-4 flex items-center gap-4">
          <div className="p-2.5 bg-indigo-500/10 rounded-lg">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">
              Security
            </p>
            <p className="text-xl font-bold leading-none text-indigo-500">
              ACTIVE
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-card border rounded-xl p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder="Search by name, SN, or IP..."
              className="w-full bg-background border h-10 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <Dialog
            open={!!dialogMode}
            onOpenChange={(open) => !open && setDialogMode(null)}
          >
            {!masterDevice ? (
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog("master")}
                  className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-2 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ADD MASTER
                </Button>
              </DialogTrigger>
            ) : (
              <DialogTrigger asChild>
                <Button
                  onClick={() => handleOpenDialog("slave")}
                  className="h-10 px-4 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-xs gap-2 shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5" />
                  ADD SLAVE
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px] rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {dialogMode === "edit"
                    ? "Update Device"
                    : `Add ${dialogMode === "master" ? "Master" : "Slave"} Device`}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Provide terminal details to register it within the network.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-5 py-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Device Name
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="h-11 font-medium"
                    placeholder="Main Entrance Terminal"
                    required
                  />
                </div>
                {(dialogMode === "master" || dialogMode === "edit") && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Serial Number
                    </label>
                    <Input
                      value={formData.serialNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          serialNumber: e.target.value,
                        })
                      }
                      className="h-11 font-mono"
                      placeholder="ZAM2300001"
                      required
                    />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      IP Address
                    </label>
                    <Input
                      value={formData.ipAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, ipAddress: e.target.value })
                      }
                      className="h-11 font-mono"
                      placeholder="192.168.1.10"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                      Network Port
                    </label>
                    <Input
                      type="number"
                      value={formData.port}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          port: parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-11 font-mono"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Protocol Type
                  </label>
                  <Select
                    value={formData.connectionType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, connectionType: value as any })
                    }
                  >
                    <SelectTrigger className="h-11 font-medium">
                      <SelectValue placeholder="Select protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="adms">ADMS (Push Protocol)</SelectItem>
                      <SelectItem value="sdk">SDK (Legacy/TCP)</SelectItem>
                      <SelectItem value="tcp">Raw TCP</SelectItem>
                      <SelectItem value="http">HTTP Gateway</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={dialogMode === "edit" ? updateDevice : addDevice}
                  className="w-full h-11 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                >
                  {dialogMode === "edit"
                    ? "Update Terminal"
                    : "Register Terminal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            onClick={loadDevices}
            disabled={loading}
            variant="outline"
            className="h-10 px-4 gap-2 text-xs font-bold border-border hover:bg-muted transition-all"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            REFRESH
          </Button>
        </div>
      </div>

      {/* Tables Section */}
      <div className="space-y-6">
        {/* Master Device Section */}
        {masterDevice && (
          <div className="animate-in slide-in-from-bottom-2 duration-400">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Server className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-widest">
                Master Infrastructure
              </h2>
            </div>
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-16 text-[10px] font-bold uppercase tracking-wider">
                      Node
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                      Terminal Name
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                      Protocol
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                      Network Address
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                      Operational Status
                    </TableHead>
                    <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="group">
                    <TableCell className="font-mono text-[10px] text-muted-foreground/60">
                      #MASTER
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold leading-tight">
                            {masterDevice.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                            {masterDevice.serialNumber}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-blue-500/10">
                        <Database className="w-3 h-3" />
                        {masterDevice.connectionType}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] font-bold tracking-tight text-primary">
                      {masterDevice.connectionType === "adms"
                        ? "/iclock/cdata"
                        : `${masterDevice.ipAddress}:${masterDevice.port}`}
                    </TableCell>
                    <TableCell>{getStatusBadge(masterDevice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={() => handleEditDevice(masterDevice)}
                          title="Edit Configuration"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                          onClick={() => deleteDevice(masterDevice.id)}
                          title="Remove Terminal"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Slave Devices Section */}
        <div className="animate-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <RadioTower className="h-4 w-4 text-orange-500" />
              <h2 className="text-xs font-black uppercase tracking-widest">
                Network Slaves
              </h2>
              <Badge
                variant="secondary"
                className="bg-orange-500/10 text-orange-600 border-orange-500/10 text-[9px] h-4 min-w-[1.25rem] flex items-center justify-center p-0"
              >
                {slaveDevices.length}
              </Badge>
            </div>
            {searchTerm && (
              <p className="text-[10px] text-muted-foreground font-medium italic">
                Filtered view active...
              </p>
            )}
          </div>
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-16 text-[10px] font-bold uppercase tracking-wider">
                    Node
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Terminal Name
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Protocol
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Network Address
                  </TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-wider">
                    Operational Status
                  </TableHead>
                  <TableHead className="text-right text-[10px] font-bold uppercase tracking-wider">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && slaveDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center">
                      <div className="inline-flex flex-col items-center gap-3">
                        <RefreshCw className="h-6 w-6 text-primary/20 animate-spin" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                          Synchronizing nodes...
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : slaveDevices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="h-32 text-center text-muted-foreground"
                    >
                      <div className="inline-flex flex-col items-center gap-3">
                        <Activity className="h-6 w-6 text-muted-foreground/20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest">
                          No terminal slaves registered
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  slaveDevices.map((device, index) => (
                    <TableRow
                      key={device.id}
                      className="group hover:bg-muted/30 transition-colors"
                    >
                      <TableCell className="font-mono text-[10px] text-muted-foreground/60">
                        #{String(index + 1).padStart(2, "0")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-bold leading-tight">
                            {device.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-tight">
                            {device.serialNumber.replace("SDK-", "")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-orange-500/10">
                          <Cpu className="w-3 h-3" />
                          {device.connectionType}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] font-bold tracking-tight text-primary">
                        {device.ipAddress}:{device.port}
                      </TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            onClick={() => handleSwitchMaster(device)}
                            title="Promote to Master"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditDevice(device)}
                            title="Edit Configuration"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteDevice(device.id)}
                            title="Remove Terminal"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <AlertDialog
        open={switchMasterDialogOpen}
        onOpenChange={setSwitchMasterDialogOpen}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <div className="p-3 bg-amber-500/10 w-fit rounded-xl mb-2">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-xl font-bold">
              Switch Master Node?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Are you sure you want to promote{" "}
              <span className="text-foreground font-bold">
                {selectedSlaveForMaster?.name}
              </span>{" "}
              as the new Master?
              <br />
              <br />
              The previous Master terminal will be downgraded to a Slave node
              automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-11 rounded-xl font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSwitchMaster}
              className="h-11 rounded-xl bg-amber-600 hover:bg-amber-700 font-bold px-6"
            >
              PROMOTE TERMINAL
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
