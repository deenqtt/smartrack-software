import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/menu-items - Get all menu items
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require menu-items:read permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "menu-items", "read");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const menuItems = await prisma.menuItem.findMany({
      include: {
        menuGroup: true,
        permissions: {
          include: {
            role: true,
          },
        },
      } as any,
      orderBy: [
        { menuGroup: { order: "asc" } },
        { order: "asc" }
      ] as any,
    });

    return NextResponse.json({
      success: true,
      data: menuItems,
    });

  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/menu-items - Create menu item
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require menu-items:create permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "menu-items", "create");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { menuGroupId, name, label, path, icon, order, isDeveloper } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Menu item name is required" },
        { status: 400 }
      );
    }

    if (!menuGroupId) {
      return NextResponse.json(
        { success: false, error: "Menu group ID is required" },
        { status: 400 }
      );
    }

    // Check if menu item already exists
    const existingMenuItem = await prisma.menuItem.findUnique({
      where: { name },
    });

    if (existingMenuItem) {
      return NextResponse.json(
        { success: false, error: "Menu item already exists" },
        { status: 409 }
      );
    }

    // Check if menu group exists
    const menuGroup = await prisma.menuGroup.findUnique({
      where: { id: menuGroupId },
    });

    if (!menuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group not found" },
        { status: 404 }
      );
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        menuGroupId,
        name,
        label,
        path,
        icon,
        order: order ?? 0,
        isDeveloper: isDeveloper ?? false,
      } as any,
      include: {
        menuGroup: true,
        permissions: {
          include: {
            role: true,
          },
        },
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: menuItem,
    });

  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
