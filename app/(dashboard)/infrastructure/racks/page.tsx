"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/lib/toast-utils";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  Plus,
  Server,
  HardDrive,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  Activity,
  Eye,
  ArrowUpDown,
  Filter,
  Download,
  MoreHorizontal,
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  Minus,
  Database,
  BarChart3,
  Copy,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";


interface Rack {
  id: string;
  name: string;
  capacityU: number;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  usedU: number;
  availableU: number;
  utilizationPercent: number;
  devices: Array<{
    id: string;
    positionU: number | null;
    sizeU: number;
    uniqId: string;
    name: string;
  }>;
}

export default function RacksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get('duplicate');
  const [racks, setRacks] = useState<Rack[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRack, setEditingRack] = useState<Rack | null>(null);
  const [selectedRacks, setSelectedRacks] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [utilizationFilter, setUtilizationFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"name" | "capacityU" | "utilizationPercent" | "createdAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const [visibleItemsCount, setVisibleItemsCount] = useState(20);
  const [hasMoreData, setHasMoreData] = useState(true);

  const [formData, setFormData] = useState({
    name: "",
    capacityU: 42,
    location: "",
    notes: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rackToDelete, setRackToDelete] = useState<Rack | null>(null);

  // RBAC Permission Checks
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('racks-management');
  const { loading: menuLoading } = useMenu();

  // Fetch racks data
  const fetchRacks = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/racks");
      if (response.ok) {
        const data = await response.json();
        setRacks(data.racks || []);
        setTotalItems(data.pagination?.total || data.racks?.length || 0);
      } else {
        showToast.error("Failed to fetch racks");
      }
    } catch (error) {
      showToast.error("Failed to fetch racks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canView && !menuLoading) {
      fetchRacks();
    }
  }, [canView, menuLoading]);

  // Handle duplicate from search params
  useEffect(() => {
    if (duplicateId && racks.length > 0) {
      const rackToDuplicate = racks.find(r => r.id === duplicateId);
      if (rackToDuplicate) {
        handleDuplicate(rackToDuplicate);
        // Clear the param
        const url = new URL(window.location.href);
        url.searchParams.delete('duplicate');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [duplicateId, racks]);

  // Reset visible items when filters change
  useEffect(() => {
    setVisibleItemsCount(20);
    setHasMoreData(true);
    setCurrentPage(1);
  }, [searchTerm, locationFilter, utilizationFilter, sortBy, sortOrder]);

  // Filter and sort racks
  const processedRacks = useMemo(() => {
    let filtered = racks.filter(rack => {
      const matchesSearch = rack.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rack.location && rack.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (rack.notes && rack.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLocation = locationFilter === "all" || rack.location === locationFilter;
      const matchesUtilization = utilizationFilter === "all" ||
        (utilizationFilter === "high" && rack.utilizationPercent >= 90) ||
        (utilizationFilter === "medium" && rack.utilizationPercent >= 70 && rack.utilizationPercent < 90) ||
        (utilizationFilter === "low" && rack.utilizationPercent < 70);

      return matchesSearch && matchesLocation && matchesUtilization;
    });

    // Sort racks
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (sortBy) {
        case "name":
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case "capacityU":
          aValue = a.capacityU;
          bValue = b.capacityU;
          break;
        case "utilizationPercent":
          aValue = a.utilizationPercent;
          bValue = b.utilizationPercent;
          break;
        case "createdAt":
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
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
  }, [racks, searchTerm, locationFilter, utilizationFilter, sortBy, sortOrder]);

  // Pagination logic
  const totalPages = Math.ceil(processedRacks.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedRacks = processedRacks.slice(startIndex, startIndex + pageSize);

  // Get unique locations for filters
  const availableLocations = useMemo(() => {
    const locations = [...new Set(racks.map(r => r.location).filter(Boolean))] as string[];
    return locations.sort();
  }, [racks]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRacks(processedRacks.map(r => r.id));
    } else {
      setSelectedRacks([]);
    }
  };

  const handleSelectRack = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRacks(prev => [...prev, id]);
    } else {
      setSelectedRacks(prev => prev.filter(rackId => rackId !== id));
    }
  };

  const handleBulkDelete = async () => {
    const racksToDelete = selectedRacks;
    if (racksToDelete.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      await Promise.all(racksToDelete.map(async (id) => {
        try {
          const response = await fetch(`/api/racks/${id}`, { method: "DELETE", credentials: 'include' });
          if (response.ok) {
            successCount++;
          } else {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
      }));

      if (successCount > 0) {
        showToast.success(`Deleted ${successCount} racks`);
      }
      if (errorCount > 0) {
        showToast.error(`Failed to delete ${errorCount} racks`);
      }
    } finally {
      fetchRacks();
      setSelectedRacks([]);
      setLoading(false);
    }
  };

  const handleSort = (column: "name" | "capacityU" | "utilizationPercent" | "createdAt") => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
  };

  const exportToCSV = () => {
    const headers = ["Name", "Capacity", "Used", "Available", "Utilization", "Location", "Created"];
    const csvContent = [
      headers.join(","),
      ...processedRacks.map(rack => [
        `"${rack.name}"`,
        rack.capacityU,
        rack.usedU,
        rack.availableU,
        `${rack.utilizationPercent}%`,
        `"${rack.location || ""}"`,
        new Date(rack.createdAt).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "racks.csv";
    a.click();
    URL.revokeObjectURL(url);
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

    // Final validation for capacity
    if (isNaN(formData.capacityU) || formData.capacityU < 1) {
      showToast.error("Please enter a valid capacity (1-100)");
      return;
    }

    try {
      const url = editingRack ? `/api/racks/${editingRack.id}` : "/api/racks";
      const method = editingRack ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          capacityU: Number(formData.capacityU),
          location: formData.location || null,
          notes: formData.notes || null,
        }),
      });

      if (response.ok) {
        showToast.success(`Rack ${editingRack ? "updated" : "created"} successfully`);
        fetchRacks();
        setIsCreateDialogOpen(false);
        setIsEditDialogOpen(false);
        setEditingRack(null);
        setFormData({ name: "", capacityU: 42, location: "", notes: "" });
      } else {
        const error = await response.json();
        showToast.error(error.error || "Failed to save rack");
      }
    } catch (error) {
      showToast.error("Failed to save rack");
    }
  };

  const handleDuplicate = (rack: Rack) => {
    setEditingRack(null); // It's a new create, not an edit
    setFormData({
      name: `${rack.name} - Duplicate`,
      capacityU: rack.capacityU,
      location: rack.location || "",
      notes: rack.notes || "",
    });
    setIsCreateDialogOpen(true);
  };

  const handleEdit = (rack: Rack) => {
    setEditingRack(rack);
    setFormData({
      name: rack.name,
      capacityU: rack.capacityU,
      location: rack.location || "",
      notes: rack.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    // Single delete implementation
    fetch(`/api/racks/${id}`, { method: "DELETE", credentials: 'include' })
      .then(response => {
        if (response.ok) {
          showToast.success("Rack deleted successfully");
          fetchRacks();
        } else {
          showToast.error("Failed to delete rack");
        }
      })
      .catch(error => {
        showToast.error("Failed to delete rack");
      });
  };

  // Get utilization color
  const getUtilizationColor = (percent: number) => {
    if (percent < 30) return "text-emerald-600";
    if (percent < 70) return "text-amber-600";
    if (percent < 90) return "text-orange-600";
    return "text-red-600";
  };

  // RBAC Check
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view infrastructure racks."
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

                    {/* Content */}
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 bg-muted rounded w-12"></div>
                        <div className="h-4 bg-muted rounded flex-1"></div>
                      </div>
                    </div>

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
            <Server className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Server Rack Management</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Manage and monitor your server racks and equipment placement</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRacks} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canCreate && (
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Rack
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
                <DialogHeader>
                  <DialogTitle className="text-lg sm:text-xl">Add New Rack</DialogTitle>
                  <DialogDescription className="text-sm sm:text-base">
                    Add a new server rack for equipment installation and management.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm">Rack Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Rack-A01, Primary-Server-Rack"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="capacityU" className="text-sm">Capacity (U) *</Label>
                    <Input
                      id="capacityU"
                      type="number"
                      min="1"
                      max="100"
                      value={formData.capacityU}
                      onChange={(e) => setFormData({ ...formData, capacityU: parseInt(e.target.value) })}
                      placeholder="42"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Standard 4-post server rack capacity in rack units
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location" className="text-sm">Location (Optional)</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="e.g., Data Center Room 1, Floor 2"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional information about this rack, power specs, cooling, etc."
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false);
                        setFormData({ name: "", capacityU: 42, location: "", notes: "" });
                      }}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                      {editingRack ? "Update Rack" : "Add Rack"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-blue-500/5 to-cyan-500/5 dark:from-blue-500/10 dark:to-cyan-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Server className="h-6 w-6 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Racks</p>
                  <p className="text-2xl font-bold">{racks.length}</p>
                </div>
              </div>
              <Activity className="h-8 w-8 text-blue-500/10" />
            </CardContent>
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-30" />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <HardDrive className="h-6 w-6 text-emerald-500" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Capacity</p>
                  <p className="text-2xl font-bold">{racks.reduce((sum, rack) => sum + rack.capacityU, 0)}U</p>
                </div>
              </div>
              <Plus className="h-8 w-8 text-emerald-500/10" />
            </CardContent>
            <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-30" />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-500" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Used Capacity</p>
                  <p className="text-2xl font-bold">{racks.reduce((sum, rack) => sum + rack.usedU, 0)}U</p>
                </div>
              </div>
              <Activity className="h-8 w-8 text-orange-500/10" />
            </CardContent>
            <div className="h-1 w-full bg-gradient-to-r from-orange-500 to-amber-500 opacity-30" />
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden border-none shadow-md bg-gradient-to-br from-purple-500/5 to-pink-500/5 dark:from-purple-500/10 dark:to-pink-500/10">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Minus className="h-6 w-6 text-purple-500" />
                </div>
                <div className="ml-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
                  <p className="text-2xl font-bold">{racks.reduce((sum, rack) => sum + rack.availableU, 0)}U</p>
                </div>
              </div>
              <Database className="h-8 w-8 text-purple-500/10" />
            </CardContent>
            <div className="h-1 w-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-30" />
          </Card>
        </motion.div>
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
                    placeholder="Search racks by name, location, or notes..."
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
                    setLocationFilter("all");
                    setUtilizationFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                {selectedRacks.length > 0 && canDelete && (
                  <Button variant="destructive" onClick={handleBulkDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete ({selectedRacks.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Filter Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="sm:w-48">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {availableLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:w-48">
                <Select value={utilizationFilter} onValueChange={setUtilizationFilter}>
                  <SelectTrigger>
                    <Activity className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter by utilization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Utilization</SelectItem>
                    <SelectItem value="high">High (≥90%)</SelectItem>
                    <SelectItem value="medium">Medium (70-89%)</SelectItem>
                    <SelectItem value="low">Low (70%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || locationFilter !== "all" || utilizationFilter !== "all") && (
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
                {locationFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Location: {locationFilter}
                    <button
                      onClick={() => setLocationFilter("all")}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      ×
                    </button>
                  </Badge>
                )}
                {utilizationFilter !== "all" && (
                  <Badge variant="secondary" className="gap-1">
                    Utilization: {utilizationFilter === "high" ? "High (≥90%)" :
                      utilizationFilter === "medium" ? "Medium (70-89%)" :
                        "Low (<70%)"}
                    <button
                      onClick={() => setUtilizationFilter("all")}
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
              <Server className="h-5 w-5" />
              Racks List
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {processedRacks.length} of {racks.length} racks
            </div>
          </CardTitle>
          <CardDescription>
            All server racks in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block">
            {racks.length === 0 ? (
              <div className="text-center py-8">
                <Server className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No racks</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by adding your first server rack.
                </p>
              </div>
            ) : processedRacks.length === 0 ? (
              <div className="text-center py-8">
                <Search className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">No racks found</h3>
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
                        checked={selectedRacks.length === processedRacks.length && processedRacks.length > 0}
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
                      <Button variant="ghost" onClick={() => handleSort("capacityU")} className="h-auto p-0 font-semibold">
                        Capacity
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Available</TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("utilizationPercent")} className="h-auto p-0 font-semibold">
                        Utilization
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button variant="ghost" onClick={() => handleSort("createdAt")} className="h-auto p-0 font-semibold">
                        Created
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                      </Button>
                    </TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode="popLayout">
                    {paginatedRacks.map((rack) => (
                      <motion.tr
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        key={rack.id}
                        className="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
                        onClick={() => router.push(`/infrastructure/racks/${rack.id}`)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedRacks.includes(rack.id)}
                            onCheckedChange={(checked) => handleSelectRack(rack.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-48 font-bold text-slate-700 dark:text-slate-200" title={rack.name}>
                              {rack.name}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(rack.name, "Rack name");
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold border-blue-500/20 text-blue-600 bg-blue-50/50 dark:bg-blue-500/5">
                            {rack.capacityU}U
                          </Badge>
                        </TableCell>
                        <TableCell className="text-orange-600 font-bold">
                          {rack.usedU}U
                        </TableCell>
                        <TableCell className="text-emerald-600 font-bold">
                          {rack.availableU}U
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-16 bg-muted rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(rack.utilizationPercent, 100)}%` }}
                                className={`h-full transition-all duration-500 ${rack.utilizationPercent < 30 ? 'bg-emerald-500' :
                                  rack.utilizationPercent < 70 ? 'bg-amber-500' :
                                    rack.utilizationPercent < 90 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                              />
                            </div>
                            <span className={`text-xs font-bold min-w-[2.5rem] ${getUtilizationColor(rack.utilizationPercent)}`}>
                              {rack.utilizationPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(rack.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/infrastructure/racks/${rack.id}`)}
                              className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canCreate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDuplicate(rack)}
                                className="h-8 w-8 p-0 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                                title="Duplicate Rack"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                            {canUpdate && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(rack)}
                                className="h-8 w-8 p-0 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRackToDelete(rack);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            )}
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-4">
            {paginatedRacks.map((rack) => (
              <Card key={rack.id} className="overflow-hidden border-l-4 border-l-primary/20 hover:border-l-primary/40 transition-all duration-200 hover:shadow-md">
                <CardContent className="p-4">
                  {/* Header Row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Checkbox
                        checked={selectedRacks.includes(rack.id)}
                        onCheckedChange={(checked) => handleSelectRack(rack.id, checked as boolean)}
                        className="flex-shrink-0"
                      />
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Server className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm truncate">{rack.name}</h3>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${rack.utilizationPercent < 30 ? 'bg-green-500' : rack.utilizationPercent < 70 ? 'bg-amber-500' : rack.utilizationPercent < 90 ? 'bg-orange-500' : 'bg-red-500'} flex-shrink-0`} />
                          <span className="text-xs font-medium text-muted-foreground">
                            {rack.utilizationPercent}% utilized
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/infrastructure/racks/${rack.id}`)}
                        className="flex-shrink-0 h-7 w-7 p-0"
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      {canCreate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDuplicate(rack)}
                          className="flex-shrink-0 h-7 w-7 p-0 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                          title="Duplicate Rack"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      )}
                      {canUpdate && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(rack)}
                          className="flex-shrink-0 h-7 w-7 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRackToDelete(rack);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="flex-shrink-0 h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Capacity Info */}
                  <div className="mb-3">
                    <div className="flex items-center gap-4">
                      <div className="text-xs">
                        <span className="font-medium text-muted-foreground">Capacity:</span>
                        <span className="ml-1 font-semibold">{rack.capacityU}U</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-orange-600">Used:</span>
                        <span className="ml-1 font-semibold">{rack.usedU}U</span>
                      </div>
                      <div className="text-xs">
                        <span className="font-medium text-green-600">Available:</span>
                        <span className="ml-1 font-semibold">{rack.availableU}U</span>
                      </div>
                    </div>
                  </div>

                  {/* Location - Green text */}
                  {rack.location && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">Location:</span>
                        <span className="text-xs font-medium text-green-600 truncate">
                          {rack.location}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(rack.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
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
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
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
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Edit Rack Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto sm:w-[90vw] md:w-[80vw] lg:w-[70vw] xl:w-[60vw]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Edit Rack</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Update rack information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Row 1: Rack Name (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-name" className="text-sm">Rack Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Row 2: Capacity (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-capacityU" className="text-sm">Capacity (U) *</Label>
              <Input
                id="edit-capacityU"
                type="number"
                min="1"
                max="100"
                value={formData.capacityU}
                onChange={(e) => setFormData({ ...formData, capacityU: parseInt(e.target.value) })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Be careful when reducing capacity as it may affect existing installations
              </p>
            </div>

            {/* Row 3: Location (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-location" className="text-sm">Location (Optional)</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g., Data Center Room 1, Floor 2"
              />
            </div>

            {/* Row 4: Notes (Full Width) */}
            <div className="space-y-2">
              <Label htmlFor="edit-notes" className="text-sm">Additional Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about this rack"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingRack(null);
                  setFormData({ name: "", capacityU: 42, location: "", notes: "" });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto">Update Rack</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Server Rack</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{rackToDelete?.name}"? This action cannot be undone.
              {rackToDelete && rackToDelete.devices.length > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Note: This rack contains {rackToDelete.devices.length} device(s). 
                  They will be automatically unassigned (set to "No Rack").
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => rackToDelete && handleDelete(rackToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
