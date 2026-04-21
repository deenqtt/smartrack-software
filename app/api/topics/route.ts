import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/topics - Get all MQTT topics
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Require mqtt-topics:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "mqtt-topics", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        uniqId: true,
        name: true,
        topic: true,
      },
    });

    // Transform to match expected Topic format
    const topics = devices.map(device => ({
      id: device.id,
      uniqId: device.uniqId,
      name: device.name,
      topicName: device.topic,
    }));

    return NextResponse.json({
      success: true,
      data: topics,
    });
  } catch (error) {
    console.error("Error fetching MQTT topics:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
