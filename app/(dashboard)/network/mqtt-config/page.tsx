"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import { showToast, confirmDeleteWithType } from '@/lib/toast-utils';
import { useMenuItemPermissions, useMenu } from '@/contexts/MenuContext';
import { useAuth } from '@/contexts/AuthContext';
import AccessDenied from '@/components/AccessDenied';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Plus,
  Edit,
  Trash2,
  Server,
  Wifi,
  WifiOff,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Settings,
  Search,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Upload,
} from 'lucide-react';
import ImportDialog from '@/components/ImportDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MqttConfig {
  id: string;
  name: string;
  description?: string;
  brokerHost: string;
  brokerPort: number;
  protocol: 'TCP' | 'WEBSOCKET' | 'SECURE_TCP' | 'SECURE_WEBSOCKET';
  useSSL: boolean;
  clientId?: string;
  username?: string;
  password?: string;
  useAuthentication: boolean;
  keepAlive: number;
  connectTimeout: number;
  reconnectPeriod: number;
  cleanSession: boolean;
  maxReconnectAttempts: number;
  defaultQos: number;
  retainMessages: boolean;
  willTopic?: string;
  willMessage?: string;
  willQos: number;
  willRetain: boolean;
  isActive: boolean;
  connectionStatus: string;
  messageCount: number;
  bytesSent: number;
  bytesReceived: number;
}

