"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
  useCallback,
} from "react";
import { showToast } from "@/lib/toast-utils";
// Impor MqttProvider dan useMqtt
import {
  MqttServerProvider,
  useMqttServer,
} from "@/contexts/MqttServerProvider";
import { useMenu } from "@/contexts/MenuContext";
import { useMenuItemPermissions } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Button } from "@/components/ui/button";
import { ImportExportButtons } from "@/components/shared/ImportExportButtons";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  FileClock,
  Edit,
  Trash2,
  PlusCircle,
  Download,
  Upload,
  Loader2,
  CheckCircle,
  XCircle,
  Info,
  Database,
  Activity,
  Settings,
  FileText,
  Search,
  RefreshCw,
  Clock,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Filter,
  Copy,
  MoreHorizontal,
  Calendar,
  List,
} from "lucide-react";

// --- Type Definitions ---
interface DeviceSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface LoggingConfig {
  id: string;
  customName: string;
  key: string;
  units: string | null;
  multiply: number | null;
  loggingIntervalMinutes: number; // 🆕 TAMBAH INI
  createdAt: string;
  device: DeviceSelection;
}

// --- Helper Function to flatten nested JSON objects ---
const flattenObject = (
  obj: any,
  parent: string = "",
  res: Record<string, any> = {},
) => {
  for (let key in obj) {
    const propName = parent ? `${parent}.${key}` : key;
    if (
      typeof obj[key] === "object" &&
      !Array.isArray(obj[key]) &&
      obj[key] !== null
    ) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
};

// Confirmation Dialog State - MOVED INSIDE COMPONENT

// =================================================================
// KONTEN UTAMA HALAMAN DIPINDAHKAN KE KOMPONEN SENDIRI
// =================================================================
function DevicesForLoggingContent() {
  // RBAC Permission Checks - Get permissions for logging-configs menu
  const { canView, canCreate, canUpdate, canDelete } =
    useMenuItemPermissions("logging-configs");
  const { loading: menuLoading } = useMenu();

  // --- Hooks & State ---
  const { brokers, subscribe, unsubscribe } = useMqttServer();
  const isReady = useMemo(
    () => brokers.some((broker) => broker.status === "connected"),
    [brokers],
  );

  // Server-side data handling using new API response format
  const [responseData, setResponseData] = useState<{
    data: LoggingConfig[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
    meta: {
      filteredBy: {
        deviceId: string | null;
        interval: string | null;
        status: string | null;
      };
    };
  } | null>(null);

  const [allDevices, setAllDevices] = useState<DeviceSelection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Server-side filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [deviceIdFilter, setDeviceIdFilter] = useState<string>("");
  const [intervalFilter, setIntervalFilter] = useState<string>("");
  const [conflictFilter, setConflictFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<string>("customName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [payloads, setPayloads] = useState<Record<string, any>>({});

  // Modal & Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Partial<LoggingConfig>>(
    {},
  );
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<DeviceSelection | null>(null);
  const [modalPayload, setModalPayload] = useState<any>(null);
  const [isPayloadLoading, setIsPayloadLoading] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<LoggingConfig | null>(
    null,
  );
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [deviceSearch, setDeviceSearch] = useState("");

  const [liveStatusDialog, setLiveStatusDialog] = useState<{
    isOpen: boolean;
    config: LoggingConfig | null;
    payload: any | null;
  }>({
    isOpen: false,
    config: null,
    payload: null,
  });

  const [viewLogsDialog, setViewLogsDialog] = useState<{
    isOpen: boolean;
    config: LoggingConfig | null;
    logs: any[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
    isLoading: boolean;
  }>({
    isOpen: false,
    config: null,
    logs: [],
    pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
    isLoading: false,
  });

  const fetchLogs = async (config: LoggingConfig, page = 1) => {
    setViewLogsDialog(prev => ({ ...prev, isOpen: true, config, isLoading: true }));
    try {
      const res = await fetch(`/api/logging-configs/${config.id}/logs?page=${page}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setViewLogsDialog(prev => ({
          ...prev,
          logs: data.data || [],
          pagination: data.pagination || { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
          isLoading: false
        }));
      } else {
        throw new Error("Failed to fetch logs");
      }
    } catch (err) {
      showToast.error("Error", "Failed to load log history");
      setViewLogsDialog(prev => ({ ...prev, isLoading: false }));
    }
  };

  const availableKeys = useMemo(() => {
    if (!modalPayload || typeof modalPayload !== "object") return [];
    try {
      // If the payload wraps its content inside "value" as a string
      const payloadToProcess = typeof modalPayload.value === "string"
        ? JSON.parse(modalPayload.value)
        : modalPayload;
      return Object.keys(flattenObject(payloadToProcess));
    } catch (e) {
      return [];
    }
  }, [modalPayload]);

  // --- MQTT Subscription for List Status ---
  useEffect(() => {
    if (!isReady || isLoading || !responseData?.data) return;

    const topics = [...new Set(responseData.data.map((c) => c.device.topic))];
    if (topics.length === 0) return;

    const handleListMessage = (topic: string, payloadString: string) => {
      try {
        const parsed = JSON.parse(payloadString);
        setPayloads((prev) => ({ ...prev, [topic]: parsed }));
      } catch (e) {
        setPayloads((prev) => ({ ...prev, [topic]: payloadString }));
      }
    };

    topics.forEach((topic) => {
      subscribe(topic, handleListMessage);
    });

    return () => {
      topics.forEach((topic) => {
        unsubscribe(topic, handleListMessage);
      });
    };
  }, [responseData?.data, isReady, isLoading, subscribe, unsubscribe]);

  // --- MQTT Subscription Logic for Modal (stays as is) ---
  useEffect(() => {
    const setupMqtt = async () => {
      if (!isModalOpen || !selectedDeviceForModal || !isReady) {
        return;
      }
      const topic = selectedDeviceForModal.topic;

      const handleMessage = (
        messageTopic: string,
        payloadString: string,
        _serverId: string,
        _retained?: boolean,
      ) => {
        if (messageTopic === topic) {
          setIsPayloadLoading(false);
          try {
            const parsedPayload = JSON.parse(payloadString);
            setModalPayload(parsedPayload);
          } catch (e) {
            setModalPayload({ error: "Invalid JSON payload received." });
          }
        }
      };

      try {
        await subscribe(topic, handleMessage);
        setIsPayloadLoading(true);
      } catch (error) {
        console.error("Failed to subscribe to MQTT topic:", error);
      }

      return async () => {
        try {
          await unsubscribe(topic, handleMessage);
          setModalPayload(null);
          setIsPayloadLoading(false);
        } catch (error) {
          console.error("Failed to unsubscribe from MQTT topic:", error);
        }
      };
    };
    setupMqtt();
  }, [isModalOpen, selectedDeviceForModal, isReady, subscribe, unsubscribe]);

  // Reset to page 1 when filters/search/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [deviceIdFilter, intervalFilter, conflictFilter, searchTerm, sortBy, sortOrder]);

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />;
    return sortOrder === "asc" ? (
      <ChevronUp className="ml-2 h-4 w-4 text-primary" />
    ) : (
      <ChevronDown className="ml-2 h-4 w-4 text-primary" />
    );
  };

  // Trigger scheduler reload after CRUD (direct scheduler call, more reliable than event system)
  const triggerCronReload = useCallback(async () => {
    try {
      await fetch("/api/cron/reload", { method: "POST" });
    } catch {
      // Non-critical, scheduler will reload on next interval
    }
  }, []);

  // Get unique topics for count and identification
  const enrichedConfigs = useMemo(() => {
    const configs = responseData?.data || [];
    const namePerDeviceCounts: Record<string, number> = {};

    // Count occurrences for conflict detection (Display name unique PER DEVICE)
    configs.forEach(c => {
      const nameKey = `${c.device.uniqId}_${c.customName.trim().toLowerCase()}`;
      namePerDeviceCounts[nameKey] = (namePerDeviceCounts[nameKey] || 0) + 1;
    });

    return configs.map(c => {
      const nameKey = `${c.device.uniqId}_${c.customName.trim().toLowerCase()}`;
      const hasNameConflict = namePerDeviceCounts[nameKey] > 1;
      return {
        ...c,
        hasNameConflict,
        hasTopicConflict: false, // Topic duplication is allowed and normal
        hasConflict: hasNameConflict
      };
    });
  }, [responseData?.data]);

  const conflictCount = useMemo(() => {
    return enrichedConfigs.filter(c => c.hasConflict).length;
  }, [enrichedConfigs]);

  // Filter and sort devices
  const processedConfigs = useMemo(() => {
    let filtered = enrichedConfigs.filter(config => {
      const matchesConflict = conflictFilter === "all" ||
        (conflictFilter === "conflicts" && config.hasConflict);
      return matchesConflict;
    });
    return filtered;
  }, [enrichedConfigs, conflictFilter]);

  // --- Server-side Data Fetching ---
  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query parameters for server-side pagination
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "10");

      if (deviceIdFilter.trim())
        params.append("deviceId", deviceIdFilter.trim());
      if (intervalFilter.trim())
        params.append("interval", intervalFilter.trim());
      if (searchTerm.trim())
        params.append("search", searchTerm.trim());

      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      // Fetch paginated configs and devices
      const [configsRes, devicesRes] = await Promise.all([
        fetch(`/api/logging-configs?${params.toString()}`),
        fetch("/api/devices/for-selection"),
      ]);

      if (!configsRes.ok || !devicesRes.ok)
        throw new Error("Failed to load initial data.");

      const configsData = await configsRes.json();
      setResponseData(configsData);
      setAllDevices(await devicesRes.json());
    } catch (err: any) {
      showToast.error("Failed to load initial data", err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, deviceIdFilter, intervalFilter, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // If user doesn't have view permission, show access denied
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view device logging configurations. Please contact your administrator if you believe this is an error."
        showActions={true}
      />
    );
  }

  // Check if user has any action permissions
  const hasActionPermissions = canUpdate || canDelete;

  // Loading state
  if (menuLoading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Skeleton className="h-6 w-6" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search and Controls Skeleton */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4 animate-pulse">
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="flex-1 h-10" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20" />
                <Skeleton className="h-9 w-24" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="sm:w-48 h-10" />
              <Skeleton className="sm:w-48 h-10" />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="p-0">
            <div className="p-4">
              <Skeleton className="h-6 w-48 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  // Get data from response
  const loggingConfigs = responseData?.data || [];
  const pagination = responseData?.pagination;


  const handleDeviceSelectInModal = (uniqId: string) => {
    const device = allDevices.find((d) => d.uniqId === uniqId);
    setSelectedDeviceForModal(device || null);
    setModalPayload(null);
    setCurrentConfig((prev) => ({
      ...prev,
      device: device
        ? {
          uniqId: device.uniqId,
          name: device.name,
          topic: device.topic,
        }
        : {
          uniqId: "",
          name: "",
          topic: "",
        },
      key: "",
    }));
  };

  const handleOpenModal = (
    mode: "add" | "edit",
    config: LoggingConfig | null = null,
  ) => {
    setIsUpdateMode(mode === "edit");
    if (mode === "edit" && config) {
      setCurrentConfig(config);
      setSelectedDeviceForModal(config.device);
    } else {
      setCurrentConfig({
        multiply: 1,
        loggingIntervalMinutes: 10,
      });
      setSelectedDeviceForModal(null);
    }
    setModalPayload(null);
    setIsModalOpen(true);
  };

  const handleDuplicateConfig = (config: LoggingConfig) => {
    setIsUpdateMode(false);
    setCurrentConfig({
      customName: `${config.customName} (Copy)`,
      key: config.key,
      units: config.units,
      multiply: config.multiply,
      loggingIntervalMinutes: config.loggingIntervalMinutes,
    });
    setSelectedDeviceForModal(config.device);
    setModalPayload(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setDeviceSearch("");
  };

  // --- CRUD Functions ---
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const dataToSave = {
      customName: currentConfig.customName,
      key: currentConfig.key,
      units: currentConfig.units,
      multiply: currentConfig.multiply,
      deviceUniqId: selectedDeviceForModal?.uniqId,
      loggingIntervalMinutes: currentConfig.loggingIntervalMinutes || 10, // 🆕 TAMBAH INI
    };

    const url = isUpdateMode
      ? `/api/logging-configs/${currentConfig.id}`
      : "/api/logging-configs";
    const method = isUpdateMode ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save configuration.");
      }
      showToast.success("Configuration saved!");
      handleCloseModal();
      fetchInitialData();
      triggerCronReload();
    } catch (error: any) {
      showToast.error("Save Failed", error.message);
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    try {
      const response = await fetch(
        `/api/logging-configs/${configToDelete.id}`,
        {
          method: "DELETE",
        },
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete configuration.");
      }
      showToast.success("Configuration deleted!");
      fetchInitialData();
      triggerCronReload();
    } catch (error: any) {
      showToast.error("Deletion failed", error.message);
    } finally {
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
    }
  };

  // --- Download & Upload Handlers ---

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <FileClock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Logging Configuration
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Configure which data points to log from your MQTT devices
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Settings className="h-6 w-6 text-primary" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-muted-foreground">
                    Total Configs
                  </p>
                  <p className="text-2xl font-bold">{pagination?.totalCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-purple-500"
            onClick={() => setIntervalFilter("10")}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="h-6 w-6 text-purple-600" />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Standard Interval</p>
                  <p className="text-2xl font-bold">
                    {loggingConfigs.filter(c => c.loggingIntervalMinutes === 10).length}
                  </p>
                </div>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-emerald-500"
            onClick={() => setDeviceIdFilter("")}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-emerald-600" />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Devices Logged</p>
                  <p className="text-2xl font-bold">
                    {[...new Set(loggingConfigs.map(c => c.device.uniqId))].length}
                  </p>
                </div>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer hover:bg-muted/20 transition-colors border-l-4 ${conflictCount > 0 ? "border-l-orange-500 animate-pulse-slow" : "border-l-amber-500"}`}
            onClick={() => setConflictFilter(conflictFilter === "conflicts" ? "all" : "conflicts")}
          >
            <CardContent className="p-4">
              <div className="flex items-center">
                <Activity className={`h-6 w-6 ${conflictCount > 0 ? "text-orange-600" : "text-amber-600"}`} />
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-muted-foreground">Config Conflicts</p>
                  <div className="flex items-center gap-2">
                    <p className={`text-2xl font-bold ${conflictCount > 0 ? "text-orange-600" : ""}`}>
                      {conflictCount}
                    </p>
                    {conflictCount > 0 && (
                      <Badge variant="outline" className="text-[10px] h-4 bg-orange-50 text-orange-600 border-orange-200">
                        DUPLICATES
                      </Badge>
                    )}
                  </div>
                </div>
                <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {conflictCount > 0
                  ? "Configs sharing same display name on the same device"
                  : "No naming conflicts detected"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Search Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search configurations by name, device, or key..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2 items-center flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setDeviceIdFilter("");
                      setIntervalFilter("");
                    }}
                  >
                    Clear Filters
                  </Button>
                  <ImportExportButtons
                    exportUrl="/api/logging-configurations/export"
                    importUrl="/api/logging-configurations/import"
                    onImportSuccess={fetchInitialData}
                    itemName="Logging Configs"
                  />
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-48">
                  <Select
                    value={deviceIdFilter || "all"}
                    onValueChange={(value) =>
                      setDeviceIdFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <Database className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by device" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Devices</SelectItem>
                      {allDevices.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:w-56">
                  <Select value={conflictFilter} onValueChange={setConflictFilter}>
                    <SelectTrigger>
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Show All Configs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Configurations</SelectItem>
                      <SelectItem value="conflicts" className="text-orange-600 font-semibold">
                        Conflicts (Duplicate Display Name)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:w-48">
                  <Select
                    value={intervalFilter || "all"}
                    onValueChange={(value) =>
                      setIntervalFilter(value === "all" ? "" : value)
                    }
                  >
                    <SelectTrigger>
                      <Clock className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Intervals</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">60 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || deviceIdFilter || intervalFilter || conflictFilter !== "all") && (
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <span className="text-sm text-muted-foreground">
                    Active filters:
                  </span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Search: "{searchTerm}"
                      <button
                        onClick={() => setSearchTerm("")}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {deviceIdFilter && (
                    <Badge variant="secondary" className="gap-1">
                      Device:{" "}
                      {allDevices.find((d) => d.uniqId === deviceIdFilter)
                        ?.name || deviceIdFilter}
                      <button
                        onClick={() => setDeviceIdFilter("")}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {intervalFilter && (
                    <Badge variant="secondary" className="gap-1">
                      Interval: {intervalFilter} minutes
                      <button
                        onClick={() => setIntervalFilter("")}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {conflictFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                      Conflict: {conflictFilter === 'conflicts' ? 'Duplicate Display Name' : conflictFilter}
                      <button
                        onClick={() => setConflictFilter("all")}
                        className="ml-1 hover:bg-orange-200 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Configuration Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-xl">
                  Logging Keys Configuration
                </CardTitle>
                <CardDescription>
                  Manage which data points are being logged from your devices
                </CardDescription>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchInitialData}
                  disabled={isLoading}
                  className="whitespace-nowrap"
                >
                  <RefreshCw
                    className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""
                      }`}
                  />
                  Refresh
                </Button>
                {!menuLoading && canCreate && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenModal("add")}
                    className="bg-primary hover:bg-primary/90 whitespace-nowrap"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Configuration
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-700">
                    <TableHead className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-transparent"
                        onClick={() => handleSort("deviceUniqId")}
                      >
                        Device {getSortIcon("deviceUniqId")}
                      </Button>
                    </TableHead>
                    <TableHead className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-transparent"
                        onClick={() => handleSort("customName")}
                      >
                        Configuration {getSortIcon("customName")}
                      </Button>
                    </TableHead>
                    <TableHead className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-transparent"
                        onClick={() => handleSort("key")}
                      >
                        Data Key {getSortIcon("key")}
                      </Button>
                    </TableHead>
                    <TableHead className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-transparent"
                        onClick={() => handleSort("loggingIntervalMinutes")}
                      >
                        Interval {getSortIcon("loggingIntervalMinutes")}
                      </Button>
                    </TableHead>
                    <TableHead className="py-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="-ml-3 font-semibold text-slate-700 dark:text-slate-300 hover:bg-transparent"
                        onClick={() => handleSort("createdAt")}
                      >
                        Created At {getSortIcon("createdAt")}
                      </Button>
                    </TableHead>
                    <TableHead className="py-4 font-semibold text-slate-700 dark:text-slate-300">
                      Live Status
                    </TableHead>
                    {hasActionPermissions && (
                      <TableHead className="text-right font-semibold text-slate-700 dark:text-slate-300 py-4">
                        Actions
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={hasActionPermissions ? 7 : 6}
                        className="text-center h-48"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 animate-spin text-primary" />
                          <p className="text-muted-foreground">
                            Loading configurations...
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : loggingConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={hasActionPermissions ? 7 : 6}
                        className="text-center h-48"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <Settings className="h-12 w-12 text-muted-foreground/50" />
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">
                              No configurations available
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Add your first logging configuration to get
                              started
                            </p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : processedConfigs.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={hasActionPermissions ? 7 : 6}
                        className="py-12"
                      >
                        <div className="flex flex-col items-center justify-center space-y-3 text-center">
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                            <Database className="h-6 w-6 text-slate-400" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-muted-foreground font-medium">
                              No configurations matching filters
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Try adjusting your search or conflict filters
                            </p>
                          </div>
                          {(searchTerm || deviceIdFilter || intervalFilter || conflictFilter !== "all") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setDeviceIdFilter("");
                                setIntervalFilter("");
                                setConflictFilter("all");
                              }}
                            >
                              Clear All Filters
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedConfigs.map((config) => (
                      <TableRow
                        key={config.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors duration-200 group"
                      >
                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900 dark:text-slate-100">
                              {config.device.name}
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="text-xs font-mono bg-slate-100 text-slate-600 border-slate-200"
                              >
                                {config.device.topic}
                              </Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => {
                                      navigator.clipboard.writeText(config.device.topic);
                                      showToast.success("Topic copied to clipboard");
                                    }}
                                  >
                                    <Copy className="h-3 w-3 text-muted-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Copy topic</TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-slate-900 dark:text-slate-100">
                                {config.customName}
                              </p>
                              {config.hasNameConflict && (
                                <Badge variant="secondary" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] h-4 px-1.5 py-0">
                                  Duplicate Name
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {config.units && (
                                <Badge variant="secondary" className="text-xs">
                                  {config.units}
                                </Badge>
                              )}
                              {config.multiply && config.multiply !== 1 && (
                                <Badge variant="outline" className="text-xs">
                                  ×{config.multiply}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded border font-mono">
                              {config.key}
                            </code>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => {
                                    navigator.clipboard.writeText(config.key);
                                    showToast.success("Key copied to clipboard");
                                  }}
                                >
                                  <Copy className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Copy key</TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {config.loggingIntervalMinutes}m
                          </Badge>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center text-slate-700 dark:text-slate-300 font-medium">
                              <Calendar className="h-3 w-3 mr-1.5 opacity-70" />
                              {config.createdAt ? new Date(config.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </div>
                            <span className="ml-[18px] opacity-70 text-[10px]">
                              {config.createdAt ? new Date(config.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          {payloads[config.device.topic] ? (
                            <div
                              className="flex flex-col gap-1 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => setLiveStatusDialog({ isOpen: true, config: config, payload: payloads[config.device.topic] })}
                              title="Click to view full payload"
                            >
                              <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 w-fit">
                                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                                Active
                              </Badge>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Activity className="h-2.5 w-2.5 text-blue-500" />
                                <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[150px]">
                                  {typeof payloads[config.device.topic] === 'object'
                                    ? 'Data received'
                                    : String(payloads[config.device.topic]).substring(0, 20)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-slate-200 text-xs">
                              Waiting...
                            </Badge>
                          )}
                        </TableCell>

                        {hasActionPermissions && (
                          <TableCell className="text-right py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-100 dark:hover:bg-slate-800">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                {!menuLoading && canUpdate && (
                                  <DropdownMenuItem onClick={() => handleOpenModal("edit", config)} className="text-xs cursor-pointer">
                                    <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                    Edit Config
                                  </DropdownMenuItem>
                                )}
                                {!menuLoading && canCreate && (
                                  <DropdownMenuItem onClick={() => handleDuplicateConfig(config)} className="text-xs cursor-pointer">
                                    <Copy className="mr-2 h-4 w-4 text-emerald-600" />
                                    Duplicate Config
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchLogs(config)} className="text-xs cursor-pointer">
                                  <List className="mr-2 h-4 w-4 text-indigo-600" />
                                  View Log Details
                                </DropdownMenuItem>
                                {!menuLoading && canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => {
                                        setConfigToDelete(config);
                                        setIsDeleteAlertOpen(true);
                                      }}
                                      className="text-xs text-red-600 focus:bg-red-50 focus:text-red-700 dark:focus:bg-red-900/20 cursor-pointer"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Config
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {/* Advanced Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <CardFooter className="flex items-center justify-between p-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium">
                    {(pagination.page - 1) * 10 + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(pagination.page * 10, pagination.totalCount)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium">{pagination.totalCount}</span>{" "}
                  entries
                </div>
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(1)}
                        disabled={pagination.page === 1}
                        className="h-8 w-8"
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>First page</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!pagination.hasPrevPage}
                        className="h-8 w-8"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous page</TooltipContent>
                  </Tooltip>
                  {/* Dynamic Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1,
                    ).map((page) => {
                      const shouldShow =
                        page === 1 ||
                        page === pagination.totalPages ||
                        (page >= pagination.page - 1 &&
                          page <= pagination.page + 1);

                      if (
                        !shouldShow &&
                        page !== 2 &&
                        page !== pagination.totalPages - 1
                      ) {
                        return null;
                      }
                      if (
                        (page === 2 && pagination.page - 1 > 2) ||
                        (page === pagination.totalPages - 1 &&
                          pagination.page + 1 < pagination.totalPages - 1)
                      ) {
                        return (
                          <span
                            key={`dots-${page}`}
                            className="px-2 text-muted-foreground"
                          >
                            ...
                          </span>
                        );
                      }
                      return (
                        <Button
                          key={page}
                          variant={
                            pagination.page === page ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="h-8 min-w-8"
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, pagination.totalPages),
                          )
                        }
                        disabled={!pagination.hasNextPage}
                        className="h-8 w-8"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next page</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentPage(pagination.totalPages)}
                        disabled={pagination.page === pagination.totalPages}
                        className="h-8 w-8"
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Last page</TooltipContent>
                  </Tooltip>
                </div>
              </CardFooter>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Configuration Dialog */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && handleCloseModal()}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isUpdateMode
                ? "Edit Logging Configuration"
                : "Add New Logging Configuration"}
            </DialogTitle>
            <DialogDescription>
              Configure which data points from your MQTT devices should be
              logged
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="device-select" className="text-sm font-medium">
                Select Device *
              </Label>
              <Select
                onValueChange={handleDeviceSelectInModal}
                value={selectedDeviceForModal?.uniqId || ""}
                disabled={isUpdateMode}
              >
                <SelectTrigger id="device-select" className="h-10">
                  <SelectValue placeholder="Choose a device to configure..." />
                </SelectTrigger>
                <SelectContent>
                  <div className="p-2 border-b">
                    <Input
                      placeholder="Search device..."
                      value={deviceSearch}
                      onChange={(e) => setDeviceSearch(e.target.value)}
                      onKeyDown={(e) => e.stopPropagation()}
                      className="h-8 text-sm"
                    />
                  </div>
                  {allDevices
                    .filter(
                      (d) =>
                        d.name
                          .toLowerCase()
                          .includes(deviceSearch.toLowerCase()) ||
                        d.topic
                          .toLowerCase()
                          .includes(deviceSearch.toLowerCase()),
                    )
                    .map((d) => (
                      <SelectItem key={d.uniqId} value={d.uniqId}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium">{d.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {d.topic}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  {allDevices.filter(
                    (d) =>
                      d.name
                        .toLowerCase()
                        .includes(deviceSearch.toLowerCase()) ||
                      d.topic
                        .toLowerCase()
                        .includes(deviceSearch.toLowerCase()),
                  ).length === 0 && (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No device found
                      </div>
                    )}
                </SelectContent>
              </Select>
            </div>

            {selectedDeviceForModal && (
              <div className="space-y-2">
                <Label htmlFor="key-select" className="text-sm font-medium">
                  Select Data Key *
                </Label>
                <Select
                  onValueChange={(val) =>
                    setCurrentConfig((prev) => ({ ...prev, key: val }))
                  }
                  value={currentConfig.key || ""}
                  disabled={isPayloadLoading || availableKeys.length === 0}
                >
                  <SelectTrigger id="key-select" className="h-10">
                    <SelectValue
                      placeholder={
                        isPayloadLoading
                          ? "Waiting for device data..."
                          : "Choose a data key to log..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {isPayloadLoading ? (
                      <div className="p-4 flex flex-col items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <p className="text-sm text-center text-muted-foreground">
                          Waiting for real-time data from device...
                        </p>
                        <p className="text-xs text-muted-foreground/80">
                          Make sure {selectedDeviceForModal?.name} is connected
                          and sending data
                        </p>
                      </div>
                    ) : availableKeys.length > 0 ? (
                      availableKeys.map((k) => (
                        <SelectItem key={k} value={k}>
                          <div className="flex items-center justify-between">
                            <code className="font-mono">{k}</code>
                            {currentConfig.key === k && (
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                            )}
                          </div>
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 flex flex-col items-center gap-2">
                        <XCircle className="h-8 w-8 text-muted-foreground/50" />
                        <p className="text-sm text-center text-muted-foreground">
                          No data available from this device
                        </p>
                        <p className="text-xs text-center text-muted-foreground/70">
                          Ensure the device is connected and actively publishing
                          data
                        </p>
                      </div>
                    )}
                  </SelectContent>
                </Select>
                {selectedDeviceForModal && isPayloadLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>
                      Listening for live data from {selectedDeviceForModal.name}
                      ...
                    </span>
                  </div>
                ) : availableKeys.length > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>
                      {availableKeys.length} keys available • Select one to log
                    </span>
                  </div>
                ) : null}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="custom-name" className="text-sm font-medium">
                Display Name *
              </Label>
              <Input
                id="custom-name"
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                placeholder="e.g., Server Room Temperature"
                className="h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="units" className="text-sm font-medium">
                  Units (Optional)
                </Label>
                <Input
                  id="units"
                  value={currentConfig.units || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      units: e.target.value,
                    }))
                  }
                  placeholder="e.g., °C, %, V, A"
                  className="h-10"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="multiply" className="text-sm font-medium">
                  Multiplier (Optional)
                </Label>
                <Input
                  id="multiply"
                  type="number"
                  step="any"
                  value={currentConfig.multiply ?? 1}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      multiply: parseFloat(e.target.value) || 1,
                    }))
                  }
                  placeholder="e.g., 0.1, 100"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Factor to multiply the raw value (default: 1)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Logging Interval *
              </Label>

              <div className="grid grid-cols-6 gap-2">
                {[1, 5, 10, 15, 30, 60].map((minutes) => (
                  <Button
                    key={minutes}
                    type="button"
                    variant={
                      currentConfig.loggingIntervalMinutes === minutes
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    onClick={() =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        loggingIntervalMinutes: minutes,
                      }))
                    }
                    className="text-xs"
                  >
                    {minutes}m
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Label htmlFor="interval" className="text-sm whitespace-nowrap">
                  Custom:
                </Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  max="1440"
                  value={currentConfig.loggingIntervalMinutes ?? 10}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      loggingIntervalMinutes: parseInt(e.target.value) || 10,
                    }))
                  }
                  className="h-9"
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  minutes
                </span>
              </div>
            </div>

            {selectedDeviceForModal && currentConfig.key && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Configuration Preview
                </Label>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Device:</span>
                    <span className="font-medium">
                      {selectedDeviceForModal.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Data Key:</span>
                    <code className="px-1.5 py-0.5 bg-background rounded text-xs">
                      {currentConfig.key}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Display Name:</span>
                    <span className="font-medium">
                      {currentConfig.customName || "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Log Interval:</span>
                    <Badge variant="secondary" className="text-xs">
                      Every {currentConfig.loggingIntervalMinutes || 10} minutes
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSave}
              disabled={
                !selectedDeviceForModal ||
                !currentConfig.key ||
                !currentConfig.customName
              }
            >
              {isUpdateMode ? "Update Configuration" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Live Data Dialog */}
      <Dialog
        open={liveStatusDialog.isOpen}
        onOpenChange={(isOpen) =>
          setLiveStatusDialog((prev) => ({ ...prev, isOpen }))
        }
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              Live Data Payload
            </DialogTitle>
            <DialogDescription>
              Real-time data received from{" "}
              <span className="font-mono text-foreground font-medium">{liveStatusDialog.config?.device.topic}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-950 p-4 rounded-md overflow-x-auto max-h-[60vh] overflow-y-auto">
            <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
              {liveStatusDialog.payload
                ? JSON.stringify(liveStatusDialog.payload, null, 2)
                : "No payload available"}
            </pre>
          </div>

          <DialogFooter>
            <Button onClick={() => setLiveStatusDialog({ isOpen: false, config: null, payload: null })} variant="secondary">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Logs Detail Dialog */}
      <Dialog
        open={viewLogsDialog.isOpen}
        onOpenChange={(isOpen) => setViewLogsDialog(prev => ({ ...prev, isOpen }))}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5 text-primary" />
              Log Details: {viewLogsDialog.config?.customName}
            </DialogTitle>
            <DialogDescription>
              Historical data successfully saved for this configuration.
              Data Key: <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{viewLogsDialog.config?.key}</code>
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto min-h-[300px]">
            {viewLogsDialog.isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewLogsDialog.logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                        No logs recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    viewLogsDialog.logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {new Date(log.timestamp).toLocaleString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit', second: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-mono">{log.value}</TableCell>
                        <TableCell>{viewLogsDialog.config?.units || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Pagination Controls */}
          {viewLogsDialog.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t mt-auto">
              <div className="text-xs text-muted-foreground">
                Showing page {viewLogsDialog.pagination.page} of {viewLogsDialog.pagination.totalPages} ({viewLogsDialog.pagination.totalCount} total)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={viewLogsDialog.pagination.page <= 1}
                  onClick={() => viewLogsDialog.config && fetchLogs(viewLogsDialog.config, viewLogsDialog.pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={viewLogsDialog.pagination.page >= viewLogsDialog.pagination.totalPages}
                  onClick={() => viewLogsDialog.config && fetchLogs(viewLogsDialog.config, viewLogsDialog.pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the logging configuration for "
              {configToDelete?.customName}"? This action cannot be undone and will
              stop logging this data point.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfigToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

// =================================================================
// INI KOMPONEN HALAMAN UTAMA YANG SEKARANG MENYEDIAKAN PROVIDER
// =================================================================
export default function DevicesForLoggingPage() {
  return (
    <MqttServerProvider>
      <DevicesForLoggingContent />
    </MqttServerProvider>
  );
}
