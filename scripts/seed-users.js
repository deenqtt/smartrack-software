/**
 * Unified User Seeder - JavaScript Version
 *
 * This script provides a unified approach for seeding users both as:
 * 1. Application service (during startup)
 * 2. Standalone script (via npm/yarn scripts)
 *
 * It uses the same global prisma client with connection pooling
 * and shares logic with the UserSeederService
 *
 * Automatically creates dashboards for new admin users
 */

const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { seedDashboard } = require("./seed-dashboard");

const prisma = new PrismaClient();

const DEFAULT_USERS = [
  {
    id: "admin-smartrack-001",
    email: "admin@smartrack.com",
    password: "admin123",
    role: "ADMIN",
    phoneNumber: "6281234567890", // format: 62xxxxxxxxxx (no leading +)
  },
];

/**
 * Hash password using bcrypt
 */
async function hashPassword(password, saltRounds = 12) {
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Check if users exist in the database
 */
async function checkExistingUsers() {
  try {
    const userCount = await prisma.user.count();
    return userCount;
  } catch (error) {
    console.error("[UserSeeder] Error checking existing users:", error);
    throw error;
  }
}

/**
 * Create a single user
 */
async function createUser(userData) {
  try {
    const hashedPassword = await hashPassword(userData.password);

    // First, ensure the role exists or create it
    const roleName = userData.role;
    let role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      const descriptions = {
        ADMIN: "Administrator with full system access",
        USER: "Regular user with limited access",
        DEVELOPER: "Developer with advanced access",
      };

      role = await prisma.role.create({
        data: {
          name: roleName,
          description: descriptions[roleName] || `${roleName} role`,
        },
      });
    }

    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: hashedPassword,
        roleId: role.id,
        phoneNumber: userData.phoneNumber || null,
        ...(userData.id && { id: userData.id }),
      },
      create: {
        ...(userData.id && { id: userData.id }),
        email: userData.email,
        password: hashedPassword,
        roleId: role.id,
        phoneNumber: userData.phoneNumber || null,
      },
      include: {
        role_data: {
          select: { name: true },
        },
      },
    });

    return user;
  } catch (error) {
    console.error(`[UserSeeder] Error creating user ${userData.email}:`, error);
    throw error;
  }
}

/**
 * Seed all users (always overwrites existing data)
 */
async function seedUsers() {
  try {
    console.log("[UserSeeder] Seeding users (will overwrite existing data)...");

    // Always create/update all users
    const createdUsers = [];

    for (const userData of DEFAULT_USERS) {
      try {
        const user = await createUser(userData);
        createdUsers.push(user);
        console.log(`[UserSeeder] ✅ Processed user: ${userData.email}`);
      } catch (error) {
        console.error(
          `[UserSeeder] ❌ Failed to process user ${userData.email}:`,
          error,
        );
        // Continue with other users even if one fails
      }
    }

    console.log(`[UserSeeder] Processed ${createdUsers.length} users`);
    return createdUsers.length > 0;
  } catch (error) {
    console.error("[UserSeeder] Error seeding users:", error);
    return false;
  }
}

/**
 * Seed specific custom users (always overwrites existing data)
 */
async function seedCustomUsers(users) {
  try {
    console.log(
      `[UserSeeder] Seeding ${users.length} custom users (will overwrite existing data)...`,
    );

    let seeded = 0;

    for (const userData of users) {
      try {
        await createUser(userData);
        console.log(
          `[UserSeeder] ✅ Processed ${userData.role.toLowerCase()} user: ${userData.email}`,
        );
        seeded++;
      } catch (error) {
        console.error(
          `[UserSeeder] ❌ Failed to process user ${userData.email}:`,
          error,
        );
        // Continue with other users even if one fails
      }
    }

    console.log(`[UserSeeder] Processed ${seeded} custom users`);
    return seeded > 0;
  } catch (error) {
    console.error("[UserSeeder] Error seeding custom users:", error);
    return false;
  }
}

// Main execution function
async function main() {
  console.log("👥 User Seeder - Seeding all users");

  try {
    const success = await seedUsers();

    if (success) {
      console.log("🎉 User seeding completed successfully!");
    } else {
      console.log("❌ User seeding completed with errors");
    }
  } catch (error) {
    console.error("❌ User seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Export for require
module.exports = {
  seedUsers,
  seedCustomUsers,
  // Backward compatibility aliases
  seedDefaultUsers: seedUsers,
  seedDevelopmentUsers: seedUsers,
  default: seedUsers,
};

// Run if called directly
if (require.main === module) {
  main();
}
