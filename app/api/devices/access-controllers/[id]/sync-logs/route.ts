// File: app/api/devices/access-controllers/[id]/sync-logs/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://52.74.91.79:1883";
const REQUEST_TIMEOUT = 15000; // Naikkan timeout menjadi 15 detik untuk jaga-jaga

// Fungsi untuk mengubah data JSON menjadi string CSV yang rapi
function convertJsonToCsv(logs: any[], controllerName: string) {
  if (!logs || logs.length === 0) {
    return "Timestamp,Device Name,Lock Address,Job ID,Username,Card Number,Method\nNo data available";
  }

  // Header untuk file CSV
  const headers = [
    "Timestamp",
    "Device Name",
    "Lock Address",
    "Job ID",
    "Username",
    "Card Number",
    "Method",
  ];

  // Ubah setiap objek log menjadi satu baris CSV
  const rows = logs.map((log) => {
    // Format timestamp agar mudah dibaca di Excel Indonesia
    const timestamp = new Date(log.timestamp)
      .toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(/\./g, ":");

    // Menggabungkan data dengan koma, pastikan teks diberi tanda kutip
    return [
      `"${timestamp}"`,
      `"${controllerName}"`,
      log.lockAddress,
      log.jobId,
      `"${log.username}"`,
      `"${log.cardNumber}"`,
      `"${log.method}"`,
    ].join(",");
  });

  // Gabungkan header dan semua baris data
  return [headers.join(","), ...rows].join("\n");
}

// Handler untuk POST, yang akan dipanggil oleh tombol "Export"
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // RBAC: require read permission for exporting/syncing logs
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }
  try {
    const controller = await prisma.accessController.findUnique({
      where: { id: params.id },
    });
    if (!controller) {
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    const commandTopic = "iot/door/command";
    const responseTopic = "iot/door/log_export";
    const allLogChunks: any[] = [];

    return new Promise((resolve) => {
      const client = mqtt.connect(MQTT_BROKER_URL);
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        client.end();
      };

      client.on("connect", () => {
        client.subscribe(responseTopic);
        client.publish(
          commandTopic,
          JSON.stringify({ command: "GET_ALL_LOGS" })
        );
      });

      client.on("message", (topic, payload) => {
        if (topic === responseTopic) {
          try {
            const chunk = JSON.parse(payload.toString());
            if (chunk.payload) {
              allLogChunks.push(...chunk.payload);
            }

            // Jika ini adalah chunk terakhir, proses dan kirim file
            if (chunk.isLast) {
              const csvData = convertJsonToCsv(allLogChunks, controller.name);
              const headers = new Headers();
              headers.set("Content-Type", "text/csv; charset=utf-8");
              headers.set(
                "Content-Disposition",
                `attachment; filename="logs_${controller.name.replace(
                  /\s+/g,
                  "_"
                )}_${new Date().toISOString().split("T")[0]}.csv"`
              );

              cleanup();
              resolve(new NextResponse(csvData, { headers }));
            }
          } catch (e) {
            cleanup();
            resolve(
              NextResponse.json(
                { error: "Invalid data from device" },
                { status: 500 }
              )
            );
          }
        }
      });

      client.on("error", (err) => {
        cleanup();
        resolve(
          NextResponse.json({ error: "MQTT connection error" }, { status: 500 })
        );
      });

      // Timeout jika ESP32 tidak merespon sama sekali
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(
          NextResponse.json(
            { error: "Request timed out, no response from device." },
            { status: 408 }
          )
        );
      }, REQUEST_TIMEOUT);
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
