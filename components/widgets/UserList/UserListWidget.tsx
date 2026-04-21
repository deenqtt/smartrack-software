"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import { showToast } from "@/lib/toast-utils";
import {
  AlertTriangle,
  Loader2,
  WifiOff,
  Wifi,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface UserData {
  id: string;
  email: string;
  roleId: string;
  role?: {
    id: string;
    name: string;
  };
  isActive: boolean;
  createdAt: string;
}

interface Props {
  config: {
    customName: string;
    refreshInterval?: number;
  };
}

export const UserListWidget = ({ config }: Props) => {
  // ===== STATE MANAGEMENT =====
  const { brokers } = useMqttServer();
  const [users, setUsers] = useState<UserData[]>([]);
  const [status, setStatus] = useState<"loading" | "error" | "ok" | "empty">("loading");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Pagination & Sorting State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [sortField, setSortField] = useState<keyof UserData | 'roleName'>('email');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const connectionStatus = brokers.some(broker => broker.status === 'connected')
    ? 'Connected' : 'Disconnected';

  // ===== DATA FETCHING =====
  const fetchUsers = useCallback(async () => {
    // Only show loading on initial fetch to avoid flickering during auto-refresh
    if (users.length === 0) setStatus("loading");

    try {
      const response = await fetch(`${API_BASE_URL}/api/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user data');
      }

      const userData = Array.isArray(result.data) ? result.data : [];
      setUsers(userData);
      setLastUpdate(new Date());
      setStatus(userData.length === 0 ? "empty" : "ok");

    } catch (error: any) {
      console.error("Error fetching users:", error);
      if (users.length === 0) setStatus("error");
      showToast.error("Failed to load user data");
    }
  }, [users.length]);

  // ===== AUTO REFRESH =====
  useEffect(() => {
    fetchUsers();

    const interval = config.refreshInterval ? config.refreshInterval * 1000 : 30000;
    const timer = setInterval(fetchUsers, interval);

    return () => clearInterval(timer);
  }, [fetchUsers, config.refreshInterval]);

  // ===== PROCESSING (FILTER + SORT + PAGINATE) =====
  const processedData = useMemo(() => {
    // 1. Filter
    let result = [...users];
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.email.toLowerCase().includes(query) ||
        (user.role?.name && user.role.name.toLowerCase().includes(query))
      );
    }

    // 2. Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;

      if (sortField === 'roleName') {
        aVal = a.role?.name || '';
        bVal = b.role?.name || '';
      } else {
        aVal = a[sortField as keyof UserData] || '';
        bVal = b[sortField as keyof UserData] || '';
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, searchQuery, sortField, sortOrder]);

  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  // Handle page reset on search
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSort = (field: keyof UserData | 'roleName') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ===== STATUS STYLING =====
  const styles = {
    title: "text-slate-700 dark:text-slate-300",
    indicator: connectionStatus === "Connected" ? "bg-emerald-500" : "bg-red-500",
    statusColor: status === "error" ? "text-red-600" : (status === "empty" ? "text-amber-600" : "text-emerald-600")
  };

  // ===== RENDER METHODS =====
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <span className="text-xs text-slate-500">
          Page {currentPage} of {totalPages}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 border-b border-slate-200/60 dark:border-slate-600/80 bg-slate-50/80 dark:bg-slate-800/40">
        <div className="flex items-center gap-2 overflow-hidden">
          <Users className="w-4 h-4 text-blue-500 shrink-0" />
          <h3 className={`font-semibold truncate ${styles.title}`}>
            {config.customName || "User Management"}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative hidden sm:block">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32 lg:w-48"
            />
          </div>
          <div className={`rounded-full w-2 h-2 ${styles.indicator}`} title={connectionStatus} />
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-auto">
        {status === "loading" && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Fetching users...</span>
          </div>
        )}

        {status === "error" && (
          <div className="h-full flex flex-col items-center justify-center gap-3 p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="text-sm font-medium text-red-600">Failed to load connection</p>
            <button onClick={fetchUsers} className="text-xs text-blue-500 underline">Try again</button>
          </div>
        )}

        {status === "empty" && (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-slate-400">
            <Users className="w-8 h-8 opacity-20" />
            <span className="text-sm">No users found</span>
          </div>
        )}

        {status === "ok" && (
          <table className="w-full text-sm text-left border-collapse">
            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800/90 backdrop-blur-sm z-10 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th
                  className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email
                    {sortField === 'email' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('roleName')}
                >
                  <div className="flex items-center gap-1">
                    Role
                    {sortField === 'roleName' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
                <th
                  className="px-4 py-3 font-medium text-slate-500 cursor-pointer hover:text-slate-900 transition-colors"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Joined
                    {sortField === 'createdAt' ? (
                      sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                    ) : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedData.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                  <td className="px-4 py-3 truncate max-w-[150px]" title={user.email}>
                    {user.email}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                      {user.role?.name || 'No Role'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer / Pagination */}
      {status === "ok" && (
        <>
          {renderPagination()}
          <div className="px-4 py-2 border-t border-slate-200/60 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/30">
            <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
              <span>Total: {processedData.length} Users</span>
              {lastUpdate && <span>Updated {lastUpdate.toLocaleTimeString()}</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
