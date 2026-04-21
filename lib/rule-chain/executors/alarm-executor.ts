import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";
import { prisma } from "@/lib/prisma";

export async function executeAlarmNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  const { alarmType, customMessage } = config;

  if (!alarmType) {
    console.warn(" Alarm config incomplete");
    return {
      success: false,
      data: {
        error: "Alarm configuration incomplete",
      },
    };
  }

  try {
    // Extract the triggering value/reason from payload
    // Could be error message from failed node or just the payload itself
    let triggeringValue = customMessage || JSON.stringify(currentPayload);
    if (typeof currentPayload === "string") {
      triggeringValue = currentPayload;
    }

    // Note: Untuk rule chain triggered alarms, kita hanya send notifikasi
    // Tidak simpan ke AlarmLog karena AlarmLog requires alarmConfigId (FK constraint)
    // Rule chain alarms adalah event-based, bukan monitoring-based seperti AlarmConfiguration

    // Send notifications to all users (sama seperti basic notification di alarm-service)
    try {
      const allUsers = await prisma.user.findMany({
        select: { id: true },
      });

      if (allUsers.length > 0) {
        const severityIcons: Record<string, string> = {
          CRITICAL: "[OCTAGON]",
          MAJOR: "[TRIANGLE]",
          MINOR: "[INFO]",
        };
        const severityIcon = severityIcons[alarmType] || "[UNKNOWN]";

        const notificationMessage = `${severityIcon} **ALARM ${alarmType}** - ${customMessage || "Triggered from rule chain"}`;

        await prisma.notification.createMany({
          data: allUsers.map((user) => ({
            userId: user.id,
            message: notificationMessage,
          })),
          skipDuplicates: true,
        });
      }
    } catch (notificationError) {
      console.error("  Error sending notifications:", notificationError);
      // Don't fail the node just because notification failed
    }

    return {
      success: true,
      data: {
        alarmType,
        message: customMessage,
        triggeringValue: triggeringValue.substring(0, 100),
        triggeredAt: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error(" Alarm execution failed:", error);
    throw new Error(`Alarm trigger failed: ${error.message}`);
  }
}
