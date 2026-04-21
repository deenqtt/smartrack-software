// File: app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import * as jose from "jose";
import { serialize } from "cookie";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";
import { getCookieOptions } from "@/lib/auth";

// Rate Limit Configuration
const RATE_LIMIT_WINDOW = 30; // 30 seconds
const MAX_ATTEMPTS = process.env.NODE_ENV === 'development' ? 20 : 5; // More attempts in development

async function checkRateLimit(ip: string): Promise<boolean> {
  if (!redis) return true; // Skip if Redis not available

  // Check if Redis is connected
  try {
    if (typeof redis.isOpen === 'function' && !redis.isOpen()) {
      return true; // Skip rate limiting if Redis not connected
    }
  } catch (error) {
    return true; // Fail open
  }

  const key = `login_attempts:${ip}`;
  try {
    const attempts = await redis.incr(key);
    if (attempts === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    return attempts <= MAX_ATTEMPTS;
  } catch (error) {
    return true; // Fail open
  }
}

// Temporary test endpoint
export async function GET() {
  console.log('Login endpoint test');
  return new Response(JSON.stringify({
    message: "Login endpoint is reachable",
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request) {
  console.log('Login attempt started');

  // DEMO_MODE: Accept any credentials, return demo admin session
  if (process.env.DEMO_MODE === "true") {
    const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "demo-portfolio-secret");
    const token = await new jose.SignJWT({
      userId: "demo-user-id",
      role: "ADMIN",
      email: "demo@smartrack.io",
      isDemo: true,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d")
      .sign(secretKey);

    const response = NextResponse.json({
      message: "Demo login successful",
      user: { id: "demo-user-id", email: "demo@smartrack.io", role: "ADMIN" },
      token,
    });
    response.cookies.set("authToken", token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  }

  try {
    // 1. Rate Limiting
    const isAllowed = await checkRateLimit(request.headers.get('x-forwarded-for') || 'unknown');

    if (!isAllowed) {
      console.log('Rate limit exceeded');
      return NextResponse.json(
        { message: "Too many login attempts. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    // 2. User Lookup with timeout
    const user = await Promise.race([
      prisma.user.findUnique({
        where: { email }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database timeout')), 5000)
      )
    ]) as any;

    // 3. Credential Verification
    if (!user) {
      console.log('Login failed: user not found');
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValidPassword = await Promise.race([
      bcrypt.compare(password, user.password),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Password check timeout')), 3000)
      )
    ]);

    if (!isValidPassword) {
      console.log('Login failed: invalid password');
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401 }
      );
    }

    // 4. Role Lookup
    const role = await Promise.race([
      prisma.role.findUnique({
        where: { id: user.roleId! }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Role lookup timeout')), 3000)
      )
    ]) as any;

    const roleName = role?.name || 'user';

    // 5. Token Generation
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return NextResponse.json(
        { message: "Server configuration error" },
        { status: 500 }
      );
    }

    const secretKey = new TextEncoder().encode(jwtSecret);
    const token = await new jose.SignJWT({
      userId: user.id,
      role: roleName,
      email: user.email
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(rememberMe ? '30d' : '24h')
      .sign(secretKey);

    // 5.1 Record Session in Database
    try {
      const userAgent = request.headers.get('user-agent') || 'unknown';
      const ipAddress = request.headers.get('x-forwarded-for') || '127.0.0.1';

      const expirationDate = new Date();
      if (rememberMe) {
        expirationDate.setDate(expirationDate.getDate() + 30);
      } else {
        expirationDate.setDate(expirationDate.getDate() + 1);
      }

      await prisma.userSession.create({
        data: {
          userId: user.id,
          token: token,
          userAgent: userAgent,
          ipAddress: ipAddress,
          expiresAt: expirationDate,
          isActive: true
        }
      });
    } catch (sessionError) {
      console.error('Failed to record user session:', sessionError);
      // We don't block login if session recording fails, but we should log it
    }

    // 6. Response
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.id,
        email: user.email,
        role: roleName
      },
      token
    });

    // Set cookie using NextResponse utility
    response.cookies.set("authToken", token, getCookieOptions(rememberMe));

    return response;
  } catch (error) {
    console.error('Login error:', error instanceof Error ? error.message : 'Unknown error');

    return new Response(
      JSON.stringify({
        message: "An error occurred during login",
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
