"use client";

import { useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Custom hook for auto-refreshing data when navigating between pages
 * Triggers refresh when pathname changes and provides manual refresh capability
 */
export function useAutoRefresh(
  refreshFunction: () => Promise<void> | void,
  dependencies: any[] = [],
  options: {
    enabled?: boolean;
    delay?: number;
    skipInitial?: boolean;
  } = {}
) {
  const {
    enabled = true,
    delay = 100,
    skipInitial = false
  } = options;

  const pathname = usePathname();
  const lastPathnameRef = useRef(pathname);
  const isInitialMountRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const refreshData = useCallback(async () => {
    if (!enabled) return;

    try {
      await refreshFunction();
    } catch (error) {
      // Silently handle errors to prevent console spam
      // Error is already handled by the calling component if needed
    }
  }, [refreshFunction, enabled]);

  // Auto-refresh when pathname changes
  useEffect(() => {
    if (!enabled) return;

    const pathnameChanged = lastPathnameRef.current !== pathname;

    if (pathnameChanged) {
      lastPathnameRef.current = pathname;

      // Skip initial mount if requested
      if (skipInitial && isInitialMountRef.current) {
        isInitialMountRef.current = false;
        return;
      }

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Delay refresh slightly to allow page transition to complete
      timeoutRef.current = setTimeout(() => {
        refreshData();
      }, delay);
    }

    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
    }
  }, [pathname, enabled, delay, refreshData, skipInitial]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    if (!enabled) return;

    // Clear any pending auto-refresh
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    await refreshData();
  }, [refreshData, enabled]);

  return {
    refreshData: manualRefresh,
    isEnabled: enabled
  };
}
