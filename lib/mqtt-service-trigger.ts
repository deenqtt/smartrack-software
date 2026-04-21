// File: lib/mqtt-service-trigger.ts

import axios from "axios";
import crypto from "crypto";

// URL ini menunjuk ke service MQTT Anda yang berjalan di port 3001
const WEBHOOK_URL =
  process.env.MQTT_SERVICE_WEBHOOK_URL ||
  "http://localhost:3001/webhook/config-update";

// Secret ini harus SAMA PERSIS dengan yang ada di file .env service MQTT Anda
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

/**
 * Fungsi ini mengirimkan sinyal POST ke service MQTT.
 * Dibuat "fire-and-forget", artinya ia tidak akan memperlambat API utama Anda.
 */
export function triggerMqttServiceUpdate() {
  const body = { event: "config_updated", timestamp: new Date().toISOString() };

  // --- PERBAIKAN DI SINI ---
  // Mengganti "sha265" menjadi "sha256"
  const signature = WEBHOOK_SECRET
    ? crypto
        .createHmac("sha256", WEBHOOK_SECRET)
        .update(JSON.stringify(body))
        .digest("base64")
    : undefined;

  axios
    .post(WEBHOOK_URL, body, {
      headers: {
        ...(signature && { "x-webhook-hmac": signature }),
      },
    })
    .then(() => {
      console.log("Notifikasi update ke service MQTT berhasil dikirim.");
    })
    .catch((error) => {
      console.error(
        "Gagal mengirim notifikasi ke service MQTT:",
        error.message
      );
    });
}
