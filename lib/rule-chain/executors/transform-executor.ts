import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";

export async function executeTransformNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  const { nodeSubType } = config;

  switch (nodeSubType) {
    case "extractFields": {
      const { selectedFields } = config;

      console.log(`🔄 Extract Fields: Processing incoming payload`);

      //  Use payload from previous node (via edge flow)
      let payloadToExtractFrom = currentPayload;

      if (!payloadToExtractFrom || Object.keys(payloadToExtractFrom).length === 0) {
        console.warn(`    No payload received from previous node`);
        return { success: false, data: {}, error: "No payload to extract from" };
      }

      console.log(`   📦 Incoming payload keys: ${Object.keys(payloadToExtractFrom).join(", ")}`);

      // Parse the value field if it's a JSON string
      let valueContent: any = {};
      if (payloadToExtractFrom.value && typeof payloadToExtractFrom.value === "string") {
        try {
          valueContent = JSON.parse(payloadToExtractFrom.value);
        } catch (e) {
          console.warn("  Could not parse value field as JSON, will use as-is");
        }
      }

      // Extract only selected fields
      const extracted: any = {};
      selectedFields?.forEach((field: string) => {
        // Check in parsed value content first
        if (valueContent[field] !== undefined) {
          extracted[field] = valueContent[field];
        }
        // Then check in top-level payload
        else if (payloadToExtractFrom[field] !== undefined) {
          extracted[field] = payloadToExtractFrom[field];
        }
      });

      console.log(
        `     Extracted fields: ${Object.keys(extracted).join(", ")}`
      );

      // Return only extracted fields to next node
      return { success: true, data: extracted };
    }

    case "mapPayload": {
      const { mappings } = config;

      console.log(`🔄 Map Payload: Processing incoming payload`);

      //  Use payload from previous node (via edge flow)
      let payloadToMap = currentPayload;

      if (!payloadToMap || Object.keys(payloadToMap).length === 0) {
        console.warn(`    No payload received from previous node`);
        return { success: false, data: {}, error: "No payload to map" };
      }

      console.log(`   📦 Incoming payload keys: ${Object.keys(payloadToMap).join(", ")}`);

      // Parse the value field if it's a JSON string
      let valueContent: any = {};
      if (payloadToMap.value && typeof payloadToMap.value === "string") {
        try {
          valueContent = JSON.parse(payloadToMap.value);
        } catch (e) {
          console.warn("  Could not parse value field as JSON, will use as-is");
        }
      }

      // Prepare mapped field names set for tracking which source fields are mapped
      const mappedSourceFields = new Set(mappings?.map((m: any) => m.sourceField) || []);

      // Start with all unmapped fields from top-level payload
      const mappedData: any = {};
      Object.keys(payloadToMap).forEach((key) => {
        if (!mappedSourceFields.has(key)) {
          mappedData[key] = payloadToMap[key];
        }
      });

      // Add unmapped fields from parsed value content
      Object.keys(valueContent).forEach((key) => {
        if (!mappedSourceFields.has(key) && mappedData[key] === undefined) {
          mappedData[key] = valueContent[key];
        }
      });

      // Apply field mappings
      mappings?.forEach((mapping: any) => {
        const { sourceField, targetField } = mapping;

        // Check in parsed value content first
        let sourceValue = valueContent[sourceField];
        // Then check in top-level payload
        if (sourceValue === undefined) {
          sourceValue = payloadToMap[sourceField];
        }

        if (sourceValue !== undefined) {
          mappedData[targetField] = sourceValue;
          console.log(
            `     Mapped: ${sourceField} → ${targetField}`
          );
        }
      });

      console.log(`    📦 Result: ${Object.keys(mappedData).join(", ")}`);
      return { success: true, data: mappedData };
    }

    default:
      // Legacy support: detect from config
      if (config.selectedFields) {
        // Extract fields (legacy - use edge flow)
        console.log(`🔄 Extract Fields (Legacy): Processing incoming payload`);

        const { selectedFields } = config;
        let payloadToExtractFrom = currentPayload;

        if (!payloadToExtractFrom || Object.keys(payloadToExtractFrom).length === 0) {
          console.warn(`    No payload received from previous node`);
          return { success: false, data: {}, error: "No payload to extract from" };
        }

        // Parse the value field if it's a JSON string
        let valueContent: any = {};
        if (payloadToExtractFrom.value && typeof payloadToExtractFrom.value === "string") {
          try {
            valueContent = JSON.parse(payloadToExtractFrom.value);
          } catch (e) {
            // Ignore parse errors
          }
        }

        const extracted: any = {};
        selectedFields.forEach((field: string) => {
          // Check in parsed value content first
          if (valueContent[field] !== undefined) {
            extracted[field] = valueContent[field];
          }
          // Then check in top-level payload
          else if (payloadToExtractFrom[field] !== undefined) {
            extracted[field] = payloadToExtractFrom[field];
          }
        });

        console.log(
          `     Extracted fields: ${Object.keys(extracted).join(", ")}`
        );

        return { success: true, data: extracted };
      } else if (config.mappings) {
        // Map payload (legacy - use edge flow)
        console.log(`🔄 Map Payload (Legacy): Processing incoming payload`);

        const { mappings } = config;
        let payloadToMap = currentPayload;

        if (!payloadToMap || Object.keys(payloadToMap).length === 0) {
          console.warn(`    No payload received from previous node`);
          return { success: false, data: {}, error: "No payload to map" };
        }

        // Parse the value field if it's a JSON string
        let valueContent: any = {};
        if (payloadToMap.value && typeof payloadToMap.value === "string") {
          try {
            valueContent = JSON.parse(payloadToMap.value);
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Prepare mapped field names set for tracking which source fields are mapped
        const mappedSourceFields = new Set(mappings.map((m: any) => m.sourceField) || []);

        // Start with all unmapped fields from top-level payload
        const mappedData: any = {};
        Object.keys(payloadToMap).forEach((key) => {
          if (!mappedSourceFields.has(key)) {
            mappedData[key] = payloadToMap[key];
          }
        });

        // Add unmapped fields from parsed value content
        Object.keys(valueContent).forEach((key) => {
          if (!mappedSourceFields.has(key) && mappedData[key] === undefined) {
            mappedData[key] = valueContent[key];
          }
        });

        // Apply field mappings
        mappings.forEach((mapping: any) => {
          const { sourceField, targetField } = mapping;

          // Check in parsed value content first
          let sourceValue = valueContent[sourceField];
          // Then check in top-level payload
          if (sourceValue === undefined) {
            sourceValue = payloadToMap[sourceField];
          }

          if (sourceValue !== undefined) {
            mappedData[targetField] = sourceValue;
            console.log(
              `     Mapped: ${sourceField} → ${targetField}`
            );
          }
        });

        console.log(`    📦 Result: ${Object.keys(mappedData).join(", ")}`);
        return { success: true, data: mappedData };
      } else {
        throw new Error("Unknown transform configuration");
      }
  }
}
