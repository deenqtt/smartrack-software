// File: app/api/bill-configs/[id]/route.ts
import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI PUT: Mengedit konfigurasi tagihan yang ada.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const {
      customName,
      sourceDeviceUniqId,
      sourceDeviceKey,
      rupiahRatePerKwh,
      dollarRatePerKwh,
      carbonRateKgPerKwh,
    } = body;

    // --- PERBAIKAN: Validasi tambahan sebelum update ---
    const sourceDeviceExists = await prisma.deviceExternal.findUnique({
      where: { uniqId: sourceDeviceUniqId },
    });

    if (!sourceDeviceExists) {
      return NextResponse.json(
        { message: `Source device with ID '${sourceDeviceUniqId}' not found.` },
        { status: 404 }
      );
    }
    // --- AKHIR PERBAIKAN ---

    const oldBillConfig = await prisma.billConfiguration.findUnique({
      where: { id },
      select: { customName: true, publishTargetDeviceUniqId: true },
    });

    if (!oldBillConfig) {
      return NextResponse.json(
        { message: "Bill configuration not found" },
        { status: 404 }
      );
    }

    // Update DeviceExternal virtual jika customName berubah
    if (
      oldBillConfig.customName !== customName &&
      oldBillConfig.publishTargetDeviceUniqId
    ) {
      const sanitizedCustomName = customName.replace(/\s+/g, "_");
      const newTopic = `IOT/BillCalculation/${sanitizedCustomName}`;
      const newName = `${customName} (Virtual)`;

      await prisma.deviceExternal.update({
        where: { uniqId: oldBillConfig.publishTargetDeviceUniqId },
        data: { name: newName, topic: newTopic },
      });
    }

    // Update konfigurasi Bill itu sendiri
    const updatedConfig = await prisma.billConfiguration.update({
      where: { id },
      data: {
        customName,
        sourceDeviceUniqId,
        sourceDeviceKey,
        rupiahRatePerKwh,
        dollarRatePerKwh,
        carbonRateKgPerKwh: carbonRateKgPerKwh || 0.87,
      },
    });

    // Trigger reload untuk Calculation Service (MQTT real-time) dan Bill Scheduler (DB logging)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await fetch(`${baseUrl}/api/cron/calculation-reload`, { method: "POST" });
      console.log(
        "✅ Bill config updated - Unified calculation service reload triggered"
      );
    } catch (reloadError) {
      console.error("Failed to trigger reload:", reloadError);
    }

    return NextResponse.json(updatedConfig);
  } catch (error: any) {
    console.error(`Error updating bill configuration with ID ${id}:`, error);
    return NextResponse.json(
      { message: "Failed to update configuration.", error: error.message },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi tagihan.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.billConfiguration.findUnique({
        where: { id },
        // --- PERUBAHAN DI SINI ---
        select: { publishTargetDeviceUniqId: true }, // Ambil uniqId target
      });

      if (!configToDelete) {
        throw new Error("Configuration not found.");
      }

      // Hapus config-nya dulu
      await tx.billConfiguration.delete({ where: { id } });

      // Hapus perangkat virtual-nya berdasarkan uniqId
      await tx.deviceExternal.delete({
        // --- PERUBAHAN DI SINI ---
        where: { uniqId: configToDelete.publishTargetDeviceUniqId },
      });
    });

    // Trigger reload untuk Calculation Service (MQTT real-time) dan Bill Scheduler (DB logging)
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL ||
      `http://localhost:${process.env.PORT || 3000}`;
    try {
      await fetch(`${baseUrl}/api/cron/calculation-reload`, { method: "POST" });
      console.log(
        "✅ Bill config deleted - Unified calculation service reload triggered"
      );
    } catch (reloadError) {
      console.error("Failed to trigger reload:", reloadError);
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
