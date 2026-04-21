import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// =======================================================
// GET /api/backup/reports/download - Download a saved report file
// =======================================================
export async function GET(request: NextRequest) {
  try {
    // Require backup read permission
    await requirePermission(request, 'backup', 'read');

    const searchParams = request.nextUrl.searchParams;
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { message: 'Filename parameter is required' },
        { status: 400 }
      );
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { message: 'Invalid filename' },
        { status: 400 }
      );
    }

    const reportsDir = path.join(process.cwd(), 'backups', 'reports');
    const filePath = path.join(reportsDir, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { message: 'Report file not found' },
        { status: 404 }
      );
    }

    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const stats = fs.statSync(filePath);

    // Determine content type based on file extension
    const isPDF = filename.endsWith('.pdf');
    const mimeType = isPDF ? 'application/pdf' : 'text/html';

    console.log(`📥 Downloading report: ${filename} (${fileBuffer.length} bytes)`);

    // Convert Buffer to Uint8Array for Response
    const uint8Array = new Uint8Array(fileBuffer);

    // Return file for download
    return new Response(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': stats.size.toString(),
      },
    });

  } catch (error) {
    console.error('Error downloading report:', error);
    return NextResponse.json(
      {
        message: 'Failed to download report',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
