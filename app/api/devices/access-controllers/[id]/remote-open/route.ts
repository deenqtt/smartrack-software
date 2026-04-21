// Lokasi: src/app/api/devices/access-controllers/[id]/remote-open/route.ts

import { NextResponse } from "next/server";
import mqtt from "mqtt";
import { prisma } from "@/lib/prisma";


// Detail koneksi MQTT, bisa juga ditaruh di .env
const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://52.74.91.79:1883";
const MQTT_USERNAME = process.env.MQTT_USERNAME || "";
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || "";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const controllerId = params.id;

  try {
    // 1. Ambil data dari body dan database
    const { lockAddress } = await request.json();
    if (typeof lockAddress !== "number") {
      return NextResponse.json(
        { error: "Invalid lockAddress provided." },
        { status: 400 }
      );
    }

    const controller = await prisma.accessController.findUnique({
      where: { id: controllerId },
    });

    if (!controller) {
      return NextResponse.json(
        { error: "Access controller not found." },
        { status: 404 }
      );
    }

    if (controller.status !== "online") {
      return NextResponse.json(
        { error: "Controller is offline. Cannot send command." },
        { status: 400 }
      );
    }

    // 2. Buat koneksi MQTT baru untuk request ini
    const client = mqtt.connect(MQTT_BROKER_URL, {
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clientId: `api-remote-open-${Math.random().toString(16).slice(2, 8)}`,
    });

    // Siapkan topik dan pesan
    const topic = `iot/door/command/${controller.ipAddress}`;
    const message = JSON.stringify({ lockAddress });

    // 3. Kirim perintah setelah terhubung
    return new Promise((resolve) => {
      client.on("connect", () => {
        console.log(`[Remote Open API] Connected to MQTT to send command.`);
        client.publish(topic, message, (err) => {
          client.end(); // Tutup koneksi setelah selesai publish
          if (err) {
            console.error("[Remote Open API] MQTT publish error:", err);
            resolve(
              NextResponse.json(
                { error: "Failed to send command via MQTT." },
                { status: 500 }
              )
            );
          } else {
            console.log(`[Remote Open API] Command sent to topic: ${topic}`);
            resolve(
              NextResponse.json({
                message: `Unlock command sent successfully to lock ${lockAddress}.`,
              })
            );
          }
        });
      });

      client.on("error", (err) => {
        console.error("[Remote Open API] MQTT connection error:", err);
        client.end();
        resolve(
          NextResponse.json({ error: "MQTT connection error" }, { status: 500 })
        );
      });
    });
  } catch (error) {
    console.error("[Remote Open API] Internal server error:", error);
    return NextResponse.json(
      { error: "An internal server error occurred." },
      { status: 500 }
    );
  }
}
