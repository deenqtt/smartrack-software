import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Check if user has permission to read modbus-rtu configurations
    await requirePermission(request, "protocol", "read");

    const configs = await prisma.modbusRTUConfig.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(configs);
  } catch (error: any) {
    console.error("Error fetching Modbus RTU configurations:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user has permission to create modbus-rtu configurations
    await requirePermission(request, "protocol", "create");

    const body = await request.json();
    const { name, port, baudRate, dataBits, parity, stopBits, timeout, isActive } = body;

    // Validate required fields
    if (!name || !port) {
      return NextResponse.json(
        { error: "Name and port are required" },
        { status: 400 }
      );
    }

    // Check if port is already in use
    const existingConfig = await prisma.modbusRTUConfig.findFirst({
      where: { port: port },
    });

    if (existingConfig) {
      return NextResponse.json(
        { error: "Port is already in use by another configuration" },
        { status: 400 }
      );
    }

    const config = await prisma.modbusRTUConfig.create({
      data: {
        name,
        port,
        baudRate: baudRate || 9600,
        dataBits: dataBits || 8,
        parity: parity || "none",
        stopBits: stopBits || 1,
        timeout: timeout || 1000,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error: any) {
    console.error("Error creating Modbus RTU configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user has permission to update modbus-rtu configurations
    await requirePermission(request, "protocol", "update");

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, port, baudRate, dataBits, parity, stopBits, timeout, isActive } = body;

    // Validate required fields
    if (!name || !port) {
      return NextResponse.json(
        { error: "Name and port are required" },
        { status: 400 }
      );
    }

    // Check if port is already in use by another configuration
    const existingConfig = await prisma.modbusRTUConfig.findFirst({
      where: {
        port: port,
        id: { not: id }
      },
    });

    if (existingConfig) {
      return NextResponse.json(
        { error: "Port is already in use by another configuration" },
        { status: 400 }
      );
    }

    const config = await prisma.modbusRTUConfig.update({
      where: { id },
      data: {
        name,
        port,
        baudRate,
        dataBits,
        parity,
        stopBits,
        timeout,
        isActive,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(config);
  } catch (error: any) {
    console.error("Error updating Modbus RTU configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update configuration" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user has permission to delete modbus-rtu configurations
    await requirePermission(request, "protocol", "delete");

    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();

    if (!id) {
      return NextResponse.json(
        { error: "Configuration ID is required" },
        { status: 400 }
      );
    }

    await prisma.modbusRTUConfig.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Configuration deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting Modbus RTU configuration:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete configuration" },
      { status: 500 }
    );
  }
}
