// File: app/api/topics/by-uniqid/[uniqId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth"; // Pastikan path ini benar
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI GET: Mengambil DeviceExternal berdasarkan uniqId.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uniqId: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { uniqId } = await params;

  try {
    const device = await prisma.deviceExternal.findUnique({
      where: { uniqId },
      select: {
        id: true, // Sertakan ID Prisma juga jika frontend masih membutuhkannya di beberapa tempat
        uniqId: true,
        name: true,
        topic: true, // Ini adalah topicName yang dibutuhkan
      },
    });

    if (!device) {
      return NextResponse.json(
        { message: "Device not found" },
        { status: 404 }
      );
    }
    // Kembalikan objek yang konsisten dengan tipe `Topic` di frontend
    return NextResponse.json({
      id: device.id,
      uniqId: device.uniqId,
      name: device.name,
      topicName: device.topic,
    });
  } catch (error: any) {
    console.error(`Error fetching device by uniqId ${uniqId}:`, error);
    return NextResponse.json(
      { message: "Failed to fetch device by uniqId.", error: error.message },
      { status: 500 }
    );
  }
}
