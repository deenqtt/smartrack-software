"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
import type { Role } from "@prisma/client";
import type { MenuItemWithPermissions, MenuGroupWithItems } from "@/lib/types/menu";
import { useRouter, usePathname } from "next/navigation";
import { showToast } from "@/lib/toast-utils";
import { useAppLoading } from "./AppLoadingContext";

interface User {
  userId: string;
  role: Role | "PREVIEW";
  email: string;
  isPreview?: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isLoggingOut: boolean; //  Tambah prop untuk logout loading state
  loginTime: Date | null; // Track actual login time
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  clearSessionCheck: () => void;
  performAutoLogout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false); //  Tambah state untuk logout loading
  const [loginTime, setLoginTime] = useState<Date | null>(null); // Track actual login time
  const [sessionTimeoutRef, setSessionTimeoutRef] = useState<NodeJS.Timeout | null>(null);
  const [hasRedirectedAfterLogin, setHasRedirectedAfterLogin] = useState(false);
  const [isLoginRedirecting, setIsLoginRedirecting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Use shared loading context for coordination
  const {
    setAuthLoading,
    setAuthError,
    updateAuthTimestamp,
    resetAll
  } = useAppLoading();

  // Auto logout function for session expiration
  const performAutoLogout = useCallback(() => {
    clearSessionCheck();
    setUser(null);
    setIsLoading(false);

    showToast.error("Session Expired", "Please login again.");
    router.push("/login");
  }, [router]);

  // Function to clear session check timeout
  const clearSessionCheck = useCallback(() => {
    if (sessionTimeoutRef) {
      clearTimeout(sessionTimeoutRef);
      setSessionTimeoutRef(null);
    }
  }, [sessionTimeoutRef]);

  // Setup session check based on JWT expiration
  const setupSessionCheck = useCallback(() => {
    if (!user) return;

    clearSessionCheck();

    // Use 30 days if rememberMe was true, otherwise fallback to 24h or env var
    // Ideally we should decode the actual JWT, but for now we follow the business logic
    const jwtExpiration = process.env.NEXT_PUBLIC_JWT_EXPIRATION
      ? parseInt(process.env.NEXT_PUBLIC_JWT_EXPIRATION) * 1000
      : 30 * 24 * 60 * 60 * 1000; // Default to 30 days matching our new default

    const timeout = setTimeout(() => {
      performAutoLogout();
    }, jwtExpiration);

    setSessionTimeoutRef(timeout);
  }, [user, clearSessionCheck, performAutoLogout]);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    try {
      setAuthLoading(true);
      setAuthError(null);
      setIsLoading(true);

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, rememberMe }),
        credentials: 'include' // Ensure cookies are included
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Retry mechanism for session verification with exponential backoff
      let retries = 0;
      const maxRetries = 5;
      const baseDelay = 200; // Increased base delay

      const verifySession = async (): Promise<void> => {
        try {
          const meResponse = await fetch("/api/auth/me", {
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache' },
            credentials: 'include'
          });

          if (meResponse.ok) {
            const userData = await meResponse.json();

            if (userData.userId && userData.email) {
              // Set user state - React state updates are synchronous within the same render cycle
              setUser({
                userId: userData.userId,
                email: userData.email,
                role: userData.role,
                isPreview: userData.isPreview === true,
              });

              // Update shared loading context
              updateAuthTimestamp();
              setAuthLoading(false);
              setAuthError(null);

              // Setup session expiration check
              setupSessionCheck();

              showToast.success("Login Successful", "Welcome back!");

              return;
            } else {
              throw new Error("Invalid user data received");
            }
          } else {
            throw new Error("Failed to get user session");
          }
        } catch (err) {
          if (retries < maxRetries - 1) {
            retries++;
            const delay = baseDelay * Math.pow(2, retries); // Exponential backoff
            setTimeout(verifySession, delay);
          } else {
            showToast.error("Session Verification Failed", "Please try again or refresh the page.");
            setUser(null);
            setAuthLoading(false);
            setAuthError("Session verification failed");
            setIsLoading(false);
          }
        }
      };

      // Start initial verification attempt after base delay
      setTimeout(verifySession, baseDelay);

      // Clear loading state after verification starts
      setTimeout(() => {
        setIsLoading(false);
      }, baseDelay + 100); // Clear loading shortly after verification starts

    } catch (error: any) {
      setAuthError(error.message);
      setAuthLoading(false);
      showToast.error("Login Failed", error.message || "Please check your credentials.");
      setIsLoading(false);
      throw error;
    }
  }, [router, setupSessionCheck, setAuthLoading, setAuthError, updateAuthTimestamp]);

  const logout = useCallback(async () => {
    // 🔄 Set loading state BEFORE any operations
    setIsLoggingOut(true);

    try {
      // First clear the server-side session
      const logoutResponse = await fetch("/api/auth/logout", {
        method: "POST",
        headers: { 'Cache-Control': 'no-cache' },
        credentials: "include"
      });

      if (!logoutResponse.ok) {
        console.warn("[Auth] Logout API call failed, but proceeding with client-side cleanup");
      }

      // Wait a brief moment to ensure cookie is cleared server-side
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.warn("[Auth] Logout API error, proceeding with client-side cleanup:", error);
    }

    // Clear state immediately for instant UI feedback
    clearSessionCheck();
    setUser(null);
    setLoginTime(null); // Clear login time
    setIsLoading(false);
    setIsLoggingOut(false); // 🔄 Clear logout loading
    setHasRedirectedAfterLogin(false); // Reset login redirect flag
    setIsLoginRedirecting(false); // Reset login redirecting flag

    showToast.success("Logged Out", "You have been successfully logged out.");

    // Force full page reload to login for clean state
    window.location.href = "/login";
  }, [clearSessionCheck]);

  // Load user from existing session on app start
  const loadUserFromCookie = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { 'Cache-Control': 'no-cache' },
        credentials: 'include'
      });

      if (res.ok) {
        const userData = await res.json();

        if (userData.userId && userData.email) {
          setUser({
            userId: userData.userId,
            email: userData.email,
            role: userData.role,
            isPreview: userData.isPreview === true,
          });

          // Update shared loading context
          updateAuthTimestamp();
          setAuthLoading(false);
          setAuthError(null);

          // Set login time to current time for existing sessions
          setLoginTime(new Date());

          // Setup session check for existing session
          // setTimeout(() => setupSessionCheck(), 100); // Small delay to ensure state is set
        } else {
          setUser(null);
          setAuthLoading(false);
          setAuthError(null);
        }
      } else {
        setUser(null);
        setAuthLoading(false);
        setAuthError(null);
      }
    } catch (error) {
      setUser(null);
      setAuthLoading(false);
      setAuthError("Failed to load user session");
    } finally {
      setIsLoading(false);
    }
  }, [setupSessionCheck, updateAuthTimestamp, setAuthLoading, setAuthError]);

  // Load user on mount and route changes
  useEffect(() => {
    loadUserFromCookie();
  }, []);

  // Disable unauthorized access checks during login flow
  // This prevents conflicts between login redirects and auth checks
  useEffect(() => {
    if (!user && !isLoading && pathname !== '/login' && pathname !== '/register' && pathname !== '/license-required' && !pathname.startsWith('/api/') && !pathname.startsWith('/preview')) {
      router.push('/login');
    }
  }, [user, isLoading, pathname, router]);

  useEffect(() => {
    if (!user || isLoading || !user.isPreview) return;

    if (pathname.startsWith('/api/') || pathname.startsWith('/preview')) {
      return;
    }

    if (pathname !== '/login' && pathname !== '/register' && pathname !== '/license-required') {
      router.replace('/preview');
    }
  }, [user, isLoading, pathname, router]);

  // Handle navigation after user state is set - SIMPLIFIED APPROACH
  useEffect(() => {
    // Only redirect if user is authenticated AND we're on login page
    // Don't use complex flags - the pathname check handles the race condition
    if (user && !isLoading && !user.isPreview && pathname === '/login') {
      // No delay - make it instant
      router.replace("/");
    }
  }, [user, isLoading, pathname, router]);

  // Setup/clean session check when user changes - FIXED INFINITE LOOP
  useEffect(() => {
    if (user && !isLoading) {
      setupSessionCheck();
    } else {
      clearSessionCheck();
    }
  }, [user, isLoading]); // Removed function dependencies to prevent infinite loop

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSessionCheck();
    };
  }, [clearSessionCheck]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isLoggingOut,
    loginTime,
    login,
    logout,
    clearSessionCheck,
    performAutoLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
