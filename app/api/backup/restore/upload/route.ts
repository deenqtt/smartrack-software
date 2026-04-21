// File: app/api/backup/restore/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const saveUploadedFile = async (formData: FormData): Promise<{ filepath: string; filename: string; size: number; verifyBeforeRestore: boolean }> => {
  const isDocker = process.env.NODE_ENV === 'production' &&
    (fs.existsSync('/.dockerenv') || process.env.DOCKER_CONTAINER === 'true');
  const backupBaseDir = isDocker ? '/app/backups' : (process.env.BACKUP_PATH || path.join(process.cwd(), 'backups'));
  const tempDir = path.join(backupBaseDir, 'temp');

  // Ensure temp directory exists
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Get file from already parsed formData
  const file = formData.get('backupFile') as File;
  const verifyBeforeRestore = formData.get('verifyBeforeRestore') === 'true';

  if (!file) {
    throw new Error('No backup file found in form data');
  }

  // Validate file size
  if (file.size > 500 * 1024 * 1024) { // 500MB limit
    throw new Error('File too large. Maximum size is 500MB');
  }

  // Generate temporary file path
  const filename = `upload_${Date.now()}_${file.name}`;
  const filepath = path.join(tempDir, filename);

  // Save file to disk
  const buffer = await file.arrayBuffer();
  fs.writeFileSync(filepath, Buffer.from(buffer));

  return {
    filepath,
    filename: file.name,
    size: file.size,
    verifyBeforeRestore
  };
};

// =======================================================
// POST /api/backup/restore/upload - Upload and restore from backup file
// =======================================================
export async function POST(request: NextRequest) {
  let uploadedFilePath = '';

  try {
    await requirePermission(request, 'backup', 'create');
    await backupService.initialize();

    console.log('📤 Starting backup file upload and restore process...');

    // Parse form data once (this consumes the request body)
    const formData = await request.formData();

    // Save the uploaded file and get settings
    const uploadResult = await saveUploadedFile(formData);
    uploadedFilePath = uploadResult.filepath;

    const originalFilename = uploadResult.filename;
    const fileSize = uploadResult.size;
    const verifyBeforeRestore = uploadResult.verifyBeforeRestore;

    console.log(`📁 File uploaded: ${originalFilename} (${fileSize} bytes)`);

    // Validate file type by reading first few bytes
    const fileBuffer = Buffer.alloc(100);
    const fd = fs.openSync(uploadedFilePath, 'r');
    fs.readSync(fd, fileBuffer, 0, 100, 0);
    fs.closeSync(fd);

    // Check if it's a valid PostgreSQL backup
    const isCustomFormat = fileBuffer.toString('ascii', 0, 5) === 'PGDMP';
    const isSqlFormat = fileBuffer.toString('utf8', 0, 50).includes('-- PostgreSQL database dump');
    const isGzippedSql = fileBuffer[0] === 0x1f && fileBuffer[1] === 0x8b; // Gzip magic number

    if (!isCustomFormat && !isSqlFormat && !isGzippedSql) {
      // Clean up uploaded file
      try { fs.unlinkSync(uploadedFilePath); } catch { }
      return NextResponse.json(
        { message: 'Invalid backup file format. Only PostgreSQL backup files (.sql, .sql.gz, .backup) are supported' },
        { status: 400 }
      );
    }

    if (verifyBeforeRestore) {
      console.log('🔍 Verifying uploaded backup integrity...');

      const verification = await backupService.verifyBackupForRestore(uploadedFilePath);

      if (!verification.valid) {
        // Clean up uploaded file
        try { fs.unlinkSync(uploadedFilePath); } catch { }
        return NextResponse.json(
          {
            message: 'Backup verification failed',
            verification
          },
          { status: 400 }
        );
      }

      console.log('✅ Backup verification successful');
    }

    console.log('🔄 Starting database restore from uploaded file...');

    const result = await backupService.restoreDatabase(uploadedFilePath);

    // Clean up uploaded file after successful restore
    try { fs.unlinkSync(uploadedFilePath); } catch (e) {
      console.warn('Failed to clean up uploaded file:', e);
    }

    console.log('✅ File upload and restore completed successfully');

    const status = result.status === 'completed' ? 200 : 500;

    return NextResponse.json({
      result,
      message: result.status === 'completed'
        ? 'Database restored successfully from uploaded file'
        : 'Database restore from uploaded file failed'
    }, { status });

  } catch (error) {
    console.error('Error during file upload and restore:', error);

    // Clean up uploaded file on error
    if (uploadedFilePath && fs.existsSync(uploadedFilePath)) {
      try { fs.unlinkSync(uploadedFilePath); } catch (e) {
        console.warn('Failed to clean up uploaded file after error:', e);
      }
    }

    return NextResponse.json(
      {
        message: 'File upload and restore failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
