"use client";

import { useState, useEffect, useMemo } from "react";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/lib/toast-utils";
import {
  FileBarChart,
  Download,
  Search,
  RefreshCw,
  Activity,
  CheckCircle,
  Clock,
  ArrowUpDown,
  Filter,
  Eye,
  Calendar,
  User,
  Wrench,
  Target,
  MoreHorizontal,
  Copy,
  Loader2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  XCircle,
  PauseCircle,
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface UserData {
  id: string;
  email: string;
}

interface DeviceData {
  uniqId: string;
  name: string;
  topic: string;
}

interface MaintenanceData {
  id: number;
  name: string;
  description: string | null;
  startTask: string;
  endTask: string;
  assignTo: string;
  assignedTo: UserData;
  targetType: "Device" | "Rack";
  targetId: string;
  deviceTarget?: DeviceData | null;
  status: "Scheduled" | "In Progress" | "Completed" | "On Hold" | "Cancelled";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function MaintenanceReportContent() {
  const [maintenances, setMaintenances] = useState<MaintenanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMaintenance, setSelectedMaintenance] = useState<MaintenanceData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "startTask" | "status" | "assignedTo.email">("startTask");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // RBAC Permission Checks
  const { canView } = useMenuItemPermissions('maintenance-report');
  const { loading: menuLoading } = useMenu();

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/maintenance");
      if (response.ok) {
        const data = await response.json();
        setMaintenances(data);
      } else {
        showToast.error("Failed to fetch maintenance reports");
      }
    } catch (error) {
      showToast.error("Failed to fetch maintenance reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView && !menuLoading) {
      fetchMaintenances();
    }
  }, [canView, menuLoading]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, userFilter, dateRangeFilter, sortBy, sortOrder]);

  // Filter and sort maintenances
  const processedMaintenances = useMemo(() => {
    let filtered = maintenances.filter(maintenance => {
      const matchesSearch = maintenance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (maintenance.description && maintenance.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        maintenance.assignedTo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (maintenance.deviceTarget?.name && maintenance.deviceTarget.name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = statusFilter === "all" || maintenance.status === statusFilter;
      const matchesUser = userFilter === "all" || maintenance.assignTo === userFilter;

      let matchesDate = true;
      if (dateRangeFilter !== "all") {
        const maintenanceDate = new Date(maintenance.startTask);
        const now = new Date();

        switch (dateRangeFilter) {
          case "today":
            matchesDate = maintenanceDate.toDateString() === now.toDateString();
            break;
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            matchesDate = maintenanceDate >= weekAgo;
            break;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            matchesDate = maintenanceDate >= monthAgo;
            break;
          default:
            matchesDate = true;
        }
      }

      return matchesSearch && matchesStatus && matchesUser && matchesDate;
    });

    // Sort maintenances
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "startTask":
          aValue = new Date(a.startTask);
          bValue = new Date(b.startTask);
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        case "assignedTo.email":
          aValue = a.assignedTo.email.toLowerCase();
          bValue = b.assignedTo.email.toLowerCase();
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
  }, [maintenances, searchTerm, statusFilter, userFilter, dateRangeFilter, sortBy, sortOrder]);

  // Pagination
  const paginatedMaintenances = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return processedMaintenances.slice(startIndex, startIndex + pageSize);
  }, [processedMaintenances, currentPage, pageSize]);

  const totalPages = Math.ceil(processedMaintenances.length / pageSize);

  // Get unique users for filters
  const availableUsers = useMemo(() => {
    const userMap = new Map<string, UserData>();
    maintenances.forEach(m => {
      if (m.assignedTo && !userMap.has(m.assignedTo.id)) {
        userMap.set(m.assignedTo.id, m.assignedTo);
      }
    });
    return Array.from(userMap.values()).sort((a, b) => a.email.localeCompare(b.email));
  }, [maintenances]);

  const handleSort = (column: "name" | "startTask" | "status" | "assignedTo.email") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-500 hover:bg-emerald-600";
      case "In Progress":
        return "bg-blue-500 hover:bg-blue-600";
      case "Scheduled":
        return "bg-slate-500 hover:bg-slate-600";
      case "On Hold":
        return "bg-amber-500 hover:bg-amber-600";
      case "Cancelled":
        return "bg-rose-500 hover:bg-rose-600";
      default:
        return "bg-slate-500 hover:bg-slate-600";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-3.5 w-3.5" />;
      case "In Progress":
        return <Activity className="h-3.5 w-3.5" />;
      case "Scheduled":
        return <Clock className="h-3.5 w-3.5" />;
      case "On Hold":
        return <PauseCircle className="h-3.5 w-3.5" />;
      case "Cancelled":
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return <Clock className="h-3.5 w-3.5" />;
    }
  };

  const openViewDialog = (maintenance: MaintenanceData) => {
    setSelectedMaintenance(maintenance);
    setIsViewDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast.success(`${label} copied to clipboard`);
    } catch (err) {
      showToast.error("Could not copy to clipboard");
    }
  };

  const exportToCSV = () => {
    const headers = ["Task Name", "Description", "Assigned To", "Target", "Status", "Start Date", "End Date", "Created"];
    const csvContent = [
      headers.join(","),
      ...processedMaintenances.map(maintenance => [
        `"${maintenance.name}"`,
        `"${maintenance.description || ""}"`,
        `"${maintenance.assignedTo.email}"`,
        `"${maintenance.targetType}: ${maintenance.deviceTarget?.name || maintenance.targetId}"`,
        `"${maintenance.status}"`,
        `"${new Date(maintenance.startTask).toLocaleDateString()}"`,
        `"${new Date(maintenance.endTask).toLocaleDateString()}"`,
        `"${new Date(maintenance.createdAt).toLocaleDateString()}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "maintenance-reports.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast.success("Report exported successfully!");
  };

  // Compute completion rate
  const completionRate = useMemo(() => {
    if (maintenances.length === 0) return 0;
    return Math.round((maintenances.filter(m => m.status === "Completed").length / maintenances.length) * 100);
  }, [maintenances]);

  // RBAC Check
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view maintenance reports."
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
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
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="border rounded-lg">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between animate-pulse">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-muted rounded"></div>
                <div className="h-5 bg-muted rounded w-32"></div>
              </div>
              <div className="h-4 bg-muted rounded w-48"></div>
            </div>
          </div>
          <div className="p-6">
            <div className="hidden lg:block animate-pulse space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-4 bg-muted rounded w-8"></div>
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
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-32"></div>
                        <div className="h-3 bg-muted rounded w-20"></div>
                      </div>
                      <div className="w-16 h-5 bg-muted rounded"></div>
                    </div>
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

  const hasActiveFilters = searchTerm || statusFilter !== "all" || userFilter !== "all" || dateRangeFilter !== "all";

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header - matching device-external style */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FileBarChart className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Maintenance Reports</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Comprehensive analytics & insights for maintenance operations</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={fetchMaintenances}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards - matching device-external style */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Wrench className="h-6 w-6 text-primary" />
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

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Completion</p>
                <p className="text-2xl font-bold">{completionRate}%</p>
              </div>
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
                    placeholder="Search tasks, descriptions, users, or devices..."
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
                    setStatusFilter("all");
                    setUserFilter("all");
                    setDateRangeFilter("all");
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

              <div className="sm:w-48">
                <Select value={userFilter} onValueChange={setUserFilter}>
                  <SelectTrigger>
                    <User className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="User" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {availableUsers.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:w-48">
                <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {searchTerm && (
                  <Badge variant="secondary" className="gap-1">
                    Search: &quot;{searchTerm}&quot;
                    <button
                      onClick={() => setSearchTerm("")}
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
                {userFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    User: {availableUsers.find(u => u.id === userFilter)?.email}
                    <button
                      onClick={() => setUserFilter("all")}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {dateRangeFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {dateRangeFilter === "today" ? "Today" : dateRangeFilter === "week" ? "This Week" : "This Month"}
                    <button
                      onClick={() => setDateRangeFilter("all")}
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

      {/* Reports Table - matching device-external style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Report Data
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {processedMaintenances.length} of {maintenances.length} reports
              {hasActiveFilters && " (filtered)"}
            </div>
          </CardTitle>
          <CardDescription>
            All maintenance reports in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {processedMaintenances.length === 0 ? (
            <div className="text-center py-8">
              <FileBarChart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-200">No reports found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {maintenances.length === 0
                  ? "No maintenance data is available yet. Create maintenance tasks to see reports here."
                  : "Try adjusting your search or filter criteria to find what you're looking for."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 font-semibold">
                          Task Name
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("assignedTo.email")} className="h-auto p-0 font-semibold">
                          Personnel
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("status")} className="h-auto p-0 font-semibold">
                          Status
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" onClick={() => handleSort("startTask")} className="h-auto p-0 font-semibold">
                          Schedule
                          <ArrowUpDown className="ml-2 h-4 w-4" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMaintenances.map((maintenance, index) => (
                      <TableRow key={maintenance.id} className="group">
                        <TableCell className="text-xs font-medium text-muted-foreground">
                          {(currentPage - 1) * pageSize + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="truncate max-w-[280px]" title={maintenance.name}>
                              {maintenance.name}
                            </span>
                            {maintenance.description && (
                              <span className="text-xs text-muted-foreground truncate max-w-[280px]">
                                {maintenance.description}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm">{maintenance.assignedTo.email.split('@')[0]}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] font-bold uppercase">
                              {maintenance.targetType}
                            </Badge>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {maintenance.targetType === "Device" && maintenance.deviceTarget
                                ? maintenance.deviceTarget.name
                                : maintenance.targetId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-white text-[11px] font-bold gap-1 border-none", getStatusColor(maintenance.status))}>
                            {getStatusIcon(maintenance.status)}
                            {maintenance.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium">
                              {new Date(maintenance.startTask).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              → {new Date(maintenance.endTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
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
                              <DropdownMenuItem onClick={() => openViewDialog(maintenance)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => copyToClipboard(maintenance.name, "Task name")}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Name
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => copyToClipboard(maintenance.assignedTo.email, "Email")}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Email
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-4">
                {paginatedMaintenances.map((maintenance) => (
                  <Card key={maintenance.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md cursor-pointer"
                    onClick={() => openViewDialog(maintenance)}>
                    <CardContent className="p-4">
                      {/* Header Row */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm truncate">{maintenance.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{maintenance.assignedTo.email}</span>
                          </div>
                        </div>
                        <Badge className={cn("text-white text-[10px] font-bold gap-1 border-none shrink-0", getStatusColor(maintenance.status))}>
                          {getStatusIcon(maintenance.status)}
                          {maintenance.status}
                        </Badge>
                      </div>

                      {/* Target */}
                      <div className="mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Target:</span>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{maintenance.targetType}</Badge>
                          <span className="text-xs text-muted-foreground truncate">
                            {maintenance.targetType === "Device" && maintenance.deviceTarget
                              ? maintenance.deviceTarget.name
                              : maintenance.targetId}
                          </span>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(maintenance.startTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" → "}
                          {new Date(maintenance.endTask).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openViewDialog(maintenance); }}>
                              <Eye className="mr-2 h-3 w-3" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); copyToClipboard(maintenance.name, "Task name"); }}>
                              <Copy className="mr-2 h-3 w-3" />
                              Copy Name
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination - matching device-external style */}
              {totalPages > 1 && (
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
                    <span className="text-sm text-muted-foreground">
                      {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, processedMaintenances.length)} of {processedMaintenances.length}
                    </span>
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
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogTitle className="sr-only">Maintenance Report Details</DialogTitle>
          {selectedMaintenance && (
            <>
              <div className={cn("p-8 text-white relative", getStatusColor(selectedMaintenance.status))}>
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <FileBarChart className="h-32 w-32 rotate-12" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="text-white/90 border-white/30 backdrop-blur-md px-3 py-1 font-bold tracking-tight gap-1">
                      {getStatusIcon(selectedMaintenance.status)}
                      {selectedMaintenance.status.toUpperCase()}
                    </Badge>
                    <span className="text-white/50 text-xs font-bold">#{selectedMaintenance.id}</span>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mb-2 leading-tight">
                    {selectedMaintenance.name}
                  </h2>
                  <p className="text-white/80 text-sm line-clamp-2 max-w-[80%] font-medium">
                    {selectedMaintenance.description || "No description provided."}
                  </p>
                </div>
              </div>

              <div className="p-8 bg-white dark:bg-slate-900 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Assigned Personnel</h4>
                      <p className="font-bold">{selectedMaintenance.assignedTo.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center shrink-0">
                      <Target className="h-5 w-5 text-violet-600" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Target Object</h4>
                      <p className="font-bold">
                        {selectedMaintenance.targetType === "Device" && selectedMaintenance.deviceTarget
                          ? selectedMaintenance.deviceTarget.name
                          : `Rack ID: ${selectedMaintenance.targetId}`}
                      </p>
                      <Badge variant="secondary" className="mt-1 font-bold text-[10px] uppercase">{selectedMaintenance.targetType}</Badge>
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
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Start</h4>
                        <p className="font-bold">
                          {new Date(selectedMaintenance.startTask).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedMaintenance.startTask).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-0.5">End</h4>
                        <p className="font-bold">
                          {new Date(selectedMaintenance.endTask).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(selectedMaintenance.endTask).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="px-8 py-5 bg-muted/50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground text-xs font-bold uppercase tracking-widest">
                  <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                  Created {new Date(selectedMaintenance.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </div>
                <Button
                  variant="default"
                  onClick={() => setIsViewDialogOpen(false)}
                  className="rounded-xl font-bold"
                >
                  Close Report
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
