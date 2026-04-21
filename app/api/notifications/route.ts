// File: app/api/notifications/route.ts
// Deskripsi: Menambahkan fungsi DELETE untuk menghapus notifikasi.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { cleanupNotification } from "@/lib/services/data-limits-service";

// FUNGSI GET: Mengambil notifikasi untuk user yang login (TETAP SAMA)
export async function GET(request: NextRequest) {
  // DEMO_MODE: Return mock notifications
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_NOTIFICATIONS } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_NOTIFICATIONS);
  }

  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  // Require notification-history:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "notification-history", "read");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: authPayload.userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    if (error instanceof Response) return error;
    console.error("[NOTIFICATIONS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// FUNGSI POST: Menandai semua notifikasi sebagai "sudah dibaca" (TETAP SAMA)
export async function POST(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  // Require notification-history:update permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "notification-history", "update");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await prisma.notification.updateMany({
      where: {
        userId: authPayload.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("[NOTIFICATIONS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// --- FUNGSI BARU ---
// FUNGSI DELETE: Menghapus semua notifikasi untuk user yang login
export async function DELETE(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  // Require notification-history:delete permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "notification-history", "delete");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    await prisma.notification.deleteMany({
      where: {
        userId: authPayload.userId,
      },
    });

    return NextResponse.json({ message: "All notifications deleted" });
  } catch (error) {
    console.error("[NOTIFICATIONS_DELETE]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// FUNGSI PUT: Membuat test notification untuk development/testing
export async function PUT(request: NextRequest) {
  const authPayload = await getAuthFromCookie(request);
  if (!authPayload?.userId) {
    return new NextResponse("Unauthenticated", { status: 401 });
  }

  // Require notification-history:create permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "notification-history", "create");
  } catch (error) {
    return NextResponse.json(
      { message: "Forbidden - Insufficient permissions" },
      { status: 403 }
    );
  }

  try {
    const { message } = await request.json();

    const testMessage =
      message ||
      `Test notification created at ${new Date().toLocaleString("id-ID")}`;

    const notification = await prisma.notification.create({
      data: {
        userId: authPayload.userId,
        message: testMessage,
        isRead: false,
      },
    });

    // Auto cleanup notifications if over limit
    try {
      const cleanupResult = await cleanupNotification();
      if (cleanupResult.deleted > 0) {
        console.log(
          `[Data Limits] Auto-cleanup: ${cleanupResult.table} ${cleanupResult.before} → ${cleanupResult.after} (${cleanupResult.deleted} deleted)`
        );
      }
    } catch (cleanupError) {
      console.error("[Data Limits] Auto-cleanup failed:", cleanupError);
      // Don't fail the notification creation if cleanup fails
    }

    return NextResponse.json({
      message: "Test notification created",
      notification,
    });
  } catch (error) {
    console.error("[NOTIFICATIONS_PUT]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
