// File: app/api/maintenance/route.ts

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";




/**
 * GET: Mengambil semua jadwal maintenance.
 */
export async function GET(request: NextRequest) {
  // Server-side permission check: require 'read' on 'maintenance'
  await requirePermission(request, "maintenance", "read");

  try {
    const maintenances = await prisma.maintenance.findMany({
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        // Tambahkan include ini untuk mengambil data perangkat yang terkait.
        deviceTarget: true,
      },
    });

    return NextResponse.json(maintenances);
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to fetch maintenance schedules.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST: Membuat jadwal maintenance baru.
 */
export async function POST(request: NextRequest) {
  // Server-side permission check: require 'create' on 'maintenance'
  await requirePermission(request, "maintenance", "create");

  try {
    const body = await request.json();
    console.log("[Maintenance POST] Received body:", body);
    const {
      name,
      description,
      startTask,
      endTask,
      assignTo,
      targetType,
      targetId,
      status,
    } = body;
    console.log("[Maintenance POST] Parsed fields:", { name, assignTo, targetType, targetId, status });

    // Pastikan targetId ada dan merupakan string yang valid
    if (!targetId) {
      return NextResponse.json(
        { message: "targetId is required." },
        { status: 400 }
      );
    }

    // Prepare the data object
    const maintenanceData: any = {
      name,
      description,
      startTask: new Date(startTask),
      endTask: new Date(endTask),
      assignTo,
      targetType,
      targetId: String(targetId), // Selalu simpan targetId
      status,
      isActive: true,
    };

    // If targetType is Device, validate that the device exists and set the relation
    if (targetType === "Device") {
      // Check if the device exists in DeviceExternal (using uniqId as targetId)
      const deviceExists = await prisma.deviceExternal.findUnique({
        where: { uniqId: String(targetId) },
      });

      if (deviceExists) {
        maintenanceData.deviceTargetId = deviceExists.id; // Use the primary id for relation
      } else {
        return NextResponse.json(
          { message: "Device not found." },
          { status: 400 }
        );
      }
    }
    // For Rack type, deviceTargetId remains null (default)

    const newMaintenance = await prisma.maintenance.create({
      data: maintenanceData,
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        deviceTarget: {
          select: {
            name: true,
            topic: true,
          },
        },
      },
    });



    return NextResponse.json(newMaintenance, { status: 201 });
  } catch (error: any) {
    console.error("[Maintenance POST] Error:", error);
    return NextResponse.json(
      {
        message: "Failed to create maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * PUT: Memperbarui jadwal maintenance yang sudah ada.
 */
export async function PUT(request: NextRequest) {
  // Server-side permission check: require 'update' on 'maintenance'
  await requirePermission(request, "maintenance", "update");

  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json(
        { message: "Maintenance ID is required." },
        { status: 400 }
      );
    }

    // Filter hanya field yang bisa diupdate
    const allowedFields = [
      "name",
      "description",
      "startTask",
      "endTask",
      "assignTo",
      "targetType",
      "targetId",
      "status",
      "isActive",
      "deviceTargetId",
    ];

    const updateData: any = {};

    // Hanya ambil field yang diizinkan
    for (const field of allowedFields) {
      if (data.hasOwnProperty(field)) {
        if (field === "startTask" || field === "endTask") {
          updateData[field] = data[field] ? new Date(data[field]) : undefined;
        } else {
          updateData[field] = data[field];
        }
      }
    }

    // Handle device relation logic
    if (data.targetType === "Device" && data.targetId) {
      // Check if device exists (using uniqId)
      const deviceExists = await prisma.deviceExternal.findUnique({
        where: { uniqId: String(data.targetId) },
      });

      if (deviceExists) {
        updateData.deviceTargetId = deviceExists.id; // Use primary id for relation
      } else {
        return NextResponse.json(
          { message: "Device not found." },
          { status: 400 }
        );
      }
    } else {
      // For Rack or when no device, clear the device relation
      updateData.deviceTargetId = null;
    }

    const updatedMaintenance = await prisma.maintenance.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        assignedTo: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
        deviceTarget: {
          select: {
            name: true,
            topic: true,
          },
        },
      },
    });

    return NextResponse.json(updatedMaintenance, { status: 200 });
  } catch (error: any) {
    console.error("[Maintenance PUT] Error:", error);
    return NextResponse.json(
      {
        message: "Failed to update maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Menghapus jadwal maintenance.
 */
export async function DELETE(request: NextRequest) {
  // Server-side permission check: require 'delete' on 'maintenance'
  await requirePermission(request, "maintenance", "delete");

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Maintenance ID is required." },
        { status: 400 }
      );
    }

    await prisma.maintenance.delete({
      where: { id: parseInt(id) },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: "Failed to delete maintenance schedule.",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
