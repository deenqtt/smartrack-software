// File: app/api/cron/calculation-reload/route.ts
import { NextResponse } from "next/server";
import {
  getCalculationService,
  getCalculationServiceInstance,
} from "@/lib/services/calculation-service";
import { getMQTTServerStatus, getMQTTServerClients } from "@/lib/mqttClientServer";

/**
 * Ensure calculation service is initialized
 */
async function ensureCalculationServiceInitialized() {
  let service = getCalculationServiceInstance();

  if (!service) {
    console.log(
      "[CALC-API] ℹ️  Calculation Service not initialized, initializing now..."
    );
    service = getCalculationService();

    // Wait for initialization (max 3 seconds)
    let attempts = 0;
    while (!service.getStatus().initialized && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!service.getStatus().initialized) {
      throw new Error("Calculation Service initialization timeout");
    }
  }

  return service;
}

/**
 * POST - Request calculation service reload (untuk PUE, Bill, Power Analyzer)
 */
export async function POST() {
  try {
    console.log("[CALC-API] 🔄 Calculation service reload requested via API");

    const service = await ensureCalculationServiceInitialized();

    // Request reload
    service.requestReload();

    console.log("[CALC-API]  Calculation reload request queued successfully");

    return NextResponse.json({
      success: true,
      message:
        "Calculation service reload requested successfully. Will reload within 5 seconds.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[CALC-API] ❌ Error requesting calculation reload:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to request calculation reload",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check calculation service status
 */
export async function GET() {
  try {
    const service = await ensureCalculationServiceInitialized();
    const status = service.getStatus();
    const mqttStatus = getMQTTServerStatus();
    const mqttClients = getMQTTServerClients().map(c => ({
      id: c.id,
      name: c.config.name,
      brokerUrl: `ws${c.config.config.useSSL ? 's' : ''}://${c.config.config.brokerHost}:${c.config.config.brokerPort}`,
      connectedAt: c.connectedAt,
      subscribedTopics: c.topics.size,
    }));

    return NextResponse.json({
      ...status,
      mqttConnected: mqttStatus.connected > 0,
      mqttBrokers: {
        total: mqttStatus.total,
        connected: mqttStatus.connected,
        clients: mqttClients,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        initialized: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
