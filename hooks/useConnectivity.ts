"use client";

import { useState, useEffect } from "react";
import { useMqtt } from "@/contexts/MqttContext";

type Status = "connected" | "disconnected" | "connecting";

export function useConnectivity(topicsToSubscribe: string[]) {
  const {
    isReady,
    connectionStatus: mqttStatus,
    subscribe,
    unsubscribe,
  } = useMqtt();
  const [dbStatus, setDbStatus] = useState<Status>("connecting");
  const [payloads, setPayloads] = useState<Record<string, string>>({});

  // Cek Database (tidak berubah)
  useEffect(() => {
    const checkDb = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) setDbStatus("connected");
        else setDbStatus("disconnected");
      } catch (error) {
        setDbStatus("disconnected");
      }
    };
    checkDb();
    const interval = setInterval(checkDb, 30000);
    return () => clearInterval(interval);
  }, []);

  // Logika subscribe MQTT yang baru dan aman
  useEffect(() => {
    // Hanya jalankan subscribe jika provider sudah benar-benar siap
    if (!isReady) return;

    const handleMessage: (topic: string, payload: string) => void = (
      topic,
      payload
    ) => {
      if (topicsToSubscribe.includes(topic)) {
        setPayloads((prev) => ({ ...prev, [topic]: payload }));
      }
    };

    // Daftarkan listener untuk setiap topic
    topicsToSubscribe.forEach((topic) => subscribe(topic, handleMessage));

    // Cleanup: batalkan pendaftaran saat komponen unmount atau daftar topic berubah
    return () => {
      // Pastikan isReady juga saat unsubscribe
      if (isReady) {
        topicsToSubscribe.forEach((topic) => unsubscribe(topic, handleMessage));
      }
    };
  }, [topicsToSubscribe, subscribe, unsubscribe, isReady]); // Tambahkan isReady ke dependency

  return { dbStatus, mqttStatus, payloads };
}
