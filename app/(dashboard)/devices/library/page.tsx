"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { FileBarChart, Download, RotateCw, Plus, Trash, Search, Upload, RefreshCcw, X, Loader2, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { connectMQTT } from "@/lib/mqttClient";
import type { MqttClient } from "mqtt";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge as UiBadge } from "@/components/ui/badge"; // already imported as Badge? let's just use Badge
import MQTTConnectionBadge from "@/components/mqtt-status";

// --- TOPICS from your Python middleware ---
const TOPIC_LIBRARY_DEVICES_SUMMARY = "library/devices/summary";
const TOPIC_LIBRARY_SEARCH_COMMAND = "library/devices/summary/search";
const TOPIC_LIBRARY_SEARCH_RESPONSE = "library/devices/summary/search/response";
const TOPIC_LIBRARY_COMMAND = "library/devices/command";
const TOPIC_LIBRARY_COMMAND_RESPONSE = "library/devices/command/response";

// New topics for edit functionality
const TOPIC_LIBRARY_EDIT_LOAD_COMMAND = "library/devices/edit/load";
const TOPIC_LIBRARY_EDIT_LOAD_RESPONSE = "library/devices/edit/load/response";

// Define a type for device data entry for better type safety
interface DeviceVariableEntry {
  var_name: string;
  relative_address: number | "";
  register_type: string;
  word_length: number;
  data_type: string;
  multiplier: number;
}

