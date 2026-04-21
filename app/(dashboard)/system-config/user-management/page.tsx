"use client";

import { useState, useEffect, useMemo } from "react";
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import { useAuth } from "@/contexts/AuthContext";
import AccessDenied from "@/components/AccessDenied";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/lib/toast-utils";
import { useSortableTable } from "@/hooks/use-sort-table";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Phone,
  Calendar,
  Edit,
  Trash2,
  Search,
  RefreshCw,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserCog,
  Upload,
  X,
  Camera,
  MoreHorizontal,
  Filter,
  CheckSquare,
  Square,
  Trash,
  Eye,
  Download,
  CopyPlus,
} from "lucide-react";
import { ImportExportButtons } from "@/components/shared/ImportExportButtons";

interface User {
  id: string;
  email: string;
  phoneNumber?: string;
  avatar: string | null;
  role: {
    id: string;
    name: string;
    description: string;
  };
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description?: string;
  _count: {
    users: number;
    menuPermissions: number;
  };
}

export default function UserManagementPage() {
  // RBAC Permission Checks - Get permissions for user management
  const { canView, canCreate, canUpdate, canDelete } = useMenuItemPermissions('system-user-management');
  const { loading: menuLoading } = useMenu();

  // Check if user has any action permissions
  const hasActionPermissions = canCreate || canUpdate || canDelete;

  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const [userForm, setUserForm] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    roleId: "",
    phoneNumber: "",
  });

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [userFormMode, setUserFormMode] = useState<"create" | "edit">("create");

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users");
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Forbidden - Insufficient permissions");
        }
        throw new Error("Failed to fetch users");
      }
      const result = await response.json();
      if (result.success) {
        setUsers(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch users");
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch roles
  const fetchRoles = async () => {
    try {
      const response = await fetch("/api/roles");
      if (!response.ok) {
        if (response.status === 403) {
          console.warn("Insufficient permissions to fetch roles - user may not see role filter options");
          // Don't show error to user, just log it
          showToast.info("Permission Notice", "Some features may be limited due to insufficient permissions.");
          setRoles([]); // Set empty array instead of leaving undefined
          return;
        }
        throw new Error("Failed to fetch roles");
      }
      const result = await response.json();
      if (result.success) {
        setRoles(result.data);
        console.log("Roles fetched successfully:", result.data.length, "roles");
      } else {
        console.error("Failed to fetch roles:", result.error);
        showToast.info("Warning", "Unable to load role options for filtering.");
        setRoles([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch roles:", err);
      showToast.info("Warning", "Role filtering may not be available.");
      setRoles([]); // Ensure roles is always an array
    }
  };

  // Filter users based on search term and role filter
  const filteredUsers = (users || []).filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.phoneNumber && user.phoneNumber.includes(searchTerm)) ||
      user.role.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role.id === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Apply sorting using useSortableTable hook
  const {
    sorted: sortedUsers,
    sortField,
    sortDirection,
    handleSort,
  } = useSortableTable(filteredUsers);

  // Paginate sorted results
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = sortedUsers.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, sortField, sortDirection]);

  // Initialize
  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  // Bulk delete handlers
  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;

    try {
      const deletePromises = Array.from(selectedUsers).map(userId =>
        fetch(`/api/users/${userId}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      showToast.success("Success", `Successfully deleted ${selectedUsers.size} user${selectedUsers.size > 1 ? 's' : ''}`);

      setSelectedUsers(new Set());
      fetchUsers();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to delete selected users");
    } finally {
      setIsBulkDeleteDialogOpen(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (userId: string, checked: boolean) => {
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  // Select all users
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUsers(new Set(paginatedUsers.map(user => user.id)));
    } else {
      setSelectedUsers(new Set());
    }
  };

  // Form submission handlers
  const handleUserSubmit = async () => {
    if (!userForm.email.trim() || !userForm.roleId) {
      showToast.error("Validation Error", "Email and role are required");
      return;
    }

    if (userFormMode === "create" && !userForm.password.trim()) {
      showToast.error("Validation Error", "Password is required for new users");
      return;
    }

    if (userFormMode === "create" && userForm.password !== userForm.confirmPassword) {
      showToast.error("Validation Error", "Passwords do not match");
      return;
    }

    try {
      const payload = userFormMode === "create" ? {
        email: userForm.email,
        password: userForm.password,
        roleId: userForm.roleId,
        phoneNumber: userForm.phoneNumber || null,
      } : {
        email: userForm.email,
        roleId: userForm.roleId,
        phoneNumber: userForm.phoneNumber || null,
        ...(userForm.password.trim() ? { password: userForm.password } : {}),
      };

      const response = await fetch(userFormMode === "create" ? "/api/users" : `/api/users/${selectedUser?.id}`, {
        method: userFormMode === "create" ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to save user");
      }

      showToast.success(`User ${userFormMode === "create" ? "created" : "updated"} successfully`);

      setIsUserDialogOpen(false);
      setIsEditModalOpen(false);
      resetUserForm();
      fetchUsers();
    } catch (error: any) {
      showToast.error(`Failed to ${userFormMode === "create" ? "create" : "update"} user`, error.message);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      password: "",
      confirmPassword: "",
      roleId: user.role.id,
      phoneNumber: user.phoneNumber || "",
    });
    setUserFormMode("edit");
    setIsEditModalOpen(true);
  };

  const handleDuplicate = (user: User) => {
    setSelectedUser(null);
    setUserForm({
      email: `${user.email.split('@')[0]}_copy@${user.email.split('@')[1] || 'example.com'}`,
      password: "",
      confirmPassword: "",
      roleId: user.role.id,
      phoneNumber: user.phoneNumber || "",
    });
    setUserFormMode("create");
    setIsUserDialogOpen(true);
  };

  const handleDelete = (user: User) => {
    if (user.id === currentUser?.userId) {
      showToast.error("Operation Not Allowed", "You cannot delete your own account");
      return;
    }
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    try {
      const response = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete user");
      }

      showToast.success("User account deleted successfully");
      fetchUsers();
    } catch (error: any) {
      showToast.error("Deletion failed", error.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  // Avatar upload handlers
  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        showToast.error("Invalid File Type", "Please select a JPEG, PNG, GIF, or WebP image.");
        return;
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showToast.error("File Too Large", "Please select an image smaller than 5MB.");
        return;
      }

      setSelectedAvatarFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    setSelectedAvatarFile(null);
    setAvatarPreview(null);
  };

  const handleAvatarDelete = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/avatar`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete avatar");
      }

      showToast.success("Success", "Avatar deleted successfully");

      // Update user in state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id
            ? { ...user, avatar: null }
            : user
        )
      );

      setSelectedUser(prev => prev ? { ...prev, avatar: null } : null);
      removeAvatar();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to delete avatar");
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedAvatarFile || !selectedUser) return;

    const formData = new FormData();
    formData.append("avatar", selectedAvatarFile);

    try {
      const response = await fetch(`/api/users/${selectedUser.id}/avatar`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload avatar");
      }

      const result = await response.json();

      showToast.success("Success", "Avatar uploaded successfully");

      // Update user in state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === selectedUser.id
            ? { ...user, avatar: result.avatar }
            : user
        )
      );

      setSelectedUser(prev => prev ? { ...prev, avatar: result.avatar } : null);
      removeAvatar();
    } catch (error: any) {
      showToast.error("Error", error.message || "Failed to upload avatar");
    }
  };

  // Consolidating Export handled by ImportExportButtons component


  const handleExportSingle = async (user: User) => {
    try {
      showToast.info("Preparing Export", `Exporting user "${user.email}"...`);
      const response = await fetch(`/api/users/export/${user.id}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `user-${user.email.replace(/@/g, '_at_').replace(/[^a-z0-9]/gi, '_')}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success("Export Success", `"${user.email}" exported successfully`);
    } catch (error: any) {
      showToast.error("Export Failed", error.message || "Failed to export user");
    }
  };

  // Reset form
  const resetUserForm = () => {
    setUserForm({
      email: "",
      password: "",
      confirmPassword: "",
      roleId: "",
      phoneNumber: "",
    });
    setSelectedUser(null);
    setUserFormMode("create");
    removeAvatar();
  };

  const openCreateDialog = () => {
    resetUserForm();
    setUserFormMode("create");
    setIsUserDialogOpen(true);
  };

  // Stats calculations
  const totalUsers = users.length;
  const adminUsers = (users || []).filter(u => u.role.name === 'ADMIN').length;
  const userUsers = (users || []).filter(u => u.role.name === 'USER').length;
  const developerUsers = (users || []).filter(u => u.role.name === 'DEVELOPER').length;

  if (menuLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    );
  }

  if (!canView) return <AccessDenied />;

  if (isLoading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary/50" />
        <p className="text-muted-foreground animate-pulse">Loading users...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* ── Section Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground uppercase">
                User <span className="text-primary">Management</span>
              </h1>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                Manage accounts, roles & access permissions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!menuLoading && canCreate && (
              <>
                <ImportExportButtons
                  importUrl="/api/users/import"
                  exportUrl="/api/users/export"
                  onImportSuccess={fetchUsers}
                  itemName="User Accounts"
                />
                <Button
                  onClick={openCreateDialog}
                  className="rounded-xl"
                >
                  <UserPlus className="mr-2 h-4 w-4" /> Add User
                </Button>
              </>
            )}
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Users className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-foreground">{totalUsers}</div>
              <p className="text-[10px] font-bold text-primary uppercase mt-2">All accounts</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Admins</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-red-500">{adminUsers}</div>
              <p className="text-[10px] font-bold text-red-500 uppercase mt-2">Full access</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <UserCog className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Users</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-blue-500">{userUsers}</div>
              <p className="text-[10px] font-bold text-blue-500 uppercase mt-2">Standard access</p>
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/50 shadow-sm overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:scale-110 transition-transform duration-500">
              <Shield className="w-24 h-24" />
            </div>
            <CardHeader className="pb-2 pt-6 px-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">Developers</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <div className="text-4xl font-black text-emerald-500">{developerUsers}</div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase mt-2">Dev access</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Search & Filter ── */}
        <Card className="rounded-[32px] border-border/50 shadow-md">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-black uppercase tracking-tight">Search & Filter</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search by email, phone, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 rounded-xl border-border/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Role</span>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="rounded-xl border-border/50">
                    <SelectValue placeholder="All roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.length > 0 ? (
                      roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="all" disabled>No roles available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Created Date</span>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="rounded-xl border-border/50">
                    <SelectValue placeholder="All dates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="quarter">Last 3 Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="rounded-xl border-border/50">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setRoleFilter("all");
                    setDateFilter("all");
                    setStatusFilter("all");
                    setSelectedUsers(new Set());
                  }}
                  className="w-full rounded-xl border-border/50"
                >
                  Clear Filters
                </Button>
              </div>
            </div>

            {selectedUsers.size > 0 && hasActionPermissions && (
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-2xl border border-border/50">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold">
                    {selectedUsers.size} user{selectedUsers.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {!menuLoading && canDelete && (
                    <Button variant="destructive" size="sm" className="rounded-xl" onClick={() => setIsBulkDeleteDialogOpen(true)}>
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setSelectedUsers(new Set())}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Users Table ── */}
        <Card className="rounded-[32px] border-border/50 shadow-md">
          <CardHeader className="border-b border-border/50 pb-4 flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-black uppercase tracking-tight">Users List</CardTitle>
              </div>
              <CardDescription className="text-[10px] uppercase font-bold tracking-wider">
                All user accounts & access permissions
              </CardDescription>
            </div>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(Number(value))}>
              <SelectTrigger className="w-[110px] rounded-xl border-border/50 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 per page</SelectItem>
                <SelectItem value="10">10 per page</SelectItem>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">
                        <Checkbox
                          checked={paginatedUsers.length > 0 && paginatedUsers.every(user => selectedUsers.has(user.id))}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("email")}
                      >
                        <div className="flex items-center gap-1">
                          User
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("phoneNumber")}
                      >
                        <div className="flex items-center gap-1">
                          Contact
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("role.name")}
                      >
                        <div className="flex items-center gap-1">
                          Role
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer hover:bg-muted/50 select-none"
                        onClick={() => handleSort("createdAt")}
                      >
                        <div className="flex items-center gap-1">
                          Created
                          <ArrowUpDown className="h-4 w-4" />
                        </div>
                      </TableHead>
                      {hasActionPermissions && (
                        <TableHead className="text-right">Actions</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-48">
                          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
                        </TableCell>
                      </TableRow>
                    ) : paginatedUsers.length > 0 ? (
                      paginatedUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.has(user.id)}
                              onCheckedChange={(checked) => handleUserSelect(user.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={user.avatar || undefined} />
                                <AvatarFallback>
                                  {user.email.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate max-w-64" title={user.email}>
                                  {user.email}
                                </p>
                                <p className="text-xs text-muted-foreground truncate max-w-64">
                                  ID: {user.id.slice(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-muted-foreground" />
                                <span className="truncate max-w-48">{user.email}</span>
                              </div>
                              {user.phoneNumber && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  <span>{user.phoneNumber}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const roleName = user.role.name.toUpperCase();
                              if (roleName === "ADMIN") {
                                return <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-200">{roleName}</Badge>;
                              } else if (roleName === "DEVELOPER") {
                                return <Badge className="bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200">{roleName}</Badge>;
                              } else if (roleName === "ENGINEER") {
                                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200">{roleName}</Badge>;
                              } else {
                                return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200">{roleName}</Badge>;
                              }
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {new Date(user.createdAt).toLocaleDateString("id-ID")}
                              </span>
                            </div>
                          </TableCell>
                          {hasActionPermissions && (
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="left" align="start">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  {canUpdate && (
                                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </DropdownMenuItem>
                                  )}
                                  {canCreate && (
                                    <DropdownMenuItem onClick={() => handleDuplicate(user)}>
                                      <CopyPlus className="mr-2 h-4 w-4" />
                                      Duplicate
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleExportSingle(user)}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export
                                  </DropdownMenuItem>
                                  {canDelete && (
                                    <DropdownMenuItem
                                      onClick={() => handleDelete(user)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center h-48 text-muted-foreground"
                        >
                          {users.length === 0 ? 'No user accounts found.' : 'No results match your search.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border/30">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, users.length)} of {users.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="rounded-xl border-border/50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Prev
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0 rounded-xl border-border/50"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-xl border-border/50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* User Dialog (Create/Edit) */}
          <Dialog
            open={isUserDialogOpen || isEditModalOpen}
            onOpenChange={(open) => {
              if (!open) {
                setIsUserDialogOpen(false);
                setIsEditModalOpen(false);
                resetUserForm();
              }
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {userFormMode === "create" ? "Add New User" : "Edit User"}
                </DialogTitle>
                <DialogDescription>
                  {userFormMode === "create"
                    ? "Create a new user account with the specified role and permissions."
                    : "Update user information and role assignments."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user-email">Email Address *</Label>
                  <Input
                    id="user-email"
                    type="email"
                    placeholder="user@example.com"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-phone">Phone Number</Label>
                  <Input
                    id="user-phone"
                    type="tel"
                    placeholder="+6281234567890"
                    value={userForm.phoneNumber}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        phoneNumber: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user-role">Role *</Label>
                  <Select
                    value={userForm.roleId}
                    onValueChange={(value) =>
                      setUserForm({ ...userForm, roleId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {userFormMode === "create" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">Password *</Label>
                      <Input
                        id="user-password"
                        type="password"
                        placeholder="Enter password"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="user-confirm-password">Confirm Password *</Label>
                      <Input
                        id="user-confirm-password"
                        type="password"
                        placeholder="Confirm password"
                        value={userForm.confirmPassword}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            confirmPassword: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                )}

                {userFormMode === "edit" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="user-password">New Password (leave blank to keep current)</Label>
                      <Input
                        id="user-password"
                        type="password"
                        placeholder="Enter new password"
                        value={userForm.password}
                        onChange={(e) =>
                          setUserForm({
                            ...userForm,
                            password: e.target.value,
                          })
                        }
                      />
                    </div>

                    {/* Avatar Upload Section */}
                    <div className="space-y-2">
                      <Label>Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={avatarPreview || selectedUser?.avatar || undefined} />
                          <AvatarFallback>
                            <Camera className="h-6 w-6" />
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/gif,image/webp"
                              onChange={handleAvatarFileChange}
                              className="hidden"
                              id="avatar-upload"
                            />
                            <Label htmlFor="avatar-upload" className="cursor-pointer">
                              <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                                <Upload className="h-4 w-4 mr-2" />
                                Choose File
                              </Button>
                            </Label>

                            {selectedAvatarFile && (
                              <Button
                                type="button"
                                onClick={handleAvatarUpload}
                                size="sm"
                                variant="default"
                              >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </Button>
                            )}

                            {selectedUser?.avatar && (
                              <Button
                                type="button"
                                onClick={handleAvatarDelete}
                                size="sm"
                                variant="destructive"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </div>

                          {selectedAvatarFile && (
                            <div className="text-xs text-muted-foreground">
                              {selectedAvatarFile.name} ({(selectedAvatarFile.size / 1024 / 1024).toFixed(2)} MB)
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
                      </p>
                    </div>
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsUserDialogOpen(false);
                    setIsEditModalOpen(false);
                    resetUserForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUserSubmit}
                  disabled={
                    !userForm.email.trim() ||
                    !userForm.roleId ||
                    (userFormMode === "create" &&
                      (!userForm.password.trim() || userForm.password !== userForm.confirmPassword))
                  }
                >
                  {userFormMode === "create" ? (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  ) : (
                    <>
                      <Edit className="h-4 w-4 mr-2" />
                      Update User
                    </>
                  )}
                </Button>
                {/* Validation hint for user confusion */}
                {userFormMode === "create" && userForm.password && userForm.password !== userForm.confirmPassword && (
                  <p className="text-[10px] text-red-500 text-center w-full mt-1">Passwords do not match</p>
                )}
                {userFormMode === "create" && !userForm.password && (
                  <p className="text-[10px] text-muted-foreground text-center w-full mt-1">Password required for new account</p>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete User Account</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete the user account for{" "}
                  <strong>{userToDelete?.email}</strong>? This action cannot be undone
                  and will permanently remove the user from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete User
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Bulk Delete Confirmation Dialog */}
          <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Selected Users</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete <strong>{selectedUsers.size}</strong> selected user account{selectedUsers.size > 1 ? 's' : ''}?
                  This action cannot be undone and will permanently remove the selected users from the system.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
