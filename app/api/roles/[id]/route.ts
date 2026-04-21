import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/roles/[id] - Get single role
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const role = await prisma.role.findUnique({
      where: { id },
      include: {
        users: true,
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        menuPermissions: {
          include: {
            menuItem: {
              include: {
                menuGroup: true,
              },
            },
          },
        },
        _count: {
          select: {
            users: true,
            rolePermissions: true,
            menuPermissions: true,
          },
        },
      },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: role,
    });

  } catch (error) {
    console.error("Error fetching role:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/roles/[id] - Update role
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description } = body;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Prevent updating system roles if not developer/admin
    // Note: isSystem check removed as field doesn't exist in schema
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { role_data: true },
    });

    const isAdmin = user?.role_data?.name.toLowerCase().includes('admin') ||
                   user?.role_data?.name.toLowerCase().includes('developer');

    // Optional: Add logic to prevent updating certain system roles based on role name

    // Check if new name conflicts with existing role (if name is being changed)
    if (name && name !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: "Role name already exists" },
          { status: 409 }
        );
      }
    }

    const role = await prisma.role.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return NextResponse.json({
      success: true,
      data: role,
    });

  } catch (error) {
    console.error("Error updating role:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/roles/[id] - Delete role
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(request);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!existingRole) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Prevent deleting system roles
    // Note: isSystem check removed as field doesn't exist in schema
    // Optional: Add logic to prevent deleting certain system roles based on role name

    // Prevent deleting roles that have users assigned
    if (existingRole._count.users > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete role with assigned users" },
        { status: 409 }
      );
    }

    await prisma.role.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Role deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting role:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
