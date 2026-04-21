import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

export async function executeFilterNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload, metadata } = context;
  const { nodeSubType } = config;

  switch (nodeSubType) {
    case "messageTypeFilter": {
      const { selectedTypes } = config;
      const messageType = metadata.messageType || "telemetry";

      if (selectedTypes && selectedTypes.includes(messageType)) {
        return { success: true, data: currentPayload };
      } else {
        return { success: false, data: currentPayload };
      }
    }

    case "fieldExistence": {
      const { fieldName } = config;

      if (currentPayload.hasOwnProperty(fieldName)) {
        return { success: true, data: currentPayload };
      } else {
        return { success: false, data: currentPayload };
      }
    }

    case "valueComparison": {
      const { field, operator, value } = config;
      const fieldValue = currentPayload[field];

      if (fieldValue === undefined) {
        return { success: false, data: currentPayload };
      }

      let matches = false;
      switch (operator) {
        case ">":
          matches = fieldValue > value;
          break;
        case "<":
          matches = fieldValue < value;
          break;
        case ">=":
          matches = fieldValue >= value;
          break;
        case "<=":
          matches = fieldValue <= value;
          break;
        case "==":
          matches = fieldValue == value;
          break;
        case "!=":
          matches = fieldValue != value;
          break;
        default:
          console.warn(`     Unknown operator: ${operator}`);
          return { success: false, data: currentPayload };
      }

      if (matches) {
        return { success: true, data: currentPayload };
      } else {
        return { success: false, data: currentPayload };
      }
    }

    default:
      // Legacy support: if no nodeSubType, try to detect from config
      if (config.selectedTypes) {
        // Message type filter
        const { selectedTypes } = config;
        const messageType = metadata.messageType || "telemetry";

        if (selectedTypes.includes(messageType)) {
          return { success: true, data: currentPayload };
        } else {
          return { success: false, data: currentPayload };
        }
      } else if (config.fieldName) {
        // Field existence filter
        const { fieldName } = config;

        if (currentPayload.hasOwnProperty(fieldName)) {
          return { success: true, data: currentPayload };
        } else {
          return { success: false, data: currentPayload };
        }
      } else {
        throw new Error(`Unknown filter configuration`);
      }
  }
}
