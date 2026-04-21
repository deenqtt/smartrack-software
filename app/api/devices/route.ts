import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

interface DeviceInternalRecord {
  id: string;
  name: string;
  deviceType: string;
  ipAddress?: string;
  powerWatt?: number;
  modelId?: string;
  rackId?: string;
  rack?: {
    id: string;
    name: string;
    capacityU: number;
  };
}

interface DeviceExternalRecord {
  id: string;
  uniqId: string;
  name: string;
  topic: string;
  deviceType?: string;
  ipAddress?: string;
  deviceConsumption?: number;
  serialNumber?: string;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require devices:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "devices", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    // Fetch all device types for device-related selectors
    // Since we don't have DeviceInternal in schema, we'll use existing tables that might represent internal devices
    // For now, let's use AccessController as an example of internal devices
    const [accessControllers, externalDevices] = await Promise.all([
      prisma.accessController.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          ipAddress: true,
          status: true
        }
      }),
      prisma.deviceExternal.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          uniqId: true,
          name: true,
          topic: true,
          address: true
        }
      })
    ]);

    // Combine all devices for the modal
    const allDevices = [
      ...accessControllers.map(device => ({
        ...device,
        type: 'internal' as const,
        displayName: `${device.name} (Access Controller)`,
        deviceType: 'Access Controller',
        capabilities: {
          hasNetwork: Boolean(device.ipAddress),
          isPowered: true,
          hasSerialNumber: false,
          isRacked: false
        }
      })),
      ...externalDevices.map(device => ({
        ...device,
        type: 'external' as const,
        displayName: `${device.name} (${device.topic})`,
        deviceType: 'IoT Device',
        ipAddress: device.address,
        capabilities: {
          hasNetwork: Boolean(device.address),
          isPowered: false,
          hasSerialNumber: true,
          isRacked: false
        }
      }))
    ];

    return NextResponse.json(allDevices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}
