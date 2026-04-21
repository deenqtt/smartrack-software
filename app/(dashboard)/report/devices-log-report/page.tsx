"use client";

import * as React from "react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { showToast } from "@/lib/toast-utils";
import { useMenuItemPermissions } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download,
  Search,
  ChevronRight as ChevronRightIcon,
  BarChart3,
  Database,
  FileText,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// --- Custom Components ---
// --- Removed Unused Hooks ---
// import { useSortableTable } from "@/hooks/use-sort-table";

// --- Type Definitions ---
type LoggedData = {
  id: string;
  deviceName: string;
  logName: string;
  value: number;
  units: string | null;
  timestamp: string;
};

type ApiResponse = {
  data: LoggedData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  stats: {
    totalUniqueDevices: number;
    totalUniqueLogTypes: number;
  };
  performance: {
    cached: boolean;
    queryTime: number;
    tip: string;
  };
};

type LoggingConfig = {
  id: string;
  customName: string;
  device: { name: string };
};

// Confirmation Dialog State - moved inside component

// =================================================================
// Main Page Component - Enhanced with Sorting, Cards & Advanced Pagination
// =================================================================
export default function DeviceLogReportPage() {
  const { canView, canCreate, canUpdate, canDelete, isDeveloper } =
    useMenuItemPermissions("report-devices-log-report");
  const [logs, setLogs] = useState<LoggedData[]>([]);
  const [loggingConfigs, setLoggingConfigs] = useState<LoggingConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Start with smaller default for better UX
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalUniqueDevices, setTotalUniqueDevices] = useState(0);
  const [totalUniqueLogTypes, setTotalUniqueLogTypes] = useState(0);
  const [dbStatus, setDbStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);

  const [filters, setFilters] = useState<{
    configId: string;
    datePreset: string;
  }>({
    configId: "", // Start with empty string for "all devices & logs"
    datePreset: "last_7_days",
  });

  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds

  // Delete confirmation dialog state
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    open: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
  }>({
    open: false,
    title: "",
    description: "",
    confirmText: "",
    cancelText: "",
  });

  // Fetch logging configurations and check database status
  useEffect(() => {
    // Only load configs if user can view this page (or is developer)
    if (!canView && !isDeveloper) return;

    async function fetchConfigs() {
      try {
        // Fetch up to 1000 configs for the dropdown, which should be sufficient
        const loggingRes = await fetch("/api/logging-configs?limit=1000");
        if (loggingRes.ok) {
          const result = await loggingRes.json();
          // The API returns a paginated response, so we need the 'data' property
          setLoggingConfigs(Array.isArray(result.data) ? result.data : []);
        } else {
          setLoggingConfigs([]); // Ensure it's an empty array if API fails
        }

        // Check database status
        const healthResponse = await fetch("/api/health");
        if (healthResponse.ok) {
          setDbStatus("connected");
        } else {
          setDbStatus("disconnected");
        }
      } catch (error) {
        console.error(error);
        setLoggingConfigs([]); // Ensure it's always an array on error
        setDbStatus("disconnected");
      }
    }
    fetchConfigs();
  }, [canView, isDeveloper]);

  // Fetch device logs with filters and pagination
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", itemsPerPage.toString());

      // Append search term if it exists
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      // Only add configId if it's not empty (filters.configId gets converted from "all" to "" in the Select handler)
      if (filters.configId) {
        params.append("configId", filters.configId);
      }

      // Convert date presets to date ranges
      const now = new Date();
      let startDate: Date | null = null;
      let endDate: Date | null = new Date();

      switch (filters.datePreset) {
        case "today":
          startDate = startOfDay(now);
          endDate = endOfDay(now);
          break;
        case "yesterday":
          startDate = startOfDay(subDays(now, 1));
          endDate = endOfDay(subDays(now, 1));
          break;
        case "last_7_days":
          startDate = startOfDay(subDays(now, 6));
          break;
        case "last_30_days":
          startDate = startOfDay(subDays(now, 29));
          break;
        case "all_time":
          startDate = null;
          endDate = null;
          break;
      }

      if (startDate && endDate) {
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }

      const response = await fetch(
        `/api/devices-log-report?${params.toString()}`,
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        throw new Error(
          `Failed to fetch device logs: ${response.status} ${errorText}`,
        );
      }

      const apiResponse: ApiResponse = await response.json();
      setApiResponse(apiResponse);
      setLogs(apiResponse.data);
      setTotalLogs(apiResponse.pagination.total);
      setTotalPages(apiResponse.pagination.totalPages);
      setTotalUniqueDevices(apiResponse.stats.totalUniqueDevices);
      setTotalUniqueLogTypes(apiResponse.stats.totalUniqueLogTypes);
    } catch (error: any) {
      console.error(error);
      showToast.error("Error", error.message || "Could not fetch device logs.");
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, itemsPerPage, searchTerm]);

  useEffect(() => {
    // Only fetch logs if the user has view permission
    if (!canView && !isDeveloper) return;
    fetchLogs();
  }, [fetchLogs, canView, isDeveloper]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && (canView || isDeveloper)) {
      const intervalId = setInterval(() => {
        fetchLogs();
      }, refreshInterval * 1000);

      // Cleanup interval on component unmount or when autoRefresh is disabled
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh, refreshInterval, fetchLogs, canView, isDeveloper]);

  // Search is now handled server-side by the API
  const displayedLogs = logs;

  // Reset to first page when filters change or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters, itemsPerPage]);

  const handleDeleteAll = () => {
    setDeleteConfirmation({
      open: true,
      title: "Delete All Device Logs",
      description: `Are you sure you want to permanently delete ${totalLogs} logged data entries? This action cannot be undone and will remove all historical monitoring data from your system.`,
      confirmText: "Yes, Delete All Logs",
      cancelText: "Cancel",
    });
  };

  const confirmDeleteAll = async () => {
    setDeleteConfirmation({ ...deleteConfirmation, open: false });

    try {
      const response = await fetch("/api/devices-log-report", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete logs");
      }

      showToast.success("Success", "All device log entries have been removed from the system.");

      // Refresh the data after successful deletion
      fetchLogs();
    } catch (error: any) {
      console.error("Delete all logs error:", error);
      showToast.error("Error", error.message || "Could not delete device logs. Please try again.");
    }
  };

  const cancelDeleteAll = () => {
    setDeleteConfirmation({ ...deleteConfirmation, open: false });
  };

  const handleExport = () => {
    const csvData = [
      ["Timestamp", "Device", "Log Name", "Value", "Units"],
      ...logs.map((log) => [
        log.timestamp,
        log.deviceName,
        log.logName,
        log.value,
        log.units || "",
      ]),
    ];

    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `device-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast.success("Export Complete", "CSV file downloaded successfully");
  };

  // If user cannot view this menu item and is not developer, show access denied
  if (!canView && !isDeveloper) {
    return <AccessDenied />;
  }

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Header Section */}
        <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold truncate">
                Log Report
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                View and export historical data from devices and custom logs
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={fetchLogs}
                disabled={isLoading || (!canView && !isDeveloper)}
                size="sm"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={
                  logs.length === 0 || (!canView && !isDeveloper)
                }
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              {canDelete && (
                <Button
                  onClick={handleDeleteAll}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Logs
                      </p>
                      <p className="text-2xl font-bold">{totalLogs}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Database
                      className={`h-6 w-6 ${dbStatus === "connected"
                        ? "text-emerald-600"
                        : "text-red-600"
                        }`}
                    />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Database
                      </p>
                      <p
                        className={`text-sm font-medium ${dbStatus === "connected"
                          ? "text-emerald-600"
                          : "text-red-600"
                          }`}
                      >
                        {dbStatus === "connected"
                          ? "Connected"
                          : "Disconnected"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <FileText className="h-6 w-6 text-purple-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Active Devices
                      </p>
                      <p className="text-2xl font-bold">{totalUniqueDevices}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <Download className="h-6 w-6 text-blue-600" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-muted-foreground">
                        Total Log Types
                      </p>
                      <p className="text-2xl font-bold">
                        {totalUniqueLogTypes}
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
                    placeholder="Search logs by device name, log name, or value..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="sm:w-48">
                <Select
                  value={filters.configId || "all"}
                  onValueChange={(val) =>
                    setFilters((f) => ({
                      ...f,
                      configId: val === "all" ? "" : val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by device" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      All Devices & Logs
                    </SelectItem>
                    {loggingConfigs?.map((config) => (
                      <SelectItem key={config.id} value={config.id}>
                        {config.device.name} - {config.customName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:w-40">
                <Select
                  value={filters.datePreset}
                  onValueChange={(val) =>
                    setFilters((f) => ({ ...f, datePreset: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by date" />
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
                  setSearchTerm("");
                  setFilters({
                    configId: "",
                    datePreset: "last_7_days",
                  });
                }}
              >
                Clear Filters
              </Button>
            </div>

            {/* Active Filters Display */}
            {(searchTerm ||
              filters.configId ||
              filters.datePreset !== "last_7_days") && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">
                    Active filters:
                  </span>
                  {searchTerm && (
                    <Badge variant="secondary" className="gap-1">
                      Search: &quot;{searchTerm}&quot;
                      <button
                        onClick={() => setSearchTerm("")}
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.configId && (
                    <Badge variant="secondary" className="gap-1">
                      Device:{" "}
                      {loggingConfigs.find((c) => c.id === filters.configId)
                        ?.device.name || filters.configId}
                      <button
                        onClick={() =>
                          setFilters((f) => ({ ...f, configId: "" }))
                        }
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                  {filters.datePreset !== "last_7_days" && (
                    <Badge variant="secondary" className="gap-1">
                      Date: {filters.datePreset.replace(/_/g, " ")}
                      <button
                        onClick={() =>
                          setFilters((f) => ({
                            ...f,
                            datePreset: "last_7_days",
                          }))
                        }
                        className="ml-1 hover:bg-muted rounded-full p-0.5"
                      >
                        ×
                      </button>
                    </Badge>
                  )}
                </div>
              )}

            {/* Main Content Table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Device Logs
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Showing {displayedLogs.length} of {totalLogs} log entries
                  </div>
                </CardTitle>
                <CardDescription>
                  Historical data from your monitored devices
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-48">Timestamp</TableHead>
                      <TableHead>Device Name</TableHead>
                      <TableHead>Log Name</TableHead>
                      <TableHead className="text-right">
                        Value & Units
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      [...Array(10)].map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-muted rounded animate-pulse w-24"></div>
                          </TableCell>
                          <TableCell>
                            <div className="h-4 bg-muted rounded animate-pulse w-20"></div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="h-4 bg-muted rounded animate-pulse w-16 ml-auto"></div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : displayedLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-12">
                          <div className="flex flex-col items-center">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                              No Logs Found
                            </h3>
                            <p className="text-muted-foreground">
                              {searchTerm
                                ? "No logs match your search criteria"
                                : "No log entries found for the selected filters"}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedLogs.map((log: LoggedData) => (
                        <TableRow key={log.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm">
                            {format(
                              new Date(log.timestamp),
                              "dd MMM yyyy, HH:mm:ss",
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            <Badge variant="outline" className="font-normal">
                              {log.deviceName}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.logName}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span
                              className={`text-lg font-semibold ${log.value === 1 && !log.units
                                ? "text-green-600"
                                : log.value === 0 && !log.units
                                  ? "text-red-600"
                                  : "text-primary"
                                }`}
                            >
                              {log.value === 1 && !log.units
                                ? "true"
                                : log.value === 0 && !log.units
                                  ? "false"
                                  : log.value.toFixed(2)}
                            </span>
                            {(log.units ||
                              (!log.units &&
                                log.value !== 0 &&
                                log.value !== 1)) && (
                                <span className="text-sm text-muted-foreground ml-1">
                                  {log.units ||
                                    (log.value === 0 || log.value === 1
                                      ? ""
                                      : "°F")}
                                </span>
                              )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Pagination */}
            {totalPages > 1 && (
              <Card>
                <CardFooter className="flex items-center justify-between p-4 border-t">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">
                      Items per page:
                    </span>
                    <Select
                      value={itemsPerPage.toString()}
                      onValueChange={(value) =>
                        setItemsPerPage(parseInt(value))
                      }
                    >
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
                      Page {currentPage} of {totalPages}
                    </span>

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
                </CardFooter>
              </Card>
            )}

            {/* Delete Confirmation Dialog - Device Logs */}
            <ConfirmationDialog
              open={deleteConfirmation.open}
              onOpenChange={(open) =>
                setDeleteConfirmation({ ...deleteConfirmation, open })
              }
              type="destructive"
              title={deleteConfirmation.title}
              description={deleteConfirmation.description}
              confirmText={deleteConfirmation.confirmText}
              cancelText={deleteConfirmation.cancelText}
              onConfirm={confirmDeleteAll}
              onCancel={cancelDeleteAll}
              destructive={true}
            />
        </div>
      </div>
    </TooltipProvider>
  );
}
