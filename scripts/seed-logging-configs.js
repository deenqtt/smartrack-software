const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function createLoggingConfig({
  id,
  customName,
  key,
  units,
  multiply,
  deviceUniqId,
  deviceName,
  topic,
  loggingIntervalMinutes = 5,
}) {
  return {
    id,
    customName,
    key,
    units,
    multiply,
    deviceUniqId,
    createdAt: "2026-04-04T00:00:00.000Z",
    updatedAt: "2026-04-04T00:00:00.000Z",
    lastLoggedAt: null,
    loggingIntervalMinutes,
    device: {
      uniqId: deviceUniqId,
      name: deviceName,
      topic,
    },
  };
}

const LOGGING_CONFIGS_DATA = [
  createLoggingConfig({
    id: "smartrack_chart_cooling_return_air_temperature",
    customName: "Cooling Return Air Temperature",
    key: "Air_Return_Temperature",
    units: "°C",
    multiply: 1,
    deviceUniqId: "smartrack-cooling-1",
    deviceName: "Cooling (Schneider ACRMD4KI)",
    topic: "smartrack/cooling/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_cooling_supply_air_temperature_1",
    customName: "Cooling Supply Air Temperature 1",
    key: "Air_Outlet_Temperature",
    units: "°C",
    multiply: 1,
    deviceUniqId: "smartrack-cooling-1",
    deviceName: "Cooling (Schneider ACRMD4KI)",
    topic: "smartrack/cooling/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_cooling_exhaust_pressure",
    customName: "Cooling Exhaust Pressure",
    key: "Discharge_Pressure",
    units: "kPa",
    multiply: 1,
    deviceUniqId: "smartrack-cooling-1",
    deviceName: "Cooling (Schneider ACRMD4KI)",
    topic: "smartrack/cooling/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_cooling_suction_pressure",
    customName: "Cooling Suction Pressure",
    key: "Suction_Pressure",
    units: "kPa",
    multiply: 1,
    deviceUniqId: "smartrack-cooling-1",
    deviceName: "Cooling (Schneider ACRMD4KI)",
    topic: "smartrack/cooling/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_vibration_axis_x",
    customName: "Vibration Axis X",
    key: "x",
    units: "g",
    multiply: 1,
    deviceUniqId: "smartrack-sensorvib-1",
    deviceName: "Nexabrick Vibration Sensor",
    topic: "smartrack/vibration/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_vibration_axis_y",
    customName: "Vibration Axis Y",
    key: "y",
    units: "g",
    multiply: 1,
    deviceUniqId: "smartrack-sensorvib-1",
    deviceName: "Nexabrick Vibration Sensor",
    topic: "smartrack/vibration/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_vibration_axis_z",
    customName: "Vibration Axis Z",
    key: "z",
    units: "g",
    multiply: 1,
    deviceUniqId: "smartrack-sensorvib-1",
    deviceName: "Nexabrick Vibration Sensor",
    topic: "smartrack/vibration/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_temphum_1_humidity",
    customName: "Nexabrick Temp Hum 1 - Humidity",
    key: "hum",
    units: "%",
    multiply: 1,
    deviceUniqId: "smartrack-temphum-1",
    deviceName: "Nexabrick Temp Hum 1",
    topic: "smartrack/temphum/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_temphum_2_humidity",
    customName: "Nexabrick Temp Hum 2 - Humidity",
    key: "hum",
    units: "%",
    multiply: 1,
    deviceUniqId: "smartrack-temphum-2",
    deviceName: "Nexabrick Temp Hum 2",
    topic: "smartrack/temphum/2",
  }),
  createLoggingConfig({
    id: "smartrack_chart_ups_load_percentage",
    customName: "UPS Load Percentage",
    key: "output_load",
    units: "%",
    multiply: 1,
    deviceUniqId: "smartrack-ups-1",
    deviceName: "UPS (APC SMART UPS SRT96BP)",
    topic: "smartrack/ups/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_ups_input_voltage",
    customName: "UPS Input Voltage",
    key: "input_voltage",
    units: "V",
    multiply: 1,
    deviceUniqId: "smartrack-ups-1",
    deviceName: "UPS (APC SMART UPS SRT96BP)",
    topic: "smartrack/ups/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_ups_output_voltage",
    customName: "UPS Output Voltage",
    key: "output_voltage",
    units: "V",
    multiply: 1,
    deviceUniqId: "smartrack-ups-1",
    deviceName: "UPS (APC SMART UPS SRT96BP)",
    topic: "smartrack/ups/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_ups_bypass_voltage",
    customName: "UPS Bypass Voltage",
    key: "input_bypass_voltage",
    units: "V",
    multiply: 1,
    deviceUniqId: "smartrack-ups-1",
    deviceName: "UPS (APC SMART UPS SRT96BP)",
    topic: "smartrack/ups/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_rpdu_output_current_1",
    customName: "RPDU Output Current 1",
    key: "output_current_1",
    units: "A",
    multiply: 1,
    deviceUniqId: "smartrack-rpdu-1",
    deviceName: "Rack PDU (UNITECH UT-D140205)",
    topic: "smartrack/rackpdu/1",
  }),
  createLoggingConfig({
    id: "smartrack_chart_rpdu_output_active_power_1",
    customName: "RPDU Output Active Power 1",
    key: "output_active_power_1",
    units: "kW",
    multiply: 1,
    deviceUniqId: "smartrack-rpdu-1",
    deviceName: "Rack PDU (UNITECH UT-D140205)",
    topic: "smartrack/rackpdu/1",
  }),
];

