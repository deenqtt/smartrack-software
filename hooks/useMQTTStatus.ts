// hooks/useMQTTStatus.ts
"use client";

import { useState, useEffect } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";

export function useMQTTStatus() {
  const { brokers } = useMqttServer();
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");

  useEffect(() => {
    const isConnected = brokers.some(b => b.status === 'connected');
    const isConnecting = brokers.some(b => b.status === 'connecting');
    const isError = brokers.some(b => b.status === 'error');

    if (isConnected) {
      setStatus("connected");
    } else if (isConnecting) {
      setStatus("connecting");
    } else if (isError) {
      setStatus("error");
    } else {
      setStatus("disconnected");
    }
  }, [brokers]);

  return status;
}