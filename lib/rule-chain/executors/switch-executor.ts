import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

interface Operand {
  type: "deviceField" | "staticValue";
  deviceName?: string;
  deviceUniqId?: string;
  key?: string;
  value?: any;
}

interface SwitchCase {
  id: string;
  label: string;
  operator: string;
  rightOperand: Operand;
}

interface SwitchConfig {
  leftOperand?: Operand;
  cases: SwitchCase[];
  defaultCase?: {
    label: string;
  };
}

/**
 * Fetches the value of an operand from payload or device state store
 */
async function fetchOperandValue(
  operand: Operand,
  payload: any,
  engine: RuleChainExecutionEngine,
): Promise<any> {
  if (operand.type === "staticValue") {
    return operand.value;
  }

  // type === "deviceField"
  if (!operand.key) {
    console.warn(` Switch Node: deviceField operand missing key`);
    return undefined;
  }

  // First try to get from current payload
  let value = payload[operand.key];

  // If not in current payload, try to get from device state store
  if (value === undefined && operand.deviceUniqId) {
    try {
      const telemetry = await engine.fetchLatestTelemetry(operand.deviceUniqId);
      value = telemetry[operand.key];
    } catch (error) {
      console.warn(
        ` Switch Node: Failed to fetch telemetry for ${operand.deviceUniqId}`,
        error,
      );
    }
  }

  return value;
}

/**
 * Evaluates a comparison between two values using the specified operator
 */
function evaluateOperator(
  leftValue: any,
  operator: string,
  rightValue: any,
): boolean {
  // Auto-parse string values to numbers or booleans if possible
  const parseValue = (val: any): any => {
    if (typeof val === "string") {
      if (!isNaN(Number(val))) {
        return Number(val);
      } else if (val === "true") {
        return true;
      } else if (val === "false") {
        return false;
      }
    }
    return val;
  };

  const left = parseValue(leftValue);
  const right = parseValue(rightValue);

  switch (operator) {
    case "==":
      return left == right;
    case "!=":
      return left != right;
    case ">":
      return left > right;
    case "<":
      return left < right;
    case ">=":
      return left >= right;
    case "<=":
      return left <= right;
    case "contains":
      return String(left).includes(String(right));
    case "startsWith":
      return String(left).startsWith(String(right));
    case "endsWith":
      return String(left).endsWith(String(right));
    default:
      console.warn(` Switch Node: Unknown operator "${operator}"`);
      return false;
  }
}

export async function executeSwitchNode(
  config: SwitchConfig,
  executionContext: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  try {
    const { leftOperand, cases, defaultCase } = config;
    const payload = executionContext.currentPayload;

    // Validate configuration
    if (!leftOperand) {
      console.warn(` Switch Node: No leftOperand configured`);
      if (defaultCase) {
        console.log(
          `🔀 Switch Node: Routing to default case "${defaultCase.label}"`,
        );
        return {
          success: true,
          data: payload,
          switchResult: "default",
        };
      }
      return {
        success: false,
        data: payload,
        error: "No leftOperand configured and no default case defined",
      };
    }

    // Fetch left operand value
    const leftValue = await fetchOperandValue(leftOperand, payload, engine);

    const leftLabel =
      leftOperand.type === "deviceField"
        ? `${leftOperand.deviceName} - ${leftOperand.key}`
        : leftOperand.value;

    if (leftValue === undefined) {
      console.warn(
        ` Switch Node: Left operand value is undefined for "${leftLabel}"`,
      );

      // Route to default if available
      if (defaultCase) {
        return {
          success: true,
          data: payload,
          switchResult: "default",
        };
      }

      return {
        success: false,
        data: payload,
        error: `Left operand value is undefined and no default case defined`,
      };
    }

    // Evaluate each case
    for (const caseItem of cases) {
      const { id, label, operator, rightOperand } = caseItem;

      try {
        // Fetch right operand value
        const rightValue = await fetchOperandValue(
          rightOperand,
          payload,
          engine,
        );

        const rightLabel =
          rightOperand.type === "deviceField"
            ? `${rightOperand.deviceName} - ${rightOperand.key}`
            : rightOperand.value;

        if (rightValue === undefined) {
          console.warn(
            ` Switch Node: Right operand value is undefined for case "${label}" (${rightLabel})`,
          );
          continue; // Skip this case
        }

        // Evaluate condition
        const matches = evaluateOperator(leftValue, operator, rightValue);

        if (matches) {
          return {
            success: true,
            data: payload,
            switchResult: id, // This tells the engine which handle to route to
          };
        }
      } catch (error) {
        console.error(
          ` Switch Node: Error evaluating case "${label}":`,
          error,
        );
        continue;
      }
    }

    // No cases matched

    if (defaultCase) {
      return {
        success: true,
        data: payload,
        switchResult: "default", // Route to default handle
      };
    }

    // No default case and no matches - execution stops here
    return {
      success: false,
      data: payload,
      error: `No cases matched for value ${leftValue} and no default case defined`,
    };
  } catch (error: any) {
    console.error(" Switch Node execution error:", error);
    return {
      success: false,
      data: executionContext.currentPayload,
      error: error.message || "Switch node execution failed",
    };
  }
}
