import { NextRequest, NextResponse } from "next/server";
import { ruleChainMqttListener } from "../../../../lib/rule-chain/mqtt-listener";
import { ruleChainAutoRunner } from "../../../../lib/rule-chain-auto-runner";

// GET - Get combined status of MQTT listener and auto-runner
export async function GET(request: NextRequest) {
  try {
    const mqttStatus = ruleChainMqttListener.getStatus();
    const autoRunnerStats = ruleChainAutoRunner.getStats();

    return NextResponse.json({
      success: true,
      mqttListener: mqttStatus,
      autoRunner: autoRunnerStats,
      summary: {
        totalActiveRuleChains: mqttStatus.totalRuleChains,
        totalMqttTopics: mqttStatus.totalTopics,
        scheduledJobs: autoRunnerStats.scheduledJobs,
        executionsToday: autoRunnerStats.executionsToday,
        errorsToday: autoRunnerStats.errorsToday,
      },
    });
  } catch (error: any) {
    console.error("Error getting system status:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to get system status",
      },
      { status: 500 }
    );
  }
}

// POST - Force refresh both MQTT subscriptions and timer schedules
export async function POST(request: NextRequest) {
  try {
    console.log(
      "🔄 Force refreshing MQTT subscriptions and timer schedules..."
    );

    // Refresh MQTT listener and reinitialize auto-runner schedules
    await Promise.all([
      ruleChainMqttListener.forceRefresh(),
      ruleChainAutoRunner.forceRun(),
    ]);

    return NextResponse.json({
      success: true,
      message: "MQTT subscriptions and timer schedules refreshed successfully",
    });
  } catch (error: any) {
    console.error("Error refreshing systems:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to refresh systems",
      },
      { status: 500 }
    );
  }
}
