"use client";

import { useState, useEffect, useMemo } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Edit,
  Edit2,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  GitBranch,
  Play,
  Square,
  Download,
  Upload,
} from "lucide-react";
import { showToast, confirmDialog } from "@/lib/toast-utils";
import { ImportExportButtons } from "@/components/shared/ImportExportButtons";

interface RuleChain {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function ManageRuleChainsPage() {
  const router = useRouter();
  const [ruleChains, setRuleChains] = useState<RuleChain[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<RuleChain | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  // Search, Sort, Pagination States
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "updatedAt">("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchRuleChains = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/rule-chains`);
      if (!response.ok) throw new Error("Failed to fetch rule chains");
      setRuleChains(await response.json());
      setCurrentPage(1);
    } catch (error: any) {
      showToast.error(error.message || "Failed to fetch rule chains");
    } finally {
      setIsLoading(false);
    }
  };

  // Compute filtered, sorted, and paginated data
  const processedData = useMemo(() => {
    let result = [...ruleChains];

    // Filter by search query
    if (searchQuery) {
      result = result.filter(
        (rc) =>
          rc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rc.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort data
    result.sort((a, b) => {
      const aValue = sortField === "name" ? a.name : a.updatedAt;
      const bValue = sortField === "name" ? b.name : b.updatedAt;

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortOrder === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });

    // Calculate pagination
    const totalPages = Math.ceil(result.length / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginatedData = result.slice(startIdx, startIdx + itemsPerPage);

    return {
      filteredData: result,
      paginatedData,
      totalCount: result.length,
      totalPages,
    };
  }, [ruleChains, searchQuery, sortField, sortOrder, currentPage]);

  useEffect(() => {
    fetchRuleChains();
  }, []);

  const handleAddClick = () => {
    setEditingChain(null);
    setForm({ name: "", description: "" });
    setIsModalOpen(true);
  };

  const handleEditClick = (chain: RuleChain) => {
    setEditingChain(chain);
    setForm({ name: chain.name, description: chain.description || "" });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const url = editingChain
      ? `${API_BASE_URL}/api/rule-chains/${editingChain.id}`
      : `${API_BASE_URL}/api/rule-chains`;
    const method = editingChain ? "PUT" : "POST";

    try {
      const payload = editingChain
        ? form
        : {
          ...form,
          nodes: [], // Initialize empty nodes for new rule chains
          edges: [], // Initialize empty edges for new rule chains
        };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save rule chain");
      }

      const savedChain = await response.json();

      if (!editingChain) {
        // For new rule chains, stay on manage page
        showToast.success(`"${form.name}" has been created successfully`);
        setIsModalOpen(false);
        fetchRuleChains();
      } else {
        // For updates, just show success and refresh
        showToast.success("Rule chain has been updated successfully");
        setIsModalOpen(false);
        fetchRuleChains();
      }
    } catch (error: any) {
      showToast.error(error.message || "Failed to save rule chain");
    }
  };

  const handleDelete = async (chainId: string) => {
    const confirmed = await confirmDialog(
      "Are you sure?",
      "This action cannot be undone.",
      "Yes, delete it!",
      "Cancel"
    );
    if (confirmed) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/rule-chains/${chainId}`,
          {
            method: "DELETE",
          }
        );
        if (!response.ok) throw new Error("Failed to delete rule chain");
        showToast.success("The rule chain has been deleted successfully");
        fetchRuleChains();
      } catch (error: any) {
        showToast.error(error.message || "Failed to delete the rule chain");
      }
    }
  };

  const toggleRuleChainStatus = async (
    chainId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rule-chains/${chainId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isActive: !currentStatus,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update rule chain status");
      }

      showToast.success(
        `Rule chain ${!currentStatus ? "started" : "stopped"} successfully`
      );
      fetchRuleChains();
    } catch (error: any) {
      showToast.error(error.message || "Failed to update rule chain status");
    }
  };

  const handleForceRun = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/rule-chains/auto-runner`,
        {
          method: "POST",
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to force run rule chains");
      }

      const result = await response.json();
      showToast.success(result.message || "Systems refreshed successfully");
    } catch (error: any) {
      showToast.error(error.message || "Failed to force run rule chains");
    }
  };

  const openRuleChainEditor = (chainId: string) => {
    router.push(`/control/rule-chain?load=${chainId}`);
  };

  return (
    <>
      <main className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manage Rule Chains
            </h1>
            <p className="text-sm text-muted-foreground mt-2">
              Create, edit, and organize your automation rule chains
            </p>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <ImportExportButtons
              exportUrl="/api/rule-chains/export"
              importUrl="/api/rule-chains/import"
              onImportSuccess={fetchRuleChains}
              itemName="Rule Chains"
            />
            <Button
              onClick={handleForceRun}
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Play className="h-4 w-4 mr-2" />
              Refresh Systems
            </Button>
            <Button
              onClick={handleAddClick}
              className="w-full sm:w-auto"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Rule Chain
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Rule Chains
                  </p>
                  <p className="text-3xl font-bold text-foreground">
                    {ruleChains.length}
                  </p>
                </div>
                <GitBranch className="h-10 w-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Active Rule Chains
                  </p>
                  <p className="text-3xl font-bold text-green-600">
                    {ruleChains.filter((rc) => rc.isActive).length}
                  </p>
                </div>
                <Play className="h-10 w-10 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Card */}
        <Card>
          <CardHeader className="pb-6">
            <div className="flex flex-col gap-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search rule chains by name or description..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>

              {/* Sort Controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={sortField === "name" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSortField("name");
                      if (sortField === "name") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      }
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Name
                  </Button>
                  <Button
                    variant={sortField === "updatedAt" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSortField("updatedAt");
                      if (sortField === "updatedAt") {
                        setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                      }
                    }}
                    className="gap-1.5 text-xs"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Updated
                  </Button>
                </div>

                {/* Results Count */}
                <span className="text-sm text-muted-foreground">
                  {processedData.totalCount > 0
                    ? `Showing ${(currentPage - 1) * itemsPerPage + 1
                    } - ${Math.min(
                      currentPage * itemsPerPage,
                      processedData.totalCount
                    )} of ${processedData.totalCount}`
                    : "No results"}
                </span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 sm:p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="border rounded-lg p-4">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : processedData.totalCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <GitBranch className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchQuery ? "No rule chains found" : "No rule chains yet"}
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {searchQuery
                    ? "Try adjusting your search criteria"
                    : "Create your first rule chain to get started"}
                </p>
              </div>
            ) : (
              <>
                {/* TABLE VIEW */}
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rule Chain Name</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Description
                        </TableHead>
                        <TableHead className="hidden sm:table-cell">
                          Status
                        </TableHead>
                        <TableHead className="hidden sm:table-cell text-muted-foreground">
                          Last Updated
                        </TableHead>
                        <TableHead className="text-right w-32 sm:w-40">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {processedData.paginatedData.map((chain) => (
                        <TableRow key={chain.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium max-w-xs sm:max-w-md truncate">
                            {chain.name}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-xs truncate">
                            {chain.description || "-"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${chain.isActive
                                  ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                                }`}
                            >
                              {chain.isActive ? "Active" : "Inactive"}
                            </span>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                            {new Date(chain.updatedAt).toLocaleDateString(
                              "en-US",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  toggleRuleChainStatus(
                                    chain.id,
                                    chain.isActive
                                  )
                                }
                                title={
                                  chain.isActive
                                    ? "Stop rule chain"
                                    : "Start rule chain"
                                }
                                className={`h-8 w-8 ${chain.isActive
                                    ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                    : "text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                                  }`}
                              >
                                {chain.isActive ? (
                                  <Square className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRuleChainEditor(chain.id)}
                                title="Edit in visual editor"
                                className="h-8 w-8"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditClick(chain)}
                                title="Edit name & description"
                                className="h-8 w-8"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(chain.id)}
                                className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {processedData.totalPages > 1 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t">
                    <p className="text-xs sm:text-sm text-muted-foreground order-3 sm:order-1">
                      Page {currentPage} of {processedData.totalPages}
                    </p>

                    <div className="flex gap-2 order-1 sm:order-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) => Math.max(1, p - 1))
                        }
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        <span className="hidden sm:inline ml-1">Previous</span>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setCurrentPage((p) =>
                            Math.min(processedData.totalPages, p + 1)
                          )
                        }
                        disabled={currentPage === processedData.totalPages}
                      >
                        <span className="hidden sm:inline mr-1">Next</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 order-2 sm:order-3">
                      <Input
                        type="number"
                        min="1"
                        max={processedData.totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value) || 1;
                          setCurrentPage(
                            Math.min(
                              Math.max(1, page),
                              processedData.totalPages
                            )
                          );
                        }}
                        className="w-12 h-9"
                      />
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs text-muted-foreground min-w-fit">
                        {processedData.totalPages}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Modal untuk Add/Edit Rule Chain */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <form onSubmit={handleFormSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingChain ? "Edit Rule Chain" : "Create New Rule Chain"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Rule Chain Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g., Temperature Monitor"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <textarea
                  id="description"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Add a description for this rule chain..."
                  rows={3}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                {editingChain ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
