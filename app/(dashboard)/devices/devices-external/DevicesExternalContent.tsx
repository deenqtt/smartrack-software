"use client";

import { useState, useEffect, useMemo } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/lib/toast-utils";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  HardDrive,
  Plus,
  Wifi,
  FileDown,
  FileUp,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Activity,
  Eye,
  ArrowUpDown,
  Filter,
  Download,
  Upload,
  Copy,
  MoreHorizontal,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DeviceImportExportDialog from "@/components/devices/DeviceImportExportDialog";

interface Device {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function DevicesExternalContent() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [filteredDevices, setFilteredDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [conflictFilter, setConflictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "topic" | "createdAt" | "status">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [visibleItemsCount, setVisibleItemsCount] = useState(20);
  const [hasMoreData, setHasMoreData] = useState(true);

  // License related state

  // MQTT related state
  const [payloads, setPayloads] = useState<Record<string, string>>({});
  const [connectionStatus, setConnectionStatus] = useState<"Connected" | "Disconnected">("Disconnected");

  const [formData, setFormData] = useState({
    name: "",
    topic: "",
    address: "",
  });

  // RBAC Permission Checks
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('devices-external');
  const { loading: menuLoading } = useMenu();

  // MQTT hooks
  const { isReady: serverReady, brokers, subscribe: serverSubscribe, unsubscribe: serverUnsubscribe } = useMqttServer();

  const fetchDevices = async () => {
    try {
      const response = await fetch("/api/devices/external", {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setDevices(data);
        setTotalItems(data.length);
      } else if (response.status === 403) {
        // Handle license-related errors
        const errorData = await response.json();
        if (errorData.message === "No active license found") {
          setLicenseError(errorData);
          setDevices([]);
          setTotalItems(0);
        } else {
          showToast.error(errorData.message || "Access denied");
        }
      } else {
        showToast.error("Failed to fetch devices");
      }
    } catch (error) {
      showToast.error("Failed to fetch devices");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView && !menuLoading) {
      fetchDevices();
    }
  }, [canView, menuLoading]);

  // MQTT subscriptions
  useEffect(() => {
    if (menuLoading || !serverReady || !canView) return;

    const topics = devices.map((d) => d.topic);
    if (topics.length === 0) return;

    const handleMessage = (topic: string, payload: string, serverId: string) => {
      if (topics.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };

    topics.forEach((topic) => {
      serverSubscribe(topic, handleMessage);
    });

    return () => {
      topics.forEach((topic) => {
        serverUnsubscribe(topic, () => { });
      });
    };
  }, [devices, serverReady, serverSubscribe, serverUnsubscribe, canView, menuLoading]);

  // Check MQTT connection status
  useEffect(() => {
    const activeBroker = brokers.find(broker => broker.status === 'connected');
    setConnectionStatus(activeBroker ? 'Connected' : 'Disconnected');
  }, [brokers]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItemsCount(20);
    setHasMoreData(true);
    setCurrentPage(1);
  }, [searchTerm, conflictFilter, statusFilter, sortBy, sortOrder]);

  // Get unique topics for count and identification
  const enrichedDevices = useMemo(() => {
    const nameCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};

    devices.forEach(d => {
      const nameKey = d.name.trim().toLowerCase();
      nameCounts[nameKey] = (nameCounts[nameKey] || 0) + 1;
      topicCounts[d.topic] = (topicCounts[d.topic] || 0) + 1;
    });

    return devices.map(d => ({
      ...d,
      hasNameConflict: nameCounts[d.name.trim().toLowerCase()] > 1,
      hasTopicConflict: topicCounts[d.topic] > 1,
      hasConflict: nameCounts[d.name.trim().toLowerCase()] > 1 || topicCounts[d.topic] > 1
    }));
  }, [devices]);

  // Filter and sort devices
  const processedDevices = useMemo(() => {
    let filtered = enrichedDevices.filter(device => {
      const matchesSearch = device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        device.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (device.address && device.address.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesConflict = conflictFilter === "all" ||
        (conflictFilter === "conflicts" && device.hasConflict);

      const matchesStatus = statusFilter === "all" ||
        (statusFilter === "active" && payloads[device.topic]) ||
        (statusFilter === "inactive" && !payloads[device.topic]);

      return matchesSearch && matchesConflict && matchesStatus;
    });

    // Sort devices
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "topic":
          aValue = a.topic.toLowerCase();
          bValue = b.topic.toLowerCase();
          break;
        case "createdAt":
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case "status":
          aValue = payloads[a.topic] ? 1 : 0;
          bValue = payloads[b.topic] ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [enrichedDevices, searchTerm, conflictFilter, statusFilter, sortBy, sortOrder, payloads]);

  // Lazy loading logic
  const loadMoreItems = async () => {
    if (isLazyLoading) return;

    setIsLazyLoading(true);

    // Simulate API delay for better UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const newCount = visibleItemsCount + 20;
    setVisibleItemsCount(newCount);

    // Check if we have more data
    if (newCount >= processedDevices.length) {
      setHasMoreData(false);
    }

    setIsLazyLoading(false);
  };

  const loadMoreManually = () => {
    loadMoreItems();
  };

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreData && !isLazyLoading) {
          loadMoreItems();
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    const sentinel = document.getElementById('lazy-load-sentinel');
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => {
      if (sentinel) {
        observer.unobserve(sentinel);
      }
    };
  }, [hasMoreData, isLazyLoading, visibleItemsCount, processedDevices.length]);
  const conflictCount = useMemo(() => {
    return enrichedDevices.filter(d => d.hasConflict).length;
  }, [enrichedDevices]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevices(processedDevices.map(d => d.id));
    } else {
      setSelectedDevices([]);
    }
  };

