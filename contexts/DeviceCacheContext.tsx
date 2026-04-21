"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface DeviceForSelection {
  uniqId: string;
  name: string;
  topic: string;
}

interface DeviceCacheContextType {
  devices: DeviceForSelection[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  searchDevices: (query: string) => DeviceForSelection[];
}

const DeviceCacheContext = createContext<DeviceCacheContextType | null>(null);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const DeviceCacheProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devices, setDevices] = useState<DeviceForSelection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  // ✅ PRELOAD devices saat context pertama kali load
  useEffect(() => {
    fetchDevices(true); // Silent preload
  }, []);

  const fetchDevices = useCallback(async (silent = false) => {
    // ✅ CACHE CHECK: Don't fetch if data is fresh (< 5 minutes)
    const now = Date.now();
    if (!silent && now - lastFetch < 5 * 60 * 1000 && devices.length > 0) {
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/devices/for-selection`, {
        // ✅ USE CACHE if available
        cache: 'default',
      });

      if (!response.ok) throw new Error('Failed to fetch devices');

      const data = await response.json();
      setDevices(data);
      setLastFetch(now);
    } catch (err: any) {
      setError(err.message);
      console.error('Device cache error:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [devices.length, lastFetch]);

  const searchDevices = useCallback((query: string) => {
    if (!query.trim()) return devices;

    const lowerQuery = query.toLowerCase();
    return devices.filter(device =>
      device.name.toLowerCase().includes(lowerQuery) ||
      device.uniqId.toLowerCase().includes(lowerQuery)
    );
  }, [devices]);

  const value: DeviceCacheContextType = {
    devices,
    loading,
    error,
    refresh: () => fetchDevices(false),
    searchDevices,
  };

  return (
    <DeviceCacheContext.Provider value={value}>
      {children}
    </DeviceCacheContext.Provider>
  );
};

export const useDeviceCache = () => {
  const context = useContext(DeviceCacheContext);
  if (!context) {
    throw new Error('useDeviceCache must be used within DeviceCacheProvider');
  }
  return context;
};
