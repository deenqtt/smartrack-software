"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { MqttServerProvider, useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Loader2,
  PlusCircle,
  Edit,
  Trash2,
  BarChart3,
  Activity,
  RefreshCw,
  Zap,
  Database,
  Search,
  Eye,
  X,
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
interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
  payload?: Record<string, any>;
  lastPayload?: Record<string, any>;
}

interface PduConfig {
  topicUniqId: string;
  name?: string;
  keys: string[];
  value: number | null;
  topic?: DeviceForSelection;
  filteredKeys?: string[];
}

interface MainPowerConfig {
  topicUniqId: string;
  key: string;
  value: number | null;
  topic?: DeviceForSelection;
  filteredKeys?: string[];
}

interface PueConfig {
  id: string;
  customName: string;
  type: "pue";
  apiTopicUniqId: string | null;
  pduList: PduConfig[];
  mainPower: MainPowerConfig;
  pue?: string;
}

// --- Toast Configuration ---
// --- Toast utility logic ---

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "";

export function PueTab() {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();
  const activeBrokerId = useMemo(() => {
    return brokers.find(b => b.status === 'connected')?.id;
  }, [brokers]);

  const [devicesForSelection, setDevicesForSelection] = useState<
    DeviceForSelection[]
  >([]);
  const [pueConfigs, setPueConfigs] = useState<PueConfig[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isOwnershipModalOpen, setIsOwnershipModalOpen] = useState(false);
  const [selectedConfigForOwnership, setSelectedConfigForOwnership] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pduDeviceOpenMap, setPduDeviceOpenMap] = useState<Record<number, boolean>>({});
  const [mainPowerDeviceOpen, setMainPowerDeviceOpen] = useState(false);
  const [isDeletingConfig, setIsDeletingConfig] = useState(false);
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [customName, setCustomName] = useState("");
  const [pduListForm, setPduListForm] = useState<PduConfig[]>([
    {
      topicUniqId: "",
      keys: [],
      value: null,
      topic: undefined,
      filteredKeys: [],
    },
  ]);
  const [mainPowerForm, setMainPowerForm] = useState<MainPowerConfig>({
    topicUniqId: "",
    key: "",
    value: null,
    topic: undefined,
    filteredKeys: [],
  });

  const [selectedPueConfigId, setSelectedPueConfigId] = useState<string | null>(
    null
  );
  const [selectedPueConfigDetail, setSelectedPueConfigDetail] =
    useState<PueConfig | null>(null);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [configToDelete, setConfigToDelete] = useState<PueConfig | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Real-time payload data for modal
  const [modalPayloadData, setModalPayloadData] = useState<Record<string, any>>(
    {}
  );

  // Filter configs based on search
  const filteredConfigs = useMemo(() => {
    if (!searchQuery) return pueConfigs;
    return pueConfigs.filter((config) =>
      config.customName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [pueConfigs, searchQuery]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredConfigs.slice(start, start + itemsPerPage);
  }, [filteredConfigs, currentPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(filteredConfigs.length / itemsPerPage);
  }, [filteredConfigs]);

  const topicUniqIdToTopicNameMapRef = useRef<Map<string, string>>(new Map());
  const formTopicSubscriptionRef = useRef<Map<string, string>>(new Map());

  const getAuthHeaders = useCallback(() => {
    return {
      "Content-Type": "application/json",
    };
  }, []);

  const calculatePUE = useCallback(
    (mainPowerValue: number | null, pduList: PduConfig[]): string => {
      if (
        mainPowerValue === null ||
        mainPowerValue === 0 ||
        !pduList ||
        pduList.length === 0
      ) {
        return "N/A";
      }
      const itPower = pduList.reduce((sum, pdu) => sum + (pdu.value || 0), 0);
      if (itPower === 0) return "0";
      return (mainPowerValue / itPower).toFixed(2);
    },
    []
  );

  const calculatePUEForPdu = useCallback(
    (mainPowerValue: number | null, pduValue: number | null): string => {
      if (mainPowerValue === null || pduValue === null || mainPowerValue === 0)
        return "N/A";
      if (pduValue === 0) return "0";
      return (mainPowerValue / pduValue).toFixed(2);
    },
    []
  );

  // Enhanced MQTT message handler
  const handleMqttMessage = useCallback(
    (topicName: string, messageString: string) => {
      let payload: Record<string, any>;
      try {
        const outerPayload = JSON.parse(messageString);
        if (outerPayload.value && typeof outerPayload.value === "object") {
          payload = outerPayload.value;
        } else if (
          outerPayload.value &&
          typeof outerPayload.value === "string"
        ) {
          try {
            payload = JSON.parse(outerPayload.value);
          } catch {
            payload = outerPayload;
          }
        } else {
          payload = outerPayload;
        }
      } catch (e) {
        console.error(
          `Failed to parse MQTT payload from topic ${topicName}:`,
          e
        );
        return;
      }

      // Update modal payload data for real-time key detection
      setModalPayloadData((prev) => ({
        ...prev,
        [topicName]: payload,
      }));

      // Update main configs
      setPueConfigs((prevConfigs) => {
        return prevConfigs.map((config) => {
          let configUpdated = false;
          let newMainPower = { ...config.mainPower };
          const mainPowerTopic = topicUniqIdToTopicNameMapRef.current.get(
            config.mainPower.topicUniqId
          );
          if (mainPowerTopic === topicName) {
            const value = parseFloat(payload[config.mainPower.key]);
            if (!isNaN(value) && newMainPower.value !== value) {
              newMainPower.value = value;
              configUpdated = true;
            }
          }

          const newPduList = config.pduList.map((pdu) => {
            const pduTopic = topicUniqIdToTopicNameMapRef.current.get(
              pdu.topicUniqId
            );
            if (pduTopic === topicName) {
              const totalValue = pdu.keys.reduce((sum, key) => {
                const value = parseFloat(payload[key]);
                return sum + (isNaN(value) ? 0 : value);
              }, 0);
              if (pdu.value !== totalValue) {
                configUpdated = true;
                return { ...pdu, value: totalValue };
              }
            }
            return pdu;
          });

          if (configUpdated) {
            const updatedConfig = {
              ...config,
              mainPower: newMainPower,
              pduList: newPduList,
            };
            updatedConfig.pue = calculatePUE(
              updatedConfig.mainPower.value,
              updatedConfig.pduList
            );
            return updatedConfig;
          }
          return config;
        });
      });

      // Update device payload data
      setDevicesForSelection((prevDevices) =>
        prevDevices.map((d) => {
          if (d.topic === topicName) {
            return { ...d, payload: payload };
          }
          return d;
        })
      );
    },
    [calculatePUE]
  );

  // Enhanced key filtering function
  const getFilteredKeys = useCallback(
    (device: DeviceForSelection | undefined, topicName?: string): string[] => {
      if (!device) return [];

      // Use real-time payload data if available
      const payload =
        modalPayloadData[device.topic] ||
        device.payload ||
        device.lastPayload ||
        {};

      return Object.keys(payload).filter((key) => {
        const value = payload[key];
        // Filter for numeric values that might be power-related
        if (typeof value === "number" || !isNaN(parseFloat(value))) {
          const keyLower = key.toLowerCase();
          return (
            keyLower.includes("power") ||
            keyLower.includes("watt") ||
            keyLower.includes("current") ||
            keyLower.includes("voltage") ||
            keyLower.includes("energy") ||
            keyLower.includes("ph") ||
            keyLower.includes("consumption")
          );
        }
        return false;
      });
    },
    [modalPayloadData]
  );

  // Modal MQTT subscription management - Subscribe only
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) return;
    if (!activeBrokerId) return; // Added activeBrokerId check

    // Subscribe to all devices for real-time key detection
    const activeTopics = new Set<string>();

    // Subscribe to PDU devices
    pduListForm.forEach((pdu) => {
      if (pdu.topicUniqId) {
        const device = devicesForSelection.find(
          (d) => d.uniqId === pdu.topicUniqId
        );
        if (device?.topic) {
          activeTopics.add(device.topic);
        }
      }
    });

    // Subscribe to main power device
    if (mainPowerForm.topicUniqId) {
      const device = devicesForSelection.find(
        (d) => d.uniqId === mainPowerForm.topicUniqId
      );
      if (device?.topic) {
        activeTopics.add(device.topic);
      }
    }

    // Subscribe to topics
    activeTopics.forEach((topic) => {
      if (!formTopicSubscriptionRef.current.has(topic)) {
        subscribe(topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
        formTopicSubscriptionRef.current.set(topic, topic);
      }
    });

    return () => {
      // Cleanup subscriptions when modal closes
      if (!isAddModalOpen && !isEditModalOpen) {
        formTopicSubscriptionRef.current.forEach((_, topic) => {
          unsubscribe(topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
        });
        formTopicSubscriptionRef.current.clear();
        setModalPayloadData({});
      }
    };
  }, [
    isAddModalOpen,
    isEditModalOpen,
    pduListForm,
    mainPowerForm,
    devicesForSelection,
    subscribe,
    unsubscribe,
    handleMqttMessage,
    activeBrokerId, // Added activeBrokerId to dependencies
  ]);

  // Separate effect for updating filtered keys based on modalPayloadData
  useEffect(() => {
    if (!isAddModalOpen && !isEditModalOpen) return;

    // Update filtered keys when payload data changes
    setPduListForm((currentList) =>
      currentList.map((pdu) => {
        if (!pdu.topicUniqId) return pdu;
        const device = devicesForSelection.find(
          (d) => d.uniqId === pdu.topicUniqId
        );
        const newFilteredKeys = getFilteredKeys(device);
        // Only update if keys actually changed
        if (
          JSON.stringify(pdu.filteredKeys) === JSON.stringify(newFilteredKeys)
        ) {
          return pdu;
        }
        return { ...pdu, filteredKeys: newFilteredKeys };
      })
    );

    setMainPowerForm((currentMainPower) => {
      if (!currentMainPower.topicUniqId) return currentMainPower;
      const device = devicesForSelection.find(
        (d) => d.uniqId === currentMainPower.topicUniqId
      );
      const newFilteredKeys = getFilteredKeys(device);
      // Only update if keys actually changed
      if (
        JSON.stringify(currentMainPower.filteredKeys) ===
        JSON.stringify(newFilteredKeys)
      ) {
        return currentMainPower;
      }
      return { ...currentMainPower, filteredKeys: newFilteredKeys };
    });
  }, [
    modalPayloadData,
    isAddModalOpen,
    isEditModalOpen,
    devicesForSelection,
    getFilteredKeys,
  ]);

  const manageMqttSubscriptions = useCallback(
    async (configs: PueConfig[], devices: DeviceForSelection[]) => {
      if (!activeBrokerId) return; // Added activeBrokerId check

      const requiredUniqIds = new Set<string>();
      configs.forEach((config) => {
        if (config.mainPower?.topicUniqId)
          requiredUniqIds.add(config.mainPower.topicUniqId);
        config.pduList.forEach((pdu) => {
          if (pdu.topicUniqId) requiredUniqIds.add(pdu.topicUniqId);
        });
      });

      const newTopicMap = new Map<string, string>();
      requiredUniqIds.forEach((uniqId) => {
        const device = devices.find((d) => d.uniqId === uniqId);
        if (device?.topic) {
          newTopicMap.set(uniqId, device.topic);
        }
      });

      const oldTopics = new Set(topicUniqIdToTopicNameMapRef.current.values());
      const newTopics = new Set(newTopicMap.values());

      oldTopics.forEach((topic) => {
        if (!newTopics.has(topic)) {
          unsubscribe(topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
        }
      });

      newTopics.forEach((topic) => {
        if (!oldTopics.has(topic)) {
          subscribe(topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
        }
      });

      topicUniqIdToTopicNameMapRef.current = newTopicMap;
    },
    [subscribe, unsubscribe, handleMqttMessage, activeBrokerId] // Added activeBrokerId to dependencies
  );

  // Enhanced data initialization
  const initializeData = useCallback(
    async (notifyStatus = false) => {
      try {
        if (notifyStatus) {
          setRefreshing(true);
        }
        setIsLoadingInitialData(true);

        const deviceResponse = await fetch(
          `${API_BASE_URL}/api/devices/for-selection?excludeVirtual=true`,
          { headers: getAuthHeaders() }
        );
        if (!deviceResponse.ok) throw new Error("Failed to fetch devices");
        const deviceData: DeviceForSelection[] = await deviceResponse.json();
        const devicesWithPayload = deviceData.map((d) => ({
          ...d,
          payload: d.lastPayload || {},
        }));
        setDevicesForSelection(devicesWithPayload);

        const pueResponse = await fetch(`${API_BASE_URL}/api/pue-configs`, {
          headers: getAuthHeaders(),
        });
        if (!pueResponse.ok)
          throw new Error("Failed to fetch PUE configurations");
        const pueData: PueConfig[] = await pueResponse.json();

        const processedConfigs = pueData
          .filter((item) => item.type === "pue")
          .map((item) => {
            const mainPowerDevice = devicesWithPayload.find(
              (d) => d.uniqId === item.mainPower.topicUniqId
            );
            let mainPowerValue: number | null = null;
            if (
              mainPowerDevice?.payload &&
              item.mainPower.key in mainPowerDevice.payload
            ) {
              const val = parseFloat(
                mainPowerDevice.payload[item.mainPower.key]
              );
              if (!isNaN(val)) mainPowerValue = val;
            }

            const pduListWithValues = (item.pduList || []).map((pdu) => {
              const pduDevice = devicesWithPayload.find(
                (d) => d.uniqId === pdu.topicUniqId
              );
              let totalPduValue: number | null = 0;
              if (pduDevice?.payload) {
                totalPduValue = pdu.keys.reduce((sum, key) => {
                  const val = parseFloat(pduDevice.payload[key]);
                  return sum + (isNaN(val) ? 0 : val);
                }, 0);
              }
              return { ...pdu, value: totalPduValue };
            });

            const newConfig = {
              ...item,
              mainPower: { ...item.mainPower, value: mainPowerValue },
              pduList: pduListWithValues,
            };
            newConfig.pue = calculatePUE(
              newConfig.mainPower.value,
              newConfig.pduList
            );
            return newConfig;
          });
        setPueConfigs(processedConfigs);

        await manageMqttSubscriptions(processedConfigs, devicesWithPayload);

        if (showToast) {
          showToast.success("Refreshed", `${processedConfigs.length} PUE configurations loaded`);
        }
      } catch (error: any) {
        console.error("Failed to load initial data:", error);
        showToast.error("Error", error.message || "Failed to load initial data");
      } finally {
        setIsLoadingInitialData(false);
        setRefreshing(false);
      }
    },
    [getAuthHeaders, calculatePUE, manageMqttSubscriptions]
  );

  useEffect(() => {
    initializeData();

    // Effect to listen for global data changes and reload
    const handleDataChange = () => {
      console.log("[PueTab] Detected global data change, reloading...");
      initializeData(false); // Fetch without showing toast
    };

    window.addEventListener("power-analyzer-data-changed", handleDataChange);

    return () => {
      if (!activeBrokerId) return; // Added activeBrokerId check for cleanup
      topicUniqIdToTopicNameMapRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
      });
      formTopicSubscriptionRef.current.forEach((topicName) => {
        unsubscribe(topicName, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
      });
      topicUniqIdToTopicNameMapRef.current.clear();
      formTopicSubscriptionRef.current.clear();

      window.removeEventListener("power-analyzer-data-changed", handleDataChange);
    };
  }, [initializeData, unsubscribe, handleMqttMessage, activeBrokerId]); // Added activeBrokerId to dependencies

  const resetForm = useCallback(() => {
    if (!activeBrokerId) return; // Added activeBrokerId check

    // Clean up form subscriptions
    formTopicSubscriptionRef.current.forEach((_, topic) => {
      const isUsedByMainConfig = Array.from(
        topicUniqIdToTopicNameMapRef.current.values()
      ).includes(topic);
      if (!isUsedByMainConfig) {
        unsubscribe(topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
      }
    });
    formTopicSubscriptionRef.current.clear();
    setModalPayloadData({});

    setCustomName("");
    setPduListForm([
      { topicUniqId: "", keys: [], value: null, filteredKeys: [] },
    ]);
    setMainPowerForm({
      topicUniqId: "",
      key: "",
      value: null,
      filteredKeys: [],
    });
    setSelectedPueConfigId(null);
  }, [unsubscribe, handleMqttMessage, activeBrokerId]); // Added activeBrokerId to dependencies

  const handleAddData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      showToast.error("Error", "Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customName,
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
        },
      };

      const response = await fetch(`${API_BASE_URL}/api/pue-configs`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save data");
      }

      showToast.success("Success", "PUE configuration saved successfully!");

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      setIsAddModalOpen(false);
      await initializeData();

      //  Trigger calculation service reload
      try {
        await fetch(`${API_BASE_URL}/api/cron/calculation-reload`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        console.log(" Calculation service reload triggered");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error("Error", `Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPueConfigId) return;
    if (!customName || !mainPowerForm.topicUniqId || !mainPowerForm.key) {
      showToast.error("Error", "Please fill in all required fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        customName,
        pduList: pduListForm.map((pdu, index) => ({
          topicUniqId: pdu.topicUniqId,
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys,
        })),
        mainPower: {
          topicUniqId: mainPowerForm.topicUniqId,
          key: mainPowerForm.key,
        },
      };
      const response = await fetch(
        `${API_BASE_URL}/api/pue-configs/${selectedPueConfigId}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update data");
      }

      showToast.success("Success", "PUE configuration updated successfully!");

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      setIsEditModalOpen(false);
      await initializeData();

      //  Trigger calculation service reload
      try {
        await fetch(`${API_BASE_URL}/api/cron/calculation-reload`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        console.log(" Calculation service reload triggered");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error("Error", `Failed to update: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!configToDelete) return;
    setIsDeletingConfig(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/pue-configs/${configToDelete.id}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete data");
      }

      showToast.success("Success", "PUE configuration deleted!");

      // Dispatch event to notify other tabs to reload
      window.dispatchEvent(new CustomEvent("power-analyzer-data-changed"));

      setIsDeleteAlertOpen(false);
      setConfigToDelete(null);
      await initializeData();

      //  Trigger calculation service reload
      try {
        await fetch(`${API_BASE_URL}/api/cron/calculation-reload`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        console.log(" Calculation service reload triggered");
      } catch (reloadError) {
        console.error("Failed to trigger calculation reload:", reloadError);
      }
    } catch (error: any) {
      showToast.error("Error", `Failed to delete: ${error.message}`);
    } finally {
      setIsDeletingConfig(false);
    }
  };

  const openAddDataModal = () => {
    resetForm();
    setIsAddModalOpen(true);
  };

  const editItem = (item: PueConfig) => {
    resetForm();
    setSelectedPueConfigId(item.id);
    setCustomName(item.customName);

    const mainPowerDevice = devicesForSelection.find(
      (d) => d.uniqId === item.mainPower.topicUniqId
    );
    setMainPowerForm({
      ...item.mainPower,
      topic: mainPowerDevice,
      filteredKeys: getFilteredKeys(mainPowerDevice),
    });

    const newPduListForm = item.pduList.map((pdu) => {
      const pduDevice = devicesForSelection.find(
        (d) => d.uniqId === pdu.topicUniqId
      );
      return {
        ...pdu,
        topic: pduDevice,
        filteredKeys: getFilteredKeys(pduDevice),
      };
    });
    setPduListForm(newPduListForm);
    setIsEditModalOpen(true);
  };

  const deleteItem = (item: PueConfig) => {
    setConfigToDelete(item);
    setIsDeleteAlertOpen(true);
  };

  const showDetails = (item: PueConfig) => {
    setSelectedPueConfigDetail(item);
    setIsDetailModalOpen(true);
  };

  const handleAddPdu = () => {
    setPduListForm((prev) => [
      ...prev,
      { topicUniqId: "", keys: [], value: null, filteredKeys: [] },
    ]);
  };

  const handleRemovePdu = (index: number) => {
    const pduToRemove = pduListForm[index];
    if (pduToRemove?.topicUniqId && activeBrokerId) { // Added activeBrokerId check
      const device = devicesForSelection.find(
        (d) => d.uniqId === pduToRemove.topicUniqId
      );
      if (device?.topic && formTopicSubscriptionRef.current.has(device.topic)) {
        const isUsedByMainConfig = Array.from(
          topicUniqIdToTopicNameMapRef.current.values()
        ).includes(device.topic);
        if (!isUsedByMainConfig) {
          unsubscribe(device.topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
        }
        formTopicSubscriptionRef.current.delete(device.topic);
      }
    }
    setPduListForm((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePduTopic = (index: number, topicUniqId: string) => {
    const device = devicesForSelection.find((d) => d.uniqId === topicUniqId);
    if (!device) return;
    if (!activeBrokerId) return; // Added activeBrokerId check

    // Subscribe to new device topic for real-time updates
    if (device.topic && !formTopicSubscriptionRef.current.has(device.topic)) {
      subscribe(device.topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
      formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
    }

    const filteredKeys = getFilteredKeys(device);
    setPduListForm((prev) => {
      const newList = [...prev];
      newList[index] = {
        ...newList[index],
        topicUniqId,
        topic: device,
        filteredKeys,
        keys: [],
      };
      return newList;
    });
  };

  const updatePduKeys = (index: number, keys: string[]) => {
    setPduListForm((prev) => {
      const newList = [...prev];
      newList[index].keys = keys;
      return newList;
    });
  };

  const updateMainPowerTopic = (topicUniqId: string) => {
    const device = devicesForSelection.find((d) => d.uniqId === topicUniqId);
    if (!device) return;
    if (!activeBrokerId) return; // Added activeBrokerId check

    // Subscribe to new device topic for real-time updates
    if (device.topic && !formTopicSubscriptionRef.current.has(device.topic)) {
      subscribe(device.topic, handleMqttMessage, activeBrokerId); // Pass activeBrokerId
      formTopicSubscriptionRef.current.set(device.topic, device.uniqId);
    }

    const filteredKeys = getFilteredKeys(device);
    setMainPowerForm({
      ...mainPowerForm,
      topicUniqId,
      topic: device,
      filteredKeys,
      key: "",
    });
  };

  const updateMainPowerKey = (key: string) => {
    setMainPowerForm((prev) => ({ ...prev, key }));
  };

  const handleExport = async () => {
    try {
      const res = await fetch("/api/pue-configs/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pue-configs-${new Date().toISOString()}.json`;
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
          const res = await fetch("/api/pue-configs/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(configsToImport),
          });
          const result = await res.json();
          if (!res.ok) {
            throw new Error(result.message || "Import failed.");
          }
          showToast.success(`Imported ${result.imported} configs. Skipped ${result.skipped}.`);
          initializeData(); // Use initializeData to refresh
        } catch (err: any) {
          showToast.error(`Invalid JSON file or import failed: ${err.message}`);
        }
      };
      reader.readAsText(file);
    } catch (error: any) {
      showToast.error(`Failed to import configurations: ${error.message}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openOwnershipModal = (config: any) => {
    setSelectedConfigForOwnership(config);
    setIsOwnershipModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PUE Monitoring</h1>
          <p className="text-muted-foreground">
            Monitor and manage data center power usage efficiency
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
            disabled={isSubmitting || isLoadingInitialData || isDeletingConfig}
          >
            <FileUp className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isSubmitting || isLoadingInitialData || isDeletingConfig}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            disabled={isSubmitting || isLoadingInitialData || isDeletingConfig}
          >
            <PlusCircle className="mr-2 h-4 w-4" />
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
                <p className="text-3xl font-bold">{pueConfigs.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average PUE</p>
                <p className="text-3xl font-bold">
                  {pueConfigs.length > 0
                    ? (
                      pueConfigs.reduce(
                        (sum, c) => sum + (parseFloat(c.pue || "0") || 0),
                        0
                      ) / pueConfigs.length
                    ).toFixed(2)
                    : "N/A"}
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
                <p className="text-sm font-medium text-muted-foreground">Total Racks Monitored</p>
                <p className="text-3xl font-bold">
                  {pueConfigs.reduce(
                    (sum, c) => sum + (c.pduList?.length || 0),
                    0
                  )}
                </p>
              </div>
              <Zap className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main PUE Configuration Card */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                PUE Configurations
              </CardTitle>
              <CardDescription>
                Monitor and manage data center power efficiency
              </CardDescription>
            </div>
          </div>

          {/* Search & Pagination Bar */}
          <div className="pt-4 flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search configurations..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={isLoadingInitialData}
                className="pl-10 h-10"
              />
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
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-hidden">
            {isLoadingInitialData ? (
              <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-emerald-600 mb-4" />
                <p className="text-muted-foreground text-lg font-medium">
                  Loading PUE configurations...
                </p>
              </div>
            ) : paginatedData.length === 0 ? (
              <div className="text-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <div className="p-6 rounded-full bg-muted">
                    <BarChart3 className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-xl font-semibold">
                      {searchQuery
                        ? "No configurations found"
                        : "No PUE Configurations Yet"}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-md">
                      {searchQuery
                        ? "Try adjusting your search terms or clear the search"
                        : "Start monitoring your data center power efficiency by adding your first PUE configuration"}
                    </p>
                  </div>
                  {!searchQuery && (
                    <Button onClick={openAddDataModal}>
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Your First Configuration
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2">
                        <TableHead>#</TableHead>
                        <TableHead>Configuration</TableHead>
                        <TableHead>Main Power</TableHead>
                        <TableHead>IT Power (Racks)</TableHead>
                        <TableHead>PUE Value</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedData.map((item, index) => {
                        const pueValue = parseFloat(item.pue || "0");
                        const totalItPower = item.pduList?.reduce(
                          (sum, pdu) => sum + (pdu.value || 0),
                          0
                        );

                        return (
                          <TableRow key={item.id} className="hover:bg-muted/50">
                            <TableCell className="py-4 font-medium">
                              {index + 1 + (currentPage - 1) * itemsPerPage}
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="space-y-2">
                                <p className="font-semibold">
                                  {item.customName}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    Live monitoring
                                  </span>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-mono font-bold">
                                    {item.mainPower.value?.toFixed(2) || "0.00"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Watts
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex items-center gap-2">
                                <Activity className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-mono font-bold">
                                    {totalItPower?.toFixed(2) || "0.00"}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.pduList?.length || 0} racks
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="py-4">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant={
                                      item.pue === "N/A"
                                        ? "secondary"
                                        : pueValue > 2
                                          ? "destructive"
                                          : pueValue > 1.5
                                            ? "default"
                                            : "secondary"
                                    }
                                    className="text-base font-bold px-3 py-1"
                                  >
                                    {item.pue}
                                  </Badge>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => showDetails(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                  className="h-7 text-xs"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                              </div>
                            </TableCell>

                            <TableCell className="text-right py-4">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openOwnershipModal(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                  title="Manage Ownership"
                                >
                                  <Users className="h-4 w-4 text-blue-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => editItem(item)}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => {
                                    setConfigToDelete(item);
                                    setIsDeleteAlertOpen(true);
                                  }}
                                  disabled={
                                    isSubmitting ||
                                    isLoadingInitialData ||
                                    isDeletingConfig
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground font-medium">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(
                          currentPage * itemsPerPage,
                          filteredConfigs.length
                        )}{" "}
                        of {filteredConfigs.length} configurations
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.max(1, p - 1))
                          }
                          disabled={currentPage === 1 || isLoadingInitialData}
                          className="gap-1"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <div className="flex items-center gap-1">
                          {Array.from(
                            { length: Math.min(5, totalPages) },
                            (_, i) => {
                              let pageNum;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }

                              return (
                                <Button
                                  key={pageNum}
                                  variant={
                                    currentPage === pageNum
                                      ? "default"
                                      : "outline"
                                  }
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setCurrentPage((p) => Math.min(totalPages, p + 1))
                          }
                          disabled={
                            currentPage === totalPages || isLoadingInitialData
                          }
                          className="gap-1"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedConfigForOwnership && (
        <OwnershipManagement
          isOpen={isOwnershipModalOpen}
          onClose={() => setIsOwnershipModalOpen(false)}
          configId={selectedConfigForOwnership.id}
          configName={selectedConfigForOwnership.customName}
          configType="pue"
          onUpdated={initializeData} // Use initializeData to refresh
        />
      )}

      {/* Add/Edit Dialog */}
      <Dialog
        open={isAddModalOpen || isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {isEditModalOpen ? "Edit" : "Add"} PUE Configuration
            </DialogTitle>
            <DialogDescription>
              Configure power monitoring devices to calculate Power Usage
              Effectiveness
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={isEditModalOpen ? handleEditData : handleAddData}
            className="space-y-6 pt-4"
          >
            <div className="space-y-2">
              <Label htmlFor="customName" className="text-sm font-medium">
                Configuration Name *
              </Label>
              <Input
                id="customName"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., Data Center Main PUE"
                className="h-10"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* PDU/Racks Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  IT Power (PDU/Racks)
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddPdu}
                  disabled={isSubmitting}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Rack
                </Button>
              </div>

              {pduListForm.map((pdu, index) => (
                <Card
                  key={index}
                  className="relative border border-slate-200 dark:border-slate-700"
                >
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Select Device (Rack) *
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
                              className="w-full h-10 justify-between font-normal"
                            >
                              <span className="truncate">
                                {pdu.topicUniqId
                                  ? devicesForSelection.find((d) => d.uniqId === pdu.topicUniqId)?.name ?? "Choose a device..."
                                  : "Choose a device..."}
                              </span>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search device..." />
                              <CommandEmpty>No device found.</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-y-auto">
                                {devicesForSelection.map((device) => (
                                  <CommandItem
                                    key={device.uniqId}
                                    value={device.name}
                                    onSelect={() => {
                                      updatePduTopic(index, device.uniqId);
                                      setPduDeviceOpenMap((prev) => ({ ...prev, [index]: false }));
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${pdu.topicUniqId === device.uniqId ? "opacity-100" : "opacity-0"
                                        }`}
                                    />
                                    <div className="flex flex-col items-start">
                                      <span className="font-medium">{device.name}</span>
                                      <span className="text-xs text-muted-foreground">{device.topic}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Select Power Keys *
                        </Label>
                        <MultiSelect
                          isMulti
                          options={(pdu.filteredKeys || []).map(k => ({ label: k, value: k }))}
                          value={(pdu.keys || []).map(k => ({ label: k, value: k }))}
                          onChange={(newValue: any) => {
                            const selected = newValue ? newValue.map((v: any) => v.value) : [];
                            updatePduKeys(index, selected);
                          }}
                          placeholder="Select power keys..."
                          isDisabled={isSubmitting || !pdu.topicUniqId}
                        />
                        {pdu.topicUniqId && pdu.filteredKeys?.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Waiting for power data from device...
                          </p>
                        )}
                      </div>
                    </div>

                    {pduListForm.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                        onClick={() => handleRemovePdu(index)}
                        disabled={isSubmitting}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Main Power Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="h-5 w-5" />
                Total Facility Power
              </h3>

              <Card className="border border-slate-200 dark:border-slate-700">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Select Device *
                      </Label>
                      <Popover open={mainPowerDeviceOpen} onOpenChange={setMainPowerDeviceOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={isSubmitting}
                            className="w-full h-10 justify-between font-normal"
                          >
                            <span className="truncate">
                              {mainPowerForm.topicUniqId
                                ? devicesForSelection.find((d) => d.uniqId === mainPowerForm.topicUniqId)?.name ?? "Choose main power device..."
                                : "Choose main power device..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search device..." />
                            <CommandEmpty>No device found.</CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-y-auto">
                              {devicesForSelection.map((device) => (
                                <CommandItem
                                  key={device.uniqId}
                                  value={device.name}
                                  onSelect={() => {
                                    updateMainPowerTopic(device.uniqId);
                                    setMainPowerDeviceOpen(false);
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${mainPowerForm.topicUniqId === device.uniqId ? "opacity-100" : "opacity-0"
                                      }`}
                                  />
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{device.name}</span>
                                    <span className="text-xs text-muted-foreground">{device.topic}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        Select Power Key *
                      </Label>
                      <SearchableSelect
                        value={mainPowerForm.key || ""}
                        onValueChange={updateMainPowerKey}
                        disabled={isSubmitting || !mainPowerForm.topicUniqId}
                        placeholder={
                          mainPowerForm.topicUniqId
                            ? "Search for power key..."
                            : "Select a device first"
                        }
                        options={(mainPowerForm.filteredKeys || []).map((k) => ({
                          label: k,
                          value: k,
                        }))}
                        icon={<Database className="h-4 w-4" />}
                      />
                      {mainPowerForm.topicUniqId &&
                        mainPowerForm.filteredKeys?.length === 0 && (
                          <p className="text-xs text-amber-600">
                            Waiting for power data from device...
                          </p>
                        )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Section */}
            {mainPowerForm.topicUniqId &&
              mainPowerForm.key &&
              pduListForm.some((p) => p.topicUniqId && p.keys.length > 0) && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border">
                  <h4 className="text-sm font-medium mb-2">
                    Configuration Preview
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Facility Power:
                      </span>
                      <span>
                        {
                          devicesForSelection.find(
                            (d) => d.uniqId === mainPowerForm.topicUniqId
                          )?.name
                        }
                        → {mainPowerForm.key}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        IT Power Sources:
                      </span>
                      <span>
                        {
                          pduListForm.filter(
                            (p) => p.topicUniqId && p.keys.length > 0
                          ).length
                        }{" "}
                        racks
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Total Keys Monitored:
                      </span>
                      <span>
                        {pduListForm.reduce((sum, p) => sum + p.keys.length, 0)}{" "}
                        power keys
                      </span>
                    </div>
                  </div>
                </div>
              )}
          </form>

          <DialogFooter className="gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                resetForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="pueForm"
              onClick={isEditModalOpen ? handleEditData : handleAddData}
              disabled={isSubmitting}
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditModalOpen ? "Update Configuration" : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              PUE Details: {selectedPueConfigDetail?.customName}
            </DialogTitle>
            <DialogDescription>
              Detailed breakdown of Power Usage Effectiveness calculation
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total PUE</p>
                    <p className="text-2xl font-bold">
                      {selectedPueConfigDetail?.pue}
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-primary" />
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Monitored Racks
                    </p>
                    <p className="text-2xl font-bold">
                      {selectedPueConfigDetail?.pduList?.length || 0}
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-blue-500" />
                </div>
              </Card>
            </div>

            {/* Detailed Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Rack Name</TableHead>
                    <TableHead>Power (W)</TableHead>
                    <TableHead>Individual PUE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPueConfigDetail?.pduList?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="h-8 w-8 text-muted-foreground/50" />
                          <p className="text-muted-foreground">
                            No racks configured
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedPueConfigDetail?.pduList?.map((pdu, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {pdu.name || `Rack-${index + 1}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {pdu.keys.length} power keys
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {pdu.value?.toFixed(2) || "0.00"} W
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {calculatePUEForPdu(
                              selectedPueConfigDetail.mainPower.value,
                              pdu.value
                            )}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsDetailModalOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete PUE Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the PUE configuration for{" "}
              <strong>{configToDelete?.customName}</strong>? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeletingConfig}
              onClick={() => setConfigToDelete(null)}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeletingConfig}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeletingConfig && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete Configuration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
