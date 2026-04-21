"use client";

import { VisualizationConfig } from "./_components/VisualizationConfig";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMenuItemPermissions } from "@/contexts/MenuContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { showToast } from "@/lib/toast-utils";
import {
  ArrowLeft, // Missing icon
  Server, // Missing icon
  HardDrive, // Missing icon
  Plus, // Missing icon
  Edit, // Missing icon
  Trash2, // Missing icon
  Database, // Missing icon
  Activity, // Missing icon
  Wifi, // Missing icon
  WifiOff, // Missing icon
  AlertCircle, // Missing icon
  CheckCircle, // Missing icon
  Clock, // Missing icon
  Wrench,
  X,
  ShieldCheck,
  Settings,
  Eye,
  MapPin,
  BarChart3,
  Thermometer,
  Zap,
  Package,
  Cpu,
  ArrowUpDown,
  TrendingUp,
  Minus,
  ChevronLeft,
  ChevronRight,
  Search,
  Info,
  Copy,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useMqttServer } from "@/contexts/MqttServerProvider";

interface RackDevice {
  id: string;
  rackId: string;
  deviceId: string;
  positionU: number;
  sizeU: number;
  deviceType: "SERVER" | "SWITCH" | "STORAGE" | "PDU" | "SENSOR";
  status: "PLANNED" | "INSTALLED" | "MAINTENANCE" | "REMOVED";
  createdAt: string;
  updatedAt: string;
  device: {
    id: string;
    uniqId: string;
    name: string;
    topic: string;
    address: string | null;
    lastPayload: any;
    lastUpdatedByMqtt: string | null;
  };
}

interface Rack {
  id: string;
  name: string;
  rackType?: "MAIN" | "NORMAL";
  capacityU: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  usedU: number;
  availableU: number;
  utilizationPercent: number;
  devices: RackDevice[];
  visualizationConfigs: any | null;
}

interface DeviceOption {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
}

const RACK_MONITOR_SLOT_STORAGE_KEY = "rack-monitor-slots-v1";

