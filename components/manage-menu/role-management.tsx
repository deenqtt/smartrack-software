"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { showToast } from "@/lib/toast-utils";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { useSortableTable } from "@/hooks/use-sort-table";
import { Plus, Edit, Trash2, Users, Shield, Search, ArrowUpDown, ArrowUp, ArrowDown, Menu as MenuIcon, Eye, PlusCircle, Edit3, Trash, ChevronLeft, ChevronRight, Copy } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Role {
  id: string;
  name: string;
  description: string | null;
  isSystem?: boolean;
  _count?: {
    users: number;
    menuPermissions: number;
  };
}

interface MenuItem {
  id: string;
  name: string;
  label: string;
  menuGroup: {
    label: string;
  };
}

interface RolePermission {
  id: string;
  roleId: string;
  menuItemId: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

type PermissionField = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete';

export function RoleManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

  // Permission management state
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, RolePermission>>({});
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [selectedRoleForPermissions, setSelectedRoleForPermissions] = useState<Role | null>(null);



  // Search functionality
  const { searchQuery, setSearchQuery, filteredData: filteredRoles } = useSearchFilter(roles, ['name', 'description']);

  // Sorting functionality
  const { sorted: sortedRoles, sortField, sortDirection, handleSort } = useSortableTable(filteredRoles);

