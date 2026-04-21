// File: app/api/backup/download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// =======================================================
// GET /api/backup/download - Download backup file
// =======================================================

// Force runtime execution to avoid static generation issues with request.url
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // Force dynamic execution
export const revalidate = 0; // Disable revalidation

export async function GET(request: NextRequest) {
  try {
    // Server-side permission check: require 'read' on 'backup'
    await requirePermission(request, "backup", "read");

    await backupService.initialize();

    const searchParams = request.nextUrl.searchParams;
    const backupPath = searchParams.get('path');

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    // Security: Ensure the path is within our backup directory
    const isDocker = process.env.NODE_ENV === 'production' &&
      (fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true');
    const backupBaseDir = isDocker ? '/app/backups' : (process.env.BACKUP_PATH || path.join(process.cwd(), 'backups'));

    const absoluteBackupPath = path.resolve(backupPath);
    const absoluteBackupBase = path.resolve(backupBaseDir);

    if (!absoluteBackupPath.startsWith(absoluteBackupBase)) {
      console.error(`Security violation: Path outside backup directory: ${backupPath}`);
      return NextResponse.json(
        { message: 'Invalid backup path' },
        { status: 400 }
      );
    }

    // Verify file exists
    if (!fs.existsSync(backupPath)) {
      return NextResponse.json(
        { message: 'Backup file not found' },
        { status: 404 }
      );
    }

    // Get file statistics
    const fileStat = fs.statSync(backupPath);
    const fileName = path.basename(backupPath);

    // Create a readable stream
    const fileStream = fs.createReadStream(backupPath);

    // Determine content type based on extension
    let contentType = 'application/octet-stream';
    if (fileName.endsWith('.sql')) {
      contentType = 'application/sql';
    } else if (fileName.endsWith('.sql.gz') || fileName.endsWith('.backup')) {
      contentType = 'application/octet-stream';
    }

    // Return the file as a download
    const response = new NextResponse(fileStream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileStat.size.toString(),
        'Cache-Control': 'no-cache',
      },
    });

    console.log(`📁 Serving backup download: ${fileName} (${fileStat.size} bytes)`);
    return response;

  } catch (error) {
    console.error('Error downloading backup file:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
