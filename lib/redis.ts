/**
 * Redis Configuration for Performance Caching
 *
 * Provides Redis connection and basic caching utilities for
 * NewModBit IoT Dashboard application.
 * Supports both Upstash (production) and local Redis (development)
 */

let RedisClient: any;
let redis: any;

// Export redis client for internal usage
export { redis };

// Try to use Upstash Redis (production) or fallback to regular redis (development)
try {
  // First try Upstash Redis (for production/cloud)
  if (process.env.UPSTASH_REDIS_REST_URL) {
    const { Redis: UpstashRedis } = require('@upstash/redis');
    RedisClient = UpstashRedis;
    redis = new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } else {
    // Fallback to regular Redis client (for development)
    const { createClient } = require('redis');
    RedisClient = createClient;
    redis = createClient({
      url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
      socket: {
        connectTimeout: 60000,
        commandTimeout: 5000,
        lazyConnect: true, // Don't connect immediately
      },
      retry_strategy: (options: any) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.error('Redis connection refused, will retry...');
          return Math.min(options.attempt * 100, 3000);
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          console.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          console.error('Redis max retries reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    // Connect to Redis asynchronously (don't block app startup)
    // Use immediate connection attempt with retry logic
    const connectRedis = async () => {
      try {
        await redis.connect();
        console.log('Redis connected successfully');
      } catch (err: any) {
        console.warn('Redis connection failed, some features may not work:', err.message);
        // Don't throw error, just log it - Redis is optional for basic functionality
        // Redis client will retry automatically based on retry_strategy
      }
    };

    // Connect immediately but don't wait for it
    connectRedis();
  }
} catch (error) {
  // If both fail, create a mock Redis client that warns about missing Redis
  console.warn('Redis client initialization failed:', error);
  redis = {
    ping: async () => false,
    set: async () => undefined, // Mock Redis v4 set method
    get: async () => null,
    del: async () => undefined,
    keys: async () => [],
    dbsize: async () => 0,
  };
}

// Connection test utility
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis connection failed:', error);
    return false;
  }
}

// Basic cache operations
export async function setCache(key: string, value: any, ttl?: number): Promise<void> {
  try {
    // Check if Redis is connected
    if (redis && typeof redis.isOpen === 'function' && !redis.isOpen()) {
      console.warn('Redis not connected, skipping cache set for:', key);
      return;
    }

    const serializedValue = JSON.stringify(value);
    if (ttl) {
      // Redis v4: Use set with EX option
      await redis.set(key, serializedValue, { EX: ttl });
    } else {
      await redis.set(key, serializedValue);
    }
  } catch (error) {
    // Silently fail for cache operations to avoid blocking app startup
    console.warn('Redis set error (non-blocking):', error instanceof Error ? error.message : error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    // Check if Redis is connected
    if (redis && typeof redis.isOpen === 'function' && !redis.isOpen()) {
      console.warn('Redis not connected, skipping cache get for:', key);
      return null;
    }

    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    // Silently fail for cache operations
    console.warn('Redis get error (non-blocking):', error instanceof Error ? error.message : error);
    return null;
  }
}

export async function deleteCache(key: string): Promise<void> {
  try {
    // Check if Redis is connected
    if (redis && typeof redis.isOpen === 'function' && !redis.isOpen()) {
      console.warn('Redis not connected, skipping cache delete for:', key);
      return;
    }

    await redis.del(key);
  } catch (error) {
    // Silently fail for cache operations
    console.warn('Redis delete error (non-blocking):', error instanceof Error ? error.message : error);
  }
}

export async function clearCache(pattern: string): Promise<void> {
  try {
    // Check if Redis is connected
    if (redis && typeof redis.isOpen === 'function' && !redis.isOpen()) {
      console.warn('Redis not connected, skipping cache clear for:', pattern);
      return;
    }

    // Use scanIterator for non-blocking key finding (Redis v4+)
    let keysFound = 0;
    for await (const key of redis.scanIterator({
      MATCH: pattern,
      COUNT: 100 // Process in batches
    })) {
      await redis.del(key);
      keysFound++;
    }

    if (keysFound > 0) {
      console.log(`Redis clear pattern "${pattern}" removed ${keysFound} keys`);
    }
  } catch (error) {
    // Silently fail for cache operations
    console.warn('Redis clear pattern error (non-blocking):', error instanceof Error ? error.message : error);
  }
}
