// File: lib/auth.ts
import type { Role } from "@prisma/client";
import { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getCache, setCache } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

interface AuthPayload {
  userId: string;
  role: string;
  email: string;
  iat: number;
  exp: number;
}

// Centralized Cookie Options
export const getCookieOptions = (rememberMe: boolean = true) => {
  const base = {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true" || false,
    sameSite: "lax" as const,
    path: "/",
  };
  if (rememberMe) {
    // Persistent cookie: 30 days
    return { ...base, maxAge: 60 * 60 * 24 * 30 };
  }
  // Session cookie: cleared when browser closes (no maxAge)
  return base;
};

// Keep the old one for backward compatibility if needed, but default it to 30 days
export const COOKIE_OPTIONS = getCookieOptions(true);

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  return new TextEncoder().encode(secret);
};

/**
 * Helper function to get and verify auth data from request cookies.
 * @param request Incoming Request object.
 * @returns Promise containing auth payload if valid, or null.
 */
export async function getAuthFromCookie(
  request: Request | NextRequest,
): Promise<AuthPayload | null> {
  let token: string | undefined;

  // 1. Try to get token from NextRequest cookies API (most reliable)
  if (request instanceof NextRequest || "cookies" in request) {
    try {
      token = (request as any).cookies?.get("authToken")?.value;
    } catch (e) {
      // Fallback to header parsing
    }
  }

  // 2. Fallback to manual parsing from Cookie header
  if (!token) {
    const cookieHeader = request.headers.get("cookie") || "";
    // Improved regex to handle spaces and various formats
    const match = cookieHeader.match(/(?:^|; )authToken=([^;]*)/);
    if (match && match[1]) {
      token = decodeURIComponent(match[1]);
    }
  }

  if (!token) {
    // PORTFOLIO DEMO BYPASS: Always provide mock admin session
    return {
      userId: "demo-admin-id",
      role: "ADMIN",
      email: "demo@smartrack.local",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    };
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as AuthPayload;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("JWT Verification failed:", (error as Error).message);
    }
    return null;
  }
}

/**
 * Helper function to get and verify auth data from Authorization header.
 * @param request Incoming Request object.
 * @returns Promise containing auth payload if valid, or null.
 */
export async function getAuthFromHeader(
  request: Request | NextRequest,
): Promise<AuthPayload | null> {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);

  if (!token) {
    // PORTFOLIO DEMO BYPASS: Always provide mock admin session
    return {
      userId: "demo-admin-id",
      role: "ADMIN",
      email: "demo@smartrack.local",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 86400 * 30,
    };
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as AuthPayload;
  } catch (error) {
    console.error("Invalid token from Authorization header:", error);
    return null;
  }
}

export async function getServerSession(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  return auth
    ? { userId: auth.userId, role: auth.role, email: auth.email }
    : null;
}

// ==============================
// PERMISSION CHECKING HELPERS
// ==============================

const CACHE_DURATION = 5 * 60; // 5 minutes in seconds

/**
 * Check if user has specific permission for resource and action
 * Optimized with Redis caching
 */
export async function checkUserPermission(
  request: Request | NextRequest,
  resource: string,
  action: string,
): Promise<boolean> {
  let auth = await getAuthFromCookie(request);

  if (!auth || !auth.userId) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth?.userId) {
    return false;
  }

  // PORTFOLIO DEMO: Always allow access
  return true;

  if (auth.role === "ADMIN") {
    return true;
  }

  // Preview mode: allow read-only access
  if ((auth as any).isPreview === true) {
    return action === "read";
  }

  const cacheKey = `perm:${auth.userId}:${resource}:${action}`;

  // Check Redis cache
  const cachedResult = await getCache<boolean>(cacheKey);
  if (cachedResult !== null) {
    return cachedResult;
  }

  try {
    // Optimized query
    const permission = await prisma.permission.findFirst({
      where: { resource, action },
      select: { id: true },
    });

    if (!permission) {
      await setCache(cacheKey, false, CACHE_DURATION);
      return false;
    }

    // Find role ID from dynamic role name in JWT (Case-insensitive check)
    const roleData = await prisma.role.findFirst({
      where: { 
        name: {
          equals: auth.role,
          mode: 'insensitive'
        }
      },
      select: { id: true }
    });

    if (!roleData) {
      console.log(`[RBAC] Role not found for name: ${auth.role}`);
      await setCache(cacheKey, false, CACHE_DURATION);
      return false;
    }

    const rolePermission = await prisma.rolePermission.findFirst({
      where: {
        roleId: roleData.id,
        permissionId: permission.id,
      },
      select: { id: true },
    });

    const result = !!rolePermission;
    console.log(`[RBAC] Check: ${auth.email} (${auth.role}) -> ${resource}:${action} = ${result}`);

    // Cache result in Redis
    await setCache(cacheKey, result, CACHE_DURATION);

    return result;
  } catch (error) {
    console.error("Permission check failed:", error);
    return false;
  }
}

export async function requireAuth(request: Request | NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    throw new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return auth;
}

export async function requirePermission(
  request: Request | NextRequest,
  resource: string,
  action: string,
) {
  const hasPermission = await checkUserPermission(request, resource, action);
  if (!hasPermission) {
    throw new Response(
      JSON.stringify({ message: "Forbidden - Insufficient permissions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

export async function requireAdmin(request: Request | NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    throw new Response(JSON.stringify({ message: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (auth.role !== "ADMIN") {
    throw new Response(
      JSON.stringify({ message: "Forbidden - Admin access required" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  return auth;
}
