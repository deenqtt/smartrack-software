import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthFromCookie } from "@/lib/auth";

// GET all rule chains for current user
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const ruleChains = await prisma.ruleChain.findMany({
      where: { userId: auth.userId },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(ruleChains);
  } catch (error: any) {
    console.error("Error fetching rule chains:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch rule chains" },
      { status: 500 }
    );
  }
}

// POST create or update rule chain
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, description, nodes, edges, isActive } = body;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Rule chain name is required" },
        { status: 400 }
      );
    }

    if (!nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { error: "Nodes array is required" },
        { status: 400 }
      );
    }

    if (!edges || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: "Edges array is required" },
        { status: 400 }
      );
    }

    let ruleChain;

    if (id) {
      // Update existing rule chain (verify ownership first)
      const existing = await prisma.ruleChain.findUnique({
        where: { id },
      });

      if (!existing || existing.userId !== auth.userId) {
        return NextResponse.json(
          { error: "Unauthorized or rule chain not found" },
          { status: 403 }
        );
      }

      ruleChain = await prisma.ruleChain.update({
        where: { id },
        data: {
          name,
          description,
          nodes,
          edges,
          isActive: isActive !== undefined ? isActive : false,
        },
      });
    } else {
      // Create new rule chain
      ruleChain = await prisma.ruleChain.create({
        data: {
          userId: auth.userId,
          name,
          description,
          nodes,
          edges,
          isActive: isActive !== undefined ? isActive : false,
        },
      });
    }

    return NextResponse.json(ruleChain);
  } catch (error: any) {
    console.error("Error saving rule chain:", error);

    // Handle unique constraint violation
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "You already have a rule chain with this name" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to save rule chain" },
      { status: 500 }
    );
  }
}
