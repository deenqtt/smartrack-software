// File: app/api/logging-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

// ============================================
// PUT - Update logging configuration
// ============================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Server-side permission check: require 'update' on 'devices'
  await requirePermission(request, "devices", "update");

  const { id } = await params;
  try {
    const body = await request.json();
    const {
      customName,
      key,
      units,
      multiply,
      deviceUniqId,
      loggingIntervalMinutes,
    } = body;

    // Validation: Interval range
    if (
      loggingIntervalMinutes &&
      (loggingIntervalMinutes < 1 || loggingIntervalMinutes > 1440)
    ) {
      return NextResponse.json(
        {
          message:
            "Logging interval must be between 1 and 1440 minutes (24 hours).",
        },
        { status: 400 }
      );
    }

    // Check if config exists
    const existingConfig = await prisma.loggingConfiguration.findUnique({
      where: { id },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { message: "Configuration not found." },
        { status: 404 }
      );
    }

    // Update configuration
    const updatedConfig = await prisma.loggingConfiguration.update({
      where: { id },
      data: {
        customName,
        key,
        units,
        multiply,
        deviceUniqId,
        ...(loggingIntervalMinutes !== undefined && { loggingIntervalMinutes }),
      },
      include: {
        device: {
          select: {
            uniqId: true,
            name: true,
            topic: true,
          },
        },
      },
    });

    console.log(
      `[API]  Updated logging config: "${customName}" (${id})`
    );

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("LOGGING");

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        {
          message:
            "A configuration with this device and key combination already exists.",
        },
        { status: 409 }
      );
    }

    console.error(
      `[API] PUT /api/logging-configs/${id}: Error updating:`,
      error
    );
    return NextResponse.json(
      { message: "Failed to update configuration." },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete logging configuration
// ============================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Server-side permission check: require 'delete' on 'devices'
  await requirePermission(request, "devices", "delete");

  const { id } = await params;
  try {
    // Check if config exists
    const existingConfig = await prisma.loggingConfiguration.findUnique({
      where: { id },
      select: { customName: true },
    });

    if (!existingConfig) {
      return NextResponse.json(
        { message: "Configuration not found." },
        { status: 404 }
      );
    }

    // Delete configuration
    await prisma.loggingConfiguration.delete({
      where: { id },
    });

    console.log(
      `[API]  Deleted logging config: "${existingConfig.customName}" (${id})`
    );

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("LOGGING");

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(
      `[API] DELETE /api/logging-configs/[id]: Error deleting:`,
      error
    );
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