export default function MQTTConfigManagementPage() {
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('network-mqtt-management');
  const { loading: menuLoading } = useMenu();
  const { user } = useAuth();

  const [configs, setConfigs] = useState<MqttConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [protocolFilter, setProtocolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<MqttConfig | null>(null);
  const [toggleDialogOpen, setToggleDialogOpen] = useState(false);
  const [configToToggle, setConfigToToggle] = useState<MqttConfig | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState<Partial<MqttConfig>>({
    protocol: 'WEBSOCKET',
    useSSL: false,
    useAuthentication: false,
    keepAlive: 60,
    connectTimeout: 10000,
    reconnectPeriod: 5000,
    cleanSession: true,
    maxReconnectAttempts: 10,
    defaultQos: 1,
    retainMessages: true,
    willQos: 1,
    willRetain: false,
    isActive: false,
  });

  // Load configurations
  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/mqtt-config?active=false');
      if (!response.ok) throw new Error('Failed to load configurations');

      const result = await response.json();
      if (result.success) {
        setConfigs(result.data);
      } else {
        throw new Error(result.error || 'Failed to load configurations');
      }
    } catch (error) {
      console.error('Error loading MQTT configs:', error);
      showToast.error("Error", "Failed to load MQTT configurations");
    } finally {
      setLoading(false);
    }
  };

  // Open toggle dialog
  const openToggleDialog = (config: MqttConfig) => {
    setConfigToToggle(config);
    setToggleDialogOpen(true);
  };

  // Handle active status toggle
  const handleToggleActive = async (config: MqttConfig) => {
    try {
      const response = await fetch(`/api/mqtt-config/${config.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !config.isActive
        })
      });

      if (!response.ok) throw new Error('Failed to update status');

      const result = await response.json();
      if (result.success) {
        // Reload configurations to reflect changes
        await loadConfigs();

        // Trigger broker reload
        await fetch('/api/mqtt-config/reload', { method: 'POST' });

        showToast.success("Success", `MQTT broker ${!config.isActive ? 'activated' : 'deactivated'} successfully`);
      } else {
        throw new Error(result.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      showToast.error("Error", "Failed to update broker status");
    }
  };

  // Handle create
  const handleCreate = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/mqtt-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to create configuration');

      const result = await response.json();
      if (result.success) {
        await loadConfigs();
        setCreateDialogOpen(false);
        resetForm();

        showToast.success("Success", "MQTT configuration created successfully");
      } else {
        throw new Error(result.error || 'Failed to create configuration');
      }
    } catch (error) {
      console.error('Error creating MQTT config:', error);
      showToast.error("Error", "Failed to create MQTT configuration");
    } finally {
      setSaving(false);
    }
  };

  // Handle update
  const handleUpdate = async () => {
    if (!selectedConfig) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/mqtt-config/${selectedConfig.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to update configuration');

      const result = await response.json();
      if (result.success) {
        await loadConfigs();
        setEditDialogOpen(false);
        setSelectedConfig(null);
        resetForm();

        showToast.success("Success", "MQTT configuration updated successfully");
      } else {
        throw new Error(result.error || 'Failed to update configuration');
      }
    } catch (error) {
      console.error('Error updating MQTT config:', error);
      showToast.error("Error", "Failed to update MQTT configuration");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedConfig) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/mqtt-config/${selectedConfig.id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete configuration');

      const result = await response.json();
      if (result.success) {
        await loadConfigs();
        setDeleteDialogOpen(false);
        setSelectedConfig(null);

        showToast.success("Success", "MQTT configuration deleted successfully");
      } else {
        throw new Error(result.error || 'Failed to delete configuration');
      }
    } catch (error) {
      console.error('Error deleting MQTT config:', error);
      showToast.error("Error", "Failed to delete MQTT configuration");
    } finally {
      setSaving(false);
    }
  };

  // Open edit dialog
  const openEditDialog = (config: MqttConfig) => {
    setSelectedConfig(config);
    setFormData({ ...config });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (config: MqttConfig) => {
    setSelectedConfig(config);
    setDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      protocol: 'WEBSOCKET',
      useSSL: false,
      useAuthentication: false,
      keepAlive: 60,
      connectTimeout: 10000,
      reconnectPeriod: 5000,
      cleanSession: true,
      maxReconnectAttempts: 10,
      defaultQos: 1,
      retainMessages: true,
      willQos: 1,
      willRetain: false,
      isActive: false,
    });
  };

  // Load data on mount and poll
  useEffect(() => {
    loadConfigs();

    // Fast polling for MQTT status (every 3 seconds)
    const interval = setInterval(() => {
      fetch('/api/mqtt-config?active=false')
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setConfigs(result.data);
          }
        })
        .catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'CONNECTING':
        return <Loader2 className="w-4 h-4 text-yellow-500 animate-spin" />;
      case 'ERROR':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <WifiOff className="w-4 h-4 text-gray-400" />;
    }
  };

  // Filtered and sorted configs
  const filteredConfigs = useMemo(() => {
    return configs.filter(config => {
      const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.brokerHost.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.protocol.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProtocol = protocolFilter === "all" || config.protocol === protocolFilter;
      const matchesStatus = statusFilter === "all" || config.connectionStatus.toLowerCase() === statusFilter;

      return matchesSearch && matchesProtocol && matchesStatus;
    });
  }, [configs, searchTerm, protocolFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredConfigs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedConfigs = filteredConfigs.slice(startIndex, startIndex + itemsPerPage);

  // Bulk operations
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConfigs(filteredConfigs.map(config => config.id));
    } else {
      setSelectedConfigs([]);
    }
  };

  const handleSelectConfig = (configId: string, checked: boolean) => {
    if (checked) {
      setSelectedConfigs(prev => [...prev, configId]);
    } else {
      setSelectedConfigs(prev => prev.filter(id => id !== configId));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedConfigs.length === 0) return;

    try {
      setSaving(true);
      const deletePromises = selectedConfigs.map(id =>
        fetch(`/api/mqtt-config/${id}`, { method: 'DELETE' })
      );

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(res => res.ok).length;

      showToast.success("Bulk Delete Completed", `Successfully deleted ${successCount} out of ${selectedConfigs.length} configurations`);

      await loadConfigs();
      setSelectedConfigs([]);
    } catch (error) {
      showToast.error("Bulk Delete Failed", "An error occurred during bulk delete");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkActivate = async () => {
    if (selectedConfigs.length === 0) return;

    try {
      setSaving(true);
      const updatePromises = selectedConfigs.map(id =>
        fetch(`/api/mqtt-config/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive: true })
        })
      );

      await Promise.all(updatePromises);
      await loadConfigs();
      await fetch('/api/mqtt-config/reload', { method: 'POST' });

      showToast.success("Bulk Activate Completed", `Activated ${selectedConfigs.length} configurations`);

      setSelectedConfigs([]);
    } catch (error) {
      showToast.error("Bulk Activate Failed", "An error occurred during bulk activation");
    } finally {
      setSaving(false);
    }
  };

  // Export functionality
  const handleExport = async () => {
    try {
      showToast.info("Preparing Export", "Generating export file...");
      const response = await fetch("/api/mqtt-config/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mqtt-configs-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export Completed", "Configurations exported successfully");
    } catch (error) {
      showToast.error("Export Failed", "Failed to export configurations");
    }
  };

  const handleExportSingle = async (config: MqttConfig) => {
    try {
      showToast.info("Preparing Export", `Exporting "${config.name}"...`);
      const response = await fetch(`/api/mqtt-config/export/${config.id}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mqtt-config-${config.name.replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export Success", `"${config.name}" exported successfully`);
    } catch (error) {
      showToast.error("Export Failed", "Failed to export configuration");
    }
  };

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, protocolFilter, statusFilter]);

  // Show loading - AFTER all hooks
  if (menuLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">MQTT Broker Server</h1>
              <p className="text-sm sm:text-base text-muted-foreground">Manage MQTT broker configurations with full CRUD operations</p>
            </div>
          </div>

          {!menuLoading && canCreate && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export All
              </Button>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Configuration
              </Button>
            </div>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Configurations</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{configs.length}</p>
                </div>
                <Server className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Brokers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {configs.filter(c => c.isActive).length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Connected</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {configs.filter(c => c.connectionStatus === 'CONNECTED').length}
                  </p>
                </div>
                <Wifi className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">With Errors</p>
                  <p className="text-2xl font-bold text-red-600">
                    {configs.filter(c => c.connectionStatus === 'ERROR').length}
                  </p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
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
                      placeholder="Search configurations by name, host, or protocol..."
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
                      setProtocolFilter("all");
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>

              {/* Filter Row */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="sm:w-48">
                  <Select value={protocolFilter} onValueChange={setProtocolFilter}>
                    <SelectTrigger>
                      <Settings className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by protocol" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Protocols</SelectItem>
                      <SelectItem value="WEBSOCKET">WebSocket</SelectItem>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="SECURE_TCP">Secure TCP</SelectItem>
                      <SelectItem value="SECURE_WEBSOCKET">Secure WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <Wifi className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="connected">Connected</SelectItem>
                      <SelectItem value="connecting">Connecting</SelectItem>
                      <SelectItem value="error">Error</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(searchTerm || protocolFilter !== "all" || statusFilter !== "all") && (
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
                  {protocolFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Protocol: {protocolFilter}
                      <button
                        onClick={() => setProtocolFilter("all")}
                        className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {statusFilter !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Status: {statusFilter}
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

        {/* Configurations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>MQTT Configurations</CardTitle>
                <CardDescription>
                  {filteredConfigs.length === configs.length
                    ? `All ${configs.length} configurations in the system`
                    : `Showing ${filteredConfigs.length} of ${configs.length} configurations`
                  }
                </CardDescription>
              </div>

              {/* Bulk Actions */}
              {selectedConfigs.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedConfigs.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBulkActivate}
                    disabled={saving}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Activate
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={saving}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading configurations...</span>
              </div>
            ) : configs.length === 0 ? (
              <div className="text-center py-8">
                <Server className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Configurations
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  No MQTT configurations found. Create your first configuration.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Configuration
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedConfigs.length === paginatedConfigs.length && paginatedConfigs.length > 0}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all configurations"
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead>Messages</TableHead>
                      <TableHead className="text-center">Copy</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedConfigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <Server className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                          <h3 className="text-lg font-medium mb-2">No configurations found</h3>
                          <p className="text-muted-foreground">
                            {filteredConfigs.length > 0
                              ? "No configurations match the current page."
                              : "Try adjusting your search or filter criteria."
                            }
                          </p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedConfigs.map((config) => (
                        <TableRow
                          key={config.id}
                          className={`hover:bg-muted/50 ${selectedConfigs.includes(config.id) ? 'bg-muted/30' : ''
                            }`}
                        >
                          <TableCell>
                            <Checkbox
                              checked={selectedConfigs.includes(config.id)}
                              onCheckedChange={(checked) => handleSelectConfig(config.id, checked as boolean)}
                              aria-label={`Select ${config.name}`}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">
                                {config.name}
                              </p>
                              {config.description && (
                                <p className="text-sm text-muted-foreground">
                                  {config.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                              {config.brokerHost}:{config.brokerPort}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-normal">
                              {config.protocol}
                              {config.useSSL && ' (SSL)'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(config.connectionStatus)}
                              <span className="text-sm capitalize">
                                {config.connectionStatus.toLowerCase()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={config.isActive}
                              onCheckedChange={() => openToggleDialog(config)}
                              disabled={!canUpdate}
                            />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {config.messageCount.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(`${config.brokerHost}:${config.brokerPort}`);
                                showToast.success("Copied to clipboard", `${config.brokerHost}:${config.brokerPort} copied successfully.`);
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
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
                                {!menuLoading && canUpdate && (
                                  <DropdownMenuItem onClick={() => openEditDialog(config)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleExportSingle(config)}>
                                  <Download className="mr-2 h-4 w-4" />
                                  Export
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {!menuLoading && canDelete && (
                                  <DropdownMenuItem onClick={() => openDeleteDialog(config)} className="text-red-600">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>

          {/* Pagination */}
          {totalPages > 1 && (
            <CardFooter className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredConfigs.length)} of {filteredConfigs.length} configurations
                </span>
                <div className="flex items-center gap-2">
                  <label htmlFor="items-per-page" className="text-sm">Items per page:</label>
                  <select
                    id="items-per-page"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                  >
                    <option value="5">5</option>
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>

        {/* Create Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add MQTT Configuration</DialogTitle>
              <DialogDescription>
                Create a new MQTT broker configuration
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My MQTT Broker"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Broker Connection */}
              <Separator />
              <h4 className="font-medium">Broker Connection</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brokerHost">Host *</Label>
                  <Input
                    id="brokerHost"
                    value={formData.brokerHost || ''}
                    onChange={(e) => setFormData({ ...formData, brokerHost: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <Label htmlFor="brokerPort">Port *</Label>
                  <Input
                    id="brokerPort"
                    type="number"
                    value={formData.brokerPort || ''}
                    onChange={(e) => setFormData({ ...formData, brokerPort: parseInt(e.target.value) })}
                    placeholder="1883"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="protocol">Protocol</Label>
                  <Select
                    value={formData.protocol || 'WEBSOCKET'}
                    onValueChange={(value: any) => setFormData({ ...formData, protocol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="WEBSOCKET">WebSocket</SelectItem>
                      <SelectItem value="SECURE_TCP">Secure TCP</SelectItem>
                      <SelectItem value="SECURE_WEBSOCKET">Secure WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="useSSL"
                    checked={formData.useSSL || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, useSSL: checked })}
                  />
                  <Label htmlFor="useSSL">Use SSL/TLS</Label>
                </div>
              </div>

              {/* Authentication */}
              <Separator />
              <div className="flex items-center space-x-2">
                <Switch
                  id="useAuth"
                  checked={formData.useAuthentication || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, useAuthentication: checked })}
                />
                <Label htmlFor="useAuth">Enable Authentication</Label>
              </div>

              {(formData.useAuthentication) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              <Separator />
              <h4 className="font-medium">Advanced Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="keepAlive">Keep Alive (seconds)</Label>
                  <Input
                    id="keepAlive"
                    type="number"
                    value={formData.keepAlive || 60}
                    onChange={(e) => setFormData({ ...formData, keepAlive: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="connectTimeout">Connect Timeout (ms)</Label>
                  <Input
                    id="connectTimeout"
                    type="number"
                    value={formData.connectTimeout || 10000}
                    onChange={(e) => setFormData({ ...formData, connectTimeout: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="cleanSession"
                    checked={formData.cleanSession ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, cleanSession: checked })}
                  />
                  <Label htmlFor="cleanSession">Clean Session</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="retainMessages"
                    checked={formData.retainMessages ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, retainMessages: checked })}
                  />
                  <Label htmlFor="retainMessages">Retain Messages</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Set as Active Broker</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Create Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit MQTT Configuration</DialogTitle>
              <DialogDescription>
                Update the MQTT broker configuration
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="My MQTT Broker"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>
              </div>

              {/* Broker Connection */}
              <Separator />
              <h4 className="font-medium">Broker Connection</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-brokerHost">Host *</Label>
                  <Input
                    id="edit-brokerHost"
                    value={formData.brokerHost || ''}
                    onChange={(e) => setFormData({ ...formData, brokerHost: e.target.value })}
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-brokerPort">Port *</Label>
                  <Input
                    id="edit-brokerPort"
                    type="number"
                    value={formData.brokerPort || ''}
                    onChange={(e) => setFormData({ ...formData, brokerPort: parseInt(e.target.value) })}
                    placeholder="1883"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-protocol">Protocol</Label>
                  <Select
                    value={formData.protocol || 'WEBSOCKET'}
                    onValueChange={(value: any) => setFormData({ ...formData, protocol: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TCP">TCP</SelectItem>
                      <SelectItem value="WEBSOCKET">WebSocket</SelectItem>
                      <SelectItem value="SECURE_TCP">Secure TCP</SelectItem>
                      <SelectItem value="SECURE_WEBSOCKET">Secure WebSocket</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-useSSL"
                    checked={formData.useSSL || false}
                    onCheckedChange={(checked) => setFormData({ ...formData, useSSL: checked })}
                  />
                  <Label htmlFor="edit-useSSL">Use SSL/TLS</Label>
                </div>
              </div>

              {/* Authentication */}
              <Separator />
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-useAuth"
                  checked={formData.useAuthentication || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, useAuthentication: checked })}
                />
                <Label htmlFor="edit-useAuth">Enable Authentication</Label>
              </div>

              {(formData.useAuthentication) && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-username">Username</Label>
                    <Input
                      id="edit-username"
                      value={formData.username || ''}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-password">Password</Label>
                    <Input
                      id="edit-password"
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* Advanced Settings */}
              <Separator />
              <h4 className="font-medium">Advanced Settings</h4>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-keepAlive">Keep Alive (seconds)</Label>
                  <Input
                    id="edit-keepAlive"
                    type="number"
                    value={formData.keepAlive || 60}
                    onChange={(e) => setFormData({ ...formData, keepAlive: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-connectTimeout">Connect Timeout (ms)</Label>
                  <Input
                    id="edit-connectTimeout"
                    type="number"
                    value={formData.connectTimeout || 10000}
                    onChange={(e) => setFormData({ ...formData, connectTimeout: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-cleanSession"
                    checked={formData.cleanSession ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, cleanSession: checked })}
                  />
                  <Label htmlFor="edit-cleanSession">Clean Session</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-retainMessages"
                    checked={formData.retainMessages ?? true}
                    onCheckedChange={(checked) => setFormData({ ...formData, retainMessages: checked })}
                  />
                  <Label htmlFor="edit-retainMessages">Retain Messages</Label>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-isActive"
                  checked={formData.isActive || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="edit-isActive">Set as Active Broker</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Update Configuration
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete MQTT Configuration</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedConfig?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Toggle Confirmation Dialog */}
        <ConfirmationDialog
          open={toggleDialogOpen}
          onOpenChange={setToggleDialogOpen}
          title={configToToggle?.isActive ? "Deactivate Broker" : "Activate Broker"}
          description={
            configToToggle?.isActive
              ? `Are you sure you want to deactivate "${configToToggle?.name}"?`
              : `Are you sure you want to activate "${configToToggle?.name}"? This will deactivate any currently active broker.`
          }
          confirmText={configToToggle?.isActive ? "Deactivate" : "Activate"}
          cancelText="Cancel"
          onConfirm={async () => {
            if (configToToggle) await handleToggleActive(configToToggle);
            setToggleDialogOpen(false);
          }}
          onCancel={() => setToggleDialogOpen(false)}
          type={configToToggle?.isActive ? "warning" : "info"}
        />
        {/* Import Dialog */}
        <ImportDialog
          open={isImportDialogOpen}
          onOpenChange={setIsImportDialogOpen}
          onImportSuccess={() => loadConfigs()}
          title="Import MQTT Configurations"
          endpoint="/api/mqtt-config/import"
          typeLabel="MQTT Config"
        />
      </div>
    </TooltipProvider >
  );
}