export default function RackDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rackId = params.id as string;

  const [rack, setRack] = useState<Rack | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [availableDevices, setAvailableDevices] = useState<DeviceOption[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "visualization">(
    "details",
  );
  const [isAddDeviceDialogOpen, setIsAddDeviceDialogOpen] = useState(false);
  const [isEditDeviceDialogOpen, setIsEditDeviceDialogOpen] = useState(false);
  const [isRemoveDeviceDialogOpen, setIsRemoveDeviceDialogOpen] =
    useState(false);
  const { canCreate } = useMenuItemPermissions("racks-management");
  const [selectedRackDevice, setSelectedRackDevice] =
    useState<RackDevice | null>(null);
  const [deviceForm, setDeviceForm] = useState<{
    deviceId: string;
    positionU: number;
    sizeU: number;
    deviceType: "SERVER" | "SWITCH" | "STORAGE" | "PDU" | "SENSOR";
    status: "PLANNED" | "INSTALLED" | "MAINTENANCE" | "REMOVED";
  }>({
    deviceId: "",
    positionU: 1,
    sizeU: 1,
    deviceType: "SERVER",
    status: "PLANNED",
  });
  const [deviceSearchQuery, setDeviceSearchQuery] = useState("");
  const [isReverseLayout, setIsReverseLayout] = useState(true); // Default to true (bottom-up: 1 at bottom)

  // Fetch rack details
  const fetchRackDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/racks/${rackId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch rack details");
      }
      const data = await response.json();
      setRack(data);
    } catch (error) {
      console.error("Error fetching rack details:", error);
      showToast.error("Error", "Failed to load rack details");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch available devices (not assigned to any rack)
  const fetchAvailableDevices = async () => {
    try {
      const response = await fetch("/api/devices/external");
      if (!response.ok) {
        throw new Error("Failed to fetch devices");
      }
      const devices = await response.json();

      // Filter devices that are not already assigned to this rack
      const assignedDeviceIds = new Set(
        rack?.devices.map((rd) => rd.deviceId) || [],
      );
      const available = devices.filter(
        (device: DeviceOption) => !assignedDeviceIds.has(device.uniqId),
      );

      setAvailableDevices(available);
    } catch (error) {
      console.error("Error fetching available devices:", error);
      showToast.error("Error", "Failed to fetch available devices");
    }
  };

  // Check if position is available for new device
  // Note: Sensor devices don't occupy physical rack space, so they don't conflict with positions
  const isPositionAvailable = (
    positionU: number,
    sizeU: number,
    excludeDeviceId?: string,
  ): boolean => {
    if (!rack) return false;

    // Calculate the range this device would occupy
    const startU = positionU;
    const endU = positionU + sizeU - 1;

    // Check if any existing NON-SENSOR device conflicts with this range
    // Sensor devices don't occupy physical space, so they don't cause position conflicts
    for (const device of rack.devices) {
      // Skip the device we're editing (if any)
      if (excludeDeviceId && device.deviceId === excludeDeviceId) continue;

      // Skip sensor devices as they don't occupy physical rack space
      if (device.deviceType === "SENSOR") continue;

      const deviceStartU = device.positionU;
      const deviceEndU = device.positionU + device.sizeU - 1;

      // Check for overlap
      if (startU <= deviceEndU && endU >= deviceStartU) {
        return false;
      }
    }

    return true;
  };

  // Add device to rack
  const handleAddDevice = async () => {
    if (!deviceForm.deviceId) {
      showToast.error("Validation Error", "Please select a device");
      return;
    }

    // For sensor devices, set default values for size and position
    const formData = { ...deviceForm };
    if (deviceForm.deviceType === "SENSOR") {
      formData.sizeU = 1; // Default size for sensors
      formData.positionU = 1; // Default position for sensors
    }

    // Frontend validation for position availability (only for non-sensor devices)
    if (
      deviceForm.deviceType !== "SENSOR" &&
      !isPositionAvailable(formData.positionU, formData.sizeU)
    ) {
      showToast.error(
        "Position Conflict",
        `Position ${formData.positionU} to ${formData.positionU + formData.sizeU - 1}U is already occupied by another device`,
      );
      return;
    }

    try {
      const response = await fetch(`/api/racks/${rackId}/devices`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      showToast.success("Success", "Device added to rack successfully");

      setIsAddDeviceDialogOpen(false);
      resetDeviceForm();
      fetchRackDetails();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to add device to rack");
    }
  };

  // Edit device
  const handleEditDevice = (rackDevice: RackDevice) => {
    setSelectedRackDevice(rackDevice);
    setDeviceForm({
      deviceId: rackDevice.deviceId,
      positionU: rackDevice.positionU,
      sizeU: rackDevice.sizeU,
      deviceType: rackDevice.deviceType,
      status: rackDevice.status,
    });
    setIsEditDeviceDialogOpen(true);
  };

  // Remove device
  const handleRemoveDevice = (rackDevice: RackDevice) => {
    setSelectedRackDevice(rackDevice);
    setIsRemoveDeviceDialogOpen(true);
  };

  // Update device
  const handleUpdateDevice = async () => {
    if (!selectedRackDevice) return;

    // Frontend validation for position availability (exclude current device)
    // Skip position validation for sensor devices as they don't occupy physical space
    if (
      selectedRackDevice.deviceType !== "SENSOR" &&
      !isPositionAvailable(
        deviceForm.positionU,
        deviceForm.sizeU,
        selectedRackDevice.deviceId,
      )
    ) {
      showToast.error(
        "Position Conflict",
        `Position ${deviceForm.positionU} to ${deviceForm.positionU + deviceForm.sizeU - 1}U is already occupied by another device`,
      );
      return;
    }

    try {
      const response = await fetch(
        `/api/racks/${rackId}/devices/${selectedRackDevice.deviceId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(deviceForm),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      showToast.success("Success", "Device updated successfully");

      setIsEditDeviceDialogOpen(false);
      setSelectedRackDevice(null);
      resetDeviceForm();
      fetchRackDetails();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to update device");
    }
  };

  // Confirm remove device
  const handleConfirmRemoveDevice = async () => {
    if (!selectedRackDevice) return;

    try {
      const response = await fetch(
        `/api/racks/${rackId}/devices/${selectedRackDevice.deviceId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.message);
      }

      showToast.success("Success", "Device removed from rack successfully");

      setIsRemoveDeviceDialogOpen(false);
      setSelectedRackDevice(null);
      fetchRackDetails();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to remove device");
    }
  };

  // Reset device form
  const resetDeviceForm = () => {
    setDeviceForm({
      deviceId: "",
      positionU: 1,
      sizeU: 1,
      deviceType: "SERVER",
      status: "PLANNED",
    });
  };

  // Get status color - Dark mode compatible
  const getStatusColor = (status: string) => {
    switch (status) {
      case "INSTALLED":
        return "text-green-600 bg-green-100 border-green-300 dark:text-green-200 dark:bg-green-900/20 dark:border-green-500";
      case "PLANNED":
        return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800";
      case "MAINTENANCE":
        return "text-orange-600 bg-orange-100 border-orange-300 dark:text-orange-200 dark:bg-orange-900/20 dark:border-orange-500";
      case "REMOVED":
        return "text-red-600 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/20 dark:border-red-500";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200 dark:text-gray-400 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "INSTALLED":
        return (
          <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
        );
      case "PLANNED":
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case "MAINTENANCE":
        return (
          <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        );
      case "REMOVED":
        return <X className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return (
          <AlertCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />
        );
    }
  };

  // Toggle rack layout view (normal/reverse)
  const toggleRackLayout = () => {
    setIsReverseLayout(!isReverseLayout);
  };

  const handleDuplicate = () => {
    if (rack) {
      router.push(`/infrastructure/racks?duplicate=${rack.id}`);
    }
  };

  const handleOpenConfig = () => {
    setActiveTab("visualization");
  };

  const handleMonitorAll = () => {
    if (!rack) return;

    try {
      const slots: [string | null, string | null, string | null] =
        rack.rackType === "MAIN" ? [null, null, null] : [rack.id, null, null];
      localStorage.setItem(
        RACK_MONITOR_SLOT_STORAGE_KEY,
        JSON.stringify(slots),
      );
    } catch (error) {
      console.error("Failed to persist rack monitor selection:", error);
    }

    router.push("/infrastructure/rack-monitor");
  };

  // Generate rack layout visualization with bottom-up positioning and search filtering
  // Only show non-sensor devices in rack layout - sensors don't occupy physical rack space
  const generateRackLayout = (): Array<{
    u: number;
    device: RackDevice | undefined;
    isOccupied: boolean;
    isDeviceStart: boolean;
    isDeviceContinuation: boolean;
  }> => {
    if (!rack) return [];

    const layout: Array<{
      u: number;
      device: RackDevice | undefined;
      isOccupied: boolean;
      isDeviceStart: boolean;
      isDeviceContinuation: boolean;
    }> = [];
    const deviceMap = new Map<number, RackDevice>();
    const deviceStartPositions = new Map<string, number>(); // Track where each device starts

    // Filter devices: exclude ALL sensors from rack layout (they don't occupy physical space)
    let filteredDevices = rack.devices.filter(
      (device) => device.deviceType !== "SENSOR",
    );

    // Note: Search functionality is now only for device list, not rack layout
    // Rack layout shows all devices regardless of search query

    // Map devices by their bottom position (positionU represents bottom of device)
    filteredDevices.forEach((device) => {
      const startPos = device.positionU;
      deviceStartPositions.set(device.deviceId, startPos);

      // Calculate the actual rack units occupied by this device
      // positionU is the bottom position, device occupies positionU to positionU + sizeU - 1
      for (let u = startPos; u < startPos + device.sizeU; u++) {
        deviceMap.set(u, device);
      }
    });

    // Generate U positions - support reverse layout
    const positions = isReverseLayout
      ? Array.from({ length: rack.capacityU }, (_, i) => rack.capacityU - i) // 42, 41, 40, ..., 1
      : Array.from({ length: rack.capacityU }, (_, i) => i + 1); // 1, 2, 3, ..., 42

    positions.forEach((u) => {
      const device = deviceMap.get(u);
      const isDeviceStart =
        device && deviceStartPositions.get(device.deviceId) === u;
      const isDeviceContinuation =
        device && deviceStartPositions.get(device.deviceId) !== u;

      layout.push({
        u,
        device,
        isOccupied: !!device,
        isDeviceStart: !!isDeviceStart,
        isDeviceContinuation: !!isDeviceContinuation,
      });
    });

    return layout;
  };

  useEffect(() => {
    if (rackId) {
      fetchRackDetails();
    }
  }, [rackId]);

  useEffect(() => {
    if (rack) {
      fetchAvailableDevices();
    }
  }, [rack]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <Server className="mx-auto h-16 w-16 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-semibold mb-2">
              Loading rack details...
            </h3>
          </div>
        </div>
      </div>
    );
  }

  if (!rack) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <AlertCircle className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Rack not found</h3>
            <Button onClick={() => router.push("/infrastructure/racks")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Racks
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const rackLayout = generateRackLayout();
  const installedDevices = rack.devices.filter(
    (device) => device.status === "INSTALLED",
  ).length;
  const maintenanceDevices = rack.devices.filter(
    (device) => device.status === "MAINTENANCE",
  ).length;
  const plannedDevices = rack.devices.filter(
    (device) => device.status === "PLANNED",
  ).length;
  const removedDevices = rack.devices.filter(
    (device) => device.status === "REMOVED",
  ).length;
  const sensorDevices = rack.devices.filter(
    (device) => device.deviceType === "SENSOR",
  ).length;

  const healthHeadline =
    maintenanceDevices > 0
      ? "Maintenance Required"
      : plannedDevices > 0
        ? "Deployment Pending"
        : rack.utilizationPercent >= 90
          ? "Rack Near Capacity"
          : "Rack Operating Normally";

  const healthMessage =
    maintenanceDevices > 0
      ? `${maintenanceDevices} device${maintenanceDevices > 1 ? "s are" : " is"} currently in maintenance status.`
      : plannedDevices > 0
        ? `${plannedDevices} planned device${plannedDevices > 1 ? "s are" : " is"} waiting for installation.`
        : rack.utilizationPercent >= 90
          ? `Rack utilization is ${rack.utilizationPercent}%, with only ${rack.availableU}U remaining.`
          : `${installedDevices} installed device${installedDevices !== 1 ? "s" : ""} and ${sensorDevices} sensor${sensorDevices !== 1 ? "s" : ""} are tracked in this rack.`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-background p-4 md:p-8"
    >
      <div className="space-y-8">
        {/* Header Section with Glassmorphism */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-card dark:bg-slate-900/40 border border-border dark:border-slate-800/50 backdrop-blur-xl shadow-md">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              onClick={() => router.push("/infrastructure/racks")}
              className="h-12 w-12 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all duration-300"
            >
              <ArrowLeft className="h-6 w-6" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                  {rack.name}
                </h1>
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 px-3 py-1 font-bold">
                  {rack.id.substring(0, 8)}
                </Badge>
              </div>
              <p className="text-muted-foreground flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-emerald-500" />
                {rack.location || "Default Data Center"} • Infrastructure Asset
              </p>
            </div>
          </div>
        </div>

        {/* Rack Overview Cards - Refined */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full border-none shadow-xl bg-gradient-to-br from-blue-600/10 to-transparent dark:bg-slate-900/60 bg-card/80 overflow-hidden relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-blue-500/20 rounded-2xl">
                    <Server className="h-6 w-6 text-blue-400" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-blue-500/30 text-blue-400 bg-blue-500/5"
                  >
                    Capacity
                  </Badge>
                </div>
                <p className="text-4xl font-black text-foreground">
                  {rack.capacityU}
                  <span className="text-xl text-slate-500 ml-1">U</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Full rack scale capacity
                </p>
              </CardContent>
              <div className="absolute -bottom-6 -right-6 h-24 w-24 bg-blue-500/10 blur-3xl rounded-full" />
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full border-none shadow-xl bg-gradient-to-br from-orange-600/10 to-transparent dark:bg-slate-900/60 bg-card/80 overflow-hidden relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-500/20 rounded-2xl">
                    <TrendingUp className="h-6 w-6 text-orange-400" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-orange-500/30 text-orange-400 bg-orange-500/5"
                  >
                    Used
                  </Badge>
                </div>
                <p className="text-4xl font-black text-foreground">
                  {rack.usedU}
                  <span className="text-xl text-slate-500 ml-1">U</span>
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${rack.utilizationPercent}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-orange-400">
                    {rack.utilizationPercent}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full border-none shadow-xl bg-gradient-to-br from-emerald-600/10 to-transparent dark:bg-slate-900/60 bg-card/80 overflow-hidden relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-emerald-500/20 rounded-2xl">
                    <CheckCircle className="h-6 w-6 text-emerald-400" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                  >
                    Available
                  </Badge>
                </div>
                <p className="text-4xl font-black text-foreground">
                  {rack.availableU}
                  <span className="text-xl text-slate-500 ml-1">U</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Free slots remaining
                </p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} transition={{ duration: 0.2 }}>
            <Card className="h-full border-none shadow-xl bg-gradient-to-br from-indigo-600/10 to-transparent dark:bg-slate-900/60 bg-card/80 overflow-hidden relative">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-indigo-500/20 rounded-2xl">
                    <Database className="h-6 w-6 text-indigo-400" />
                  </div>
                  <Badge
                    variant="outline"
                    className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5"
                  >
                    Devices
                  </Badge>
                </div>
                <p className="text-4xl font-black text-foreground">
                  {rack.devices.length}
                </p>
                <p className="text-sm text-muted-foreground mt-2 font-medium">
                  Registered assets in rack
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as "details" | "visualization")
          }
          className="w-full"
        >
          <TabsList className="flex items-center gap-2 bg-transparent p-0 mb-8 w-full justify-start overflow-x-auto h-auto scrollbar-hide">
            <TabsTrigger
              value="details"
              className="px-8 py-3 rounded-xl border border-border bg-muted/60 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-500/50 transition-all duration-300 font-bold"
            >
              <Server className="h-4 w-4 mr-2" />
              Rack Layout & Management
            </TabsTrigger>
            <TabsTrigger
              value="visualization"
              className="px-8 py-3 rounded-xl border border-border bg-muted/60 text-muted-foreground data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:border-blue-500/50 transition-all duration-300 font-bold"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Intelligence Monitoring
            </TabsTrigger>
          </TabsList>
          <TabsContent value="details" className="mt-0 outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Rack Layout Visualization - Spans 7 columns */}
              <div className="lg:col-span-8">
                <Card className="border-border bg-card/80 dark:bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-2xl">
                  <CardHeader className="border-b border-border/50 pb-6 px-8 flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-2xl font-bold text-foreground">
                        Rack Visualization
                      </CardTitle>
                      <p className="text-slate-400 text-sm mt-1">
                        Real-time status of physical slots
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleRackLayout}
                        className="h-9 rounded-lg border-border hover:bg-muted text-muted-foreground font-bold"
                      >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {isReverseLayout ? "Top to Bottom" : "Bottom to Top"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="px-8 py-6">
                      <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 mb-8">
                        <div className="flex items-center gap-3 text-blue-400 mb-3">
                          <Info className="h-5 w-5" />
                          <span className="font-bold uppercase tracking-wider text-xs">
                            Navigation Guide
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="text-xs text-foreground/70 font-medium">
                              Installed
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-xs text-foreground/70 font-medium">
                              Planned
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-xs text-foreground/70 font-medium">
                              Maintenance
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-slate-700" />
                            <span className="text-xs text-foreground/70 font-medium">
                              Empty Slot
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-border overflow-hidden bg-background/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border hover:bg-transparent">
                              <TableHead className="w-24 text-center font-bold text-muted-foreground py-5">
                                U LEVEL
                              </TableHead>
                              <TableHead className="font-bold text-muted-foreground py-5">
                                EQUIPMENT ASSET
                              </TableHead>
                              <TableHead className="w-24 text-center font-bold text-muted-foreground py-5">
                                SIZE
                              </TableHead>
                              <TableHead className="w-40 text-center font-bold text-muted-foreground py-5">
                                STATUS
                              </TableHead>
                              <TableHead className="w-32 text-center font-bold text-muted-foreground py-5">
                                TELEMETRY
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            <AnimatePresence mode="popLayout">
                              {rackLayout.map(
                                ({
                                  u,
                                  device,
                                  isOccupied,
                                  isDeviceStart,
                                  isDeviceContinuation,
                                }) => {
                                  return (
                                    <motion.tr
                                      initial={{ opacity: 0 }}
                                      animate={{ opacity: 1 }}
                                      key={u}
                                      className={`
                                      border-b border-border/40 transition-all duration-200
                                      ${isOccupied ? "bg-muted/40 hover:bg-muted/60" : "hover:bg-muted/20"}
                                    `}
                                    >
                                      <TableCell className="py-2 text-center">
                                        <span
                                          className={`
                                        inline-flex items-center justify-center w-10 h-8 rounded-lg font-black text-xs
                                        ${isOccupied ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}
                                      `}
                                        >
                                          {u.toString().padStart(2, "0")}
                                        </span>
                                      </TableCell>
                                      <TableCell className="py-2">
                                        {isOccupied && device ? (
                                          <div className="flex items-center gap-3">
                                            {isDeviceStart ? (
                                              <div className="flex items-center gap-3">
                                                <div
                                                  className={`p-2 rounded-lg ${
                                                    device.deviceType ===
                                                    "SERVER"
                                                      ? "bg-blue-500/10"
                                                      : device.deviceType ===
                                                          "SWITCH"
                                                        ? "bg-purple-500/10"
                                                        : "bg-emerald-500/10"
                                                  }`}
                                                >
                                                  <Server
                                                    className={`h-4 w-4 ${
                                                      device.deviceType ===
                                                      "SERVER"
                                                        ? "text-blue-400"
                                                        : device.deviceType ===
                                                            "SWITCH"
                                                          ? "text-purple-400"
                                                          : "text-emerald-400"
                                                    }`}
                                                  />
                                                </div>
                                                <div>
                                                  <p className="font-bold text-foreground text-sm">
                                                    {device.device.name}
                                                  </p>
                                                  <p className="text-[10px] text-slate-500 font-mono">
                                                    {device.device.uniqId}
                                                  </p>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-3 ml-2 opacity-40">
                                                <div className="w-px h-6 bg-slate-700 ml-4" />
                                                <p className="text-[10px] uppercase font-black text-slate-600 tracking-widest">
                                                  Reserved Space
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-3 opacity-30">
                                            <div className="p-2 bg-slate-800 rounded-lg">
                                              <Plus className="h-4 w-4 text-slate-600" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest italic">
                                              Available Slot
                                            </span>
                                          </div>
                                        )}
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {isOccupied &&
                                        device &&
                                        isDeviceStart ? (
                                          <Badge
                                            variant="outline"
                                            className="h-7 w-12 flex items-center justify-center bg-slate-800/50 border-slate-700 text-slate-300 font-black"
                                          >
                                            {device.sizeU}U
                                          </Badge>
                                        ) : null}
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {isOccupied &&
                                        device &&
                                        isDeviceStart ? (
                                          <Badge
                                            className={`
                                          h-8 px-4 rounded-xl font-bold border-none
                                          ${
                                            device.status === "INSTALLED"
                                              ? "bg-emerald-500/10 text-emerald-400"
                                              : device.status === "PLANNED"
                                                ? "bg-blue-500/10 text-blue-400"
                                                : "bg-orange-500/10 text-orange-400"
                                          }
                                        `}
                                          >
                                            <div
                                              className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                                device.status === "INSTALLED"
                                                  ? "bg-emerald-400"
                                                  : device.status === "PLANNED"
                                                    ? "bg-blue-400"
                                                    : "bg-orange-400"
                                              } animate-pulse`}
                                            />
                                            {device.status}
                                          </Badge>
                                        ) : null}
                                      </TableCell>
                                      <TableCell className="py-2 text-center">
                                        {isOccupied &&
                                        device &&
                                        isDeviceStart ? (
                                          <div className="flex items-center justify-center gap-2">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground"
                                            >
                                              <Activity className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground"
                                            >
                                              <Wrench className="h-3.5 w-3.5" />
                                            </Button>
                                          </div>
                                        ) : (
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                              setDeviceForm({
                                                ...deviceForm,
                                                positionU: u,
                                              });
                                              setIsAddDeviceDialogOpen(true);
                                            }}
                                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
                                          >
                                            <Plus className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </TableCell>
                                    </motion.tr>
                                  );
                                },
                              )}
                            </AnimatePresence>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Device Management Section - Spans 4 columns */}
              <div className="lg:col-span-4 space-y-8">
                <Card className="border-border bg-card/80 dark:bg-slate-900/40 backdrop-blur-sm shadow-2xl overflow-hidden">
                  <CardHeader className="border-b border-border/50 pb-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                        <Package className="h-5 w-5 text-indigo-400" />
                        Assets Registry
                      </CardTitle>
                      <Button
                        size="sm"
                        onClick={() => {
                          resetDeviceForm();
                          setIsAddDeviceDialogOpen(true);
                        }}
                        className="h-9 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Asset
                      </Button>
                    </div>
                    <div className="relative mt-6 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                      <Input
                        placeholder="Scan or search assets..."
                        className="h-11 pl-10 rounded-xl bg-background border-input focus:border-blue-500/50 transition-all text-sm"
                        value={deviceSearchQuery}
                        onChange={(e) => setDeviceSearchQuery(e.target.value)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 max-h-[700px] overflow-y-auto custom-scrollbar">
                    <div className="p-4 space-y-3">
                      {rack.devices.length === 0 ? (
                        <div className="py-20 text-center space-y-4">
                          <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto border border-border">
                            <Server className="h-10 w-10 text-slate-600" />
                          </div>
                          <div>
                            <p className="text-foreground font-bold text-lg">
                              Empty Registry
                            </p>
                            <p className="text-slate-500 text-sm">
                              Waiting for first equipment deployment
                            </p>
                          </div>
                        </div>
                      ) : (
                        rack.devices
                          .filter((rd) =>
                            rd.device.name
                              .toLowerCase()
                              .includes(deviceSearchQuery.toLowerCase()),
                          )
                          .map((rd) => (
                            <motion.div
                              key={rd.id}
                              initial={{ x: 20, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              whileHover={{ scale: 1.02 }}
                              className="p-5 rounded-2xl bg-muted/30 border border-border hover:border-blue-500/30 transition-all group"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                  <div
                                    className={`p-2.5 rounded-xl ${
                                      rd.deviceType === "SERVER"
                                        ? "bg-blue-500/10"
                                        : "bg-purple-500/10"
                                    }`}
                                  >
                                    {rd.deviceType === "SERVER" ? (
                                      <Server className="h-5 w-5 text-blue-400" />
                                    ) : (
                                      <Wifi className="h-5 w-5 text-purple-400" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-foreground group-hover:text-blue-500 transition-colors">
                                      {rd.device.name}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge
                                        variant="outline"
                                        className="h-5 px-2 text-[10px] uppercase font-black tracking-wider text-muted-foreground border-border"
                                      >
                                        U{rd.positionU}-
                                        {rd.positionU + rd.sizeU - 1}
                                      </Badge>
                                      <span className="w-1 h-1 bg-slate-700 rounded-full" />
                                      <span
                                        className={`text-[10px] font-bold ${rd.status === "INSTALLED" ? "text-emerald-500" : "text-blue-500"}`}
                                      >
                                        {rd.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditDevice(rd)}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-muted text-muted-foreground"
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveDevice(rd)}
                                    className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/10 text-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </motion.div>
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* System Health / Notes */}
                <Card className="border-border bg-card/80 dark:bg-slate-900/40 backdrop-blur-sm shadow-2xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-bold text-foreground uppercase text-xs tracking-widest">
                      Health Insights
                    </h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
                      <Thermometer className="h-5 w-5 text-orange-400 mt-1" />
                      <div>
                        <p className="text-foreground text-sm font-bold">
                          {healthHeadline}
                        </p>
                        <p className="text-2xl font-black text-foreground">
                          {maintenanceDevices > 0
                            ? maintenanceDevices
                            : plannedDevices > 0
                              ? plannedDevices
                              : rack.utilizationPercent}
                          <span className="text-slate-500 font-medium text-lg ml-1">
                            {maintenanceDevices > 0 || plannedDevices > 0
                              ? "devices"
                              : "% util"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          Installed
                        </p>
                        <p className="text-lg font-black text-foreground">
                          {installedDevices}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          Available U
                        </p>
                        <p className="text-lg font-black text-foreground">
                          {rack.availableU}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          Planned
                        </p>
                        <p className="text-lg font-black text-foreground">
                          {plannedDevices}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/50 border border-border">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">
                          Removed
                        </p>
                        <p className="text-lg font-black text-foreground">
                          {removedDevices}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                      <AlertCircle className="h-3.5 w-3.5 text-blue-400" />
                      <p className="text-xs text-slate-500 font-medium">
                        {healthMessage}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="visualization">
            {rack && (
              <VisualizationConfig
                rack={rack}
                onConfigSave={fetchRackDetails}
              />
            )}
          </TabsContent>
        </Tabs>

        {/* Add Device Dialog - Enhanced UX with Tabs */}
        <Dialog
          open={isAddDeviceDialogOpen}
          onOpenChange={setIsAddDeviceDialogOpen}
        >
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Add Device to Rack
              </DialogTitle>
              <DialogDescription>
                Configure device settings and preview placement in the rack
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="configure" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger
                  value="configure"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  Configure
                </TabsTrigger>
                <TabsTrigger
                  value="preview"
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
              </TabsList>

              <TabsContent value="configure" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left Panel - Device Selection */}
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-semibold text-foreground mb-3 block">
                        Step 1: Select Device
                      </Label>

                      {/* Device Type Selection */}
                      <div className="space-y-2 mb-4">
                        <Label
                          htmlFor="device-type"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Device Type
                        </Label>
                        <Select
                          value={deviceForm.deviceType}
                          onValueChange={(value: any) =>
                            setDeviceForm({ ...deviceForm, deviceType: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select device type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SERVER">
                              <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-blue-600" />
                                <span>Server</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="SWITCH">
                              <div className="flex items-center gap-2">
                                <Wifi className="h-4 w-4 text-green-600" />
                                <span>Network Switch</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="STORAGE">
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-purple-600" />
                                <span>Storage</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="PDU">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-orange-600" />
                                <span>PDU</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="SENSOR">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-cyan-600" />
                                <span>Sensor</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Device Selection */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="device-select"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Available Devices
                        </Label>
                        <SearchableSelect
                          options={availableDevices.map((device) => ({
                            label: `${device.name}${device.address ? ` - ${device.address}` : ""} (${device.topic})`,
                            value: device.uniqId,
                          }))}
                          value={deviceForm.deviceId}
                          onValueChange={(value) =>
                            setDeviceForm({ ...deviceForm, deviceId: value })
                          }
                          placeholder="Search and select device..."
                          emptyMessage="No available devices found."
                          icon={
                            <Server className="h-4 w-4 text-muted-foreground" />
                          }
                          className="h-12 rounded-xl bg-background/50 border-border/50"
                        />
                      </div>

                      {/* Device Status */}
                      <div className="space-y-2">
                        <Label
                          htmlFor="status"
                          className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                        >
                          Installation Status
                        </Label>
                        <Select
                          value={deviceForm.status}
                          onValueChange={(value: any) =>
                            setDeviceForm({ ...deviceForm, status: value })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLANNED">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <span>Planned</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="INSTALLED">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>Installed</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Position Configuration - Only for non-sensor devices */}
                    {deviceForm.deviceType !== "SENSOR" && (
                      <div>
                        <Label className="text-sm font-semibold text-foreground mb-3 block">
                          Step 2: Configure Position
                        </Label>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label
                              htmlFor="size-u"
                              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                            >
                              Device Size (U)
                            </Label>
                            <Input
                              id="size-u"
                              type="number"
                              min="1"
                              max={rack.capacityU}
                              value={deviceForm.sizeU}
                              onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (value > rack.capacityU) {
                                  showToast.error(
                                    "Invalid Size",
                                    `Size cannot exceed rack capacity (${rack.capacityU}U)`,
                                  );
                                  return;
                                }
                                setDeviceForm({ ...deviceForm, sizeU: value });
                              }}
                              className="text-center font-semibold"
                            />
                            <p className="text-xs text-muted-foreground text-center">
                              {deviceForm.sizeU}U = {deviceForm.sizeU * 1.75}"
                              of rack space
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label
                              htmlFor="position-u"
                              className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
                            >
                              Rack Position (U)
                            </Label>
                            <Input
                              id="position-u"
                              type="number"
                              min="1"
                              max={rack.capacityU}
                              value={deviceForm.positionU}
                              onChange={(e) =>
                                setDeviceForm({
                                  ...deviceForm,
                                  positionU: parseInt(e.target.value),
                                })
                              }
                              className={`text-center font-semibold ${
                                !isPositionAvailable(
                                  deviceForm.positionU,
                                  deviceForm.sizeU,
                                )
                                  ? "border-red-500 focus:border-red-500"
                                  : ""
                              }`}
                            />
                            {!isPositionAvailable(
                              deviceForm.positionU,
                              deviceForm.sizeU,
                            ) && (
                              <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded-md dark:bg-red-950 dark:border-red-800">
                                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                                <p className="text-xs text-red-700 dark:text-red-400">
                                  Position conflict! U{deviceForm.positionU}-
                                  {deviceForm.positionU + deviceForm.sizeU - 1}{" "}
                                  is occupied
                                </p>
                              </div>
                            )}
                            <p className="text-xs text-muted-foreground text-center">
                              Bottom position: U{deviceForm.positionU} (spans to
                              U{deviceForm.positionU + deviceForm.sizeU - 1})
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Sensor Info */}
                    {deviceForm.deviceType === "SENSOR" && (
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950 dark:border-blue-800">
                        <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300 mb-2">
                          <Activity className="h-4 w-4" />
                          <span className="font-medium">Sensor Device</span>
                        </div>
                        <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                          <p>✅ Sensors don't occupy physical rack space</p>
                          <p>✅ Used for monitoring and data collection</p>
                          <p>✅ Position automatically set to defaults</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Panel - Summary */}
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-semibold text-foreground mb-3 block">
                        Configuration Summary
                      </Label>

                      <div className="space-y-4">
                        {/* Device Info */}
                        <div className="p-4 border rounded-lg bg-muted/20">
                          <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                            <Server className="h-4 w-4" />
                            Device Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Type:
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {deviceForm.deviceType || "Not selected"}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Device:
                              </span>
                              <span className="font-medium text-xs">
                                {deviceForm.deviceId
                                  ? availableDevices.find(
                                      (d) => d.uniqId === deviceForm.deviceId,
                                    )?.name || "Unknown"
                                  : "Not selected"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Status:
                              </span>
                              <Badge
                                className={`text-xs ${getStatusColor(
                                  deviceForm.status,
                                )}`}
                              >
                                {getStatusIcon(deviceForm.status)}
                                <span className="ml-1">
                                  {deviceForm.status}
                                </span>
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Position Info - Only for non-sensor */}
                        {deviceForm.deviceType !== "SENSOR" && (
                          <div className="p-4 border rounded-lg bg-muted/20">
                            <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              Position Information
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Size:
                                </span>
                                <span className="font-medium">
                                  {deviceForm.sizeU}U
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Position:
                                </span>
                                <span className="font-medium">
                                  U{deviceForm.positionU}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                  Range:
                                </span>
                                <span className="font-medium text-xs">
                                  U{deviceForm.positionU} - U
                                  {deviceForm.positionU + deviceForm.sizeU - 1}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">
                                  Available:
                                </span>
                                <div
                                  className={`w-2 h-2 rounded-full ${
                                    isPositionAvailable(
                                      deviceForm.positionU,
                                      deviceForm.sizeU,
                                    )
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Validation Status */}
                        <div
                          className={`p-4 border rounded-lg ${
                            deviceForm.deviceId &&
                            (deviceForm.deviceType === "SENSOR" ||
                              isPositionAvailable(
                                deviceForm.positionU,
                                deviceForm.sizeU,
                              ))
                              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
                              : "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {deviceForm.deviceId &&
                            (deviceForm.deviceType === "SENSOR" ||
                              isPositionAvailable(
                                deviceForm.positionU,
                                deviceForm.sizeU,
                              )) ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium text-sm">
                              {deviceForm.deviceId &&
                              (deviceForm.deviceType === "SENSOR" ||
                                isPositionAvailable(
                                  deviceForm.positionU,
                                  deviceForm.sizeU,
                                ))
                                ? "Ready to Add"
                                : "Configuration Incomplete"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            {!deviceForm.deviceId && (
                              <p>• Select a device to continue</p>
                            )}
                            {deviceForm.deviceType !== "SENSOR" &&
                              deviceForm.deviceId &&
                              !isPositionAvailable(
                                deviceForm.positionU,
                                deviceForm.sizeU,
                              ) && <p>• Position conflict detected</p>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-6">
                <div>
                  <Label className="text-sm font-semibold text-foreground mb-3 block">
                    Rack Layout Preview
                  </Label>

                  <div className="border rounded-lg bg-card dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b bg-muted/30">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          Rack Layout Preview
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {rack.capacityU}U Capacity
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {deviceForm.deviceId
                          ? "Device will be placed at highlighted position"
                          : "Configure device in the Configure tab first"}
                      </p>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-4">
                      <div className="space-y-1">
                        {/* Generate preview with proposed device */}
                        {(() => {
                          const previewLayout: React.JSX.Element[] = [];
                          const deviceMap = new Map<number, RackDevice>();

                          // Add existing devices
                          rack.devices.forEach((device) => {
                            if (device.deviceType !== "SENSOR") {
                              for (
                                let u = device.positionU;
                                u < device.positionU + device.sizeU;
                                u++
                              ) {
                                deviceMap.set(u, device);
                              }
                            }
                          });

                          // Add proposed device (if valid)
                          if (
                            deviceForm.deviceId &&
                            deviceForm.deviceType !== "SENSOR" &&
                            isPositionAvailable(
                              deviceForm.positionU,
                              deviceForm.sizeU,
                            )
                          ) {
                            for (
                              let u = deviceForm.positionU;
                              u < deviceForm.positionU + deviceForm.sizeU;
                              u++
                            ) {
                              deviceMap.set(u, {
                                id: "preview",
                                rackId: rack.id,
                                deviceId: deviceForm.deviceId,
                                positionU: deviceForm.positionU,
                                sizeU: deviceForm.sizeU,
                                deviceType: deviceForm.deviceType,
                                status: deviceForm.status,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                device: availableDevices.find(
                                  (d) => d.uniqId === deviceForm.deviceId,
                                ) || {
                                  id: "preview",
                                  uniqId: deviceForm.deviceId,
                                  name: "Selected Device",
                                  topic: "",
                                  address: null,
                                },
                              } as RackDevice);
                            }
                          }

                          // Generate U positions (reverse layout)
                          const positions = Array.from(
                            { length: rack.capacityU },
                            (_, i) => rack.capacityU - i,
                          );

                          positions.forEach((u) => {
                            const device = deviceMap.get(u);
                            const isProposedDevice = device?.id === "preview";

                            previewLayout.push(
                              <div
                                key={u}
                                className={`flex items-center gap-3 p-2 rounded border text-sm transition-colors ${
                                  device
                                    ? isProposedDevice
                                      ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-600"
                                      : "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-600"
                                    : "bg-muted/30 border-border"
                                }`}
                              >
                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center font-bold text-xs">
                                  {u}
                                </div>
                                <div className="flex-1">
                                  {device ? (
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-2 h-2 rounded-full ${
                                          isProposedDevice
                                            ? "bg-green-500"
                                            : "bg-blue-500"
                                        }`}
                                      />
                                      <span className="font-medium text-xs truncate">
                                        {device.device.name}
                                      </span>
                                      {isProposedDevice && (
                                        <Badge
                                          variant="outline"
                                          className="text-xs bg-green-100 text-green-800 border-green-300"
                                        >
                                          Preview
                                        </Badge>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground text-xs italic">
                                      Empty slot
                                    </span>
                                  )}
                                </div>
                              </div>,
                            );
                          });

                          return previewLayout;
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">
                {deviceForm.deviceId ? (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Ready to add device to rack
                  </span>
                ) : (
                  <span>Please select a device to continue</span>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDeviceDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddDevice}
                  disabled={
                    !deviceForm.deviceId ||
                    (deviceForm.deviceType !== "SENSOR" &&
                      !isPositionAvailable(
                        deviceForm.positionU,
                        deviceForm.sizeU,
                      ))
                  }
                  className="min-w-24"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Device
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Device Dialog */}
        <Dialog
          open={isEditDeviceDialogOpen}
          onOpenChange={setIsEditDeviceDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Device</DialogTitle>
              <DialogDescription>
                Update device position, size, or status in this rack
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-device-select">Device *</Label>
                <Select
                  value={deviceForm.deviceId}
                  onValueChange={(value) =>
                    setDeviceForm({ ...deviceForm, deviceId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDevices
                      .concat(
                        selectedRackDevice
                          ? [
                              {
                                id: selectedRackDevice.device.id,
                                uniqId: selectedRackDevice.device.uniqId,
                                name: selectedRackDevice.device.name,
                                topic: selectedRackDevice.device.topic,
                                address: selectedRackDevice.device.address,
                              },
                            ]
                          : [],
                      )
                      .map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Show Size and Location fields only for non-sensor devices */}
              {deviceForm.deviceType !== "SENSOR" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-position-u">(U) Location *</Label>
                    <Input
                      id="edit-position-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.positionU}
                      onChange={(e) =>
                        setDeviceForm({
                          ...deviceForm,
                          positionU: parseInt(e.target.value),
                        })
                      }
                      className={
                        !isPositionAvailable(
                          deviceForm.positionU,
                          deviceForm.sizeU,
                          selectedRackDevice?.deviceId,
                        )
                          ? "border-red-500 focus:border-red-500"
                          : ""
                      }
                    />
                    {!isPositionAvailable(
                      deviceForm.positionU,
                      deviceForm.sizeU,
                      selectedRackDevice?.deviceId,
                    ) && (
                      <p className="text-xs text-red-600 dark:text-red-400">
                        Position {deviceForm.positionU} to{" "}
                        {deviceForm.positionU + deviceForm.sizeU - 1}U is
                        already occupied
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Bottom position of the device (1 = bottom,{" "}
                      {rack.capacityU} = top)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-size-u">Size (U) *</Label>
                    <Input
                      id="edit-size-u"
                      type="number"
                      min="1"
                      max={rack.capacityU}
                      value={deviceForm.sizeU}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (value > rack.capacityU) {
                          showToast.error(
                            "Invalid Size",
                            `Size cannot exceed rack capacity (${rack.capacityU}U)`,
                          );
                          return;
                        }
                        setDeviceForm({ ...deviceForm, sizeU: value });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      How many rack units this device occupies (max:{" "}
                      {rack.capacityU}U)
                    </p>
                  </div>
                </>
              )}

              {/* Show sensor info for sensor devices */}
              {deviceForm.deviceType === "SENSOR" && (
                <div className="space-y-2">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-md dark:bg-blue-950 dark:border-blue-800">
                    <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                      <Activity className="h-4 w-4" />
                      <span className="font-medium">Sensor Device</span>
                    </div>
                    <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <p>• Sensor devices don't occupy physical rack space</p>
                      <p>
                        • They are only used for monitoring and data collection
                      </p>
                      <p>
                        • Position and size are automatically set to default
                        values
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="edit-device-type">Device Type *</Label>
                <Select
                  value={deviceForm.deviceType}
                  onValueChange={(value: any) =>
                    setDeviceForm({ ...deviceForm, deviceType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SERVER">Server</SelectItem>
                    <SelectItem value="SWITCH">Switch</SelectItem>
                    <SelectItem value="STORAGE">Storage</SelectItem>
                    <SelectItem value="PDU">PDU</SelectItem>
                    <SelectItem value="SENSOR">Sensor</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select the type of device being installed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={deviceForm.status}
                  onValueChange={(value: any) =>
                    setDeviceForm({ ...deviceForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planned</SelectItem>
                    <SelectItem value="INSTALLED">Installed</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                    <SelectItem value="REMOVED">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDeviceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateDevice}>Update Device</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Device Dialog */}
        <Dialog
          open={isRemoveDeviceDialogOpen}
          onOpenChange={setIsRemoveDeviceDialogOpen}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Remove Device</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove this device from the rack?
              </DialogDescription>
            </DialogHeader>

            {selectedRackDevice && (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-md">
                  <h4 className="font-medium">
                    {selectedRackDevice.device.name}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {selectedRackDevice.positionU}U
                    </Badge>
                    <Badge
                      className={`text-xs ${getStatusColor(
                        selectedRackDevice.status,
                      )}`}
                    >
                      {getStatusIcon(selectedRackDevice.status)}
                      <span className="ml-1">{selectedRackDevice.status}</span>
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  This action cannot be undone. The device will be removed from
                  this rack but will remain available for assignment to other
                  racks.
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsRemoveDeviceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRemoveDevice}>
                Remove Device
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}
