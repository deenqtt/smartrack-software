import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { Redis } from "@upstash/redis";
// NOTE: prisma is NOT imported here at module level to avoid Edge runtime issues.
// It is dynamically imported inside verifyToken() only when needed (non-DEMO_MODE).

// Initialize Redis if credentials are available (Edge compatible)
let redis: Redis | null = null;
if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN
) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.warn("[Middleware] Failed to initialize Upstash Redis:", e);
  }
}

// Fallback in-memory cache
const jwtCache = new Map<string, { payload: any; expires: number }>();
const CACHE_TTL = 300; // 5 minutes in seconds



// Define public routes that don't require authentication
const publicRoutes = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/setup-admin",
  "/api/auth/me",
  "/favicon.ico",
  "/api/health", // Health check endpoint - must be public
  "/api/db-connection", // Public access for database connection testing
  "/api/cron/reload", // Allow cron reload during deployment
  "/api/cron/bill-logger", // Internal server-to-server call from calculation service
  "/api/mqtt-config/public/active", // Public access to active MQTT configurations
  "/api/whatsapp", // Public access for WhatsApp API testing
  "/api/debug-connectivity", // Allow diagnostic check
  "/api/mqtt-config", // Allow system access to MQTT config
  "/api/logging-configs", // Allow system access to logging configs
  "/api/logging", // Allow internal rule chain logging without token
  "/api/dashboards/public-active", // Public dashboard preview
  "/preview", // Public dashboard preview page
];
// Helper function to get auth token from cookies or Authorization header
function getAuthToken(request: NextRequest) {
  // First, try to get token from cookie (for web browsers)
  let token = request.cookies.get("authToken")?.value;

  // If no cookie, try Authorization header (for mobile/API clients)
  if (!token) {
    const authHeader =
      request.headers.get("authorization") ||
      request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7); // Remove "Bearer " prefix
    }
  }

  return token;
}

// JWT Error types for better error handling
enum JWTErrorType {
  INVALID_SECRET = "INVALID_SECRET",
  MALFORMED_TOKEN = "MALFORMED_TOKEN",
  EXPIRED_TOKEN = "EXPIRED_TOKEN",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  SESSION_REVOKED = "SESSION_REVOKED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// Structured JWT error response
interface JWTError {
  type: JWTErrorType;
  message: string;
  shouldClearCookie: boolean;
  logLevel: "error" | "warn" | "info";
}

// Helper function to verify JWT token with caching and detailed error handling
async function verifyToken(
  token: string,
): Promise<{ payload: any } | JWTError> {
  // 1. Check Cache (Redis or Map)
  try {
    if (redis) {
      const cached = await redis.get(token);
      if (cached) {
        return { payload: cached };
      }
    } else {
      const cached = jwtCache.get(token);
      if (cached && Date.now() < cached.expires) {
        return { payload: cached.payload };
      }
    }
  } catch (err) {
    console.warn("[Middleware] Cache check failed:", err);
  }

  // 2. Verify Token
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("[JWT] JWT_SECRET not configured in environment");
      return {
        type: JWTErrorType.INVALID_SECRET,
        message: "JWT secret not configured",
        shouldClearCookie: false,
        logLevel: "error",
      };
    }

    const secretKey = new TextEncoder().encode(secret);
    const { payload } = await jose.jwtVerify(token, secretKey);

    // Skip DB session check for preview tokens
    if ((payload as any).isPreview === true) {
      return { payload };
    }

    // 2.5 VALIDATE SESSION STATE IN DATABASE (Stateful Check)
    try {
      // Dynamic import to avoid bundling Prisma into Edge runtime
      const { prisma: db } = await import("@/lib/prisma");
      const session = await db.userSession.findUnique({
        where: { token: token },
        select: { isActive: true, expiresAt: true }
      });

      if (!session) {
        return {
          type: JWTErrorType.SESSION_NOT_FOUND,
          message: "Session session not found in database",
          shouldClearCookie: true,
          logLevel: "warn",
        };
      }

      if (!session.isActive) {
        return {
          type: JWTErrorType.SESSION_REVOKED,
          message: "Session has been revoked",
          shouldClearCookie: true,
          logLevel: "warn",
        };
      }

      // Check if session date in DB is expired (backup check to JWT exp)
      if (new Date() > session.expiresAt) {
        return {
          type: JWTErrorType.EXPIRED_TOKEN,
          message: "Session has expired in database",
          shouldClearCookie: true,
          logLevel: "info",
        };
      }

      // Proactively update lastSeen (fire and forget)
      db.userSession.update({
        where: { token: token },
        data: { lastSeen: new Date() }
      }).catch(() => { });

    } catch (dbError) {
      console.error("[Middleware] Database session check failed:", dbError);
      // Fallback: If DB is down, we trust the JWT to prevent system lockout
    }

