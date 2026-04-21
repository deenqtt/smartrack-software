import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import fs from 'fs';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'templates', 'dashboard-templates');

// Ensure templates directory exists
function ensureTemplatesDirectory() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }
}

/**
 * GET: List available dashboard templates
 */
export async function GET(request: NextRequest) {
  try {
    ensureTemplatesDirectory();

    const templateFiles = fs.readdirSync(TEMPLATES_DIR)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(TEMPLATES_DIR, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return {
          userType: file.replace('.json', ''),
          description: data.description || '',
          totalDashboards: data.totalDashboards || 0,
          generatedAt: data.generatedAt,
          fileSize: fs.statSync(filePath).size
        };
      });

    return NextResponse.json({
      templates: templateFiles,
      totalTemplates: templateFiles.length
    });

  } catch (error) {
    console.error('[DASHBOARD_TEMPLATES_GET] Error:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * POST: Save current user's dashboards as template
 */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { userType, description } = await request.json();

    if (!userType) {
      return new NextResponse("userType is required", { status: 400 });
    }

    // Validate userType
    const allowedTypes = ['smartrack'];
    if (!allowedTypes.includes(userType)) {
      return new NextResponse("Invalid userType. Must be one of: " + allowedTypes.join(', '), { status: 400 });
    }

    // Get user's dashboards from database
    const { prisma } = await import("@/lib/prisma");
    const dashboards = await prisma.dashboardLayout.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        layout: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        inUse: true,
        isActive: true
      }
    });

    if (dashboards.length === 0) {
      return new NextResponse("No dashboards found for current user", { status: 404 });
    }

    // Create template data
    const templateData = {
      userType,
      description: description || `Dashboard templates for ${userType} user`,
      dashboards,
      generatedAt: new Date().toISOString(),
      generatedBy: auth.userId,
      totalDashboards: dashboards.length
    };

    // Save to file
    ensureTemplatesDirectory();
    const fileName = `${userType}.json`;
    const filePath = path.join(TEMPLATES_DIR, fileName);

    fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2));

    console.log(`[DASHBOARD_TEMPLATES_POST] Saved ${dashboards.length} dashboards for ${userType} user`);

    return NextResponse.json({
      message: "Dashboard templates saved successfully",
      userType,
      totalDashboards: dashboards.length,
      filePath: `/templates/dashboard-templates/${fileName}`
    }, { status: 201 });

  } catch (error) {
    console.error('[DASHBOARD_TEMPLATES_POST] Error:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/**
 * PUT: Update existing template by fetching current user's dashboards
 */
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { userType, description } = await request.json();

    if (!userType) {
      return new NextResponse("userType is required", { status: 400 });
    }

    // Check if template file exists
    const filePath = path.join(TEMPLATES_DIR, `${userType}.json`);
    if (!fs.existsSync(filePath)) {
      return new NextResponse(`Template file for ${userType} not found`, { status: 404 });
    }

    // Get current user's dashboards
    const { prisma } = await import("@/lib/prisma");
    const dashboards = await prisma.dashboardLayout.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        layout: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
        inUse: true,
        isActive: true
      }
    });

    // Load existing template to preserve description if not provided
    const existingData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const templateDescription = description || existingData.description || `Dashboard templates for ${userType} user`;

    // Update template data
    const templateData = {
      ...existingData,
      description: templateDescription,
      dashboards,
      generatedAt: new Date().toISOString(),
      generatedBy: auth.userId,
      totalDashboards: dashboards.length
    };

    // Save updated template
    fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2));

    console.log(`[DASHBOARD_TEMPLATES_PUT] Updated ${dashboards.length} dashboards for ${userType} template`);

    return NextResponse.json({
      message: "Dashboard templates updated successfully",
      userType,
      totalDashboards: dashboards.length
    });

  } catch (error) {
    console.error('[DASHBOARD_TEMPLATES_PUT] Error:', error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
