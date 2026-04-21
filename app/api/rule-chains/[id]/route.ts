import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";

// GET a specific rule chain by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const ruleChain = await prisma.ruleChain.findUnique({
      where: { id },
    });

    if (!ruleChain) {
      return NextResponse.json(
        { error: "Rule chain not found" },
        { status: 404 }
      );
    }

    // Verify ownership
    if (ruleChain.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json(ruleChain);
  } catch (error: any) {
    console.error("Error fetching rule chain:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rule chain" },
      { status: 500 }
    );
  }
}

// DELETE a rule chain
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership first
    const ruleChain = await prisma.ruleChain.findUnique({
      where: { id },
    });

    if (!ruleChain) {
      return NextResponse.json(
        { error: "Rule chain not found" },
        { status: 404 }
      );
    }

    if (ruleChain.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const deleted = await prisma.ruleChain.delete({
      where: { id },
    });

    return NextResponse.json(deleted);
  } catch (error: any) {
    console.error("Error deleting rule chain:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Rule chain not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to delete rule chain" },
      { status: 500 }
    );
  }
}

// PUT update a specific rule chain
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verify ownership first
    const ruleChain = await prisma.ruleChain.findUnique({
      where: { id },
    });

    if (!ruleChain) {
      return NextResponse.json(
        { error: "Rule chain not found" },
        { status: 404 }
      );
    }

    if (ruleChain.userId !== auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, nodes, edges, isActive } = body;

    // Validate required fields if provided
    if (name === "") {
      return NextResponse.json(
        { error: "Rule chain name cannot be empty" },
        { status: 400 }
      );
    }

    const updated = await prisma.ruleChain.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(nodes && { nodes }),
        ...(edges && { edges }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("Error updating rule chain:", error);

    if (error.code === "P2025") {
      return NextResponse.json(
        { error: "Rule chain not found" },
        { status: 404 }
      );
    }

    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a rule chain with this name" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to update rule chain" },
      { status: 500 }
    );
  }
}
