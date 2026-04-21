// File: app/api/backup/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import type {
  DatabaseBackupConfig
} from '@/lib/services/backup-management-service';
import {
  BackupType
} from '@/lib/types/backup';

// =======================================================
// GET /api/backup - Get backup statistics and list backups
// =======================================================
export async function GET(request: NextRequest) {
  try {
    // Check if running in Docker environment
    const isDocker = process.env.NODE_ENV === 'production' &&
                    (require('fs').existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true');

    if (isDocker) {
      // Validate Docker-specific requirements
      const backupDir = '/app/backups';
      try {
        require('fs').accessSync(backupDir, require('fs').constants.W_OK);
      } catch (error) {
        console.error('Backup directory not writable in Docker:', error);
        return NextResponse.json(
          {
            message: 'Backup system not properly configured in Docker environment',
            details: 'Backup directory is not writable',
            environment: 'docker'
          },
          { status: 500 }
        );
      }
    }

    // Require backup read permission
    await requirePermission(request, 'backup', 'read');
    await backupService.initialize();

    // Get backup statistics
    const stats = await backupService.getBackupStats();

    return NextResponse.json({
      stats,
      environment: isDocker ? 'docker' : 'native',
      message: 'Backup statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting backup stats:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('permission')) {
        return NextResponse.json(
          { message: 'Insufficient permissions for backup operations' },
          { status: 403 }
        );
      }

      if (error.message.includes('database') || error.message.includes('connect')) {
        return NextResponse.json(
          { message: 'Database connection failed' },
          { status: 500 }
        );
      }

      if (error.message.includes('directory') || error.message.includes('backup')) {
        return NextResponse.json(
          { message: 'Backup directory configuration error' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        message: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// POST /api/backup - Create backup (database or filesystem)
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Require backup create permission
    await requirePermission(request, 'backup', 'create');

    await backupService.initialize();

    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return NextResponse.json(
        { message: 'Type and config are required' },
        { status: 400 }
      );
    }

    let result;

    // Only support database backups
    if (type !== BackupType.DATABASE) {
      return NextResponse.json(
        { message: `Unsupported backup type: ${type}. Only DATABASE backups are supported.` },
        { status: 400 }
      );
    }

    const dbConfig: DatabaseBackupConfig = {
      compress: config.compress !== false, // Default true
      includeUsers: config.includeUsers || false,
      includePermissions: config.includePermissions || false,
      compressionLevel: 6
    };

    result = await backupService.backupDatabase(dbConfig);

    // Log enhanced backup information
    if (result.metadata) {
      console.log(`📊 Backup Strategy: ${result.metadata.type || 'full'}`);
      console.log(`📦 Compression Ratio: ${result.metadata.compressionRatio || 'N/A'}`);
      console.log(`⚡ Performance: ${result.metadata.performance || 'N/A'}`);
      if (result.metadata.tableCount) {
        console.log(`📋 Tables Processed: ${result.metadata.tableCount}`);
      }
      if (result.metadata.parallelProcessed) {
        console.log(`🔄 Parallel Processing: Enabled (${result.metadata.batchSize || 3} batch size)`);
      }
    }

    return NextResponse.json({
      result,
      message: `Backup ${result.status === 'completed' ? 'completed' : 'failed'}`
    }, { status: result.status === 'completed' ? 201 : 500 });

  } catch (error) {
    console.error('Error creating backup:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
