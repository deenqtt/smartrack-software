import { NextRequest, NextResponse } from "next/server";
import { ruleChainAutoRunner } from "../../../../lib/rule-chain-auto-runner";
import { ruleChainMqttListener } from "../../../../lib/rule-chain/mqtt-listener";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * POST - Reload rule engine (reinitialize all schedules and MQTT subscriptions)
 * Called automatically after saving a rule chain to apply changes immediately
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("🔄 Forcefully reloading rule engine (MQTT + Timer schedules)...");

    // Force refresh both services directly. This is more reliable than the polling method.
    await Promise.all([
      ruleChainMqttListener.forceRefresh(),
      ruleChainAutoRunner.forceRun(),
    ]);

    console.log("✅ Rule engine reloaded successfully");

    return NextResponse.json({
      success: true,
      message:
        "Rule engine reloaded successfully.",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error requesting rule engine reload:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to request rule engine reload",
      },
      { status: 500 }
    );
  }
}
