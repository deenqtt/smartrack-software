import { NextRequest, NextResponse } from "next/server";
import { RuleChainExecutionEngine } from "../../../../../lib/rule-chain/execution-engine";
import { prisma } from "@/lib/prisma";
const executionEngine = new RuleChainExecutionEngine();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { testPayload } = body;

    // Load rule chain from database
    const ruleChain = await prisma.ruleChain.findUnique({
      where: { id },
    });

    if (!ruleChain) {
      return NextResponse.json(
        { success: false, error: "Rule chain not found" },
        { status: 404 },
      );
    }

    const nodes = ruleChain.nodes as any[];
    const edges = ruleChain.edges as any[];

    // Execute the rule chain with actual nodes and edges
    const executionContext = await executionEngine.executeRuleChain(
      id,
      nodes,
      edges,
      testPayload || {},
    );

    console.log(`✅ API: Rule chain ${id} executed successfully`);

    return NextResponse.json({
      success: true,
      execution: {
        executionId: executionContext.executionId,
        duration: executionContext.duration,
        executionPath: executionContext.executionPath,
        errors: executionContext.errors,
      },
    });
  } catch (error: any) {
    console.error(`❌ API: Rule chain execution failed:`, error);

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to execute rule chain",
      },
      { status: 500 },
    );
  }
}
