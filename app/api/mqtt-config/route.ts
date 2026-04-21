import { NextRequest, NextResponse } from 'next/server';
import {
  getAllMqttConfigs,
  getActiveMqttConfigs,
  createMqttConfig,
  updateMqttConfig,
  deleteMqttConfig,
  validateMqttConfig
} from '@/lib/mqtt-db-service';
import { getAuthFromCookie, getAuthFromHeader } from '@/lib/auth';

// ==============================
// PUBLIC ENDPOINT FOR ACTIVE CONFIGS handled in GET with ?active=true
// ==============================
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

// GET /api/mqtt-config - List all configurations or active only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // No authentication required for MQTT config access
    if (activeOnly) {
      const configs = await getActiveMqttConfigs();
      return NextResponse.json({
        success: true,
        data: configs,
        count: configs.length
      });
    }

    const configs = await getAllMqttConfigs();

    return NextResponse.json({
      success: true,
      data: configs,
      count: configs.length
    });
  } catch (error) {
    console.error('Error fetching MQTT configs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch MQTT configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/mqtt-config - Create new MQTT configuration
export async function POST(request: NextRequest) {
  try {
    // No authentication required for MQTT config access

    const body = await request.json();

    // Validate required fields
    const validation = validateMqttConfig(body);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      }, { status: 400 });
    }

    // Create configuration
    const config = await createMqttConfig(body);

    return NextResponse.json({
      success: true,
      data: config,
      message: 'MQTT configuration created successfully'
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating MQTT config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create MQTT configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
