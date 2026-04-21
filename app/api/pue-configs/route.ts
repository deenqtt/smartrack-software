// File: app/api/pue-configs/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";

/**
 * Helper untuk validasi struktur JSON PDU dan Main Power
 * Menggunakan topicUniqId sebagai referensi perangkat.
 */
function validatePueJson(pduList: any, mainPower: any) {
  const errors: string[] = [];
  let validatedPduList: any[] = [];
  let validatedMainPower: any = {};

  // Validate mainPower
  if (
    !mainPower ||
    typeof mainPower !== "object" ||
    !mainPower.topicUniqId ||
    !mainPower.key
  ) {
    errors.push(
      "Main Power configuration is invalid or missing required fields (topicUniqId, key)."
    );
  } else {
    validatedMainPower = {
      topicUniqId: String(mainPower.topicUniqId),
      key: String(mainPower.key),
      value: null, // Reset value saat menyimpan/mengupdate konfigurasi
    };
  }

  // Validate pduList
  if (!Array.isArray(pduList)) {
    errors.push("PDU List must be an array.");
  } else {
    validatedPduList = pduList
      .map((pdu: any, index: number) => {
        if (
          !pdu ||
          typeof pdu !== "object" ||
          !pdu.topicUniqId ||
          !Array.isArray(pdu.keys)
        ) {
          errors.push(
            `PDU at index ${index} has invalid structure or missing required fields (topicUniqId, keys).`
          );
          return null; // Return null for invalid items to be filtered out later
        }
        return {
          topicUniqId: String(pdu.topicUniqId),
          name: pdu.name || `PDU-${index + 1}`,
          keys: pdu.keys.map(String),
          value: null, // Reset value saat menyimpan/mengupdate konfigurasi
        };
      })
      .filter(Boolean); // Filter out any nulls
  }
  return { pduList: validatedPduList, mainPower: validatedMainPower, errors };
}

/**
 * FUNGSI GET: Mengambil semua konfigurasi PUE.
 */
export async function GET(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const pueConfigs = await prisma.pueConfiguration.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    // Parse JSON strings back to objects untuk frontend
    const parsedConfigs = pueConfigs.map((config) => ({
      ...config,
      pduList: config.pduList ? JSON.parse(config.pduList as string) : [],
      mainPower: config.mainPower ? JSON.parse(config.mainPower as string) : {},
    }));

    return NextResponse.json(parsedConfigs);
  } catch (error) {
    console.error("Error fetching PUE configurations:", error);
    return NextResponse.json(
      { message: "Failed to fetch PUE configurations." },
      { status: 500 }
    );
  }
}

/**
 * FUNGSI POST: Membuat konfigurasi PUE baru.
 */
export async function POST(request: Request) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { customName, pduList, mainPower } = body;

    // Validasi dasar keberadaan field
    if (!customName || !pduList || !mainPower) {
      return NextResponse.json(
        { message: "Missing required fields: customName, pduList, mainPower" },
        { status: 400 }
      );
    }

    const {
      pduList: validatedPduList,
      mainPower: validatedMainPower,
      errors: validationErrors,
    } = validatePueJson(pduList, mainPower);

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { message: "Validation errors", errors: validationErrors },
        { status: 400 }
      );
    }

    // Periksa apakah customName sudah ada
    const existingConfig = await prisma.pueConfiguration.findUnique({
      where: { customName },
    });
    if (existingConfig) {
      return NextResponse.json(
        { message: "Custom name already exists." },
        { status: 409 }
      );
    }

    // Buat DeviceExternal baru untuk customName ini (seperti di bill-configs)
    // uniqId akan otomatis dibuat oleh Prisma
    const sanitizedCustomName = customName.replace(/\s+/g, "_");
    const apiTopic = await prisma.deviceExternal.create({
      data: {
        name: `${customName} (PUE Main)`,
        topic: `IOT/PUE/${sanitizedCustomName}`,
        address: "pue-system-virtual",
      },
    });

    // Buat konfigurasi PUE baru, referensikan uniqId dari DeviceExternal yang baru dibuat
    const newPueConfig = await prisma.pueConfiguration.create({
      data: {
        customName,
        type: "pue",
        apiTopicUniqId: apiTopic.uniqId,
        pduList: JSON.stringify(validatedPduList), // Convert to String
        mainPower: JSON.stringify(validatedMainPower), // Convert to String
      },
    });

    // Notify services about configuration update
    const { serviceManager } = await import("@/lib/services/service-manager");
    serviceManager.notifyConfigUpdate("PUE");

    // Parse response untuk frontend
    const responseConfig = {
      ...newPueConfig,
      pduList: JSON.parse((newPueConfig.pduList as string) || "[]"),
      mainPower: JSON.parse((newPueConfig.mainPower as string) || "{}"),
    };

    return NextResponse.json(responseConfig, { status: 201 });
  } catch (error: any) {
    console.error("Error creating PUE configuration:", error);
    return NextResponse.json(
      { message: "Failed to create PUE configuration.", error: error.message },
      { status: 500 }
    );
  }
}
