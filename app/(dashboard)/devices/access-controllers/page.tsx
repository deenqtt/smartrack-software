"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { showToast } from "@/lib/toast-utils";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  HardDrive,
  Plus,
  Wifi,
  WifiOff,
  Users,
  History,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UnlockKeyhole,
} from "lucide-react";

interface AccessController {
  id: string;
  name: string;
  ipAddress: string;
  status: string;
  lockCount: number;
  lockAddresses?: string;
  doorStatus?: string;
}

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
}

const DevicesExternalContent = () => {
  const router = useRouter();
  const [controllers, setControllers] = useState<AccessController[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newIpAddress, setNewIpAddress] = useState("");
  const [isDeviceDialogOpen, setIsDeviceDialogOpen] = useState(false);
  const [selectedController, setSelectedController] =
    useState<AccessController | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isInstructionModalOpen, setIsInstructionModalOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logSyncStatus, setLogSyncStatus] = useState("");

  const [isOpenDoorModalOpen, setIsOpenDoorModalOpen] = useState(false);
  const [selectedLockAddress, setSelectedLockAddress] = useState<number | null>(null);
  const [isOpeningDoor, setIsOpeningDoor] = useState(false);

  const [controllerForm, setControllerForm] = useState({
    name: "",
    ipAddress: "",
  });

  const { toast } = useToast();

  // Fetch controllers
  const fetchControllers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/devices/access-controllers");
      if (!response.ok) throw new Error("Failed to fetch controllers");
      const data: AccessController[] = await response.json();
      setControllers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter controllers based on search term
  const filteredControllers = controllers.filter((controller) => {
    const matchesSearch =
      controller.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      controller.ipAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      controller.status.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Apply sorting using useSortableTable hook
  const {
    sorted: sortedControllers,
    sortKey,
    sortDirection,
    handleSort,
  } = useSortableTable(filteredControllers);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedControllers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedControllers = sortedControllers.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortKey, sortDirection]);

  // Initialize
  useEffect(() => {
    fetchControllers();
    const refreshInterval = setInterval(fetchControllers, 30000); // Changed to 30s to be less frequent
    return () => clearInterval(refreshInterval);
  }, []);

  // Form submission for adding controller
  const handleDeviceSubmit = async () => {
    if (!controllerForm.name.trim() || !controllerForm.ipAddress.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/devices/access-controllers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: controllerForm.name,
          ipAddress: controllerForm.ipAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add controller");
      }

      toast({
        title: "Success",
        description: "Controller added successfully",
      });

      setIsDeviceDialogOpen(false);
      resetControllerForm();
      fetchControllers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add controller",
        variant: "destructive",
      });
    }
  };

  // Edit controller
  const handleEdit = (controller: AccessController) => {
    setSelectedController(controller);
    setControllerForm({
      name: controller.name,
      ipAddress: controller.ipAddress,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedController) return;

    try {
      const response = await fetch(
        `/api/devices/access-controllers/${selectedController.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(controllerForm),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save changes");
      }

      toast({
        title: "Success",
        description: "Controller updated successfully",
      });

      setIsEditModalOpen(false);
      setSelectedController(null);
      resetControllerForm();
      fetchControllers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save changes",
        variant: "destructive",
      });
    }
  };

  // Delete controller
  const handleDelete = async (id: string, name: string) => {
    try {
      const response = await fetch(`/api/devices/access-controllers/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete controller");
      }

      toast({
        title: "Success",
        description: "Controller deleted successfully",
      });

      fetchControllers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete controller",
        variant: "destructive",
      });
    }
  };

  // Manage users navigation
  const handleManageUsers = (controller: AccessController) => {
    router.push(`/devices/access-controllers/${controller.id}/users`);
  };

  // View and sync logs
  const handleViewLogs = async (
    controller: AccessController,
    forceSync = false,
  ) => {
    setSelectedController(controller);
    setIsLogModalOpen(true);
    setIsLogLoading(true);
    setActivityLogs([]);
    setLogSyncStatus("Fetching logs from database...");

    try {
      const [dbLogs, deviceLogs] = await Promise.all([
        fetch(`/api/devices/access-controllers/${controller.id}/logs`).then(
          (res) => res.json(),
        ),
        forceSync
          ? fetch(
              `/api/devices/access-controllers/${controller.id}/sync-logs`,
              { method: "POST" },
            ).then((res) => res.json())
          : Promise.resolve([]),
      ]);

      // Process and merge logs
      const combinedLogs = [...dbLogs, ...deviceLogs];
      const uniqueLogsMap = new Map<string, ActivityLog>();
      combinedLogs.forEach((log: any) => {
        if (!log.message) {
          log.message = `Lock ${log.lockAddress} event by ${log.method} (Card: ${log.cardNumber})`;
        }
        const key = `${log.timestamp}-${log.message}`;
        if (!uniqueLogsMap.has(key)) {
          uniqueLogsMap.set(key, log);
        }
      });

      const sortedLogs = Array.from(uniqueLogsMap.values()).sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      setActivityLogs(sortedLogs);
      setLogSyncStatus(
        deviceLogs.length > 0
          ? "Sync complete!"
          : "Sync complete (no new logs from device).",
      );
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch or sync logs",
        variant: "destructive",
      });
      setLogSyncStatus("Error during sync.");
    } finally {
      setIsLogLoading(false);
    }
  };

  // Clear logs
  const handleDeleteLogs = async (controllerId: string) => {
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${controllerId}/logs`,
        {
          method: "DELETE",
        },
      );

      const resData = await response.json();
      if (!response.ok)
        throw new Error(resData.error || "Failed to delete logs.");

      toast({
        title: "Success",
        description: "All logs cleared successfully",
      });

      setActivityLogs([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Open door via remote unlock
  const handleOpenDoor = async () => {
    if (!selectedController || selectedLockAddress === null) return;
    setIsOpeningDoor(true);
    try {
      const response = await fetch(
        `/api/devices/access-controllers/${selectedController.id}/remote-open`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lockAddress: selectedLockAddress }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to unlock door");
      showToast.success(`Lock ${selectedLockAddress} unlocked successfully`);
      setIsOpenDoorModalOpen(false);
      setSelectedLockAddress(null);
    } catch (error: any) {
      showToast.error(error.message || "Failed to send unlock command");
    } finally {
      setIsOpeningDoor(false);
    }
  };

  // Reset form
  const resetControllerForm = () => {
    setControllerForm({
      name: "",
      ipAddress: "",
    });
  };

  // Format timestamp
  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
      hour12: false,
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Access Controllers
              </h1>
              <p className="text-muted-foreground">
                Manage and monitor your access control systems
              </p>
            </div>

            <Button onClick={() => setIsDeviceDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Controller
            </Button>
          </div>

          {/* Search and Controls */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search controllers by name, IP, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchControllers}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <HardDrive className="h-6 w-6 text-primary" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Controllers
                    </p>
                    <p className="text-2xl font-bold">{controllers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Wifi className="h-6 w-6 text-emerald-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Online
                    </p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {controllers.filter((c) => c.status === "online").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <WifiOff className="h-6 w-6 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Offline
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {controllers.filter((c) => c.status === "offline").length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-6 w-6 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Locks
                    </p>
                    <p className="text-2xl font-bold">
                      {controllers.reduce(
                        (sum, c) => sum + (c.lockCount || 0),
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items per page control */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Showing {paginatedControllers.length} of{" "}
                {sortedControllers.length} controllers
              </span>
              <div className="flex items-center gap-2">
                <label htmlFor="items-per-page" className="text-sm">
                  Items per page:
                </label>
                <select
                  value={itemsPerPage.toString()}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="w-20 px-3 py-2 border border-input bg-background rounded-md text-sm"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="20">20</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Controllers Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("name")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Name
                        {sortKey === "name" ? (
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("ipAddress")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        IP Address
                        {sortKey === "ipAddress" ? (
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("status")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Status
                        {sortKey === "status" ? (
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
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort("lockCount")}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Locks
                        {sortKey === "lockCount" ? (
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
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-32"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-16"></div>
                        </TableCell>
                        <TableCell>
                          <div className="h-4 bg-muted rounded animate-pulse w-12"></div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="h-4 bg-muted rounded animate-pulse w-32 ml-auto"></div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <WifiOff className="h-12 w-12 text-red-500 mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            Error Loading Controllers
                          </h3>
                          <p className="text-muted-foreground">{error}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedControllers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12">
                        <div className="flex flex-col items-center">
                          <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-medium text-foreground mb-2">
                            No Controllers Found
                          </h3>
                          <p className="text-muted-foreground">
                            {searchTerm
                              ? "No controllers match your search"
                              : "Get started by adding your first access controller"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedControllers.map((controller) => (
                      <TableRow
                        key={controller.id}
                        className="hover:bg-muted/50"
                      >
                        <TableCell className="font-medium">
                          {controller.name}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {controller.ipAddress}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className={`inline-flex items-center rounded-full h-2 w-2 ${
                                controller.status === "online"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            />
                            <Badge
                              variant={
                                controller.status === "online"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {controller.status === "online"
                                ? "Online"
                                : "Offline"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {controller.lockCount} locks
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={controller.status !== "online"}
                                  onClick={() => {
                                    setSelectedController(controller);
                                    const addresses: number[] = controller.lockAddresses
                                      ? JSON.parse(controller.lockAddresses)
                                      : Array.from({ length: controller.lockCount || 1 }, (_, i) => i + 1);
                                    setSelectedLockAddress(addresses[0] ?? 1);
                                    setIsOpenDoorModalOpen(true);
                                  }}
                                  className="text-emerald-600 hover:text-emerald-700 disabled:opacity-40"
                                >
                                  <UnlockKeyhole className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {controller.status === "online" ? "Open Door" : "Controller Offline"}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleManageUsers(controller)}
                                >
                                  <Users className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Manage Users</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewLogs(controller)}
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Logs</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(controller)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Controller</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDelete(controller.id, controller.name)
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Controller</TooltipContent>
                            </Tooltip>
                          </div>
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
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                {/* Page Numbers */}
                {totalPages <= 7 ? (
                  Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10 h-10 p-0"
                      >
                        {page}
                      </Button>
                    ),
                  )
                ) : (
                  <>
                    {currentPage <= 4 && (
                      <>
                        {[1, 2, 3, 4, 5].map((page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
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
                        {[currentPage - 1, currentPage, currentPage + 1].map(
                          (page) => (
                            <Button
                              key={page}
                              variant={
                                currentPage === page ? "default" : "outline"
                              }
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-10 h-10 p-0"
                            >
                              {page}
                            </Button>
                          ),
                        )}
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
                        {[
                          totalPages - 4,
                          totalPages - 3,
                          totalPages - 2,
                          totalPages - 1,
                          totalPages,
                        ].map((page) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
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
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Add Controller Dialog */}
          <Dialog
            open={isDeviceDialogOpen}
            onOpenChange={setIsDeviceDialogOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Access Controller</DialogTitle>
                <DialogDescription>
                  Configure a new access control system
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="controller-name">Controller Name *</Label>
                  <Input
                    id="controller-name"
                    placeholder="e.g., Lobby Access Controller"
                    value={controllerForm.name}
                    onChange={(e) =>
                      setControllerForm({
                        ...controllerForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="controller-ip">IP Address *</Label>
                  <Input
                    id="controller-ip"
                    placeholder="e.g., 192.168.1.100"
                    value={controllerForm.ipAddress}
                    onChange={(e) =>
                      setControllerForm({
                        ...controllerForm,
                        ipAddress: e.target.value,
                      })
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsDeviceDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeviceSubmit}
                  disabled={
                    !controllerForm.name.trim() ||
                    !controllerForm.ipAddress.trim()
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Controller
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Open Door Dialog */}
          <Dialog
            open={isOpenDoorModalOpen}
            onOpenChange={(open) => {
              if (!open) { setSelectedLockAddress(null); }
              setIsOpenDoorModalOpen(open);
            }}
          >
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UnlockKeyhole className="h-5 w-5 text-emerald-600" />
                  Remote Unlock
                </DialogTitle>
                <DialogDescription>
                  Send unlock command to <strong>{selectedController?.name}</strong>
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-3">
                <Label>Select Lock Address</Label>
                <select
                  className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                  value={selectedLockAddress ?? ""}
                  onChange={(e) => setSelectedLockAddress(Number(e.target.value))}
                >
                  {(selectedController?.lockAddresses
                    ? JSON.parse(selectedController.lockAddresses)
                    : Array.from({ length: selectedController?.lockCount || 1 }, (_, i) => i + 1)
                  ).map((addr: number) => (
                    <option key={addr} value={addr}>Lock {addr}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  This will physically unlock the selected door immediately.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpenDoorModalOpen(false)} disabled={isOpeningDoor}>
                  Cancel
                </Button>
                <Button
                  onClick={handleOpenDoor}
                  disabled={selectedLockAddress === null || isOpeningDoor}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isOpeningDoor ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Unlocking...</>
                  ) : (
                    <><UnlockKeyhole className="h-4 w-4 mr-2" />Unlock</>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Edit Controller Dialog */}
          <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Access Controller</DialogTitle>
                <DialogDescription>
                  Modify controller information
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-controller-name">
                    Controller Name *
                  </Label>
                  <Input
                    id="edit-controller-name"
                    placeholder="e.g., Lobby Access Controller"
                    value={controllerForm.name}
                    onChange={(e) =>
                      setControllerForm({
                        ...controllerForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-controller-ip">IP Address *</Label>
                  <Input
                    id="edit-controller-ip"
                    placeholder="e.g., 192.168.1.100"
                    value={controllerForm.ipAddress}
                    onChange={(e) =>
                      setControllerForm({
                        ...controllerForm,
                        ipAddress: e.target.value,
                      })
                    }
                    className="font-mono"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={
                    !controllerForm.name.trim() ||
                    !controllerForm.ipAddress.trim()
                  }
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Update Controller
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Controller Dialog */}
          <AlertDialog>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Access Controller</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this controller? This action
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Controller
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Activity Logs Dialog */}
          <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Activity Logs - {selectedController?.name}
                </DialogTitle>
                <DialogDescription>
                  Recent access control activity and system events
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {isLogLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>{logSyncStatus}</span>
                  </div>
                ) : activityLogs.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {activityLogs.map((log, index) => (
                      <div
                        key={`${log.timestamp}-${index}`}
                        className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="mt-0.5">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{log.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(log.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No activity logs found
                    </p>
                  </div>
                )}

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewLogs(selectedController!, true)}
                    disabled={isLogLoading}
                    className="flex-1"
                  >
                    <RefreshCw
                      className={`h-4 w-4 mr-2 ${
                        isLogLoading ? "animate-spin" : ""
                      }`}
                    />
                    Force Sync
                  </Button>

                  {activityLogs.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLogs(selectedController!.id)}
                      className="flex-1"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Logs
                    </Button>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button onClick={() => setIsLogModalOpen(false)}>Close</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Instructions Dialog */}
          <Dialog
            open={isInstructionModalOpen}
            onOpenChange={setIsInstructionModalOpen}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>How to Access Device UI</DialogTitle>
                <DialogDescription>
                  Instructions for accessing the device interface
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedController && (
                  <>
                    <div className="space-y-2">
                      <h4 className="font-medium">Option 1: Connect via LAN</h4>
                      <p className="text-sm text-muted-foreground">
                        If the device is connected to your main network via
                        Ethernet, open this address in your browser:
                      </p>
                      <div className="p-3 bg-muted rounded-lg">
                        <code className="text-sm font-mono">
                          http://{selectedController.ipAddress}
                        </code>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">
                        Option 2: Connect via Device Wi-Fi AP
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        You can also connect directly to the Wi-Fi hotspot
                        created by the device:
                      </p>
                      <div className="p-3 bg-muted rounded-lg">
                        <code className="text-sm font-mono">
                          http://10.10.0.1
                        </code>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setIsInstructionModalOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DevicesExternalContent;
