const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEVICES_DATA = [
  {
    name: "Cooling (Schneider ACRMD4KI)",
    address: "192.168.1.103",
    topic: "smartrack/cooling/1",
    uniqId: "smartrack-cooling-1",
    deviceType: "COOLING",
  },
  {
    name: "Rack PDU (UNITECH UT-D140205)",
    address: "192.168.1.104",
    topic: "smartrack/rackpdu/1",
    uniqId: "smartrack-rpdu-1",
    deviceType: "PDU",
  },
  {
    name: "UPS (APC SMART UPS SRT96BP)",
    address: "192.168.1.105",
    topic: "smartrack/ups/1",
    uniqId: "smartrack-ups-1",
    deviceType: "UPS",
  },
  {
    name: "Nexabrick Vibration Sensor",
    address: "",
    topic: "smartrack/vibration/1",
    uniqId: "smartrack-sensorvib-1",
    deviceType: "SENSOR",
  },
  {
    name: "Nexabrick Temp Hum 1",
    address: "",
    topic: "smartrack/temphum/1",
    uniqId: "smartrack-temphum-1",
    deviceType: "SENSOR",
  },
  {
    name: "Nexabrick Temp Hum 2",
    address: "",
    topic: "smartrack/temphum/2",
    uniqId: "smartrack-temphum-2",
    deviceType: "SENSOR",
  },
];

const ACCESS_CONTROLLERS_DATA = [
  {
    name: "Access Controller",
    ipAddress: "192.168.1.210",
  },
];

async function seedExternalDevices(tx) {
  let created = 0;
  let updated = 0;

  for (const deviceData of DEVICES_DATA) {
    const existingDevice = await tx.deviceExternal.findFirst({
      where: {
        OR: [{ uniqId: deviceData.uniqId }, { topic: deviceData.topic }],
      },
      select: { id: true },
    });

    const data = {
      name: deviceData.name,
      address: deviceData.address,
      topic: deviceData.topic,
      uniqId: deviceData.uniqId,
      deviceType: deviceData.deviceType,
      status: "INSTALLED",
    };

    if (existingDevice) {
      await tx.deviceExternal.update({
        where: { id: existingDevice.id },
        data,
      });
      updated++;
    } else {
      await tx.deviceExternal.create({ data });
      created++;
    }
  }

  return { created, updated };
}

async function seedAccessControllers(tx) {
  let created = 0;
  let updated = 0;

  for (const controllerData of ACCESS_CONTROLLERS_DATA) {
    const existingController = await tx.accessController.findUnique({
      where: { ipAddress: controllerData.ipAddress },
      select: { id: true },
    });

    await tx.accessController.upsert({
      where: { ipAddress: controllerData.ipAddress },
      update: {
        name: controllerData.name,
      },
      create: {
        name: controllerData.name,
        ipAddress: controllerData.ipAddress,
        status: "offline",
      },
    });

    if (existingController) {
      updated++;
    } else {
      created++;
    }
  }

  return { created, updated };
}

async function seedDevices() {
  console.log("🚀 Seeding SmartRack devices...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const devices = await seedExternalDevices(tx);
      const controllers = await seedAccessControllers(tx);
      return { devices, controllers };
    });

    console.log(
      `   ✅ External devices processed: ${result.devices.created + result.devices.updated}`,
    );
    console.log(
      `   ✅ Access controllers processed: ${result.controllers.created + result.controllers.updated}`,
    );

    return true;
  } catch (error) {
    console.error("❌ SmartRack device seeding failed:", error.message);
    throw error;
  }
}