  // Pagination logic
  const { paginatedData: paginatedRoles, totalPages, hasNextPage, hasPrevPage } = usePagination(sortedRoles, pageSize, currentPage);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setRoles(result.data);
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to fetch roles");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      showToast.error("Validation Error", "Role name is required");
      return;
    }

    try {
      const isEditing = !!editingRole;
      const url = isEditing ? `/api/roles/${editingRole.id}` : "/api/roles";
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
        showToast.success(`Role ${isEditing ? "updated" : "created"} successfully`);

        setDialogOpen(false);
        setEditingRole(null);
        setFormData({ name: "", description: "" });
        fetchRoles();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", `Failed to ${editingRole ? "update" : "create"} role`);
    }
  };

  const handleEdit = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = (role: Role) => {
    // Note: Without user count, we allow deletion but warn about potential assigned users
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      const response = await fetch(`/api/roles/${roleToDelete.id}`, {
        method: "DELETE",
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        showToast.success("Role deleted successfully");
        fetchRoles();
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to delete role");
    } finally {
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleDuplicate = (role: Role) => {
    setEditingRole(null);
    setFormData({
      name: `${role.name} Copy`,
      description: role.description || "",
    });
    setDialogOpen(true);
  };



  const handleManagePermissions = async (role: Role) => {
    setSelectedRoleForPermissions(role);
    setPermissionDialogOpen(true);

    // Fetch menu items and permissions for this role
    try {
      const [menuResponse, permResponse] = await Promise.all([
        fetch("/api/menu-items", { credentials: 'include' }),
        fetch("/api/role-menu-permissions", { credentials: 'include' })
      ]);

      const menuResult = await menuResponse.json();
      const permResult = await permResponse.json();

      if (menuResult.success) {
        setMenuItems(menuResult.data);
      }

      if (permResult.success) {
        const permsMap: Record<string, RolePermission> = {};
        permResult.data
          .filter((perm: RolePermission) => perm.roleId === role.id)
          .forEach((perm: RolePermission) => {
            permsMap[`${perm.roleId}-${perm.menuItemId}`] = perm;
          });
        setPermissions(permsMap);
      }
    } catch (error) {
      showToast.error("Error", "Failed to load permissions data");
    }
  };

  const handlePermissionChange = async (
    menuItemId: string,
    permissionType: keyof RolePermission,
    checked: boolean | "indeterminate" | undefined
  ) => {
    if (!selectedRoleForPermissions) return;

    // Convert CheckedState to boolean
    const isChecked = checked === true;

    const roleId = selectedRoleForPermissions.id;
    const key = `${roleId}-${menuItemId}`;
    const existingPermission = permissions[key];

    try {
      let response: Response;
      let result: any;

      if (existingPermission) {
        // Update existing permission
        const updateData: Record<string, boolean> = {};
        updateData[permissionType as string] = Boolean(isChecked);

        response = await fetch(`/api/role-menu-permissions/${existingPermission.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify(updateData),
        });

        result = await response.json();

        if (result.success) {
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));
        }
      } else {
        // Create new permission
        const basePermissionData = {
          roleId,
          menuItemId,
          canView: false,
          canCreate: false,
          canUpdate: false,
          canDelete: false,
        };

        const newPermissionData = {
          ...basePermissionData,
          [permissionType as keyof typeof basePermissionData]: Boolean(isChecked),
        };

        response = await fetch("/api/role-menu-permissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify(newPermissionData),
        });

        result = await response.json();

        if (result.success) {
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));
        }
      }

      if (result.success) {
        showToast.success("Permission Updated", `${permissionType} permission ${isChecked ? 'granted' : 'revoked'}`);
      } else {
        showToast.error("Error", result.error);
      }
    } catch (error) {
      showToast.error("Error", "Failed to update permission");
    }
  };



  const getPermissionValue = (menuItemId: string, type: PermissionField): boolean => {
    if (!selectedRoleForPermissions) return false;
    const permission = permissions[`${selectedRoleForPermissions.id}-${menuItemId}`];
    return permission?.[type] ?? false;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6">
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
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by role name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchQuery("")}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Roles Management
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {paginatedRoles.length} of {roles.length} roles
            </div>
          </CardTitle>
          <CardDescription>
            Manage system roles and their access permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Items per page:
              </span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingRole(null);
                setFormData({ name: "", description: "" });
              }}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Role
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>
                  {editingRole ? "Edit Role" : "Add New Role"}
                </DialogTitle>
                <DialogDescription>
                  {editingRole
                    ? "Update role information"
                    : "Create a new role for users"
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Description
                    </Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingRole ? "Update" : "Create"} Role
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
                  Are you sure you want to delete the role "{roleToDelete?.name}"?
                  This action cannot be undone and will permanently remove this role.
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
                  Delete Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Permission Management Dialog */}
          <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
            <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Manage Permissions - {selectedRoleForPermissions?.name}
                </DialogTitle>
                <DialogDescription>
                  Configure menu access permissions for the {selectedRoleForPermissions?.name} role.
                  Check the boxes to grant permissions.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                  <div>Menu Item</div>
                  <div className="text-center">View</div>
                  <div className="text-center">Create</div>
                  <div className="text-center">Update</div>
                  <div className="text-center">Delete</div>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {menuItems.map((menuItem) => (
                    <div key={menuItem.id} className="grid grid-cols-5 gap-2 items-center p-2 rounded border">
                      <div className="flex items-center gap-2">
                        <MenuIcon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{menuItem.label}</div>
                          <div className="text-xs text-muted-foreground">{menuItem.menuGroup.label}</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <Checkbox
                          checked={getPermissionValue(menuItem.id, 'canView')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(menuItem.id, 'canView', checked === true)
                          }
                        />
                      </div>
                      <div className="text-center">
                        <Checkbox
                          checked={getPermissionValue(menuItem.id, 'canCreate')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(menuItem.id, 'canCreate', checked === true)
                          }
                        />
                      </div>
                      <div className="text-center">
                        <Checkbox
                          checked={getPermissionValue(menuItem.id, 'canUpdate')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(menuItem.id, 'canUpdate', checked === true)
                          }
                        />
                      </div>
                      <div className="text-center">
                        <Checkbox
                          checked={getPermissionValue(menuItem.id, 'canDelete')}
                          onCheckedChange={(checked) =>
                            handlePermissionChange(menuItem.id, 'canDelete', checked === true)
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPermissionDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="border rounded-lg">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("name")} className="h-auto p-0 font-semibold">
                      Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("description")} className="h-auto p-0 font-semibold">
                      Description
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button variant="ghost" onClick={() => handleSort("_count.users")} className="h-auto p-0 font-semibold">
                      Users
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRoles.length > 0 ? (
                  paginatedRoles.map((role) => (
                    <TableRow key={role.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {role.isSystem && <Shield className="h-4 w-4 text-blue-500" />}
                          {role.name}
                        </div>
                      </TableCell>
                      <TableCell>{role.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {role?._count?.users || 0}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => handleManagePermissions(role)}
                          title="Click to manage permissions"
                        >
                          {role?._count?.menuPermissions || 0} Permissions
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleManagePermissions(role)}
                            title="Manage Permissions"
                          >
                            <Shield className="h-4 w-4" />
                          </Button>
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(role)}
                              title="Duplicate Role"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          )}
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(role)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {!role.isSystem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(role)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No roles found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Enhanced Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 border-t border-border pt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, roles.length)} to{" "}
                  {Math.min(currentPage * pageSize, roles.length)} of{" "}
                  {roles.length} results
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                    if (page > totalPages) return null;
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="min-w-9"
                      >
                        {page}
                      </Button>
                    );
                  })}

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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
