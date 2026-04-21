import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// =======================================================
// POST /api/backup/reports - Generate and download backup report
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Require backup read permission
    await requirePermission(request, 'backup', 'read');

    await backupService.initialize();

    const body = await request.json();
    const {
      type = 'summary',
      periodType = 'monthly',
      format = 'pdf',
      generatedBy = 'system'
    } = body;

    console.log(`📊 Generating ${type} backup report in ${format} format`);

    // Generate the report using the service
    const report = await backupService.generateBackupReport(
      type as any,
      periodType as any,
      generatedBy
    );

    let fileBuffer: Buffer;
    let mimeType: string;
    let filename: string;

    if (format === 'pdf') {
      fileBuffer = await backupService.generatePDFReport(report);
      mimeType = 'application/pdf';
      filename = `backup-report-${report.id}.pdf`;
    } else {
      const htmlContent = backupService.generateHTMLReport(report);
      fileBuffer = Buffer.from(htmlContent, 'utf-8');
      mimeType = 'text/html';
      filename = `backup-report-${report.id}.html`;
    }

    // Save report to file (optional, for record keeping)
    try {
      await backupService.saveReportToFile(report, format as any);
      console.log(`💾 Report saved to disk: ${filename}`);
    } catch (saveError) {
      console.warn('⚠️ Could not save report to disk:', saveError);
      // Continue with download even if save fails
    }

    console.log(`✅ Report generated successfully: ${filename} (${fileBuffer.length} bytes)`);

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(fileBuffer);

    // Return file for download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating backup report:', error);
    return NextResponse.json(
      {
        message: 'Failed to generate backup report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =======================================================
// GET /api/backup/reports - List saved reports
// =======================================================
export async function GET(request: NextRequest) {
  try {
    // Require backup read permission
    await requirePermission(request, 'backup', 'read');

    await backupService.initialize();

    const reportsDir = path.join(process.cwd(), 'backups', 'reports');

    if (!fs.existsSync(reportsDir)) {
      return NextResponse.json({
        reports: [],
        message: 'No reports directory found'
      });
    }

    const files = fs.readdirSync(reportsDir);
    const reports = files
      .filter(file => file.startsWith('backup-report-') && (file.endsWith('.pdf') || file.endsWith('.html')))
      .map(file => {
        const filePath = path.join(reportsDir, file);
        const stats = fs.statSync(filePath);

        // Extract report ID from filename
        const idMatch = file.match(/backup-report-([a-f0-9-]+)\./);
        const reportId = idMatch ? idMatch[1] : 'unknown';

        return {
          id: reportId,
          filename: file,
          path: filePath,
          size: stats.size,
          created: stats.mtime,
          format: file.endsWith('.pdf') ? 'pdf' : 'html',
          downloadUrl: `/api/backup/reports/download?filename=${encodeURIComponent(file)}`
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime()); // Newest first

    return NextResponse.json({
      reports,
      total: reports.length,
      message: `Found ${reports.length} saved reports`
    });

  } catch (error) {
    console.error('Error listing backup reports:', error);
    return NextResponse.json(
      {
        message: 'Failed to list backup reports',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
