import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";


// POST /api/role-menu-permissions/batch - Batch update permissions
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);

    if (!auth) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { roleId, permissions } = body;

    if (!roleId || !Array.isArray(permissions)) {
      return NextResponse.json(
        { success: false, error: "Role ID and permissions array are required" },
        { status: 400 }
      );
    }

    // Validate role exists
    const role = await prisma.role.findUnique({
      where: { id: roleId },
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: "Role not found" },
        { status: 404 }
      );
    }

    // Process batch updates
    const results = [];
    const errors = [];

    for (const perm of permissions) {
      try {
        const { menuItemId, canView, canCreate, canUpdate, canDelete } = perm;

        if (!menuItemId) {
          errors.push(`Menu item ID is required for permission update`);
          continue;
        }

        // Check if permission exists, if not create, if yes update
        const existingPermission = await prisma.roleMenuPermission.findUnique({
          where: {
            roleId_menuItemId: {
              roleId,
              menuItemId,
            },
          },
        });

        if (existingPermission) {
          // Update existing permission
          const updatedPermission = await prisma.roleMenuPermission.update({
            where: { id: existingPermission.id },
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
          results.push({ action: 'updated', permission: updatedPermission });
        } else {
          // Create new permission
          const newPermission = await prisma.roleMenuPermission.create({
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
          results.push({ action: 'created', permission: newPermission });
        }
      } catch (error: any) {
        errors.push(`Failed to process permission for menuItemId ${perm.menuItemId}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        errors,
        summary: {
          total: permissions.length,
          successful: results.length,
          errors: errors.length,
        },
      },
    });

  } catch (error) {
    console.error("Error in batch permission update:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
