import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

// Store untuk throttle state (track last execution time per node)
const throttleStates = new Map<string, number>();

// Store untuk debounce timers
const debounceTimers = new Map<string, NodeJS.Timeout>();

export async function executeDelayNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  const { mode, duration, unit } = config;

  if (!mode || !duration) {
    console.warn(" Delay config incomplete");
    return {
      success: false,
      data: {
        error: "Delay configuration incomplete",
      },
    };
  }

  // Convert duration to milliseconds
  const durationMs =
    unit === "minutes" ? duration * 60 * 1000 : duration * 1000;
  const nodeId =
    context.executionPath?.[context.executionPath.length - 1]?.nodeId ||
    "unknown";

  try {
    switch (mode) {
      case "delay": {
        // Simple delay: wait X seconds/minutes then pass message
        await new Promise((resolve) => setTimeout(resolve, durationMs));

        return {
          success: true,
          data: currentPayload,
        };
      }

      case "throttle": {
        // Throttle: allow max 1 message per X seconds/minutes
        const now = Date.now();
        const lastExecution = throttleStates.get(nodeId) || 0;
        const timeSinceLastExecution = now - lastExecution;

        if (timeSinceLastExecution < durationMs) {
          const waitTime = durationMs - timeSinceLastExecution;

          return {
            success: false,
            data: {
              error: `Message throttled. Must wait ${waitTime}ms before next execution`,
            },
          };
        }

        // Update last execution time
        throttleStates.set(nodeId, now);

        return {
          success: true,
          data: currentPayload,
        };
      }

      case "debounce": {
        // Debounce: wait X seconds/minutes without new messages before passing

        // Clear existing timer if any
        const existingTimer = debounceTimers.get(nodeId);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // This is a bit tricky in an executor context because we can't actually
        // delay returning the result. In production, debounce would typically be
        // handled at the stream/subscription level, not at the execution level.
        // For now, we'll wait and then pass the message.

        await new Promise((resolve) => {
          const timer = setTimeout(() => {
            debounceTimers.delete(nodeId);
            resolve(null);
          }, durationMs);

          debounceTimers.set(nodeId, timer);
        });

        return {
          success: true,
          data: currentPayload,
        };
      }

      default:
        throw new Error(`Unknown delay mode: ${mode}`);
    }
  } catch (error: any) {
    console.error(" Delay execution failed:", error);
    throw new Error(`Delay failed: ${error.message}`);
  }
}
