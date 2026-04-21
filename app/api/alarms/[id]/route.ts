// File: app/api/alarms/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Pastikan path ini benar
import { requirePermission } from "@/lib/auth";
import { AlarmKeyType } from "@prisma/client";

// =======================================================
// HANDLER UNTUK GET (Mengambil satu alarm by ID)
// =======================================================
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Server-side permission check: require 'read' on 'alarms'
  await requirePermission(req, "alarms", "read");
  try {
    const { id } = await params;
    const alarm = await prisma.alarmConfiguration.findUnique({
      where: { id },
      include: {
        device: true,
        bits: true,
        notificationRecipients: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phoneNumber: true
              }
            }
          }
        }
      },
    });

    if (!alarm) {
      return NextResponse.json({ message: "Alarm not found" }, { status: 404 });
    }
    return NextResponse.json(alarm);
  } catch (error) {
    console.error("Error fetching alarm:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK PUT (Update alarm)
// =======================================================
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Server-side permission check: require 'update' on 'alarms'
  await requirePermission(req, "alarms", "update");
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      deviceUniqId,
      key,
      keyType,
      customName,
      alarmType,
      minValue,
      maxValue,
      maxOnly,
      directTriggerOnTrue,
      bits = [],
      notificationRecipients = [],
    } = body;

    // Validasi input dasar
    if (!deviceUniqId || !key || !keyType || !customName || !alarmType) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Gunakan transaksi untuk memastikan integritas data:
    // 1. Hapus semua bit lama yang terkait dengan alarm ini.
    // 2. Hapus semua notification recipients lama
    // 3. Update data alarm utama.
    // 4. Buat bit baru jika tipenya adalah BIT_VALUE.
    // 5. Buat notification recipients baru
    const updatedAlarm = await prisma.$transaction(async (tx) => {
      // 1. Hapus bit-bit konfigurasi yang lama
      await tx.alarmBitConfiguration.deleteMany({
        where: { alarmConfigId: id },
      });

      // 2. Hapus notification recipients yang lama
      await tx.alarmNotificationRecipient.deleteMany({
        where: { alarmConfigId: id },
      });

      // 3, 4 & 5. Update alarm utama dan buat bit baru serta notification recipients jika ada
      const updateData: any = {
        customName,
        alarmType,
        keyType,
        key,
        device: { connect: { uniqId: deviceUniqId } },
        minValue:
          keyType === AlarmKeyType.THRESHOLD ? parseFloat(minValue) : null,
        maxValue:
          keyType === AlarmKeyType.THRESHOLD ? parseFloat(maxValue) : null,
        maxOnly: keyType === AlarmKeyType.THRESHOLD ? Boolean(maxOnly) : null,
        directTriggerOnTrue: keyType === AlarmKeyType.DIRECT ? Boolean(directTriggerOnTrue) : null,
      };

      // Add bits if BIT_VALUE type and bits exist
      if (keyType === AlarmKeyType.BIT_VALUE && bits.length > 0) {
        updateData.bits = {
          create: bits.map((bit: any) => ({
            bitPosition: parseInt(bit.bit),
            customName: bit.customName,
            alertToWhatsApp: Boolean(bit.alertToWhatsApp),
          })),
        };
      }

      // Add notification recipients if they exist
      if (notificationRecipients.length > 0) {
        updateData.notificationRecipients = {
          create: notificationRecipients.map((recipient: any) => ({
            userId: recipient.userId,
            sendWhatsApp: Boolean(recipient.sendWhatsApp),
          })),
        };
      }

      const alarm = await tx.alarmConfiguration.update({
        where: { id },
        data: updateData,
      });
      return alarm;
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("ALARM");

    return NextResponse.json(updatedAlarm);
  } catch (error) {
    console.error(`Error updating alarm:`, error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// =======================================================
// HANDLER UNTUK DELETE
// =======================================================
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  // Server-side permission check: require 'delete' on 'alarms'
  await requirePermission(req, "alarms", "delete");
  try {
    const { id } = await params;
    await prisma.alarmConfiguration.delete({
      where: { id },
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("ALARM");

    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error(`Error deleting alarm:`, error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
