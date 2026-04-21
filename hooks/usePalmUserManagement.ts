"use client";

import { useState, useCallback } from "react";
import { useMqtt } from "@/contexts/MqttContext";
import { toast } from "sonner";

export interface PalmStatusResponse {
  status: "ok" | "failed";
  message: string;
}

export function usePalmUserManagement() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastStatus, setLastStatus] = useState<PalmStatusResponse | null>(null);

  // MQTT context
  const { publish, subscribe, unsubscribe, isReady } = useMqtt();

  // Set up status handler
  const setupStatusHandler = useCallback(
    (onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      const handleStatus = (topic: string, payload: string) => {
        try {
          const data: PalmStatusResponse = JSON.parse(payload);

          setLastStatus(data);

          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(data);
          }

          // Show toast based on status
          if (data.status === "ok") {
            toast.success(data.message);
          } else {
            toast.error(`Palm operation failed: ${data.message}`);
          }
        } catch (error) {
          toast.error("Received invalid palm status message");
        }
      };

      subscribe("palm/status", handleStatus);

      // Return cleanup function
      return () => {
        unsubscribe("palm/status", handleStatus);
      };
    },
    [subscribe, unsubscribe]
  );

  /**
   * Register a palm user
   * @param userId - User ID to register
   * @param onStatusUpdate - Optional callback for status updates
   */
  const registerUser = useCallback(
    async (userId: string, onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      if (isProcessing) {
        toast.warning("Please wait for the current operation to complete");
        return;
      }

      if (!userId || userId.trim() === "") {
        toast.error("User ID is required");
        return;
      }

      setIsProcessing(true);
      setLastStatus(null);

      try {
        // Set up status handler for this operation
        const cleanup = setupStatusHandler((status: PalmStatusResponse) => {
          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          // Handle multi-step registration process
          if (status.status === "ok") {
            if (status.message.includes("successfully set to regist mode")) {
              // First step: Registration mode activated
              toast.info("Registration mode activated. Please place palm on sensor.");
            } else if (status.message.includes("user successfully registered")) {
              // Final step: Registration completed successfully
              toast.success(`User ${userId} registered successfully!`);
              setIsProcessing(false); // Only set to false on final success
              cleanup(); // Clean up the handler
            } else {
              // Other success messages
              toast.success(status.message);
            }
          } else {
            // Error status
            toast.error(`Registration failed: ${status.message}`);
            setIsProcessing(false); // Set to false on error
            cleanup(); // Clean up the handler
          }

          setLastStatus(status);
        });

        // Send registration command
        const payload = JSON.stringify({
          command: "regist",
          user_id: userId.trim()
        });

        publish('palm/control', payload);

        // Show initial info that command was sent
        toast.info(`Registration command sent for user: ${userId}`);

      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to register palm user");
        setIsProcessing(false);
      }
    },
    [isProcessing, setupStatusHandler, publish]
  );

  /**
   * Delete a palm user
   * @param userId - User ID to delete
   * @param onStatusUpdate - Optional callback for status updates
   */
  const deleteUser = useCallback(
    async (userId: string, onStatusUpdate?: (status: PalmStatusResponse) => void) => {
      if (isProcessing) {
        toast.warning("Please wait for the current operation to complete");
        return;
      }

      if (!userId || userId.trim() === "") {
        toast.error("User ID is required");
        return;
      }

      setIsProcessing(true);
      setLastStatus(null);

      try {
        // Set up status handler for this operation
        const cleanup = setupStatusHandler((status: PalmStatusResponse) => {
          // Call callback if provided
          if (onStatusUpdate) {
            onStatusUpdate(status);
          }

          // Handle deletion status
          if (status.status === "ok") {
            toast.success(`User ${userId} deleted successfully!`);
            setIsProcessing(false); // Set to false on success
            cleanup(); // Clean up the handler
          } else {
            // Error status
            toast.error(`Deletion failed: ${status.message}`);
            setIsProcessing(false); // Set to false on error
            cleanup(); // Clean up the handler
          }

          setLastStatus(status);
        });

        // Send deletion command
        const payload = JSON.stringify({
          command: "delete",
          user_id: userId.trim()
        });

        publish('palm/control', payload);

        // Show initial info that command was sent
        toast.info(`Delete command sent for user: ${userId}`);

      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to delete palm user");
        setIsProcessing(false);
      }
    },
    [isProcessing, setupStatusHandler, publish]
  );

  return {
    // State
    isProcessing,
    lastStatus,

    // Functions
    registerUser,
    deleteUser,
    setupStatusHandler,

    // Utilities
    clearStatus: useCallback(() => setLastStatus(null), []),
  };
}
