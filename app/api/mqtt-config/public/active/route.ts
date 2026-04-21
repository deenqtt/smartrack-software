import { NextRequest, NextResponse } from 'next/server';
import { getActiveMqttConfigs } from '@/lib/mqtt-db-service';

// GET /api/mqtt-config/public/active - Public access to active MQTT configurations
// This endpoint allows external systems to fetch active MQTT broker configurations without authentication
export async function GET(request: NextRequest) {
  try {
    const configs = await getActiveMqttConfigs();
    return NextResponse.json({
      success: true,
      data: configs,
      count: configs.length
    });
  } catch (error) {
    console.error('Error fetching active MQTT configs:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch active MQTT configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
