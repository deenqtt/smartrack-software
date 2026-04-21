import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/menu-groups - Get all menu groups
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require menu-groups:read permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "menu-groups", "read");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    console.log('[Menu Groups API] Fetching menu groups...');
    try {
      const menuGroups = await prisma.menuGroup.findMany({
        include: {
          items: true,
        } as any,
        orderBy: { order: "asc" },
      });
      console.log('[Menu Groups API] Found menu groups:', menuGroups.length);

      return NextResponse.json({
        success: true,
        data: menuGroups,
      });
    } catch (dbError: any) {
      console.error('[Menu Groups API] DB Error:', dbError.message);
      console.error('[Menu Groups API] DB Error Code:', dbError.code);
      console.error('[Menu Groups API] DB Error Details:', dbError);
      throw dbError;
    }

  } catch (error) {
    console.error("Error fetching menu groups:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/menu-groups - Create menu group
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require menu-groups:create permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "menu-groups", "create");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { name, label, icon, order } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Menu group name is required" },
        { status: 400 }
      );
    }

    // Check if menu group already exists
    const existingMenuGroup = await prisma.menuGroup.findUnique({
      where: { name },
    });

    if (existingMenuGroup) {
      return NextResponse.json(
        { success: false, error: "Menu group already exists" },
        { status: 409 }
      );
    }

    const menuGroup = await prisma.menuGroup.create({
      data: {
        name,
        label,
        icon,
        order: order ?? 0,
      } as any,
    });

    return NextResponse.json({
      success: true,
      data: menuGroup,
    });

  } catch (error) {
    console.error("Error creating menu group:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
