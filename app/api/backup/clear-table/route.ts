// File: app/api/backup/clear-table/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

// =======================================================
// POST /api/backup/clear-table - Clear all data from a specific table
// Body: { tableName: string, confirm: boolean }
// =======================================================
export async function POST(request: NextRequest) {
  let tableName = 'unknown'; // Declare outside try block

  try {
    await backupService.initialize();

    const body = await request.json();
    const { tableName: requestTableName, confirm } = body;
    tableName = requestTableName; // Assign to outer scope variable

    if (!tableName || typeof tableName !== 'string') {
      return NextResponse.json(
        { message: 'Table name is required and must be a string' },
        { status: 400 }
      );
    }

    if (!confirm) {
      return NextResponse.json(
        { message: 'Confirmation required. Set confirm=true to proceed' },
        { status: 400 }
      );
    }

    console.log(`🗑️ Clearing all data from table: ${tableName}`);

    const result = await backupService.clearTableData(tableName);

    return NextResponse.json({
      result,
      message: `Table ${tableName} cleared: ${result.deletedRows} rows deleted`
    });

  } catch (error) {
    console.error(`Error clearing table ${tableName}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { message: `Failed to clear table: ${errorMessage}` },
      { status: 500 }
    );
  }
}

// =======================================================
// GET /api/backup/clear-table - Get list of tables that can be cleared (excluding system tables)
// =======================================================
export async function GET() {
  try {
    await backupService.initialize();

    const tables = await backupService.getClearableTables();

    return NextResponse.json({
      tables,
      total: tables.length,
      message: 'List of tables that can be cleared'
    });

  } catch (error) {
    console.error('Error getting clearable tables:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
