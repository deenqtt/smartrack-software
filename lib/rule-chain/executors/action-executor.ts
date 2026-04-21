import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";
import { ruleChainMqttListener } from "../mqtt-listener";


// Utility function to clean payload for forwarding
function cleanPayloadForForward(payload: any): any {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const internalFields = [
    "device_name",
    "protocol_type",
    "comport",
    "modbus_address",
    "switchResult", // Switch metadata
    "PollingDuration", // Internal timing
    "nodeId", // Internal node ID
    "config", // Node configuration
    "Timestamp", // Metadata timestamp (will be re-added by wrapPayloadWithMetadata)
    "value", // Will be parsed and merged instead
  ];

  const clean: any = {};
  Object.keys(payload).forEach((key) => {
    if (!internalFields.includes(key)) {
      clean[key] = payload[key];
    }
  });

  // If there's a "value" field (from enrichment or device), parse and merge its contents
  if (payload.value && typeof payload.value === "string") {
    try {
      const parsedValue = JSON.parse(payload.value);
      if (typeof parsedValue === "object" && parsedValue !== null) {
        // Merge parsed fields directly into clean payload (flatten structure)
        Object.assign(clean, parsedValue);
      }
    } catch (e) {
      // If value is not JSON, just include it as-is
      clean.value = payload.value;
    }
  }

  return clean;
}

// Utility function to wrap payload with original metadata structure
function wrapPayloadWithMetadata(
  cleanedPayload: any,
  initialPayload: any,
): any {
  if (!initialPayload || typeof initialPayload !== "object") {
    return cleanedPayload;
  }

  // Extract metadata from original payload
  const metadata: any = {
    device_name: initialPayload.device_name,
    protocol_type: initialPayload.protocol_type,
    comport: initialPayload.comport,
    modbus_address: initialPayload.modbus_address,
    Timestamp: initialPayload.Timestamp || new Date().toISOString(),
  };

  // Only include metadata fields that exist in original
  const wrappedPayload: any = {};
  Object.keys(metadata).forEach((key) => {
    if (metadata[key] !== undefined) {
      wrappedPayload[key] = metadata[key];
    }
  });

  // Add processed payload as "value" (JSON string)
  wrappedPayload.value = JSON.stringify(cleanedPayload);

  return wrappedPayload;
}

export async function executeActionNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  let { nodeSubType } = config;

  //  Fallback: If nodeSubType not set but phoneNumber exists, assume sendWhatsApp
  if (!nodeSubType && config.phoneNumber) {
    nodeSubType = "sendWhatsApp";
  }

  switch (nodeSubType) {


    case "sendEmail": {
      const { email, subject, message, recipientName, messageMode } = config;

      const templatedSubject = engine.templateString(subject, currentPayload);

      let finalMessage: string;
      if (messageMode === "autoForward") {
        // Use clean payload as message
        const cleanPayload = cleanPayloadForForward(currentPayload);
        finalMessage =
          typeof cleanPayload === "string"
            ? cleanPayload
            : JSON.stringify(cleanPayload, null, 2);
      } else {
        // Use templated custom message
        finalMessage = engine.templateString(message, currentPayload);
      }

      // TODO: Implement actual Email API integration
      // await emailService.sendEmail(email, templatedSubject, finalMessage);

      return { success: true, data: currentPayload };
    }

    case "sendTelegram": {
      const { recipientId, recipientName, message, messageMode } = config;

      let finalMessage: string;
      if (messageMode === "autoForward") {
        // Use clean payload as message
        const cleanPayload = cleanPayloadForForward(currentPayload);
        finalMessage =
          typeof cleanPayload === "string"
            ? cleanPayload
            : JSON.stringify(cleanPayload, null, 2);
      } else {
        // Use templated custom message
        finalMessage = engine.templateString(message, currentPayload);
      }

      // TODO: Implement actual Telegram API integration
      // await telegramService.sendMessage(recipientId, finalMessage);

      return { success: true, data: currentPayload };
    }

    case "sendMqttPayload": {
      const { topic, payload, payloadMode } = config;

      let finalPayload: any;
      if (payloadMode === "autoForward") {
        // Smart filter: only forward important fields
        let cleanPayload = cleanPayloadForForward(currentPayload);

        // Always wrap with original metadata structure
        finalPayload = wrapPayloadWithMetadata(
          cleanPayload,
          context.initialPayload,
        );
      } else {
        // Parse and template custom payload
        let payloadData: any;
        try {
          payloadData = JSON.parse(payload);
        } catch {
          payloadData = payload;
        }

        // Template payload with current data
        finalPayload = engine.templateObject(payloadData, currentPayload);
      }

      // Implement actual MQTT publish using unified MQTT client
      try {
        await ruleChainMqttListener.publish(topic, finalPayload);

        return { success: true, data: currentPayload };
      } catch (error: any) {
        console.error(`     MQTT publish error:`, error);
        throw new Error(`Failed to publish MQTT message: ${error.message}`);
      }
    }

    default:
      // Legacy support: detect from config
      if (config.phoneNumber && config.message) {
        // WhatsApp
        const { phoneNumber, message, contactName } = config;
        const templatedMessage = engine.templateString(message, currentPayload);

        return { success: true, data: currentPayload };
      } else if (config.email && config.subject) {
        // Email
        const { email, subject, message, recipientName } = config;
        const templatedSubject = engine.templateString(subject, currentPayload);
        const templatedMessage = engine.templateString(message, currentPayload);

        return { success: true, data: currentPayload };
      } else if (config.recipientId && config.message) {
        // Telegram
        const { recipientId, recipientName, message } = config;
        const templatedMessage = engine.templateString(message, currentPayload);

        return { success: true, data: currentPayload };
      } else if (config.topic && config.payload) {
        // MQTT (Legacy support)
        const { topic, payload, payloadMode } = config;

        let finalPayload: any;
        if (payloadMode === "autoForward") {
          // Smart filter: only forward important fields
          let cleanPayload = cleanPayloadForForward(currentPayload);

          // Always wrap with original metadata structure
          finalPayload = wrapPayloadWithMetadata(
            cleanPayload,
            context.initialPayload,
          );
        } else {
          // Parse and template custom payload
          let payloadData: any;
          try {
            payloadData = JSON.parse(payload);
          } catch {
            payloadData = payload;
          }

          // Template payload with current data
          finalPayload = engine.templateObject(payloadData, currentPayload);
        }

        // Implement actual MQTT publish using unified MQTT client
        try {
          await ruleChainMqttListener.publish(topic, finalPayload);

          return { success: true, data: currentPayload };
        } catch (error: any) {
          console.error(`     MQTT publish error:`, error);
          throw new Error(`Failed to publish MQTT message: ${error.message}`);
        }
      } else {
        throw new Error("Unknown action configuration");
      }
  }
}
