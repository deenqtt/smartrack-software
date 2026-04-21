/**
 * Advanced Caching Utilities
 *
 * Provides comprehensive caching strategies for NewModBit IoT Dashboard
 * including pattern-based caching, stale-while-revalidate, and cache invalidation.
 */

import { redis, getCache, setCache, deleteCache, clearCache } from './redis';

// Cache keys constants
export const CACHE_KEYS = {
  MENU_STRUCTURE: 'menu:structure',
  USER_PERMISSIONS: (userId: string) => `user:${userId}:permissions`,
  DEVICE_LIST: 'devices:list',
  DEVICE_COUNT: 'devices:count',
  CLIENT_LIST: 'clients:list',
  SYSTEM_CONFIG: 'system:config',
  DASHBOARD_DATA: (dashboardId: string) => `dashboard:${dashboardId}:data`,
} as const;

// Cache TTL constants (in seconds)
export const CACHE_TTL = {
  SHORT: 300,    // 5 minutes - user permissions, menu structure
  MEDIUM: 600,   // 10 minutes - device lists, data
  LONG: 3600,    // 1 hour - dashboard data, system config
  VERY_LONG: 86400, // 24 hours - static data
} as const;

/**
 * Get cached data with fetcher fallback
 * Implements cache-aside pattern with automatic fallback
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number;
    forceRefresh?: boolean;
    fallbackToCache?: boolean;
  } = {}
): Promise<T> {
  const { ttl = CACHE_TTL.MEDIUM, forceRefresh = false, fallbackToCache = true } = options;

  // Try to get from cache first (unless forcing refresh)
  if (!forceRefresh) {
    try {
      const cachedData = await getCache<T>(key);
      if (cachedData !== null) {
        return cachedData;
      }
    } catch (error) {
      console.warn(`Cache read error for key ${key}:`, error);
      // Continue to fetch fresh data if cache fails
    }
  }

  // Fetch fresh data
  try {
    const data = await fetcher();

    // Cache the result
    try {
      await setCache(key, data, ttl);
    } catch (cacheError) {
      console.warn(`Cache write error for key ${key}:`, cacheError);
      // Don't fail the request if caching fails
    }

    return data;
  } catch (error) {
    // If fetch fails and we have fallback enabled, try cache one more time
    if (fallbackToCache && !forceRefresh) {
      try {
        const cachedData = await getCache<T>(key);
        if (cachedData !== null) {
          console.warn(`Fetch failed for ${key}, using stale cache:`, error);
          return cachedData;
        }
      } catch (cacheError) {
        console.error(`Both fetch and cache failed for ${key}:`, { fetchError: error, cacheError });
      }
    }

    throw error;
  }
}

/**
 * Cache menu structure data
 */
export async function getCachedMenuStructure(fetcher: () => Promise<any>) {
  return getCachedData(
    CACHE_KEYS.MENU_STRUCTURE,
    fetcher,
    { ttl: CACHE_TTL.SHORT }
  );
}

/**
 * Cache user permissions
 */
export async function getCachedUserPermissions(
  userId: string,
  fetcher: () => Promise<any>
) {
  return getCachedData(
    CACHE_KEYS.USER_PERMISSIONS(userId),
    fetcher,
    { ttl: CACHE_TTL.SHORT }
  );
}

/**
 * Cache device list with automatic invalidation on changes
 */
export async function getCachedDeviceList(fetcher: () => Promise<any>) {
  return getCachedData(
    CACHE_KEYS.DEVICE_LIST,
    fetcher,
    { ttl: CACHE_TTL.MEDIUM }
  );
}

/**
 * Cache dashboard data
 */
export async function getCachedDashboardData(
  dashboardId: string,
  fetcher: () => Promise<any>
) {
  return getCachedData(
    CACHE_KEYS.DASHBOARD_DATA(dashboardId),
    fetcher,
    { ttl: CACHE_TTL.LONG }
  );
}

/**
 * Invalidate cached data by patterns
 */
export async function invalidateCache(patterns: string | string[]): Promise<void> {
  const patternArray = Array.isArray(patterns) ? patterns : [patterns];

  for (const pattern of patternArray) {
    try {
      await clearCache(pattern);
      console.log(`Cache invalidated for pattern: ${pattern}`);
    } catch (error) {
      console.error(`Failed to invalidate cache for pattern ${pattern}:`, error);
    }
  }
}

/**
 * Invalidate all user permission caches
 */
export async function invalidateUserPermissionCache(): Promise<void> {
  await invalidateCache('user:*:permissions');
}

/**
 * Invalidate all dashboard caches
 */
export async function invalidateDashboardCache(): Promise<void> {
  await invalidateCache('dashboard:*:data');
}

/**
 * Invalidate device-related caches
 */
export async function invalidateDeviceCache(): Promise<void> {
  await invalidateCache(['devices:list', 'devices:count']);
}

/**
 * Cache warming utility - preload commonly accessed data
 */
export async function warmupCache(): Promise<void> {
  console.log('Starting cache warmup...');

  try {
    // Warmup system configuration
    await getCachedData(
      CACHE_KEYS.SYSTEM_CONFIG,
      async () => ({ warmed: true }),
      { ttl: CACHE_TTL.VERY_LONG, forceRefresh: true }
    );

    console.log('Cache warmup completed');
  } catch (error) {
    console.error('Cache warmup failed:', error);
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  connected: boolean;
  keys: number;
}> {
  try {
    const keyCount = await redis.dbsize();

    return {
      connected: true,
      keys: keyCount,
    };
  } catch (error) {
    return {
      connected: false,
      keys: 0,
    };
  }
}

/**
 * Rate limiting utilities
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  try {
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
    const current = await redis.incr(windowKey);

    // Set expiry if this is the first request in the window
    if (current === 1) {
      await redis.expire(windowKey, windowSeconds);
    }

    const allowed = current <= limit;
    const remaining = Math.max(0, limit - current);
    const resetTime = Math.floor(Date.now() / 1000) + windowSeconds;

    return {
      allowed,
      remaining,
      resetTime,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    // Allow request if rate limiting fails
    return {
      allowed: true,
      remaining: limit,
      resetTime: Date.now() + (windowSeconds * 1000),
    };
  }
}
