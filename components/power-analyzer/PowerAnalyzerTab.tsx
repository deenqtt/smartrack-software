"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { showToast } from "@/lib/toast-utils";
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
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Loader2,
  HardDrive,
  Zap,
  Gauge,
  Calculator,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  ChevronsUpDown,
  Check,
  Database,
  FileDown,
  FileUp,
  Settings,
  ShieldAlert,
  Users,
  Edit2,
} from "lucide-react";
import { OwnershipManagement } from "./OwnershipManagement";

// Shadcn/UI & Custom Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelect } from "@/components/ui/multi-select";
import { useMqttServer } from "@/contexts/MqttServerProvider";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// --- Type Definitions (Tidak Berubah) ---
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
}
interface PduItem {
  uniqId: string;
  name: string;
  keys: string[];
}
interface MainPowerItem {
  uniqId: string;
  key: string;
}
interface PowerAnalyzerConfig {
  id: string;
  customName: string;
  pduList: PduItem[];
  mainPower: MainPowerItem;
  apiTopic: {
    uniqId: string;
    name: string;
    topic: string;
  };
}
interface SelectOption {
  value: string;
  label: string;
}

// --- Main Component ---
export function PowerAnalyzerTab() {
  // --- States ---
  const [configs, setConfigs] = useState<PowerAnalyzerConfig[]>([]);
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [liveData, setLiveData] = useState<{ [topic: string]: any }>({});
  const [modalSubscribedTopics, setModalSubscribedTopics] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);
  const [selectedConfigForOwnership, setSelectedConfigForOwnership] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // <-- State untuk disable tombol
  const [pduDeviceOpenMap, setPduDeviceOpenMap] = useState<Record<number, boolean>>({});
  const [mainPowerDeviceOpen, setMainPowerDeviceOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedConfig, setSelectedConfig] =
    useState<PowerAnalyzerConfig | null>(null);
  const [customName, setCustomName] = useState("");
  const [pduList, setPduList] = useState<
    { uniqId: string | null; keys: string[] }[]
  >([{ uniqId: null, keys: [] }]);
  const [mainPower, setMainPower] = useState<{
    uniqId: string | null;
    key: string | null;
  }>({ uniqId: null, key: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);


  // ... (Semua logika MQTT, data fetching, kalkulasi, dan helper lainnya tidak berubah)
  const { subscribe, unsubscribe, brokers } = useMqttServer();
  const activeBrokerId = useMemo(() => {
    return brokers.find((b) => b.status === "connected")?.id;
  }, [brokers]);
  const handleMqttMessage = useCallback((topic: string, payload: string) => {
    try {
      let parsedPayload = JSON.parse(payload);
      if (typeof parsedPayload.value === "string") {
        try {
          const nestedValue = JSON.parse(parsedPayload.value);
          parsedPayload = { ...parsedPayload, ...nestedValue };
        } catch (e) { }
      }
      setLiveData((prev) => ({ ...prev, [topic]: parsedPayload }));
    } catch (e) {
      console.error(`Failed to parse MQTT payload for topic ${topic}:`, e);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (!isModalOpen && modalSubscribedTopics.size > 0) {
        if (!activeBrokerId) return;
        modalSubscribedTopics.forEach((topic) =>
          unsubscribe(topic, handleMqttMessage, activeBrokerId)
        );
        setModalSubscribedTopics(new Set());
      }
    };
  }, [isModalOpen, modalSubscribedTopics, unsubscribe, handleMqttMessage, activeBrokerId]);
  useEffect(() => {
    if (!activeBrokerId) return;
    const allTopics = new Set<string>();
    configs.forEach((config) => {
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === config.mainPower.uniqId
      );
      if (mainPowerDevice) allTopics.add(mainPowerDevice.topic);
      config.pduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) allTopics.add(pduDevice.topic);
      });
    });
    const topicsToSubscribe = Array.from(allTopics);
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMqttMessage, activeBrokerId));
    return () => {
      topicsToSubscribe.forEach((topic) =>
        unsubscribe(topic, handleMqttMessage, activeBrokerId)
      );
    };
  }, [configs, devices, subscribe, unsubscribe, handleMqttMessage, activeBrokerId]);

  const getAuthHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const configsResponse = await fetch(`${API_BASE_URL}/api/power-analyzer`, {
        headers: getAuthHeaders(),
      });
      if (!configsResponse.ok) {
        const errorData = await configsResponse.json();
        throw new Error(errorData.message || "Failed to fetch power analyzer configs");
      }
      const configsData = await configsResponse.json();

      const devicesResponse = await fetch(`${API_BASE_URL}/api/devices/for-selection?excludeVirtual=true`, {
        headers: getAuthHeaders(),
      });
      if (!devicesResponse.ok) {
        const errorData = await devicesResponse.json();
        throw new Error(errorData.message || "Failed to fetch devices");
      }
      const devicesData = await devicesResponse.json();

      setConfigs(configsData);
      setDevices(devicesData);
    } catch (error: any) {
      console.error("Failed to load initial data:", error);
      showToast.error(error.message || "Failed to load initial data");
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders]);
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Effect to listen for global data changes and reload
  useEffect(() => {
    const handleDataChange = () => {
      console.log("[PowerAnalyzerTab] Detected global data change, reloading...");
      fetchAllData();
    };

    window.addEventListener("power-analyzer-data-changed", handleDataChange);

    return () => {
      window.removeEventListener("power-analyzer-data-changed", handleDataChange);
    };
  }, [fetchAllData]);

  const deviceOptions: SelectOption[] = useMemo(
    () => devices.map((d) => ({ value: d.uniqId, label: d.name })),
    [devices]
  );
  const getDeviceKeys = useCallback(
    (uniqId: string | null): string[] => {
      if (!uniqId) return [];
      const device = devices.find((d) => d.uniqId === uniqId);
      const rawPayload = liveData[device?.topic || ""] || device?.lastPayload;
      if (!rawPayload) return [];
      let dataObject = null;
      if (typeof rawPayload.value === "string") {
        try {
          dataObject = JSON.parse(rawPayload.value);
        } catch (e) { }
      }
      if (dataObject === null) {
        dataObject = rawPayload;
      }
      if (typeof dataObject !== "object" || dataObject === null) {
        return [];
      }
      return Object.keys(dataObject)
        .filter((key) => typeof dataObject[key] === "number");
    },
    [devices, liveData]
  );
  const getPduValue = useCallback(
    (pdu: PduItem): number | null => {
      const device = devices.find((d) => d.uniqId === pdu.uniqId);
      if (!device) return null;
      const payload = liveData[device.topic];
      if (!payload) return null;
      return pdu.keys.reduce(
        (sum, key) => sum + (Number(payload[key]) || 0),
        0
      );
    },
    [devices, liveData]
  );
  const getMainPowerValue = useCallback(
    (config: PowerAnalyzerConfig): number | null => {
      const device = devices.find((d) => d.uniqId === config.mainPower.uniqId);
      if (!device) return null;
      const payload = liveData[device.topic];
      if (!payload || payload[config.mainPower.key] === undefined) return null;
      return Number(payload[config.mainPower.key]) || 0;
    },
    [devices, liveData]
  );
  const calculateTotalPUE = useCallback(
    (config: PowerAnalyzerConfig): string => {
      const mainPowerValue = getMainPowerValue(config);
      if (mainPowerValue === null || mainPowerValue === 0) return "N/A";
      const totalItPower = config.pduList.reduce(
        (sum, pdu) => sum + (getPduValue(pdu) || 0),
        0
      );
      return `${((totalItPower / mainPowerValue) * 100).toFixed(2)}%`;
    },
    [getMainPowerValue, getPduValue]
  );
  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue == null || pduValue == null || mainPowerValue === 0)
        return "N/A";
      return `${((pduValue / mainPowerValue) * 100).toFixed(2)}%`;
    },
    []
  );
  // Filter devices based on search
  const filteredConfigs = useMemo(() => {
    return configs.filter(config =>
      config.customName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [configs, searchTerm]);

  // Paginate the filtered results
  const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigs = filteredConfigs.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);
  const resetForm = () => {
    setCustomName("");
    setPduList([{ uniqId: null, keys: [] }]);
    setMainPower({ uniqId: null, key: null });
    setEditingId(null);
  };
  const handleOpenModal = (config: PowerAnalyzerConfig | null = null) => {
    if (config) {
      setEditingId(config.id);
      setCustomName(config.customName);
      const initialPduList = config.pduList.map((p) => ({
        uniqId: p.uniqId,
        keys: p.keys,
      }));
      setPduList(initialPduList);
      const initialMainPower = {
        uniqId: config.mainPower.uniqId,
        key: config.mainPower.key,
      };
      setMainPower(initialMainPower);
      const topicsToSub = new Set<string>();
      const mainPowerDevice = devices.find(
        (d) => d.uniqId === initialMainPower.uniqId
      );
      if (mainPowerDevice) topicsToSub.add(mainPowerDevice.topic);
      initialPduList.forEach((pdu) => {
        const pduDevice = devices.find((d) => d.uniqId === pdu.uniqId);
        if (pduDevice) topicsToSub.add(pduDevice.topic);
      });
      if (activeBrokerId) {
        topicsToSub.forEach((topic) => subscribe(topic, handleMqttMessage, activeBrokerId));
      }
      setModalSubscribedTopics(topicsToSub);
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };
  const manageTopicSubscription = (
    oldUniqId: string | null,
    newUniqId: string | null
  ) => {
    const oldTopic = devices.find((d) => d.uniqId === oldUniqId)?.topic;
    const newTopic = devices.find((d) => d.uniqId === newUniqId)?.topic;
    setModalSubscribedTopics((prevSubs) => {
      const newSubs = new Set(prevSubs);
      if (activeBrokerId) {
        if (oldTopic && oldTopic !== newTopic) {
          unsubscribe(oldTopic, handleMqttMessage, activeBrokerId);
          newSubs.delete(oldTopic);
        }
        if (newTopic && oldTopic !== newTopic) {
          subscribe(newTopic, handleMqttMessage, activeBrokerId);
          newSubs.add(newTopic);
        }
      }
      return newSubs;
    });
  };
  const handlePduDeviceChange = (index: number, newUniqId: string | null) => {
    const oldUniqId = pduList[index].uniqId;
    manageTopicSubscription(oldUniqId, newUniqId);
    const newList = [...pduList];
    newList[index] = { uniqId: newUniqId, keys: [] };
    setPduList(newList);
  };
  const handlePduKeysChange = (index: number, newKeys: string[]) => {
    const newList = [...pduList];
    newList[index] = { ...newList[index], keys: newKeys };
    setPduList(newList);
  };
  const handleMainPowerDeviceChange = (newUniqId: string | null) => {
    manageTopicSubscription(mainPower.uniqId, newUniqId);
    setMainPower((prev) => ({ ...prev, uniqId: newUniqId, key: null }));
  };
  const handleMainPowerKeyChange = (newKey: string) => {
    setMainPower((prev) => ({ ...prev, key: newKey }));
  };
  const handleShowDetails = (config: PowerAnalyzerConfig) => {
    setSelectedConfig(config);
    setIsDetailModalOpen(true);
  };
  const addPdu = () => setPduList([...pduList, { uniqId: null, keys: [] }]);
  const removePdu = (index: number) => {
    const pduToRemove = pduList[index];
    manageTopicSubscription(pduToRemove.uniqId, null);
    setPduList(pduList.filter((_, i) => i !== index));
  };

  const openOwnershipModal = (config: PowerAnalyzerConfig) => {
    setSelectedConfigForOwnership(config);
    setIsOwnershipModalOpen(true);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      showToast.error("No file selected.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const importedConfigs = JSON.parse(content);

        if (!Array.isArray(importedConfigs) || importedConfigs.some(c => !c.customName || !c.mainPower || !c.pduList)) {
          showToast.error("Invalid JSON format. Expected an array of power analyzer configurations.");
          return;
        }

        setIsSubmitting(true);
        const response = await axios.post(`${API_BASE_URL}/api/power-analyzer/import`, importedConfigs);
        showToast.success(response.data.message || "Configurations imported successfully!");
        window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));
        fetchAllData();
      } catch (error: any) {
        console.error("Error importing configurations:", error);
        showToast.error(error.response?.data?.message || "Failed to import configurations.");
      } finally {
        setIsSubmitting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Clear the input
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/power-analyzer/export`, {
        responseType: 'blob', // Important for downloading files
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `power-analyzer-configs-${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast.success("Configurations exported successfully!");
    } catch (error: any) {
      console.error("Error exporting configurations:", error);
      showToast.error(error.response?.data?.message || "Failed to export configurations.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- FUNGSI DIPERBARUI: handleSubmit & handleDelete ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !customName ||
      !mainPower.uniqId ||
      !mainPower.key ||
      pduList.some((p) => !p.uniqId || p.keys.length === 0)
    ) {
      showToast.error("Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = { customName, pduList, mainPower };
      const promise = editingId
        ? axios.put(`/api/power-analyzer/${editingId}`, payload)
        : axios.post("/api/power-analyzer", payload);

      await promise;

      showToast.success(`Configuration ${editingId ? "updated" : "saved"} successfully!`);

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      fetchAllData();
      setIsModalOpen(false);

      //  Trigger calculation service reload
      try {
        await axios.post("/api/cron/calculation-reload");
        console.log(" Calculation service reload triggered");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error(
        error.response?.data?.message ||
        "An error occurred while saving data."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await axios.delete(`/api/power-analyzer/${deleteId}`);
      showToast.success("Configuration deleted successfully!");
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));
      fetchAllData();
      // Trigger calculation service reload
      try {
        await axios.post("/api/cron/calculation-reload");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error(error.response?.data?.message || "Failed to delete configuration.");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IT Power Analyzer</h1>
          <p className="text-muted-foreground">
            Monitor and analyze power usage efficiency across your infrastructure
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
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isSubmitting || isDeleting}>
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={isLoading || isSubmitting || isDeleting}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => handleOpenModal()} disabled={isLoading || isSubmitting || isDeleting}>
            <Plus className="h-4 w-4 mr-2" />
            Add Configuration
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                <p className="text-sm font-medium text-muted-foreground">Total Racks Monitored</p>
                <p className="text-3xl font-bold">
                  {configs.reduce((sum, config) => sum + config.pduList.length, 0)}
                </p>
              </div>
              <HardDrive className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg IT Load</p>
                <p className="text-3xl font-bold">
                  {configs.length > 0
                    ? (
                      configs.reduce((sum, config) => {
                        const pue = calculateTotalPUE(config);
                        return sum + (pue !== 'N/A' ? parseFloat(pue.replace('%', '')) : 0);
                      }, 0) / configs.filter(config => calculateTotalPUE(config) !== 'N/A').length
                    ).toFixed(1) + '%'
                    : 'N/A'
                  }
                </p>
              </div>
              <Gauge className="h-8 w-8 text-purple-500" />
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
            icon={<Search className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Results info */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-muted-foreground">
          Showing {paginatedConfigs.length} of {filteredConfigs.length} configurations
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-xl flex items-center gap-2">
            <Gauge className="h-5 w-5 text-purple-600" />
            Power Analyzer Configurations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead>#</TableHead>
                  <TableHead>Configuration Name</TableHead>
                  <TableHead>Total Racks</TableHead>
                  <TableHead>IT Load %</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b border-slate-100 dark:border-slate-800">
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-8"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-48"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-20"></div></TableCell>
                      <TableCell className="text-right"><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse w-8 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : paginatedConfigs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-6 rounded-full bg-muted">
                          <Gauge className="h-16 w-16 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xl font-semibold">
                            {searchTerm
                              ? "No configurations found"
                              : "No Power Analyzer Configurations Yet"}
                          </p>
                          <p className="text-sm text-muted-foreground max-w-md">
                            {searchTerm
                              ? "Try adjusting your search terms or clear the search"
                              : "Start monitoring your IT power load by adding your first Power Analyzer configuration"}
                          </p>
                        </div>
                        {!searchTerm && (
                          <Button onClick={() => handleOpenModal()}>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Your First Configuration
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedConfigs.map((config, index) => (
                    <TableRow key={config.id} className="hover:bg-muted/50">
                      <TableCell className="py-4 font-medium">
                        {index + 1 + (currentPage - 1) * itemsPerPage}
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {config.customName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1 animate-pulse" />
                            Live monitoring
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <HardDrive className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold">
                            {config.pduList?.length || 0} racks
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold">
                            {calculateTotalPUE(config)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShowDetails(config)}
                            className="h-7 text-xs"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openOwnershipModal(config)}
                            title="Manage Ownership"
                            disabled={isSubmitting || isLoading || isDeleting}
                          >
                            <Users className="h-4 w-4 text-blue-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenModal(config)}
                            disabled={isSubmitting || isLoading || isDeleting}
                          >
                            <Edit2 className="h-4 w-4 text-amber-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(config.id)}
                            disabled={isSubmitting || isLoading || isDeleting}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {selectedConfigForOwnership && (
            <OwnershipManagement
              isOpen={isOwnershipModalOpen}
              onClose={() => setIsOwnershipModalOpen(false)}
              configId={selectedConfigForOwnership.id}
              configName={selectedConfigForOwnership.customName}
              configType="power-analyzer"
              onUpdated={fetchAllData}
            />
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>

            {/* Page Numbers */}
            {totalPages <= 7 ? (
              // Show all pages if 7 or fewer
              Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="w-10 h-10 p-0"
                >
                  {page}
                </Button>
              ))
            ) : (
              // Show ellipsis pattern for more pages
              <>
                {currentPage <= 4 && (
                  <>
                    {[1, 2, 3, 4, 5].map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10 h-10 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-10 h-10 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                {currentPage > 4 && currentPage < totalPages - 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      className="w-10 h-10 p-0"
                    >
                      1
                    </Button>
                    <span className="px-2 text-muted-foreground">...</span>
                    {[currentPage - 1, currentPage, currentPage + 1].map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10 h-10 p-0"
                      >
                        {page}
                      </Button>
                    ))}
                    <span className="px-2 text-muted-foreground">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      className="w-10 h-10 p-0"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}

                {currentPage >= totalPages - 3 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      className="w-10 h-10 p-0"
                    >
                      1
                    </Button>
                    <span className="px-2 text-muted-foreground">...</span>
                    {[totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages].map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10 h-10 p-0"
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
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {editingId ? "Edit" : "Add"} Power Analyzer Configuration
            </DialogTitle>
            <DialogDescription>
              Configure power monitoring devices to calculate IT load percentage
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="customName" className="text-sm font-medium">
                Configuration Name *
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Data Center IT Load Monitor"
                className="h-10"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* PDU/Racks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-primary">
                  <Zap className="h-5 w-5 text-amber-500" />
                  IT Power (PDU/Racks)
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPdu}
                  disabled={isSubmitting}
                  className="h-8 border-dashed hover:border-solid"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Rack
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {pduList.map((pdu, index) => (
                  <Card
                    key={index}
                    className="relative border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  >
                    <CardContent className="p-4 pt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => removePdu(index)}
                        disabled={isSubmitting || pduList.length === 1}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                        {/* Device Selection - wider */}
                        <div className="md:col-span-12 space-y-2">
                          <Label className="text-sm font-medium">
                            Choose Monitoring Device (Rack {index + 1}) *
                          </Label>
                          <Popover
                            open={!!pduDeviceOpenMap[index]}
                            onOpenChange={(open) =>
                              setPduDeviceOpenMap((prev) => ({ ...prev, [index]: open }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                disabled={isSubmitting}
                                className="w-full h-10 justify-between font-normal bg-background"
                              >
                                <span className="truncate flex items-center gap-2">
                                  {pdu.uniqId ? (
                                    <>
                                      <HardDrive className="h-4 w-4 text-muted-foreground" />
                                      {deviceOptions.find((o) => o.value === pdu.uniqId)?.label ?? "Choose a device..."}
                                    </>
                                  ) : "Choose a device..."}
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command>
                                <CommandInput placeholder="Search device..." className="h-9" />
                                <CommandList>
                                  <CommandEmpty>No device found.</CommandEmpty>
                                  <CommandGroup className="max-h-60">
                                    {deviceOptions.map((opt) => (
                                      <CommandItem
                                        key={opt.value}
                                        value={opt.label}
                                        onSelect={() => {
                                          handlePduDeviceChange(index, opt.value);
                                          setPduDeviceOpenMap((prev) => ({ ...prev, [index]: false }));
                                        }}
                                        className="flex items-center justify-between"
                                      >
                                        <div className="flex flex-col items-start overflow-hidden">
                                          <span className="font-medium truncate w-full">{opt.label}</span>
                                          <span className="text-[10px] text-muted-foreground truncate w-full">
                                            {devices.find((d) => d.uniqId === opt.value)?.topic}
                                          </span>
                                        </div>
                                        {pdu.uniqId === opt.value && (
                                          <Check className="h-4 w-4 ml-2 shrink-0 text-primary" />
                                        )}
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        {/* Multi-Select - wider */}
                        <div className="md:col-span-12 space-y-2">
                          <Label className="text-sm font-medium">
                            Select Power Data Keys *
                          </Label>
                          <MultiSelect
                            isMulti
                            options={getDeviceKeys(pdu.uniqId).map((k) => ({ label: k, value: k }))}
                            value={pdu.keys.map((k) => ({ label: k, value: k }))}
                            onChange={(newValue: any) => {
                              const selected = newValue ? newValue.map((v: any) => v.value) : [];
                              handlePduKeysChange(index, selected);
                            }}
                            placeholder="Search & select power keys..."
                            isDisabled={!pdu.uniqId || isSubmitting}
                            className="bg-background min-h-[40px]"
                          />
                          {!pdu.uniqId && (
                            <p className="text-[11px] text-muted-foreground italic">
                              Please select a device first to see available data keys.
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Main Power Section */}
            <div className="space-y-4 pt-2">
              <h3 className="text-lg font-semibold flex items-center gap-2 text-primary border-b pb-2">
                <Gauge className="h-5 w-5 text-blue-500" />
                Input Source (Main Power)
              </h3>

              <Card className="border border-blue-100 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-900/10">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Main Power Device *</Label>
                    <Popover open={mainPowerDeviceOpen} onOpenChange={setMainPowerDeviceOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          disabled={isSubmitting}
                          className="w-full h-10 justify-between font-normal bg-background"
                        >
                          <span className="truncate flex items-center gap-2">
                            {mainPower.uniqId ? (
                              <>
                                <Zap className="h-4 w-4 text-blue-500" />
                                {deviceOptions.find((o) => o.value === mainPower.uniqId)?.label ?? "Choose a device..."}
                              </>
                            ) : "Choose a device..."}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search device..." className="h-9" />
                          <CommandList>
                            <CommandEmpty>No device found.</CommandEmpty>
                            <CommandGroup className="max-h-60">
                              {deviceOptions.map((opt) => (
                                <CommandItem
                                  key={opt.value}
                                  value={opt.label}
                                  onSelect={() => {
                                    handleMainPowerDeviceChange(opt.value);
                                    setMainPowerDeviceOpen(false);
                                  }}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex flex-col items-start overflow-hidden">
                                    <span className="font-medium truncate w-full">{opt.label}</span>
                                    <span className="text-[10px] text-muted-foreground truncate w-full">
                                      {devices.find((d) => d.uniqId === opt.value)?.topic}
                                    </span>
                                  </div>
                                  {mainPower.uniqId === opt.value && (
                                    <Check className="h-4 w-4 ml-2 shrink-0 text-primary" />
                                  )}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Main Power Key *</Label>
                    <Select
                      value={mainPower.key || ""}
                      onValueChange={handleMainPowerKeyChange}
                      disabled={!mainPower.uniqId || isSubmitting}
                    >
                      <SelectTrigger className="h-10 bg-background">
                        <SelectValue placeholder="Select data key..." />
                      </SelectTrigger>
                      <SelectContent>
                        {getDeviceKeys(mainPower.uniqId).map((key) => (
                          <SelectItem key={key} value={key}>
                            {key}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            {mainPower.uniqId &&
              mainPower.key &&
              pduList.some((p) => p.uniqId && p.keys.length > 0) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <h4 className="text-sm font-medium mb-2">
                    Configuration Preview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Facility Power:
                      </span>
                      <span className="font-medium">
                        {devices.find((d) => d.uniqId === mainPower.uniqId)?.name}
                        {" → "}
                        {mainPower.key}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        IT Power Sources:
                      </span>
                      <span className="font-medium">
                        {pduList.filter((p) => p.uniqId && p.keys.length > 0).length}{" "}
                        racks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Keys Monitored:
                      </span>
                      <span className="font-medium">
                        {pduList.reduce((sum, p) => sum + p.keys.length, 0)}{" "}
                        power keys
                      </span>
                    </div>
                  </div>
                </div>
              )}

            <DialogFooter className="gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? "Save Changes" : "Save Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              IT Load Details for {selectedConfig?.customName}
            </DialogTitle>
            <DialogDescription>
              Breakdown of IT load calculation for each configured rack.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto pr-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Rack Name</TableHead>
                  <TableHead className="text-right">IT Load %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!selectedConfig || selectedConfig.pduList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No PDU/Rack data available.
                    </TableCell>
                  </TableRow>
                ) : (
                  selectedConfig.pduList.map((pdu, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {devices.find((d) => d.uniqId === pdu.uniqId)?.name ||
                          `PDU-${index + 1}`}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {calculatePUEForPdu(
                          getMainPowerValue(selectedConfig),
                          getPduValue(pdu)
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the power analyzer configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
