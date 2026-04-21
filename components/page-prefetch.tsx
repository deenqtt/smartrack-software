"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useMenu } from "@/contexts/MenuContext";

// Minimal prefetching hook - only prefetches on explicit user actions
export function usePagePrefetch() {
  const router = useRouter();
  const prefetchedRoutesRef = useRef<Set<string>>(new Set());
  const { menuData } = useMenu();

  // Removed automatic prefetching on mount - only prefetch on hover/focus
  useEffect(() => {
    // Only load critical routes when menu data changes (navigation becomes available)
    if (menuData?.menuGroups) {
      // Even more conservative - only prefetch the current page and one critical route
      const criticalRoutes = ['/alarms']; // Only alarms as truly critical

      criticalRoutes.forEach((route, index) => {
        if (!prefetchedRoutesRef.current.has(route)) {
          setTimeout(() => {
            router.prefetch(route);
            prefetchedRoutesRef.current.add(route);
          }, index * 1000); // 1 second delay to avoid blocking initial render
        }
      });
    }
  }, [menuData, router]);

  const prefetchRoute = (route: string) => {
    if (!prefetchedRoutesRef.current.has(route)) {
      router.prefetch(route);
      prefetchedRoutesRef.current.add(route);
    }
  };

  const prefetchOnHover = (route: string) => {
    // Only prefetch on hover with debouncing
    const timeoutId = setTimeout(() => {
      prefetchRoute(route);
    }, 100); // Small delay to avoid unnecessary prefetches on quick mouse movements

    return () => clearTimeout(timeoutId);
  };

  return { prefetchRoute, prefetchOnHover };
}
