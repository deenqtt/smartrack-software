// File: app/api/devices/external/route.ts

import { NextResponse } from "next/server";
import { getAuthFromCookie, getAuthFromHeader } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * FUNGSI GET: Mengambil semua data device
 */
export async function GET(request: Request) {
  // DEMO_MODE: Return mock external devices
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_EXTERNAL_DEVICES } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_EXTERNAL_DEVICES);
  }

  // Try cookie auth first (for web clients)
  let auth = await getAuthFromCookie(request);

  // If no cookie auth, try Authorization header (for mobile clients)
  if (!auth || !auth.userId) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Enforce RBAC: require devices read permission
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'read');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }


  try {
    const devices = await prisma.deviceExternal.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(devices);
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Menyimpan device baru
 */

// Ganti seluruh fungsi POST yang lama dengan ini
export async function POST(request: Request) {
  // Check authentication first (support both cookie and header auth)
  let auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    auth = await getAuthFromHeader(request);
  }

  if (!auth || !auth.userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Check if user has permission to create external devices
  const { requirePermission } = await import('@/lib/auth');
  try {
    await requirePermission(request, 'devices', 'create');
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();

    // --- 1. Logika untuk Impor Data (jika body adalah array) ---
    if (Array.isArray(body)) {
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const errors: string[] = [];


      // Count how many new devices will be created (not updated)
      let newDevicesCount = 0;
      const existingDeviceIds = new Set();

      for (const device of body) {
        if (device.uniqId) {
          const existing = await prisma.deviceExternal.findUnique({
            where: { uniqId: device.uniqId }
          });
          if (!existing) {
            newDevicesCount++;
          } else {
            existingDeviceIds.add(device.uniqId);
          }
        } else {
          newDevicesCount++; // New device without uniqId
        }
      }



      // Pre-fetch all existing data for fast lookup and to prevent intra-batch duplicates
      const allExisting = await prisma.deviceExternal.findMany({
        select: { topic: true, uniqId: true, name: true }
      });
      const existingTopics = new Set(allExisting.map(d => d.topic));
      const existingUniqIds = new Set(allExisting.map(d => d.uniqId));
      const existingNames = new Set(allExisting.map(d => d.name.toLowerCase()));

      // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
      await prisma.$transaction(async (tx) => {
        for (const device of body) {
          // Validasi dasar
          if (!device.uniqId || !device.topic || !device.name) {
            skippedCount++;
            errors.push(`Data tidak lengkap (uniqId, topic, name wajib ada).`);
            continue;
          }

          const nameLower = device.name.toLowerCase();
          const existingByUniqId = existingUniqIds.has(device.uniqId);
          const existingByTopic = existingTopics.has(device.topic);

          if (existingByUniqId) {
            // --- UPDATE LOGIC ---
            // In bulk, we check if topic changed and if it conflicts
            const currentDevice = allExisting.find(d => d.uniqId === device.uniqId);
            if (currentDevice && currentDevice.topic !== device.topic && existingTopics.has(device.topic)) {
              skippedCount++;
              errors.push(`Gagal update ${device.name}: Topic ${device.topic} sudah digunakan.`);
            } else {
              await tx.deviceExternal.update({
                where: { uniqId: device.uniqId },
                data: {
                  name: device.name,
                  topic: device.topic,
                  address: device.address,
                },
              });
              existingNames.add(nameLower);
              existingTopics.add(device.topic);
              updatedCount++;
            }
          } else {
            // --- CREATE LOGIC ---
            if (existingByTopic || existingNames.has(nameLower)) {
              skippedCount++;
              const reason = existingByTopic ? `Topic ${device.topic} sudah digunakan` : `Nama ${device.name} sudah digunakan`;
              errors.push(`Gagal buat ${device.name}: ${reason}.`);
            } else {
              await tx.deviceExternal.create({ data: device });
              existingTopics.add(device.topic);
              existingUniqIds.add(device.uniqId);
              existingNames.add(nameLower);
              createdCount++;
            }
          }
        }
      });

      return NextResponse.json(
        {
          message: "Proses impor selesai.",
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          errors: errors,
        },
        { status: 200 }
      );
    } else {
      // --- 2. Logika untuk Data Tunggal (dari form biasa) ---
      const { name, topic, address } = body;
      if (!name || !topic) {
        return NextResponse.json(
          { message: "Nama dan Topic wajib diisi." },
          { status: 400 }
        );
      }



      // Check for duplicate name (case-insensitive)
      const existingName = await prisma.deviceExternal.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
      if (existingName) {
        return NextResponse.json(
          { error: "Nama device sudah digunakan" },
          { status: 409 }
        );
      }

      const newDevice = await prisma.deviceExternal.create({
        data: { name, topic, address },
      });
      return NextResponse.json(newDevice, { status: 201 });
    }
  } catch (error: any) {
    console.error("Error creating device(s):", error);

    // Handle specific Prisma errors for single device creation
    if (error.code === 'P2002') {
      if (error.meta?.target?.includes('topic')) {
        return NextResponse.json(
          { error: "Topic already used by another device" },
          { status: 409 }
        );
      }
      if (error.meta?.target?.includes('uniqId')) {
        return NextResponse.json(
          { error: "uniqId already used by another device" },
          { status: 409 }
        );
      }
    }

    // Generic error
    return NextResponse.json(
      { error: error.message || "Error saving device" },
      { status: 500 }
    );
  }
}
