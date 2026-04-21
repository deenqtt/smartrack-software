"use client";

import React, { useState, useEffect, type FormEvent, useCallback, useMemo } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { MaintenanceTarget } from "@prisma/client";
import { useSortableTable } from "@/hooks/use-sort-table";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { showToast } from "@/lib/toast-utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";

// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Users,
  Edit,
  Trash2,
  PlusCircle,
  Loader2,
  Database,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  CheckCircle,
  Clock,
  Search,
  MoreHorizontal,
  Copy,
  Eye,
  Activity,
  Filter,
  RefreshCw,
  Target,
  User,
  PauseCircle,
  XCircle,
} from "lucide-react";


// --- Type Definitions ---
interface UserData {
  id: string;
  email: string;
}

interface DeviceData {
  uniqId: string;
  name: string;
  topic: string;
  lastPayload: any;
  lastUpdatedByMqtt: string | null;
}

interface MaintenanceData {
  id: number;
  name: string;
  description: string | null;
  startTask: string;
  endTask: string;
  assignTo: string;
  assignedTo: UserData;
  targetType: MaintenanceTarget;
  targetId: string;
  deviceTarget?: DeviceData | null;
  status: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

function MaintenanceManagementContent() {
  // RBAC Permission Checks
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('maintenance-schedule-management');
  const { loading: menuLoading } = useMenu();
  const hasActionPermissions = canCreate || canUpdate || canDelete;

  const { user, isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [devices, setDevices] = useState<DeviceData[]>([]);
  const [racks, setRacks] = useState<{ id: string; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentMaintenance, setCurrentMaintenance] = useState<Partial<MaintenanceData>>({});
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [maintenanceToDelete, setMaintenanceToDelete] = useState<MaintenanceData | null>(null);

  // State for pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState("all");

  // Apply search filter
  const { searchQuery, setSearchQuery, filteredData: searchedMaintenances } = useSearchFilter(
    maintenances,
    ['name', 'description', 'assignedTo.email', 'status', ['deviceTarget', 'name'], 'targetId']
  );

  // Apply status filter on top of search
  const statusFilteredMaintenances = useMemo(() => {
    if (statusFilter === "all") return searchedMaintenances;
    return searchedMaintenances.filter(m => m.status === statusFilter);
  }, [searchedMaintenances, statusFilter]);

  // Apply sorting
  const { sorted: sortedMaintenances, sortField, sortDirection, handleSort } = useSortableTable(statusFilteredMaintenances);

  // Apply pagination
  const { paginatedData: paginatedMaintenances, totalItems, totalPages, hasNextPage, hasPrevPage } = usePagination(
    sortedMaintenances,
    itemsPerPage,
    currentPage
  );

  // Reset to first page when search, sort, or page size changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, sortField, sortDirection, statusFilter]);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isViewDialog, setIsViewDialog] = useState(false);
  const [maintenanceToView, setMaintenanceToView] = useState<MaintenanceData | null>(null);

  // --- FETCH API ---
  const fetchMaintenances = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/maintenance");
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          logout();
        }
        throw new Error("Failed to fetch maintenance schedules.");
      }
      const data = await response.json();
      setMaintenances(data);
    } catch (error: any) {
      console.error("[MaintenanceManagement] Gagal mengambil data:", error.message);
      showToast.error("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const json = await response.json();
      setUsers(Array.isArray(json.data) ? json.data : []);
    } catch (error: any) {
      console.error("[MaintenanceManagement] Gagal mengambil daftar pengguna:", error.message);
      setUsers([]);
    }
  }, []);

  const fetchRacks = useCallback(async () => {
    try {
      const response = await fetch("/api/racks");
      if (!response.ok) throw new Error("Failed to fetch racks");
      const data = await response.json();
      setRacks(data.racks || []);
    } catch (error: any) {
      console.error("[MaintenanceManagement] Gagal mengambil daftar racks:", error.message);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const response = await fetch("/api/devices/for-selection");
      if (!response.ok) throw new Error("Failed to fetch devices for dropdown.");
      const data = await response.json();
      setDevices(data);
    } catch (error: any) {
      console.error("[MaintenanceManagement] Gagal mengambil daftar devices:", error.message);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (isAuthenticated) {
        fetchMaintenances();
        fetchUsers();
        fetchDevices();
        fetchRacks();
      } else {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, isAuthLoading, fetchMaintenances, fetchUsers, fetchDevices, fetchRacks]);

  // RBAC Check
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view maintenance management. Please contact your administrator if you believe this is an error."
        showActions={true}
      />
    );
  }

  // --- CALENDAR LOGIC ---
  const generateCalendarDays = () => {
    const startOfCurrentMonth = startOfMonth(currentMonth);
    const endOfCurrentMonth = endOfMonth(currentMonth);
    const startDate = startOfWeek(startOfCurrentMonth);
    const endDate = endOfWeek(endOfCurrentMonth);

    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  };

  const getMaintenancesForDate = (date: Date) => {
    return maintenances.filter((m) => {
      const start = new Date(m.startTask);
      const end = new Date(m.endTask);
      const dayStart = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const dayEnd = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const dayCheck = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      return dayCheck >= dayStart && dayCheck <= dayEnd;
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed": return "bg-emerald-500 hover:bg-emerald-600";
      case "In Progress": return "bg-blue-500 hover:bg-blue-600";
      case "Scheduled": return "bg-slate-500 hover:bg-slate-600";
      case "On Hold": return "bg-amber-500 hover:bg-amber-600";
      case "Cancelled": return "bg-rose-500 hover:bg-rose-600";
      default: return "bg-slate-500 hover:bg-slate-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed": return <CheckCircle className="h-3.5 w-3.5" />;
      case "In Progress": return <Activity className="h-3.5 w-3.5" />;
      case "Scheduled": return <Clock className="h-3.5 w-3.5" />;
      case "On Hold": return <PauseCircle className="h-3.5 w-3.5" />;
      case "Cancelled": return <XCircle className="h-3.5 w-3.5" />;
      default: return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const openViewDialog = (maintenance: MaintenanceData) => {
    setMaintenanceToView(maintenance);
    setIsViewDialog(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success("Copied!", `${label} copied to clipboard`);
    } catch (err) {
      showToast.error("Error", "Could not copy to clipboard");
    }
  };

  // --- CRUD HANDLERS ---
  const handleOpenModal = (maintenanceToEdit: MaintenanceData | null = null) => {
    if (maintenanceToEdit) {
      setIsEditMode(true);
      setCurrentMaintenance({
        ...maintenanceToEdit,
        assignTo: maintenanceToEdit.assignTo || "",
        status: maintenanceToEdit.status || "Scheduled",
        targetType: maintenanceToEdit.targetType || MaintenanceTarget.Device,
        targetId: maintenanceToEdit.targetId || "",
      });
    } else {
      setIsEditMode(false);
      setCurrentMaintenance({
        targetType: MaintenanceTarget.Device,
        status: "Scheduled",
        assignTo: "",
        targetId: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleDuplicate = (maintenance: MaintenanceData) => {
    const { id, assignedTo, deviceTarget, createdAt, updatedAt, ...rest } = maintenance;
    setCurrentMaintenance({
      ...rest,
      name: `${rest.name} (Copy)`,
      status: "Scheduled",
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!currentMaintenance.name?.trim()) {
      showToast.error("Validation Error", "Task name is required.");
      return;
    }
    if (!currentMaintenance.assignTo) {
      showToast.error("Validation Error", "Please select a user to assign the task to.");
      return;
    }
    if (!currentMaintenance.targetId) {
      const targetLabel = currentMaintenance.targetType === MaintenanceTarget.Device ? "device" : "rack ID";
      showToast.error("Validation Error", `Please select a ${targetLabel}.`);
      return;
    }
    if (!currentMaintenance.startTask || !currentMaintenance.endTask) {
      showToast.error("Validation Error", "Please provide both start and end times.");
      return;
    }
    if (new Date(currentMaintenance.startTask) >= new Date(currentMaintenance.endTask)) {
      showToast.error("Validation Error", "End time must be after start time.");
      return;
    }

    const url = isEditMode ? `/api/maintenance` : "/api/maintenance";
    const method = isEditMode ? "PUT" : "POST";

    const body: any = {
      ...currentMaintenance,
      name: currentMaintenance.name.trim(),
      description: currentMaintenance.description?.trim() || null,
    };

    if (isEditMode && currentMaintenance.id) {
      body.id = currentMaintenance.id;
    }

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      showToast.success("Success", `Maintenance ${isEditMode ? "updated" : "created"} successfully!`);
      handleCloseModal();
      fetchMaintenances();
    } catch (error: any) {
      showToast.error("Error", error.message);
    }
  };

  const handleDelete = async () => {
    if (!maintenanceToDelete) return;
    try {
      const response = await fetch(`/api/maintenance?id=${maintenanceToDelete.id}`, { method: "DELETE" });
      if (response.status !== 204) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete maintenance.");
      }
      showToast.success("Success", "Maintenance deleted!");
      fetchMaintenances();
    } catch (error: any) {
      showToast.error("Error", error.message);
    } finally {
      setIsDeleteAlertOpen(false);
      setMaintenanceToDelete(null);
    }
  };

  const hasActiveFilters = searchQuery || statusFilter !== "all";

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header - matching device-external style */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Maintenance Schedule</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Optimize your operations with preventive maintenance planning</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMaintenances}
            disabled={isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
          {!menuLoading && canCreate && (
            <Button onClick={() => handleOpenModal()}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Schedule
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - matching device-external style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Tasks</p>
                <p className="text-2xl font-bold">{maintenances.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-emerald-500"
          onClick={() => setStatusFilter(statusFilter === "Completed" ? "all" : "Completed")}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-emerald-600" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{maintenances.filter(m => m.status === "Completed").length}</p>
              </div>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-blue-500"
          onClick={() => setStatusFilter(statusFilter === "In Progress" ? "all" : "In Progress")}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-6 w-6 text-blue-600" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{maintenances.filter(m => m.status === "In Progress").length}</p>
              </div>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/20 transition-colors border-l-4 border-l-amber-500"
          onClick={() => setStatusFilter(statusFilter === "Scheduled" ? "all" : "Scheduled")}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-amber-600" />
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                <p className="text-2xl font-bold">{maintenances.filter(m => m.status === "Scheduled").length}</p>
              </div>
              <ArrowUpDown className="h-4 w-4 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar - matching device-external style */}
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
                    placeholder="Search maintenances by name, description, user..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchQuery && (
                  <Badge variant="secondary" className="gap-1">
                    Search: &quot;{searchQuery}&quot;
                    <button onClick={() => setSearchQuery("")} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">×</button>
                  </Badge>
                )}
                {statusFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {statusFilter}
                    <button onClick={() => setStatusFilter("all")} className="ml-1 hover:bg-gray-300 rounded-full p-0.5">×</button>
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar View</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          {/* Table Card - matching device-external style */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Maintenance List
                </div>
                <div className="text-sm text-muted-foreground">
                  Showing {totalItems} of {maintenances.length} schedules
                  {hasActiveFilters && " (filtered)"}
                </div>
              </CardTitle>
              <CardDescription>
                Manage all maintenance schedules and tasks.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : sortedMaintenances.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">No schedules found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {maintenances.length === 0 ? "No maintenance schedules found." : "No results match your search."}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]">#</TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort('name')} className="h-auto p-0 font-semibold">
                            Task Name
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort('assignedTo.email')} className="h-auto p-0 font-semibold">
                            Assigned To
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort('status')} className="h-auto p-0 font-semibold">
                            Status
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" onClick={() => handleSort('startTask')} className="h-auto p-0 font-semibold">
                            Schedule
                            <ArrowUpDown className="ml-2 h-4 w-4" />
                          </Button>
                        </TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedMaintenances.map((m, index) => (
                        <TableRow key={m.id} className="group">
                          <TableCell className="text-xs font-medium text-muted-foreground">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span className="truncate max-w-[280px]" title={m.name}>{m.name}</span>
                              {m.description && (
                                <span className="text-xs text-muted-foreground truncate max-w-[280px]">{m.description}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-muted-foreground" />
                              </div>
                              <span className="text-sm">{m.assignedTo.email.split('@')[0]}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                {m.targetType}
                              </Badge>
                              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                                {m.targetType === MaintenanceTarget.Device && m.deviceTarget
                                  ? m.deviceTarget.name
                                  : m.targetId}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-white text-[11px] font-bold gap-1 border-none", getStatusColor(m.status))}>
                              {getStatusIcon(m.status)}
                              {m.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-xs font-medium">
                                {new Date(m.startTask).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                → {new Date(m.endTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
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
                                <DropdownMenuItem onClick={() => openViewDialog(m)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                {!menuLoading && canCreate && (
                                  <DropdownMenuItem onClick={() => handleDuplicate(m)}>
                                    <Copy className="mr-2 h-4 w-4" />
                                    Duplicate
                                  </DropdownMenuItem>
                                )}
                                {!menuLoading && canUpdate && (
                                  <DropdownMenuItem onClick={() => handleOpenModal(m)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                {!menuLoading && canDelete && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMaintenanceToDelete(m);
                                      setIsDeleteAlertOpen(true);
                                    }}
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
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : paginatedMaintenances.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">No schedules found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {maintenances.length === 0 ? "No maintenance schedules found." : "No results match your search."}
                    </p>
                  </div>
                ) : (
                  paginatedMaintenances.map((m) => (
                    <Card key={m.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md cursor-pointer"
                      onClick={() => openViewDialog(m)}>
                      <CardContent className="p-4">
                        {/* Header Row */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm truncate">{m.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{m.assignedTo.email}</span>
                            </div>
                          </div>
                          <Badge className={cn("text-white text-[10px] font-bold gap-1 border-none shrink-0", getStatusColor(m.status))}>
                            {getStatusIcon(m.status)}
                            {m.status}
                          </Badge>
                        </div>

                        {/* Target */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">Target:</span>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">{m.targetType}</Badge>
                            <span className="text-xs text-muted-foreground truncate">
                              {m.targetType === MaintenanceTarget.Device && m.deviceTarget
                                ? m.deviceTarget.name
                                : m.targetId}
                            </span>
                          </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3 w-3" />
                            {new Date(m.startTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" → "}
                            {new Date(m.endTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openViewDialog(m); }}>
                                <Eye className="mr-2 h-3 w-3" /> View
                              </DropdownMenuItem>
                              {canCreate && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(m); }}>
                                  <Copy className="mr-2 h-3 w-3" /> Duplicate
                                </DropdownMenuItem>
                              )}
                              {canUpdate && (
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenModal(m); }}>
                                  <Edit className="mr-2 h-3 w-3" /> Edit
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canDelete && (
                                <DropdownMenuItem className="text-red-600" onClick={(e) => { e.stopPropagation(); setMaintenanceToDelete(m); setIsDeleteAlertOpen(true); }}>
                                  <Trash2 className="mr-2 h-3 w-3" /> Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>

              {/* Pagination - matching device-external style */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Items per page:</span>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5</SelectItem>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                      </SelectContent>
                    </Select>
                    <span className="text-sm text-muted-foreground">
                      {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!hasPrevPage}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={!hasNextPage}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Maintenance Calendar
                  </CardTitle>
                  <CardDescription>
                    Plan and manage maintenance schedules across multiple months.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 bg-muted p-1 rounded-xl">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                    className="h-9 w-9"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <div className="px-4 font-bold min-w-[140px] text-center">
                    {format(currentMonth, "MMMM yyyy")}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                    className="h-9 w-9"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                  <div className="mx-1 h-6 w-px bg-border" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentMonth(new Date())}
                    className="text-xs h-8 px-3 font-semibold"
                  >
                    Today
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b bg-muted/30">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                  <div key={day} className="py-3 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {generateCalendarDays().map((day, index) => {
                  const maintenancesForDay = getMaintenancesForDate(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={index}
                      className={cn(
                        "min-h-[140px] p-2 border-r border-b cursor-pointer hover:bg-muted/30 transition-all group relative",
                        !isCurrentMonth && "bg-muted/20 opacity-50",
                        isSelected && "bg-primary/5 ring-2 ring-inset ring-primary z-10",
                        isCurrentDay && !isSelected && "bg-amber-50/50 dark:bg-amber-900/10"
                      )}
                      onClick={() => setSelectedDate(day)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={cn(
                          "flex items-center justify-center w-7 h-7 text-sm font-bold rounded-full transition-colors",
                          isCurrentDay ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground group-hover:text-primary",
                          !isCurrentMonth && "text-muted-foreground"
                        )}>
                          {format(day, "d")}
                        </span>
                        {maintenancesForDay.length > 0 && (
                          <span className="text-[10px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                            {maintenancesForDay.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                        {maintenancesForDay.slice(0, 4).map((maintenance) => (
                          <div
                            key={maintenance.id}
                            className={cn(
                              "text-[10px] p-1.5 rounded-lg text-white shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all overflow-hidden flex flex-col gap-0.5",
                              getStatusColor(maintenance.status)
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              openViewDialog(maintenance);
                            }}
                            title={`${maintenance.name} - ${maintenance.status}`}
                          >
                            <div className="font-bold leading-tight truncate">
                              {maintenance.name}
                            </div>
                            <div className="flex items-center gap-1 opacity-90 truncate italic font-medium">
                              <Users className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">
                                {maintenance.assignedTo.email.split('@')[0]}
                              </span>
                            </div>
                          </div>
                        ))}
                        {maintenancesForDay.length > 4 && (
                          <div className="text-[10px] text-primary font-bold text-center pt-1 animate-pulse">
                            +{maintenancesForDay.length - 4} more tasks
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal for Add/Edit */}
      <Dialog open={isModalOpen} onOpenChange={handleCloseModal}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {isEditMode ? "Edit Maintenance" : "Add New Maintenance"}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? "Update maintenance schedule details" : "Create a new maintenance schedule with the required details"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Task Name</Label>
              <Input
                id="name"
                value={currentMaintenance.name || ""}
                onChange={(e) => setCurrentMaintenance({ ...currentMaintenance, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={currentMaintenance.description || ""}
                onChange={(e) => setCurrentMaintenance({ ...currentMaintenance, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTask">Start Time</Label>
                <Input
                  id="startTask"
                  type="datetime-local"
                  value={currentMaintenance.startTask ? format(new Date(currentMaintenance.startTask), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={(e) => setCurrentMaintenance({ ...currentMaintenance, startTask: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTask">End Time</Label>
                <Input
                  id="endTask"
                  type="datetime-local"
                  value={currentMaintenance.endTask ? format(new Date(currentMaintenance.endTask), "yyyy-MM-dd'T'HH:mm") : ""}
                  onChange={(e) => setCurrentMaintenance({ ...currentMaintenance, endTask: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assignTo">Assign To</Label>
              <Select
                value={currentMaintenance.assignTo || ""}
                onValueChange={(value) => setCurrentMaintenance({ ...currentMaintenance, assignTo: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetType">Target Type</Label>
                <Select
                  value={currentMaintenance.targetType?.toString() || ""}
                  onValueChange={(value: string) => setCurrentMaintenance({ ...currentMaintenance, targetType: value as MaintenanceTarget, targetId: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MaintenanceTarget.Device}>Device</SelectItem>
                    <SelectItem value={MaintenanceTarget.Rack}>Rack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="targetId">
                  {currentMaintenance.targetType === MaintenanceTarget.Device ? "Device" : "Rack ID"}
                </Label>
                {currentMaintenance.targetType === MaintenanceTarget.Device ? (
                  <Select
                    value={currentMaintenance.targetId || ""}
                    onValueChange={(value) => setCurrentMaintenance({ ...currentMaintenance, targetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a device" />
                    </SelectTrigger>
                    <SelectContent>
                      {devices.map((device) => (
                        <SelectItem key={device.uniqId} value={device.uniqId}>
                          {device.name} ({device.topic})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select
                    value={currentMaintenance.targetId || ""}
                    onValueChange={(value) => setCurrentMaintenance({ ...currentMaintenance, targetId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a rack" />
                    </SelectTrigger>
                    <SelectContent>
                      {racks.map((rack) => (
                        <SelectItem key={rack.id} value={rack.id}>
                          {rack.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={currentMaintenance.status || ""}
                onValueChange={(value) => setCurrentMaintenance({ ...currentMaintenance, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Scheduled">Scheduled</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="On Hold">On Hold</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleCloseModal} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialog} onOpenChange={setIsViewDialog}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogTitle className="sr-only">Maintenance Details</DialogTitle>
          {maintenanceToView && (
            <>
              <div className={cn("p-8 text-white relative", getStatusColor(maintenanceToView.status))}>
                <div className="absolute top-0 right-0 p-12 opacity-15 overflow-hidden pointer-events-none">
                  <Calendar className="h-32 w-32 rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-white/90 border-white/30 backdrop-blur-md px-3 py-1 font-bold tracking-tight gap-1">
                      {getStatusIcon(maintenanceToView.status)}
                      {maintenanceToView.status.toUpperCase()}
                    </Badge>
                    <time className="text-white/70 text-sm font-medium">#{maintenanceToView.id}</time>
                  </div>
                  <h2 className="text-3xl font-black tracking-tight mb-2 leading-tight">
                    {maintenanceToView.name}
                  </h2>
                  <p className="text-white/80 line-clamp-2 max-w-[80%] font-medium">
                    {maintenanceToView.description || "No description provided for this maintenance task."}
                  </p>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Personnel Assigned</h4>
                      <p className="font-bold">{maintenanceToView.assignedTo.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center shrink-0">
                      <Database className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Object</h4>
                      <p className="font-bold">
                        {maintenanceToView.targetType === MaintenanceTarget.Device && maintenanceToView.deviceTarget
                          ? `${maintenanceToView.deviceTarget.name} (${maintenanceToView.deviceTarget.topic})`
                          : `${maintenanceToView.targetType} ID: ${maintenanceToView.targetId}`}
                      </p>
                      <Badge variant="secondary" className="mt-1 font-bold text-[10px] uppercase">{maintenanceToView.targetType}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <Clock className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex flex-col gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Start Execution</h4>
                        <p className="font-bold">{format(new Date(maintenanceToView.startTask), "PPP")}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(maintenanceToView.startTask), "HH:mm")}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Expected End</h4>
                        <p className="font-bold">{format(new Date(maintenanceToView.endTask), "PPP")}</p>
                        <p className="text-sm text-muted-foreground">{format(new Date(maintenanceToView.endTask), "HH:mm")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-muted/50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Created {format(new Date(maintenanceToView.createdAt), "MMM d, yyyy")}
                </div>
                <Button
                  variant="default"
                  onClick={() => setIsViewDialog(false)}
                  className="rounded-xl font-bold"
                >
                  Close Details
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete the maintenance schedule{" "}
              <b>{maintenanceToDelete?.name}</b>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setMaintenanceToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function MaintenancePageWrapper() {
  return (
    <AuthProvider>
      <MaintenanceManagementContent />
    </AuthProvider>
  );
}
