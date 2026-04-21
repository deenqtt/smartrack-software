"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/lib/toast-utils";
import { useSearchFilter } from "@/hooks/use-search-filter";
import { usePagination } from "@/hooks/use-pagination";
import { Save, User, Menu as MenuIcon, Search, Filter } from "lucide-react";
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
  description: string;
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

type PermissionType = 'canView' | 'canCreate' | 'canUpdate' | 'canDelete';

export function PermissionManagement() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, RolePermission>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Group filter
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");

  // Get unique menu groups for filtering
  const menuGroups = Array.from(new Set(menuItems.map(item => item.menuGroup.label))).sort();

  // Filter by group first
  const filteredByGroup = selectedGroupId === "all"
    ? menuItems
    : menuItems.filter(item => item.menuGroup.label === selectedGroupId);

  // Search functionality - search on name, label, and group label
  const { searchQuery, setSearchQuery, filteredData: filteredMenuItems } = useSearchFilter(filteredByGroup, ['name', 'label', 'menuGroup.label']);

  // Pagination logic
  const { paginatedData: paginatedMenuItems, totalPages, hasNextPage, hasPrevPage } = usePagination(filteredMenuItems, pageSize, currentPage);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    await Promise.all([fetchRoles(), fetchMenuItems(), fetchRolePermissions()]);
    setLoading(false);
  };

  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setRoles(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch roles:", error);
    }
  };

  const fetchMenuItems = async () => {
    try {
      const response = await fetch("/api/menu-items", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        setMenuItems(result.data);
      }
    } catch (error) {
      console.error("Failed to fetch menu items:", error);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const response = await fetch("/api/role-menu-permissions", {
        credentials: 'include'
      });
      const result = await response.json();

      if (result.success) {
        const permsMap: Record<string, RolePermission> = {};
        result.data.forEach((perm: RolePermission) => {
          permsMap[`${perm.roleId}-${perm.menuItemId}`] = perm;
        });
        setPermissions(permsMap);
      }
    } catch (error) {
      console.error("Failed to fetch permissions:", error);
    }
  };

  const handlePermissionChange = async (
    roleId: string,
    menuItemId: string,
    permissionType: PermissionType,
    checked: boolean
  ) => {
    // Get role and menu item details for better toast messages
    const role = roles.find(r => r.id === roleId);
    const menuItem = menuItems.find(m => m.id === menuItemId);

    const permissionLabels = {
      canView: 'Read',
      canCreate: 'Create',
      canUpdate: 'Update',
      canDelete: 'Delete'
    };

    const action = checked ? 'granted' : 'revoked';
    const permissionName = permissionLabels[permissionType];

    try {
      setSaving(true);

      // Show loading state with toast
      showToast.info("Updating Permission", `Updating ${permissionName} access for ${role?.name} role...`);

      const key = `${roleId}-${menuItemId}`;
      const existingPermission = permissions[key];

      let response: Response;
      let result: any;

      if (existingPermission) {
        // Update existing permission
        response = await fetch(`/api/role-menu-permissions/${existingPermission.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            [permissionType]: checked,
          }),
        });

        result = await response.json();

        if (result.success) {
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));

          // Success toast for update
          showToast.success(`Permission ${action}`, `${permissionName} access ${action} for "${menuItem?.label}" to ${role?.name} role`);
        } else {
          showToast.error("Permission Update Failed", `Failed to ${action} ${permissionName} access: ${result.error}`);
          return;
        }
      } else {
        // Create new permission
        response = await fetch("/api/role-menu-permissions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            roleId,
            menuItemId,
            canView: permissionType === 'canView' ? checked : false,
            canCreate: permissionType === 'canCreate' ? checked : false,
            canUpdate: permissionType === 'canUpdate' ? checked : false,
            canDelete: permissionType === 'canDelete' ? checked : false,
          }),
        });

        result = await response.json();

        if (result.success) {
          setPermissions(prev => ({
            ...prev,
            [key]: result.data
          }));

          // Success toast for new permission
          showToast.success("Permission Created", `New ${permissionName} permission ${action} for "${menuItem?.label}" to ${role?.name} role`);
        } else {
          showToast.error("Permission Creation Failed", `Failed to create ${permissionName} permission: ${result.error}`);
          return;
        }
      }

    } catch (error) {
      showToast.error("Network Error", `Failed to update ${permissionName} permission due to network error`);
    } finally {
      setSaving(false);
    }
  };

  const getPermissionValue = (roleId: string, menuItemId: string, type: PermissionType) => {
    const permission = permissions[`${roleId}-${menuItemId}`];
    return permission?.[type] ?? false;
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Permission Management</h3>
          <p className="text-sm text-muted-foreground">
            Configure menu access permissions for each role
          </p>
        </div>

        <Button
          onClick={() => fetchRolePermissions()}
          disabled={saving}
          variant="outline"
        >
          <Save className="mr-2 h-4 w-4" />
          Refresh
        </Button>
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
                  <SelectItem key={group} value={group}>
                    {group}
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
              <TableHead>Menu Item</TableHead>
              <TableHead>Group</TableHead>
              {roles.map((role) => (
                <TableHead key={role.id} className="text-center">
                  <div className="flex items-center gap-1 justify-center">
                    <User className="h-4 w-4" />
                    {role.name}
                  </div>
                  <div className="text-center flex gap-1 mt-1">
                    <span className="text-xs text-muted-foreground">R</span>
                    <span className="text-xs text-muted-foreground">C</span>
                    <span className="text-xs text-muted-foreground">U</span>
                    <span className="text-xs text-muted-foreground">D</span>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedMenuItems.map((menuItem) => (
              <TableRow key={menuItem.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MenuIcon className="h-4 w-4" />
                    {menuItem.label}
                    {menuItem.name.includes('developer') && (
                      <Badge variant="outline" className="text-xs">Dev</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="text-xs">
                    {menuItem.menuGroup.label}
                  </Badge>
                </TableCell>
                {roles.map((role) => (
                  <TableCell key={role.id} className="text-center p-4">
                    <div className="flex flex-col gap-2 items-center">
                      <div className="flex gap-3">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground font-medium">R</span>
                          <Checkbox
                            checked={getPermissionValue(role.id, menuItem.id, 'canView')}
                            onCheckedChange={(checked: boolean) =>
                              handlePermissionChange(role.id, menuItem.id, 'canView', checked)
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground font-medium">C</span>
                          <Checkbox
                            checked={getPermissionValue(role.id, menuItem.id, 'canCreate')}
                            onCheckedChange={(checked: boolean) =>
                              handlePermissionChange(role.id, menuItem.id, 'canCreate', checked)
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground font-medium">U</span>
                          <Checkbox
                            checked={getPermissionValue(role.id, menuItem.id, 'canUpdate')}
                            onCheckedChange={(checked: boolean) =>
                              handlePermissionChange(role.id, menuItem.id, 'canUpdate', checked)
                            }
                            disabled={saving}
                          />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-muted-foreground font-medium">D</span>
                          <Checkbox
                            checked={getPermissionValue(role.id, menuItem.id, 'canDelete')}
                            onCheckedChange={(checked: boolean) =>
                              handlePermissionChange(role.id, menuItem.id, 'canDelete', checked)
                            }
                            disabled={saving}
                          />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                ))}
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

      <div className="text-sm text-muted-foreground">
        <p><strong>Legend:</strong></p>
        <p>R = Read | C = Create | U = Update | D = Delete</p>
        <div className="mt-2 flex items-center">
          <Badge variant="outline" className="mr-1">Dev</Badge>
          Items marked as developer-only
        </div>
      </div>
    </div>
  );
}
