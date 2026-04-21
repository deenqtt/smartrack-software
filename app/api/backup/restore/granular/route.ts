// File: app/api/backup/restore/granular/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import type { GranularRestoreOptions } from '@/lib/types/backup';

// =======================================================
// POST /api/backup/restore/granular - Perform granular database restore
// =======================================================
export async function POST(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const {
      backupPath,
      restoreType,
      tables,
      columns,
      pointInTime,
      whereClause,
      skipTableValidation = false
    } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    if (!restoreType || !['full', 'table-selective', 'column-selective', 'point-in-time', 'conditional'].includes(restoreType)) {
      return NextResponse.json(
        { message: 'Valid restoreType is required: full, table-selective, column-selective, point-in-time, conditional' },
        { status: 400 }
      );
    }

    const options: GranularRestoreOptions = {
      ...(pointInTime ? { pointInTime: new Date(pointInTime) } : {}),
      ...(tables && Array.isArray(tables) ? { tables } : {}),
      ...(columns ? { columns } : {}),
      ...(whereClause ? { whereClause } : {}),
      ...(skipTableValidation ? { skipTableValidation } : {}),
    };

    // Validate options based on restore type
    if (restoreType === 'table-selective' && (!options.tables || options.tables.length === 0)) {
      return NextResponse.json(
        { message: 'Tables array is required for table-selective restore' },
        { status: 400 }
      );
    }

    if (restoreType === 'column-selective' && !options.columns) {
      return NextResponse.json(
        { message: 'Columns object is required for column-selective restore' },
        { status: 400 }
      );
    }

    if (restoreType === 'point-in-time' && !options.pointInTime) {
      return NextResponse.json(
        { message: 'Point-in-time date is required for point-in-time restore' },
        { status: 400 }
      );
    }

    if (restoreType === 'conditional' && !options.whereClause) {
      return NextResponse.json(
        { message: 'WHERE clause is required for conditional restore' },
        { status: 400 }
      );
    }

    if (options.pointInTime && isNaN(options.pointInTime.getTime())) {
      return NextResponse.json(
        { message: 'Invalid point-in-time format' },
        { status: 400 }
      );
    }

    console.log(`🔄 Starting ${restoreType} restore with options:`, options);

    const result = await backupService.performGranularRestore(backupPath, options);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        result: {
          restoreId: result.backupId,
          duration: result.duration,
          size: result.size,
          metadata: result.metadata
        }
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          error: result.message
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error during granular restore:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Granular restore failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/restore/granular/schema-diff - Analyze schema differences
// =======================================================
export async function PUT(request: NextRequest) {
  try {
    await backupService.initialize();

    const body = await request.json();
    const { backupPath } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    // Schema difference analysis is not yet implemented in the consolidated service
    return NextResponse.json(
      {
        message: 'Schema difference analysis is not yet implemented.',
        feature: 'schema-difference-analysis',
        status: 'not-implemented'
      },
      { status: 501 }
    );

  } catch (error) {
    console.error('Error during schema analysis:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Schema analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// GET /api/backup/restore/granular/tables - Get available tables for restore
// =======================================================
export async function GET(request: NextRequest) {
  try {
    await backupService.initialize();

    const { searchParams } = new URL(request.url);
    const backupPath = searchParams.get('backupPath');

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Getting available tables for backup: ${backupPath}`);
    const availableTables = await backupService.getBackupTableList(backupPath);

    return NextResponse.json({
      success: true,
      tables: availableTables,
      backupPath
    });

  } catch (error) {
    console.error('Error getting available tables:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to get available tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
