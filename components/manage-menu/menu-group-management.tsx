"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { useSortableTable } from "@/hooks/use-sort-table";
import { Plus, Edit, Trash2, FolderOpen, Menu, Search, ArrowUpDown, ArrowUp, ArrowDown, Dot, Copy } from "lucide-react";
import IconSelector from "@/components/icon/IconSelector";
import { getIconWithFallback } from "@/lib/icon-library";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface MenuGroup {
  id: string;
  name: string;
  label: string;
  icon?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
  items?: any[];
}

export function MenuGroupManagement() {
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<MenuGroup | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    label: string;
    icon: string;
    order: number;
    isActive: boolean;
    isDeveloper: boolean;
  }>({
    name: "",
    label: "",
    icon: "",
    order: 0,
    isActive: true,
    isDeveloper: false,
  });

  // Calculate next available order
  const getNextAvailableOrder = () => {
    if (menuGroups.length === 0) return 1;
    const maxOrder = Math.max(...menuGroups.map(group => group.order));
    return maxOrder + 1;
  };

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<MenuGroup | null>(null);

  // Search functionality
  const { searchQuery, setSearchQuery, filteredData: filteredMenuGroups } = useSearchFilter(menuGroups, ['name', 'label', 'icon']);

  // Sorting functionality
  const { sorted: sortedMenuGroups, sortField, sortDirection, handleSort } = useSortableTable(filteredMenuGroups.map(g => ({
    ...g,
    _count: { items: g.items?.length || 0 }
  })));

  // Pagination logic
  const { paginatedData: paginatedMenuGroups, totalPages, hasNextPage, hasPrevPage } = usePagination(sortedMenuGroups, pageSize, currentPage);

  // Ensure table switches are controlled
  const processedMenuGroups = paginatedMenuGroups.map(group => ({
    ...group,
    isActive: !!group.isActive, // Ensure boolean for switch
  }));

  useEffect(() => {
    fetchMenuGroups();
  }, []);

  const fetchMenuGroups = async () => {
    try {
      const response = await fetch("/api/menu-groups", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuGroups(result.data);
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to fetch menu groups");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error("Validation Error", "Menu group name is required");
      return;
    }

    if (!formData.label.trim()) {
      showToast.error("Validation Error", "Menu group label is required");
      return;
    }

    // Check for duplicate order
    const existingGroupWithOrder = menuGroups.find(group =>
      group.order === formData.order && (!editingGroup || group.id !== editingGroup.id)
    );

    if (existingGroupWithOrder) {
      showToast.error("Validation Error", `Order ${formData.order} is already used by "${existingGroupWithOrder.label}". Please choose a different order.`);
      return;
    }

    try {
      const isEditing = !!editingGroup;
      const url = isEditing ? `/api/menu-groups/${editingGroup.id}` : "/api/menu-groups";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success(`Menu group ${isEditing ? "updated" : "created"} successfully`);

        setDialogOpen(false);
        setEditingGroup(null);
        setFormData({ name: "", label: "", icon: "", order: 0, isActive: true, isDeveloper: false });
        fetchMenuGroups();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", `Failed to ${editingGroup ? "update" : "create"} menu group`);
    }
  };

  const handleEdit = (group: MenuGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      label: group.label,
      icon: group.icon || "",
      order: group.order,
      isActive: group.isActive,
      isDeveloper: !!group.isDeveloper,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (group: MenuGroup) => {
    setEditingGroup(null);
    setFormData({
      name: `${group.name}-copy`,
      label: `${group.label} Copy`,
      icon: group.icon || "",
      order: getNextAvailableOrder(),
      isActive: group.isActive,
      isDeveloper: !!group.isDeveloper,
    });
    setDialogOpen(true);
  };

  const handleDelete = (group: MenuGroup) => {
    if ((group.items?.length ?? 0) > 0) {
      showToast.error("Cannot Delete", "Cannot delete menu group with menu items");
      return;
    }

    setGroupToDelete(group);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!groupToDelete) return;

    try {
      const response = await fetch(`/api/menu-groups/${groupToDelete.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        showToast.success("Menu group deleted successfully");
        fetchMenuGroups();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to delete menu group");
    } finally {
      setDeleteDialogOpen(false);
      setGroupToDelete(null);
    }
  };

  const handleToggleActive = async (group: MenuGroup) => {
    try {
      const response = await fetch(`/api/menu-groups/${group.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: group.order,
          isActive: !group.isActive,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success(`Menu group ${result.data.isActive ? "activated" : "deactivated"}`);
        fetchMenuGroups();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to update menu group status");
    }
  };

  const handleToggleActiveDirect = async (groupId: string, checked: boolean) => {
    try {
      const group = menuGroups.find(g => g.id === groupId);
      if (!group) return;

      const response = await fetch(`/api/menu-groups/${groupId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: group.order,
          isActive: checked,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success(`Menu group ${checked ? "activated" : "deactivated"}`);
        fetchMenuGroups();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to update menu group status");
    }
  };

  const handleMoveUp = async (group: MenuGroup) => {
    const sortedGroups = [...menuGroups].sort((a, b) => a.order - b.order);
    const currentIndex = sortedGroups.findIndex(g => g.id === group.id);

    if (currentIndex <= 0) return; // Already at the top

    const prevGroup = sortedGroups[currentIndex - 1];

    // Swap orders
    try {
      // Update current group to previous order
      await fetch(`/api/menu-groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: prevGroup.order,
          isActive: group.isActive,
          isDeveloper: group.isDeveloper,
        }),
      });

      // Update previous group to current order
      await fetch(`/api/menu-groups/${prevGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: prevGroup.name,
          label: prevGroup.label,
          icon: prevGroup.icon,
          order: group.order,
          isActive: prevGroup.isActive,
          isDeveloper: prevGroup.isDeveloper,
        }),
      });

      showToast.success("Success", "Menu group moved up successfully");
      fetchMenuGroups();
    } catch (error) {
      showToast.error("Error", "Failed to move menu group");
    }
  };

  const handleMoveDown = async (group: MenuGroup) => {
    const sortedGroups = [...menuGroups].sort((a, b) => a.order - b.order);
    const currentIndex = sortedGroups.findIndex(g => g.id === group.id);

    if (currentIndex >= sortedGroups.length - 1) return; // Already at the bottom

    const nextGroup = sortedGroups[currentIndex + 1];

    // Swap orders
    try {
      // Update current group to next order
      await fetch(`/api/menu-groups/${group.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: group.name,
          label: group.label,
          icon: group.icon,
          order: nextGroup.order,
          isActive: group.isActive,
          isDeveloper: group.isDeveloper,
        }),
      });

      // Update next group to current order
      await fetch(`/api/menu-groups/${nextGroup.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          name: nextGroup.name,
          label: nextGroup.label,
          icon: nextGroup.icon,
          order: group.order,
          isActive: nextGroup.isActive,
          isDeveloper: nextGroup.isDeveloper,
        }),
      });

      showToast.success("Success", "Menu group moved down successfully");
      fetchMenuGroups();
    } catch (error) {
      showToast.error("Error", "Failed to move menu group");
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Menu Groups</h3>
          <p className="text-sm text-muted-foreground">
            Manage menu group categories and organization
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingGroup(null);
              setFormData({
                name: "",
                label: "",
                icon: "",
                order: getNextAvailableOrder(),
                isActive: true,
                isDeveloper: false
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingGroup ? "Edit Menu Group" : "Add New Menu Group"}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? "Update menu group information and access settings"
                  : "Create a new menu group for organizing menu items"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-6 py-4">
                {/* Row 1: Name and Order */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="unique-name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="label">Label</Label>
                    <Input
                      id="label"
                      value={formData.label}
                      onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      placeholder="Display Name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* Row 2: Icon */}
                <div className="space-y-2">
                  <Label>Icon</Label>
                  <IconSelector
                    value={formData.icon}
                    onChange={(iconName: string) => setFormData({ ...formData, icon: iconName })}
                    placeholder="Select group icon"
                  />
                </div>

                {/* Row 3: Toggles (Active and Developer) */}
                <div className="flex gap-6 pt-4 border-t">
                  {/* Active Toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <div className="grid grid-cols-1 gap-0">
                      <Label htmlFor="isActive" className="text-sm font-medium">Active</Label>
                      <span className="text-xs text-muted-foreground">
                        {formData.isActive ? "Visible in sidebar" : "Hidden from sidebar"}
                      </span>
                    </div>
                  </div>

                  {/* Developer Only Toggle */}
                  <div className="flex items-center gap-3">
                    <Switch
                      id="isDeveloper"
                      checked={!!formData.isDeveloper}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDeveloper: checked })}
                    />
                    <div className="grid grid-cols-1 gap-0">
                      <Label htmlFor="isDeveloper" className="text-sm font-medium">Developer Only</Label>
                      <span className="text-xs text-muted-foreground">
                        Only visible to developers
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingGroup ? "Update" : "Create"} Group
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Confirm Deletion</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete the menu group "{groupToDelete?.label}"?
                This action cannot be undone and will permanently remove this menu group.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete Menu Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Input */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search menu groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-muted-foreground">
            {filteredMenuGroups.length} of {menuGroups.length} menu groups
          </p>
        )}
      </div>

      <div className="rounded-md border">
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
                  {sortField === "name" ? (
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
                  onClick={() => handleSort("label")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Label
                  {sortField === "label" ? (
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
              <TableHead>Icon</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("_count.items")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Items
                  {sortField === "_count.items" ? (
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
                  onClick={() => handleSort("order")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Order
                  {sortField === "order" ? (
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
              <TableHead>Actions</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("isActive")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Status
                  {sortField === "isActive" ? (
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {processedMenuGroups.map((group) => (
              <TableRow key={group.id}>
                <TableCell className="font-medium">{group.name}</TableCell>
                <TableCell>{group.label}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {group.icon && getIconWithFallback(group.icon)}
                    <span className="text-sm text-muted-foreground">{group.icon || "-"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Menu className="h4 w-4" />
                    {group.items?.length || 0}
                  </div>
                </TableCell>
                <TableCell className="flex items-center gap-1">
                  <Dot />
                  {group.order}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(group)}
                      disabled={processedMenuGroups.indexOf(group) === 0}
                      title="Move up"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(group)}
                      disabled={processedMenuGroups.indexOf(group) === processedMenuGroups.length - 1}
                      title="Move down"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(group)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(group)}
                      className="text-red-600 hover:text-red-700"
                      disabled={(group.items?.length || 0) > 0}
                      title={(group.items?.length || 0) > 0 ? "Remove all items first" : "Delete"}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={group.isActive}
                      onCheckedChange={(checked) => handleToggleActiveDirect(group.id, checked)}
                    />
                    <Badge variant={group.isActive ? "default" : "secondary"}>
                      {group.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasPrevPage) setCurrentPage(currentPage - 1);
                }}
                className={!hasPrevPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={currentPage === page}
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (hasNextPage) setCurrentPage(currentPage + 1);
                }}
                className={!hasNextPage ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
