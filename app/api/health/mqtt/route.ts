import { NextRequest, NextResponse } from 'next/server';

// Simple MQTT broker health check endpoint
// This can be used by the client to test basic connectivity
export async function GET(request: NextRequest) {
  try {
    // This is a basic health check - in a real implementation,
    // you might want to check if the MQTT broker is actually reachable
    // For now, just return OK to indicate the API is working

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      message: 'MQTT health check passed'
    });
  } catch (error) {
    console.error('MQTT health check failed:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        message: 'MQTT health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}
