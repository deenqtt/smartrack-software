const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TARGET_USER_ID = "admin-smartrack-001";
const TARGET_USER_EMAIL = "admin@smartrack.com";

const BILL_CONFIGS_DATA = [
  {
    id: "smartrack_bill_rpdu_feed_1",
    customName: "Smartrack Rack PDU Bill",
    sourceDeviceUniqId: "smartrack-rpdu-1",
    sourceDeviceKey: "output_energy_1",
    publishTargetDeviceUniqId: "smartrack-bill-rpdu-1",
    publishTopic: "IOT/BillCalculation/Smartrack_Rack_PDU_Bill",
    // PLN B-3 tariff (>200kVA / data center, medium voltage 20kV)
    // Source: Kepmen ESDM, frozen since Q3 2022. USD at ~Rp 16,000/USD.
    rupiahRatePerKwh: 1114.74,
    dollarRatePerKwh: 0.069,
    carbonRateKgPerKwh: 0.87, // JAMALI grid factor (Kepmen ESDM / PLN RUPTL 2021-2030)
  },
];

const BILL_LOGGING_CONFIGS = [
  {
    id: "smartrack_bill_energy_kwh",
    customName: "Smartrack Bill Energy kWh",
    key: "energyKwh",
    units: "kWh",
    multiply: 1,
    loggingIntervalMinutes: 5,
    deviceUniqId: "smartrack-bill-rpdu-1",
  },
];

async function resolveTargetUser(tx) {
  const user =
    (await tx.user.findUnique({
      where: { id: TARGET_USER_ID },
      select: { id: true, email: true },
    })) ||
    (await tx.user.findUnique({
      where: { email: TARGET_USER_EMAIL },
      select: { id: true, email: true },
    }));

  if (!user) {
    throw new Error(
      `Target Smartrack user not found. Seed ${TARGET_USER_EMAIL} first.`,
    );
  }

  return user;
}

async function seedBillPublishDevice(tx, targetUser, config) {
  const existingDevice = await tx.deviceExternal.findFirst({
    where: {
      OR: [
        { uniqId: config.publishTargetDeviceUniqId },
        { topic: config.publishTopic },
      ],
    },
    select: { id: true },
  });

  const baseData = {
    uniqId: config.publishTargetDeviceUniqId,
    name: config.customName,
    topic: config.publishTopic,
    address: "virtual-device",
    deviceType: "VIRTUAL",
    status: "INSTALLED",
  };

  if (existingDevice) {
    await tx.deviceExternal.update({
      where: { id: existingDevice.id },
      data: {
        ...baseData,
        users: {
          set: [{ id: targetUser.id }],
        },
      },
    });
    return "updated";
  }

  await tx.deviceExternal.create({
    data: {
      ...baseData,
      users: {
        connect: [{ id: targetUser.id }],
      },
    },
  });
  return "created";
}

async function seedBillConfig(tx, targetUser, config) {
  await tx.billConfiguration.upsert({
    where: { id: config.id },
    update: {
      customName: config.customName,
      sourceDeviceUniqId: config.sourceDeviceUniqId,
      sourceDeviceKey: config.sourceDeviceKey,
      publishTargetDeviceUniqId: config.publishTargetDeviceUniqId,
      rupiahRatePerKwh: config.rupiahRatePerKwh,
      dollarRatePerKwh: config.dollarRatePerKwh,
      carbonRateKgPerKwh: config.carbonRateKgPerKwh,
      userId: targetUser.id,
    },
    create: {
      id: config.id,
      customName: config.customName,
      sourceDeviceUniqId: config.sourceDeviceUniqId,
      sourceDeviceKey: config.sourceDeviceKey,
      publishTargetDeviceUniqId: config.publishTargetDeviceUniqId,
      rupiahRatePerKwh: config.rupiahRatePerKwh,
      dollarRatePerKwh: config.dollarRatePerKwh,
      carbonRateKgPerKwh: config.carbonRateKgPerKwh,
      userId: targetUser.id,
    },
  });
}

async function seedBillLoggingConfig(tx, config) {
  const existingByDeviceKey = await tx.loggingConfiguration.findFirst({
    where: {
      deviceUniqId: config.deviceUniqId,
      key: config.key,
    },
    select: { id: true },
  });

  const data = {
    customName: config.customName,
    key: config.key,
    units: config.units,
    multiply: config.multiply,
    loggingIntervalMinutes: config.loggingIntervalMinutes,
    deviceUniqId: config.deviceUniqId,
  };

  if (existingByDeviceKey && existingByDeviceKey.id !== config.id) {
    await tx.loggingConfiguration.update({
      where: { id: existingByDeviceKey.id },
      data,
    });
    return "updated";
  }

  const existingById = await tx.loggingConfiguration.findUnique({
    where: { id: config.id },
    select: { id: true },
  });

  if (existingById) {
    await tx.loggingConfiguration.update({
      where: { id: config.id },
      data,
    });
    return "updated";
  }

  await tx.loggingConfiguration.create({
    data: {
      id: config.id,
      ...data,
    },
  });
  return "created";
}

