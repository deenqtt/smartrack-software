// File: app/api/bill-logs/delete-all/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI DELETE: Menghapus SEMUA log dari tabel BillLog.
 * Ini adalah aksi yang berbahaya, jadi harus dilindungi.
 */
export async function DELETE(request: Request) {
  const auth = await getAuthFromCookie(request);
  // Pastikan hanya ADMIN yang bisa melakukan ini
  if (!auth || auth.role !== "ADMIN") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    // Perintah Prisma untuk menghapus semua record di tabel
    const { count } = await prisma.billLog.deleteMany({});

    return NextResponse.json({
      message: `${count} logs have been successfully deleted.`,
    });
  } catch (error) {
    console.error("Failed to delete all bill logs:", error);
    return NextResponse.json(
      { message: "Failed to delete logs." },
      { status: 500 }
    );
  }
}
