// instrumentation.ts
// This file is automatically loaded by Next.js during application startup
export async function register() {
  // Only run service initialization in production (Node.js runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // DEMO_MODE: Skip all background services (MQTT, cron, Redis, alarms)
    if (process.env.DEMO_MODE === "true") {
      console.log("[INSTRUMENTATION] DEMO_MODE=true: Background services skipped for portfolio deployment");
      return;
    }

    try {
      console.log("[INSTRUMENTATION] Initializing background services...");

      // Import and initialize background services
      const { initializeBackgroundServices } = await import(
        "./lib/init-services"
      );

      await initializeBackgroundServices();

      console.log("[INSTRUMENTATION] Background services initialized successfully");
    } catch (error) {
      console.error("[INSTRUMENTATION] Failed to initialize background services:", error);
      // Don't throw - let the app continue without background services
    }
  }
}