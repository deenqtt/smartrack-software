try { require("dotenv").config(); } catch (e) {}

const { PrismaClient } = require("@prisma/client");
const { execSync } = require("child_process");
const path = require("path");
const { seedUsers } = require("./seed-users");
const { seedMenu } = require("./seed-menu");
const {
  seedAllTemplates,
  rulechains: seedRuleChainsFromTemplates,
  layout2d: seedAllLayout2DTemplates,
  scada: seedAllScadaTemplates,
  dashboard: seedAllDashboardFromTemplates
} = require("./seed-templates");

const { seedDashboard } = require("./seed-dashboard");
const { seedDevices } = require("./seed-devices");
const { seedDevicesToRacks } = require("./seed-devices-rack");
const { seedLoggingConfigs } = require("./seed-logging-configs");
const { seedPermissions } = require("./seed-permissions");
const { seedBillConfigs } = require("./seed-bill-configs");
const { seedPuePowerAnalyzer } = require("./seed-pue-poweranalyzer");
const { seedAlarms } = require("./seed-alarms");
// const { seedGatewayLocations } = require("./seed-gateway-locations");

const { seedMqttConfig } = require("./seed-mqtt-config");
const { seedRuleChain } = require("./seed-rule-chain");
// const { seedRackDevices } = require("./seed-rack-devices"); // DISABLED: Using template-based seeding instead
// const { seedRacksFromTemplates } = require("./seed-rack-from-templates"); // MERGED: Into seed-devices.js
// Configuration - semua seeding diaktifkan langsung
const SEED_CONFIG = {
  ENABLE_PERMISSIONS: true,
  ENABLE_MENU: true,
  ENABLE_RULE_CHAINS: true,
  ENABLE_LAYOUT2D: true,
  ENABLE_MQTT_CONFIG: true,
  ENABLE_SCADA: true,
  ENABLE_DEVICES: true,
  ENABLE_DEVICES_RACK: true,
  ENABLE_LOGGING_CONFIGS: true,
  ENABLE_BILL_CONFIGS: true,
  ENABLE_PUE_POWERANALYZER: true,
  ENABLE_ALARMS: true,
  ENABLE_RULE_CHAIN_PRESET: true,
  RESET_DATABASE: false,
  FORCE_PRISMA_GENERATE: false,
  QUIET_MODE: false, // Enable quiet mode to reduce verbose output
};

// Create a single shared Prisma client instance
let prisma = null;

function getPrismaClient() {
  if (!prisma) {
    prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
  }
  return prisma;
}

