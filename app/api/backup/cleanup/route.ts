import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import { RetentionPolicy } from '@/lib/types/backup';

// =======================================================
// PUT /api/backup/cleanup - Clean up old backups based on retention policy
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    // Require backup delete permission for cleanup
    await requirePermission(request, 'backup', 'delete');

    await backupService.initialize();

    const body = await request.json();
    const { days, maxBackups, maxTotalSizeGB } = body;

    // Use days parameter as retention period for cleanup
    const retentionDays = days || 30;

    // Map to GFS policy
    const policy: RetentionPolicy = {
      daily: retentionDays,
      weekly: days ? days * 7 : 0,
      monthly: days ? days * 30 : 0,
      yearly: days ? days * 365 : 0,
      keepMin: maxBackups || 3,
      maxTotalSizeGB: maxTotalSizeGB || 100
    };

    const result = await backupService.cleanupBackups(policy);

    return NextResponse.json({
      result,
      message: `Cleanup completed: ${result.deleted} backups deleted, ${result.freedSpace} bytes freed`
    });

  } catch (error) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