export default function FileLibraryPage() {
  const [status, setStatus] = useState<"connected" | "disconnected" | "error">("disconnected");
  const [fileName, setFileName] = useState<string | null>(null);
  const clientRef = useRef<MqttClient | null>(null);

  // State for Device Library Management
  const [activeLibraryType, setActiveLibraryType] = useState<"modbus" | "i2c">("modbus");
  const [deviceSummaryData, setDeviceSummaryData] = useState<{ modbus: any, i2c: any }>({ modbus: {}, i2c: {} });
  const deviceSummary = deviceSummaryData[activeLibraryType] || {};
  const [newSectionName, setNewSectionName] = useState<string>("");
  const [sectionToDelete, setSectionToDelete] = useState<string>("");
  const [searchSection, setSearchSection] = useState<string>("");
  const [searchManufacturer, setSearchManufacturer] = useState<string>("");
  const [searchPartNumber, setSearchPartNumber] = useState<string>("");
  const [searchProtocol, setSearchProtocol] = useState<string>("");
  const [searchResult, setSearchResult] = useState<any>(null);

  // State for Add New Device
  const [newDeviceSection, setNewDeviceSection] = useState<string>(""); // Initialize with empty string for no selection
  const [newDeviceManufacturer, setNewDeviceManufacturer] = useState<string>("");
  const [newDevicePartNumber, setNewDevicePartNumber] = useState<string>("");
  const [newDeviceProtocol, setNewDeviceProtocol] = useState<string>("");
  const [newDeviceVariables, setNewDeviceVariables] = useState<DeviceVariableEntry[]>([]);

  // State for Update Device
  const [updateSection, setUpdateSection] = useState<string>("");
  const [updateManufacturer, setUpdateManufacturer] = useState<string>("");
  const [updatePartNumber, setUpdatePartNumber] = useState<string>("");
  const [updateProtocol, setUpdateProtocol] = useState<string>("");
  const [updateDeviceVariables, setUpdateDeviceVariables] = useState<DeviceVariableEntry[]>([]);
  const [selectedDeviceForUpdate, setSelectedDeviceForUpdate] = useState<any>(null);
  const [isLoadingForUpdate, setIsLoadingForUpdate] = useState<boolean>(false);
  const [isLoadingDeviceData, setIsLoadingDeviceData] = useState<boolean>(false);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);

  // Memoized list of existing sections for the dropdown
  const existingSections = useMemo(() => {
    return Object.keys(deviceSummary).sort();
  }, [deviceSummary]);

  // Organize sections into logical tab groups
  const organizedSections = useMemo(() => {
    const powerSystems = ['ups', 'rectifier', 'battery', 'pdu'];
    const monitoring = ['power_meter', 'switch', 'pfc'];
    const cooling = ['aircond'];
    const control = ['Controller'];
    const sensors = ['environment', 'water', 'Sensor_RS485'];

    const tabs = {
      'Power Systems': powerSystems,
      'Monitoring': monitoring,
      'Cooling': cooling,
      'Control': control,
      'Sensors': sensors,
      'Others': [] as string[]
    };

    // Add sections that don't fit in predefined categories to 'Others'
    const predefinedSections = [...powerSystems, ...monitoring, ...cooling, ...control, ...sensors];
    tabs.Others = existingSections.filter(section => !predefinedSections.includes(section));

    return tabs;
  }, [existingSections]);

  // Memoized manufacturers for selected section
  const availableManufacturers = useMemo(() => {
    if (!updateSection || !deviceSummary[updateSection]) return [];
    const manufacturers = new Set<string>();
    deviceSummary[updateSection].forEach((device: any) => {
      manufacturers.add(device.manufacturer);
    });
    return Array.from(manufacturers).sort();
  }, [updateSection, deviceSummary]);

  // Memoized part numbers for selected section and manufacturer
  const availablePartNumbers = useMemo(() => {
    if (!updateSection || !updateManufacturer || !deviceSummary[updateSection]) return [];
    const partNumbers = new Set<string>();
    deviceSummary[updateSection]
      .filter((device: any) => device.manufacturer === updateManufacturer)
      .forEach((device: any) => {
        partNumbers.add(device.part_number);
      });
    return Array.from(partNumbers).sort();
  }, [updateSection, updateManufacturer, deviceSummary]);

  // Memoized protocols for selected section, manufacturer, and part number
  const availableProtocols = useMemo(() => {
    if (!updateSection || !updateManufacturer || !updatePartNumber || !deviceSummary[updateSection]) return [];
    const protocols = new Set<string>();
    deviceSummary[updateSection]
      .filter((device: any) =>
        device.manufacturer === updateManufacturer &&
        device.part_number === updatePartNumber
      )
      .forEach((device: any) => {
        protocols.add(device.protocol);
      });
    return Array.from(protocols).sort();
  }, [updateSection, updateManufacturer, updatePartNumber, deviceSummary]);

  const restartService = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot restart service.");
      return;
    }

    const cmd = JSON.stringify({
      action: "restart",
      services: ["MODBUS.service"],
    });
    clientRef.current.publish("service/command", cmd, (err) => {
      if (err) {
        toast.error(`Failed to send restart command: ${err.message}`, { id: "restartToast" });
        console.error("Publish error:", err);
      } else {
        toast.loading("Restarting MODBUS.service...", { id: "restartToast" });
      }
    });
  };

  useEffect(() => {
    const mqttClientInstance = connectMQTT();
    clientRef.current = mqttClientInstance;

    const handleConnect = () => {
      setStatus("connected");
      mqttClientInstance.subscribe("response_file_transfer");
      mqttClientInstance.subscribe("service/response");
      mqttClientInstance.subscribe("download_file_response");
      mqttClientInstance.subscribe(TOPIC_LIBRARY_DEVICES_SUMMARY);
      mqttClientInstance.subscribe(TOPIC_LIBRARY_SEARCH_RESPONSE);
      mqttClientInstance.subscribe(TOPIC_LIBRARY_COMMAND_RESPONSE);
      mqttClientInstance.subscribe(TOPIC_LIBRARY_EDIT_LOAD_RESPONSE);
      toast.success("Connected to MQTT Broker.");
    };

    const handleError = (err: Error) => {
      console.error("MQTT Client Error:", err);
      setStatus("error");
      toast.error(`MQTT Error: ${err.message}`);
    };

    const handleClose = () => {
      setStatus("disconnected");
      toast.warning("Disconnected from MQTT Broker.");
    };

    const handleMessage = (topic: string, payload: Buffer) => {
      try {
        const data = JSON.parse(payload.toString());

        if (topic === "response_file_transfer") {
          if (data.status === "success" && data.action === "upload") {
            toast.success("devices.json uploaded successfully.");
            if (clientRef.current) {
              restartService();
            } else {
              console.warn("ClientRef is null when trying to restart service after upload success.");
            }
          } else if (data.status === "error") {
            toast.error(data.message || "Upload failed");
            console.error("File upload error response:", data);
          }
        } else if (topic === "service/response") {
          if (data.result === "success") {
            toast.success(data.message || "Service restarted successfully.");
          } else {
            toast.error(data.message || "Service restart failed.");
            console.error("Service restart error response:", data);
          }
        } else if (topic === "download_file_response") {
          if (data.status === "success" && data.action === "download" && data.content) {
            const blob = new Blob([atob(data.content)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "devices.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("devices.json downloaded successfully.");
          } else if (data.status === "error") {
            toast.error(data.message || "Download failed");
            console.error("File download error response:", data);
          }
        }
        else if (topic === TOPIC_LIBRARY_DEVICES_SUMMARY) {
          if (data.library_type === "i2c") {
            setDeviceSummaryData(prev => ({ ...prev, i2c: data.data || {} }));
          } else {
            setDeviceSummaryData(prev => ({ ...prev, modbus: data.data || {} }));
          }
        } else if (topic === TOPIC_LIBRARY_SEARCH_RESPONSE) {
          if (data.status === "success" && data.data) {
            // Check if this is for update device using flag
            if (isLoadingForUpdate) {
              // Load device data for update
              setSelectedDeviceForUpdate(data.data);
              console.log("Loading device data for update:", data.data); // Debug log

              if (data.data.data && Array.isArray(data.data.data)) {
                const processedVariables = data.data.data
                  .filter((variable: any) => variable && typeof variable === 'object') // Filter out invalid entries
                  .map((variable: any) => {
                    // Clean up data types
                    let cleanDataType = variable.data_type || "UINT16";
                    if (cleanDataType === "UINT3T16") cleanDataType = "UINT16"; // Fix corrupted data type
                    if (cleanDataType === "INve_address") cleanDataType = "INT16"; // Fix corrupted data type

                    // Ensure valid data types
                    const validDataTypes = ["UINT16", "INT16", "UINT32", "INT32", "FLOAT32", "BOOLEAN"];
                    if (!validDataTypes.includes(cleanDataType)) {
                      cleanDataType = "UINT16"; // Default fallback
                    }

                    return {
                      var_name: variable.var_name || "",
                      relative_address: typeof variable.relative_address === 'number' ? variable.relative_address :
                        (variable.relative_address || ""),
                      register_type: variable.register_type || "Holding Register",
                      word_length: Number(variable.word_length) || 1,
                      data_type: cleanDataType,
                      multiplier: Number(variable.multiplier) || 1,
                    };
                  });

                console.log("Processed variables for update:", processedVariables); // Debug log
                setUpdateDeviceVariables(processedVariables);
              } else {
                console.log("No device data array found, setting empty array"); // Debug log
                setUpdateDeviceVariables([]);
              }

              setIsLoadingForUpdate(false); // Reset flag
              toast.success("Device data loaded for editing!", { id: "loadDeviceToast" });
            } else {
              // Regular search result
              setSearchResult(data);
              toast.success("Device found!");
            }
          } else {
            setIsLoadingForUpdate(false); // Reset flag on error
            if (!isLoadingForUpdate) {
              setSearchResult(data);
            }
            toast.info(data.message || "Device not found.");
          }
        } else if (topic === TOPIC_LIBRARY_EDIT_LOAD_RESPONSE) {
          // Handle edit load response
          console.log("Edit load response received:", data); // Debug log

          if (data.status === "success" && data.data) {
            setSelectedDeviceForUpdate(data.data);

            if (data.data.data && Array.isArray(data.data.data)) {
              const processedVariables = data.data.data
                .filter((variable: any) => variable && typeof variable === 'object') // Filter out invalid entries
                .map((variable: any) => {
                  // Clean up data types
                  let cleanDataType = variable.data_type || "UINT16";
                  if (cleanDataType === "UINT3T16") cleanDataType = "UINT16"; // Fix corrupted data type
                  if (cleanDataType === "INve_address") cleanDataType = "INT16"; // Fix corrupted data type

                  // Ensure valid data types
                  const validDataTypes = ["UINT16", "INT16", "UINT32", "INT32", "FLOAT32", "BOOLEAN"];
                  if (!validDataTypes.includes(cleanDataType)) {
                    cleanDataType = "UINT16"; // Default fallback
                  }

                  return {
                    var_name: variable.var_name || "",
                    relative_address: typeof variable.relative_address === 'number' ? variable.relative_address :
                      (variable.relative_address || ""),
                    register_type: variable.register_type || "Holding Register",
                    word_length: Number(variable.word_length) || 1,
                    data_type: cleanDataType,
                    multiplier: Number(variable.multiplier) || 1,
                  };
                });

              console.log("Processed variables for edit:", processedVariables); // Debug log
              setUpdateDeviceVariables(processedVariables);
            } else {
              console.log("No device data array found, setting empty array"); // Debug log
              setUpdateDeviceVariables([]);
            }

            setIsLoadingForUpdate(false); // Reset flag
            setIsLoadingDeviceData(false); // Reset loading button state
            toast.success("Device data loaded for editing!", { id: "loadDeviceToast" });
          } else {
            setIsLoadingForUpdate(false); // Reset flag on error
            setIsLoadingDeviceData(false); // Reset loading button state on error
            toast.error(data.message || "Failed to load device data for editing.");
          }
        } else if (topic === TOPIC_LIBRARY_COMMAND_RESPONSE) {
          if (data.status === "success") {
            toast.success(data.message || "Command executed successfully.");
          } else {
            toast.error(data.message || "Command failed.");
            console.error("Library command error response:", data);
          }
        }
      } catch (err) {
        toast.error("Invalid payload format received from MQTT.");
        console.error("MQTT message parsing error:", err);
      }
    };

    mqttClientInstance.on("connect", handleConnect);
    mqttClientInstance.on("error", handleError);
    mqttClientInstance.on("close", handleClose);
    mqttClientInstance.on("message", handleMessage);

    return () => {
      if (mqttClientInstance.connected) {
        mqttClientInstance.unsubscribe("response_file_transfer");
        mqttClientInstance.unsubscribe("service/response");
        mqttClientInstance.unsubscribe("download_file_response");
        mqttClientInstance.unsubscribe(TOPIC_LIBRARY_DEVICES_SUMMARY);
        mqttClientInstance.unsubscribe(TOPIC_LIBRARY_SEARCH_RESPONSE);
        mqttClientInstance.unsubscribe(TOPIC_LIBRARY_COMMAND_RESPONSE);
        mqttClientInstance.unsubscribe(TOPIC_LIBRARY_EDIT_LOAD_RESPONSE);
      }
      mqttClientInstance.off("connect", handleConnect);
      mqttClientInstance.off("error", handleError);
      mqttClientInstance.off("close", handleClose);
      mqttClientInstance.off("message", handleMessage);
    };
  }, []);

  const confirmDownload = () => {
    if (confirm(`Download devices.json file for ${activeLibraryType === "modbus" ? "Modbus" : "I2C"}?`)) {
      downloadFile();
    }
  };

  const confirmUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.name !== "devices.json") {
      toast.error("Invalid file. Please select devices.json");
      return;
    }

    if (confirm(`Upload and replace devices.json file for ${activeLibraryType === "modbus" ? "Modbus" : "I2C"}? This will restart the MODBUS service.`)) {
      uploadFile(file);
    }
    e.target.value = '';
  };

  const downloadFile = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot download file.");
      return;
    }
    toast.loading("Requesting devices.json download...", { id: "downloadToast" });
    const cmd = JSON.stringify({
      action: "download",
      filepath: activeLibraryType === "modbus" ? "../MODBUS/JSON/Config/Library/devices.json" : "../MODULAR_I2C/JSON/Config/Library/devices.json",
    });
    clientRef.current.publish("command_download_file", cmd, (err) => {
      if (err) {
        toast.error(`Failed to send download command: ${err.message}`, { id: "downloadToast" });
        console.error("Publish error:", err);
      }
    });
  };

  const uploadFile = (file: File) => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot upload file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const content = btoa(reader.result as string);
      const cmd = JSON.stringify({
        action: "upload",
        filepath: activeLibraryType === "modbus" ? "../MODBUS/JSON/Config/Library/devices.json" : "../MODULAR_I2C/JSON/Config/Library/devices.json",
        content: content,
      });
      clientRef.current?.publish("command_upload_file", cmd, (err) => {
        if (err) {
          toast.error(`Failed to send upload command: ${err.message}`, { id: "uploadToast" });
          console.error("Publish error:", err);
        } else {
          toast.loading("Uploading devices.json...", { id: "uploadToast" });
        }
      });
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsBinaryString(file);
  };

  const refreshData = () => {
    toast.info("Refreshing page for MQTT connection re-initialization...");
    window.location.reload();
  };

  // --- Device Library Management Functions ---

  const handleCreateNewSection = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot create section.");
      return;
    }
    if (!newSectionName.trim()) {
      toast.error("Section name cannot be empty.");
      return;
    }

    const cmd = JSON.stringify({
      command: "Create New Section",
      data: newSectionName.trim(),
      library_type: activeLibraryType,
    });
    clientRef.current.publish(TOPIC_LIBRARY_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to send create section command: ${err.message}`);
        console.error("Publish error:", err);
      } else {
        toast.loading("Creating new section...", { id: "createSectionToast" });
        setNewSectionName("");
      }
    });
  };

  const handleDeleteSection = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot delete section.");
      return;
    }
    if (!sectionToDelete.trim()) {
      toast.error("Section name to delete cannot be empty.");
      return;
    }
    if (!confirm(`Are you sure you want to delete section "${sectionToDelete}"? This action cannot be undone.`)) {
      return;
    }

    const cmd = JSON.stringify({
      command: "Delete Section",
      data: sectionToDelete.trim(),
      library_type: activeLibraryType,
    });
    clientRef.current.publish(TOPIC_LIBRARY_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to send delete section command: ${err.message}`);
        console.error("Publish error:", err);
      } else {
        toast.loading("Deleting section...", { id: "deleteSectionToast" });
        setSectionToDelete("");
      }
    });
  };

  const handleSearchDevice = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot search device.");
      return;
    }
    if (!searchSection.trim()) {
      toast.error("Section is required for device search.");
      return;
    }

    const searchParams: { [key: string]: string } = {
      section: searchSection.trim(),
    };
    if (searchManufacturer.trim()) searchParams.manufacturer = searchManufacturer.trim();
    if (searchPartNumber.trim()) searchParams.part_number = searchPartNumber.trim();
    if (searchProtocol.trim()) searchParams.protocol = searchProtocol.trim();

    const cmd = JSON.stringify({
      command: "Get Data",
      search_params: searchParams,
      library_type: activeLibraryType,
    });
    clientRef.current.publish(TOPIC_LIBRARY_SEARCH_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to send search command: ${err.message}`);
        console.error("Publish error:", err);
      } else {
        toast.loading("Searching for device...", { id: "searchDeviceToast" });
        setSearchResult(null); // Clear previous search result while loading
      }
    });
  };

  // --- Functions for managing newDeviceVariables array ---
  const handleAddDeviceVariable = () => {
    setNewDeviceVariables(prev => [
      ...prev,
      {
        var_name: "",
        relative_address: "",
        register_type: "Holding Register",
        word_length: 1,
        data_type: "UINT16",
        multiplier: 1,
      },
    ]);
  };

  const handleRemoveDeviceVariable = (index: number) => {
    setNewDeviceVariables(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeviceVariableChange = (
    index: number,
    field: keyof DeviceVariableEntry,
    value: string | number
  ) => {
    setNewDeviceVariables(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // --- Load Device for Update ---
  const handleLoadDeviceForUpdate = () => {
    if (!updateSection || !updateManufacturer || !updatePartNumber || !updateProtocol) {
      toast.error("Please select section, manufacturer, part number, and protocol first.");
      return;
    }

    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot load device data.");
      return;
    }

    setIsLoadingForUpdate(true); // Set flag untuk indicates this is for update
    setIsLoadingDeviceData(true); // Set loading state for button

    const editParams = {
      section: updateSection,
      manufacturer: updateManufacturer,
      part_number: updatePartNumber,
      protocol: updateProtocol
    };

    const cmd = JSON.stringify({
      edit_params: editParams,
      library_type: activeLibraryType,
    });

    console.log("Sending edit load command:", cmd); // Debug log

    clientRef.current.publish(TOPIC_LIBRARY_EDIT_LOAD_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to load device data: ${err.message}`);
        console.error("Publish error:", err);
        setIsLoadingForUpdate(false);
        setIsLoadingDeviceData(false);
      } else {
        toast.loading("Loading device data for editing...", { id: "loadDeviceToast" });
        // Add timeout to simulate loading for 1-5 seconds as requested
        setTimeout(() => {
          setIsLoadingDeviceData(false);
        }, Math.random() * 4000 + 1000); // Random between 1-5 seconds
      }
    });
  };

  // --- Update Device Variables Functions ---
  const handleAddUpdateDeviceVariable = () => {
    setUpdateDeviceVariables(prev => [
      ...prev,
      {
        var_name: "",
        relative_address: "",
        register_type: "Holding Register",
        word_length: 1,
        data_type: "UINT16",
        multiplier: 1,
      },
    ]);
  };

  const handleRemoveUpdateDeviceVariable = (index: number) => {
    setUpdateDeviceVariables(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDeviceVariableChange = (
    index: number,
    field: keyof DeviceVariableEntry,
    value: string | number
  ) => {
    setUpdateDeviceVariables(prev =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  };

  // --- Update Device Function ---
  const handleUpdateDevice = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot update device.");
      return;
    }
    if (!updateSection || !updateManufacturer || !updatePartNumber || !updateProtocol) {
      toast.error("Device selection is incomplete. Please load a device first.");
      return;
    }

    const formattedDeviceData = updateDeviceVariables.map(variable => {
      const parsedAddress = typeof variable.relative_address === 'string'
        ? parseInt(variable.relative_address, 10)
        : variable.relative_address;

      if (isNaN(parsedAddress as number) || variable.var_name.trim() === "") {
        toast.error("All 'Var Name' and 'Relative Address' fields in Device Data must be filled correctly.");
        throw new Error("Invalid device data input.");
      }

      return {
        ...variable,
        relative_address: parsedAddress,
        word_length: Number(variable.word_length),
        multiplier: Number(variable.multiplier),
      };
    });

    const cmd = JSON.stringify({
      command: "Update Data",
      section: updateSection,
      device_params: {
        manufacturer: updateManufacturer,
        part_number: updatePartNumber,
        protocol: updateProtocol,
        data: formattedDeviceData,
      },
      library_type: activeLibraryType,
    });

    clientRef.current.publish(TOPIC_LIBRARY_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to send update device command: ${err.message}`);
        console.error("Publish error:", err);
      } else {
        toast.loading("Updating device...", { id: "updateDeviceToast" });
      }
    });
  };

  // --- Reset Update Device Form ---
  const resetUpdateDeviceForm = () => {
    setUpdateSection("");
    setUpdateManufacturer("");
    setUpdatePartNumber("");
    setUpdateProtocol("");
    setUpdateDeviceVariables([]);
    setSelectedDeviceForUpdate(null);
    setIsLoadingForUpdate(false);
  };

  // --- Reset cascading dropdowns for update device ---
  const handleUpdateSectionChange = (value: string) => {
    setUpdateSection(value);
    setUpdateManufacturer("");
    setUpdatePartNumber("");
    setUpdateProtocol("");
    setUpdateDeviceVariables([]);
    setSelectedDeviceForUpdate(null);
    setIsLoadingForUpdate(false);
  };

  const handleUpdateManufacturerChange = (value: string) => {
    setUpdateManufacturer(value);
    setUpdatePartNumber("");
    setUpdateProtocol("");
    setUpdateDeviceVariables([]);
    setSelectedDeviceForUpdate(null);
    setIsLoadingForUpdate(false);
  };

  const handleUpdatePartNumberChange = (value: string) => {
    setUpdatePartNumber(value);
    setUpdateProtocol("");
    setUpdateDeviceVariables([]);
    setSelectedDeviceForUpdate(null);
    setIsLoadingForUpdate(false);
  };

  const handleUpdateProtocolChange = (value: string) => {
    setUpdateProtocol(value);
    setUpdateDeviceVariables([]);
    setSelectedDeviceForUpdate(null);
    setIsLoadingForUpdate(false);
  };

  // --- Add New Device Function ---
  const handleAddNewDevice = () => {
    if (!clientRef.current || !clientRef.current.connected) {
      toast.error("MQTT not connected. Cannot add new device.");
      return;
    }
    if (!newDeviceSection || !newDeviceManufacturer.trim() || !newDevicePartNumber.trim() || !newDeviceProtocol.trim()) {
      toast.error("Section, Manufacturer, Part Number, and Protocol are required to add a device.");
      return;
    }

    const formattedDeviceData = newDeviceVariables.map(variable => {
      const parsedAddress = typeof variable.relative_address === 'string'
        ? parseInt(variable.relative_address, 10)
        : variable.relative_address;

      if (isNaN(parsedAddress as number) || variable.var_name.trim() === "") {
        toast.error("All 'Var Name' and 'Relative Address' fields in Device Data must be filled correctly.");
        throw new Error("Invalid device data input.");
      }

      return {
        ...variable,
        relative_address: parsedAddress,
        word_length: Number(variable.word_length),
        multiplier: Number(variable.multiplier),
      };
    });

    const cmd = JSON.stringify({
      command: "Create Data",
      section: newDeviceSection, // newDeviceSection now holds the selected value
      device_params: {
        manufacturer: newDeviceManufacturer.trim(),
        part_number: newDevicePartNumber.trim(),
        protocol: newDeviceProtocol.trim(),
        data: formattedDeviceData,
      },
      library_type: activeLibraryType,
    });

    clientRef.current.publish(TOPIC_LIBRARY_COMMAND, cmd, (err) => {
      if (err) {
        toast.error(`Failed to send add device command: ${err.message}`);
        console.error("Publish error:", err);
      } else {
        toast.loading("Adding new device...", { id: "addDeviceToast" });
        setNewDeviceSection("");
        setNewDeviceManufacturer("");
        setNewDevicePartNumber("");
        setNewDeviceProtocol("");
        setNewDeviceVariables([]);
      }
    });
  };



  return (
    <div>
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-5 w-5" />
          <h1 className="text-lg font-semibold">File Library Management</h1>
        </div>
        <div className="flex items-center gap-2">
          <MQTTConnectionBadge />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={refreshData}
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <Tabs value={activeLibraryType} onValueChange={(val) => setActiveLibraryType(val as "modbus" | "i2c")} className="w-[400px]">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="modbus">Modbus Library</TabsTrigger>
              <TabsTrigger value="i2c">Modular I2C Library</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs defaultValue="library" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="library">Device Library</TabsTrigger>
            <TabsTrigger value="search">Search Devices</TabsTrigger>
            <TabsTrigger value="manage">Manage Library</TabsTrigger>
            <TabsTrigger value="update">Update Device</TabsTrigger>
            <TabsTrigger value="files">File Operations</TabsTrigger>
          </TabsList>

          {/* Device Library Tab */}
          <TabsContent value="library" className="space-y-6 mt-6">
            {/* Device Library Summary Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Device Library Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(deviceSummary).length > 0 ? (
                  <Tabs defaultValue="Power Systems" className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                      {Object.keys(organizedSections).map((tabName) => (
                        <TabsTrigger key={tabName} value={tabName} className="text-xs">
                          {tabName}
                        </TabsTrigger>
                      ))}
                    </TabsList>

                    {Object.entries(organizedSections).map(([tabName, sectionList]) => (
                      <TabsContent key={tabName} value={tabName} className="mt-4">
                        <div className="max-h-[60vh] overflow-y-auto space-y-4 pr-2">
                          {sectionList.length > 0 ? (
                            <Accordion type="multiple" className="w-full space-y-2">
                              {sectionList
                                .filter(sectionName => deviceSummary[sectionName])
                                .map((sectionName) => {
                                  const devices = deviceSummary[sectionName];
                                  return (
                                    <AccordionItem key={sectionName} value={sectionName} className="border rounded-md px-4 bg-card shadow-sm">
                                      <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center justify-between w-full pr-4">
                                          <div className="flex items-center gap-2">
                                            <span className="font-semibold text-base capitalize">
                                              {sectionName.replace(/_/g, ' ')}
                                            </span>
                                            <Badge variant="secondary" className="ml-2">
                                              {Array.isArray(devices) ? devices.length : 0} Devices
                                            </Badge>
                                          </div>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="pt-2 pb-4">
                                          {Array.isArray(devices) && devices.length > 0 ? (
                                            <div className="rounded-md border overflow-hidden">
                                              <Table>
                                                <TableHeader className="bg-muted/50">
                                                  <TableRow>
                                                    <TableHead className="w-[30%]">Manufacturer</TableHead>
                                                    <TableHead className="w-[40%]">Part Number</TableHead>
                                                    <TableHead className="w-[30%]">Protocol</TableHead>
                                                  </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                  {devices.map((device, deviceIndex) => (
                                                    <TableRow key={`${sectionName}-${device.part_number}-${deviceIndex}`} className="hover:bg-muted/50">
                                                      <TableCell className="font-medium text-primary">
                                                        {device.manufacturer}
                                                      </TableCell>
                                                      <TableCell>
                                                        {device.part_number}
                                                      </TableCell>
                                                      <TableCell>
                                                        <Badge variant="outline" className="text-blue-600 bg-blue-50/50 dark:bg-blue-950/50 font-medium">
                                                          {device.protocol}
                                                        </Badge>
                                                      </TableCell>
                                                    </TableRow>
                                                  ))}
                                                </TableBody>
                                              </Table>
                                            </div>
                                          ) : (
                                            <div className="text-sm text-muted-foreground italic py-2">
                                              {Array.isArray(devices) ? "No devices in this section." : "Error: Invalid data format. Expected an array."}
                                            </div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                            </Accordion>
                          ) : (
                            <p className="text-muted-foreground text-sm text-center py-8">
                              No devices available in this category.
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    No device summary available or loading... Ensure the backend service is running and publishing updates to `{TOPIC_LIBRARY_DEVICES_SUMMARY}`.
                  </p>
                )}
                <Button
                  onClick={() => { /* This button currently just reloads page. Backend sends updates periodically */ }}
                  className="mt-4"
                  variant="outline"
                  size="sm"
                  disabled={true}
                >
                  <RotateCw className="mr-2 h-4 w-4" /> Summary updates periodically
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Search Devices Tab */}
          <TabsContent value="search" className="space-y-6 mt-6">
            {/* Search Device Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Search Device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="search-section">Section (Required)</Label>
                    <Input id="search-section" value={searchSection} onChange={(e) => setSearchSection(e.target.value)} placeholder="e.g., Modbus TCP" disabled={status !== "connected"} />
                  </div>
                  <div>
                    <Label htmlFor="search-manufacturer">Manufacturer</Label>
                    <Input id="search-manufacturer" value={searchManufacturer} onChange={(e) => setSearchManufacturer(e.target.value)} placeholder="e.g., Siemens" disabled={status !== "connected"} />
                  </div>
                  <div>
                    <Label htmlFor="search-part-number">Part Number</Label>
                    <Input id="search-part-number" value={searchPartNumber} onChange={(e) => setSearchPartNumber(e.target.value)} placeholder="e.g., S7-1200" disabled={status !== "connected"} />
                  </div>
                  <div>
                    <Label htmlFor="search-protocol">Protocol</Label>
                    <Input id="search-protocol" value={searchProtocol} onChange={(e) => setSearchProtocol(e.target.value)} placeholder="e.g., MODBUS_TCP" disabled={status !== "connected"} />
                  </div>
                </div>
                <Button onClick={handleSearchDevice} disabled={status !== "connected" || !searchSection.trim()}>
                  <Search className="mr-2 h-4 w-4" /> Search Device
                </Button>

                {searchResult && (
                  <div className="mt-4">
                    <h3 className="text-md font-semibold mb-2">Search Result:</h3>
                    {searchResult.status === "success" && searchResult.data ? (
                      <div className="bg-muted p-3 rounded-md text-sm max-h-40 overflow-y-auto">
                        {searchResult.data.manufacturer && searchResult.data.part_number ? (
                          <div className="mb-2">
                            <h4 className="font-medium capitalize text-base mb-3">
                              Found Device:
                            </h4>
                            <div className="space-y-2">
                              <p><strong>Manufacturer:</strong> {searchResult.data.manufacturer}</p>
                              <p><strong>Part Number:</strong> {searchResult.data.part_number}</p>
                              <p><strong>Protocol:</strong> {searchResult.data.protocol}</p>
                              {searchResult.data.data && Array.isArray(searchResult.data.data) && searchResult.data.data.length > 0 && (
                                <div className="mt-3">
                                  <p className="font-medium mb-2">Device Variables:</p>
                                  <div className="bg-secondary p-2 rounded-sm max-h-32 overflow-y-auto">
                                    <ul className="space-y-1">
                                      {searchResult.data.data.map((variable: any, index: number) => (
                                        <li key={index} className="text-xs border-b border-border/20 pb-1 last:border-b-0">
                                          <div className="flex flex-wrap gap-2">
                                            <span><strong>Name:</strong> {variable.var_name || 'N/A'}</span>
                                            <span><strong>Address:</strong> {variable.relative_address || 'N/A'}</span>
                                            <span><strong>Type:</strong> {variable.register_type || 'N/A'}</span>
                                            <span><strong>Data Type:</strong> {variable.data_type || 'N/A'}</span>
                                            <span><strong>Length:</strong> {variable.word_length || 'N/A'}</span>
                                            <span><strong>Multiplier:</strong> {variable.multiplier || 'N/A'}</span>
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                </div>
                              )}
                              {searchResult.data.uom && (
                                <div className="mt-2">
                                  <p><strong>UOM:</strong> {searchResult.data.uom}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No specific device data found in the successful response.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-sm">
                        {searchResult.message || "No results found or error occurred."}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manage Library Tab */}
          <TabsContent value="manage" className="space-y-6 mt-6">
            {/* Manage Sections Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manage Sections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create New Section */}
                <div>
                  <Label htmlFor="new-section-name" className="mb-2 block">Create New Section</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-section-name"
                      placeholder="Enter new section name (e.g., Modbus RTU)"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      disabled={status !== "connected"}
                    />
                    <Button onClick={handleCreateNewSection} disabled={status !== "connected" || !newSectionName.trim()}>
                      <Plus className="mr-2 h-4 w-4" /> Create
                    </Button>
                  </div>
                </div>

                {/* Delete Section */}
                <div>
                  <Label htmlFor="delete-section-select" className="mb-2 block">Delete Section</Label>
                  <div className="flex gap-2">
                    <SearchableSelect
                      options={existingSections.map(section => ({
                        label: section.replace(/_/g, ' '),
                        value: section
                      }))}
                      value={sectionToDelete}
                      onValueChange={setSectionToDelete}
                      disabled={status !== "connected" || existingSections.length === 0}
                      placeholder="Select section to delete"
                    />
                    <Button variant="destructive" onClick={handleDeleteSection} disabled={status !== "connected" || !sectionToDelete.trim()}>
                      <Trash className="mr-2 h-4 w-4" /> Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Add New Device Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add New Device</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Add a new device by providing its details and custom data variables.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-device-section">Section (Required)</Label>
                    <SearchableSelect
                      options={existingSections.map(section => ({
                        label: section.replace(/_/g, ' '),
                        value: section
                      }))}
                      value={newDeviceSection}
                      onValueChange={setNewDeviceSection}
                      disabled={status !== "connected" || existingSections.length === 0}
                      placeholder="Select existing section"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-device-manufacturer">Manufacturer (Required)</Label>
                    <Input id="new-device-manufacturer" value={newDeviceManufacturer} onChange={(e) => setNewDeviceManufacturer(e.target.value)} placeholder="e.g., Schneider Electric" disabled={status !== "connected"} />
                  </div>
                  <div>
                    <Label htmlFor="new-device-part-number">Part Number (Required)</Label>
                    <Input id="new-device-part-number" value={newDevicePartNumber} onChange={(e) => setNewDevicePartNumber(e.target.value)} placeholder="e.g., TM221CE16R" disabled={status !== "connected"} />
                  </div>
                  <div>
                    <Label htmlFor="new-device-protocol">Protocol (Required)</Label>
                    <Input id="new-device-protocol" value={newDeviceProtocol} onChange={(e) => setNewDeviceProtocol(e.target.value)} placeholder="e.g., MODBUS_TCP" disabled={status !== "connected"} />
                  </div>
                </div>

                {/* Dynamic Device Data Array Inputs */}
                <div className="space-y-4 p-5 border rounded-lg bg-card shadow-sm relative">
                  <div className="flex justify-between items-center pb-2 border-b mb-4">
                    <div>
                      <Label className="text-base font-semibold text-primary">Device Data Variables</Label>
                      <p className="text-xs text-muted-foreground mt-1">Configure Modbus or I2C register mappings for this device.</p>
                    </div>
                  </div>
                  {newDeviceVariables.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-md bg-muted/30">
                      <Plus className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-muted-foreground text-sm font-medium">No variables defined</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Add Variable" below to define data points for this device.</p>
                    </div>
                  )}
                  {newDeviceVariables.map((variable, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 border p-4 rounded-md bg-background shadow-sm relative group hover:border-primary/50 transition-colors">
                      <Button
                        onClick={() => handleRemoveDeviceVariable(index)}
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-destructive/20"
                        disabled={status !== "connected"}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <div className="md:col-span-2 lg:col-span-3">
                        <Label htmlFor={`var_name-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Var Name</Label>
                        <Input
                          id={`var_name-${index}`}
                          value={variable.var_name}
                          onChange={(e) => handleDeviceVariableChange(index, "var_name", e.target.value)}
                          placeholder="e.g., Status word frequency"
                          disabled={status !== "connected"}
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <Label htmlFor={`relative_address-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Address</Label>
                        <Input
                          id={`relative_address-${index}`}
                          type="number"
                          value={variable.relative_address}
                          onChange={(e) => handleDeviceVariableChange(index, "relative_address", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                          placeholder="e.g., 3201"
                          disabled={status !== "connected"}
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <Label htmlFor={`register_type-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Reg. Type</Label>
                        <Select
                          value={variable.register_type}
                          onValueChange={(value) => handleDeviceVariableChange(index, "register_type", value)}
                          disabled={status !== "connected"}
                        >
                          <SelectTrigger id={`register_type-${index}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Holding Register">Holding Register</SelectItem>
                            <SelectItem value="Input Register">Input Register</SelectItem>
                            <SelectItem value="Coil">Coil</SelectItem>
                            <SelectItem value="Discrete Input">Discrete Input</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 lg:col-span-1">
                        <Label htmlFor={`word_length-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Length</Label>
                        <Input
                          id={`word_length-${index}`}
                          type="number"
                          value={variable.word_length}
                          onChange={(e) => handleDeviceVariableChange(index, "word_length", parseInt(e.target.value, 10))}
                          placeholder="e.g., 1"
                          disabled={status !== "connected"}
                        />
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <Label htmlFor={`data_type-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Data Type</Label>
                        <Select
                          value={variable.data_type}
                          onValueChange={(value) => handleDeviceVariableChange(index, "data_type", value)}
                          disabled={status !== "connected"}
                        >
                          <SelectTrigger id={`data_type-${index}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UINT16">UINT16</SelectItem>
                            <SelectItem value="INT16">INT16</SelectItem>
                            <SelectItem value="UINT32">UINT32</SelectItem>
                            <SelectItem value="INT32">INT32</SelectItem>
                            <SelectItem value="FLOAT32">FLOAT32</SelectItem>
                            <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2 lg:col-span-2">
                        <Label htmlFor={`multiplier-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Multiplier</Label>
                        <Input
                          id={`multiplier-${index}`}
                          type="number"
                          step="0.01"
                          value={variable.multiplier}
                          onChange={(e) => handleDeviceVariableChange(index, "multiplier", parseFloat(e.target.value))}
                          placeholder="e.g., 1"
                          disabled={status !== "connected"}
                        />
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <Button
                      onClick={handleAddDeviceVariable}
                      type="button"
                      variant="outline"
                      className="gap-2"
                      disabled={status !== "connected"}
                    >
                      <Plus className="h-4 w-4" /> Add Variable
                    </Button>

                    <Button
                      onClick={handleAddNewDevice}
                      className="gap-2"
                      disabled={status !== "connected" || !newDeviceSection || !newDeviceManufacturer.trim() || !newDevicePartNumber.trim() || !newDeviceProtocol.trim()}
                    >
                      <Plus className="h-4 w-4" /> Save Device
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Update Device Tab */}
          <TabsContent value="update" className="space-y-6 mt-6">
            {/* Device Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Device to Update</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select a device by choosing section, manufacturer, part number, and protocol. Then load the device data for editing.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Section Selection */}
                  <div>
                    <Label htmlFor="update-section">Section (Required)</Label>
                    <SearchableSelect
                      options={existingSections.map(section => ({
                        label: section.replace(/_/g, ' '),
                        value: section
                      }))}
                      value={updateSection}
                      onValueChange={handleUpdateSectionChange}
                      disabled={status !== "connected" || existingSections.length === 0}
                      placeholder="Select section"
                    />
                  </div>

                  {/* Manufacturer Selection */}
                  <div>
                    <Label htmlFor="update-manufacturer">Manufacturer (Required)</Label>
                    <SearchableSelect
                      options={availableManufacturers.map(manufacturer => ({
                        label: manufacturer,
                        value: manufacturer
                      }))}
                      value={updateManufacturer}
                      onValueChange={handleUpdateManufacturerChange}
                      disabled={status !== "connected" || !updateSection || availableManufacturers.length === 0}
                      placeholder={updateSection ? "Select manufacturer" : "Select section first"}
                    />
                  </div>

                  {/* Part Number Selection */}
                  <div>
                    <Label htmlFor="update-part-number">Part Number (Required)</Label>
                    <SearchableSelect
                      options={availablePartNumbers.map(partNumber => ({
                        label: partNumber,
                        value: partNumber
                      }))}
                      value={updatePartNumber}
                      onValueChange={handleUpdatePartNumberChange}
                      disabled={status !== "connected" || !updateSection || !updateManufacturer || availablePartNumbers.length === 0}
                      placeholder={updateManufacturer ? "Select part number" : "Select manufacturer first"}
                    />
                  </div>

                  {/* Protocol Selection */}
                  <div>
                    <Label htmlFor="update-protocol">Protocol (Required)</Label>
                    <SearchableSelect
                      options={availableProtocols.map(protocol => ({
                        label: protocol,
                        value: protocol
                      }))}
                      value={updateProtocol}
                      onValueChange={handleUpdateProtocolChange}
                      disabled={status !== "connected" || !updateSection || !updateManufacturer || !updatePartNumber || availableProtocols.length === 0}
                      placeholder={updatePartNumber ? "Select protocol" : "Select part number first"}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleLoadDeviceForUpdate}
                    disabled={status !== "connected" || !updateSection || !updateManufacturer || !updatePartNumber || !updateProtocol || isLoadingDeviceData}
                  >
                    {isLoadingDeviceData ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" /> Load Device Data
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetUpdateDeviceForm}
                    disabled={status !== "connected"}
                  >
                    <RefreshCcw className="mr-2 h-4 w-4" /> Reset Selection
                  </Button>

                  <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        disabled={status !== "connected"}
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <Info className="h-5 w-5 text-blue-500" />
                          Update Library Usage Guide
                        </DialogTitle>
                        <DialogDescription className="text-left space-y-4">
                          <div className="bg-blue-50 p-4 rounded-md border border-blue-200">
                            <h4 className="font-semibold text-blue-800 mb-2">How to Update Device Library:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                              <li><strong>Select Section:</strong> Choose the device category from the dropdown (e.g., ups, pdu, power_meter)</li>
                              <li><strong>Select Manufacturer:</strong> Pick the device manufacturer from available options in that section</li>
                              <li><strong>Select Part Number:</strong> Choose the specific part number for that manufacturer</li>
                              <li><strong>Select Protocol:</strong> Pick the communication protocol (e.g., Modbus RTU)</li>
                              <li><strong>Load Device Data:</strong> Click the "Load Device Data" button to fetch current device variables</li>
                              <li><strong>Edit Variables:</strong> Modify, add, or remove device variables as needed using the form below</li>
                              <li><strong>Save Changes:</strong> Click "Update Device" to save your modifications to the library</li>
                            </ol>
                          </div>

                          <div className="bg-green-50 p-4 rounded-md border border-green-200">
                            <h4 className="font-semibold text-green-800 mb-2">Variable Fields Explained:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                              <li><strong>Var Name:</strong> Descriptive name for the data point</li>
                              <li><strong>Relative Address:</strong> Memory address offset for the variable</li>
                              <li><strong>Register Type:</strong> Modbus register type (Holding, Input, Coil, Discrete)</li>
                              <li><strong>Word Length:</strong> Number of 16-bit words the variable occupies</li>
                              <li><strong>Data Type:</strong> Variable data format (UINT16, INT16, FLOAT32, etc.)</li>
                              <li><strong>Multiplier:</strong> Scaling factor applied to the raw value</li>
                            </ul>
                          </div>

                          <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
                            <h4 className="font-semibold text-yellow-800 mb-2">Important Notes:</h4>
                            <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                              <li>Loading device data may take 1-5 seconds depending on library size</li>
                              <li>All dropdowns are cascading - selecting one field affects the next</li>
                              <li>Use "Reset Selection" to clear all selections and start over</li>
                              <li>Changes are saved immediately to the device library file</li>
                              <li>Make sure MQTT connection is active before making changes</li>
                            </ul>
                          </div>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex justify-end pt-4">
                        <Button
                          onClick={() => setShowHelpDialog(false)}
                          className="bg-red-500 hover:bg-red-600 text-white"
                        >
                          <X className="mr-2 h-4 w-4" /> Close
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {selectedDeviceForUpdate && (
                  <div className="mt-4 p-3 bg-muted rounded-md">
                    <h4 className="font-medium mb-2">Selected Device:</h4>
                    <p className="text-sm">
                      <strong>Section:</strong> {selectedDeviceForUpdate.section} |
                      <strong> Manufacturer:</strong> {selectedDeviceForUpdate.manufacturer} |
                      <strong> Part Number:</strong> {selectedDeviceForUpdate.part_number} |
                      <strong> Protocol:</strong> {selectedDeviceForUpdate.protocol}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Update Device Data Card */}
            {selectedDeviceForUpdate && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Update Device Variables</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Edit the device variables below. You can add, remove, or modify existing variables.
                  </p>

                  {/* Dynamic Device Data Array Inputs */}
                  <div className="space-y-4 p-5 border rounded-lg bg-card shadow-sm relative">
                    <div className="flex justify-between items-center pb-2 border-b mb-4">
                      <div>
                        <Label className="text-base font-semibold text-primary">Device Data Variables</Label>
                        <p className="text-xs text-muted-foreground mt-1">Configure Modbus or I2C register mappings for this device.</p>
                      </div>
                    </div>
                    {updateDeviceVariables.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-center border-2 border-dashed rounded-md bg-muted/30">
                        <Plus className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                        <p className="text-muted-foreground text-sm font-medium">No variables defined</p>
                        <p className="text-xs text-muted-foreground mt-1">Click "Add Variable" below to define data points for this device.</p>
                      </div>
                    )}
                    {updateDeviceVariables.map((variable, index) => (
                      <div key={index} className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 border p-4 rounded-md bg-background shadow-sm relative group hover:border-primary/50 transition-colors">
                        <Button
                          onClick={() => handleRemoveUpdateDeviceVariable(index)}
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute -top-3 -right-3 h-7 w-7 rounded-full bg-destructive/10 text-destructive hover:bg-destructive hover:text-white opacity-0 group-hover:opacity-100 transition-opacity border border-destructive/20"
                          disabled={status !== "connected"}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="md:col-span-2 lg:col-span-3">
                          <Label htmlFor={`update_var_name-${index}`}>Var Name</Label>
                          <Input
                            id={`update_var_name-${index}`}
                            value={variable.var_name}
                            onChange={(e) => handleUpdateDeviceVariableChange(index, "var_name", e.target.value)}
                            placeholder="e.g., Status word frequency"
                            disabled={status !== "connected"}
                          />
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                          <Label htmlFor={`update_relative_address-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Address</Label>
                          <Input
                            id={`update_relative_address-${index}`}
                            type="number"
                            value={variable.relative_address}
                            onChange={(e) => handleUpdateDeviceVariableChange(index, "relative_address", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
                            placeholder="e.g., 3201"
                            disabled={status !== "connected"}
                          />
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                          <Label htmlFor={`update_register_type-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Reg. Type</Label>
                          <Select
                            value={variable.register_type}
                            onValueChange={(value) => handleUpdateDeviceVariableChange(index, "register_type", value)}
                            disabled={status !== "connected"}
                          >
                            <SelectTrigger id={`update_register_type-${index}`}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Holding Register">Holding Register</SelectItem>
                              <SelectItem value="Input Register">Input Register</SelectItem>
                              <SelectItem value="Coil">Coil</SelectItem>
                              <SelectItem value="Discrete Input">Discrete Input</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-1">
                          <Label htmlFor={`update_word_length-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Length</Label>
                          <Input
                            id={`update_word_length-${index}`}
                            type="number"
                            value={variable.word_length}
                            onChange={(e) => handleUpdateDeviceVariableChange(index, "word_length", parseInt(e.target.value, 10))}
                            placeholder="e.g., 1"
                            disabled={status !== "connected"}
                          />
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                          <Label htmlFor={`update_data_type-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Data Type</Label>
                          <Select
                            value={variable.data_type}
                            onValueChange={(value) => handleUpdateDeviceVariableChange(index, "data_type", value)}
                            disabled={status !== "connected"}
                          >
                            <SelectTrigger id={`update_data_type-${index}`}>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UINT16">UINT16</SelectItem>
                              <SelectItem value="INT16">INT16</SelectItem>
                              <SelectItem value="UINT32">UINT32</SelectItem>
                              <SelectItem value="INT32">INT32</SelectItem>
                              <SelectItem value="FLOAT32">FLOAT32</SelectItem>
                              <SelectItem value="BOOLEAN">BOOLEAN</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 lg:col-span-2">
                          <Label htmlFor={`update_multiplier-${index}`} className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-1 block">Multiplier</Label>
                          <Input
                            id={`update_multiplier-${index}`}
                            type="number"
                            step="0.01"
                            value={variable.multiplier}
                            onChange={(e) => handleUpdateDeviceVariableChange(index, "multiplier", parseFloat(e.target.value))}
                            placeholder="e.g., 1"
                            disabled={status !== "connected"}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center mt-6 pt-4 border-t">
                      <Button
                        onClick={handleAddUpdateDeviceVariable}
                        type="button"
                        variant="outline"
                        className="gap-2"
                        disabled={status !== "connected"}
                      >
                        <Plus className="h-4 w-4" /> Add Variable
                      </Button>

                      <Button
                        onClick={handleUpdateDevice}
                        className="gap-2"
                        disabled={status !== "connected" || !selectedDeviceForUpdate}
                      >
                        <Upload className="h-4 w-4" /> Update Device
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* File Operations Tab */}
          <TabsContent value="files" className="space-y-6 mt-6">
            {/* File Control Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">devices.json File Control</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <Button onClick={confirmDownload} className="w-full" disabled={status !== "connected"}>
                  <Download className="mr-2 h-4 w-4" /> Download devices.json
                </Button>
                <div>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={confirmUpload}
                    disabled={status !== "connected"}
                  />
                  {fileName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Selected: {fileName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}