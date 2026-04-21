// File: app/api/devices/access-controllers/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Handler untuk GET (Mengambil semua data controller)
export async function GET(request: Request) {
  try {
    // RBAC: require read permission for access controllers
    const { requirePermission } = await import('@/lib/auth');
    try {
      await requirePermission(request, 'devices', 'read');
    } catch (err) {
      return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
    }
    const controllers = await prisma.accessController.findMany({
      orderBy: {
        createdAt: "asc",
      },
    });
    return NextResponse.json(controllers);
  } catch (error) {
    console.error("Error fetching access controllers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// Handler untuk POST (Menambahkan controller baru)
export async function POST(request: Request) {
  // RBAC: require create permission for access controllers
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'create');
  } catch (err) {
    return NextResponse.json({ message: 'Forbidden - Insufficient permissions' }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { name, ipAddress } = body;

    if (!name || !ipAddress) {
      return NextResponse.json(
        { error: "Name and IP Address are required" },
        { status: 400 }
      );
    }

    const newController = await prisma.accessController.create({
      data: {
        name,
        ipAddress,
        status: "offline", // Default status saat pertama kali ditambah
      },
    });

    return NextResponse.json(newController, { status: 201 });
  } catch (error) {
    console.error("Error creating access controller:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
