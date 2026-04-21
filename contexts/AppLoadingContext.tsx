"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface AppLoadingState {
  isAuthLoading: boolean;
  isMenuLoading: boolean;
  isMqttLoading: boolean;
  authError: string | null;
  menuError: string | null;
  mqttError: string | null;
  lastAuthCheck: number | null;
  lastMenuFetch: number | null;
}

interface AppLoadingContextType extends AppLoadingState {
  setAuthLoading: (loading: boolean) => void;
  setMenuLoading: (loading: boolean) => void;
  setMqttLoading: (loading: boolean) => void;
  setAuthError: (error: string | null) => void;
  setMenuError: (error: string | null) => void;
  setMqttError: (error: string | null) => void;
  updateAuthTimestamp: () => void;
  updateMenuTimestamp: () => void;
  isAppReady: boolean;
  resetAll: () => void;
}

const AppLoadingContext = createContext<AppLoadingContextType | undefined>(undefined);

const CACHE_DURATION = {
  AUTH: 5 * 60 * 1000,    // 5 minutes for auth checks
  MENU: 10 * 60 * 1000,   // 10 minutes for menu data
  MQTT: 30 * 60 * 1000,   // 30 minutes for MQTT connection
};

export function AppLoadingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppLoadingState>({
    isAuthLoading: true,
    isMenuLoading: false,
    isMqttLoading: false,
    authError: null,
    menuError: null,
    mqttError: null,
    lastAuthCheck: null,
    lastMenuFetch: null,
  });

  const setAuthLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isAuthLoading: loading }));
  }, []);

  const setMenuLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isMenuLoading: loading }));
  }, []);

  const setMqttLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isMqttLoading: loading }));
  }, []);

  const setAuthError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, authError: error }));
  }, []);

  const setMenuError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, menuError: error }));
  }, []);

  const setMqttError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, mqttError: error }));
  }, []);

  const updateAuthTimestamp = useCallback(() => {
    setState(prev => ({ ...prev, lastAuthCheck: Date.now() }));
  }, []);

  const updateMenuTimestamp = useCallback(() => {
    setState(prev => ({ ...prev, lastMenuFetch: Date.now() }));
  }, []);

  const resetAll = useCallback(() => {
    setState({
      isAuthLoading: true,
      isMenuLoading: false,
      isMqttLoading: false,
      authError: null,
      menuError: null,
      mqttError: null,
      lastAuthCheck: null,
      lastMenuFetch: null,
    });
  }, []);

  // Check if app is ready (auth loaded and no critical errors)
  const isAppReady = !state.isAuthLoading && !state.authError;

  const value: AppLoadingContextType = {
    ...state,
    setAuthLoading,
    setMenuLoading,
    setMqttLoading,
    setAuthError,
    setMenuError,
    setMqttError,
    updateAuthTimestamp,
    updateMenuTimestamp,
    isAppReady,
    resetAll,
  };

  return (
    <AppLoadingContext.Provider value={value}>
      {children}
    </AppLoadingContext.Provider>
  );
}

export function useAppLoading() {
  const context = useContext(AppLoadingContext);
  if (context === undefined) {
    throw new Error("useAppLoading must be used within an AppLoadingProvider");
  }
  return context;
}

// Hook to check if data needs refresh based on cache duration
export function useShouldRefresh(lastUpdate: number | null, cacheDuration: number): boolean {
  if (!lastUpdate) return true;
  return Date.now() - lastUpdate > cacheDuration;
}

// Hook for coordinated loading between contexts
export function useCoordinatedLoading() {
  const appLoading = useAppLoading();

  const shouldRefreshAuth = useShouldRefresh(appLoading.lastAuthCheck, CACHE_DURATION.AUTH);
  const shouldRefreshMenu = useShouldRefresh(appLoading.lastMenuFetch, CACHE_DURATION.MENU);

  return {
    ...appLoading,
    shouldRefreshAuth,
    shouldRefreshMenu,
    CACHE_DURATION,
  };
}
