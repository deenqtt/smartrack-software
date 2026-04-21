import { NextRequest, NextResponse } from "next/server";
import { prisma, checkDatabaseConnection } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const dbHealth = await checkDatabaseConnection();

    let userCount = 0;
    if (dbHealth.connected) {
      userCount = await prisma.user.count();
    }

    const response = {
      database_connected: dbHealth.connected,
      user_count: userCount,
      timestamp: new Date().toISOString(),
      latency: dbHealth.latency,
      ...(dbHealth.connected ? {} : { error: dbHealth.error }),
    };

    return NextResponse.json(response, {
      status: dbHealth.connected ? 200 : 500,
    });
  } catch (error) {
    return NextResponse.json(
      {
        database_connected: false,
        user_count: 0,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
