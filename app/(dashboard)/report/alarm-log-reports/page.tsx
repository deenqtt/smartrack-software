// File: app/(dashboard)/alarms/alarm-log-reports/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useMenuItemPermissions } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { showToast } from "@/lib/toast-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

import { format } from "date-fns"; // <-- PATH IMPOR DIPERBAIKI DI SINI
// --- UI Components & Icons ---
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2, ChevronLeft, ChevronRight, BellRing, Search, Filter, RefreshCw, Download, HardDrive, Copy, MoreHorizontal, ArrowUpDown, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// --- Type Definitions ---
type AlarmLog = {
  id: string;
  deviceName: string;
  alarmName: string;
  alarmType: "CRITICAL" | "MAJOR" | "MINOR";
  status: "ACTIVE" | "ACKNOWLEDGED" | "CLEARED";
  timestamp: string;
  triggeringValue?: string;
  clearedAt?: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

type AlarmLogResponse = {
  data: AlarmLog[];
  pagination: PaginationMeta;
  meta: {
    filteredBy: {
      status: string | null;
      deviceId: string | null;
      dateRange: any;
    };
  };
};



// =================================================================
// Main Page Component
// =================================================================
export default function AlarmLogPage() {
  // All hooks must be called before any conditional returns
  const { canView, canDelete, isDeveloper } = useMenuItemPermissions("report-alarm-log-reports");

  // Server-side pagination state
  const [responseData, setResponseData] = useState<AlarmLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);

  // Server-side filtering state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deviceIdFilter, setDeviceIdFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const [datePreset, setDatePreset] = useState<string>("all_time");

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build query parameters for server-side filtering
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '100'); // Match API default

      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter && statusFilter !== "all") params.append('status', statusFilter);
      if (typeFilter && typeFilter !== "all") params.append('type', typeFilter);
      if (deviceIdFilter.trim()) params.append('deviceId', deviceIdFilter.trim());

      // Handle Date Presets
      let finalStartDate = startDate;
      let finalEndDate = endDate;

      if (datePreset !== "all_time") {
        const now = new Date();
        const start = new Date();
        if (datePreset === "today") {
          start.setHours(0, 0, 0, 0);
        } else if (datePreset === "yesterday") {
          start.setDate(now.getDate() - 1);
          start.setHours(0, 0, 0, 0);
          const end = new Date();
          end.setDate(now.getDate() - 1);
          end.setHours(23, 59, 59, 999);
          finalEndDate = end.toISOString();
        } else if (datePreset === "last_7_days") {
          start.setDate(now.getDate() - 7);
        } else if (datePreset === "last_30_days") {
          start.setDate(now.getDate() - 30);
        }
        finalStartDate = start.toISOString();
        if (datePreset !== "yesterday") finalEndDate = now.toISOString();
      }

      if (finalStartDate) params.append('startDate', finalStartDate);
      if (finalEndDate) params.append('endDate', finalEndDate);

      const response = await fetch(`/api/alarm-log?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch alarm logs");

      const data: AlarmLogResponse = await response.json();
      setResponseData(data);
    } catch (error: any) {
      console.error(error);
      showToast.error("Failed to fetch alarm logs", error.message || "Could not fetch alarm logs.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, typeFilter, deviceIdFilter, startDate, endDate, datePreset]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Early return AFTER all hooks are called
  if (!canView && !isDeveloper) {
    return <AccessDenied title="Access Denied" message="You do not have permission to view Alarm Reports." onRetry={() => window.location.reload()} />;
  }

  // Get logs from response data
  const logs = responseData?.data || [];
  const pagination = responseData?.pagination;

  const handleDeleteAll = async () => {
    try {
      const response = await fetch("/api/alarm-log", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete all alarm logs");
      showToast.success("All alarm logs have been deleted.");
      fetchLogs();
      setConfirmationDialogOpen(false);
    } catch (error: any) {
      showToast.error("Failed to delete logs", error.message);
    }
  };

  const handleDeleteAllClick = () => {
    setConfirmationDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      // Build query parameters for filtered export
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      if (statusFilter.trim()) params.append('status', statusFilter);
      if (typeFilter.trim()) params.append('type', typeFilter);

      const response = await fetch(`/api/alarm-log/export?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to export alarm logs");

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `alarm-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export completed successfully!");
    } catch (error: any) {
      showToast.error("Export failed", error.message);
    }
  };

  const getStatusVariant = (status: AlarmLog["status"]) => {
    switch (status) {
      case "ACTIVE":
        return "destructive";
      case "CLEARED":
        return "default";
      case "ACKNOWLEDGED":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getTypeVariant = (type: AlarmLog["alarmType"]) => {
    switch (type) {
      case "CRITICAL":
        return "destructive";
      case "MAJOR":
        return "warning";
      case "MINOR":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <HardDrive className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">System Alarm Logs</h1>
            <p className="text-sm sm:text-base text-muted-foreground">A historical record of all triggered alarm events</p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {(canDelete || isDeveloper) && (
            <Button onClick={handleDeleteAllClick} variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <BellRing className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold">{pagination?.totalCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold text-red-600">
                  {logs.filter(l => l.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Cleared</p>
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter(l => l.status === 'CLEARED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Info className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Acknowledged</p>
                <p className="text-2xl font-bold text-blue-600">
                  {logs.filter(l => l.status === 'ACKNOWLEDGED').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by device or alarm name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-40">
          <Select value={statusFilter || "all"} onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="ACKNOWLEDGED">Acknowledged</SelectItem>
              <SelectItem value="CLEARED">Cleared</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-40">
          <Select value={typeFilter || "all"} onValueChange={(value) => setTypeFilter(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
              <SelectItem value="MAJOR">Major</SelectItem>
              <SelectItem value="MINOR">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-40">
          <Select
            value={datePreset}
            onValueChange={(val) => setDatePreset(val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last_7_days">Last 7 Days</SelectItem>
              <SelectItem value="last_30_days">Last 30 Days</SelectItem>
              <SelectItem value="all_time">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSearchQuery("");
            setStatusFilter("all");
            setTypeFilter("all");
            setDatePreset("all_time");
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Active Filters Display */}
      {(searchQuery || statusFilter !== "all" || typeFilter !== "all") && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchQuery && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{searchQuery}&quot;
              <button onClick={() => setSearchQuery("")} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusFilter === "ACTIVE" ? "Active" : statusFilter === "CLEARED" ? "Cleared" : "Acknowledged"}
              <button onClick={() => setStatusFilter("all")} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
          {typeFilter !== "all" && (
            <Badge variant="secondary" className="gap-1">
              Type: {typeFilter}
              <button onClick={() => setTypeFilter("all")} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Alarm History
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {logs.length} of {pagination?.totalCount || 0} alarm events
              {pagination && pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
            </div>
          </CardTitle>
          <CardDescription>
            All alarm events in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarm logs</h3>
                <p className="mt-1 text-sm text-gray-500">
                  No alarm events have been triggered yet.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button variant="ghost" className="h-auto p-0 font-semibold">
                        Device
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="h-auto p-0 font-semibold">
                        Alarm Name
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="h-auto p-0 font-semibold">
                        Type
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" className="h-auto p-0 font-semibold">
                        Status
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Trigger Value</TableHead>
                    <TableHead>Cleared At</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-48"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-16"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-20"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-24"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-32"></div></TableCell>
                        <TableCell><div className="h-4 bg-muted rounded animate-pulse w-40"></div></TableCell>
                        <TableCell className="text-right"><div className="h-4 bg-muted rounded animate-pulse w-8 ml-auto"></div></TableCell>
                      </TableRow>
                    ))
                  ) : (
                    logs.map((log: AlarmLog) => (
                      <TableRow key={log.id} className="group">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-96" title={log.deviceName}>
                              {log.deviceName}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(log.deviceName);
                                showToast.success("Device name copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-96" title={log.alarmName}>
                              {log.alarmName}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => {
                                navigator.clipboard.writeText(log.alarmName);
                                showToast.success("Alarm name copied to clipboard");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTypeVariant(log.alarmType)}>
                            {log.alarmType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(log.status)}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <code className="bg-muted px-2 py-1 rounded text-xs">
                            {log.triggeringValue || "N/A"}
                          </code>
                        </TableCell>
                        <TableCell>
                          {log.clearedAt ? (
                            <span className="text-sm text-green-600">
                              {format(new Date(log.clearedAt), "dd MMM yyyy, HH:mm:ss")}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss")}
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
                              <DropdownMenuItem
                                onClick={() => {
                                  navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                                  showToast.success("Log details copied to clipboard");
                                }}
                              >
                                <Copy className="mr-2 h-4 w-4" />
                                Copy Details
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-4">
            {logs.map((log: AlarmLog) => (
              <Card key={log.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BellRing className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{log.alarmName}</h3>
                          <Badge variant={getTypeVariant(log.alarmType)} className="text-xs flex-shrink-0">
                            {log.alarmType}
                          </Badge>
                          <Badge variant={getStatusVariant(log.status)} className="text-xs flex-shrink-0">
                            {log.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${log.status === 'ACTIVE' ? 'bg-red-500' :
                            log.status === 'CLEARED' ? 'bg-green-500' : 'bg-blue-500'
                            } flex-shrink-0`} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {log.deviceName}
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
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(JSON.stringify(log, null, 2));
                            showToast.success("Log details copied to clipboard");
                          }}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-2" />
                          Copy Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Trigger Value */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">Trigger Value:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.triggeringValue || 'N/A'}
                      </code>
                    </div>
                  </div>

                  {/* Timestamp and Cleared At */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(log.timestamp), "dd MMM yyyy, HH:mm:ss")}
                      </div>
                      {log.clearedAt && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">Cleared:</span>
                          <span className="text-xs text-green-600">
                            {format(new Date(log.clearedAt), "dd MMM yyyy, HH:mm:ss")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {logs.length === 0 && !isLoading && (
            <div className="text-center py-8 lg:hidden">
              <HardDrive className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No alarm logs</h3>
              <p className="mt-1 text-sm text-gray-500">
                No alarm events have been triggered yet.
              </p>
            </div>
          )}
        </CardContent>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total records)
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!pagination.hasPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmationDialog
        open={confirmationDialogOpen}
        onOpenChange={setConfirmationDialogOpen}
        type="destructive"
        title="Delete All Alarm Logs"
        description="Are you sure you want to delete all alarm logs? This action cannot be undone and will permanently remove all historical alarm data."
        confirmText="Yes, delete all logs"
        cancelText="Cancel"
        onConfirm={handleDeleteAll}
        onCancel={() => setConfirmationDialogOpen(false)}
      />
    </div>
  );
}
