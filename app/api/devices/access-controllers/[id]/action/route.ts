// File: app/api/devices/access-controllers/[id]/action/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://52.74.91.79:1883";

// Handler untuk POST yang akan menerima semua jenis perintah perangkat
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Ambil detail controller dari database untuk mendapatkan IP Address
    const controller = await prisma.accessController.findUnique({
      where: { id: params.id },
    });

    if (!controller) {
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    // 2. Ambil command dan payload dari body request
    const body = await request.json();
    const { command, payload } = body;

    if (!command) {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 }
      );
    }

    // 3. Tentukan topik MQTT tujuan
    const targetTopic = `iot/door/command/device_action/${controller.ipAddress}`;

    // 4. Hubungkan ke MQTT dan kirim perintah
    const client = mqtt.connect(MQTT_BROKER_URL);

    return new Promise((resolve) => {
      client.on("connect", () => {
        const message = JSON.stringify({
          command,
          payload, // Payload bisa berisi apa saja, misal: { currentAddress: 1, newAddress: 5 }
        });

        client.publish(targetTopic, message, (err) => {
          client.end();
          if (err) {
            console.error("[API Action] Gagal mengirim perintah:", err);
            // Jika gagal, kirim response error
            resolve(
              NextResponse.json(
                { error: "Failed to publish MQTT command" },
                { status: 500 }
              )
            );
          } else {
            // Jika berhasil, kirim response sukses
            resolve(
              NextResponse.json(
                { message: `Command '${command}' sent successfully.` },
                { status: 202 }
              )
            );
          }
        });
      });

      client.on("error", (err) => {
        console.error("[API Action] Gagal terhubung ke MQTT:", err);
        client.end();
        resolve(
          NextResponse.json({ error: "MQTT connection error" }, { status: 500 })
        );
      });
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
