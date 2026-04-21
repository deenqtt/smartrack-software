"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { toast } from "sonner";

export interface PalmUser {
  id: string;
  user_id: string;
  name?: string;
  email?: string;
  role?: string;
  registered_at?: string;
  last_access?: string;
  status?: "active" | "inactive" | "suspended";
  has_biometric?: boolean;
  rgb_feature_length?: number;
  ir_feature_length?: number;
}

export interface PalmUsersResponse {
  status: "success" | "error";
  message: string;
  request_id: string;
  data?: PalmUser[];
  count?: number;
  timestamp: string;
}

export function usePalmUserData() {
  const [users, setUsers] = useState<PalmUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set());

  // Use ref to avoid stale closure in handlers
  const pendingRequestsRef = useRef(pendingRequests);
  pendingRequestsRef.current = pendingRequests;

  // Store timeout IDs to clear them when responses are received
  const requestTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Debouncing for fetch operations
  const lastFetchTimeRef = useRef<number>(0);
  const FETCH_DEBOUNCE_MS = 100; // Minimum 100ms between fetch calls (very responsive)

  // MQTT context
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  /**
   * Fetch palm users from database with debouncing
   */
  const fetchUsers = useCallback(async (force = false) => {
    const now = Date.now();

    // Check debouncing unless forced
    if (!force && (now - lastFetchTimeRef.current) < FETCH_DEBOUNCE_MS) {
      return;
    }

    if (isLoading) {
      toast.warning("Please wait for the current fetch to complete");
      return;
    }

    // Update last fetch time
    lastFetchTimeRef.current = now;
    setIsLoading(true);

    try {
      // Generate unique request ID
      const requestId = `fetch_users_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const payload = JSON.stringify({
        command: "get_users",
        request_id: requestId,
        timestamp: new Date().toISOString()
      });

      // Add to pending requests
      setPendingRequests(prev => new Set(prev).add(requestId));

      // Send command via MQTT
      publish('palm/control', payload);

      // Set timeout for request (5 seconds - reduced from 10 seconds)
      const timeoutId = setTimeout(() => {
        setPendingRequests(prev => {
          if (prev.has(requestId)) {
            toast.error("User data fetch request timed out");
            setIsLoading(false);
            return new Set([...prev].filter(id => id !== requestId));
          }
          return prev;
        });
      }, 5000);

      // Store timeout ID to clear it when response is received
      requestTimeoutsRef.current.set(requestId, timeoutId);

    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch palm users");
      setIsLoading(false);
    }
  }, [isLoading, publish]);

  // Ref to store latest fetchUsers function to avoid stale closure
  const fetchUsersRef = useRef(fetchUsers);
  fetchUsersRef.current = fetchUsers;

  /**
   * Refresh user data (bypasses debouncing for manual refresh)
   */
  const refreshUsers = useCallback(async () => {
    await fetchUsers(true); // Force refresh, bypass debouncing
  }, [fetchUsers]);

  /**
   * Clear user data
   */
  const clearUsers = useCallback(() => {
    setUsers([]);
    setLastFetch(null);
    setPendingRequests(new Set());
  }, []);

  /**
   * Get user by ID
   */
  const getUserById = useCallback((userId: string): PalmUser | undefined => {
    return users.find(user => user.user_id === userId);
  }, [users]);

  /**
   * Search users by query
   */
  const searchUsers = useCallback((query: string): PalmUser[] => {
    if (!query.trim()) return users;

    const lowerQuery = query.toLowerCase();
    return users.filter(user =>
      user.user_id.toLowerCase().includes(lowerQuery) ||
      user.name?.toLowerCase().includes(lowerQuery) ||
      user.email?.toLowerCase().includes(lowerQuery)
    );
  }, [users]);

  /**
   * Update existing user
   */
  const updateUser = useCallback(async (userData: {
    user_id: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
  }) => {
    try {
      const payload = JSON.stringify({
        command: "update_user",
        ...userData,
        timestamp: new Date().toISOString()
      });

      publish('palm/control', payload);
      toast.success(`User ${userData.user_id} update request sent`);
      // Note: Data will be refreshed automatically when status response is received
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update user");
    }
  }, [publish]);

  /**
   * Delete user
   */
  const removeUser = useCallback(async (userId: string) => {
    try {
      const payload = JSON.stringify({
        command: "delete",
        user_id: userId,
        timestamp: new Date().toISOString()
      });

      publish('palm/control', payload);
      toast.success(`User ${userId} deletion request sent`);
      // Note: Data will be refreshed automatically when status response is received
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    }
  }, [publish]);

  // Set up response message handlers
  useEffect(() => {
    if (!isReady) return;

    const handleUserDataResponse = (topic: string, payload: string) => {
      try {
        const data: PalmUsersResponse = JSON.parse(payload);
        console.log("Received palm users response:", data);

        // Check if this is a response to one of our pending requests
        if (data.request_id && pendingRequestsRef.current.has(data.request_id)) {
          // Clear the timeout for this request
          const timeoutId = requestTimeoutsRef.current.get(data.request_id);
          if (timeoutId) {
            clearTimeout(timeoutId);
            requestTimeoutsRef.current.delete(data.request_id);
          }

          // Remove from pending requests
          setPendingRequests(prev => {
            const newSet = new Set(prev);
            newSet.delete(data.request_id);
            return newSet;
          });

          if (data.status === "success" && data.data) {
            setUsers(data.data);
            setLastFetch(new Date());
            toast.success(`Loaded ${data.data.length} palm users from database`);
          } else {
            toast.error(`Failed to fetch users: ${data.message}`);
          }

          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error parsing palm users response:", error);
        toast.error("Received invalid user data response");
        setIsLoading(false);
      }
    };

    const handlePalmStatusResponse = (topic: string, payload: string) => {
      try {
        const data = JSON.parse(payload);
        console.log("🔄 Received palm status response:", data);
        console.log("📊 Status:", data.status, "| Message:", data.message);

        // Handle status responses for CRUD operations ONLY
        // Do NOT refresh data for registration-related messages
        if (data.status === "ok" || data.status === "success") {
          const message = data.message || "";

          // Only refresh data for actual database operations, not registration setup
          if (message.includes("user successfully registered") ||
              message.includes("user deleted") ||
              message.includes("user updated") ||
              message.includes("user created")) {
            // For successful database operations, refresh the data immediately
            console.log("✅ Database operation successful, refreshing data immediately...");
            toast.success("Operation completed successfully - refreshing data...");

            // Refresh immediately without delay for better UX
            fetchUsersRef.current(true); // Force refresh, bypass debouncing
          } else if (message.includes("successfully set to regist mode")) {
            // Registration mode activated - do NOT refresh data, let registration complete
            console.log("📝 Registration mode activated - waiting for completion...");
          } else {
            // Other success messages - log but don't refresh
            console.log("ℹ️ Status message received:", message);
          }
        } else if (data.status === "error" || data.status === "failed") {
          // Show specific error message from backend
          const errorMessage = data.message || "Unknown error occurred";
          console.error("❌ Palm operation failed:", errorMessage);
          toast.error(`Operation failed: ${errorMessage}`);
        } else {
          console.log("⚠️ Unknown status received:", data.status);
        }
      } catch (error) {
        console.error("❌ Error parsing palm status response:", error);
        toast.error("Received invalid response from palm device");
      }
    };

    const handleRealtimeUpdate = (topic: string, payload: string) => {
      try {
        const data = JSON.parse(payload);
        console.log("Received real-time update:", data);

        if (data.type === "biometric_sync") {
          // Handle biometric data synchronization update
          const { phone_number, device_id, timestamp, message: updateMessage } = data;

          // Show real-time notification only - no automatic data refresh
          toast.success(`🔄 ${updateMessage}`, {
            description: `Device: ${device_id} | Time: ${new Date(timestamp).toLocaleTimeString()}`,
            duration: 5000,
          });

          // Note: User can manually refresh data using the refresh button if needed
        }
      } catch (error) {
        console.error("Error parsing real-time update:", error);
        toast.error("Received invalid real-time update");
      }
    };

    subscribe("palm/users/response", handleUserDataResponse);
    subscribe("palm/status", handlePalmStatusResponse);
    subscribe("palm/realtime/updates", handleRealtimeUpdate);

    return () => {
      unsubscribe("palm/users/response", handleUserDataResponse);
      unsubscribe("palm/status", handlePalmStatusResponse);
      unsubscribe("palm/realtime/updates", handleRealtimeUpdate);
    };
  }, [isReady, subscribe, unsubscribe, fetchUsers]);

  return {
    // State
    users,
    isLoading,
    lastFetch,
    hasData: users.length > 0,
    isOnline: isReady,

    // Functions
    fetchUsers,
    refreshUsers,
    clearUsers,
    getUserById,
    searchUsers,
    updateUser,
    removeUser,

    // Computed
    userCount: users.length,
    activeUsers: users.filter(user => user.status === "active").length,
    inactiveUsers: users.filter(user => user.status === "inactive").length,
  };
}
