import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

// =======================================================
// POST /api/backup/export-all - Export all database tables to CSV and create ZIP archive
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Require backup read permission
    await requirePermission(request, 'backup', 'read');

    await backupService.initialize();

    const body = await request.json();
    const { limit = 10000 } = body;

    console.log(`📤 Starting export of all database tables (limit: ${limit} rows per table)`);

    // Get database analysis to know what tables exist
    const dbAnalysis = await backupService.getDatabaseAnalysis();

    if (!dbAnalysis || dbAnalysis.tableStats.length === 0) {
      return NextResponse.json(
        { message: 'No tables found in database' },
        { status: 404 }
      );
    }

    // Create temporary directory for CSV files
    const tempDir = path.join(process.cwd(), 'backups', 'temp', `export-all-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const csvFiles: string[] = [];
    const exportResults = [];

    console.log(`📊 Exporting ${dbAnalysis.tableStats.length} tables...`);

    // Export each table to CSV
    for (const table of dbAnalysis.tableStats) {
      try {
        console.log(`📄 Exporting table: ${table.tableName}`);

        const exportResult = await backupService.exportTableToCSV({
          tableName: table.tableName,
          format: 'csv',
          limit: limit,
        });

        if (exportResult && exportResult.data) {
          // Save CSV to temporary file
          const csvFilename = `${table.tableName}_export.csv`;
          const csvPath = path.join(tempDir, csvFilename);

          fs.writeFileSync(csvPath, exportResult.data, 'utf-8');
          csvFiles.push(csvPath);

          exportResults.push({
            table: table.tableName,
            rows: table.rowCount,
            size: exportResult.data.length,
            status: 'success'
          });

          console.log(`✅ Exported ${table.tableName}: ${table.rowCount} rows`);
        }
      } catch (error) {
        console.error(`❌ Failed to export table ${table.tableName}:`, error);
        exportResults.push({
          table: table.tableName,
          rows: table.rowCount,
          size: 0,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    if (csvFiles.length === 0) {
      return NextResponse.json(
        { message: 'No tables could be exported' },
        { status: 500 }
      );
    }

    // Create ZIP archive
    const zipFilename = `database-export-all-${new Date().toISOString().split('T')[0]}.zip`;
    const zipPath = path.join(process.cwd(), 'backups', 'temp', zipFilename);

    console.log(`📦 Creating ZIP archive: ${zipFilename}`);

    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    const archivePromise = new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        console.log(`📦 ZIP archive created: ${archive.pointer()} bytes`);
        resolve();
      });

      output.on('error', (err: Error) => {
        console.error('❌ ZIP creation error:', err);
        reject(err);
      });

      archive.on('error', (err: Error) => {
        console.error('❌ Archive error:', err);
        reject(err);
      });
    });

    // Pipe archive data to file
    archive.pipe(output);

    // Add CSV files to archive
    for (const csvFile of csvFiles) {
      const filename = path.basename(csvFile);
      archive.file(csvFile, { name: filename });
    }

    // Add export summary
    const summaryData = {
      exportDate: new Date().toISOString(),
      totalTables: dbAnalysis.tableStats.length,
      exportedTables: exportResults.filter(r => r.status === 'success').length,
      failedTables: exportResults.filter(r => r.status === 'failed').length,
      totalRows: exportResults.reduce((sum, r) => sum + (r.status === 'success' ? r.rows : 0), 0),
      totalSize: exportResults.reduce((sum, r) => sum + (r.status === 'success' ? r.size : 0), 0),
      results: exportResults
    };

    const summaryJson = JSON.stringify(summaryData, null, 2);
    archive.append(summaryJson, { name: 'export-summary.json' });

    // Finalize archive
    await archive.finalize();
    await archivePromise;

    // Read ZIP file
    const zipBuffer = fs.readFileSync(zipPath);
    const zipStats = fs.statSync(zipPath);

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(zipBuffer);

    // Cleanup temporary files
    try {
      // Remove individual CSV files
      for (const csvFile of csvFiles) {
        if (fs.existsSync(csvFile)) {
          fs.unlinkSync(csvFile);
        }
      }
      // Remove temp directory
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      // Remove ZIP file (will be downloaded)
      if (fs.existsSync(zipPath)) {
        fs.unlinkSync(zipPath);
      }
    } catch (cleanupError) {
      console.warn('⚠️ Cleanup warning:', cleanupError);
    }

    console.log(`✅ Export completed: ${csvFiles.length} tables in ZIP archive (${zipBuffer.length} bytes)`);

    // Return ZIP file for download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFilename}"`,
        'Content-Length': zipStats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Error exporting all tables:', error);
    return NextResponse.json(
      {
        message: 'Failed to export all tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
