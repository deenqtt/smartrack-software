import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";
import { ruleChainMqttListener } from "../mqtt-listener";

export async function executeEnrichmentNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;

  // Support both new format (deviceUniqId, deviceTopic, targetTopic) and old format (topic)
  const deviceUniqId = config.deviceUniqId;
  const deviceTopic = config.deviceTopic;
  const { keyValuePairs } = config;

  if (!keyValuePairs || keyValuePairs.length === 0) {
    console.warn(" Enrichment config incomplete");
    return {
      success: false,
      data: {
        error: "Enrichment configuration incomplete",
      },
    };
  }

  try {
    let payloadToEnrich = currentPayload;

    // If no currentPayload but deviceUniqId provided, fetch latest telemetry data
    if (
      (!payloadToEnrich || Object.keys(payloadToEnrich).length === 0) &&
      deviceUniqId
    ) {
      try {
        payloadToEnrich = await engine.fetchLatestTelemetry(deviceUniqId);
        if (payloadToEnrich && Object.keys(payloadToEnrich).length > 0) {
          console.log(
            `    Retrieved telemetry data with ${Object.keys(payloadToEnrich).length} fields`,
          );
        } else {
          payloadToEnrich = {};
        }
      } catch (error) {
        console.error(
          `    Error fetching telemetry for device ${deviceUniqId}:`,
          error,
        );
        payloadToEnrich = {};
      }
    }

    if (!payloadToEnrich) {
      payloadToEnrich = {};
    }

    // Clone the payload
    const enrichedPayload = JSON.parse(JSON.stringify(payloadToEnrich));

    // Parse the value field (it's a JSON string)
    let valueContent: any = {};
    if (enrichedPayload.value && typeof enrichedPayload.value === "string") {
      try {
        valueContent = JSON.parse(enrichedPayload.value);
      } catch (e) {
        console.warn("  Could not parse value field as JSON, will use as-is");
        valueContent = { raw: enrichedPayload.value };
      }
    }

    // Add/merge the custom key-value pairs into valueContent
    keyValuePairs.forEach((pair: { keyName: string; keyValue: string }) => {
      // Try to parse value as number if it looks like one
      let parsedValue: any = pair.keyValue;
      if (!isNaN(Number(pair.keyValue)) && pair.keyValue !== "") {
        parsedValue = Number(pair.keyValue);
      } else if (pair.keyValue === "true") {
        parsedValue = true;
      } else if (pair.keyValue === "false") {
        parsedValue = false;
      }
      // else keep as string

      valueContent[pair.keyName] = parsedValue;
    });

    // Update the value field with merged content
    enrichedPayload.value = JSON.stringify(valueContent);

    // Return enriched payload to be passed to next node (not published to MQTT)
    return {
      success: true,
      data: enrichedPayload,
    };
  } catch (error: any) {
    console.error(" Enrichment execution failed:", error);
    throw new Error(`Enrichment failed: ${error.message}`);
  }
}