async function cleanupDevices() {
  console.log("🧹 Cleaning up SmartRack devices...");

  try {
    const deviceUniqIds = DEVICES_DATA.map((device) => device.uniqId);
    const deviceTopics = DEVICES_DATA.map((device) => device.topic);

    const result = await prisma.$transaction(async (tx) => {
      const devices = await tx.deviceExternal.findMany({
        where: {
          OR: [
            { uniqId: { in: deviceUniqIds } },
            { topic: { in: deviceTopics } },
          ],
        },
        select: { id: true, uniqId: true },
      });

      const deviceIds = devices.map((device) => device.id);
      const resolvedUniqIds = devices.map((device) => device.uniqId);

      const deletedLoggingConfigs = await tx.loggingConfiguration.deleteMany({
        where: { deviceUniqId: { in: resolvedUniqIds } },
      });

      const deletedBillConfigs = await tx.billConfiguration.deleteMany({
        where: {
          OR: [
            { publishTargetDeviceUniqId: { in: resolvedUniqIds } },
            { sourceDeviceUniqId: { in: resolvedUniqIds } },
          ],
        },
      });

      const deletedPueConfigs = await tx.pueConfiguration.deleteMany({
        where: { apiTopicUniqId: { in: resolvedUniqIds } },
      });

      const deletedPowerAnalyzerConfigs =
        await tx.powerAnalyzerConfiguration.deleteMany({
          where: { apiTopicUniqId: { in: resolvedUniqIds } },
        });

      const updatedMaintenance = await tx.maintenance.updateMany({
        where: { deviceTargetId: { in: deviceIds } },
        data: { deviceTargetId: null },
      });

      const updatedIpAllocations = await tx.iPAddressAllocation.updateMany({
        where: { deviceId: { in: deviceIds } },
        data: { deviceId: null },
      });

      const deletedDevices = await tx.deviceExternal.deleteMany({
        where: {
          OR: [
            { id: { in: deviceIds } },
            { uniqId: { in: resolvedUniqIds } },
          ],
        },
      });

      const deletedControllers = await tx.accessController.deleteMany({
        where: {
          ipAddress: {
            in: ACCESS_CONTROLLERS_DATA.map((controller) => controller.ipAddress),
          },
        },
      });

      return {
        deletedLoggingConfigs: deletedLoggingConfigs.count,
        deletedBillConfigs: deletedBillConfigs.count,
        deletedPueConfigs: deletedPueConfigs.count,
        deletedPowerAnalyzerConfigs: deletedPowerAnalyzerConfigs.count,
        updatedMaintenance: updatedMaintenance.count,
        updatedIpAllocations: updatedIpAllocations.count,
        deletedDevices: deletedDevices.count,
        deletedControllers: deletedControllers.count,
      };
    });

    console.log(
      `   🗑️ Deleted logging configs: ${result.deletedLoggingConfigs}`,
    );
    console.log(`   🗑️ Deleted bill configs: ${result.deletedBillConfigs}`);
    console.log(`   🗑️ Deleted PUE configs: ${result.deletedPueConfigs}`);
    console.log(
      `   🗑️ Deleted power analyzer configs: ${result.deletedPowerAnalyzerConfigs}`,
    );
    console.log(
      `   🔄 Cleared maintenance links: ${result.updatedMaintenance}`,
    );
    console.log(
      `   🔄 Cleared IP allocation links: ${result.updatedIpAllocations}`,
    );
    console.log(`   🗑️ Deleted external devices: ${result.deletedDevices}`);
    console.log(
      `   🗑️ Deleted access controllers: ${result.deletedControllers}`,
    );

    return true;
  } catch (error) {
    console.error("❌ SmartRack device cleanup failed:", error.message);
    throw error;
  }
}

async function verifyDevices() {
  console.log("\n🔍 Verifying SmartRack devices...");

  try {
    const devices = await prisma.deviceExternal.findMany({
      where: {
        OR: [
          { uniqId: { in: DEVICES_DATA.map((device) => device.uniqId) } },
          { topic: { in: DEVICES_DATA.map((device) => device.topic) } },
        ],
      },
      orderBy: { name: "asc" },
      select: {
        name: true,
        uniqId: true,
        topic: true,
        address: true,
        deviceType: true,
      },
    });

    const controllers = await prisma.accessController.findMany({
      where: {
        ipAddress: {
          in: ACCESS_CONTROLLERS_DATA.map((controller) => controller.ipAddress),
        },
      },
      orderBy: { name: "asc" },
      select: {
        name: true,
        ipAddress: true,
        status: true,
      },
    });

    console.log(`   External devices found: ${devices.length}`);
    devices.forEach((device, index) => {
      console.log(
        `   ${index + 1}. ${device.name} [${device.uniqId}] -> ${device.topic}`,
      );
    });

    console.log(`   Access controllers found: ${controllers.length}`);
    controllers.forEach((controller, index) => {
      console.log(
        `   ${index + 1}. ${controller.name} -> ${controller.ipAddress} (${controller.status})`,
      );
    });
  } catch (error) {
    console.error("❌ Device verification failed:", error.message);
  }
}

module.exports = {
  seedDevices,
  cleanupDevices,
  verifyDevices,
  DEVICES_DATA,
  ACCESS_CONTROLLERS_DATA,
  default: seedDevices,
};

if (require.main === module) {
  const args = process.argv.slice(2);

  (args.includes("--cleanup") ? cleanupDevices() : seedDevices())
    .then(async () => {
      if (!args.includes("--cleanup")) {
        await verifyDevices();
        console.log("\nSmartRack device seeding completed successfully!");
      } else {
        console.log("\nSmartRack device cleanup completed successfully!");
      }
    })
    .catch((error) => {
      console.error("\n❌ Device operation failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
