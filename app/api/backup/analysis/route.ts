// File: app/api/backup/analysis/route.ts
import { NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

// =======================================================
// GET /api/backup/analysis - Get detailed database analysis
// =======================================================
export async function GET() {
  try {
    await backupService.initialize();

    const analysis = await backupService.getDatabaseAnalysis();

    return NextResponse.json({
      analysis,
      message: 'Database analysis completed successfully'
    });

  } catch (error) {
    console.error('Error during database analysis:', error);
    return NextResponse.json(
      {
        message: 'Database analysis failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
