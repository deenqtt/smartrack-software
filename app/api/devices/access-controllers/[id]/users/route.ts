// File: app/api/devices/access-controllers/[id]/users/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import mqtt from "mqtt";

const MQTT_BROKER_URL =
  process.env.MQTT_BROKER_URL || "mqtt://52.74.91.79:1883";
const REQUEST_TIMEOUT = 10000; // 10 detik

// Helper untuk mendapatkan detail controller
async function getController(id: string) {
  const controller = await prisma.accessController.findUnique({
    where: { id },
  });
  if (!controller) {
    throw new Error("Controller not found");
  }
  return controller;
}

// 1. Handler untuk GET (Mengambil daftar pengguna dari ESP32)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const controller = await getController(params.id);
    const ipAddress = controller.ipAddress;

    // Topik unik untuk request dan response
    const requestTopic = `iot/door/request/${ipAddress}`;
    const responseTopic = `iot/door/data/users/${ipAddress}`;

    return new Promise((resolve) => {
      const client = mqtt.connect(MQTT_BROKER_URL);
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        client.end();
      };

      client.on("connect", () => {
        client.subscribe(responseTopic, (err) => {
          if (err) {
            cleanup();
            return resolve(
              NextResponse.json(
                { error: "MQTT subscribe failed" },
                { status: 500 }
              )
            );
          }
          // Kirim perintah ke ESP32
          client.publish(
            requestTopic,
            JSON.stringify({ command: "GET_USER_LIST" })
          );
        });
      });

      client.on("message", (topic, payload) => {
        if (topic === responseTopic) {
          try {
            const data = JSON.parse(payload.toString());
            cleanup();
            // Kirim data pengguna sebagai response
            resolve(NextResponse.json(data.payload?.payload || []));
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

      // Timeout jika ESP32 tidak merespon
      timeoutId = setTimeout(() => {
        cleanup();
        resolve(NextResponse.json([])); // Kirim array kosong jika timeout
      }, REQUEST_TIMEOUT);
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

// 2. Handler untuk POST (Menambah pengguna baru)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const controller = await getController(params.id);
    const body = await request.json();
    const targetTopic = `iot/door/command/user_management/${controller.ipAddress}`;

    const client = mqtt.connect(MQTT_BROKER_URL);
    client.on("connect", () => {
      const command = {
        command: "ADD_USER",
        payload: body,
      };
      client.publish(targetTopic, JSON.stringify(command), () => {
        client.end();
      });
    });

    return NextResponse.json({ message: "Add command sent" }, { status: 202 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}

// 3. Handler untuk DELETE (Menghapus pengguna)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const controller = await getController(params.id);
    const body = await request.json(); // Body akan berisi { "jobId": ... }
    const targetTopic = `iot/door/command/user_management/${controller.ipAddress}`;

    const client = mqtt.connect(MQTT_BROKER_URL);
    client.on("connect", () => {
      const command = {
        command: "DELETE_USER",
        payload: { jobId: body.jobId },
      };
      client.publish(targetTopic, JSON.stringify(command), () => {
        client.end();
      });
    });

    return NextResponse.json(
      { message: "Delete command sent" },
      { status: 202 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
}
