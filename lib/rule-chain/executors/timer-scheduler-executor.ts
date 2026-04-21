import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

/**
 * Check if start time has arrived for "once" type
 */
function isStartTimeReached(startDateTime: string): boolean {
  if (!startDateTime) {
    console.warn("     Missing startDateTime");
    return false;
  }

  const startTime = new Date(startDateTime);
  if (isNaN(startTime.getTime())) {
    console.warn(`     Invalid startDateTime: ${startDateTime}`);
    return false;
  }

  const now = new Date();
  const isReached = now >= startTime;
  const status = isReached ? "" : "⏳";
  console.log(
    `   ${status} Start time check: scheduled=${startTime.toISOString()}, now=${now.toISOString()}, reached=${isReached}`
  );

  return isReached;
}


/**
 * Check if weekly schedule condition is met and which output should be triggered
 * Returns: "start" | "end" | null
 *
 * Logic sama seperti "once" - tight window untuk prevent re-execution
 */
function checkWeeklyOutput(weeklyDays: boolean[], weeklyStartTime: string, weeklyEndTime: string): "start" | "end" | null {
  const now = new Date();
  const dayOfWeek = now.getDay();

  //  FIX: Check if day is in the array using index, not includes()
  const isCorrectDay = weeklyDays[dayOfWeek];

  if (!isCorrectDay) {
    console.log(
      `   ⏳ Weekly schedule: wrong day (current day=${dayOfWeek}, selected days=${weeklyDays})`
    );
    return null;
  }

  const [startHour, startMin] = weeklyStartTime.split(":").map(Number);
  const [endHour, endMin] = weeklyEndTime.split(":").map(Number);

  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMinutesOfDay = currentHour * 60 + currentMin;
  const startMinutesOfDay = startHour * 60 + startMin;
  const endMinutesOfDay = endHour * 60 + endMin;

  //  Use TIGHT window (like "once") - EXACTLY at the scheduled time, max 2 minutes after
  // This prevents re-execution on app restart or cron reruns
  const executeWindow = 2; // 2 minutes window (MINUTES, not seconds!)

  //  CHECK END TIME FIRST to avoid overlap with start window
  // If we're past start time + window, check if at end time
  const isAtEndTime =
    currentMinutesOfDay >= endMinutesOfDay &&
    currentMinutesOfDay < endMinutesOfDay + executeWindow;

  if (isAtEndTime) {
    const timeOffset = currentMinutesOfDay - endMinutesOfDay;
    console.log(
      `    Weekly schedule: END TIME reached (current=${currentHour}:${String(currentMin).padStart(2, "0")}, end=${weeklyEndTime}, offset=${timeOffset}min)`
    );
    return "end";
  }

  // Check if at START time (within tight window)
  const isAtStartTime =
    currentMinutesOfDay >= startMinutesOfDay &&
    currentMinutesOfDay < startMinutesOfDay + executeWindow;

  if (isAtStartTime) {
    const timeOffset = currentMinutesOfDay - startMinutesOfDay;
    console.log(
      `    Weekly schedule: START TIME reached (current=${currentHour}:${String(currentMin).padStart(2, "0")}, start=${weeklyStartTime}, offset=${timeOffset}min)`
    );
    return "start";
  }

  // If time has passed and outside window → EXPIRED
  if (currentMinutesOfDay >= endMinutesOfDay + executeWindow) {
    console.log(
      `   ⏳ Weekly schedule: END TIME expired (current=${currentHour}:${String(currentMin).padStart(2, "0")}, end=${weeklyEndTime}, too late by ${currentMinutesOfDay - endMinutesOfDay}min)`
    );
    return null;
  }

  if (currentMinutesOfDay >= startMinutesOfDay + executeWindow &&
      currentMinutesOfDay < endMinutesOfDay) {
    console.log(
      `   ⏳ Weekly schedule: Between start and end but outside execution windows (current=${currentHour}:${String(currentMin).padStart(2, "0")}, window=${weeklyStartTime}-${weeklyEndTime})`
    );
    return null;
  }

  // Outside execution windows
  const dayNames = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  const currentDayName = dayNames[dayOfWeek];
  console.log(
    `   ⏳ Weekly schedule: ${currentDayName} but outside time windows (current=${currentHour}:${String(currentMin).padStart(2, "0")}, window=${weeklyStartTime}-${weeklyEndTime})`
  );
  return null;
}

/**
 * Generate readable label from config for logging
 */
function generateTimerLabel(config: any): string {
  const { scheduleType } = config;

  switch (scheduleType) {
    case "once":
      return `Timer: Once ${new Date(config.startDateTime).toLocaleString()}`;
    case "interval":
      return `Timer: Every ${config.intervalValue} ${config.intervalUnit}`;
    case "weekly":
      const selectedDays = config.weeklyDays
        ?.map((selected: boolean, index: number) => {
          const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
          return selected ? days[index] : null;
        })
        .filter(Boolean)
        .join(", ");
      return `Timer: Weekly ${selectedDays} (${config.weeklyStartTime}-${config.weeklyEndTime})`;
    default:
      return "Timer: Unknown";
  }
}

