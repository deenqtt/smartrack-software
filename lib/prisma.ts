import { PrismaClient } from "@prisma/client";

// Global Prisma client instance - singleton pattern to prevent connection leaks in dev hot reload
declare global {
  var __prisma: PrismaClient | undefined;
}

const DATABASE_URL = process.env.DATABASE_URL || "";

// Build URL with connection limit to prevent pool exhaustion on hot reloads
function buildDatabaseUrl(base: string): string {
  if (!base) return base;
  try {
    const url = new URL(base);
    // Limit connections so hot-reloads don't exhaust the PostgreSQL max_connections
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "5");
    }
    if (!url.searchParams.has("pool_timeout")) {
      url.searchParams.set("pool_timeout", "20");
    }
    return url.toString();
  } catch {
    return base;
  }
}

// Create Prisma client with connection pool limits
const createPrismaClient = () => {
  // DEMO_MODE: Return a null-safe proxy so any unguarded Prisma call fails gracefully
  if (!DATABASE_URL || process.env.DEMO_MODE === "true") {
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === "$disconnect" || prop === "$connect") return async () => {};
        if (prop === "$queryRaw") return async () => [{ "1": 1 }];
        // Return a chainable object for model accessors (e.g. prisma.user.findMany())
        const modelProxy: any = new Proxy({}, {
          get(__, method) {
            return async (..._args: any[]) => {
              console.warn(`[DEMO] prisma.${String(prop)}.${String(method)}() called without DB — returning null`);
              return null;
            };
          }
        });
        return modelProxy;
      }
    }) as unknown as PrismaClient;
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: buildDatabaseUrl(DATABASE_URL),
      },
    },
  });
};

// Use existing singleton or create new one
export const prisma: PrismaClient =
  (globalThis as any).__prisma || createPrismaClient();

// Always store singleton in global — critical for Next.js dev hot reload
// Without this, each hot reload creates a NEW PrismaClient with NEW connections
(globalThis as any).__prisma = prisma;


// Connection health check function
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;

    const latency = Date.now() - startTime;

    return {
      connected: true,
      latency,
    };
  } catch (error: any) {
    const latency = Date.now() - startTime;

    return {
      connected: false,
      latency,
      error: error.message || "Database connection failed",
    };
  }
}

// Graceful shutdown function (use with caution in serverless environments)
export async function disconnectPrisma() {
  try {
    console.log("[PRISMA] Disconnecting from database...");
    await prisma.$disconnect();
    console.log("[PRISMA] Successfully disconnected from database");
  } catch (error) {
    console.error("[PRISMA] Error during disconnection:", error);
  }
}

// Export default for compatibility
export default prisma;
