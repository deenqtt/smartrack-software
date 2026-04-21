// File: components/notification-bell.tsx
// Deskripsi: Komponen React untuk menampilkan ikon lonceng dan daftar notifikasi.
// OPTIMIZED: Sistem notifikasi dengan polling yang efisien dan error handling yang baik
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Bell, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Refs untuk polling dan cleanup
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Fungsi untuk mengambil notifikasi dari API dengan error handling yang baik
  const fetchNotifications = useCallback(async (showLoading = false) => {
    // Jangan fetch jika tidak terautentikasi
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
      return;
    }

    // Jangan fetch saat auth masih loading (kecuali ini adalah initial load)
    if (authLoading && !showLoading) {
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }
    setError(null);

    try {

      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        credentials: 'include',
        redirect: 'manual' // Prevent automatic redirects
      });

      if (!response.ok) {
        // Handle authentication errors gracefully
        if (response.status === 401) {
          // console.log('[NotificationBell] Authentication required');
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          // console.log('[NotificationBell] Access denied');
          throw new Error('Access denied. Insufficient permissions.');
        } else {
          // console.log('[NotificationBell] HTTP error:', response.status, response.statusText);
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      if (!isMountedRef.current) return;

      const data = await response.json();
      setNotifications(data);
      const newUnreadCount = data.filter((n: Notification) => !n.isRead).length;
      setUnreadCount(newUnreadCount);
    } catch (error: any) {
      if (!isMountedRef.current) return;

      // Reset state on error
      setNotifications([]);
      setUnreadCount(0);

      // Handle different error types
      if (error.message?.includes('Authentication required')) {
        setError("Not authenticated");
      } else if (error.message?.includes('Request timeout') || error.name === 'AbortError') {
        setError("Request timeout");
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        setError("Connection error");
      } else {
        setError("Failed to load notifications");
      }

    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [isAuthenticated, authLoading]);

  // Fungsi untuk menandai notifikasi sebagai sudah dibaca (hanya saat dropdown dibuka)
  const markAsRead = useCallback(async () => {
    if (unreadCount === 0) return;

    try {
      await axios.post("/api/notifications", {}, { timeout: 5000 });
      if (isMountedRef.current) {
        // Update local state optimistically
        setUnreadCount(0);
        setNotifications(prev => prev.map((n) => ({ ...n, isRead: true })));
      }
    } catch (error) {
      // Silently handle errors for mark as read
      console.warn("Failed to mark notifications as read:", error);
      // Revert optimistic update on error
      if (isMountedRef.current) {
        fetchNotifications(false);
      }
    }
  }, [unreadCount, fetchNotifications]);

  // Fungsi untuk menghapus semua notifikasi secara permanen
  const clearAllNotifications = useCallback(async () => {
    if (notifications.length === 0) return;

    try {
      await axios.delete("/api/notifications", { timeout: 5000 });
      if (isMountedRef.current) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      // Silently handle errors for clear all
      console.warn("Failed to clear notifications:", error);
    }
  }, [notifications.length]);

  // Setup polling dengan interval yang efisien
  useEffect(() => {
    // Cleanup previous interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    // Only setup polling if authenticated and not loading
    if (isAuthenticated && !authLoading) {
      // Initial fetch
      fetchNotifications(true);

      // Setup polling every 30 seconds (reduced frequency for better performance)
      pollingIntervalRef.current = setInterval(() => {
        fetchNotifications(false);
      }, 30000);
    } else if (!isAuthenticated) {
      // Clear notifications when not authenticated
      setNotifications([]);
      setUnreadCount(0);
      setError(null);
    }

    // Cleanup function
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isAuthenticated, authLoading, fetchNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open && unreadCount > 0) {
          markAsRead();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          title={`${unreadCount} unread notifications`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between px-3 py-2">
          <span>Notifications</span>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchNotifications(true)}
              disabled={isLoading}
              className="h-6 w-6 p-0"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {error && (
          <div className="px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 dark:text-red-400">
            <div className="flex items-center gap-2">
              <X className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto">
          {notifications.length > 0 ? (
            <>
              {notifications.slice(0, 10).map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start gap-1 p-3 cursor-default"
                >
                  <div className="flex items-start justify-between w-full">
                    <p className={`text-sm whitespace-normal flex-1 ${!notification.isRead ? 'font-medium' : 'font-normal'
                      }`}>
                      {notification.message}
                    </p>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 ml-2 mt-1" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(notification.createdAt).toLocaleString('id-ID', {
                      timeZone: 'Asia/Jakarta',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </DropdownMenuItem>
              ))}

              {notifications.length > 10 && (
                <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t">
                  And {notifications.length - 10} more notifications...
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-xs mt-1">Notifications will appear here when alarms are triggered</p>
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                disabled={isLoading}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear All Notifications
              </Button>
            </div>
          </>
        )}


      </DropdownMenuContent>
    </DropdownMenu>
  );
}
