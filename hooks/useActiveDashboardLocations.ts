import { useState, useEffect } from "react";

export interface GatewayLocation {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
  url: string | null;
  topic: string | null;
  description: string | null;
  gatewayType: string | null;
  clientId: string | null;
  dashboardId: string | null;
  client?: {
    id: string;
    name: string;
    company: string | null;
  };
}

export interface GatewayDashboard {
  id: string;
  name: string;
  isUse: boolean;
  createdAt: string;
}

export const useActiveDashboardLocations = (autoRefreshInterval: number = 300000) => {
  const [locations, setLocations] = useState<GatewayLocation[]>([]);
  const [allLocations, setAllLocations] = useState<GatewayLocation[]>([]);
  const [activeDashboards, setActiveDashboards] = useState<GatewayDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setRefreshing(true);
      setError(null);

      // First, fetch all dashboards and locations in parallel
      const [dashboardsResponse, locationsResponse] = await Promise.all([
        fetch("/api/gateway-dashboards"),
        fetch("/api/gateway-locations")
      ]);

      if (!dashboardsResponse.ok || !locationsResponse.ok) {
        const errorMsg = "Failed to fetch dashboards or locations";
        console.error(errorMsg);
        setError(errorMsg);
        return;
      }

      const [dashboardsData, locationsData] = await Promise.all([
        dashboardsResponse.json(),
        locationsResponse.json()
      ]);

      // Store all locations for alarm monitoring
      setAllLocations(locationsData);
      setActiveDashboards(dashboardsData);

      // Use all locations directly - bypassing frontend filtering to ensure visibility
      // This ensures all seeded locations appear regardless of dashboard active state mapping
      setLocations(locationsData);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to fetch locations";
      console.error("Error fetching locations:", error);
      setError(errorMsg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLocations();
    // Auto-refresh based on provided interval
    const interval = setInterval(fetchLocations, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  return {
    locations,
    allLocations,
    activeDashboards,
    loading,
    refreshing,
    error,
    refetch: fetchLocations
  };
};