async function seedBillConfigs() {
  console.log("💸 Seeding Smartrack bill configurations...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const targetUser = await resolveTargetUser(tx);
      let createdDevices = 0;
      let updatedDevices = 0;
      let processedBills = 0;
      let createdLogging = 0;
      let updatedLogging = 0;

      for (const config of BILL_CONFIGS_DATA) {
        const sourceDevice = await tx.deviceExternal.findUnique({
          where: { uniqId: config.sourceDeviceUniqId },
          select: { uniqId: true, name: true },
        });

        if (!sourceDevice) {
          throw new Error(
            `Source device not found: ${config.sourceDeviceUniqId}. Seed devices first.`,
          );
        }

        const deviceResult = await seedBillPublishDevice(
          tx,
          targetUser,
          config,
        );
        if (deviceResult === "created") {
          createdDevices++;
        } else {
          updatedDevices++;
        }

        await seedBillConfig(tx, targetUser, config);
        processedBills++;
      }

      for (const loggingConfig of BILL_LOGGING_CONFIGS) {
        const loggingResult = await seedBillLoggingConfig(tx, loggingConfig);
        if (loggingResult === "created") {
          createdLogging++;
        } else {
          updatedLogging++;
        }
      }

      return {
        targetUser,
        createdDevices,
        updatedDevices,
        processedBills,
        createdLogging,
        updatedLogging,
      };
    });

    console.log(`   ✅ Target user: ${result.targetUser.email}`);
    console.log(`   ✅ Bill publish devices created: ${result.createdDevices}`);
    console.log(`   ✅ Bill publish devices updated: ${result.updatedDevices}`);
    console.log(`   ✅ Bill configs processed: ${result.processedBills}`);
    console.log(`   ✅ Bill logging created: ${result.createdLogging}`);
    console.log(`   ✅ Bill logging updated: ${result.updatedLogging}`);
    console.log(
      "   ℹ️ Source key uses RPDU energy payload from output_energy_1.",
    );
    return true;
  } catch (error) {
    console.error("❌ Smartrack bill seeding failed:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupBillConfigs() {
  console.log("🧹 Cleaning up Smartrack bill configurations...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deletedLogging = await tx.loggingConfiguration.deleteMany({
        where: {
          OR: [
            { id: { in: BILL_LOGGING_CONFIGS.map((config) => config.id) } },
            {
              deviceUniqId: {
                in: BILL_LOGGING_CONFIGS.map((config) => config.deviceUniqId),
              },
            },
          ],
        },
      });

      const deletedBills = await tx.billConfiguration.deleteMany({
        where: {
          OR: [
            { id: { in: BILL_CONFIGS_DATA.map((config) => config.id) } },
            {
              publishTargetDeviceUniqId: {
                in: BILL_CONFIGS_DATA.map(
                  (config) => config.publishTargetDeviceUniqId,
                ),
              },
            },
          ],
        },
      });

      const deletedDevices = await tx.deviceExternal.deleteMany({
        where: {
          OR: [
            {
              uniqId: {
                in: BILL_CONFIGS_DATA.map(
                  (config) => config.publishTargetDeviceUniqId,
                ),
              },
            },
            {
              topic: {
                in: BILL_CONFIGS_DATA.map((config) => config.publishTopic),
              },
            },
          ],
        },
      });

      return {
        deletedLogging: deletedLogging.count,
        deletedBills: deletedBills.count,
        deletedDevices: deletedDevices.count,
      };
    });

    console.log(`   🗑️ Deleted bill logging configs: ${result.deletedLogging}`);
    console.log(`   🗑️ Deleted bill configs: ${result.deletedBills}`);
    console.log(`   🗑️ Deleted bill publish devices: ${result.deletedDevices}`);
    return true;
  } catch (error) {
    console.error("❌ Smartrack bill cleanup failed:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  BILL_CONFIGS_DATA,
  BILL_LOGGING_CONFIGS,
  seedBillConfigs,
  cleanupBillConfigs,
  default: seedBillConfigs,
};

if (require.main === module) {
  const args = process.argv.slice(2);

  (async () => {
    const success = args.includes("--cleanup")
      ? await cleanupBillConfigs()
      : await seedBillConfigs();

    if (!success) {
      process.exit(1);
    }

    console.log("Bill seed operation completed successfully!");
  })();
}
