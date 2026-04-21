import { NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI GET: Mengambil semua konfigurasi tagihan.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const configs = await prisma.billConfiguration.findMany({
      where: {
        OR: [
          { userId: auth.userId },
          { sharedUsers: { some: { id: auth.userId } } },
        ],
      },
      include: {
        sourceDevice: true,
        user: {
          select: { id: true, email: true },
        },
        sharedUsers: {
          select: { id: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(configs);
  } catch (error) {
    console.error("Error fetching bill configurations:", error);
    return NextResponse.json(
      { message: "Failed to fetch configurations." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Membuat konfigurasi tagihan baru.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();

    const sanitizedCustomName = body.customName.replace(/\s+/g, "_");
    const topicName = `IOT/BillCalculation/${sanitizedCustomName}`;

    // 1. Create or Update the output device for the results
    const targetDevice = await prisma.deviceExternal.upsert({
      where: { topic: topicName },
      update: {
        name: body.customName,
        address: "virtual-device",
      },
      create: {
        name: body.customName,
        topic: topicName,
        address: "virtual-device",
        users: {
          connect: { id: auth.userId },
        },
      },
    });

    const newConfig = await prisma.billConfiguration.create({
      data: {
        customName: body.customName,
        sourceDeviceUniqId: body.sourceDeviceUniqId,
        sourceDeviceKey: body.sourceDeviceKey,
        rupiahRatePerKwh: body.rupiahRatePerKwh,
        dollarRatePerKwh: body.dollarRatePerKwh,
        carbonRateKgPerKwh: body.carbonRateKgPerKwh || 0.87,
        publishTargetDeviceUniqId: targetDevice.uniqId,
        userId: auth.userId,
      },
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("BILL");

    return NextResponse.json(newConfig, { status: 201 });
  } catch (error) {
    console.error("Error creating bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to create configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI PUT: Mengupdate konfigurasi tagihan berdasarkan ID.
 */
export async function PUT(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      customName,
      sourceDeviceUniqId,
      sourceDeviceKey,
      rupiahRatePerKwh,
      dollarRatePerKwh,
      carbonRateKgPerKwh,
    } = body;

    const updatedConfig = await prisma.$transaction(async (tx) => {
      const config = await tx.billConfiguration.update({
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

      if (config.publishTargetDeviceUniqId) {
        const sanitizedCustomName = customName.replace(/\s+/g, "_");
        const newTopic = `IOT/BillCalculation/${sanitizedCustomName}`;

        await tx.deviceExternal.update({
          where: { uniqId: config.publishTargetDeviceUniqId },
          data: {
            name: customName,
            topic: newTopic,
          },
        });
      }

      return config;
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("BILL");

    return NextResponse.json(updatedConfig);
  } catch (error) {
    console.error("Error updating bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to update configuration." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI DELETE: Menghapus konfigurasi tagihan berdasarkan ID.
 */
export async function DELETE(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const configToDelete = await tx.billConfiguration.findUnique({
        where: { id },
        select: { publishTargetDeviceUniqId: true },
      });

      if (!configToDelete) {
        throw new Error("Configuration not found");
      }

      await tx.billConfiguration.delete({
        where: { id },
      });

      if (configToDelete.publishTargetDeviceUniqId) {
        await tx.deviceExternal.delete({
          where: { uniqId: configToDelete.publishTargetDeviceUniqId },
        });
      }
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("BILL");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting bill configuration:", error);
    return NextResponse.json(
      { message: "Failed to delete configuration." },
      { status: 500 }
    );
  }
}
