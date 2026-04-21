// File: app/api/backup/schedules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

const backupScheduler = backupService; // Backward compatibility
import type { BackupSchedule } from '@/lib/types/backup';
import { BackupType, BackupFrequency } from '@/lib/types/backup';

// =======================================================
// GET /api/backup/schedules - Get all backup schedules
// =======================================================
export async function GET() {
  try {
    console.log('📋 Fetching backup schedules...');

    // Initialize backup service if not already done
    try {
      await backupService.initialize();
    } catch (initError) {
      console.warn('⚠️ Backup service initialization failed, but continuing:', initError);
    }

    const schedules = await backupScheduler.getAllSchedules();
    const stats = await backupScheduler.getSchedulerStats();

    console.log(`✅ Retrieved ${schedules.length} backup schedules`);

    return NextResponse.json({
      schedules,
      stats,
      message: 'Backup schedules retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error getting backup schedules:', error);
    console.error('   Error details:', error instanceof Error ? error.message : 'Unknown error');

    // Check if this is a database schema issue
    const isSchemaError = error instanceof Error &&
      (error.message.includes('relation "BackupSchedule" does not exist') ||
       error.message.includes('table') ||
       error.message.includes('does not exist'));

    if (isSchemaError) {
      console.log('🔧 Detected database schema issue - BackupSchedule table missing');
      return NextResponse.json({
        schedules: [],
        stats: {
          totalSchedules: 0,
          activeSchedules: 0,
          runningCount: 0,
          lastExecution: null,
          nextExecution: null,
        },
        message: 'Backup schedules database table not found',
        warning: 'Run database migration: npm run db:push',
        schemaIssue: true
      }, { status: 200 });
    }

    // Return empty schedules instead of 500 error to prevent frontend crashes
    return NextResponse.json({
      schedules: [],
      stats: {
        totalSchedules: 0,
        activeSchedules: 0,
        runningCount: 0,
        lastExecution: null,
        nextExecution: null,
      },
      message: 'Backup schedules not available - service temporarily unavailable',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 200 }); // Return 200 with warning instead of 500
  }
}

// =======================================================
// POST /api/backup/schedules - Create new backup schedule or Execute schedule now
// To execute: POST /api/backup/schedules?action=execute&scheduleId={id}
// =======================================================
export async function POST(request: NextRequest) {
  try {
    // Check if this is an execute request
    const action = request.nextUrl.searchParams.get('action');

    console.log('Schedule POST request:', { url: request.nextUrl.toString(), action });

    if (action === 'execute') {
      const scheduleId = request.nextUrl.searchParams.get('scheduleId');

      console.log('Execute request:', { scheduleId });

      if (!scheduleId) {
        return NextResponse.json(
          { message: 'Schedule ID is required for execute action' },
          { status: 400 }
        );
      }

      // Initialize backup service
      await backupService.initialize();

      // Execute the schedule immediately
      const execution = await backupService.executeNow(scheduleId);

      if (!execution) {
        console.log('Execution returned null for schedule:', scheduleId);
        return NextResponse.json(
          { message: 'Schedule not found or failed to start' },
          { status: 404 }
        );
      }

      console.log('Execution started successfully for schedule:', scheduleId);
      return NextResponse.json({
        execution,
        message: `Schedule execution started successfully. Check schedule status for completion.`
      });
    }

    // Normal schedule creation
    const body = await request.json();
    const {
      name,
      type,
      frequency,
      time,
      daysOfWeek,
      daysOfMonth,
      enabled = false,
      config
    } = body;

    // Validate required fields
    if (!name || !type || !frequency || !time || !config) {
      return NextResponse.json(
        { message: 'Name, type, frequency, time, and config are required' },
        { status: 400 }
      );
    }

    // Validate backup type (only DATABASE supported currently)
    if (type !== BackupType.DATABASE) {
      return NextResponse.json(
        { message: `Invalid backup type: ${type}. Only DATABASE backups are currently supported.` },
        { status: 400 }
      );
    }

    // Validate frequency
    if (!Object.values(BackupFrequency).includes(frequency)) {
      return NextResponse.json(
        { message: `Invalid frequency: ${frequency}` },
        { status: 400 }
      );
    }

    // Create schedule configuration
    const scheduleData: Omit<BackupSchedule, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      type,
      frequency,
      time,
      daysOfWeek: frequency === BackupFrequency.WEEKLY ? daysOfWeek : undefined,
      daysOfMonth: frequency === BackupFrequency.MONTHLY ? daysOfMonth : undefined,
      config,
      enabled,
      destinationId: body.destinationId || undefined,
      encrypt: body.encrypt || false,
      retentionPolicy: body.retentionPolicy || undefined,
    };

    const schedule = await backupScheduler.createSchedule(scheduleData);

    return NextResponse.json({
      schedule,
      message: 'Backup schedule created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Error in POST /api/backup/schedules:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
