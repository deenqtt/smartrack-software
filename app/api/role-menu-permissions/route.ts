import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// GET /api/role-menu-permissions - Get all role menu permissions or by menuItemId
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require role-permissions:read permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "role-permissions", "read");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const url = new URL(request.url);
    const menuItemId = url.searchParams.get('menuItemId');

    let permissions;

    if (menuItemId) {
      // Get permissions for a specific menu item
      permissions = await prisma.roleMenuPermission.findMany({
        where: {
          menuItemId: menuItemId,
        },
        include: {
          role: true,
          menuItem: {
            include: {
              menuGroup: true,
            },
          },
        },
        orderBy: [
          { role: { name: "asc" } },
        ],
      });
    } else {
      // Get all permissions
      permissions = await prisma.roleMenuPermission.findMany({
        include: {
          role: true,
          menuItem: {
            include: {
              menuGroup: true,
            },
          },
        },
        orderBy: [
          { role: { name: "asc" } },
          { menuItem: { menuGroup: { order: "asc" } } },
          { menuItem: { order: "asc" } },
        ],
      });
    }

    return NextResponse.json({
      success: true,
      data: permissions,
    });

  } catch (error) {
    console.error("Error fetching role menu permissions:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/role-menu-permissions - Create role menu permission or batch update
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // RBAC: Require role-permissions:create permission
    const { requirePermission } = await import("@/lib/auth");
    try {
      await requirePermission(request, "role-permissions", "create");
    } catch (error) {
      return NextResponse.json({ success: false, error: "Forbidden - Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();

    // Handle batch update
    if (body.roleId === "batch" && body.permissions) {
      const { permissions: batchPermissions } = body;

      const results = [];

      for (const perm of batchPermissions) {
        const { menuItemId, canView, canCreate, canUpdate, canDelete } = perm;

        // Check if menu item exists
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: menuItemId },
        });

        if (!menuItem) {
          results.push({ menuItemId, error: "Menu item not found" });
          continue;
        }

        // Get all roles and update/create permissions
        const roles = await prisma.role.findMany();

        for (const role of roles) {
          const existingPermission = await prisma.roleMenuPermission.findUnique({
            where: {
              roleId_menuItemId: {
                roleId: role.id,
                menuItemId,
              },
            },
          });

          if (existingPermission) {
            await prisma.roleMenuPermission.update({
              where: { id: existingPermission.id },
              data: {
                canView: canView ?? false,
                canCreate: canCreate ?? false,
                canUpdate: canUpdate ?? false,
                canDelete: canDelete ?? false,
              },
            });
          } else {
            await prisma.roleMenuPermission.create({
              data: {
                roleId: role.id,
                menuItemId,
                canView: canView ?? false,
                canCreate: canCreate ?? false,
                canUpdate: canUpdate ?? false,
                canDelete: canDelete ?? false,
              },
            });
          }
        }

        results.push({ menuItemId, success: true });
      }

      return NextResponse.json({
        success: true,
        data: results,
      });
    } else {
      // Handle single permission creation
      const { roleId, menuItemId, canView, canCreate, canUpdate, canDelete } = body;

      if (!roleId) {
        return NextResponse.json(
          { success: false, error: "Role ID is required" },
          { status: 400 }
        );
      }

      if (!menuItemId) {
        return NextResponse.json(
          { success: false, error: "Menu item ID is required" },
          { status: 400 }
        );
      }

      // Check if role exists
      const role = await prisma.role.findUnique({
        where: { id: roleId },
      });

      if (!role) {
        return NextResponse.json(
          { success: false, error: "Role not found" },
          { status: 404 }
        );
      }

      // Check if menu item exists
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: menuItemId },
      });

      if (!menuItem) {
        return NextResponse.json(
          { success: false, error: "Menu item not found" },
          { status: 404 }
        );
      }

      // Check if permission already exists
      const existingPermission = await prisma.roleMenuPermission.findUnique({
        where: {
          roleId_menuItemId: {
            roleId,
            menuItemId,
          },
        },
      });

      if (existingPermission) {
        return NextResponse.json(
          { success: false, error: "Permission already exists for this role and menu item" },
          { status: 409 }
        );
      }

      const permission = await prisma.roleMenuPermission.create({
        data: {
          roleId,
          menuItemId,
          canView: canView ?? true,
          canCreate: canCreate ?? false,
          canUpdate: canUpdate ?? false,
          canDelete: canDelete ?? false,
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
    }

  } catch (error) {
    console.error("Error creating role menu permission:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