    // 3. Cache successful verification
    try {
      if (redis) {
        await redis.set(token, JSON.stringify(payload), { ex: CACHE_TTL });
      } else {
        jwtCache.set(token, {
          payload,
          expires: Date.now() + CACHE_TTL * 1000,
        });
      }
    } catch (err) {
      console.warn("[Middleware] Cache set failed:", err);
    }

    return { payload };
  } catch (error: any) {
    // Remove from cache on error
    try {
      if (redis) {
        await redis.del(token);
      } else {
        jwtCache.delete(token);
      }
    } catch (e) {
      /* ignore */
    }

    // Handle specific JWT error types
    if (error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED") {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          "[JWT] Token signature verification failed - possible tampering",
        );
      }
      return {
        type: JWTErrorType.INVALID_SIGNATURE,
        message: "Token signature verification failed",
        shouldClearCookie: true,
        logLevel: "warn",
      };
    }

    if (error.code === "ERR_JWT_EXPIRED") {
      // console.info('[JWT] Token has expired') // Reduce noise
      return {
        type: JWTErrorType.EXPIRED_TOKEN,
        message: "Token has expired",
        shouldClearCookie: true,
        logLevel: "info",
      };
    }

    if (
      error.code === "ERR_JWS_INVALID" ||
      error.message?.includes("Invalid JWT")
    ) {
      return {
        type: JWTErrorType.MALFORMED_TOKEN,
        message: "Invalid token format",
        shouldClearCookie: true,
        logLevel: "warn",
      };
    }

    // Generic error handling for unknown JWT errors
    if (process.env.NODE_ENV === "development") {
      console.error("[JWT] Unknown token verification error:", {
        error: error.message,
        code: error.code,
      });
    }

    return {
      type: JWTErrorType.UNKNOWN_ERROR,
      message: "Token verification failed",
      shouldClearCookie: true,
      logLevel: "error",
    };
  }
}

