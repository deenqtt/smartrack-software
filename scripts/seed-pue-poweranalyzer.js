/**
 * Seed: PUE & PowerAnalyzer Configurations for Smartrack
 *
 * Device mapping (from seed-devices.js + payloadDevice.txt):
 *
 *  mainPower  → UPS (smartrack-ups-1)
 *                 key: output_active_power  → UPS total active power
 *
 *  IT Load    → Rack PDU (smartrack-rpdu-1)
 *                 key: output_active_power_1  → Circuit 1 active power
 *
 *  PUE        = mainPower / Σ(pduActivePower)   → ratio, ideal ~1.0-1.5
 *  PowerAnlyz = (circuit / mainPower) × 100   → per-circuit load %
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// ─── Source Devices ───────────────────────────────────────────────────────────
const UPS_UNIQ_ID     = "smartrack-ups-1";
const PDU_UNIQ_ID     = "smartrack-rpdu-1";

// ─── PUE Config ───────────────────────────────────────────────────────────────
const PUE_CONFIG = {
  id:          "smartrack_pue_1",
  customName:  "Smartrack PUE",
  // mainPower: UPS active power as facility power source
  mainPower: {
    topicUniqId: UPS_UNIQ_ID,
    key:         "output_active_power",
    value:       null,
  },
  // pduList: PDU active power → IT equipment load
  pduList: [
    {
      topicUniqId: PDU_UNIQ_ID,
      name:        "Rack PDU Feed 1",
      keys:        ["output_active_power_1"],
      value:       null,
    },
  ],
  // virtual device that receives published PUE results
  publishDevice: {
    uniqId: "smartrack-pue-1",
    name:   "Smartrack PUE",
    topic:  "IOT/PUE/Smartrack_PUE",
  },
  // logging: track pueValue over time
  loggingConfig: {
    id:                    "smartrack_pue_value_log",
    customName:            "Smartrack PUE Value",
    key:                   "pueValue",
    units:                 "ratio",
    multiply:              1,
    loggingIntervalMinutes: 5,
    deviceUniqId:          "smartrack-pue-1",
  },
};

// ─── PowerAnalyzer Config ─────────────────────────────────────────────────────
const POWER_ANALYZER_CONFIG = {
  id:         "smartrack_poweranalyzer_1",
  customName: "Smartrack Power Analyzer",
  // mainPower: same UPS active power → denominator for load %
  mainPower: {
    topicUniqId: UPS_UNIQ_ID,
    key:         "output_active_power",
    value:       null,
  },
  // pduList: only the active PDU feed available in the payload
  pduList: [
    {
      topicUniqId: PDU_UNIQ_ID,
      name:        "PDU Circuit 1",
      keys:        ["output_active_power_1"],
      value:       null,
    },
  ],
  // virtual device that receives published PowerAnalyzer results
  publishDevice: {
    uniqId: "smartrack-poweranalyzer-1",
    name:   "Smartrack Power Analyzer",
    topic:  "IOT/PowerAnalyzer/Smartrack_Power_Analyzer",
  },
  // logging: track itLoadPercentage over time
  loggingConfig: {
    id:                    "smartrack_poweranalyzer_load_log",
    customName:            "Smartrack IT Load %",
    key:                   "itLoadPercentage",
    units:                 "%",
    multiply:              1,
    loggingIntervalMinutes: 5,
    deviceUniqId:          "smartrack-poweranalyzer-1",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function upsertPublishDevice(tx, device) {
  const existing = await tx.deviceExternal.findFirst({
    where: {
      OR: [{ uniqId: device.uniqId }, { topic: device.topic }],
    },
    select: { id: true },
  });

  const data = {
    uniqId:     device.uniqId,
    name:       device.name,
    topic:      device.topic,
    address:    "virtual-device",
    deviceType: "VIRTUAL",
    status:     "INSTALLED",
  };

  if (existing) {
    await tx.deviceExternal.update({ where: { id: existing.id }, data });
    return "updated";
  }

  await tx.deviceExternal.create({ data });
  return "created";
}

async function upsertLoggingConfig(tx, config) {
  // Check if a logging config already exists for this device+key pair
  const existingByDeviceKey = await tx.loggingConfiguration.findFirst({
    where: { deviceUniqId: config.deviceUniqId, key: config.key },
    select: { id: true },
  });

  const data = {
    customName:             config.customName,
    key:                    config.key,
    units:                  config.units,
    multiply:               config.multiply,
    loggingIntervalMinutes: config.loggingIntervalMinutes,
    deviceUniqId:           config.deviceUniqId,
  };

  if (existingByDeviceKey) {
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
    await tx.loggingConfiguration.update({ where: { id: config.id }, data });
    return "updated";
  }

  await tx.loggingConfiguration.create({ data: { id: config.id, ...data } });
  return "created";
}

// ─── PUE Seed ─────────────────────────────────────────────────────────────────

async function seedPueConfig(tx) {
  const cfg = PUE_CONFIG;

  // Verify source devices exist
  const ups = await tx.deviceExternal.findUnique({
    where: { uniqId: UPS_UNIQ_ID },
    select: { uniqId: true },
  });
  if (!ups) throw new Error(`UPS device not found: ${UPS_UNIQ_ID}. Run seed-devices.js first.`);

  const pdu = await tx.deviceExternal.findUnique({
    where: { uniqId: PDU_UNIQ_ID },
    select: { uniqId: true },
  });
  if (!pdu) throw new Error(`PDU device not found: ${PDU_UNIQ_ID}. Run seed-devices.js first.`);

  // Create/update virtual publish device
  const deviceResult = await upsertPublishDevice(tx, cfg.publishDevice);

  // Upsert PUE configuration
  await tx.pueConfiguration.upsert({
    where: { id: cfg.id },
    update: {
      customName:     cfg.customName,
      mainPower:      JSON.stringify(cfg.mainPower),
      pduList:        JSON.stringify(cfg.pduList),
      apiTopicUniqId: cfg.publishDevice.uniqId,
    },
    create: {
      id:             cfg.id,
      customName:     cfg.customName,
      mainPower:      JSON.stringify(cfg.mainPower),
      pduList:        JSON.stringify(cfg.pduList),
      apiTopicUniqId: cfg.publishDevice.uniqId,
    },
  });

  // Upsert logging config
  const logResult = await upsertLoggingConfig(tx, cfg.loggingConfig);

  return { deviceResult, logResult };
}

// ─── PowerAnalyzer Seed ───────────────────────────────────────────────────────

async function seedPowerAnalyzerConfig(tx) {
  const cfg = POWER_ANALYZER_CONFIG;

  // Verify source devices exist
  const ups = await tx.deviceExternal.findUnique({
    where: { uniqId: UPS_UNIQ_ID },
    select: { uniqId: true },
  });
  if (!ups) throw new Error(`UPS device not found: ${UPS_UNIQ_ID}. Run seed-devices.js first.`);

  const pdu = await tx.deviceExternal.findUnique({
    where: { uniqId: PDU_UNIQ_ID },
    select: { uniqId: true },
  });
  if (!pdu) throw new Error(`PDU device not found: ${PDU_UNIQ_ID}. Run seed-devices.js first.`);

  // Create/update virtual publish device
  const deviceResult = await upsertPublishDevice(tx, cfg.publishDevice);

  // Upsert PowerAnalyzer configuration
  await tx.powerAnalyzerConfiguration.upsert({
    where: { id: cfg.id },
    update: {
      customName:     cfg.customName,
      mainPower:      JSON.stringify(cfg.mainPower),
      pduList:        JSON.stringify(cfg.pduList),
      apiTopicUniqId: cfg.publishDevice.uniqId,
    },
    create: {
      id:             cfg.id,
      customName:     cfg.customName,
      mainPower:      JSON.stringify(cfg.mainPower),
      pduList:        JSON.stringify(cfg.pduList),
      apiTopicUniqId: cfg.publishDevice.uniqId,
    },
  });

  // Upsert logging config
  const logResult = await upsertLoggingConfig(tx, cfg.loggingConfig);

  return { deviceResult, logResult };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedPuePowerAnalyzer() {
  console.log("⚡ Seeding Smartrack PUE & PowerAnalyzer configurations...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const pue = await seedPueConfig(tx);
      const pa  = await seedPowerAnalyzerConfig(tx);
      return { pue, pa };
    });

    console.log(`   ✅ PUE publish device : ${result.pue.deviceResult}`);
    console.log(`   ✅ PUE config         : upserted (id: ${PUE_CONFIG.id})`);
    console.log(`   ✅ PUE logging        : ${result.pue.logResult}`);
    console.log(`   ✅ PowerAnalyzer device: ${result.pa.deviceResult}`);
    console.log(`   ✅ PowerAnalyzer config: upserted (id: ${POWER_ANALYZER_CONFIG.id})`);
    console.log(`   ✅ PowerAnalyzer logging: ${result.pa.logResult}`);
    console.log("");
    console.log("   📡 Publish topics:");
    console.log(`      PUE           → ${PUE_CONFIG.publishDevice.topic}`);
    console.log(`      PowerAnalyzer → ${POWER_ANALYZER_CONFIG.publishDevice.topic}`);
    console.log("");
    console.log("   ℹ️  mainPower uses UPS output_active_power as facility power source.");
    console.log("   ℹ️  IT load uses PDU output_active_power_1 from the current payload.");

    return true;
  } catch (error) {
    console.error("❌ PUE/PowerAnalyzer seeding failed:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupPuePowerAnalyzer() {
  console.log("🧹 Cleaning up Smartrack PUE & PowerAnalyzer configurations...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const deletedPueLogs = await tx.loggingConfiguration.deleteMany({
        where: {
          OR: [
            { id: PUE_CONFIG.loggingConfig.id },
            { deviceUniqId: PUE_CONFIG.publishDevice.uniqId },
          ],
        },
      });

      const deletedPaLogs = await tx.loggingConfiguration.deleteMany({
        where: {
          OR: [
            { id: POWER_ANALYZER_CONFIG.loggingConfig.id },
            { deviceUniqId: POWER_ANALYZER_CONFIG.publishDevice.uniqId },
          ],
        },
      });

      const deletedPue = await tx.pueConfiguration.deleteMany({
        where: { id: PUE_CONFIG.id },
      });

      const deletedPa = await tx.powerAnalyzerConfiguration.deleteMany({
        where: { id: POWER_ANALYZER_CONFIG.id },
      });

      const deletedDevices = await tx.deviceExternal.deleteMany({
        where: {
          uniqId: {
            in: [
              PUE_CONFIG.publishDevice.uniqId,
              POWER_ANALYZER_CONFIG.publishDevice.uniqId,
            ],
          },
        },
      });

      return {
        deletedPueLogs:  deletedPueLogs.count,
        deletedPaLogs:   deletedPaLogs.count,
        deletedPue:      deletedPue.count,
        deletedPa:       deletedPa.count,
        deletedDevices:  deletedDevices.count,
      };
    });

    console.log(`   🗑️  PUE logging configs deleted    : ${result.deletedPueLogs}`);
    console.log(`   🗑️  PA logging configs deleted     : ${result.deletedPaLogs}`);
    console.log(`   🗑️  PUE configs deleted            : ${result.deletedPue}`);
    console.log(`   🗑️  PowerAnalyzer configs deleted  : ${result.deletedPa}`);
    console.log(`   🗑️  Virtual devices deleted        : ${result.deletedDevices}`);

    return true;
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  seedPuePowerAnalyzer,
  cleanupPuePowerAnalyzer,
  PUE_CONFIG,
  POWER_ANALYZER_CONFIG,
  default: seedPuePowerAnalyzer,
};

if (require.main === module) {
  const args = process.argv.slice(2);

  (async () => {
    const success = args.includes("--cleanup")
      ? await cleanupPuePowerAnalyzer()
      : await seedPuePowerAnalyzer();

    if (!success) process.exit(1);

    const action = args.includes("--cleanup") ? "cleanup" : "seed";
    console.log(`\nPUE & PowerAnalyzer ${action} completed successfully!`);
  })();
}
