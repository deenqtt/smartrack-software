// File: BillCalculationTab.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, FormEvent, useRef } from "react";
import { showToast } from "@/lib/toast-utils";
import { MqttServerProvider, useMqttServer } from "@/contexts/MqttServerProvider";
import { useSortableTable } from "@/hooks/use-sort-table";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  PlusCircle,
  Edit,
  Trash2,
  Loader2,
  Search,
  Calculator,
  RefreshCw,
  DollarSign,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  Database,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Check,
  FileDown,
  FileUp,
  Users,
} from "lucide-react";
import { OwnershipManagement } from "./OwnershipManagement";
// --- Type Definitions ---
interface DeviceSelection {
  id: string; // Ini uniqId
  uniqId: string;
  name: string;
  topic: string;
  lastPayload?: Record<string, any>;
  lastUpdatedByMqtt?: string;
}

interface BillConfig {
  id: string;
  customName: string;
  sourceDevice: DeviceSelection;
  sourceDeviceKey: string;
  rupiahRatePerKwh: number;
  dollarRatePerKwh: number;
  carbonRateKgPerKwh: number;
}

interface BillLog {
  id: string;
  config: { customName: string };
  rawValue: number;
  rupiahCost: number;
  dollarCost: number;
  timestamp: string;
}

const CARBON_GRID_FACTORS = [
  { id: "jamali", name: "JAMALI (Jawa, Madura, Bali)", value: 0.87, description: "0.87 - 0.89" },
  { id: "sumatera", name: "Sumatera", value: 0.75, description: "0.75 - 0.80" },
  { id: "kalimantan", name: "Kalimantan", value: 0.90, description: "0.90 - 1.10" },
  { id: "sulawesi", name: "Sulawesi", value: 0.60, description: "0.60 - 0.70" },
  { id: "papua_maluku", name: "Papua & Maluku", value: 1.00, description: "1.00 - 1.15" },
  { id: "custom", name: "Custom / Others", value: 0.85, description: "Manual" }
];

// --- Toast Configuration ---

