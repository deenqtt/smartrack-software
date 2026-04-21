// lib/database/database-service.ts
// REFACTORED: Now uses global Prisma client with connection pooling
import { prisma } from "@/lib/prisma";

interface DatabaseConfig {
  useLocal: boolean;
}

class DatabaseService {
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    // Note: Now uses global prisma client with connection pooling instead of individual client
  }

  // Main database operations - now using global prisma
  async findMany(table: string, options?: any) {
    try {
      return await (prisma as any)[table].findMany(options);
    } catch (error) {
      console.error(`Error in findMany for ${table}:`, error);
      throw error;
    }
  }

  async findUnique(table: string, options: any) {
    try {
      return await (prisma as any)[table].findUnique(options);
    } catch (error) {
      console.error(`Error in findUnique for ${table}:`, error);
      throw error;
    }
  }

  async create(table: string, data: any) {
    try {
      const result = await (prisma as any)[table].create({
        data: data,
      });
      return result;
    } catch (error) {
      console.error(`Error in create for ${table}:`, error);
      throw error;
    }
  }

  async update(table: string, where: any, data: any) {
    try {
      const result = await (prisma as any)[table].update({
        where,
        data: { ...data, updatedAt: new Date() },
      });
      return result;
    } catch (error) {
      console.error(`Error in update for ${table}:`, error);
      throw error;
    }
  }

  async delete(table: string, where: any) {
    try {
      return await (prisma as any)[table].delete({ where });
    } catch (error) {
      console.error(`Error in delete for ${table}:`, error);
      throw error;
    }
  }

  // Batch operations untuk IoT data logging
  async createMany(table: string, data: any[]) {
    try {
      const batchSize = 1000; // PostgreSQL optimal batch size
      const results = [];

      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        const result = await (prisma as any)[table].createMany({
          data: batch,
          skipDuplicates: true,
        });
        results.push(result);
      }

      return results;
    } catch (error) {
      console.error(`Error in createMany for ${table}:`, error);
      throw error;
    }
  }

  // Utility methods - now using global prisma
  async getStorageInfo() {
    const stats = (await prisma.$queryRaw`
      SELECT
        schemaname,
        tablename,
        n_live_tup as recordCount
      FROM pg_stat_user_tables
      ORDER BY tablename
    `) as any[];

    const dbSize = (await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `) as any[];

    return {
      tables: stats,
      totalSize: dbSize[0]?.size || "0",
    };
  }

  async getDeviceStatus() {
    const totalDevices = await prisma.deviceExternal.count();

    const recentLogs = await prisma.loggedData.count({
      where: {
        timestamp: {
          gte: new Date(Date.now() - 5 * 60 * 1000), // Last 5 minutes
        },
      },
    });

    return {
      totalDevices,
      recentLogs,
    };
  }

  // Cleanup old data untuk prevent storage bloat
  async cleanupOldData() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Keep only last 30 days of logged data
    await prisma.loggedData.deleteMany({
      where: { timestamp: { lt: thirtyDaysAgo } },
    });

    // Keep only last 7 days of alarm logs
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await prisma.alarmLog.deleteMany({
      where: { timestamp: { lt: sevenDaysAgo } },
    });

    console.log("Database cleanup completed");
  }

  async disconnect() {
    await prisma.$disconnect();
  }
}

// Singleton instance
const dbConfig: DatabaseConfig = {
  useLocal: true,
};

const db = new DatabaseService(dbConfig);

// Export for backward compatibility, but use prisma global directly where possible
export { db };
export { prisma } from "@/lib/prisma";
export default db;
