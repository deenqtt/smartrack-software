// File: app/api/alarm-log/export/route.ts

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

// Force dynamic rendering for this route (uses request.url which is not available during static generation)
export const dynamic = 'force-dynamic';

// Check if we're in build time and database is not available
function isBuildTime() {
  return !process.env.DATABASE_URL;
}

export async function GET(request: NextRequest) {
  // Check if we're in build time without database
  if (isBuildTime()) {
    console.warn('DATABASE_URL not available during build time, skipping alarm log export');
    return NextResponse.json(
      { message: "Database not available during build time" },
      { status: 503 }
    );
  }

  // Require read permission for exporting alarm logs
  await requirePermission(request, "alarms", "read");

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';

    // Build where clause for filtering
    const where: any = {};

    if (status !== 'all') {
      where.status = status;
    }

    if (type !== 'all') {
      where.alarmConfig = {
        alarmType: type
      };
    }

    if (search) {
      where.OR = [
        {
          alarmConfig: {
            customName: {
              contains: search,
              mode: 'insensitive'
            }
          }
        },
        {
          alarmConfig: {
            device: {
              name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          }
        }
      ];
    }

    const logs = await prisma.alarmLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      include: {
        alarmConfig: {
          include: {
            device: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Convert to CSV format
    const csvHeaders = [
      'ID',
      'Device Name',
      'Alarm Name',
      'Alarm Type',
      'Status',
      'Trigger Value',
      'Timestamp',
      'Cleared At'
    ];

    const csvRows = logs.map((log) => [
      log.id,
      log.alarmConfig.device?.name || 'Unknown Device',
      log.alarmConfig.customName,
      log.alarmConfig.alarmType,
      log.status,
      log.triggeringValue || 'N/A',
      new Date(log.timestamp).toISOString(),
      log.clearedAt ? new Date(log.clearedAt).toISOString() : ''
    ]);

    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row =>
        row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
      )
    ].join('\n');

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="alarm-logs-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });

  } catch (error) {
    console.error("Error exporting alarm logs:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
