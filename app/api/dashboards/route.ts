// File: app/api/dashboards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // DEMO_MODE: Return all demo dashboards
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_DASHBOARDS } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_DASHBOARDS);
  }

  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // RBAC: Require dashboard-management:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "read");
  } catch (error) {
    console.error("[DASHBOARDS_GET] Permission check failed:", error);
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const dashboards = await prisma.dashboardLayout.findMany({
      where: { userId: auth.userId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(dashboards);
  } catch (error) {
    console.error("[DASHBOARDS_GET] Database query failed:", error);
    console.error("[DASHBOARDS_GET] Auth userId:", auth.userId);
    if (error instanceof Error) {
      console.error("[DASHBOARDS_GET] Error details:", {
        message: error.message,
        code: (error as any).code,
        meta: (error as any).meta,
      });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized or invalid auth session", {
      status: 401,
    });
  }

  // RBAC: Require dashboard-management:create permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "dashboard-management", "create");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { name, userId: targetUserId, template } = body;

    if (!name)
      return new NextResponse("Dashboard name is required", { status: 400 });

    // Check if user is admin (role check)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role_data: { select: { name: true } } }
    });

    // Allow admin to specify target user, otherwise use authenticated user
    const dashboardUserId = user?.role_data?.name === 'ADMIN' && targetUserId ? targetUserId : auth.userId;

    const existingDashboardsCount = await prisma.dashboardLayout.count({
      where: { userId: dashboardUserId },
    });

    const isFirstDashboard = existingDashboardsCount === 0;

    let layoutData = JSON.stringify([]);

    // If template is specified, load layout from template
    if (template && typeof template === 'string') {
      try {
        // Load template from JSON file
        const fs = await import('fs');
        const path = await import('path');
        const templatePath = path.join(process.cwd(), 'templates', 'dashboard-templates', `${template}.json`);

        if (fs.existsSync(templatePath)) {
          const templateData = JSON.parse(fs.readFileSync(templatePath, 'utf8'));

          // Find dashboard with matching name in template
          const templateDashboard = templateData.dashboards?.find((d: any) => d.name === name);
          if (templateDashboard) {
            layoutData = templateDashboard.layout;
            console.log(`[DASHBOARDS_POST] Loaded layout from ${template} template for dashboard: ${name}`);
          } else {
            console.log(`[DASHBOARDS_POST] Dashboard "${name}" not found in ${template} template, using empty layout`);
          }
        } else {
          console.log(`[DASHBOARDS_POST] Template file ${template}.json not found, using empty layout`);
        }
      } catch (templateError) {
        console.error(`[DASHBOARDS_POST] Error loading template ${template}:`, templateError);
        // Continue with empty layout if template loading fails
      }
    }

    const newDashboard = await prisma.dashboardLayout.create({
      data: {
        name,
        layout: layoutData,
        userId: dashboardUserId,
        inUse: isFirstDashboard,
      },
    });

    return NextResponse.json(newDashboard, { status: 201 });
  } catch (error) {
    console.error("[DASHBOARDS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
