// File: app/api/cron/reload/route.ts
import { NextResponse } from "next/server";
import {
  getLoggingSchedulerService,
  getLoggingSchedulerInstance,
} from "@/lib/services/logging-scheduler";

/**
 * Ensure scheduler is initialized
 */
async function ensureSchedulerInitialized() {
  let scheduler = getLoggingSchedulerInstance();

  if (!scheduler) {
    console.log("[API] ℹ️  Scheduler not initialized, initializing now...");
    scheduler = getLoggingSchedulerService();

    // Wait for initialization (max 10 seconds)
    let attempts = 0;
    while (attempts < 100) {
      const status = await scheduler.getStatus();
      if (status.initialized) break;

      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    const finalStatus = await scheduler.getStatus();
    if (!finalStatus.initialized) {
      throw new Error("Scheduler initialization timeout");
    }
  }

  return scheduler;
}

/**
 * POST - Request scheduler reload
 */
export async function POST() {
  try {
    console.log("[API] 🔄 Cron reload requested via API");

    const scheduler = await ensureSchedulerInitialized();

    // Request reload
    scheduler.requestReload();

    console.log("[API]  Reload request queued successfully");

    return NextResponse.json({
      success: true,
      message: "Reload requested successfully. Will reload within 5 seconds.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[API] ❌ Error requesting reload:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to request reload",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Check scheduler status
 */
export async function GET() {
  try {
    const scheduler = await ensureSchedulerInitialized();
    const status = await scheduler.getStatus();

    return NextResponse.json({
      initialized: status.initialized,
      activeTimers: status.activeTimers,
      configs: status.configs,
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
