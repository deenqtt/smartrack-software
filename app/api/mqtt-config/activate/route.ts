// Helper function to get auth from either cookie or header
async function getAuthHeader(request: NextRequest) {
  // Try cookie auth first (for web clients)
  let auth = await getAuthFromCookie(request);

  // If no cookie auth, try Authorization header (for API clients/mobile)
  if (!auth || !auth.userId) {
    auth = await getAuthFromHeader(request);
  }

  return auth;
}

import { NextRequest, NextResponse } from 'next/server';
import { activateMqttBroker, deactivateMqttBroker, getCurrentActiveBroker } from '@/lib/mqtt-db-service';
import { getAuthFromCookie, getAuthFromHeader } from '@/lib/auth';

// POST /api/mqtt-config/activate - Activate a specific broker (deactivates all others)
export async function POST(request: NextRequest) {
  try {
    // Check authentication only
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const { brokerId } = await request.json();

    if (!brokerId) {
      return NextResponse.json({
        success: false,
        error: 'brokerId is required'
      }, { status: 400 });
    }

    // Activate the specified broker
    const activatedConfig = await activateMqttBroker(brokerId);

    return NextResponse.json({
      success: true,
      data: activatedConfig,
      message: `MQTT broker "${activatedConfig.name}" activated successfully. All other brokers have been deactivated.`
    });
  } catch (error) {
    console.error('Error activating MQTT broker:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to activate MQTT broker',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/mqtt-config/activate - Get currently active broker
export async function GET(request: NextRequest) {
  try {
    // Check authentication only
    const auth = await getAuthFromCookie(request);
    if (!auth || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      }, { status: 401 });
    }

    const activeBroker = await getCurrentActiveBroker();

    return NextResponse.json({
      success: true,
      data: activeBroker,
      message: activeBroker ? `Currently active broker: ${activeBroker.name}` : 'No active broker'
    });
  } catch (error) {
    console.error('Error getting active broker:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get active broker',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
