// File BARU: app/api/bill-logs/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI GET: Mengambil riwayat log tagihan.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Require bill-logs:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "bill-logs", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const logs = await prisma.billLog.findMany({
      // Ambil 100 log terbaru
      take: 100,
      orderBy: {
        timestamp: "desc",
      },
      // Sertakan detail nama dari konfigurasi terkait
      include: {
        config: {
          select: {
            customName: true,
          },
        },
      },
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to fetch bill logs:", error);
    return NextResponse.json(
      { message: "Failed to fetch logs." },
      { status: 500 }
    );
  }
}
