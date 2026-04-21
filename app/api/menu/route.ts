import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

// GET /api/menu - Get dynamic menu for current user
export async function GET(request: NextRequest) {
  // DEMO_MODE: Return static menu without DB lookup
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_MENU_DATA } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_MENU_DATA);
  }

  try {
    const auth = await getAuthFromCookie(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require menu:read permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "menu", "read");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    // Get user role separately since the relation name has underscore
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { roleId: true }
    });

    if (!user || !user.roleId) {
      return NextResponse.json(
        { success: false, error: "User not found or has no role" },
        { status: 403 }
      );
    }

    // Get the role
    const role = await prisma.role.findUnique({
      where: { id: user.roleId },
      include: { permissions: true } as any
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "User role not found" },
        { status: 403 }
      );
    }

    // Get menu items based on user role permissions
    const roleId = role.id;
    const roleName = role.name;
    const isAdmin = roleName === 'ADMIN';
    const isDeveloper = isAdmin || roleName.toLowerCase().includes('developer');

    // Get ALL menu groups first (both active and inactive)
    const allMenuGroups = await prisma.menuGroup.findMany({
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
      include: {
        items: {
          where: {
            // Only show menu items for developers (or all if admin/developer)
            isDeveloper: isDeveloper ? undefined : false,
          },
          include: {
            permissions: {
              where: { roleId },
              select: {
                canView: true,
                canCreate: true,
                canUpdate: true,
                canDelete: true,
              },
            },
          },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        },
      },
    } as any);

    // MENU GROUPS FILTERING:
    // Filter based on isActive status and developer permissions
    const menuGroups = allMenuGroups
      .filter((group: any) =>
        // Developer groups only for developers
        group.isDeveloper === false || (group.isDeveloper === true && isDeveloper)
      )
      .filter((group: any) =>
        // Active groups only shown to non-admin/non-developer users
        isAdmin || isDeveloper ? true : (group.isActive !== false) // isActive can be undefined (treated as active) or true
      );

    // FINAL MENU ITEMS FILTERING
    const finalMenuGroups = menuGroups
      .map((group: any) => ({
        ...group,
        menuItems: group.items.filter((item: any) => {
          // For normal mode: permission-based filtering
          if (item.permissions.length > 0 && item.permissions[0].canView) {
            return true;
          }
          // Special case: Admin users always get access to manage-menu even if no explicit permission
          if (isAdmin && item.name === 'system-menu-management') {
            return true;
          }
          return false;
        }).map((item: any) => ({
          ...item,
          permissions: item.permissions[0] || {
            canView: false,
            canCreate: isAdmin,
            canUpdate: isAdmin,
            canDelete: isAdmin,
          },
        })),
      }))
      .filter((group: any) => group.menuItems.length > 0); // Remove empty groups

    return NextResponse.json({
      success: true,
      data: finalMenuGroups,
      isDeveloper,
      activePreset: null,
    });

  } catch (error) {
    console.error("Error fetching menu:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
