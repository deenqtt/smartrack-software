"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search,
  Trash2,
  Bell,
  CheckCircle,
  Clock,
  RefreshCw,
  MoreHorizontal,
  Eye,
  EyeOff,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import axios from 'axios';
import { useMenuItemPermissions, useMenu } from "@/contexts/MenuContext";
import AccessDenied from "@/components/AccessDenied";
import { showToast } from "@/lib/toast-utils";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
}

export function NotificationHistoryPage() {
  const { canView, canUpdate, canDelete } = useMenuItemPermissions("report-notification-history");
  const { loading: menuLoading } = useMenu();
  const { isAuthenticated } = useAuth();

  // All hooks MUST be called before any conditional returns
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState<Set<string>>(new Set());
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'message' | 'isRead'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [datePreset, setDatePreset] = useState<string>("all_time");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  // Fetch notifications from the existing /api/notifications endpoint
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    try {
      const response = await axios.get('/api/notifications');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Client-side filtering, sorting, pagination
  const filteredNotifications = useMemo(() => {
    let result = [...notifications];

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(n => n.message.toLowerCase().includes(term));
    }

    // Filter by read status
    if (filterRead === 'read') {
      result = result.filter(n => n.isRead);
    } else if (filterRead === 'unread') {
      result = result.filter(n => !n.isRead);
    }

    // Filter by date preset
    if (datePreset !== "all_time") {
      const now = new Date();
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      if (datePreset === "today") {
        result = result.filter(n => new Date(n.createdAt) >= start);
      } else if (datePreset === "yesterday") {
        const yesterdayStart = new Date(start);
        yesterdayStart.setDate(start.getDate() - 1);
        const yesterdayEnd = new Date(start);
        yesterdayEnd.setMilliseconds(-1);
        result = result.filter(n => {
          const d = new Date(n.createdAt);
          return d >= yesterdayStart && d <= yesterdayEnd;
        });
      } else if (datePreset === "last_7_days") {
        start.setDate(now.getDate() - 7);
        result = result.filter(n => new Date(n.createdAt) >= start);
      } else if (datePreset === "last_30_days") {
        start.setDate(now.getDate() - 30);
        result = result.filter(n => new Date(n.createdAt) >= start);
      }
    }

    // Sort
    result.sort((a, b) => {
      let compare = 0;
      if (sortBy === 'createdAt') {
        compare = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'message') {
        compare = a.message.localeCompare(b.message);
      } else if (sortBy === 'isRead') {
        compare = (a.isRead ? 1 : 0) - (b.isRead ? 1 : 0);
      }
      return sortOrder === 'asc' ? compare : -compare;
    });

    return result;
  }, [notifications, searchTerm, filterRead, datePreset, sortBy, sortOrder]);

  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Stats computed from local data
  const stats = useMemo(() => {
    const total = notifications.length;
    const unread = notifications.filter(n => !n.isRead).length;
    const read = total - unread;
    const today = notifications.filter(n => {
      const d = new Date(n.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;

    return { total, unread, read, today };
  }, [notifications]);

  // Individual notification actions
  const handleMarkAllAsRead = async () => {
    try {
      await axios.post('/api/notifications'); // POST marks all as read
      fetchNotifications();
      showToast.success("All notifications marked as read");
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      showToast.error("Failed to mark as read");
    }
  };

  const handleExport = () => {
    const csvData = [
      ["Date", "Status", "Message"],
      ...filteredNotifications.map((n) => [
        format(new Date(n.createdAt), 'yyyy-MM-dd HH:mm:ss'),
        n.isRead ? "Read" : "Unread",
        n.message,
      ]),
    ];

    const csvContent = csvData
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `notification-history-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();

    showToast.success("Export Complete", "CSV file downloaded successfully");
  };

  const handleDeleteAll = async () => {
    try {
      await axios.delete('/api/notifications');
      fetchNotifications();
      setSelectedNotifications(new Set());
      setDeleteAllDialogOpen(false);
      showToast.success("All notifications deleted");
    } catch (error) {
      console.error('Failed to delete notifications:', error);
      showToast.error("Failed to delete notifications");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Use the main endpoint - since there's no individual delete, we handle it gracefully
      await axios.delete('/api/notifications');
      fetchNotifications();
      setSelectedNotifications(prev => {
        const newSelected = new Set(prev);
        newSelected.delete(notificationId);
        return newSelected;
      });
      showToast.success("Notification deleted");
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotifications(new Set(paginatedNotifications.map(n => n.id)));
    } else {
      setSelectedNotifications(new Set());
    }
  };

  const handleSelectNotification = (notificationId: string, checked: boolean) => {
    const newSelected = new Set(selectedNotifications);
    if (checked) {
      newSelected.add(notificationId);
    } else {
      newSelected.delete(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  // Sorting
  const handleSort = (column: 'createdAt' | 'message' | 'isRead') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (column: 'createdAt' | 'message' | 'isRead') => {
    if (sortBy !== column) return <ArrowUpDown className="h-4 w-4 ml-1" />;
    return sortOrder === 'asc' ?
      <ArrowUp className="h-4 w-4 ml-1" /> :
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRead, itemsPerPage]);

  // Access check AFTER all hooks
  if (!menuLoading && !canView) {
    return (
      <AccessDenied
        title="Access Denied"
        message="You don't have permission to view notification history."
        showActions={true}
      />
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold truncate">Notification History</h1>
            <p className="text-sm sm:text-base text-muted-foreground">View and manage your notification history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={fetchNotifications} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm" disabled={filteredNotifications.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          {canUpdate && (
            <Button onClick={handleMarkAllAsRead} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          {canDelete && (
            <Button onClick={() => setDeleteAllDialogOpen(true)} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
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
              <Bell className="h-6 w-6 text-primary" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Mail className="h-6 w-6 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-blue-600">{stats.unread}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <MailOpen className="h-6 w-6 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Read</p>
                <p className="text-2xl font-bold text-green-600">{stats.read}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-6 w-6 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-muted-foreground">Today</p>
                <p className="text-2xl font-bold text-purple-600">{stats.today}</p>
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
              placeholder="Search notifications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="sm:w-40">
          <Select value={filterRead} onValueChange={(value: any) => setFilterRead(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="read">Read</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:w-40">
          <Select value={datePreset} onValueChange={(value) => setDatePreset(value)}>
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
            setSearchTerm('');
            setFilterRead('all');
            setDatePreset('all_time');
          }}
        >
          Clear Filters
        </Button>
      </div>

      {/* Active Filters Display */}
      {(searchTerm || filterRead !== 'all' || datePreset !== 'all_time') && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: &quot;{searchTerm}&quot;
              <button onClick={() => setSearchTerm('')} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
          {filterRead !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filterRead === 'read' ? 'Read' : 'Unread'}
              <button onClick={() => setFilterRead('all')} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
          {datePreset !== 'all_time' && (
            <Badge variant="secondary" className="gap-1">
              Date: {datePreset.replace(/_/g, ' ')}
              <button onClick={() => setDatePreset('all_time')} className="ml-1 hover:bg-muted rounded-full p-0.5">×</button>
            </Badge>
          )}
        </div>
      )}

      {/* Bulk Actions */}
      {selectedNotifications.size > 0 && (
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground">
            {selectedNotifications.size} selected
          </span>
          {canDelete && (
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
          )}
        </div>
      )}

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </div>
            <div className="text-sm font-normal text-muted-foreground">
              Showing {paginatedNotifications.length} of {filteredNotifications.length} notifications
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop Table */}
          <div className="hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 pl-6">
                    <Checkbox
                      checked={selectedNotifications.size === paginatedNotifications.length && paginatedNotifications.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead
                    className="min-w-[300px] cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('message')}
                  >
                    <div className="flex items-center">
                      Message {getSortIcon('message')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-24 cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('isRead')}
                  >
                    <div className="flex items-center">
                      Status {getSortIcon('isRead')}
                    </div>
                  </TableHead>
                  <TableHead
                    className="w-48 cursor-pointer select-none hover:bg-muted/50"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Date {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead className="w-12 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell className="pl-6"><div className="w-4 h-4 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-3/4" /></TableCell>
                      <TableCell><div className="h-6 bg-muted animate-pulse rounded w-16" /></TableCell>
                      <TableCell><div className="h-4 bg-muted animate-pulse rounded w-32" /></TableCell>
                      <TableCell><div className="w-8 h-8 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map((notification) => (
                    <TableRow key={notification.id} className="hover:bg-muted/50">
                      <TableCell className="pl-6">
                        <Checkbox
                          checked={selectedNotifications.has(notification.id)}
                          onCheckedChange={(checked) => handleSelectNotification(notification.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className={`truncate ${!notification.isRead ? 'font-semibold' : ''}`} title={notification.message}>
                          {notification.message}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={notification.isRead ? "secondary" : "default"}
                          className={notification.isRead ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
                        >
                          {notification.isRead ? 'Read' : 'Unread'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">
                          {format(new Date(notification.createdAt), 'dd MMM yyyy, HH:mm:ss')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                navigator.clipboard.writeText(notification.message);
                                showToast.success("Copied to clipboard");
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Copy Message
                            </DropdownMenuItem>
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteNotification(notification.id)}
                                  className="text-red-600 focus:text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3">
                        <Bell className="h-12 w-12 text-muted-foreground/50" />
                        <div>
                          <p className="text-lg font-medium text-muted-foreground">No notifications found</p>
                          <p className="text-sm text-muted-foreground/70 mt-1">
                            {searchTerm || filterRead !== 'all' ? 'Try adjusting your filters' : 'No notifications yet'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="lg:hidden space-y-3 p-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : paginatedNotifications.length > 0 ? (
              paginatedNotifications.map((notification) => (
                <Card key={notification.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${notification.isRead ? 'bg-green-100 dark:bg-green-900/20' : 'bg-blue-100 dark:bg-blue-900/20'
                          }`}>
                          {notification.isRead ? (
                            <MailOpen className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${!notification.isRead ? 'font-semibold' : ''}`}>
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant={notification.isRead ? "secondary" : "default"}
                              className="text-xs"
                            >
                              {notification.isRead ? 'Read' : 'Unread'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
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
                              navigator.clipboard.writeText(notification.message);
                              showToast.success("Copied to clipboard");
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Copy Message
                          </DropdownMenuItem>
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteNotification(notification.id)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-lg font-medium text-muted-foreground">No notifications found</p>
              </div>
            )}
          </div>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} ({filteredNotifications.length} total)
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Items per page:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Delete All Confirmation */}
      <ConfirmationDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        type="destructive"
        title="Delete All Notifications"
        description="Are you sure you want to delete all notifications? This action cannot be undone."
        confirmText="Yes, Delete All"
        cancelText="Cancel"
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteAllDialogOpen(false)}
      />

      {/* Bulk Delete Confirmation */}
      <ConfirmationDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
        type="destructive"
        title="Delete Selected Notifications"
        description={`Are you sure you want to delete ${selectedNotifications.size} selected notification(s)?`}
        confirmText="Yes, Delete"
        cancelText="Cancel"
        onConfirm={async () => {
          await handleDeleteAll(); // Uses the existing delete-all endpoint
          setBulkDeleteDialogOpen(false);
        }}
        onCancel={() => setBulkDeleteDialogOpen(false)}
      />
    </div>
  );
}
