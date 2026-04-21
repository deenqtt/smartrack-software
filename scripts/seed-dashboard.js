const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "dashboard-templates",
  "smartrack.json",
);
const TARGET_USER_ID = "admin-smartrack-001";
const TARGET_USER_EMAIL = "admin@smartrack.com";

function loadSmartrackTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template file not found: ${TEMPLATE_PATH}`);
  }

  const templateData = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
  if (!Array.isArray(templateData.dashboards) || templateData.dashboards.length === 0) {
    throw new Error("Smartrack dashboard template is empty");
  }

  return templateData;
}

function saveSmartrackTemplate(dashboards) {
  const templateData = {
    userType: "smartrack",
    description: "Shared Smartrack dashboard presets",
    dashboards,
    totalDashboards: dashboards.length,
    generatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(TEMPLATE_PATH, `${JSON.stringify(templateData, null, 2)}\n`);
}

async function resolveTargetUser() {
  const user =
    (await prisma.user.findUnique({
      where: { id: TARGET_USER_ID },
      select: { id: true, email: true },
    })) ||
    (await prisma.user.findUnique({
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

async function seedDashboard() {
  console.log("📊 Seeding Smartrack dashboard presets...");

  try {
    const template = loadSmartrackTemplate();
    const targetUser = await resolveTargetUser();

    console.log(
      `   Found ${template.dashboards.length} dashboards for ${targetUser.email}`,
    );

    for (const dashboard of template.dashboards) {
      await prisma.dashboardLayout.upsert({
        where: {
          userId_name: {
            userId: targetUser.id,
            name: dashboard.name,
          },
        },
        update: {
          layout: dashboard.layout,
          inUse: dashboard.inUse,
          isActive: dashboard.isActive,
        },
        create: {
          name: dashboard.name,
          layout: dashboard.layout,
          userId: targetUser.id,
          inUse: dashboard.inUse,
          isActive: dashboard.isActive,
        },
      });

      console.log(`   ✅ Seeded dashboard: ${dashboard.name}`);
    }

    console.log("\n✅ Smartrack dashboard seeding completed successfully.");
    return true;
  } catch (error) {
    console.error("❌ Error seeding Smartrack dashboards:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchDashboardTemplate() {
  console.log("📥 Fetching Smartrack dashboards from database...");

  try {
    const targetUser = await resolveTargetUser();
    const dashboards = await prisma.dashboardLayout.findMany({
      where: { userId: targetUser.id },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        layout: true,
        inUse: true,
        isActive: true,
      },
    });

    if (dashboards.length === 0) {
      throw new Error(`No dashboards found for ${targetUser.email}`);
    }

    saveSmartrackTemplate(dashboards);

    console.log(
      `   ✅ Saved ${dashboards.length} dashboards to ${TEMPLATE_PATH}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error fetching Smartrack dashboards:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupDashboard() {
  console.log("🧹 Cleaning up Smartrack dashboard data...");

  try {
    const targetUser = await resolveTargetUser();

    const deletedDashboards = await prisma.dashboardLayout.deleteMany({
      where: { userId: targetUser.id },
    });
    console.log(
      `   🗑️ Deleted ${deletedDashboards.count} dashboard layouts for ${targetUser.email}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error cleaning up Smartrack dashboards:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions
module.exports = {
  seedDashboard,
  fetchDashboardTemplate,
  cleanupDashboard,
  default: seedDashboard
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  console.log("🌱 Starting Smartrack dashboard seeding...");

  (async () => {
    if (args.includes("--fetch")) {
      const success = await fetchDashboardTemplate();
      if (!success) {
        console.error("❌ Dashboard fetch failed!");
        process.exit(1);
      }
    } else if (args.includes('--cleanup')) {
      const success = await cleanupDashboard();
      if (!success) {
        console.error("❌ Dashboard cleanup failed!");
        process.exit(1);
      }
    } else {
      const success = await seedDashboard();
      if (!success) {
        console.error("❌ Dashboard seeding failed!");
        process.exit(1);
      }
    }

    console.log("Dashboard operation completed successfully!");
  })();
}
