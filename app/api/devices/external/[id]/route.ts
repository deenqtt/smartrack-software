// File: app/api/devices/external/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

/**
 * FUNGSI GET: Mengambil 'topic' berdasarkan 'uniqId'.
 * Di sini, '(await params).id' dari URL akan kita anggap sebagai 'uniqId'
 * karena widget akan memanggil endpoint ini dengan uniqId-nya.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication first
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to read devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }



  const { id: uniqId } = await params; // Await params in Next.js 15

  if (!uniqId) {
    return NextResponse.json(
      { message: "Device uniqId is required" },
      { status: 400 }
    );
  }

  // DEMO_MODE: Return topic from demo device map
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_DEVICE_TOPIC_MAP, DEMO_EXTERNAL_DEVICES } = await import("@/lib/demo-data");
    const topic = DEMO_DEVICE_TOPIC_MAP[uniqId] || `demo/${uniqId}/data`;
    const device = DEMO_EXTERNAL_DEVICES.find((d) => d.uniqId === uniqId);
    return NextResponse.json({ topic, uniqId, name: device?.name || uniqId });
  }

  try {
    const device = await prisma.deviceExternal.findUnique({
      where: {
        uniqId: uniqId,
      },
      // Kita hanya butuh topic untuk efisiensi
      select: {
        topic: true,
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(device);
  } catch (error) {
    console.error(`Error fetching device ${uniqId}:`, error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI UPDATE (PUT): Mengubah data berdasarkan 'id' database.
 * Halaman manajemen akan memanggil endpoint ini dengan id database.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication first
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to update devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'update');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }



  const { id } = await params; // Await params in Next.js 15

  try {
    const { name, topic, address } = await request.json();
    const updatedDevice = await prisma.deviceExternal.update({
      where: { id: id }, // Use awaited id
      data: { name, topic, address },
    });
    return NextResponse.json(updatedDevice);
  } catch (error: any) {
    console.error("Error updating device:", error);

    // Handle specific Prisma errors
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('topic')) {
        return NextResponse.json(
          { error: "Topic already used by another device" },
          { status: 409 }
        );
      }
    }

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Generic error for other cases
    return NextResponse.json(
      { error: error.message || "Failed to update device" },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus data berdasarkan 'id' database.
 * Halaman manajemen akan memanggil endpoint ini dengan id database.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check authentication first
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to delete devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'delete');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }



  const { id } = await params; // Await params in Next.js 15

  try {
    await prisma.deviceExternal.delete({
      where: { id: id }, // Use awaited id
    });
    return new NextResponse(null, { status: 204 }); // 204 = No Content
  } catch (error: any) {
    console.error("Error deleting device:", error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: "Cannot delete device as it is still used by widgets or other configurations" },
        { status: 409 }
      );
    }

    // Generic error for other cases
    return NextResponse.json(
      { error: error.message || "Failed to delete device" },
      { status: 500 }
    );
  }
}
