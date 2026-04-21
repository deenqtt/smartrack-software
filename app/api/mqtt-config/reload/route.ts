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
import { getServerStatusSummary, clearServerConfigCache } from '@/lib/mqtt-server-config';
import { getAuthFromCookie, getAuthFromHeader } from '@/lib/auth';

// POST /api/mqtt-config/reload - Trigger configuration reload
export async function POST(request: NextRequest) {
  try {
    // Check authentication (Optional for system processes)
    const auth = await getAuthFromCookie(request);
    if (auth && auth.userId) {
      // Check permissions using checkUserPermission (safer than requirePermission)
      const { checkUserPermission } = await import("@/lib/auth");
      const hasPermission = await checkUserPermission(request, "mqtt-config", "update");
      if (!hasPermission) {
        console.warn("[MQTT_CONFIG_RELOAD_POST] Insufficient permissions for user:", auth.userId);
        return NextResponse.json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions to reload MQTT configuration'
        }, { status: 403 });
      }
    }

    // Clear server configuration cache to force refresh
    clearServerConfigCache();

    // Get current status after cache clear
    const status = await getServerStatusSummary();

    return NextResponse.json({
      success: true,
      data: status,
      message: 'MQTT server configuration cache cleared. Providers will reload on next health check.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error reloading MQTT config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to reload MQTT configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/mqtt-config/reload - Get current server status
export async function GET(request: NextRequest) {
  try {
    // Check authentication (Optional for system processes)
    const auth = await getAuthFromCookie(request);
    if (auth && auth.userId) {
      // Check permissions using checkUserPermission (safer than requirePermission)
      const { checkUserPermission } = await import("@/lib/auth");
      const hasPermission = await checkUserPermission(request, "mqtt-config", "read");
      if (!hasPermission) {
        console.warn("[MQTT_CONFIG_RELOAD_GET] Insufficient permissions for user:", auth.userId);
        return NextResponse.json({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions to view MQTT server status'
        }, { status: 403 });
      }
    }

    const status = await getServerStatusSummary();

    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching MQTT server status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch MQTT server status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
