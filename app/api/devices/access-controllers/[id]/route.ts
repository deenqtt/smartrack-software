// File: app/api/devices/access-controllers/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler for PATCH (Update/Edit)
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // RBAC: require update permission for access controller
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'update');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, ipAddress } = body;
    const { id } = params;

    const updatedController = await prisma.accessController.update({
      where: { id },
      data: {
        name,
        ipAddress,
      },
    });

    return NextResponse.json(updatedController);
  } catch (error) {
    console.error("Error updating access controller:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// Handler untuk GET (Mengambil data satu controller berdasarkan ID)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // RBAC: require read permission for single access controller
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }
  try {
    const { id } = params;
    const controller = await prisma.accessController.findUnique({
      where: { id },
    });

    if (!controller) {
      return NextResponse.json(
        { error: "Controller not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(controller);
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// Handler for DELETE
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // RBAC: require delete permission for access controller
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'delete');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }
  try {
    const { id } = params;

    await prisma.accessController.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Device deleted successfully" });
  } catch (error) {
    console.error("Error deleting access controller:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
