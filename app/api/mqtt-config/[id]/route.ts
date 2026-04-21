import { NextRequest, NextResponse } from 'next/server';
import {
  getMqttConfigById,
  updateMqttConfig,
  deleteMqttConfig,
  validateMqttConfig,
  incrementMessageStats
} from '@/lib/mqtt-db-service';
import { getAuthFromCookie, getAuthFromHeader } from '@/lib/auth';

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

// GET /api/mqtt-config/[id] - Get configuration by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // No authentication required for MQTT config access
    const config = await getMqttConfigById((await params).id);

    if (!config) {
      return NextResponse.json({
        success: false,
        error: 'MQTT configuration not found'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching MQTT config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch MQTT configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT /api/mqtt-config/[id] - Update configuration
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // No authentication required for MQTT config access

    let body;
    try {
      // Check if request has a body
      const contentLength = request.headers.get('content-length');
      const contentType = request.headers.get('content-type');

      // Allow empty body for certain operations, but validate content-type
      if (contentType && contentType.includes('application/json')) {
        try {
          body = await request.json();
        } catch (jsonError) {
          // For batched stats updates, empty body might be acceptable
          // Check if this is a stats-only update by looking at content-length
          if (contentLength && parseInt(contentLength) === 0) {
            body = {};
          } else {
            console.error('Error parsing JSON request body:', jsonError);
            return NextResponse.json({
              success: false,
              error: 'Bad Request',
              message: 'Invalid JSON in request body'
            }, { status: 400 });
          }
        }
      } else if (!contentType) {
        // No content-type header, assume empty body
        body = {};
      } else {
        return NextResponse.json({
          success: false,
          error: 'Bad Request',
          message: 'Content-Type must be application/json'
        }, { status: 400 });
      }
    } catch (error) {
      console.error('Error processing request body:', error);
      return NextResponse.json({
        success: false,
        error: 'Bad Request',
        message: 'Unable to process request body'
      }, { status: 400 });
    }

    // Handle different types of updates
    const { messageCountIncrement, bytesSentIncrement, bytesReceivedIncrement, connectionStatus, connectionError, lastConnectedAt, lastDisconnectedAt, isActive, ...configData } = body;

    // If this is just a stats update, handle it separately
    if ((messageCountIncrement || bytesSentIncrement || bytesReceivedIncrement) && Object.keys(configData).length === 0 && !isActive) {
      // Check if configuration exists before updating stats
      const existingConfig = await getMqttConfigById((await params).id);
      if (!existingConfig) {
        console.warn(`MQTT config with ID ${(await params).id} not found for stats update`);
        return NextResponse.json({
          success: false,
          error: 'MQTT configuration not found',
          message: 'Cannot update stats for non-existent MQTT configuration.'
        }, { status: 404 });
      }

      await incrementMessageStats(
        (await params).id,
        messageCountIncrement || 0,
        bytesSentIncrement || 0,
        bytesReceivedIncrement || 0
      );

      return NextResponse.json({
        success: true,
        message: 'MQTT stats updated successfully'
      });
    }

    // If this is just a status update, handle it separately
    if ((connectionStatus || connectionError || lastConnectedAt || lastDisconnectedAt) && Object.keys(configData).length === 0 && isActive === undefined) {
      // Check if configuration exists before updating status
      const existingConfig = await getMqttConfigById((await params).id);
      if (!existingConfig) {
        console.warn(`MQTT config with ID ${(await params).id} not found for status update`);
        return NextResponse.json({
          success: false,
          error: 'MQTT configuration not found',
          message: 'Cannot update status for non-existent MQTT configuration.'
        }, { status: 404 });
      }

      // Update connection status directly without validation
      const updateData: any = {};
      if (connectionStatus) updateData.connectionStatus = connectionStatus;
      if (connectionError !== undefined) updateData.connectionError = connectionError;
      if (lastConnectedAt) updateData.lastConnectedAt = new Date(lastConnectedAt);
      if (lastDisconnectedAt) updateData.lastDisconnectedAt = new Date(lastDisconnectedAt);
      updateData.updatedAt = new Date();

      await updateMqttConfig((await params).id, updateData);

      return NextResponse.json({
        success: true,
        message: 'MQTT status updated successfully'
      });
    }

    // If this is just an active status toggle, handle it separately
    if (isActive !== undefined && Object.keys(configData).length === 0 && !messageCountIncrement && !bytesSentIncrement && !bytesReceivedIncrement && !connectionStatus && connectionError === undefined && !lastConnectedAt && !lastDisconnectedAt) {
      // Check if configuration exists before toggling status
      const existingConfig = await getMqttConfigById((await params).id);
      if (!existingConfig) {
        console.warn(`MQTT config with ID ${(await params).id} not found for status toggle`);
        return NextResponse.json({
          success: false,
          error: 'MQTT configuration not found',
          message: 'Cannot toggle status for non-existent MQTT configuration.'
        }, { status: 404 });
      }

      // Toggle active status without validation - use the specialized functions
      if (isActive) {
        // Activate this broker (deactivates all others)
        const { activateMqttBroker } = await import('@/lib/mqtt-db-service');
        await activateMqttBroker((await params).id);
      } else {
        // Just deactivate this broker
        const { deactivateMqttBroker } = await import('@/lib/mqtt-db-service');
        await deactivateMqttBroker((await params).id);
      }

      return NextResponse.json({
        success: true,
        message: `MQTT broker ${isActive ? 'activated' : 'deactivated'} successfully`
      });
    }

    // For full configuration updates, validate
    const validation = validateMqttConfig(configData);
    if (!validation.isValid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: validation.errors
      }, { status: 400 });
    }

    // Check if configuration exists before updating
    const existingConfig = await getMqttConfigById((await params).id);
    if (!existingConfig) {
      console.warn(`MQTT config with ID ${(await params).id} not found for update`);
      return NextResponse.json({
        success: false,
        error: 'MQTT configuration not found',
        message: 'The MQTT configuration you are trying to update no longer exists. Please refresh the page and try again.'
      }, { status: 404 });
    }

    // Update configuration
    const config = await updateMqttConfig((await params).id, configData);

    return NextResponse.json({
      success: true,
      data: config,
      message: 'MQTT configuration updated successfully'
    });
  } catch (error) {
    console.error('Error updating MQTT config:', error);

    // Check if it's a Prisma P2025 error (record not found)
    if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
      return NextResponse.json({
        success: false,
        error: 'MQTT configuration not found',
        message: 'The MQTT configuration you are trying to update no longer exists. This may happen after a database reset. Please refresh the page and recreate your MQTT configurations.'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to update MQTT configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE /api/mqtt-config/[id] - Delete configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // No authentication required for MQTT config access

    // Check if configuration exists
    const existingConfig = await getMqttConfigById((await params).id);
    if (!existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'MQTT configuration not found'
      }, { status: 404 });
    }

    // Delete configuration
    await deleteMqttConfig((await params).id);

    return NextResponse.json({
      success: true,
      message: 'MQTT configuration deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting MQTT config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete MQTT configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
