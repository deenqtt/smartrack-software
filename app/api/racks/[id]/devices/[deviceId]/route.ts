import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateRackDeviceSchema = z.object({
  deviceId: z.string().min(1).optional(),
  positionU: z.number().int().min(1).max(100).optional(),
  sizeU: z.number().int().min(1).max(100).optional(),
  deviceType: z.enum(["SERVER", "SWITCH", "STORAGE", "PDU", "SENSOR"]).optional(),
  status: z.enum(["PLANNED", "INSTALLED", "MAINTENANCE", "REMOVED"]).optional(),
});

// PUT /api/racks/[id]/devices/[deviceId] - Update device in rack
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; deviceId: string } }
) {
  try {
    const { id, deviceId } = params;
    const body = await request.json();
    const validatedData = updateRackDeviceSchema.parse(body);

    // Check if rack exists
    const rack = await prisma.rack.findUnique({
      where: { id }
    });

    if (!rack) {
      return NextResponse.json(
        { error: "Rack not found" },
        { status: 404 }
      );
    }

    // Check if device exists and is in this rack
    const existingDevice = await prisma.deviceExternal.findUnique({
      where: { uniqId: deviceId }
    });

    if (!existingDevice || existingDevice.rackId !== id) {
      return NextResponse.json(
        { error: "Device not found in this rack" },
        { status: 404 }
      );
    }

    // If position is being updated, check for conflicts
    const currentDeviceType = validatedData.deviceType || (existingDevice as any).deviceType;
    if (validatedData.positionU && (validatedData.positionU !== existingDevice.positionU) && currentDeviceType !== "SENSOR") {
      const positionU = validatedData.positionU;
      const sizeU = validatedData.sizeU || existingDevice.sizeU || 1;
      const newDeviceStart = positionU;
      const newDeviceEnd = positionU + sizeU - 1;

      // Get all existing devices in this rack (excluding current device and sensors)
      const otherDevices = await prisma.deviceExternal.findMany({
        where: {
          rackId: id,
          uniqId: { not: deviceId },
          deviceType: { not: "SENSOR" } as any
        },
        select: { positionU: true, sizeU: true }
      });

      const hasConflict = otherDevices.some(device => {
        const existingStart = device.positionU || 1;
        const existingEnd = (device.positionU || 1) + (device.sizeU || 1) - 1;
        return newDeviceStart <= existingEnd && newDeviceEnd >= existingStart;
      });

      if (hasConflict) {
        return NextResponse.json(
          {
            error: "Position conflict",
            message: `Position ${positionU} to ${newDeviceEnd}U is already occupied`
          },
          { status: 400 }
        );
      }
    }

    // Update device
    const updateData: any = {};
    if (validatedData.positionU !== undefined) updateData.positionU = validatedData.positionU;
    if (validatedData.sizeU !== undefined) updateData.sizeU = validatedData.sizeU;
    if (validatedData.deviceType !== undefined) updateData.deviceType = validatedData.deviceType;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;

    const updatedDevice = await prisma.deviceExternal.update({
      where: { uniqId: deviceId },
      data: updateData,
      select: {
        id: true,
        uniqId: true,
        name: true,
        topic: true,
        address: true,
        rackId: true,
        positionU: true,
        sizeU: true,
        deviceType: true,
        status: true,
        createdAt: true,
        updatedAt: true
      } as any
    });

    return NextResponse.json(updatedDevice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating rack device:", error);
    return NextResponse.json(
      { error: "Failed to update device in rack" },
      { status: 500 }
    );
  }
}

// DELETE /api/racks/[id]/devices/[deviceId] - Remove device from rack
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; deviceId: string } }
) {
  try {
    const { id, deviceId } = params;

    // Check if device exists and is in this rack
    const device = await prisma.deviceExternal.findUnique({
      where: { uniqId: deviceId }
    });

    if (!device || device.rackId !== id) {
      return NextResponse.json(
        { error: "Device not found in this rack" },
        { status: 404 }
      );
    }

    // Remove device from rack by clearing rackId and positioning fields
    await prisma.deviceExternal.update({
      where: { uniqId: deviceId },
      data: {
        rackId: null,
        positionU: 0,
        sizeU: 1,
        deviceType: "SERVER",
        status: "PLANNED"
      }
    });

    return NextResponse.json({ message: "Device removed from rack successfully" });
  } catch (error) {
    console.error("Error removing device from rack:", error);
    return NextResponse.json(
      { error: "Failed to remove device from rack" },
      { status: 500 }
    );
  }
}
