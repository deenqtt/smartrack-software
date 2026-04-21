const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding MQTT Configuration...");

  try {
    // MQTT Configuration Data - AS REQUESTED
    const mqttConfigs = [
      // 1. Local Broker
      {
        name: "Local MQTT Broker",
        description: "Local MQTT broker configuration (127.0.0.1:9000)",
        brokerHost: "10.8.0.182",
        brokerPort: 9000,
        protocol: "WEBSOCKET",
        useSSL: false,
        useAuthentication: false,
        keepAlive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        cleanSession: true,
        maxReconnectAttempts: 10,
        defaultQos: 1,
        retainMessages: true,
        isActive: true,
      },

      // 2. AWS Public Broker
      {
        name: "AWS Public MQTT",
        description: "Public MQTT broker on AWS (54.151.197.127:900)",
        brokerHost: "54.151.197.127",
        brokerPort: 9000,
        protocol: "WEBSOCKET",
        useSSL: false,
        useAuthentication: false,
        keepAlive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        cleanSession: true,
        maxReconnectAttempts: 10,
        defaultQos: 1,
        retainMessages: true,
        isActive: false,
      },

      // 3. VPN Internal Broker
      {
        name: "VPN Internal MQTT",
        description: "Internal VPN MQTT broker (10.8.0.182:9000)",
        brokerHost: "10.8.0.182",
        brokerPort: 9000,
        protocol: "WEBSOCKET",
        useSSL: false,
        useAuthentication: false,
        keepAlive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        cleanSession: true,
        maxReconnectAttempts: 10,
        defaultQos: 1,
        retainMessages: true,
        isActive: false, // Turned off by default in favor of new SSL broker
      },

      // 4. Secure Public Broker (WSS)
      {
        name: "Secure Public MQTT (WSS)",
        description: "Secure Public MQTT broker on iotech.my.id",
        brokerHost: "mqttws.iotech.my.id",
        brokerPort: 443, // Standard port for WSS/HTTPS
        protocol: "SECURE_WEBSOCKET",
        useSSL: true,
        useAuthentication: false,
        keepAlive: 60,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
        cleanSession: true,
        maxReconnectAttempts: 10,
        defaultQos: 1,
        retainMessages: true,
        isActive: false, // Set as the actively selected one
      },
    ];

    // Create or update MQTT configurations using upsert to maintain stable IDs
    const createdConfigs = [];
    for (const configData of mqttConfigs) {
      const config = await prisma.mqttConfiguration.upsert({
        where: { name: configData.name },
        update: {
          ...configData,
          updatedAt: new Date(),
        },
        create: {
          ...configData,
        },
      });
      createdConfigs.push(config);
      console.log(
        `✅ Processed MQTT configuration: ${config.name} (${config.isActive ? "ACTIVE" : "INACTIVE"})`,
      );
    }

    // AWS Lightsail configuration is already set as active in the config above
    // No need to manually activate - it's already active by default
    console.log(
      `🔄 AWS Lightsail MQTT WebSocket configuration is already active by default`,
    );

    // Get active configurations for summary
    const activeConfigs = createdConfigs.filter((c) => c.isActive);

    console.log("🎉 MQTT Configuration seeding completed successfully!");
    console.log("");
    console.log("📊 Summary:");
    console.log(`   - Total configurations: ${createdConfigs.length}`);
    console.log(`   - Active configurations: ${activeConfigs.length}`);
    console.log("");

    if (activeConfigs.length > 0) {
      console.log("🔗 Active broker URLs:");
      activeConfigs.forEach((config) => {
        const protocol =
          config.protocol === "WEBSOCKET"
            ? config.useSSL
              ? "wss://"
              : "ws://"
            : config.useSSL
              ? "mqtts://"
              : "mqtt://";
        console.log(
          `   - ${config.name}: ${protocol}${config.brokerHost}:${config.brokerPort}`,
        );
      });
    } else {
      console.log(
        "⚠️  No active configurations. Use environment variables or activate a config manually.",
      );
    }

    // Show inactive configurations that can be activated if needed
    const inactiveConfigs = createdConfigs.filter((c) => !c.isActive);
    if (inactiveConfigs.length > 0) {
      console.log("");
      console.log("🔄 Inactive configurations (can be activated if needed):");
      inactiveConfigs.forEach((config) => {
        const protocol =
          config.protocol === "WEBSOCKET"
            ? config.useSSL
              ? "wss://"
              : "ws://"
            : config.useSSL
              ? "mqtts://"
              : "mqtt://";
        console.log(
          `   - ${config.name}: ${protocol}${config.brokerHost}:${config.brokerPort} (${config.isActive ? "ACTIVE" : "INACTIVE"})`,
        );
        console.log(`     To activate: Update isActive to true in database`);
      });
    }
  } catch (error) {
    console.error("❌ Error seeding MQTT configuration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedMqttConfig() {
  return main();
}

// Export for use in other scripts
module.exports = {
  seedMqttConfig,
  default: seedMqttConfig,
};

// Run if called directly
if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
