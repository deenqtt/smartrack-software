import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // Check if Docker is available
    const dockerCheck = await execAsync('docker --version').catch(() => null);
    if (!dockerCheck) {
      return NextResponse.json(
        { error: 'Docker is not available on this system' },
        { status: 503 }
      );
    }

    // Execute Docker commands to gather comprehensive metrics
    const [
      containersResult,
      imagesResult,
      volumesResult,
      networksResult,
      containerStatsResult
    ] = await Promise.allSettled([
      // Get container information
      execAsync("docker ps -a --format 'table {{.ID}}\\t{{.Image}}\\t{{.Status}}\\t{{.Names}}'"),
      // Get image information
      execAsync("docker images --format 'table {{.Repository}}\\t{{.Tag}}\\t{{.Size}}\\t{{.ID}}'"),
      // Get volume information
      execAsync("docker volume ls --format 'table {{.Name}}\\t{{.Driver}}'"),
      // Get network information
      execAsync("docker network ls --format 'table {{.ID}}\\t{{.Name}}\\t{{.Driver}}'"),
      // Get container health status
      execAsync("docker ps --format 'table {{.ID}}\\t{{.Status}}\\t{{.Names}}'")
    ]);

    // Parse container information
    let containers = {
      total: 0,
      running: 0,
      stopped: 0,
      paused: 0,
      healthy: 0,
      unhealthy: 0
    };

    if (containersResult.status === 'fulfilled') {
      const lines = containersResult.value.stdout.trim().split('\n').slice(1); // Skip header
      containers.total = lines.length;

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split(/\s{2,}/);
        if (parts.length >= 3) {
          const status = parts[2].toLowerCase();

          if (status.includes('up')) {
            containers.running++;
          } else if (status.includes('exited')) {
            containers.stopped++;
          } else if (status.includes('paused')) {
            containers.paused++;
          }

          // Check for health status
          if (status.includes('healthy')) {
            containers.healthy++;
          } else if (status.includes('unhealthy')) {
            containers.unhealthy++;
          } else if (status.includes('up') && !status.includes('unhealthy')) {
            // Assume running containers are healthy unless marked unhealthy
            containers.healthy++;
          }
        }
      }
    }

    // Parse image information
    let images = {
      total: 0,
      dangling: 0,
      size: 0
    };

    if (imagesResult.status === 'fulfilled') {
      const lines = imagesResult.value.stdout.trim().split('\n').slice(1); // Skip header
      images.total = lines.length;

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split(/\s{2,}/);
        if (parts.length >= 3) {
          const repo = parts[0];
          const tag = parts[1];
          const sizeStr = parts[2];

          // Count dangling images (<none> repository)
          if (repo === '<none>') {
            images.dangling++;
          }

          // Parse size (e.g., "123MB" -> 123 * 1024 * 1024)
          const sizeMatch = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(GB|MB|KB|B)?$/i);
          if (sizeMatch) {
            const [, size, unit] = sizeMatch;
            let bytes = parseFloat(size);

            switch (unit?.toUpperCase()) {
              case 'GB':
                bytes *= 1024 * 1024 * 1024;
                break;
              case 'MB':
                bytes *= 1024 * 1024;
                break;
              case 'KB':
                bytes *= 1024;
                break;
            }

            images.size += Math.round(bytes);
          }
        }
      }
    }

    // Parse volume information
    let volumes = {
      total: 0,
      used: 0
    };

    if (volumesResult.status === 'fulfilled') {
      const lines = volumesResult.value.stdout.trim().split('\n').slice(1); // Skip header
      volumes.total = lines.length;
      volumes.used = lines.length; // All listed volumes are considered "used"
    }

    // Parse network information
    let networks = {
      total: 0,
      active: 0
    };

    if (networksResult.status === 'fulfilled') {
      const lines = networksResult.value.stdout.trim().split('\n').slice(1); // Skip header
      networks.total = lines.length;

      // For simplicity, consider all networks as active
      // In a more complex setup, you might check which networks are actually in use
      networks.active = lines.length;
    }

    // Try to get Docker system info
    let dockerInfo = {};
    try {
      const infoResult = await execAsync('docker system info --format json');
      if (infoResult.stdout) {
        dockerInfo = JSON.parse(infoResult.stdout);
      }
    } catch (error) {
      // Docker info not critical, continue without it
    }

    const dockerMetrics = {
      containers,
      images,
      volumes,
      networks,
      system: dockerInfo,
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(dockerMetrics);
  } catch (error) {
    console.error('Error fetching Docker metrics:', error);

    // Return basic Docker metrics if full metrics fail
    const fallbackMetrics = {
      containers: {
        total: 0,
        running: 0,
        stopped: 0,
        paused: 0,
        healthy: 0,
        unhealthy: 0
      },
      images: {
        total: 0,
        dangling: 0,
        size: 0
      },
      volumes: {
        total: 0,
        used: 0
      },
      networks: {
        total: 0,
        active: 0
      },
      system: {},
      timestamp: new Date().toISOString(),
      error: 'Failed to fetch Docker metrics'
    };

    return NextResponse.json(fallbackMetrics, { status: 500 });
  }
}
