// File: app/api/energy-targets/route.ts
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";

// FUNGSI GET: Mengambil target untuk config dan tahun tertentu
export async function GET(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Require energy-targets:read permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "energy-targets", "read");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const loggingConfigId = searchParams.get("configId");
  const year = parseInt(searchParams.get("year") || "", 10);

  if (!loggingConfigId || !year) {
    return NextResponse.json(
      { message: "configId and year are required" },
      { status: 400 }
    );
  }

  try {
    const target = await prisma.energyTarget.findUnique({
      where: {
        loggingConfigId_year: { loggingConfigId, year },
      },
    });
    return NextResponse.json(target?.monthlyTargets || {});
  } catch (error) {
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// FUNGSI POST: Menyimpan atau memperbarui target
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // RBAC: Require energy-targets:create permission
  const { requirePermission } = await import("@/lib/auth");
  try {
    await requirePermission(request, "energy-targets", "create");
  } catch (error) {
    return NextResponse.json({ message: "Forbidden - Insufficient permissions" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { loggingConfigId, year, monthlyTargets } = body;

    if (!loggingConfigId || !year || !monthlyTargets) {
      return NextResponse.json({ message: "Invalid data" }, { status: 400 });
    }

    const upsertedTarget = await prisma.energyTarget.upsert({
      where: {
        loggingConfigId_year: { loggingConfigId, year },
      },
      update: {
        monthlyTargets,
      },
      create: {
        loggingConfigId,
        year,
        monthlyTargets,
      },
    });

    return NextResponse.json(upsertedTarget, { status: 200 });
  } catch (error) {
    console.error("[API_ENERGY_TARGET_POST]", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
