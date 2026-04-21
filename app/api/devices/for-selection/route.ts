// File: app/api/devices/for-selection/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: require devices read permission for selection lists
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }

  try {
    // ✅ OPTIMIZED: Exclude large fields, add reasonable limit
    const devices = await prisma.deviceExternal.findMany({
      take: 500,  // ✅ LIMIT to prevent huge responses
      orderBy: {
        name: "asc",
      },
      select: {
        uniqId: true,
        name: true,
        topic: true,
        // ❌ REMOVED: lastPayload (can be very large)
        // ❌ REMOVED: lastUpdatedByMqtt (not needed for dropdown)
      },
    });

    // ✅ ADD CACHE HEADERS for browser caching
    return NextResponse.json(devices, {
      headers: {
        'Cache-Control': 'private, max-age=300', // Cache for 5 minutes
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch devices for selection:", error);
    return NextResponse.json(
      { message: "Failed to fetch devices.", error: error.message },
      { status: 500 }
    );
  }
}
