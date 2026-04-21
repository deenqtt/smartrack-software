// File: app/api/backup/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tableName, format, whereClause, limit, offset, columns } = body;

    if (!tableName || !format) {
      return NextResponse.json(
        { message: 'tableName and format are required' },
        { status: 400 }
      );
    }

    if (!['csv', 'json'].includes(format)) {
      return NextResponse.json(
        { message: 'Format must be csv or json' },
        { status: 400 }
      );
    }

    const exportResult = await backupService.exportTableToCSV({
      tableName,
      format: format as 'csv' | 'json',
      whereClause,
      limit: limit || 10000,
      offset: offset || 0,
      columns
    });

    // For CSV, return the data directly as a downloadable file
    if (format === 'csv') {
      return new Response(exportResult.data, {
        headers: {
          'Content-Type': exportResult.mimeType,
          'Content-Disposition': `attachment; filename="${exportResult.filename}"`
        }
      });
    }

    // For JSON, return structured data
    try {
      const jsonData = JSON.parse(exportResult.data);
      return NextResponse.json({
        export: {
          ...exportResult,
          data: jsonData
        },
        message: 'Table exported successfully'
      });
    } catch (error) {
      // If not valid JSON, return as string
      return NextResponse.json({
        export: exportResult,
        message: 'Table exported successfully'
      });
    }

  } catch (error) {
    console.error('Error exporting table:', error);
    return NextResponse.json(
      { message: 'Table export failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
