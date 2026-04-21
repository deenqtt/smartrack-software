import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/roles - Get all roles
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require roles:read permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "roles", "read");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const roles = await prisma.role.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            menuPermissions: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: roles,
    });

  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/roles - Create role
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require roles:create permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "roles", "create");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Role name is required" },
        { status: 400 }
      );
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name },
    });

    if (existingRole) {
      return NextResponse.json(
        { success: false, error: "Role already exists" },
        { status: 409 }
      );
    }

    const role = await prisma.role.create({
      data: {
        name,
        description,
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: role,
    });

  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
