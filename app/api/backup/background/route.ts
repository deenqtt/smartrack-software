// app/api/backup/background/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getServerSession } from "@/lib/auth";
import { addBackupJob, getQueueStats } from "@/lib/queue-manager";

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const user = await getServerSession(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    await requirePermission(request, "backup", "create");

    // Parse request body
    const body = await request.json();
    const { type, config } = body;

    // Validate input
    const validTypes = ['database', 'filesystem', 'full'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { message: "Invalid backup type. Must be: database, filesystem, or full" },
        { status: 400 }
      );
    }

    // Add job to queue
    const job = await addBackupJob({
      type,
      userId: user.userId,
      config
    });

    console.log(`📋 Backup job queued: ${job.id} for user ${user.userId} (${type})`);

    return NextResponse.json({
      success: true,
      message: "Backup job has been queued successfully",
      jobId: job.id,
      type,
      userId: user.userId,
      estimatedStart: "Background processing - check status for updates"
    });

  } catch (error: any) {
    console.error("[API_BACKUP_BACKGROUND]", error);
    return NextResponse.json(
      { message: "Failed to queue backup job", error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check queue status
export async function GET(request: NextRequest) {
  try {
    // Get user session
    const user = await getServerSession(request);
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Check permissions
    await requirePermission(request, "backup", "read");

    // Get queue statistics
    const queueStats = await getQueueStats();

    return NextResponse.json({
      success: true,
      queues: queueStats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error("[API_BACKUP_QUEUE_STATUS]", error);
    return NextResponse.json(
      { message: "Failed to get queue status", error: error.message },
      { status: 500 }
    );
  }
}