function runCommand(command, description) {
  try {
    console.log(`🔧 ${description}...`);
    execSync(command, { stdio: "inherit" });
    console.log(` ${description} completed`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    return false;
  }
}

// Helper function to log errors with details
function logError(context, error) {
  console.error(`❌ ${context} Error:`, error.message);
  if (error.stack) {
    console.error(`   Stack trace:\n${error.stack}`);
  }
  if (error.code) {
    console.error(`   Error code:`, error.code);
  }
}

// Function to execute seeder with optional quiet mode
async function executeSeeder(seederFunction, quiet = false) {
  if (quiet) {
    // Temporarily suppress console output
    const originalConsole = { ...console };
    console.log = () => { };
    console.info = () => { };
    console.warn = () => { };
    console.debug = () => { };

    try {
      const result = await seederFunction();
      // Restore console functions
      Object.assign(console, originalConsole);
      return result;
    } catch (error) {
      // Restore console functions even on error
      Object.assign(console, originalConsole);
      throw error;
    }
  } else {
    return await seederFunction();
  }
}

async function seedInit() {
  console.log("🚀 Starting modular database seeding...\n");

  // Change to project root directory for Prisma commands
  const projectRoot = path.dirname(__dirname);
  process.chdir(projectRoot);
  console.log(`📁 Changed working directory to: ${process.cwd()}\n`);

  console.log("📋 Seeding Configuration:");
  console.log(`   - Users     : AUTO (seed jika belum ada user)`);
  console.log(`   - Dashboard : AUTO (seed jika belum ada layout)`);
  console.log(`   - Permissions    : ${SEED_CONFIG.ENABLE_PERMISSIONS ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Menu           : ${SEED_CONFIG.ENABLE_MENU ? "ENABLED" : "DISABLED"}`);
  console.log(`   - MQTT Config    : ${SEED_CONFIG.ENABLE_MQTT_CONFIG ? "ENABLED" : "DISABLED"}`);
  console.log(`   - SCADA          : ${SEED_CONFIG.ENABLE_SCADA ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Layout2D       : ${SEED_CONFIG.ENABLE_LAYOUT2D ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Devices        : ${SEED_CONFIG.ENABLE_DEVICES ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Devices Rack   : ${SEED_CONFIG.ENABLE_DEVICES_RACK ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Logging Configs: ${SEED_CONFIG.ENABLE_LOGGING_CONFIGS ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Bill Configs   : ${SEED_CONFIG.ENABLE_BILL_CONFIGS ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Alarms         : ${SEED_CONFIG.ENABLE_ALARMS ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Reset DB       : ${SEED_CONFIG.RESET_DATABASE ? "ENABLED" : "DISABLED"}`);
  console.log(`   - Force Generate : ${SEED_CONFIG.FORCE_PRISMA_GENERATE ? "ENABLED" : "DISABLED"}\n`);

  const steps = [];

  // Database Reset (optional)
  if (SEED_CONFIG.RESET_DATABASE) {
    steps.push(() =>
      runCommand(
        "npx prisma migrate reset --force --skip-generate",
        "Database reset",
      ),
    );
  }

  // Prisma Generate (optional)
  if (SEED_CONFIG.FORCE_PRISMA_GENERATE) {
    steps.push(() =>
      runCommand("npx prisma generate", "Prisma client generation"),
    );
  }

  // Seed Users — auto-detect: jalankan hanya jika belum ada user di DB
  steps.push(async () => {
    try {
      const client = getPrismaClient();
      const userCount = await client.user.count();
      if (userCount === 0) {
        console.log("Users: No users found — seeding default admin...");
        await executeSeeder(seedUsers, SEED_CONFIG.QUIET_MODE);
        console.log("Users: SUCCESS");
      } else {
        console.log(`Users: Skipped (${userCount} user(s) already exist)`);
      }
      return true;
    } catch (error) {
      console.log("Users: FAILED");
      logError("Users seeding", error);
      return false;
    }
  });

  // Seed Permissions (optional) - depends on users being seeded first
  if (SEED_CONFIG.ENABLE_PERMISSIONS) {
    steps.push(async () => {
      try {
        await executeSeeder(seedPermissions, SEED_CONFIG.QUIET_MODE);
        console.log("Permissions: SUCCESS");
        return true;
      } catch (error) {
        console.log("Permissions: FAILED");
        return false;
      }
    });
  }

  // Seed Menu (optional)
  if (SEED_CONFIG.ENABLE_MENU) {
    steps.push(async () => {
      try {
        await executeSeeder(async () => {
          await seedMenu();
        }, SEED_CONFIG.QUIET_MODE);
        console.log("Menu: SUCCESS");
        return true;
      } catch (error) {
        console.log("Menu: FAILED");
        return false;
      }
    });
  }

  // Seed Devices (optional)
  if (SEED_CONFIG.ENABLE_DEVICES) {
    steps.push(async () => {
      try {
        await executeSeeder(seedDevices, SEED_CONFIG.QUIET_MODE);
        console.log("Devices: SUCCESS");
        return true;
      } catch (error) {
        console.log("Devices: FAILED");
        return false;
      }
    });
  }

  // Seed Devices to Racks (optional)
  if (SEED_CONFIG.ENABLE_DEVICES_RACK) {
    steps.push(async () => {
      try {
        await executeSeeder(seedDevicesToRacks, SEED_CONFIG.QUIET_MODE);
        console.log("Devices Rack: SUCCESS");
        return true;
      } catch (error) {
        console.log("Devices Rack: FAILED");
        return false;
      }
    });
  }

  // Seed Rule Chains from Templates (optional)
  if (SEED_CONFIG.ENABLE_RULE_CHAINS) {
    steps.push(async () => {
      try {
        await executeSeeder(
          seedRuleChainsFromTemplates,
          SEED_CONFIG.QUIET_MODE,
        );
        console.log("Rule Chains from Templates: SUCCESS");
        return true;
      } catch (error) {
        console.log("Rule Chains from Templates: FAILED");
        logError("Rule Chains seeding", error);
        return false;
      }
    });
  }

  // Seed Layout2D from Templates (optional)
  if (SEED_CONFIG.ENABLE_LAYOUT2D) {
    steps.push(async () => {
      try {
        await executeSeeder(seedAllLayout2DTemplates, SEED_CONFIG.QUIET_MODE);
        console.log("Layout2D from Templates: SUCCESS");
        return true;
      } catch (error) {
        console.log("Layout2D from Templates: FAILED");
        return false;
      }
    });
  }

  // Seed MQTT Config (optional)
  if (SEED_CONFIG.ENABLE_MQTT_CONFIG) {
    steps.push(async () => {
      try {
        await executeSeeder(seedMqttConfig, SEED_CONFIG.QUIET_MODE);
        console.log("MQTT Config: SUCCESS");
        return true;
      } catch (error) {
        console.log("MQTT Config: FAILED");
        return false;
      }
    });
  }

  // Rack assignments are handled by the dedicated devices-rack seeder

  // Seed Dashboard — auto-detect: seed hanya jika belum ada dashboard layout
  steps.push(async () => {
    try {
      const client = getPrismaClient();
      const dashboardCount = await client.dashboardLayout.count();
      if (dashboardCount === 0) {
        console.log("Dashboard: No layouts found — seeding default dashboard...");
        await executeSeeder(seedDashboard, SEED_CONFIG.QUIET_MODE);
        console.log("Dashboard: SUCCESS");
      } else {
        console.log(`Dashboard: Skipped (${dashboardCount} layout(s) already exist)`);
      }
      return true;
    } catch (error) {
      console.log("Dashboard: FAILED");
      logError("Dashboard seeding", error);
      return false;
    }
  });

  // Seed Rule Chain Presets — auto-detect: seed hanya jika belum ada rule chain di DB
  if (SEED_CONFIG.ENABLE_RULE_CHAIN_PRESET) {
    steps.push(async () => {
      try {
        const client = getPrismaClient();
        const ruleChainCount = await client.ruleChain.count();
        if (ruleChainCount === 0) {
          console.log("Rule Chain Presets: No rule chains found — seeding from template...");
          await executeSeeder(seedRuleChain, SEED_CONFIG.QUIET_MODE);
          console.log("Rule Chain Presets: SUCCESS");
        } else {
          console.log(`Rule Chain Presets: Skipped (${ruleChainCount} rule chain(s) already exist)`);
        }
        return true;
      } catch (error) {
        console.log("Rule Chain Presets: FAILED");
        logError("Rule Chain Presets seeding", error);
        return false;
      }
    });
  }

  // Seed SCADA (optional)
  if (SEED_CONFIG.ENABLE_SCADA) {
    steps.push(async () => {
      try {
        await executeSeeder(seedAllScadaTemplates, SEED_CONFIG.QUIET_MODE);
        console.log("SCADA: SUCCESS");
        return true;
      } catch (error) {
        console.log("SCADA: FAILED");
        return false;
      }
    });
  }

  // Seed Logging Configs (optional)
  if (SEED_CONFIG.ENABLE_LOGGING_CONFIGS) {
    steps.push(async () => {
      try {
        await executeSeeder(seedLoggingConfigs, SEED_CONFIG.QUIET_MODE);
        console.log("Logging Configs: SUCCESS");
        return true;
      } catch (error) {
        console.log("Logging Configs: FAILED");
        return false;
      }
    });
  }

  // Seed Bill Configs (optional)
  if (SEED_CONFIG.ENABLE_BILL_CONFIGS) {
    steps.push(async () => {
      try {
        await executeSeeder(seedBillConfigs, SEED_CONFIG.QUIET_MODE);
        console.log("Bill Configs: SUCCESS");
        return true;
      } catch (error) {
        console.log("Bill Configs: FAILED");
        return false;
      }
    });
  }

  // Seed PUE & PowerAnalyzer Configs (optional) - depends on bill configs / devices
  if (SEED_CONFIG.ENABLE_PUE_POWERANALYZER) {
    steps.push(async () => {
      try {
        await executeSeeder(seedPuePowerAnalyzer, SEED_CONFIG.QUIET_MODE);
        console.log("PUE & PowerAnalyzer Configs: SUCCESS");
        return true;
      } catch (error) {
        console.log("PUE & PowerAnalyzer Configs: FAILED");
        logError("PUE/PowerAnalyzer seeding", error);
        return false;
      }
    });
  }

  // Seed Alarm Configs (optional) - depends on devices being seeded first
  if (SEED_CONFIG.ENABLE_ALARMS) {
    steps.push(async () => {
      try {
        await executeSeeder(seedAlarms, SEED_CONFIG.QUIET_MODE);
        console.log("Alarm Configs: SUCCESS");
        return true;
      } catch (error) {
        console.log("Alarm Configs: FAILED");
        logError("Alarm configs seeding", error);
        return false;
      }
    });
  }

  // Execute all enabled steps
  for (const step of steps) {
    if (!(await step())) {
      console.error("❌ Seeding failed");
      process.exit(1);
    }
    console.log(""); // Add spacing
  }

  console.log("🎉 Modular seeding completed successfully!");
  console.log("\n📝 Summary of seeded modules:");

  console.log("    Users & Roles: auto-seeded if no users existed");

  if (SEED_CONFIG.ENABLE_MENU) {
    console.log("    Menu System seeded (70+ menu items)");
    console.log("      - 11 Menu Groups");
    console.log("      - Role-based permissions");
    console.log("      - Admin Menu Management");
  } else {
    console.log("   ⚪ Menu seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_MQTT_CONFIG) {
    console.log("    MQTT Configuration seeded (3 configurations)");
    console.log(
      '      - "Default Production MQTT" (active) - ws://18.143.215.113:9000',
    );
    console.log('      - "Development MQTT" (inactive) - ws://localhost:9000');
    console.log(
      '      - "Secure MQTT Example" (inactive) - secure config template',
    );
  } else {
    console.log("   ⚪ MQTT configuration seeding skipped (disabled)");
  }

  console.log("    Dashboard Layout: auto-seeded if no layouts existed");

  if (SEED_CONFIG.ENABLE_SCADA) {
    console.log("    SCADA Layouts from Templates seeded");
    console.log("      - Professional SCADA canvas layouts");
    console.log("      - Includes items, positions, and MQTT bindings");
  } else {
    console.log("   ⚪ SCADA seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_LAYOUT2D) {
    console.log("    Layout2D from Templates seeded");
    console.log(
      "      - 'Water Waste Process Flow' layout for waterwaste user",
    );
    console.log(
      "      - Includes pre-configured data points and flow indicators",
    );
  } else {
    console.log("   ⚪ Layout2D seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_DEVICES) {
    console.log("    IoT Devices seeded (95+ devices from JSON data)");
    console.log("      - Container Equipment: 40+ devices");
    console.log(
      "        - 11 RPDU units, 2 Cooling units, 22 Temp/Humidity sensors",
    );
    console.log("        - 3 Power meters, 8 System sensors");
    console.log("      - Modular I/O: 4 devices (drycontacts and relays)");
    console.log("      - Mobile Genset: 4 devices (power and control)");
    console.log("      - Kiosk LVMDP: 2 power meters");
    console.log("      - MV System: 1 digital input device");
    console.log("      - Smartrack: 15+ devices (UPS, RPDU, Cooling, Sensors)");
    console.log("      - CPGs: 3 devices (power meters and digital inputs)");
    console.log("      - LV Rectifier: 1 ADDRAX rectifier");
    console.log("      - IoT Devices: 4 IOT relays and dry contacts");
    console.log("      - Modbus: 12 sensor/relay devices");
    console.log("      - Containment: 8 temperature rack sensors");
  } else {
    console.log("   ⚪ Device seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_DEVICES_RACK) {
    console.log("    Smartrack Devices Rack seeded");
    console.log("      - 4 Smartrack racks processed");
    console.log("      - Rack 1 device positions assigned");
    console.log("      - Rack placement synced for selected Smartrack devices");
  } else {
    console.log("   ⚪ Devices rack seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_LOGGING_CONFIGS) {
    console.log("    Logging Configurations seeded (8 configurations)");
    console.log("      - 4 Flow monitoring configs (rates and totals)");
    console.log("      - 2 PH sensor configs (pH levels)");
    console.log("      - 2 Temperature monitoring configs");
    console.log("      - Ready for chart visualization and data logging");
  } else {
    console.log("   ⚪ Logging configurations seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_BILL_CONFIGS) {
    console.log("    Smartrack Bill Configurations seeded");
    console.log("      - Bill configuration and virtual publish device prepared");
    console.log("      - Bill logging configuration connected to Smartrack source");
    console.log("      - Requires Smartrack admin user and source devices to exist");
  } else {
    console.log("   ⚪ Bill configurations seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_PUE_POWERANALYZER) {
    console.log("    Smartrack PUE & PowerAnalyzer Configurations seeded");
    console.log("      - PUE: mainPower=UPS output_active_power, IT=PDU output_active_power_1");
    console.log("      - PowerAnalyzer: IT load % derived from the active PDU feed");
    console.log("      - Virtual publish devices + logging configs created");
  } else {
    console.log("   ⚪ PUE & PowerAnalyzer seeding skipped (disabled)");
  }

  if (SEED_CONFIG.ENABLE_ALARMS) {
    console.log("    Alarm Configurations seeded (29 alarms)");
    console.log("      - Temp/Hum 1 & 2: High Temp, High/Low Humidity");
    console.log("      - Vibration: Activity, High X/Y/Z-Axis");
    console.log("      - UPS: Battery, runtime, transfer, status, health, temperature alarms");
    console.log("      - Cooling: Temp, Serious/Common Alarm, Fire, Water, Humidity");
    console.log("      - Rack PDU: Inlet Voltage, Output Current, Active Power");
    console.log("      - Admin user set as WhatsApp notification recipient");
  } else {
    console.log("   ⚪ Alarm configurations seeding skipped (disabled)");
  }

  if (
    !SEED_CONFIG.ENABLE_MENU &&
    !SEED_CONFIG.ENABLE_DEVICES &&
    !SEED_CONFIG.ENABLE_DEVICES_RACK &&
    !SEED_CONFIG.ENABLE_LOGGING_CONFIGS &&
    !SEED_CONFIG.ENABLE_BILL_CONFIGS &&
    !SEED_CONFIG.ENABLE_ALARMS
  ) {
    console.log("   ⚠️  No seeding modules were enabled");
  }
}

// Export functions for external use
module.exports = {
  seedInit,
  default: seedInit,

  // Export individual seeders
  seedUsers,
  seedMenu,
  seedMqttConfig,
  seedDashboard,
  seedDevices,
  seedDevicesToRacks,
  // seedRacksFromTemplates, // MERGED: Into seed-devices
  // seedRackDevices, // DEPRECATED
  seedLoggingConfigs,
  seedBillConfigs,
  seedPuePowerAnalyzer,
  seedAlarms,
  seedRuleChain,

  // Export config
  SEED_CONFIG,
};

// Run if called directly
if (require.main === module) {
  seedInit()
    .then(() => {
      console.log("\n All seeding operations completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Seeding failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      if (prisma) {
        await prisma.$disconnect();
      }
    });
}
