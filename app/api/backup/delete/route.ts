import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';
import { requirePermission } from '@/lib/auth';
import * as fs from 'fs';
import * as path from 'path';

// =======================================================
// DELETE /api/backup/delete - Delete a specific backup file
// =======================================================
export async function DELETE(request: NextRequest) {
  try {
    // Require backup delete permission
    await requirePermission(request, 'backup', 'delete');

    await backupService.initialize();

    const body = await request.json();
    const { backupPath } = body;

    if (!backupPath) {
      return NextResponse.json(
        { message: 'Backup path is required' },
        { status: 400 }
      );
    }

    // Validate backup path is within backup directory
    const backupRootDir = path.join(process.cwd(), 'backups');
    const resolvedPath = path.resolve(backupPath);

    if (!resolvedPath.startsWith(backupRootDir)) {
      return NextResponse.json(
        { message: 'Invalid backup path - must be within backup directory' },
        { status: 400 }
      );
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { message: 'Backup file not found' },
        { status: 404 }
      );
    }

    // Get file stats before deletion
    const stats = fs.statSync(resolvedPath);
    const fileSize = stats.size;

    // Delete the file
    fs.unlinkSync(resolvedPath);

    // Check if parent directory is now empty and delete it if so
    let directoryDeleted = false;
    try {
      const parentDir = path.dirname(resolvedPath);

      // Only delete parent folder if it's within backups directory and empty
      if (parentDir.startsWith(backupRootDir) && parentDir !== backupRootDir) {
        const filesInDir = fs.readdirSync(parentDir);

        if (filesInDir.length === 0) {
          fs.rmdirSync(parentDir);
          directoryDeleted = true;
          console.log(`🗑️ Empty backup folder deleted: ${path.basename(parentDir)}`);
        }
      }
    } catch (dirError) {
      // Don't fail the whole operation if directory cleanup fails
      console.warn('⚠️ Directory cleanup warning:', dirError instanceof Error ? dirError.message : 'Unknown error');
    }

    console.log(`🗑️ Backup file deleted: ${path.basename(backupPath)}, Size: ${(fileSize / 1024 / 1024).toFixed(2)} MB${directoryDeleted ? ' (including empty folder)' : ''}`);

    return NextResponse.json({
      message: `Backup file deleted successfully: ${path.basename(backupPath)}${directoryDeleted ? ' (including empty folder)' : ''}`,
      deletedFile: {
        name: path.basename(backupPath),
        path: backupPath,
        size: fileSize
      },
      directoryRemoved: directoryDeleted
    });

  } catch (error) {
    console.error('Error deleting backup file:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
