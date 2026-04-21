// File BARU: app/api/bill-logs/log-once/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Paho from "paho-mqtt";
import { getActiveServerConfigs } from "@/lib/mqtt-server-config";
import { getPahoConnectionOptions } from "@/lib/mqtt-utils";

// Fungsi helper untuk mengambil data MQTT sekali jalan
const getMqttDataOnce = (
  topic: string,
  key: string
): Promise<number | null> => {
  return new Promise(async (resolve, reject) => {
    try {
      // === NEW LOGIC: FETCH CONFIG FROM DB ===
      const serverConfigs = await getActiveServerConfigs();
      if (serverConfigs.length === 0) {
        throw new Error("No active MQTT server configurations found in database.");
      }
      const primaryConfig = serverConfigs[0]; // Use the first active config
      if (!primaryConfig.config) {
        throw new Error(`Configuration for server ${primaryConfig.name} is incomplete.`);
      }
      const connectionOptions = getPahoConnectionOptions(primaryConfig.config);
      // =======================================

      const client = new Paho.Client(
        primaryConfig.config.brokerHost,
        primaryConfig.config.brokerPort,
        `bill-log-once-${Date.now()}`
      );

      client.onMessageArrived = (message) => {
        try {
          const payload = JSON.parse(message.payloadString);
          // Flexible parsing for nested 'value'
          let innerValue = payload;
          if (payload.value && typeof payload.value === 'string') {
            innerValue = JSON.parse(payload.value);
          } else if (payload.value && typeof payload.value === 'object') {
            innerValue = payload.value;
          }

          const value = parseFloat(innerValue[key]);
          if (!isNaN(value)) {
            client.disconnect();
            resolve(value);
          }
        } catch (e) {
          // Ignore parse errors, wait for another message
        }
      };

      const finalConnectionOptions = {
        ...connectionOptions,
        onSuccess: () => {
          client.subscribe(topic);
          // Timeout if no data is received
          setTimeout(() => {
            if (client.isConnected()) {
              client.disconnect();
              resolve(null); // No data received
            }
          }, 3000);
        },
        onFailure: (err: any) => reject(new Error(err.errorMessage)),
        useSSL: primaryConfig.config.useSSL,
      };

      client.connect(finalConnectionOptions);

    } catch (error) {
      reject(error);
    }
  });
};

export async function POST(request: Request) {
  try {
    const { configId } = await request.json();
    if (!configId) {
      return NextResponse.json(
        { message: "Config ID is required" },
        { status: 400 }
      );
    }

    const config = await prisma.billConfiguration.findUnique({
      where: { id: configId },
      include: { sourceDevice: true },
    });

    if (!config) {
      return NextResponse.json(
        { message: "Configuration not found" },
        { status: 404 }
      );
    }

    const rawValue = await getMqttDataOnce(
      config.sourceDevice.topic,
      config.sourceDeviceKey
    );

    if (rawValue === null) {
      return NextResponse.json(
        { message: "No data received from MQTT source." },
        { status: 202 }
      );
    }

    const isEnergyKey = /wh|kwh|energy/i.test(config.sourceDeviceKey);
    const NOMINAL_VOLTAGE = 230;
    const INTERVAL_HOURS  = 5 / 60;
    const energyKwh = isEnergyKey
      ? rawValue / 1000
      : (NOMINAL_VOLTAGE * rawValue * INTERVAL_HOURS) / 1000;
    const rupiahCost = energyKwh * config.rupiahRatePerKwh;
    const dollarCost = energyKwh * config.dollarRatePerKwh;
    const carbonEmission = energyKwh * (config.carbonRateKgPerKwh || 0.87);

    const newLog = await prisma.billLog.create({
      data: {
        configId: config.id,
        rawValue,
        rupiahCost,
        dollarCost,
        carbonEmission,
      },
    });

    return NextResponse.json(newLog, { status: 201 });
  } catch (error: any) {
    console.error("Error logging once:", error);
    return NextResponse.json(
      { message: "Failed to create initial log.", error: error.message },
      { status: 500 }
    );
  }
}
