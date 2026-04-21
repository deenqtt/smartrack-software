import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface DeviceImportData {
  uniqId?: string;
  name: string;
  topic: string;
  address?: string;
}

interface PreviewResult {
  total: number;
  valid: number;
  duplicates: {
    topic: string[];
    uniqId: string[];
    name: string[];
  };
  items: Array<{
    data: DeviceImportData;
    status: 'valid' | 'duplicate_topic' | 'duplicate_uniqId' | 'duplicate_name' | 'invalid';
    conflictInfo?: {
      existingTopic?: string;
      existingUniqId?: string;
      existingName?: string;
    };
  }>;
}

/**
 * POST: Preview device import data to detect duplicates and conflicts
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Require create permission
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'create');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { error: "Expected array of device objects" },
        { status: 400 }
      );
    }

    const devices: DeviceImportData[] = body;
    const result: PreviewResult = {
      total: devices.length,
      valid: 0,
      duplicates: {
        topic: [],
        uniqId: [],
        name: []
      },
      items: []
    };

    // Get existing devices for conflict checking
    const existingDevices = await prisma.deviceExternal.findMany({
      select: {
        uniqId: true,
        name: true,
        topic: true
      }
    });

    // Create lookup maps for fast checking
    const existingTopics = new Set(existingDevices.map(d => d.topic));
    const existingUniqIds = new Set(existingDevices.map(d => d.uniqId));
    const existingNames = new Set(existingDevices.map(d => d.name.toLowerCase()));

    for (const device of devices) {
      const previewItem: PreviewResult['items'][0] = {
        data: device,
        status: 'valid',
        conflictInfo: {}
      };

      // Validate required fields
      const requiredFields = ['name', 'topic'];
      let isValid = true;
      for (const field of requiredFields) {
        const value = device[field as keyof DeviceImportData];
        if (!value || (typeof value === 'string' && value.trim() === '')) {
          previewItem.status = 'invalid';
          isValid = false;
          result.duplicates.topic.push(device.topic);
          result.duplicates.uniqId.push(device.uniqId || '');
          result.duplicates.name.push(device.name);
          break;
        }
      }

      if (!isValid) {
        result.items.push(previewItem);
        continue;
      }

      // Check for conflicts
      let hasConflict = false;

      // Check topic conflict
      if (existingTopics.has(device.topic)) {
        previewItem.status = 'duplicate_topic';
        previewItem.conflictInfo = { existingTopic: device.topic };
        result.duplicates.topic.push(device.topic);
        hasConflict = true;
      } else {
        existingTopics.add(device.topic);
      }

      // Check uniqId conflict (if provided)
      if (!hasConflict && device.uniqId && existingUniqIds.has(device.uniqId)) {
        previewItem.status = 'duplicate_uniqId';
        previewItem.conflictInfo = { existingUniqId: device.uniqId };
        result.duplicates.uniqId.push(device.uniqId);
        hasConflict = true;
      } else if (!hasConflict && device.uniqId) {
        existingUniqIds.add(device.uniqId);
      }

      // Check name conflict (optional but prevents duplicates)
      const nameLower = device.name.toLowerCase();
      if (!hasConflict && existingNames.has(nameLower)) {
        previewItem.status = 'duplicate_name';
        previewItem.conflictInfo = { existingName: device.name };
        result.duplicates.name.push(device.name);
        hasConflict = true;
      } else if (!hasConflict) {
        existingNames.add(nameLower);
      }

      if (!hasConflict) {
        result.valid++;
      }

      result.items.push(previewItem);
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error("Error previewing device import:", error);
    return NextResponse.json(
      { error: "Failed to preview device import" },
      { status: 500 }
    );
  }
}
