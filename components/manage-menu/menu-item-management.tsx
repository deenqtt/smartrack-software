"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/lib/toast-utils";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { useSortableTable } from "@/hooks/use-sort-table";
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Filter, ArrowUpDown, ArrowUp, ArrowDown, Copy } from "lucide-react";
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

interface MenuItem {
  id: string;
  name: string;
  label: string;
  path: string;
  icon?: string;
  component?: string;
  order: number;
  isActive: boolean;
  isDeveloper: boolean;
  menuGroupId: string;
  menuGroup: {
    id: string;
    name: string;
    label: string;
    order: number;
  };
}

interface MenuGroupOption {
  id: string;
  label: string;
}

export function MenuItemManagement() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState({
    menuGroupId: "",
    name: "",
    label: "",
    path: "",
    icon: "",
    component: "",
    order: 0,
    isActive: true,
    isDeveloper: false,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Group filter
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Permissions dialog
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsItem, setPermissionsItem] = useState<MenuItem | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [allPermissions, setAllPermissions] = useState<any[]>([]);

  // Filter by group first
  const filteredByGroup = useMemo(() => {
    if (selectedGroupId === "all") return menuItems;
    return menuItems.filter(item => item.menuGroupId === selectedGroupId);
  }, [menuItems, selectedGroupId]);

  // Search functionality - search on name, label, path, and group label
  const { searchQuery, setSearchQuery, filteredData: filteredMenuItems } = useSearchFilter(filteredByGroup, ['name', 'label', 'path', 'menuGroup.label']);

  // Custom sorting functionality that respects menu group hierarchy
  const { sorted: sortedMenuItems, sortField, sortDirection, handleSort } = useSortableTable(filteredMenuItems, (a, b) => {
    // First sort by menu group order
    const groupOrderA = a.menuGroup?.order || 0;
    const groupOrderB = b.menuGroup?.order || 0;

    if (groupOrderA !== groupOrderB) {
      return groupOrderA - groupOrderB;
    }

    // Then sort by menu item order within the same group
    return a.order - b.order;
  });

  // Pagination logic
  const { paginatedData: paginatedMenuItems, totalPages, hasNextPage, hasPrevPage } = usePagination(sortedMenuItems, pageSize, currentPage);

  // Calculate next available order for a specific menu group
  const getNextAvailableOrder = (menuGroupId: string) => {
    const itemsInGroup = menuItems.filter(item => item.menuGroupId === menuGroupId);
    if (itemsInGroup.length === 0) return 1;
    const maxOrder = Math.max(...itemsInGroup.map(item => item.order));
    return maxOrder + 1;
  };

  useEffect(() => {
    fetchMenuItems();
    fetchMenuGroups();
    fetchAllPermissions();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuItems(result.data);
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to fetch menu items");
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuGroups = async () => {
    try {
      const response = await fetch("/api/menu-groups", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuGroups(result.data.map((group: any) => ({
          id: group.id,
          label: group.label,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch menu groups:", error);
    }
  };

  const fetchAllPermissions = async () => {
    try {
      const response = await fetch("/api/role-menu-permissions", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setAllPermissions(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch all permissions:", error);
    }
  };

  const getPermissionBadges = (menuItemId: string) => {
    const itemPermissions = allPermissions.filter(p => p.menuItemId === menuItemId && p.canView);
    const rolesWithView = itemPermissions.map(p => p.role?.name || 'Unknown').slice(0, 2);
    const hasMore = itemPermissions.length > 2;

    return (
      <div className="flex flex-col gap-1">
        <div className="flex gap-1">
          {rolesWithView.map(role => (
            <Badge key={role} variant="outline" className="text-xs">
              {role} V
            </Badge>
          ))}
          {hasMore && <Badge variant="outline" className="text-xs">+{itemPermissions.length - 2}</Badge>}
        </div>
        <div className="text-xs text-muted-foreground">
          {itemPermissions.length} role{itemPermissions.length !== 1 ? 's' : ''} with permissions
        </div>
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error("Validation Error", "Menu item name is required");
      return;
    }

    if (!formData.menuGroupId) {
      showToast.error("Validation Error", "Menu group is required");
      return;
    }

    // Check for duplicate order within the same menu group
    const existingItemWithOrder = menuItems.find(item =>
      item.order === formData.order &&
      item.menuGroupId === formData.menuGroupId &&
      (!editingItem || item.id !== editingItem.id)
    );

    if (existingItemWithOrder) {
      showToast.error("Validation Error", `Order ${formData.order} is already used by "${existingItemWithOrder.label}" in this menu group. Please choose a different order.`);
      return;
    }

    try {
      const isEditing = !!editingItem;
      const url = isEditing ? `/api/menu-items/${editingItem.id}` : "/api/menu-items";
      const method = isEditing ? "PUT" : "POST";

      // For updates, only send changed fields to avoid Prisma errors
      const payload = isEditing ? {
        menuGroupId: formData.menuGroupId,
        name: formData.name,
        label: formData.label,
        path: formData.path,
        icon: formData.icon || null,
        component: formData.component || null,
        order: formData.order,
        isActive: formData.isActive,
        isDeveloper: formData.isDeveloper,
      } : formData;

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success(`Menu item ${isEditing ? "updated" : "created"} successfully`);

        setDialogOpen(false);
        setEditingItem(null);
        setFormData({
          menuGroupId: "",
          name: "",
          label: "",
          path: "",
          icon: "",
          component: "",
          order: 0,
          isActive: true,
          isDeveloper: false,
        });
        fetchMenuItems();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", `Failed to ${editingItem ? "update" : "create"} menu item`);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      menuGroupId: item.menuGroupId,
      name: item.name,
      label: item.label,
      path: item.path,
      icon: item.icon || "",
      component: item.component || "",
      order: item.order,
      isActive: item.isActive,
      isDeveloper: item.isDeveloper,
    });
    setDialogOpen(true);
  };

  const handleDuplicate = (item: MenuItem) => {
    setEditingItem(null);
    setFormData({
      menuGroupId: item.menuGroupId,
      name: `${item.name}-copy`,
      label: `${item.label} Copy`,
      path: item.path,
      icon: item.icon || "",
      component: item.component || "",
      order: getNextAvailableOrder(item.menuGroupId),
      isActive: item.isActive,
      isDeveloper: item.isDeveloper,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (item: MenuItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      const response = await fetch(`/api/menu-items/${itemToDelete.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        showToast.success("Menu item deleted successfully");
        fetchMenuItems();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to delete menu item");
    } finally {
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleToggleActive = async (item: MenuItem) => {
    try {
      const newActiveState = !item.isActive;

      const response = await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          isActive: newActiveState,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success(`Menu item ${newActiveState ? "activated" : "deactivated"}`);
        fetchMenuItems();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to update menu item status");
    }
  };

  const handleToggleActiveDirect = async (itemId: string, checked: boolean) => {
    try {
      const response = await fetch(`/api/menu-items/${itemId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          isActive: checked,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state optimistically
        setMenuItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, isActive: checked } : item
          )
        );

        showToast.success("Success", `Menu item ${checked ? "activated" : "deactivated"}`);
      } else {
        showToast.error("Error", result.error);
        // Refresh data if there's an error
        fetchMenuItems();
      }
    } catch (error) {
      showToast.error("Error", "Failed to update menu item status");
      // Refresh data if there's an error
      fetchMenuItems();
    }
  };

  const handleMoveUp = async (item: MenuItem) => {
    const itemsInGroup = menuItems
      .filter(i => i.menuGroupId === item.menuGroupId)
      .sort((a, b) => a.order - b.order);
    const currentIndex = itemsInGroup.findIndex(i => i.id === item.id);

    if (currentIndex <= 0) return; // Already at the top

    const prevItem = itemsInGroup[currentIndex - 1];

    // Swap orders
    try {
      // Update current item to previous order
      await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          menuGroupId: item.menuGroupId,
          name: item.name,
          label: item.label,
          path: item.path,
          icon: item.icon,
          component: item.component,
          order: prevItem.order,
          isActive: item.isActive,
          isDeveloper: item.isDeveloper,
        }),
      });

      // Update previous item to current order
      await fetch(`/api/menu-items/${prevItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          menuGroupId: prevItem.menuGroupId,
          name: prevItem.name,
          label: prevItem.label,
          path: prevItem.path,
          icon: prevItem.icon,
          component: prevItem.component,
          order: item.order,
          isActive: prevItem.isActive,
          isDeveloper: prevItem.isDeveloper,
        }),
      });

      showToast.success("Success", "Menu item moved up successfully");
      fetchMenuItems();
    } catch (error) {
      showToast.error("Error", "Failed to move menu item");
    }
  };

  const handleMoveDown = async (item: MenuItem) => {
    const itemsInGroup = menuItems
      .filter(i => i.menuGroupId === item.menuGroupId)
      .sort((a, b) => a.order - b.order);
    const currentIndex = itemsInGroup.findIndex(i => i.id === item.id);

    if (currentIndex >= itemsInGroup.length - 1) return; // Already at the bottom

    const nextItem = itemsInGroup[currentIndex + 1];

    // Swap orders
    try {
      // Update current item to next order
      await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          menuGroupId: item.menuGroupId,
          name: item.name,
          label: item.label,
          path: item.path,
          icon: item.icon,
          component: item.component,
          order: nextItem.order,
          isActive: item.isActive,
          isDeveloper: item.isDeveloper,
        }),
      });

      // Update next item to current order
      await fetch(`/api/menu-items/${nextItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          menuGroupId: nextItem.menuGroupId,
          name: nextItem.name,
          label: nextItem.label,
          path: nextItem.path,
          icon: nextItem.icon,
          component: nextItem.component,
          order: item.order,
          isActive: nextItem.isActive,
          isDeveloper: nextItem.isDeveloper,
        }),
      });

      showToast.success("Success", "Menu item moved down successfully");
      fetchMenuItems();
    } catch (error) {
      showToast.error("Error", "Failed to move menu item");
    }
  };

  const handleOpenPermissions = async (item: MenuItem) => {
    setPermissionsItem(item);
    setPermissionsDialogOpen(true);

    try {
      // Fetch roles
      const rolesResponse = await fetch("/api/roles", {
        credentials: 'include'
      });
      const rolesResult = await rolesResponse.json();

      if (rolesResult.success) {
        setRoles(rolesResult.data);
      }

      // Fetch current permissions for this menu item
      const permissionsResponse = await fetch(`/api/role-menu-permissions?menuItemId=${item.id}`, {
        credentials: 'include'
      });
      const permissionsResult = await permissionsResponse.json();

      if (permissionsResult.success) {
        setPermissions(permissionsResult.data);
      }
    } catch (error) {
      console.error("Failed to fetch permissions data:", error);
      showToast.error("Error", "Failed to load permissions data");
    }
  };

  const handleSavePermissions = async () => {
    if (!permissionsItem) return;

    try {
      const permissionsData = roles.map(role => {
        const existingPermission = permissions.find(p => p.roleId === role.id && p.menuItemId === permissionsItem.id);
        return {
          menuItemId: permissionsItem.id,
          canView: existingPermission?.canView ?? true,
          canCreate: existingPermission?.canCreate ?? false,
          canUpdate: existingPermission?.canUpdate ?? false,
          canDelete: existingPermission?.canDelete ?? false,
        };
      });

      const response = await fetch("/api/role-menu-permissions/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          roleId: "batch", // This will be ignored in batch processing
          permissions: permissionsData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showToast.success("Success", "Permissions updated successfully");
        setPermissionsDialogOpen(false);
        setPermissionsItem(null);
        setPermissions([]);
      } else {
        showToast.error("Error", result.error || "Failed to update permissions");
      }
    } catch (error) {
      showToast.error("Error", "Failed to save permissions");
    }
  };

  const handlePermissionChange = (roleId: string, permissionType: string, checked: boolean) => {
    setPermissions(prev => {
      const existingIndex = prev.findIndex(p => p.roleId === roleId && p.menuItemId === permissionsItem?.id);
      if (existingIndex >= 0) {
        // Update existing permission
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], [permissionType]: checked };
        return updated;
      } else {
        // Create new permission
        return [...prev, {
          roleId,
          menuItemId: permissionsItem?.id,
          canView: permissionType === 'canView' ? checked : true,
          canCreate: permissionType === 'canCreate' ? checked : false,
          canUpdate: permissionType === 'canUpdate' ? checked : false,
          canDelete: permissionType === 'canDelete' ? checked : false,
          [permissionType]: checked,
        }];
      }
    });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Menu Items</h3>
          <p className="text-sm text-muted-foreground">
            Create and manage individual menu items for navigation
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingItem(null);
              setFormData({
                menuGroupId: "",
                name: "",
                label: "",
                path: "",
                icon: "",
                component: "",
                order: 0,
                isActive: true,
                isDeveloper: false,
              });
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Menu Item
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Menu Item" : "Add New Menu Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem
                  ? "Update menu item information"
                  : "Create a new menu item for the navigation"
                }
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Menu Item Name</Label>
                  <Input
                    value={formData.label}
                    onChange={(e) => setFormData({
                      ...formData,
                      name: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                      label: e.target.value
                    })}
                    placeholder="e.g., Dashboard Overview"
                    required
                  />
                  {formData.name && (
                    <p className="text-xs text-muted-foreground">
                      Path name: <code>{formData.name}</code>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Menu Group</Label>
                    <Select value={formData.menuGroupId} onValueChange={(value) => {
                      const nextOrder = editingItem ? formData.order : getNextAvailableOrder(value);
                      setFormData({ ...formData, menuGroupId: value, order: nextOrder });
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        {menuGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Order</Label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Path/URL</Label>
                    <Input
                      value={formData.path}
                      onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                      placeholder="/dashboard"
                    />
                  </div>
                  <div className="space-y-2">
                    <IconSelector
                      value={formData.icon}
                      onChange={(iconName: string) => setFormData({ ...formData, icon: iconName })}
                      placeholder="Select icon"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isActive"
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                    />
                    <Label htmlFor="isActive">Active</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isDeveloper"
                      checked={formData.isDeveloper}
                      onCheckedChange={(checked) => setFormData({ ...formData, isDeveloper: checked })}
                    />
                    <Label htmlFor="isDeveloper">Developer Only</Label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">
                  {editingItem ? "Update" : "Create"} Menu Item
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
                Are you sure you want to delete the menu item "{itemToDelete?.label}"?
                This action cannot be undone and will permanently remove this menu item.
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
                Delete Menu Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Permissions Dialog */}
        <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Manage Permissions</DialogTitle>
              <DialogDescription>
                Configure permissions for "{permissionsItem?.label}" menu item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-center">Read</TableHead>
                      <TableHead className="text-center">Create</TableHead>
                      <TableHead className="text-center">Update</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role) => {
                      const rolePermissions = permissions.find(p => p.roleId === role.id && p.menuItemId === permissionsItem?.id);
                      return (
                        <TableRow key={role.id}>
                          <TableCell className="font-medium">{role.name}</TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rolePermissions?.canView ?? true}
                              onCheckedChange={(checked) => handlePermissionChange(role.id, 'canView', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rolePermissions?.canCreate ?? false}
                              onCheckedChange={(checked) => handlePermissionChange(role.id, 'canCreate', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rolePermissions?.canUpdate ?? false}
                              onCheckedChange={(checked) => handlePermissionChange(role.id, 'canUpdate', checked)}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <Switch
                              checked={rolePermissions?.canDelete ?? false}
                              onCheckedChange={(checked) => handlePermissionChange(role.id, 'canDelete', checked)}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSavePermissions}>
                Save Permissions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center space-x-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Select value={selectedGroupId} onValueChange={(value) => {
              setSelectedGroupId(value);
              setCurrentPage(1); // Reset to first page when filter changes
            }}>
              <SelectTrigger className="w-48 pl-8">
                <SelectValue placeholder="All groups" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                {menuGroups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {(searchQuery || selectedGroupId !== "all") && (
          <p className="text-sm text-muted-foreground">
            {filteredMenuItems.length} of {menuItems.length} menu items
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
              <TableHead>Path</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("menuGroup.label")}
                  className="h-auto p-0 font-semibold hover:bg-transparent"
                >
                  Group
                  {sortField === "menuGroup.label" ? (
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
              <TableHead>Permissions</TableHead>
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
            {paginatedMenuItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getIconWithFallback(item.icon || 'Menu')}
                    <span>{item.label}</span>
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{item.path || "-"}</TableCell>
                <TableCell>{item.menuGroup.label}</TableCell>
                <TableCell className="flex justify-between gap-1">{item.order}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveUp(item)}
                    disabled={(() => {
                      const itemsInGroup = menuItems
                        .filter(i => i.menuGroupId === item.menuGroupId)
                        .sort((a, b) => a.order - b.order);
                      return itemsInGroup.indexOf(item) === 0;
                    })()}
                    title="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMoveDown(item)}
                    disabled={(() => {
                      const itemsInGroup = menuItems
                        .filter(i => i.menuGroupId === item.menuGroupId)
                        .sort((a, b) => a.order - b.order);
                      return itemsInGroup.indexOf(item) === itemsInGroup.length - 1;
                    })()}
                    title="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenPermissions(item)}
                    className="h-auto p-1 text-left"
                    title="Manage permissions"
                  >
                    {getPermissionBadges(item.id)}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDuplicate(item)}
                      title="Duplicate"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(item)}
                      title={item.isActive ? "Deactivate" : "Activate"}
                    >
                      {item.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:text-red-700"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.isActive}
                      onCheckedChange={(checked) => handleToggleActiveDirect(item.id, checked)}
                    />
                    <Badge variant={item.isActive ? "default" : "secondary"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                    {item.isDeveloper && (
                      <Badge variant="outline">Dev</Badge>
                    )}
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
