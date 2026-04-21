/**
 * Seed Alarm Configurations
 *
 * Berdasarkan device di seed-devices.js dan payload di docs/payloadDevice.txt
 * AlarmType  : CRITICAL | MAJOR | MINOR
 * AlarmKeyType: THRESHOLD | DIRECT | BIT_VALUE
 *
 * THRESHOLD : minValue / maxValue / maxOnly
 * DIRECT    : directTriggerOnTrue (true = alarm saat nilai === 1/true)
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Alarm Definitions ────────────────────────────────────────────────────────

const ALARMS = [
  // ── Temp Hum 1 ─────────────────────────────────────────────────────────────��
  {
    deviceUniqId: "smartrack-temphum-1",
    customName: "TH1 - High Temperature",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "temp",
    minValue: null,
    maxValue: 32,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-temphum-1",
    customName: "TH1 - High Humidity",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "hum",
    minValue: null,
    maxValue: 75,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-temphum-1",
    customName: "TH1 - Low Humidity",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "hum",
    minValue: 25,
    maxValue: null,
    maxOnly: false,
  },

  // ── Temp Hum 2 ──────────────────────────────────────────────────────────────
  {
    deviceUniqId: "smartrack-temphum-2",
    customName: "TH2 - High Temperature",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "temp",
    minValue: null,
    maxValue: 32,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-temphum-2",
    customName: "TH2 - High Humidity",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "hum",
    minValue: null,
    maxValue: 75,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-temphum-2",
    customName: "TH2 - Low Humidity",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "hum",
    minValue: 25,
    maxValue: null,
    maxOnly: false,
  },

  // ── Vibration ────────────────────────────────────────────────────────────────
  {
    deviceUniqId: "smartrack-sensorvib-1",
    customName: "VIB - Activity Detected",
    alarmType: "MAJOR",
    keyType: "DIRECT",
    key: "activity",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-sensorvib-1",
    customName: "VIB - High X-Axis Vibration",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "x",
    minValue: null,
    maxValue: 1.5,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-sensorvib-1",
    customName: "VIB - High Y-Axis Vibration",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "y",
    minValue: null,
    maxValue: 1.5,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-sensorvib-1",
    customName: "VIB - High Z-Axis Vibration",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "z",
    minValue: null,
    maxValue: 1.5,
    maxOnly: true,
  },

  // ── UPS ──────────────────────────────────────────────────────────────────────
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Low Battery Capacity",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "battery_capacity",
    minValue: 20,
    maxValue: null,
    maxOnly: false,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - High Battery Temperature",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "battery_temperature",
    minValue: null,
    maxValue: 40,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - On Battery (Mains Lost)",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "battery_time_on_battery",
    minValue: null,
    maxValue: 0,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Low Runtime Remaining",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "battery_runtime_remaining",
    minValue: 300,
    maxValue: null,
    maxOnly: false,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Battery Replacement Required",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "battery_replace_indicator_code",
    minValue: null,
    maxValue: 1,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Input Transfer Detected",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "input_line_fail_cause_code",
    minValue: null,
    maxValue: 1,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Output Status Abnormal",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "output_status_code",
    minValue: null,
    maxValue: 2,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Alarm State Active",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "state_alarm_status_code",
    minValue: null,
    maxValue: 1,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - Battery Health Degraded",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "battery_health_code",
    minValue: null,
    maxValue: 2,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-ups-1",
    customName: "UPS - High Internal Temperature",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "internal_ups_temperature",
    minValue: null,
    maxValue: 45,
    maxOnly: true,
  },

  // ── Cooling ──────────────────────────────────────────────────────────────────
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - High Air Return Temperature",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "Air_Return_Temperature",
    minValue: null,
    maxValue: 30,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Low Air Outlet Temperature",
    alarmType: "MINOR",
    keyType: "THRESHOLD",
    key: "Air_Outlet_Temperature",
    minValue: 16,
    maxValue: null,
    maxOnly: false,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Serious Alarm",
    alarmType: "CRITICAL",
    keyType: "DIRECT",
    key: "Serious_Alarm_Output",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Common Alarm",
    alarmType: "MAJOR",
    keyType: "DIRECT",
    key: "Common_Alarm_Output",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Fire/Smoke Alarm",
    alarmType: "CRITICAL",
    keyType: "DIRECT",
    key: "AL49_Fire_Smoke_Alarm",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Water on Floor",
    alarmType: "MAJOR",
    keyType: "DIRECT",
    key: "AL55_Water_On_Floor",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - High Air Return Humidity",
    alarmType: "MINOR",
    keyType: "DIRECT",
    key: "AL86_High_Air_Return_Humidity",
    directTriggerOnTrue: true,
  },
  {
    deviceUniqId: "smartrack-cooling-1",
    customName: "COOL - Low Air Return Humidity",
    alarmType: "MINOR",
    keyType: "DIRECT",
    key: "AL87_Low_Air_Return_Humidity",
    directTriggerOnTrue: true,
  },

  // ── Rack PDU ─────────────────────────────────────────────────────────────────
  {
    deviceUniqId: "smartrack-rpdu-1",
    customName: "PDU - High Inlet Voltage",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "inlet_voltage",
    minValue: null,
    maxValue: 240,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-rpdu-1",
    customName: "PDU - Low Inlet Voltage",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "inlet_voltage",
    minValue: 200,
    maxValue: null,
    maxOnly: false,
  },
  {
    deviceUniqId: "smartrack-rpdu-1",
    customName: "PDU - High Output Current Feed 1",
    alarmType: "CRITICAL",
    keyType: "THRESHOLD",
    key: "output_current_1",
    minValue: null,
    maxValue: 16,
    maxOnly: true,
  },
  {
    deviceUniqId: "smartrack-rpdu-1",
    customName: "PDU - High Output Active Power Feed 1",
    alarmType: "MAJOR",
    keyType: "THRESHOLD",
    key: "output_active_power_1",
    minValue: null,
    maxValue: 7.5,
    maxOnly: true,
  },
];

// ─── Seeder ───────────────────────────────────────────────────────────────────

async function seedAlarms() {
  console.log("🚨 Seeding alarm configurations...");

  // Fetch admin user for notification recipient
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@smartrack.com" },
    select: { id: true, email: true, phoneNumber: true },
  });

  if (!adminUser) {
    console.warn("⚠️  No admin user found — alarms will be seeded without notification recipients.");
    console.warn("   Run seed-users.js first, then re-run this script.");
  } else {
    console.log(`   📱 Notification recipient: ${adminUser.email} (${adminUser.phoneNumber || "no phone"})`);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const alarm of ALARMS) {
    // Update in place when the seeded alarm already exists.
    const existing = await prisma.alarmConfiguration.findFirst({
      where: {
        deviceUniqId: alarm.deviceUniqId,
        customName: alarm.customName,
      },
      select: { id: true },
    });

    // Verify device exists
    const device = await prisma.deviceExternal.findUnique({
      where: { uniqId: alarm.deviceUniqId },
      select: { uniqId: true },
    });

    if (!device) {
      console.warn(`   ⚠️  Device not found: ${alarm.deviceUniqId} — skipping "${alarm.customName}"`);
      skipped++;
      continue;
    }

    const data = {
      customName: alarm.customName,
      alarmType: alarm.alarmType,
      keyType: alarm.keyType,
      key: alarm.key,
      device: { connect: { uniqId: alarm.deviceUniqId } },
      ...(alarm.keyType === "THRESHOLD" && {
        minValue: alarm.minValue ?? null,
        maxValue: alarm.maxValue ?? null,
        maxOnly: alarm.maxOnly ?? false,
      }),
      ...(alarm.keyType === "DIRECT" && {
        directTriggerOnTrue: alarm.directTriggerOnTrue ?? true,
      }),
    };

    if (existing) {
      await prisma.alarmConfiguration.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...(adminUser && adminUser.phoneNumber
            ? {
                notificationRecipients: {
                  deleteMany: {},
                  create: [{ userId: adminUser.id, sendWhatsApp: true }],
                },
              }
            : {}),
        },
      });
      updated++;
      continue;
    }

    await prisma.alarmConfiguration.create({
      data: {
        ...data,
        ...(adminUser && adminUser.phoneNumber
          ? {
              notificationRecipients: {
                create: [{ userId: adminUser.id, sendWhatsApp: true }],
              },
            }
          : {}),
      },
    });

    created++;
  }

  console.log(`   ✅ Created: ${created} alarms`);
  console.log(`   🔄 Updated: ${updated} alarms`);
  if (skipped > 0) console.log(`   ⏭️  Skipped (missing device): ${skipped} alarms`);
  return true;
}

async function cleanupAlarms() {
  console.log("🧹 Cleaning up seeded alarm configurations...");

  const deviceUniqIds = [...new Set(ALARMS.map((a) => a.deviceUniqId))];
  const customNames = ALARMS.map((a) => a.customName);

  const deleted = await prisma.alarmConfiguration.deleteMany({
    where: {
      deviceUniqId: { in: deviceUniqIds },
      customName: { in: customNames },
    },
  });

  console.log(`   🗑️  Deleted: ${deleted.count} alarms`);
  return true;
}

async function main() {
  const args = process.argv.slice(2);

  try {
    if (args.includes("--cleanup")) {
      await cleanupAlarms();
    } else {
      await seedAlarms();
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = { seedAlarms, cleanupAlarms };

if (require.main === module) {
  main();
}
