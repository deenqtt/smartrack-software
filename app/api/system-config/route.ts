import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requirePermission } from '@/lib/auth';

// =======================================================
// GET /api/system-config - Get system configuration settings
// =======================================================
export async function GET(request: NextRequest) {
  try {
    // Require system-config read permission
    await requirePermission(request, 'system-config', 'read');

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'backup';
    const key = searchParams.get('key');

    let configs;

    if (key) {
      // Get specific config by key
      const config = await prisma.systemConfiguration.findUnique({
        where: { key }
      });

      if (!config) {
        return NextResponse.json(
          { message: `Configuration key '${key}' not found` },
          { status: 404 }
        );
      }

      configs = config;
    } else if (category) {
      // Get all configs for a category
      configs = await prisma.systemConfiguration.findMany({
        where: { category },
        orderBy: { key: 'asc' }
      });
    } else {
      // Get all configs
      configs = await prisma.systemConfiguration.findMany({
        orderBy: [
          { category: 'asc' },
          { key: 'asc' }
        ]
      });
    }

    return NextResponse.json({
      configs,
      message: 'System configuration retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting system config:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/system-config - Create or update system configuration
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Require system-config create permission
    await requirePermission(request, 'system-config', 'create');

    const body = await request.json();
    const { key, value, description, category = 'backup' } = body;

    if (!key || value === undefined) {
      return NextResponse.json(
        { message: 'Key and value are required' },
        { status: 400 }
      );
    }

    // Upsert configuration (create or update)
    const config = await prisma.systemConfiguration.upsert({
      where: { key },
      update: {
        value: String(value),
        description,
        category,
        updatedAt: new Date()
      },
      create: {
        key,
        value: String(value),
        description,
        category
      }
    });

    return NextResponse.json({
      config,
      message: `Configuration '${key}' ${config.createdAt === config.updatedAt ? 'created' : 'updated'} successfully`
    });

  } catch (error) {
    console.error('Error saving system config:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/system-config - Bulk update system configurations
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    // Require system-config update permission
    await requirePermission(request, 'system-config', 'update');

    const body = await request.json();
    const { configs } = body;

    if (!Array.isArray(configs)) {
      return NextResponse.json(
        { message: 'Configs must be an array' },
        { status: 400 }
      );
    }

    const results = [];

    for (const configData of configs) {
      const { key, value, description, category = 'backup' } = configData;

      if (!key || value === undefined) {
        continue; // Skip invalid entries
      }

      const config = await prisma.systemConfiguration.upsert({
        where: { key },
        update: {
          value: String(value),
          description,
          category,
          updatedAt: new Date()
        },
        create: {
          key,
          value: String(value),
          description,
          category
        }
      });

      results.push(config);
    }

    return NextResponse.json({
      configs: results,
      message: `Updated ${results.length} configuration settings`
    });

  } catch (error) {
    console.error('Error bulk updating system config:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// DELETE /api/system-config - Delete system configuration
// =======================================================
export async function DELETE(request: NextRequest) {
  try {
    // Require system-config delete permission
    await requirePermission(request, 'system-config', 'delete');

    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json(
        { message: 'Key parameter is required' },
        { status: 400 }
      );
    }

    const deletedConfig = await prisma.systemConfiguration.delete({
      where: { key }
    });

    return NextResponse.json({
      config: deletedConfig,
      message: `Configuration '${key}' deleted successfully`
    });

  } catch (error) {
    console.error('Error deleting system config:', error);

    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json(
        { message: `Configuration key not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
