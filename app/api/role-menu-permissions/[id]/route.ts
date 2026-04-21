import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/role-menu-permissions/[id] - Get single role menu permission
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

    const permission = await prisma.roleMenuPermission.findUnique({
      where: { id },
      include: {
        role: true,
        menuItem: {
          include: {
            menuGroup: true,
          },
        },
      },
    });

    if (!permission) {
      return NextResponse.json(
        { success: false, error: "Role menu permission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: permission,
    });

  } catch (error) {
    console.error("Error fetching role menu permission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/role-menu-permissions/[id] - Update role menu permission
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
    const { canView, canCreate, canUpdate, canDelete } = body;

    // Check if permission exists
    const existingPermission = await prisma.roleMenuPermission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return NextResponse.json(
        { success: false, error: "Role menu permission not found" },
        { status: 404 }
      );
    }

    const permission = await prisma.roleMenuPermission.update({
      where: { id },
      data: {
        ...(canView !== undefined && { canView }),
        ...(canCreate !== undefined && { canCreate }),
        ...(canUpdate !== undefined && { canUpdate }),
        ...(canDelete !== undefined && { canDelete }),
      },
      include: {
        role: true,
        menuItem: {
          include: {
            menuGroup: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: permission,
    });

  } catch (error) {
    console.error("Error updating role menu permission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/role-menu-permissions/[id] - Delete role menu permission
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

    // Check if permission exists
    const existingPermission = await prisma.roleMenuPermission.findUnique({
      where: { id },
    });

    if (!existingPermission) {
      return NextResponse.json(
        { success: false, error: "Role menu permission not found" },
        { status: 404 }
      );
    }

    await prisma.roleMenuPermission.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Role menu permission deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting role menu permission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
