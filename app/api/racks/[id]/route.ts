import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { z } from "zod";

// Validation schema for updates
const updateRackSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  capacityU: z.coerce.number().int().min(1, "Capacity must be at least 1U").max(100, "Capacity cannot exceed 100U").optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  visualizationConfigs: z.any().optional(), // Added for 3D rack visualization settings
  rackType: z.enum(["MAIN", "NORMAL"]).optional(),
});

// GET /api/racks/[id] - Get single rack with devices
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (process.env.DEMO_MODE === "true") {
    const { DEMO_RACKS } = await import("@/lib/demo-data");
    const rack = DEMO_RACKS.racks.find((r) => r.id === id);
    if (!rack) return new NextResponse("Rack not found", { status: 404 });

    const usedU = rack.devices.reduce((sum, d) => sum + (d.sizeU || 1), 0);
    return NextResponse.json({
      ...rack,
      usedU,
      availableU: rack.capacityU - usedU,
      utilizationPercent: Math.round((usedU / rack.capacityU) * 100),
      devices: rack.devices.map((d) => ({
        id: d.id,
        rackId: rack.id,
        deviceId: d.id,
        positionU: d.positionU,
        sizeU: d.sizeU,
        deviceType: d.deviceType,
        status: d.status,
        createdAt: rack.createdAt,
        updatedAt: rack.updatedAt,
        device: { id: d.id, uniqId: d.id, name: d.name },
      })),
    });
  }

  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const rack = await prisma.rack.findUnique({
      where: { id },
      include: {
        devices: {
          select: {
            id: true,
            uniqId: true,
            name: true,
            topic: true,
            positionU: true,
            sizeU: true,
            address: true,

            deviceType: true,
            status: true,
            lastPayload: true,
            lastUpdatedByMqtt: true,
            createdAt: true,
            updatedAt: true,
            rackId: true,
          },
          orderBy: { positionU: "asc" },
        },
        _count: {
          select: { devices: true },
        },
      },
    });

    // Transform the data to match the expected frontend interface
    if (rack) {
      const transformedRack = {
        ...rack,
        usedU: rack.devices.reduce(
          (sum, device) => sum + (device.sizeU || 1),
          0
        ),
        availableU:
          rack.capacityU -
          rack.devices.reduce((sum, device) => sum + (device.sizeU || 1), 0),
        utilizationPercent: Math.round(
          (rack.devices.reduce((sum, device) => sum + (device.sizeU || 1), 0) /
            rack.capacityU) *
          100
        ),
        devices: rack.devices.map((device) => ({
          id: device.uniqId, // Use uniqId as the primary key for frontend
          rackId: device.rackId,
          deviceId: device.uniqId,
          positionU: device.positionU || 1,
          sizeU: device.sizeU || 1,
          deviceType: device.deviceType || "SERVER",
          status: device.status || "PLANNED",
          createdAt: device.createdAt,
          updatedAt: device.updatedAt,
          device: {
            id: device.id,
            uniqId: device.uniqId,
            name: device.name,
            topic: device.topic,
            address: device.address,

            lastPayload: device.lastPayload,
            lastUpdatedByMqtt: device.lastUpdatedByMqtt,
          },
        })),
      };

      return NextResponse.json(transformedRack);
    }

    if (!rack) {
      return new NextResponse("Rack not found", { status: 404 });
    }

    return NextResponse.json(rack);
  } catch (error) {
    console.error("[RACK_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// PUT /api/racks/[id] - Update rack
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updateRackSchema.parse(body);

    // Check if rack exists
    const existingRack = await prisma.rack.findUnique({
      where: { id },
    });

    if (!existingRack) {
      return new NextResponse("Rack not found", { status: 404 });
    }

    // Check if new name conflicts with existing rack (if name is being updated)
    if (validatedData.name && validatedData.name !== existingRack.name) {
      const nameConflict = await prisma.rack.findUnique({
        where: { name: validatedData.name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { error: "Rack with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedRack = await prisma.rack.update({
      where: { id },
      data: validatedData as any,
      select: {
        id: true,
        name: true,
        capacityU: true,
        location: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        visualizationConfigs: true, // Include the new field in the response
      },
    });

    console.log(
      `[RACK_PUT] Updated rack: ${updatedRack.name} by user: ${auth.userId}`
    );

    return NextResponse.json(updatedRack);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[RACK_PUT]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// PATCH /api/racks/[id] - Partial update
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validatedData = updateRackSchema.parse(body);

    // If setting to MAIN, reset others
    if (validatedData.rackType === "MAIN") {
      await prisma.rack.updateMany({
        where: { id: { not: id } },
        data: { rackType: "NORMAL" } as any
      });
    }

    const updatedRack = await prisma.rack.update({
      where: { id },
      data: validatedData as any,
    });

    return NextResponse.json(updatedRack);
  } catch (error) {
    console.error("[RACK_PATCH]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// DELETE /api/racks/[id] - Delete rack
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if rack exists and get device count
    const rack = await prisma.rack.findUnique({
      where: { id },
      include: {
        _count: {
          select: { devices: true },
        },
      },
    });

    if (!rack) {
      return new NextResponse("Rack not found", { status: 404 });
    }

    // If rack has devices, unassign them first (set rackId to null)
    if (rack._count.devices > 0) {
      await prisma.deviceExternal.updateMany({
        where: { rackId: id },
        data: { rackId: null },
      });
      console.log(`[RACK_DELETE] Unassigned ${rack._count.devices} devices from rack: ${rack.name}`);
    }

    // Delete rack
    await prisma.rack.delete({
      where: { id },
    });

    console.log(
      `[RACK_DELETE] Deleted rack: ${rack.name} by user: ${auth.userId}`
    );

    return NextResponse.json({
      message: "Rack deleted successfully",
      deletedRack: {
        id: rack.id,
        name: rack.name,
      },
    });
  } catch (error) {
    console.error("[RACK_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
