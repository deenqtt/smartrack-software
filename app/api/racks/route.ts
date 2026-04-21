import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthFromCookie } from "@/lib/auth";
import { z } from "zod";

// Validation schemas
const createRackSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  capacityU: z.coerce.number().int().min(1, "Capacity must be at least 1U").max(100, "Capacity cannot exceed 100U").default(42),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateRackSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long").optional(),
  capacityU: z.coerce.number().int().min(1, "Capacity must be at least 1U").max(100, "Capacity cannot exceed 100U").optional(),
  location: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/racks - List all racks
export async function GET(request: NextRequest) {
  // DEMO_MODE: Return mock racks
  if (process.env.DEMO_MODE === "true") {
    const { DEMO_RACKS } = await import("@/lib/demo-data");
    return NextResponse.json(DEMO_RACKS);
  }

  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { location: { contains: search, mode: 'insensitive' as const } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ]
    } : {};

    const [racks, total] = await Promise.all([
      prisma.rack.findMany({
        where,
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          name: true,
          capacityU: true,
          rackType: true,
          location: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          devices: {
            select: {
              id: true,
              positionU: true,
              sizeU: true,
              uniqId: true,
              name: true,
            }
          },
          _count: {
            select: { devices: true }
          }
        },
      }),
      prisma.rack.count({ where })
    ]);

    // Calculate utilization for each rack
    const racksWithUtilization = racks.map(rack => {
      const usedU = rack.devices.reduce((sum, device) => sum + (device.sizeU || 1), 0);
      const availableU = rack.capacityU - usedU;
      const utilizationPercent = rack.capacityU > 0 ? Math.round((usedU / rack.capacityU) * 100) : 0;

      return {
        ...rack,
        usedU,
        availableU,
        utilizationPercent,
      };
    });

    return NextResponse.json({
      racks: racksWithUtilization,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("[RACKS_GET]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// POST /api/racks - Create new rack
export async function POST(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    let body;
    try {
      // Check if request has a body
      const contentLength = request.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) === 0) {
        return NextResponse.json(
          { error: "Request body is required" },
          { status: 400 }
        );
      }

      body = await request.json();
    } catch (error) {
      console.error("[RACKS_POST] Error parsing request body:", error);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Validate input
    const validatedData = createRackSchema.parse(body);

    // Check if rack name already exists
    const existingRack = await prisma.rack.findUnique({
      where: { name: validatedData.name }
    });

    if (existingRack) {
      return NextResponse.json(
        { error: "Rack with this name already exists" },
        { status: 409 }
      );
    }

    // Create rack
    const rack = await prisma.rack.create({
      data: validatedData as any,
      select: {
        id: true,
        name: true,
        capacityU: true,
        location: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    console.log(`[RACKS_POST] Created rack: ${rack.name} by user: ${auth.userId}`);

    return NextResponse.json(rack, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[RACKS_POST]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// PUT /api/racks - Bulk update (optional, for future use)
export async function PUT(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json(
    { error: "Bulk update not implemented. Use individual rack endpoints." },
    { status: 501 }
  );
}

// DELETE /api/racks - Bulk delete (optional, for future use)
export async function DELETE(request: NextRequest) {
  const auth = await getAuthFromCookie(request);
  if (!auth || !auth.userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return NextResponse.json(
    { error: "Bulk delete not implemented. Use individual rack endpoints." },
    { status: 501 }
  );
}
