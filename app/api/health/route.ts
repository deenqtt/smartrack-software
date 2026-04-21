import { NextRequest, NextResponse } from 'next/server';
import { checkDatabaseConnection } from '@/lib/prisma';
import { createClient } from 'redis';

export async function GET(request: NextRequest) {
  console.log('[HEALTH] Comprehensive health check with database/redis');

  let databaseStatus = 'unknown';
  let redisStatus = 'unknown';
  let overallStatus = 'healthy';
  let dbLatency = 0;

  try {
    // Test database connection
    const dbHealth = await checkDatabaseConnection();
    databaseStatus = dbHealth.connected ? 'connected' : 'disconnected';
    dbLatency = dbHealth.latency || 0;

    if (!dbHealth.connected) {
      overallStatus = 'unhealthy';
      console.warn('[HEALTH] Database connection failed:', dbHealth.error);
    }

    // Test Redis connection (optional)
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      const redis = createClient({ url: redisUrl });
      await redis.connect();
      await redis.ping();
      await redis.disconnect();
      redisStatus = 'connected';
    } catch (redisError) {
      console.warn('[HEALTH] Redis connection failed (optional):', redisError);
      redisStatus = 'disconnected';
    }

    // Comprehensive health status
    const healthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      message: 'Comprehensive health check completed',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      database: databaseStatus,
      redis: redisStatus,
      latency: dbLatency
    };

    console.log(`[HEALTH] Health check completed - DB: ${databaseStatus}, Redis: ${redisStatus}, Overall: ${overallStatus}`);

    return NextResponse.json(healthStatus, {
      status: overallStatus === 'healthy' ? 200 : 503
    });

  } catch (error) {
    console.error('[HEALTH] Unexpected error:', error);
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      message: 'Health check failed',
      error: error instanceof Error ? error.message : 'Unexpected error in health check',
      database: 'unknown',
      redis: 'unknown'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
