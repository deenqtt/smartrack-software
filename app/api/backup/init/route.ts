// File: app/api/backup/init/route.ts
import { NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

// =======================================================
// POST /api/backup/init - Initialize backup system
// =======================================================
export async function POST() {
  try {
    await backupService.initialize();

    return NextResponse.json({
      message: 'Backup system initialized successfully'
    });

  } catch (error) {
    console.error('Error initializing backup system:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
