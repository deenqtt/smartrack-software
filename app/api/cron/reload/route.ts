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
 * GET - Check scheduler status or run debug operations
 */
export async function GET(request: Request) {
  try {
    // Check for debug parameter
    const url = new URL(request.url);
    const action = url.searchParams.get('action');
    const configId = url.searchParams.get('configId');

    // Public access for monitoring - no authentication required
    // This allows automated monitoring systems to check scheduler status

    const scheduler = await ensureSchedulerInitialized();

    // Handle different debug actions
    switch (action) {
      case 'debug':
        console.log("[API] 🔍 Running comprehensive scheduler debug...");
        const debugResult = await scheduler.debugScheduler();
        return NextResponse.json(debugResult);

      case 'test-config':
        if (!configId) {
          return NextResponse.json(
            { error: "configId parameter required for test-config action" },
            { status: 400 }
          );
        }
        console.log(`[API] 🧪 Testing config: ${configId}`);
        const testResult = await scheduler.debugTestConfig(configId);
        return NextResponse.json(testResult);

      case 'reload':
        console.log("[API] 🔄 Force reloading configurations...");
        const reloadResult = await scheduler.debugForceReload();
        return NextResponse.json(reloadResult);

      case 'timers':
        console.log("[API] ⏰ Getting timer details...");
        const timerDetails = scheduler.debugGetTimerDetails();
        return NextResponse.json(timerDetails);

      default:
        // Default status check
        const status = await scheduler.getStatus();
        return NextResponse.json({
          initialized: status.initialized,
          activeTimers: status.activeTimers,
          configs: status.configs,
          timestamp: new Date().toISOString(),
        });
    }
  } catch (error: any) {
    console.error("[API] ❌ Error in GET /api/cron/reload:", error);
    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