export async function executeTimerSchedulerNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine
): Promise<NodeExecutionResult> {
  const { scheduleType } = config;
  const timerLabel = generateTimerLabel(config);

  console.log(`⏰ Timer/Scheduler "${timerLabel}" triggered (${scheduleType})`);

  const now = new Date();
  let timerPayload: any = {
    timestamp: Date.now(),
    timerName: timerLabel,
    triggeredAt: now.toISOString(),
    scheduleType,
  };

  switch (scheduleType) {
    case "once": {
      const { startDateTime } = config;

      if (!startDateTime) {
        console.warn(`     Missing startDateTime`);
        return {
          success: false,
          data: {
            error: "Missing startDateTime configuration",
          },
        };
      }

      // Parse local datetime string (e.g., "2025-12-03T17:03")
      // JavaScript's Date constructor treats it as UTC, but we want it as local time
      // So we need to adjust for the timezone offset
      const [datePart, timePart] = startDateTime.split('T');
      if (!datePart || !timePart) {
        console.warn(`     Invalid startDateTime format: ${startDateTime}`);
        return {
          success: false,
          data: {
            error: "Invalid startDateTime format",
            startDateTime,
          },
        };
      }

      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);

      // Create a Date assuming these are UTC components
      const dateUTC = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));

      // Adjust for timezone offset to get the actual local time the user meant
      // For UTC+7: getTimezoneOffset() returns -420 (negative)
      // So we ADD the offset (which is negative) to subtract 7 hours
      const offsetMs = now.getTimezoneOffset() * 60000;
      const startTime = new Date(dateUTC.getTime() + offsetMs);

      const timeDiff = now.getTime() - startTime.getTime();
      const afterWindow = 2 * 60 * 1000; // 2 minutes after (tight window like weekly)

      console.log(
        `   ⏰ ONCE timer time check: scheduled=${startTime.toLocaleString()}, now=${now.toLocaleString()}, diff=${Math.floor(timeDiff / 1000)}s`
      );

      // Only execute AT or AFTER the scheduled time (timeDiff >= 0)
      if (timeDiff < 0) {
        console.log(`    Start time not reached yet (${Math.floor(Math.abs(timeDiff) / 1000)}s remaining)`);
        return {
          success: false,
          data: {
            error: "Timer start time not reached yet",
            startDateTime,
            currentTime: now.toLocaleString(),
            timeRemaining: `${Math.floor(Math.abs(timeDiff) / 1000)}s`,
          },
        };
      }

      if (timeDiff > afterWindow) {
        console.log(`    One-time timer EXPIRED (more than 2 minutes have passed since ${startDateTime})`);
        return {
          success: false,
          data: {
            error: "One-time timer already expired",
            startDateTime,
            expiredBy: `${Math.floor(timeDiff / 1000)} seconds`,
            currentTime: now.toLocaleString(),
          },
        };
      }

      console.log(`    One-time execution within tight window (${timeDiff / 1000}s since scheduled)`);
      timerPayload.startDateTime = startDateTime;
      break;
    }

    case "interval": {
      const { intervalValue, intervalUnit } = config;

      if (!intervalValue || !intervalUnit) {
        console.warn(`     Missing interval configuration`);
        return {
          success: false,
          data: {
            error: "Interval configuration incomplete",
            intervalValue,
            intervalUnit,
          },
        };
      }

      if (intervalValue <= 0) {
        console.warn(`     Invalid interval value: ${intervalValue}`);
        return {
          success: false,
          data: {
            error: "Interval value must be greater than 0",
            intervalValue,
          },
        };
      }

      console.log(`    Interval schedule (every ${intervalValue} ${intervalUnit}): ready to trigger`);

      timerPayload.intervalValue = intervalValue;
      timerPayload.intervalUnit = intervalUnit;
      break;
    }

    case "weekly": {
      const { weeklyDays, weeklyStartTime, weeklyEndTime } = config;

      // Validate configuration
      if (!weeklyDays || !Array.isArray(weeklyDays) || weeklyDays.length !== 7) {
        console.warn(`     Invalid weeklyDays configuration`);
        return {
          success: false,
          data: {
            error: "Weekly days configuration invalid",
            weeklyDays,
          },
        };
      }

      if (!weeklyStartTime || !weeklyEndTime) {
        console.warn(`     Missing start/end time configuration`);
        return {
          success: false,
          data: {
            error: "Weekly start/end time configuration incomplete",
            weeklyStartTime,
            weeklyEndTime,
          },
        };
      }

      if (!weeklyDays.some((day) => day === true)) {
        console.warn(`     No days selected for weekly schedule`);
        return {
          success: false,
          data: {
            error: "At least one day must be selected for weekly schedule",
            weeklyDays,
          },
        };
      }

      // Check which output should be triggered (start or end)
      const outputType = checkWeeklyOutput(weeklyDays, weeklyStartTime, weeklyEndTime);

      if (!outputType) {
        console.log(`   ⏳ Weekly schedule condition not met at this moment`);
        return {
          success: false,
          data: {
            error: "Weekly schedule condition not met",
            currentTime: now.toISOString(),
            currentDay: now.getDay(),
            currentTime_HHmm: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
          },
        };
      }

      console.log(`    Weekly schedule condition MET, triggering ${outputType} output`);
      timerPayload.weeklyDays = weeklyDays;
      timerPayload.weeklyStartTime = weeklyStartTime;
      timerPayload.weeklyEndTime = weeklyEndTime;
      timerPayload.outputType = outputType; // "start" or "end"
      break;
    }

    default:
      console.warn(`     Unknown schedule type: ${scheduleType}`);
      return {
        success: false,
        data: {
          error: `Unknown schedule type: ${scheduleType}`,
          scheduleType,
          availableTypes: ["once", "interval", "weekly"],
        },
      };
  }

  console.log(`    Timer execution successful`);
  console.log(`   📤 Timer payload:`, JSON.stringify(timerPayload, null, 2));

  // Return the timer payload to continue the rule chain
  return {
    success: true,
    data: timerPayload,
  };
}
