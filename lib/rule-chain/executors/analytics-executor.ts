import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

export async function executeAnalyticsNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  const { nodeSubType } = config;

  switch (nodeSubType) {
    case "sumValues": {
      const { nodeTitle, calculationType, operands } = config;

      if (!operands || operands.length === 0) {
        console.warn(`     No operands configured for analytics node`);
        return { success: false, data: currentPayload };
      }

      // Fetch values from all operands
      const values = await Promise.all(
        operands.map(async (op: any) => {
          const { deviceUniqId, selectedKey } = op;

          // First try to get from current payload
          let value = currentPayload[selectedKey];

          // If not in current payload, try to get from device state store
          if (value === undefined) {
            const telemetry = await engine.fetchLatestTelemetry(deviceUniqId);
            value = telemetry[selectedKey];
          }

          if (value === undefined) {
            console.warn(
              `     Value not found for ${deviceUniqId}:${selectedKey}, using 0`,
            );
            return 0;
          }

          const numValue = parseFloat(value);
          if (isNaN(numValue)) {
            console.warn(
              `     Non-numeric value for ${deviceUniqId}:${selectedKey}, using 0`,
            );
            return 0;
          }

          return numValue;
        }),
      );

      // Calculate result
      let result: number;
      switch (calculationType) {
        case "SUM":
          result = values.reduce((a, b) => a + b, 0);
          break;
        case "AVG":
        case "AVERAGE":
          result = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case "MIN":
          result = Math.min(...values);
          break;
        case "MAX":
          result = Math.max(...values);
          break;
        case "MULTIPLY":
          result = values.reduce((a, b) => a * b, 1);
          break;
        default:
          throw new Error(`Unknown calculation type: ${calculationType}`);
      }

      return {
        success: true,
        data: {
          [nodeTitle]: result,
          timestamp: new Date().toISOString(),
          calculationType,
          operandCount: values.length,
        },
      };
    }

    case "billCalculation": {
      const { nodeName, deviceUniqId, selectedKey, rupiahRate, dollarRate } =
        config;

      if (!deviceUniqId || !selectedKey) {
        console.warn(
          `     Bill calculation: missing device or key configuration`,
        );
        return { success: false, data: currentPayload };
      }

      // Get power consumption value - first try current payload, then telemetry store
      let powerValue = currentPayload[selectedKey];

      if (powerValue === undefined) {
        const telemetry = await engine.fetchLatestTelemetry(deviceUniqId);
        powerValue = telemetry[selectedKey];
      }

      if (powerValue === undefined) {
        console.warn(
          `     Bill calculation: value not found for ${deviceUniqId}:${selectedKey}`,
        );
        return { success: false, data: currentPayload };
      }

      const powerWatts = parseFloat(powerValue);
      if (isNaN(powerWatts)) {
        console.warn(
          `     Bill calculation: invalid power value for ${deviceUniqId}:${selectedKey}`,
        );
        return { success: false, data: currentPayload };
      }

      // Convert watts to kWh (assuming this is power consumption per hour)
      // For bill calculations, we typically calculate cost per hour
      const energyKwh = powerWatts / 1000; // Convert watts to kW

      // Calculate costs
      const rupiahRateNum = parseFloat(rupiahRate) || 1467;
      const dollarRateNum = parseFloat(dollarRate) || 0.1;

      const rupiahCost = energyKwh * rupiahRateNum;
      const dollarCost = energyKwh * dollarRateNum;

      return {
        success: true,
        data: {
          powerConsumption: powerWatts,
          energyKwh: parseFloat(energyKwh.toFixed(6)),
          rupiahCost: parseFloat(rupiahCost.toFixed(2)),
          dollarCost: parseFloat(dollarCost.toFixed(4)),
          rupiahRate: rupiahRateNum,
          dollarRate: dollarRateNum,
          timestamp: new Date().toISOString(),
        },
      };
    }
    case "severityAggregate": {
      const { rules } = config;
      if (!rules || rules.length === 0) {
        console.warn(`     Severity Aggregate: No rules configured`);
        return { success: false, data: currentPayload };
      }

      let highestSeverity = "NORMAL";

      // Evaluate rules
      for (const rule of rules) {
        const { deviceUniqId, selectedKey, operator, comparisonValue, severityLevel } = rule;

        let value = currentPayload[selectedKey];
        if (value === undefined || value === null) {
          const telemetry = await engine.fetchLatestTelemetry(deviceUniqId);
          value = telemetry?.[selectedKey];
        }

        if (value === undefined || value === null) {
          console.warn(`     Severity Aggregate: value not found for ${deviceUniqId}:${selectedKey}`);
          continue;
        }

        // Convert types for reliable comparison if numeric
        let parsedValue: any = value;
        let parsedCompValue: any = comparisonValue;
        if (!isNaN(Number(value)) && comparisonValue !== "" && !isNaN(Number(comparisonValue))) {
          parsedValue = Number(value);
          parsedCompValue = Number(comparisonValue);
        }

        let conditionMet = false;
        switch (operator) {
          case "==": conditionMet = parsedValue == parsedCompValue; break;
          case "!=": conditionMet = parsedValue != parsedCompValue; break;
          case ">": conditionMet = parsedValue > parsedCompValue; break;
          case ">=": conditionMet = parsedValue >= parsedCompValue; break;
          case "<": conditionMet = parsedValue < parsedCompValue; break;
          case "<=": conditionMet = parsedValue <= parsedCompValue; break;
        }

        if (conditionMet) {
          if (severityLevel === "CRITICAL") {
            highestSeverity = "CRITICAL";
            break; // Stop evaluating, critical is highest
          } else if (severityLevel === "MINOR" && highestSeverity === "NORMAL") {
            highestSeverity = "MINOR";
          }
        }
      }

      return {
        success: true,
        data: {
          severity: highestSeverity.toLowerCase(),
          timestamp: new Date().toISOString(),
          evaluatedRules: rules.length,
        },
      };
    }

    default:
      // Legacy support
      if (config.calculationType && config.operands) {
        const { nodeTitle, calculationType, operands } = config;

        const values = await Promise.all(
          operands.map(async (op: any) => {
            const { deviceUniqId, selectedKey } = op;

            // First try to get from current payload
            let value = currentPayload[selectedKey];

            // If not in current payload, try to get from device state store
            if (value === undefined) {
              const telemetry = await engine.fetchLatestTelemetry(deviceUniqId);
              value = telemetry[selectedKey];
            }

            if (value === undefined) {
              console.warn(
                `     Value not found for ${deviceUniqId}:${selectedKey}, using 0`,
              );
              return 0;
            }

            return parseFloat(value) || 0;
          }),
        );

        let result: number;
        switch (calculationType) {
          case "SUM":
            result = values.reduce((a, b) => a + b, 0);
            break;
          case "AVG":
          case "AVERAGE":
            result = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case "MIN":
            result = Math.min(...values);
            break;
          case "MAX":
            result = Math.max(...values);
            break;
          default:
            throw new Error(`Unknown calculation type: ${calculationType}`);
        }

        return {
          success: true,
          data: {
            [nodeTitle]: result,
            timestamp: new Date().toISOString(),
            calculationType,
            operandCount: values.length,
          },
        };
      } else {
        throw new Error("Unknown analytics configuration");
      }
  }
}
