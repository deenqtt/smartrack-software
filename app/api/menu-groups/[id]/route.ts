import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/menu-groups/[id] - Get single menu group
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

    const menuGroup = await prisma.menuGroup.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { order: "asc" },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!menuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: menuGroup,
    });

  } catch (error) {
    console.error("Error fetching menu group:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/menu-groups/[id] - Update menu group
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
    const { name, label, icon, order, isActive, isDeveloper } = body;

    // Check if menu group exists
    const existingMenuGroup = await prisma.menuGroup.findUnique({
      where: { id },
    });

    if (!existingMenuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group not found" },
        { status: 404 }
      );
    }

    // Check if new name conflicts with existing menu group (if name is being changed)
    if (name && name !== existingMenuGroup.name) {
      const nameConflict = await prisma.menuGroup.findUnique({
        where: { name },
      });

      if (nameConflict) {
        return NextResponse.json(
          { success: false, error: "Menu group name already exists" },
          { status: 409 }
        );
      }
    }

    const menuGroup = await prisma.menuGroup.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(label !== undefined && { label }),
        ...(icon !== undefined && { icon }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive }),
        ...(isDeveloper !== undefined && { isDeveloper }),
      },
    });

    return NextResponse.json({
      success: true,
      data: menuGroup,
    });

  } catch (error) {
    console.error("Error updating menu group:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/menu-groups/[id] - Delete menu group
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

    // Check if menu group exists
    const existingMenuGroup = await prisma.menuGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
          },
        },
      },
    });

    if (!existingMenuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group not found" },
        { status: 404 }
      );
    }

    // Prevent deleting menu groups that have menu items
    if (existingMenuGroup._count.items > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete menu group with menu items" },
        { status: 409 }
      );
    }

    await prisma.menuGroup.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Menu group deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting menu group:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