export function BillCalculationTab() {
  const { isReady, subscribe, unsubscribe, brokers } = useMqttServer();
  const activeBrokerId = useMemo(() => {
    return brokers.find(b => b.status === 'connected')?.id;
  }, [brokers]);

  const [configs, setConfigs] = useState<BillConfig[]>([]);
  const [allLogs, setAllLogs] = useState<BillLog[]>([]);
  const [externalDevices, setExternalDevices] = useState<DeviceSelection[]>([]);
  const [liveValues, setLiveValues] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | "">("");

  // --- State untuk Pagination ---
  const [logsPage, setLogsPage] = useState(1);
  const LOGS_PER_PAGE = 10;

  // --- Modal State ---
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);
  const [selectedConfigForOwnership, setSelectedConfigForOwnership] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportReport = async () => {
    try {
      const res = await fetch(`/api/bill-configs/export-all-reports`);
      if (!res.ok) throw new Error("Report export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-report-all-${new Date().toISOString()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast.success("Report exported successfully!");
    } catch (error: any) {
      showToast.error(`Failed to export report: ${error.message}`);
    }
  };
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<
    Partial<BillConfig & { sourceDeviceUniqId: string }>
  >({});
  const [selectedDeviceForModal, setSelectedDeviceForModal] =
    useState<DeviceSelection | null>(null);
  const [payloadKeys, setPayloadKeys] = useState<string[]>([]);

  // --- Combobox State ---
  const [deviceOpen, setDeviceOpen] = useState(false);

  // --- NEW: State untuk Loading/Disable Buttons ---
  const [isSubmitting, setIsSubmitting] = useState(false); // Untuk Add/Edit Save button
  const [isDeletingConfig, setIsDeletingConfig] = useState(false); // Untuk Delete Config button
  const [isDeletingAllLogs, setIsDeletingAllLogs] = useState(false); // Untuk Delete All Logs button
  const [refreshing, setRefreshing] = useState(false);
  // --- Delete State ---
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<BillConfig | null>(null);
  const [isDeleteAllAlertOpen, setIsDeleteAllAlertOpen] = useState(false);

  // --- Logika untuk pagination di sisi klien ---
  const paginatedLogs = useMemo(() => {
    const startIndex = (logsPage - 1) * LOGS_PER_PAGE;
    const endIndex = startIndex + LOGS_PER_PAGE;
    return allLogs.slice(startIndex, endIndex);
  }, [allLogs, logsPage]);

  // --- Data Fetching ---
  const fetchInitialData = useCallback(async (shouldShowToast = false) => {
    try {
      if (shouldShowToast) {
        setRefreshing(true);
      }
      setIsLoading(true);

      const [configsRes, devicesRes, logsRes] = await Promise.all([
        fetch("/api/bill-configs"),
        fetch("/api/devices/for-selection?excludeVirtual=true"),
        fetch("/api/bill-logs"),
      ]);

      if (!configsRes.ok)
        throw new Error("Failed to fetch bill configurations.");
      if (!devicesRes.ok) throw new Error("Failed to fetch external devices.");
      if (!logsRes.ok) throw new Error("Failed to fetch bill logs.");

      const configsData = await configsRes.json();
      const devicesData: DeviceSelection[] = await devicesRes.json();
      const logsData = await logsRes.json();

      const formattedDevices: DeviceSelection[] = devicesData.map((device) => ({
        id: device.uniqId || device.id,
        uniqId: device.uniqId,
        name: device.name,
        topic: device.topic,
        lastPayload: device.lastPayload || {},
        lastUpdatedByMqtt: device.lastUpdatedByMqtt,
      }));
      setExternalDevices(formattedDevices);

      const initialLiveValues: Record<string, number> = {};
      configsData.forEach((config: BillConfig) => {
        const correspondingDevice = formattedDevices.find(
          (d) => d.id === config.sourceDevice.id
        );
        if (
          correspondingDevice &&
          correspondingDevice.lastPayload &&
          config.sourceDeviceKey in correspondingDevice.lastPayload
        ) {
          const val = parseFloat(
            correspondingDevice.lastPayload[config.sourceDeviceKey]
          );
          if (!isNaN(val)) {
            initialLiveValues[config.id] = val;
          }
        }
      });
      setLiveValues(initialLiveValues);

      setConfigs(configsData);

      if (Array.isArray(logsData)) {
        setAllLogs(logsData);
      } else {
        console.error("Expected an array for logs, but received:", logsData);
        setAllLogs([]);
      }

      if (shouldShowToast) {
        showToast.success(
          `Refreshed`,
          `${configsData.length} bill configurations loaded`
        );
      }
    } catch (error: any) {
      console.error("Error fetching initial data:", error);
      showToast.error(`Failed to fetch initial data: ${error.message}`);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // Effect to listen for global data changes and reload
  useEffect(() => {
    const handleDataChange = () => {
      console.log("[BillCalculationTab] Detected global data change, reloading...");
      fetchInitialData(false); // Fetch without showing toast
    };

    window.addEventListener("power-analyzer-data-changed", handleDataChange);

    return () => {
      window.removeEventListener("power-analyzer-data-changed", handleDataChange);
    };
  }, [fetchInitialData]);

  useEffect(() => {
    if (!isReady || configs.length === 0 || !activeBrokerId) return; // Added activeBrokerId check

    const handleMessage = (topic: string, payloadStr: string) => {
      // Use filter() — multiple configs can share the same source topic
      // (e.g. two bill configs reading different keys from the same PDU device)
      const relevantConfigs = configs.filter(
        (c) => c.sourceDevice.topic === topic
      );

      if (relevantConfigs.length === 0) return;

      try {
        const payload = JSON.parse(payloadStr);
        let innerValue: Record<string, any> = {};

        if (payload.value && typeof payload.value === "string") {
          try {
            innerValue = JSON.parse(payload.value);
          } catch (e) {
            console.warn(
              `[BillTab MQTT] 'value' field is not valid JSON for topic ${topic}. Falling back to outer payload.`
            );
            innerValue = payload;
          }
        } else if (payload.value && typeof payload.value === "object") {
          innerValue = payload.value;
        } else {
          innerValue = payload;
        }

        // Update live value for every config that listens to this topic
        const updates: Record<string, number> = {};
        for (const cfg of relevantConfigs) {
          const value = parseFloat(innerValue[cfg.sourceDeviceKey]);
          if (!isNaN(value)) {
            updates[cfg.id] = value;
          } else {
            console.warn(
              `[BillTab MQTT] Key "${cfg.sourceDeviceKey}" has non-numeric value for config ${cfg.customName}`
            );
          }
        }

        if (Object.keys(updates).length > 0) {
          setLiveValues((prev) => ({ ...prev, ...updates }));
        }
      } catch (e) {
        console.error(
          `[BillTab MQTT] Error processing MQTT message for topic ${topic}:`,
          e
        );
      }
    };

    const topicsToSubscribe = [

      ...new Set(configs.map((c) => c.sourceDevice.topic)),

    ];

    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMessage, activeBrokerId)); // Pass activeBrokerId

    return () => {

      topicsToSubscribe.forEach((topic) => unsubscribe(topic, handleMessage, activeBrokerId)); // Pass activeBrokerId

    };

  }, [isReady, configs, subscribe, unsubscribe, activeBrokerId]); // Added activeBrokerId to dependencies

  useEffect(() => {
    if (!isModalOpen || !selectedDeviceForModal || !isReady || !activeBrokerId) return; // Added activeBrokerId check

    const topic = selectedDeviceForModal.topic;

    //  Set initial payload keys from lastPayload (untuk edit mode)
    if (selectedDeviceForModal.lastPayload) {
      const payload = selectedDeviceForModal.lastPayload;
      let keys: string[] = [];

      if (payload.value && typeof payload.value === "string") {
        try {
          const innerValue = JSON.parse(payload.value);
          keys = Object.keys(innerValue);
        } catch (e) {
          keys = Object.keys(payload);
        }
      } else if (payload.value && typeof payload.value === "object") {
        keys = Object.keys(payload.value);
      } else {
        keys = Object.keys(payload);
      }

      setPayloadKeys(keys);
    }

    // Subscribe untuk update real-time
    const handleMessage = (msgTopic: string, payloadStr: string) => {
      if (msgTopic === topic) {
        try {
          const payload = JSON.parse(payloadStr);
          let innerValue: Record<string, any> = {};
          if (payload.value && typeof payload.value === "string") {
            try {
              innerValue = JSON.parse(payload.value);
            } catch (e) {
              console.warn(
                `[BillTab Modal MQTT] Warning: 'value' field is not valid JSON string for topic ${topic}. Falling back to outer payload.`
              );
              innerValue = payload;
            }
          } else if (payload.value && typeof payload.value === "object") {
            innerValue = payload.value;
          } else {
            innerValue = payload;
          }
          setPayloadKeys(Object.keys(innerValue));
        } catch (e) {
          console.error(
            `[BillTab Modal MQTT] Error parsing payload for key selection:`,
            e
          );
          setPayloadKeys([]);
        }
      }
    };

    subscribe(topic, handleMessage, activeBrokerId); // Pass activeBrokerId
    return () => {
      unsubscribe(topic, handleMessage, activeBrokerId); // Pass activeBrokerId
    };
  }, [isModalOpen, selectedDeviceForModal, isReady, subscribe, unsubscribe, activeBrokerId]); // Added activeBrokerId to dependencies

  const handleDeviceChange = (uniqId: string) => {
    const device = externalDevices.find((d) => d.id === uniqId);
    setSelectedDeviceForModal(device || null);
    setCurrentConfig((prev) => ({
      ...prev,
      sourceDeviceUniqId: uniqId,
      sourceDeviceKey: undefined,
    }));
    setPayloadKeys(Object.keys(device?.lastPayload || {}));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (
      !currentConfig.customName ||
      !currentConfig.sourceDeviceUniqId ||
      !currentConfig.sourceDeviceKey
    ) {
      showToast.error("Please fill all required fields.");
      return;
    }

    setIsSubmitting(true); // NEW: Set loading state to true

    const url = isEditMode
      ? `/api/bill-configs/${currentConfig.id}`
      : "/api/bill-configs";
    const method = isEditMode ? "PUT" : "POST";
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentConfig),
      });
      if (!response.ok) throw new Error((await response.json()).message);

      const savedConfig = await response.json();

      showToast.success(`Configuration ${isEditMode ? "updated" : "saved"}!`);
      setIsModalOpen(false);

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      // --- PERUBAHAN: Panggil API untuk log pertama kali setelah add ---
      // (Ini jika Anda ingin log segera setelah save, jika tidak biarkan MQTT Listener yang log)
      if (!isEditMode) {
        await fetch("/api/bill-logs/log-once", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ configId: savedConfig.id }),
        });
      }

      fetchInitialData();
    } catch (error: any) {
      showToast.error(error.message);
    } finally {
      setIsSubmitting(false); // NEW: Set loading state to false
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true); // NEW: Set loading state for delete

    try {
      const response = await fetch(`/api/bill-configs/${configToDelete.id}`, {
        method: "DELETE",
      });
      if (response.status !== 204)
        throw new Error((await response.json()).message);

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      fetchInitialData();
    } catch (error: any) {
      showToast.error(error.message);
    } finally {
      setIsDeletingConfig(false); // NEW: Set loading state to false
      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    setIsDeletingAllLogs(true); // NEW: Set loading state for delete all logs
    try {
      const response = await fetch(`/api/bill-logs/delete-all`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error(
          (await response.json()).message || "Failed to delete logs."
        );
      }
      const result = await response.json();
      showToast.success(result.message);
      setAllLogs([]);
      setLogsPage(1);
    } catch (error: any) {
      showToast.error(error.message);
    } finally {
      setIsDeletingAllLogs(false); // NEW: Set loading state to false
      setIsDeleteAllAlertOpen(false);
    }
  };

  const formatNumber = (value: number | undefined | null) => {
    if (value === null || value === undefined) return "0.00";
    return value.toLocaleString("id-ID", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const calculateCost = (value: number | undefined | null, rate: number) => {
    if (value === null || value === undefined) return 0;
    const energyKwh = (value * 1) / 1000;
    return energyKwh * rate;
  };

  const filteredConfigs = useMemo(
    () =>
      configs.filter((c) =>
        c.customName.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [configs, searchQuery]
  );
  const resetForm = () => {
    setCurrentConfig({
      rupiahRatePerKwh: 1114.74, // PLN B-3 tariff (data center / >200kVA)
      dollarRatePerKwh: 0.069,   // USD equivalent at ~Rp 16,000/USD
      carbonRateKgPerKwh: 0.87,  // JAMALI grid factor (kgCO2e/kWh)
    });
    setSelectedDeviceForModal(null);
    setPayloadKeys([]);
  };

  const openAddModal = () => {
    resetForm();
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/bill-configs/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-configs-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast.success("Configurations exported successfully!");
    } catch (error: any) {
      showToast.error(`Failed to export configurations: ${error.message}`);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const configsToImport = JSON.parse(event.target?.result as string);
          const res = await fetch("/api/bill-configs/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configsToImport),
          });
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.message || "Import failed.");
          }
          showToast.success(`Imported ${result.imported} configs. Skipped ${result.skipped}.`);
          fetchInitialData(); // Use fetchInitialData instead of fetchConfigs
        } catch (err: any) {
          showToast.error(`Invalid JSON file or import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      showToast.error(`Failed to import configurations: ${error.message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Clear the file input
      }
    }
  };

  const openOwnershipModal = (config: BillConfig) => {
    setSelectedConfigForOwnership(config);
    setIsOwnershipModalOpen(true);
  };

  const openEditModal = (item: BillConfig) => {
    // Set edit mode
    setIsEditMode(true);

    // Find device
    const deviceInEdit = externalDevices.find(
      (d) => d.id === item.sourceDevice.id
    );

    // Set device for modal (will trigger MQTT subscription)
    setSelectedDeviceForModal(deviceInEdit || null);

    // Extract payload keys (handle nested value structure)
    let keys: string[] = [];
    if (deviceInEdit?.lastPayload) {
      const payload = deviceInEdit.lastPayload;
      if (payload.value && typeof payload.value === "string") {
        try {
          const innerValue = JSON.parse(payload.value);
          keys = Object.keys(innerValue);
        } catch (e) {
          keys = Object.keys(payload);
        }
      } else if (payload.value && typeof payload.value === "object") {
        keys = Object.keys(payload.value);
      } else {
        keys = Object.keys(payload);
      }
    }
    setPayloadKeys(keys);

    // Set current config with all data
    setCurrentConfig({
      ...item,
      sourceDeviceUniqId: item.sourceDevice.id,
      sourceDeviceKey: item.sourceDeviceKey, //  Auto-select key
    });

    // Open modal
    setIsModalOpen(true);
  };

  const handleDeleteClick = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (config) {
      setConfigToDelete(config);
      setIsDeleteAlertOpen(true);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bill Calculation</h1>
          <p className="text-muted-foreground">
            Monitor and calculate electricity costs in real-time
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isLoading}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleExportReport}
            variant="outline"
            disabled={isLoading}
          >
            <Database className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={openAddModal}
            disabled={isLoading}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Configuration
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Configurations</p>
                <p className="text-3xl font-bold">{configs.length}</p>
              </div>
              <Calculator className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Live Data Points</p>
                <p className="text-3xl font-bold">
                  {Object.keys(liveValues).length}
                </p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-3xl font-bold">{allLogs.length}</p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Cost (IDR/h)</p>
                <p className="text-3xl font-bold">
                  {configs.length > 0
                    ? formatNumber(
                      configs.reduce((sum, config) => {
                        const cost = calculateCost(
                          liveValues[config.id],
                          config.rupiahRatePerKwh
                        );
                        return sum + (cost || 0);
                      }, 0) / configs.length
                    )
                    : "0.00"}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search configurations by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="w-full md:w-64">
          <SearchableSelect
            value={itemsPerPage.toString()}
            onValueChange={(value) => setItemsPerPage(Number(value))}
            placeholder="Items per page"
            options={[
              { label: "5 per page", value: "5" },
              { label: "10 per page", value: "10" },
              { label: "20 per page", value: "20" },
              { label: "50 per page", value: "50" },
            ]}
          />
        </div>
      </div>

      {/* Results info */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground font-medium">
          Showing {filteredConfigs.length} of {configs.length} configurations
        </span>
        <Button
          variant="outline"
          onClick={() => fetchInitialData(true)}
          disabled={refreshing || isLoading}
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSortDirection(
                        sortDirection === "asc" ? "desc" : "asc"
                      );
                      setSortKey("customName");
                    }}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Custom Name
                    {sortKey === "customName" ? (
                      sortDirection === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                      ) : sortDirection === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                      ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      )
                    ) : (
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                  </Button>
                </TableHead>
                <TableHead>Source Device</TableHead>
                <TableHead>Live Data (Watts)</TableHead>
                <TableHead>Cost (IDR/hour)</TableHead>
                <TableHead>Cost (USD/hour)</TableHead>
                <TableHead>Carbon (kg CO2e/h)</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-48">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filteredConfigs.length > 0 ? (
                filteredConfigs.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                        {item.customName}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{item.sourceDevice.name}</span>
                        <span className="text-xs">Key: {item.sourceDeviceKey}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-semibold">
                          {liveValues[item.id] !== undefined
                            ? formatNumber(liveValues[item.id])
                            : "..."}
                        </span>
                        <span className="text-xs text-muted-foreground">W</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono font-semibold text-green-600 dark:text-green-400">
                        Rp{" "}
                        {formatNumber(
                          calculateCost(
                            liveValues[item.id],
                            item.rupiahRatePerKwh
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono font-semibold text-blue-600 dark:text-blue-400">
                        ${" "}
                        {formatNumber(
                          calculateCost(
                            liveValues[item.id],
                            item.dollarRatePerKwh
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-mono font-semibold text-amber-600 dark:text-amber-400">
                        {formatNumber(
                          calculateCost(
                            liveValues[item.id],
                            item.carbonRateKgPerKwh
                          )
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openOwnershipModal(item)}
                          title="Manage Ownership"
                          disabled={
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          <Users className="h-4 w-4 text-blue-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(item)}
                          disabled={
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(item.id)}
                          disabled={
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center h-48 text-muted-foreground"
                  >
                    No configurations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {Math.ceil(allLogs.length / LOGS_PER_PAGE) > 1 && (
        <div className="flex items-center justify-between mt-4 px-4">
          <div className="text-sm text-muted-foreground">
            Page {logsPage} of {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev - 1)}
              disabled={
                logsPage === 1 ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page Numbers for History */}
            {Math.ceil(allLogs.length / LOGS_PER_PAGE) <= 7 ? (
              Array.from(
                { length: Math.ceil(allLogs.length / LOGS_PER_PAGE) },
                (_, i) => i + 1
              ).map((page) => (
                <Button
                  key={page}
                  variant={logsPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLogsPage(page)}
                  className="w-10 h-10 p-0"
                  disabled={
                    isLoading ||
                    isSubmitting ||
                    isDeletingConfig ||
                    isDeletingAllLogs
                  }
                >
                  {page}
                </Button>
              ))
            ) : (
              <>
                {logsPage <= 4 && (
                  <>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <Button
                        key={page}
                        variant={logsPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setLogsPage(page)}
                        className="w-10 h-10 p-0"
                        disabled={
                          isLoading ||
                          isSubmitting ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        {page}
                      </Button>
                    ))}
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLogsPage(Math.ceil(allLogs.length / LOGS_PER_PAGE))
                      }
                      className="w-10 h-10 p-0"
                      disabled={
                        isLoading ||
                        isSubmitting ||
                        isDeletingConfig ||
                        isDeletingAllLogs
                      }
                    >
                      {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                    </Button>
                  </>
                )}

                {logsPage > 4 &&
                  logsPage <
                  Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(1)}
                        className="w-10 h-10 p-0"
                        disabled={
                          isLoading ||
                          isSubmitting ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        1
                      </Button>
                      <span className="px-2 text-muted-foreground">...</span>
                      {[logsPage - 1, logsPage, logsPage + 1].map((page) => (
                        <Button
                          key={page}
                          variant={logsPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLogsPage(page)}
                          className="w-10 h-10 p-0"
                          disabled={
                            isLoading ||
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          {page}
                        </Button>
                      ))}
                      <span className="px-2 text-muted-foreground">...</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLogsPage(
                            Math.ceil(allLogs.length / LOGS_PER_PAGE)
                          )
                        }
                        className="w-10 h-10 p-0"
                        disabled={
                          isLoading ||
                          isSubmitting ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        {Math.ceil(allLogs.length / LOGS_PER_PAGE)}
                      </Button>
                    </>
                  )}

                {logsPage >=
                  Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3 && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(1)}
                        className="w-10 h-10 p-0"
                        disabled={
                          isLoading ||
                          isSubmitting ||
                          isDeletingConfig ||
                          isDeletingAllLogs
                        }
                      >
                        1
                      </Button>
                      <span className="px-2 text-muted-foreground">...</span>
                      {[
                        Math.ceil(allLogs.length / LOGS_PER_PAGE) - 4,
                        Math.ceil(allLogs.length / LOGS_PER_PAGE) - 3,
                        Math.ceil(allLogs.length / LOGS_PER_PAGE) - 2,
                        Math.ceil(allLogs.length / LOGS_PER_PAGE) - 1,
                        Math.ceil(allLogs.length / LOGS_PER_PAGE),
                      ].map((page) => (
                        <Button
                          key={page}
                          variant={logsPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setLogsPage(page)}
                          className="w-10 h-10 p-0"
                          disabled={
                            isLoading ||
                            isSubmitting ||
                            isDeletingConfig ||
                            isDeletingAllLogs
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </>
                  )}
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev + 1)}
              disabled={
                logsPage === Math.ceil(allLogs.length / LOGS_PER_PAGE) ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              }
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* History Table */}
      <Card className="mt-6">
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                Calculation History
              </CardTitle>
              <CardDescription>
                Historical record of electricity cost calculations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-blue-500 border-blue-200 hover:bg-blue-50"
                onClick={handleExportReport}
                disabled={isLoading || isSubmitting || allLogs.length === 0}
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export Report (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => setIsDeleteAllAlertOpen(true)}
                disabled={
                  isLoading ||
                  isSubmitting ||
                  isDeletingConfig ||
                  isDeletingAllLogs ||
                  allLogs.length === 0
                }
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All History
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Raw Value (W)</TableHead>
                  <TableHead>IDR Cost</TableHead>
                  <TableHead>USD Cost</TableHead>
                  <TableHead>Carbon (kg)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.length > 0 ? (
                  paginatedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>{log.config?.customName || "N/A"}</TableCell>
                      <TableCell>{formatNumber(log.rawValue)}</TableCell>
                      <TableCell>Rp {formatNumber(log.rupiahCost)}</TableCell>
                      <TableCell>$ {formatNumber(log.dollarCost)}</TableCell>
                      <TableCell>{formatNumber((log as any).carbonEmission)} kg</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No logs yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 border-t">
          <div className="text-xs text-muted-foreground">
            {allLogs.length === 0
              ? "No logs yet"
              : `Page ${logsPage} of ${Math.ceil(allLogs.length / LOGS_PER_PAGE)}`}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev - 1)}
              disabled={
                logsPage === 1 ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              } // NEW: Disable
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLogsPage((prev) => prev + 1)}
              disabled={
                logsPage >= Math.ceil(allLogs.length / LOGS_PER_PAGE) ||
                isLoading ||
                isSubmitting ||
                isDeletingConfig ||
                isDeletingAllLogs
              } // NEW: Disable
            >
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>

      {/* Dialog Form */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? "Edit" : "Add"} Bill Configuration
            </DialogTitle>
            <DialogDescription>
              Configure a new item for cost calculation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 pt-4">
            <div>
              <Label htmlFor="customName">Custom Name</Label>
              <Input
                id="customName"
                placeholder="e.g., Biaya Server Rack A"
                value={currentConfig.customName || ""}
                onChange={(e) =>
                  setCurrentConfig((prev) => ({
                    ...prev,
                    customName: e.target.value,
                  }))
                }
                required
                disabled={isSubmitting} // NEW: Disable input during submission
              />
            </div>
            <div>
              <Label>Select Device (Source)</Label>
              <Popover open={deviceOpen} onOpenChange={setDeviceOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={isSubmitting}
                    className="w-full justify-between font-normal"
                  >
                    <span className="truncate">
                      {currentConfig.sourceDeviceUniqId
                        ? externalDevices.find(
                          (d) => d.id === currentConfig.sourceDeviceUniqId
                        )?.name ?? "Select a device..."
                        : "Select a device..."}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search device..." />
                    <CommandEmpty>No device found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-y-auto">
                      {externalDevices.map((dev) => (
                        <CommandItem
                          key={dev.id}
                          value={dev.name}
                          onSelect={() => {
                            handleDeviceChange(dev.id);
                            setDeviceOpen(false);
                          }}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${currentConfig.sourceDeviceUniqId === dev.id
                              ? "opacity-100"
                              : "opacity-0"
                              }`}
                          />
                          {dev.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedDeviceForModal && (
              <div className="space-y-2">
                <Label>Select Data Key</Label>
                <SearchableSelect
                  onValueChange={(value: string) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      sourceDeviceKey: value,
                    }))
                  }
                  value={currentConfig.sourceDeviceKey || ""}
                  disabled={payloadKeys.length === 0 || isSubmitting}
                  placeholder={
                    payloadKeys.length > 0
                      ? "Search for a key..."
                      : "Waiting for payload..."
                  }
                  options={payloadKeys.map((key) => ({
                    label: key,
                    value: key,
                  }))}
                />
                {payloadKeys.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Listening for MQTT payload to discover keys...
                  </p>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IDR Rate (/kWh)</Label>
                <Input
                  type="number"
                  value={currentConfig.rupiahRatePerKwh || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      rupiahRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  disabled={isSubmitting} // NEW: Disable input during submission
                />
              </div>
              <div>
                <Label>USD Rate (/kWh)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={currentConfig.dollarRatePerKwh || ""}
                  onChange={(e) =>
                    setCurrentConfig((prev) => ({
                      ...prev,
                      dollarRatePerKwh: parseFloat(e.target.value) || 0,
                    }))
                  }
                  required
                  disabled={isSubmitting} // NEW: Disable input during submission
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Region Grid (EF Scope 2)</Label>
                <Select
                  onValueChange={(val) => {
                    const factor = CARBON_GRID_FACTORS.find(f => f.id === val);
                    if (factor && factor.id !== "custom") {
                      setCurrentConfig(prev => ({
                        ...prev,
                        carbonRateKgPerKwh: factor.value
                      }));
                    }
                  }}
                >
                  <SelectTrigger disabled={isSubmitting}>
                    <SelectValue placeholder="Select Region..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CARBON_GRID_FACTORS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        <div className="flex flex-col">
                          <span className="font-bold">{f.name}</span>
                          <span className="text-[10px] opacity-70 italic">{f.description} kg CO2e/kWh</span>
                        </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Carbon Rate (kg CO2/kWh)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={currentConfig.carbonRateKgPerKwh || ""}
                    onChange={(e) =>
                      setCurrentConfig((prev) => ({
                        ...prev,
                        carbonRateKgPerKwh: parseFloat(e.target.value) || 0,
                      }))
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting} // NEW: Disable cancel button during submission
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {isEditMode ? "Save Changes" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog Konfirmasi Hapus Config */}
      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={setIsDeleteAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the configuration for{" "}
              <b>{configToDelete?.customName}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingConfig || isDeletingAllLogs}
              onClick={() => setConfigToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingConfig || isDeletingAllLogs} // NEW: Disable delete button during its own operation
            >
              {isDeletingConfig ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Konfirmasi Hapus Semua Log */}
      <AlertDialog
        open={isDeleteAllAlertOpen}
        onOpenChange={setIsDeleteAllAlertOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all
              bill calculation logs from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingConfig || isDeletingAllLogs}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAllLogs}
              className="bg-red-600 hover:bg-red-700"
              disabled={isDeletingConfig || isDeletingAllLogs}
            >
              {isDeletingAllLogs ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Yes, delete all
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {selectedConfigForOwnership && (
        <OwnershipManagement
          isOpen={isOwnershipModalOpen}
          onClose={() => setIsOwnershipModalOpen(false)}
          configId={selectedConfigForOwnership.id}
          configName={selectedConfigForOwnership.customName}
          configType="bill"
          onUpdated={fetchInitialData}
        />
      )}
    </div>
  );
}
