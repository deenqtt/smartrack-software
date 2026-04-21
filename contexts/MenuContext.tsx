"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { useAppLoading, useCoordinatedLoading } from "./AppLoadingContext";
import type { MenuGroupWithItems, UserMenuData } from "@/lib/types/menu";
import { usePathname } from "next/navigation";

interface MenuContextType {
  menuData: UserMenuData | null;
  loading: boolean;
  error: string | null;
  refreshMenu: () => Promise<void>;
  isDeveloper: boolean;
  retryMenuLoad: () => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { setMenuLoading, setMenuError, updateMenuTimestamp, isAppReady, shouldRefreshMenu } = useCoordinatedLoading();
  const pathname = usePathname();

  const [menuData, setMenuData] = useState<UserMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);

  // Use localStorage for persistent caching across page reloads
  const getMenuCache = (key: string): UserMenuData | null => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is still valid (10 minutes)
      if (now - parsed.timestamp > 10 * 60 * 1000) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      // Remove corrupted cache
      localStorage.removeItem(key);
      return null;
    }
  };

  const setMenuCache = (key: string, data: UserMenuData) => {
    if (typeof window === 'undefined') return;
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      // localStorage might be full or unavailable
      console.warn('Failed to cache menu data:', error);
    }
  };

  const fetchMenu = useCallback(async (forceRefresh = false) => {
    if (!isAuthenticated || !user || !isAppReady) {
      setMenuData(null);
      setLoading(false);
      return;
    }

    // Create unique cache key per user to prevent cross-user menu caching
    const cacheKey = `menuData_${user.userId}_${user.role.name}`;

    // Check if we should skip fetching based on cache and timing
    if (!forceRefresh && !shouldRefreshMenu) {
      const cachedData = getMenuCache(cacheKey);
      if (cachedData) {
        setMenuData(cachedData);
        setIsDeveloper(!!cachedData.isDeveloper);
        setLoading(false);
        setError(null);
        setMenuLoading(false);
        setMenuError(null);
        return;
      }
    }

    try {
      setLoading(true);
      setMenuLoading(true);
      setError(null);
      setMenuError(null);

      const response = await fetch('/api/menu', {
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
          throw new Error('Authentication required. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Insufficient permissions.');
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch menu');
      }

      const menuDataResult = {
        menuGroups: data.data || [],
        isDeveloper: data.isDeveloper || false,
      };

      // Cache the result with unique user-specific key
      setMenuCache(cacheKey, menuDataResult);

      setMenuData(menuDataResult);
      setIsDeveloper(!!data.isDeveloper);

      // Update shared loading context
      updateMenuTimestamp();
      setMenuLoading(false);
      setMenuError(null);



    } catch (err: any) {
      // If cache exists and request fails, use cached data but show error
      const cached = getMenuCache(cacheKey);
      if (cached && !forceRefresh) {
        setMenuData(cached);
        setIsDeveloper(!!cached.isDeveloper);
        setLoading(false);
        setMenuLoading(false);
        setError(`Using cached menu data: ${err.message}`);
        setMenuError(`Using cached menu data: ${err.message}`);
        return;
      }

      setError(err.message);
      setMenuError(err.message);
      setMenuLoading(false);
      setMenuData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user, isAppReady, shouldRefreshMenu, setMenuLoading, setMenuError, updateMenuTimestamp]);

  const refreshMenu = async () => {
    await fetchMenu();
  };

  const retryMenuLoad = () => {
    if (isAuthenticated) {
      setError(null);
      fetchMenu();
    }
  };

  // Optimized: Only fetch menu when app is ready and we actually need fresh data
  useEffect(() => {
    if (isAuthenticated && user && isAppReady) {
      // Only fetch if we don't have cached data or cache is stale
      if (!menuData || shouldRefreshMenu) {
        fetchMenu();
      }
    } else if (!isAuthenticated) {
      // Clear everything when user logs out
      setMenuData(null);
      setIsDeveloper(false);
      setLoading(false);
      setError(null);
      setMenuLoading(false);
      setMenuError(null);
    }
  }, [isAuthenticated, user?.userId, user?.role.name, isAppReady, shouldRefreshMenu, fetchMenu]);

  // Intelligent refresh: Only refresh when cache is actually stale
  useEffect(() => {
    if (!isAuthenticated || !isAppReady) return;

    // Only set up refresh interval if we have valid cached data
    const hasValidCache = menuData && !shouldRefreshMenu;
    if (!hasValidCache) return;

    const interval = setInterval(() => {
      // Only force refresh if cache is actually stale
      if (shouldRefreshMenu) {
        fetchMenu(true);
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, isAppReady, shouldRefreshMenu, fetchMenu, menuData]);

  // Detect navigation changes and ensure menu is loaded
  useEffect(() => {
    if (!isAuthenticated || !isAppReady) {
      return;
    }

    // If we're on a valid dashboard route but menu data is missing or empty,
    // force a refresh to ensure menu loads properly
    const isDashboardRoute = pathname?.startsWith('/dashboard') ||
      pathname?.startsWith('/devices') ||
      pathname?.startsWith('/protocol') ||
      pathname === '/';

    // Only force refresh if we absolutely have NO data
    if (isDashboardRoute && (!menuData || !menuData.menuGroups || menuData.menuGroups.length === 0) && !loading && !error) {
      // Check cache first before forcing fetch
      const cacheKey = user ? `menuData_${user.userId}_${user.role.name}` : '';
      if (cacheKey && !localStorage.getItem(cacheKey)) {
        fetchMenu(true);
      }
    }
  }, [pathname, isAuthenticated, isAppReady, menuData, fetchMenu, loading, error, user]);

  const value: MenuContextType = {
    menuData,
    loading,
    error,
    refreshMenu,
    isDeveloper,
    retryMenuLoad,
  };

  return (
    <MenuContext.Provider value={value}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}

// Hook for accessing current user's menu permissions for a specific menu item
export function useMenuItemPermissions(menuItemName: string) {
  const { menuData, isDeveloper } = useMenu();

  const findMenuItem = (groups: MenuGroupWithItems[] | undefined, name: string) => {
    if (!groups) return null;

    for (const group of groups) {
      for (const item of group.menuItems) {
        if (item.name === name) {
          return item;
        }
      }
    }
    return null;
  };

  const menuItem = menuData ? findMenuItem(menuData.menuGroups, menuItemName) : null;

  return {
    canView: menuItem?.permissions.canView ?? false,
    canCreate: menuItem?.permissions.canCreate ?? false,
    canUpdate: menuItem?.permissions.canUpdate ?? false,
    canDelete: menuItem?.permissions.canDelete ?? false,
    menuItem,
    isDeveloper,
  };
}