// Generate a short-lived preview JWT (no DB session required)
async function generatePreviewToken(): Promise<string> {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  const secretKey = new TextEncoder().encode(secret);
  return await new jose.SignJWT({
    sub: "preview",
    userId: "preview",
    email: "preview@smartrack.local",
    role: "PREVIEW",
    isPreview: true,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(secretKey);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // DEMO_MODE: Bypass all authentication, auto-allow all routes
  if (process.env.DEMO_MODE === "true") {
    // Redirect /login and /register to home — visitors go straight to dashboard
    if (pathname === "/login" || pathname === "/register") {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // FAST DEV MODE OPTIMIZATION
  if (
    process.env.NEXT_PUBLIC_DEV_MODE === "fast" &&
    process.env.NODE_ENV === "development"
  ) {
    return NextResponse.next();
  }

  // Explicitly allow public MQTT config access without authentication
  if (pathname.startsWith("/api/mqtt-config/public/")) {
    return NextResponse.next();
  }

  // Auto-inject preview token for /preview routes (before public routes check)
  if (pathname.startsWith("/preview")) {
    const token = getAuthToken(request);
    if (!token) {
      try {
        const previewToken = await generatePreviewToken();
        const response = NextResponse.next();
        response.cookies.set("authToken", previewToken, {
          httpOnly: true,
          secure: process.env.COOKIE_SECURE === "true",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24, // 24 hours
        });
        return response;
      } catch (e) {
        console.error("[Middleware] Failed to generate preview token:", e);
      }
    }
    return NextResponse.next();
  }

  // Skip middleware for public routes and static assets
  if (
    publicRoutes.some((route) => pathname.startsWith(route)) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/public/") ||
    pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/)
  ) {
    return NextResponse.next();
  }

  // Handle API routes with proper HTTP responses
  if (pathname.startsWith("/api/")) {
    // Skip auth for public API routes
    if (publicRoutes.some((route) => pathname.startsWith(route))) {
      return NextResponse.next();
    }

    const token = getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { message: "Authentication required", error: "NO_TOKEN" },
        { status: 401 },
      );
    }

    const tokenResult = await verifyToken(token);
    if ("type" in tokenResult) {
      const error = tokenResult as JWTError;

      // Log the error
      const logMessage = `[API Middleware] JWT ${error.type} for route: ${pathname} - ${error.message}`;
      switch (error.logLevel) {
        case "error":
          console.error(logMessage);
          break;
        case "warn":
          console.warn(logMessage);
          break;
        case "info":
          console.info(logMessage);
          break;
      }

      // Return appropriate HTTP error for API routes
      let statusCode = 401;
      let errorMessage = "Authentication failed";

      switch (error.type) {
        case JWTErrorType.EXPIRED_TOKEN:
          statusCode = 401;
          errorMessage = "Token has expired";
          break;
        case JWTErrorType.INVALID_SIGNATURE:
          statusCode = 401;
          errorMessage = "Invalid token signature";
          break;
        case JWTErrorType.MALFORMED_TOKEN:
          statusCode = 400;
          errorMessage = "Malformed token";
          break;
        case JWTErrorType.INVALID_SECRET:
          statusCode = 500;
          errorMessage = "Server configuration error";
          break;
        default:
          statusCode = 401;
          errorMessage = "Authentication failed";
      }

      const response = NextResponse.json(
        {
          message: errorMessage,
          error: error.type,
          timestamp: new Date().toISOString(),
        },
        { status: statusCode },
      );

      // Clear cookie for client-side errors
      if (error.shouldClearCookie && statusCode !== 500) {
        response.cookies.delete("authToken");
      }

      return response;
    }

    // Token valid for API routes
    return NextResponse.next();
  }

  // Check authentication for protected page routes
  const token = getAuthToken(request);

  if (!token) {
    console.log(`[Middleware] No token found for protected route: ${pathname}`);
    // No token found, redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verify token for page routes
  const tokenResult = await verifyToken(token);

  // Check if verification returned an error
  if ("type" in tokenResult) {
    const error = tokenResult as JWTError;

    // Log based on error type and log level
    const logMessage = `[Middleware] JWT ${error.type} for route: ${pathname} - ${error.message}`;
    switch (error.logLevel) {
      case "error":
        console.error(logMessage);
        break;
      case "warn":
        console.warn(logMessage);
        break;
      case "info":
        console.info(logMessage);
        break;
    }

    // Handle different error types appropriately
    switch (error.type) {
      case JWTErrorType.EXPIRED_TOKEN:
        // For expired tokens, redirect with a message about session expiry
        const expiredLoginUrl = new URL("/login", request.url);
        expiredLoginUrl.searchParams.set("message", "session_expired");
        expiredLoginUrl.searchParams.set("redirect", pathname);
        const expiredResponse = NextResponse.redirect(expiredLoginUrl);
        if (error.shouldClearCookie) {
          expiredResponse.cookies.delete("authToken");
        }
        return expiredResponse;

      case JWTErrorType.INVALID_SECRET:
        // Server configuration error - don't clear user cookies
        console.error("[Middleware] Server JWT configuration error");
        const configErrorUrl = new URL("/login", request.url);
        configErrorUrl.searchParams.set("error", "server_config");
        return NextResponse.redirect(configErrorUrl);

      default:
        // For other errors (malformed, invalid signature, unknown), clear cookie and redirect
        const loginUrl = new URL("/login", request.url);
        loginUrl.searchParams.set("error", "invalid_token");
        loginUrl.searchParams.set("redirect", pathname);
        const response = NextResponse.redirect(loginUrl);
        if (error.shouldClearCookie) {
          response.cookies.delete("authToken");
        }
        return response;
    }
  }

  // Token is valid - 'payload' property exists
  const { payload } = tokenResult;

  // Optional: Check if token has required claims
  if (!payload.sub && !payload.userId) {
    console.warn(
      `[Middleware] Token missing required claims for route: ${pathname}`,
    );
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", "invalid_token_claims");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("authToken");
    return response;
  }

  // Token valid, continue to protected route
  return NextResponse.next();
}

export const config = {
  // Force Node.js runtime instead of Edge Runtime to support Prisma
  runtime: "nodejs",
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth/ (handled separately for login/register)
     * - api/mqtt-config/public/ (public MQTT config access)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api/auth/|api/mqtt-config/public/|_next/static|_next/image|favicon.ico|public/).*)",
  ],
};
