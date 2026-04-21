// File: app/api/backup/cleanup-data/route.ts
// File: app/api/backup/cleanup-data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

// =======================================================
// GET /api/backup/cleanup-data - Get data cleanup status/preview
// =======================================================
export async function GET() {
  try {
    // For now, just return basic info about what data can be cleaned up
    // In a real implementation, this could show preview of data to be deleted
    return NextResponse.json({
      message: 'Data cleanup endpoint',
      available: true
    });

  } catch (error) {
    console.error('Error getting cleanup preview:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup/cleanup-data - Clean up old logged data based on retention policy
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { retentionDays } = body;

    // Default retention period if not specified
    const days = retentionDays || 90; // Default 90 days

    if (days < 1) {
      return NextResponse.json(
        { message: 'Retention days must be at least 1' },
        { status: 400 }
      );
    }

    console.log(`🧹 Starting data cleanup for data older than ${days} days`);

    const result = await backupService.cleanupLoggedData(days);

    return NextResponse.json({
      result,
      message: `Data cleanup completed: ${result.deleted} records deleted`
    });

  } catch (error) {
    console.error('Error during data cleanup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