  const handleSelectDevice = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedDevices(prev => [...prev, id]);
    } else {
      setSelectedDevices(prev => prev.filter(deviceId => deviceId !== id));
    }
  };

  const handleBulkDelete = () => {
    const devicesToDelete = selectedDevices;
    if (devicesToDelete.length === 0) return;

    // Process deletions sequentially
    let successCount = 0;
    let errorCount = 0;

    devicesToDelete.forEach(async (id) => {
      try {
        const response = await fetch(`/api/devices/external/${id}`, { method: "DELETE", credentials: 'include' });
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
    });

    showToast.success(`Deleted ${successCount} devices`);
    if (errorCount > 0) {
      showToast.error(`Failed to delete ${errorCount} devices`);
    }

    fetchDevices();
    setSelectedDevices([]);
  };

  const handleSort = (column: "name" | "topic" | "createdAt" | "status") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };



  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success(`${label} copied to clipboard`);
    } catch (err) {
      showToast.error("Could not copy to clipboard");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingDevice ? `/api/devices/external/${editingDevice.id}` : "/api/devices/external";
      const method = editingDevice ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          topic: formData.topic,
          address: formData.address || null,
        }),
      });

      if (response.ok) {
        showToast.success(`Device ${editingDevice ? "updated" : "created"} successfully`);
        fetchDevices();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingDevice(null);
        setFormData({ name: "", topic: "", address: "" });
      } else {
        const error = await response.json();
        showToast.error(error.error || "Failed to save device");
      }
    } catch (error) {
      showToast.error("Failed to save device");
    }
  };

  const handleEdit = (device: Device) => {
    setEditingDevice(device);
    setFormData({
      name: device.name,
      topic: device.topic,
      address: device.address || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDuplicate = (device: Device) => {
    setEditingDevice(null);
    setFormData({
      name: `${device.name} (Copy)`,
      topic: `${device.topic}/copy`,
      address: device.address || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // Single delete implementation
    fetch(`/api/devices/external/${id}`, { method: "DELETE", credentials: 'include' })
      .then(response => {
        if (response.ok) {
          showToast.success("Device deleted successfully");
          fetchDevices();
        } else {
          showToast.error("Failed to delete device");
        }
      })
      .catch(error => {
        showToast.error("Failed to delete device");
      });
  };

  // RBAC Check
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view external devices."
        showActions={true}
      />
    );
  }

  if (loading) {
    return (
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-muted animate-pulse flex-shrink-0"></div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-6 bg-muted rounded w-48 animate-pulse"></div>
              <div className="h-4 bg-muted rounded w-64 animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-muted rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4">
              <div className="flex items-center animate-pulse">
                <div className="w-6 h-6 bg-muted rounded mr-3"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-6 bg-muted rounded w-12"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter Skeleton */}
        <div className="border rounded-lg p-6">
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 bg-muted rounded"></div>
              <div className="h-5 bg-muted rounded w-32"></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 h-10 bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="h-9 bg-muted rounded w-24"></div>
                <div className="h-9 bg-muted rounded w-24"></div>
                <div className="h-9 bg-muted rounded w-28"></div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="sm:w-48 h-10 bg-muted rounded"></div>
              <div className="sm:w-48 h-10 bg-muted rounded"></div>
            </div>
          </div>
        </div>

        {/* Table/Card Content Skeleton */}
        <div className="border rounded-lg">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-muted rounded"></div>
                <div className="h-5 bg-muted rounded w-32"></div>
              </div>
              <div className="h-4 bg-muted rounded w-48"></div>
            </div>
            <div className="h-4 bg-muted rounded w-64 mt-2"></div>
          </div>
          <div className="p-6">
            {/* Desktop Table Skeleton */}
            <div className="hidden lg:block animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-4 h-4 bg-muted rounded"></div>
                  <div className="h-4 bg-muted rounded flex-1 max-w-48"></div>
                  <div className="h-4 bg-muted rounded flex-1 max-w-32"></div>
                  <div className="h-4 bg-muted rounded w-24"></div>
                  <div className="h-4 bg-muted rounded w-16"></div>
                  <div className="h-4 bg-muted rounded w-20"></div>
                  <div className="h-8 bg-muted rounded w-8 ml-auto"></div>
                </div>
              ))}
            </div>

            {/* Mobile Card Skeleton */}
            <div className="lg:hidden space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg overflow-hidden animate-pulse">
                  <div className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-4 h-4 bg-muted rounded"></div>
                        <div className="w-10 h-10 bg-muted rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-32"></div>
                          <div className="h-3 bg-muted rounded w-20"></div>
                        </div>
                      </div>
                      <div className="w-8 h-8 bg-muted rounded"></div>
                    </div>

                    {/* Topic */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 bg-muted rounded w-12"></div>
                        <div className="h-4 bg-muted rounded flex-1"></div>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 bg-muted rounded w-16"></div>
                        <div className="h-4 bg-muted rounded w-24"></div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="h-3 bg-muted rounded w-32"></div>
                      <div className="h-4 bg-muted rounded w-20"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">External Devices</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage and monitor your external MQTT devices</p>
          </div>
        </div>

        <div className="flex gap-2">
          {canCreate && (
            <DeviceImportExportDialog onDevicesImported={fetchDevices} />
          )}
          {canCreate && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Device
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Device</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Add a new external device for MQTT monitoring.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  {/* Row 1: Device Name (Full Width) */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Device Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Temperature Sensor"
                      required
                    />
                  </div>

                  {/* Row 2: MQTT Topic (Full Width) */}
                  <div className="space-y-2">
                    <Label htmlFor="topic" className="text-sm">MQTT Topic *</Label>
                    <Input
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g., sensors/temperature"
                      className="font-mono"
                      required
                    />
                  </div>

                  {/* Row 3: Address (Full Width) */}
                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-sm">Address (Optional)</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g., 192.168.1.100"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setFormData({ name: "", topic: "", address: "" });
                      }}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto">Add Device</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <HardDrive className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Devices</p>
                <p className="text-2xl font-bold">{devices.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-purple-500"
          onClick={() => setStatusFilter("active")}
        >
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-purple-600" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Active Devices</p>
                <p className="text-2xl font-bold">
                  {Object.keys(payloads).filter(topic => payloads[topic]).length}
                </p>
              </div>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Devices receiving MQTT messages
            </p>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer hover:bg-muted/20 transition-colors border-l-4 ${conflictCount > 0 ? "border-l-orange-500 animate-pulse-slow" : "border-l-amber-500"}`}
          onClick={() => setConflictFilter(conflictFilter === "conflicts" ? "all" : "conflicts")}
        >
          <CardContent className="p-4">
            <div className="flex items-center">
              <Filter className={`h-6 w-6 ${conflictCount > 0 ? "text-orange-600" : "text-amber-600"}`} />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Device Conflicts</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${conflictCount > 0 ? "text-orange-600" : ""}`}>
                    {conflictCount}
                  </p>
                  {conflictCount > 0 && (
                    <Badge variant="outline" className="text-[10px] h-4 bg-orange-50 text-orange-600 border-orange-200">
                      ACTION REQUIRED
                    </Badge>
                  )}
                </div>
              </div>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {conflictCount > 0
                ? "Items sharing same name or topic"
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
                    placeholder="Search devices by name, topic, or address..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setSearchTerm("");
                    setConflictFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
                {selectedDevices.length > 0 && canDelete && (
                  <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedDevices.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="sm:w-56">
                <Select value={conflictFilter} onValueChange={setConflictFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Show All Devices" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Devices</SelectItem>
                    <SelectItem value="conflicts" className="text-orange-600 font-semibold">
                      Conflicts (Duplicate Name/Topic)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Activity className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || conflictFilter !== "all" || statusFilter !== "all") && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
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
                {conflictFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1 bg-orange-50 text-orange-700 border-orange-200">
                    Conflict: {conflictFilter === 'conflicts' ? 'Duplicate Name/Topic' : conflictFilter}
                    <button
                      onClick={() => setConflictFilter("all")}
                      className="ml-1 hover:bg-orange-200 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter === "active" ? "Active" : "Inactive"}
                    <button
                      onClick={() => setStatusFilter("all")}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Devices List
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {processedDevices.length} of {devices.length} devices
            </div>
          </CardTitle>
          <CardDescription>
            All external devices in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            {devices.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first external device.
                </p>
              </div>
            ) : processedDevices.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Try adjusting your search or filter criteria.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDevices.length === processedDevices.length && processedDevices.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 font-semibold">
                        Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("topic")} className="h-auto p-0 font-semibold">
                        Topic
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("status")} className="h-auto p-0 font-semibold">
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("createdAt")} className="h-auto p-0 font-semibold">
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedDevices.slice(0, visibleItemsCount).map((device) => {
                    const hasData = !!payloads[device.topic];
                    const isNew = new Date(device.createdAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;

                    return (
                      <TableRow key={device.id} className="group">
                        <TableCell>
                          <Checkbox
                            checked={selectedDevices.includes(device.id)}
                            onCheckedChange={(checked) => handleSelectDevice(device.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-96" title={device.name}>
                              {device.name}
                            </span>
                            {isNew && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs px-1.5 py-0.5">
                                New
                              </Badge>
                            )}
                            {device.hasNameConflict && (
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 text-[10px] h-4 px-1.5 py-0">
                                Duplicate Name
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => copyToClipboard(device.name, "Device name")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-32">
                              {device.topic}
                            </span>
                            {device.hasTopicConflict && (
                              <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200 text-[10px] h-4 px-1.5 py-0 shrink-0">
                                Topic Exists
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100"
                              onClick={() => copyToClipboard(device.topic, "Topic")}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600">
                          <div className="flex items-center gap-2 group">
                            <span className="truncate max-w-[150px]" title={device.address || ""}>
                              {device.address || "-"}
                            </span>
                            {device.address && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity shrink-0"
                                onClick={() => copyToClipboard(device.address!, "Address")}
                                title="Copy Address"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center rounded-full h-2 w-2 ${hasData ? "bg-green-500" : "bg-gray-400"
                                }`}
                            />
                            <span className="text-sm">
                              {hasData ? "Active" : "Inactive"}
                            </span>
                            {hasData && (
                              <code className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded border max-w-[100px] truncate">
                                {payloads[device.topic]}
                              </code>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(device.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="left" align="start">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              {canUpdate && (
                                <DropdownMenuItem onClick={() => handleEdit(device)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {canCreate && (
                                <DropdownMenuItem onClick={() => handleDuplicate(device)}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Duplicate Device
                                </DropdownMenuItem>
                              )}
                              {device.address && (
                                <DropdownMenuItem onClick={() => copyToClipboard(device.address!, "Address")}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Copy Address
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canDelete && (
                                <DropdownMenuItem
                                  onClick={() => handleDelete(device.id)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-4">
            {processedDevices.slice(0, visibleItemsCount).map((device) => {
              const hasData = !!payloads[device.topic];
              const isNew = new Date(device.createdAt).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;

              return (
                <Card key={device.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md">
                  <CardContent className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedDevices.includes(device.id)}
                          onCheckedChange={(checked) => handleSelectDevice(device.id, checked as boolean)}
                          className="flex-shrink-0"
                        />
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <HardDrive className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-sm truncate">{device.name}</h3>
                            {isNew && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs px-1.5 py-0.5 flex-shrink-0">
                                New
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${hasData ? 'bg-green-500' : 'bg-gray-400'} flex-shrink-0`} />
                            <span className="text-xs font-medium text-muted-foreground">
                              {hasData ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpdate && (
                            <DropdownMenuItem onClick={() => handleEdit(device)} className="text-xs">
                              <Edit className="h-3 w-3 mr-2" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {canCreate && (
                            <DropdownMenuItem onClick={() => handleDuplicate(device)} className="text-xs">
                              <Copy className="h-3 w-3 mr-2" />
                              Duplicate Device
                            </DropdownMenuItem>
                          )}
                          {device.address && (
                            <DropdownMenuItem onClick={() => copyToClipboard(device.address!, "Address")} className="text-xs">
                              <Copy className="h-3 w-3 mr-2" />
                              Copy Address
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(device.id)}
                              className="text-destructive text-xs"
                            >
                              <Trash2 className="h-3 w-3 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Topic */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Topic:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate flex-1">
                          {device.topic}
                        </code>
                      </div>
                    </div>

                    {/* Address - Green text */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Address:</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-medium text-green-600 truncate">
                            {device.address || 'Not specified'}
                          </span>
                          {device.address && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100 shrink-0"
                              onClick={() => copyToClipboard(device.address!, "Address")}
                              title="Copy Address"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status and Data Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-xs text-muted-foreground">
                          Created: {new Date(device.createdAt).toLocaleDateString()}
                        </div>
                        {hasData && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Data:</span>
                            <code className="px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded border max-w-[120px] truncate">
                              {payloads[device.topic]}
                            </code>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {processedDevices.length === 0 && devices.length > 0 && (
            <div className="text-center py-8 lg:hidden">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Try adjusting your search or filter criteria.
              </p>
            </div>
          )}

          {devices.length === 0 && (
            <div className="text-center py-8 lg:hidden">
              <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No devices</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first external device.
              </p>
            </div>
          )}

          {/* Lazy Loading Sentinel */}
          {hasMoreData && processedDevices.length > 0 && (
            <div
              id="lazy-load-sentinel"
              className="flex justify-center py-8"
            >
              {isLazyLoading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading more devices...</span>
                </div>
              ) : (
                <Button variant="outline" onClick={loadMoreManually}>
                  Load More Devices
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {processedDevices.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={pageSize.toString()} onValueChange={(value) => setPageSize(parseInt(value))}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(processedDevices.length / pageSize)}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(processedDevices.length / pageSize)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Device</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Update device information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Row 1: Device Name (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm">Device Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Row 2: MQTT Topic (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-topic" className="text-sm">MQTT Topic *</Label>
              <Input
                id="edit-topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="font-mono"
                required
              />
            </div>

            {/* Row 3: Address (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-address" className="text-sm">Address (Optional)</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g., 192.168.1.100"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingDevice(null);
                  setFormData({ name: "", topic: "", address: "" });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">Update Device</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
