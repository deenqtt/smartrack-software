import type {
  ExecutionContext,
  NodeExecutionResult,
} from "../execution-engine";
import { RuleChainExecutionEngine } from "../execution-engine";
import { ruleChainMqttListener } from "../mqtt-listener";
/**
 * Extract pin number from key like "relayMiniOutput2" → 2
 */
function extractPin(key: string): number {
  const match = key.match(/\d+/);
  return match ? parseInt(match[0], 10) : 1;
}

export async function executeControlNode(
  config: any,
  context: ExecutionContext,
  engine: RuleChainExecutionEngine,
): Promise<NodeExecutionResult> {
  const { currentPayload } = context;
  const { nodeSubType } = config;

  switch (nodeSubType) {
    case "relayControl": {
      const { deviceType, device, selectedKey, controlType } = config;

      if (deviceType === "modular") {
        const { profile, protocol_setting } = device;

        if (!profile?.part_number || !protocol_setting) {
          throw new Error("Modular device configuration incomplete");
        }

        // Get MAC address from mqtt_config topic
        const macAddress = await ruleChainMqttListener.getMacAddress();

        // Build MQTT payload following the pattern from ButtonControlModularWidget
        const commandPayload = {
          mac: macAddress,
          protocol_type: "Modular",
          device: profile.part_number,
          function: "write",
          value: {
            pin: extractPin(selectedKey),
            data: controlType === "on" ? 1 : 0,
          },
          address: protocol_setting.address,
          device_bus: protocol_setting.device_bus,
          Timestamp: new Date().toISOString(),
        };

        const commandTopic = "modular";

        // Publish to MQTT
        try {
          await ruleChainMqttListener.publish(commandTopic, commandPayload);
          console.log(`     MQTT command published successfully`);
        } catch (error: any) {
          console.error(`     MQTT publish failed:`, error);
          throw new Error(`Failed to publish MQTT command: ${error.message}`);
        }
      } else if (deviceType === "modbus") {
        const { profile, protocol_setting } = device;

        if (!profile?.name || !protocol_setting) {
          throw new Error("Modbus device configuration incomplete");
        }

        // Get MAC address from mqtt_config topic (same as modular)
        const macAddress = await ruleChainMqttListener.getMacAddress();

        // Map pin to register address (same logic as widget)
        const registerAddress = extractPin(selectedKey) + 8;

        // Build MQTT payload following ButtonControlModbusWidget structure
        const commandPayload = {
          mac: macAddress,
          number_address: protocol_setting.address,
          value: {
            address: registerAddress,
            value: controlType === "on" ? 1 : 0,
          },
          port: protocol_setting.port,
          baudrate: protocol_setting.baudrate,
          parity: protocol_setting.parity,
          bytesize: protocol_setting.bytesize,
          stop_bit: protocol_setting.stop_bit,
          timeout: protocol_setting.timeout,
          endianness: protocol_setting.endianness,
          data_type: "UINT16",
          function: "single",
        };

        const commandTopic = "modbus/control/command";

        // Publish to MQTT
        try {
          await ruleChainMqttListener.publish(commandTopic, commandPayload);
          console.log(`     MQTT command published successfully`);
        } catch (error: any) {
          console.error(`     MQTT publish failed:`, error);
          throw new Error(`Failed to publish MQTT command: ${error.message}`);
        }
      } else {
        throw new Error(`Unknown device type: ${deviceType}`);
      }

      return { success: true, data: currentPayload };
    }

    default:
      // Legacy support (nodes without nodeSubType)
      if (
        config.deviceType &&
        config.device &&
        config.selectedKey &&
        config.controlType
      ) {
        const { deviceType, device, selectedKey, controlType } = config;

        if (deviceType === "modular") {
          const { profile, protocol_setting } = device;

          if (!profile?.part_number || !protocol_setting) {
            throw new Error("Modular device configuration incomplete");
          }

          // Get MAC address from mqtt_config topic
          const macAddress = await ruleChainMqttListener.getMacAddress();

          // Build MQTT payload following the pattern from ButtonControlModularWidget
          const commandPayload = {
            mac: macAddress,
            protocol_type: "Modular",
            device: profile.part_number,
            function: "write",
            value: {
              pin: extractPin(selectedKey),
              data: controlType === "on" ? 1 : 0,
            },
            address: protocol_setting.address,
            device_bus: protocol_setting.device_bus,
            Timestamp: new Date().toISOString(),
          };

          const commandTopic = "modular";

          // Publish to MQTT
          try {
            await ruleChainMqttListener.publish(commandTopic, commandPayload);
            console.log(`     MQTT command published successfully`);
          } catch (error: any) {
            console.error(`     MQTT publish failed:`, error);
            throw new Error(`Failed to publish MQTT command: ${error.message}`);
          }
        } else if (deviceType === "modbus") {
          const { profile, protocol_setting } = device;

          if (!profile?.name || !protocol_setting) {
            throw new Error("Modbus device configuration incomplete");
          }

          // Get MAC address from mqtt_config topic (same as modular)
          const macAddress = await ruleChainMqttListener.getMacAddress();

          // Map pin to register address (same logic as widget)
          const registerAddress = extractPin(selectedKey) + 8;

          // Build MQTT payload following ButtonControlModbusWidget structure
          const commandPayload = {
            mac: macAddress,
            number_address: protocol_setting.address,
            value: {
              address: registerAddress,
              value: controlType === "on" ? 1 : 0,
            },
            port: protocol_setting.port,
            baudrate: protocol_setting.baudrate,
            parity: protocol_setting.parity,
            bytesize: protocol_setting.bytesize,
            stop_bit: protocol_setting.stop_bit,
            timeout: protocol_setting.timeout,
            endianness: protocol_setting.endianness,
            data_type: "UINT16",
            function: "single",
          };

          const commandTopic = "modbus/control/command";

          // Publish to MQTT
          try {
            await ruleChainMqttListener.publish(commandTopic, commandPayload);
            console.log(`     MQTT command published successfully`);
          } catch (error: any) {
            console.error(`     MQTT publish failed:`, error);
            throw new Error(`Failed to publish MQTT command: ${error.message}`);
          }
        }

        return { success: true, data: currentPayload };
      } else {
        throw new Error("Unknown control configuration");
      }
  }
}
