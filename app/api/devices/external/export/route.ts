import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: Export all device external data as JSON download
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require read permission
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        uniqId: true,
        name: true,
        topic: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        rackId: true,
        positionU: true,
        sizeU: true,
        lastPayload: true,
        lastUpdatedByMqtt: true
      }
    });

    // Create JSON response with proper headers for download
    const jsonData = JSON.stringify(devices, null, 2);

    return new NextResponse(jsonData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="device-external-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

  } catch (error) {
    console.error("Error exporting devices:", error);
    return NextResponse.json(
      { error: "Failed to export devices" },
      { status: 500 }
    );
  }
}
