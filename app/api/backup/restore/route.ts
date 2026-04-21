// File: app/api/backup/restore/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import { backupService } from '@/lib/services/backup-management-service';
import { BackupType } from '@/lib/types/backup';

// =======================================================
// GET /api/backup/restore - Get available backups for restore
// =======================================================
export async function GET(request: NextRequest) {
  try {
    await requirePermission(request, 'backup', 'read');
    await backupService.initialize();

    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'database';
    const includeSchemaInfo = searchParams.get('schema') === 'true';

    // Currently we only support database backups
    const backupType: BackupType = BackupType.DATABASE;

    const backups = await backupService.getAvailableBackups(backupType);

    let currentSchema;
    if (includeSchemaInfo && backupType === BackupType.DATABASE) {
      try {
        const analysis = await backupService.getDatabaseAnalysis();
        currentSchema = {
          tables: analysis.tableStats.map(t => ({ name: t.tableName, rowCount: t.rowCount, lastModified: t.lastModified })),
          totalRows: analysis.summary.totalRows
        };
      } catch (error) {
        console.warn('Could not get current schema info:', error);
      }
    }

    return NextResponse.json({
      backups,
      currentSchema,
      message: `Available ${type} backups retrieved`
    });

  } catch (error) {
    console.error('Error getting available backups:', error);

    // Enhanced error handling to prevent HTML responses
    const isSchemaError = error instanceof Error &&
      (error.message.includes('relation') && error.message.includes('does not exist'));

    if (isSchemaError) {
      console.log('🔧 Detected schema issue - returning graceful error');
      return NextResponse.json({
        backups: [],
        message: 'Backup system not fully initialized - database schema missing',
        warning: 'Run npm run db:fix-schema to initialize backup tables',
        schemaIssue: true
      }, { status: 200 });
    }

    return NextResponse.json(
      {
        backups: [],
        message: 'Backup system temporarily unavailable',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 200 } // Return 200 to prevent frontend crashes
    );
  }
}

// =======================================================
// POST /api/backup/restore - Restore database from backup
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await requirePermission(request, 'backup', 'create');
    await backupService.initialize();

    const body = await request.json();
    const { backupPath, verifyBeforeRestore = true } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    // Verify backup integrity before restore if requested
    if (verifyBeforeRestore) {
      console.log('🔍 Verifying backup before restore...');
      const verification = await backupService.verifyBackupForRestore(backupPath);

      if (!verification.valid) {
        return NextResponse.json(
          {
            message: 'Backup verification failed',
            verification
          },
          { status: 400 }
        );
      }
    }

    console.log(`🔄 Starting database restore from: ${backupPath}`);

    const result = await backupService.restoreDatabase(backupPath);

    const status = result.status === 'completed' ? 200 : 500;

    return NextResponse.json({
      result,
      message: result.status === 'completed'
        ? 'Database restore completed successfully'
        : 'Database restore failed'
    }, { status });

  } catch (error) {
    console.error('Error during database restore:', error);
    return NextResponse.json(
      {
        message: 'Database restore failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/restore/verify - Verify backup file
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    await requirePermission(request, 'backup', 'create');
    await backupService.initialize();

    const body = await request.json();
    const { backupPath } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    const verification = await backupService.verifyBackupForRestore(backupPath);

    return NextResponse.json({
      verification,
      message: verification.valid
        ? 'Backup verification successful'
        : 'Backup verification failed'
    });

  } catch (error) {
    console.error('Error verifying backup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
