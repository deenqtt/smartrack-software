const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "rule-chain",
  "smartrack.json",
);
const TARGET_USER_ID = "admin-smartrack-001";
const TARGET_USER_EMAIL = "admin@smartrack.com";

function loadSmartrackTemplate() {
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template file not found: ${TEMPLATE_PATH}`);
  }

  const templateData = JSON.parse(fs.readFileSync(TEMPLATE_PATH, "utf8"));
  if (!Array.isArray(templateData.ruleChains) || templateData.ruleChains.length === 0) {
    throw new Error("Smartrack rule chain template is empty");
  }

  return templateData;
}

function saveSmartrackTemplate(ruleChains) {
  const templateData = {
    userType: "smartrack",
    description: "Shared Smartrack rule chain presets",
    ruleChains,
    totalRuleChains: ruleChains.length,
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

async function seedRuleChain() {
  console.log("⛓️  Seeding Smartrack rule chain presets...");

  try {
    const template = loadSmartrackTemplate();
    const targetUser = await resolveTargetUser();

    console.log(
      `   Found ${template.ruleChains.length} rule chains for ${targetUser.email}`,
    );

    for (const ruleChain of template.ruleChains) {
      await prisma.ruleChain.upsert({
        where: {
          userId_name: {
            userId: targetUser.id,
            name: ruleChain.name,
          },
        },
        update: {
          description: ruleChain.description ?? null,
          nodes: ruleChain.nodes,
          edges: ruleChain.edges,
          isActive: ruleChain.isActive,
        },
        create: {
          name: ruleChain.name,
          description: ruleChain.description ?? null,
          nodes: ruleChain.nodes,
          edges: ruleChain.edges,
          isActive: ruleChain.isActive,
          userId: targetUser.id,
        },
      });

      console.log(`   ✅ Seeded rule chain: ${ruleChain.name}`);
    }

    console.log("\n✅ Smartrack rule chain seeding completed successfully.");
    return true;
  } catch (error) {
    console.error("❌ Error seeding Smartrack rule chains:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function fetchRuleChainTemplate() {
  console.log("📥 Fetching Smartrack rule chains from database...");

  try {
    const targetUser = await resolveTargetUser();
    const ruleChains = await prisma.ruleChain.findMany({
      where: { userId: targetUser.id },
      orderBy: { createdAt: "asc" },
      select: {
        name: true,
        description: true,
        nodes: true,
        edges: true,
        isActive: true,
      },
    });

    if (ruleChains.length === 0) {
      throw new Error(`No rule chains found for ${targetUser.email}`);
    }

    saveSmartrackTemplate(ruleChains);

    console.log(
      `   ✅ Saved ${ruleChains.length} rule chains to ${TEMPLATE_PATH}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error fetching Smartrack rule chains:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupRuleChain() {
  console.log("🧹 Cleaning up Smartrack rule chain data...");

  try {
    const targetUser = await resolveTargetUser();

    const deleted = await prisma.ruleChain.deleteMany({
      where: { userId: targetUser.id },
    });
    console.log(
      `   🗑️  Deleted ${deleted.count} rule chains for ${targetUser.email}`,
    );
    return true;
  } catch (error) {
    console.error("❌ Error cleaning up Smartrack rule chains:", error.message);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Export functions
module.exports = {
  seedRuleChain,
  fetchRuleChainTemplate,
  cleanupRuleChain,
  default: seedRuleChain,
};

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  console.log("🌱 Starting Smartrack rule chain seeding...");

  (async () => {
    if (args.includes("--fetch")) {
      const success = await fetchRuleChainTemplate();
      if (!success) {
        console.error("❌ Rule chain fetch failed!");
        process.exit(1);
      }
    } else if (args.includes("--cleanup")) {
      const success = await cleanupRuleChain();
      if (!success) {
        console.error("❌ Rule chain cleanup failed!");
        process.exit(1);
      }
    } else {
      const success = await seedRuleChain();
      if (!success) {
        console.error("❌ Rule chain seeding failed!");
        process.exit(1);
      }
    }

    console.log("Rule chain operation completed successfully!");
  })();
}