async function seedLoggingConfigs() {
  console.log("📊 Seeding Smartrack chart logging configurations...");
  console.log(
    `📦 Processing ${LOGGING_CONFIGS_DATA.length} chart logging configurations...\n`,
  );

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    await prisma.$transaction(async (tx) => {
      for (const configData of LOGGING_CONFIGS_DATA) {
        try {
          const device = await tx.deviceExternal.findUnique({
            where: { uniqId: configData.deviceUniqId },
          });

          if (!device) {
            console.log(
              `   ⚠️ Device not found: ${configData.deviceUniqId}, skipping ${configData.customName}`,
            );
            skippedCount++;
            continue;
          }

          const existingById = await tx.loggingConfiguration.findUnique({
            where: { id: configData.id },
          });

          const existingByDeviceKey = await tx.loggingConfiguration.findFirst({
            where: {
              deviceUniqId: configData.deviceUniqId,
              key: configData.key,
            },
          });

          const writeData = {
            customName: configData.customName,
            key: configData.key,
            units: configData.units,
            multiply: configData.multiply,
            loggingIntervalMinutes: configData.loggingIntervalMinutes,
            deviceUniqId: configData.deviceUniqId,
          };

          if (existingById) {
            await tx.loggingConfiguration.update({
              where: { id: configData.id },
              data: writeData,
            });
            updatedCount++;
            continue;
          }

          if (existingByDeviceKey) {
            await tx.loggingConfiguration.update({
              where: { id: existingByDeviceKey.id },
              data: {
                customName: configData.customName,
                units: configData.units,
                multiply: configData.multiply,
                loggingIntervalMinutes: configData.loggingIntervalMinutes,
              },
            });
            updatedCount++;
            continue;
          }

          await tx.loggingConfiguration.create({
            data: {
              id: configData.id,
              ...writeData,
              createdAt: new Date(configData.createdAt),
              updatedAt: new Date(configData.updatedAt),
            },
          });
          createdCount++;
        } catch (configError) {
          errors.push(`${configData.customName}: ${configError.message}`);
          skippedCount++;
        }
      }
    });

    console.log("\n📊 Logging configuration summary:");
    console.log(`   Created: ${createdCount}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);

    if (errors.length > 0) {
      console.log("\n⚠️ Errors:");
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
  } catch (error) {
    console.error("❌ Logging configurations seeding failed:", error);
    throw error;
  }
}

async function verifyLoggingConfigs() {
  console.log("\n🔍 Verifying Smartrack chart logging configurations...");

  try {
    const configs = await prisma.loggingConfiguration.findMany({
      where: {
        id: { in: LOGGING_CONFIGS_DATA.map((config) => config.id) },
      },
      include: {
        device: {
          select: {
            name: true,
            topic: true,
          },
        },
      },
      orderBy: { customName: "asc" },
    });

    console.log(`   Found ${configs.length} logging configurations`);
    configs.forEach((config, index) => {
      console.log(
        `   ${index + 1}. ${config.customName} -> ${config.device?.name || "Unknown"} [${config.key}]`,
      );
    });
  } catch (error) {
    console.error("❌ Logging configurations verification failed:", error);
  }
}

module.exports = {
  seedLoggingConfigs,
  verifyLoggingConfigs,
  default: seedLoggingConfigs,
  LOGGING_CONFIGS_DATA,
};

if (require.main === module) {
  seedLoggingConfigs()
    .then(async () => {
      await verifyLoggingConfigs();
      console.log(
        "\nSmartrack chart logging configurations seeded successfully!",
      );
    })
    .catch((error) => {
      console.error("\n❌ Logging configurations seeding failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
