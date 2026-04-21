// File: app/api/backup/schedules/[scheduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { backupService } from '@/lib/services/backup-management-service';

const backupScheduler = backupService; // Backward compatibility
import { BackupType, BackupFrequency } from '@/lib/types/backup';

// =======================================================
// GET /api/backup/schedules/[scheduleId] - Get specific schedule
// =======================================================
export async function GET(request: NextRequest, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId } = await params;
    const schedule = await backupScheduler.getScheduleById(scheduleId);

    if (!schedule) {
      return NextResponse.json(
        { message: 'Backup schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      schedule,
      message: 'Backup schedule retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// PUT /api/backup/schedules/[scheduleId] - Update backup schedule
// =======================================================
export async function PUT(request: NextRequest, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId } = await params;
    const body = await request.json();

    const {
      name,
      type,
      frequency,
      time,
      daysOfWeek,
      daysOfMonth,
      enabled,
      config
    } = body;

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) {
      if (type !== BackupType.DATABASE) {
        return NextResponse.json(
          { message: `Invalid backup type: ${type}. Only DATABASE backups are currently supported.` },
          { status: 400 }
        );
      }
      updateData.type = type;
    }
    if (frequency !== undefined) {
      if (!Object.values(BackupFrequency).includes(frequency)) {
        return NextResponse.json(
          { message: `Invalid frequency: ${frequency}` },
          { status: 400 }
        );
      }
      updateData.frequency = frequency;
    }
    if (time !== undefined) updateData.time = time;
    if (daysOfWeek !== undefined) updateData.daysOfWeek = daysOfWeek;
    if (daysOfMonth !== undefined) updateData.daysOfMonth = daysOfMonth;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (config !== undefined) updateData.config = config;
    if (body.destinationId !== undefined) updateData.destinationId = body.destinationId;
    if (body.encrypt !== undefined) updateData.encrypt = body.encrypt;
    if (body.retentionPolicy !== undefined) updateData.retentionPolicy = body.retentionPolicy;

    const updatedSchedule = await backupScheduler.updateSchedule(scheduleId, updateData);

    if (!updatedSchedule) {
      return NextResponse.json(
        { message: 'Backup schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      schedule: updatedSchedule,
      message: 'Backup schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

interface ExecuteRouteParams {
  params: {
    scheduleId: string;
  };
}

// =======================================================
// DELETE /api/backup/schedules/[scheduleId] - Delete backup schedule
// =======================================================
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ scheduleId: string }> }) {
  try {
    const { scheduleId } = await params;
    const success = await backupScheduler.deleteSchedule(scheduleId);

    if (!success) {
      return NextResponse.json(
        { message: 'Backup schedule not found or could not be deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Backup schedule deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting backup schedule:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

// =======================================================
// Handle dynamic routes like /api/backup/schedules/[scheduleId]/execute
// This needs to be handled differently since Next.js doesn't support nested dynamic routes well
// The execute functionality will be moved to a separate endpoint: POST /api/backup/schedules/{scheduleId}/execute
// =======================================================

// Note: Direct dynamic nested routes aren't supported well in Next.js
// The execute functionality should be implemented as part of the main schedule route
// with additional path handling, but for now we'll handle it in the main backup route file
