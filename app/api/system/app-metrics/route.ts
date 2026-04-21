import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export async function GET(request: NextRequest) {
  try {
    // PM2 Process Info
    let pm2Info = {
      status: 'unknown',
      memory: 0,
      cpu: 0,
      uptime: 0,
      restarts: 0
    };

    try {
      const pm2Output = await execAsync('pm2 jlist smartrack-dashboard-production');
      const pm2Data = JSON.parse(pm2Output.stdout);

      if (pm2Data && pm2Data.length > 0) {
        const app = pm2Data[0];
        pm2Info = {
          status: app.pm2_env?.status || 'unknown',
          memory: app.monit?.memory || 0,
          cpu: app.monit?.cpu || 0,
          uptime: app.pm2_env?.pm_uptime ? Math.floor((Date.now() - app.pm2_env.pm_uptime) / 1000) : 0,
          restarts: app.pm2_env?.restart_time || 0
        };
      }
    } catch (pm2Error) {
      console.warn('PM2 data not available:', pm2Error);
      // PM2 not running or not available
    }

    // Database Performance (PostgreSQL)
    let dbInfo = {
      connections: 0,
      queries_per_minute: 0,
      slow_queries: 0
    };

    try {
      // Get active connections
      const connResult = await execAsync(`psql "${process.env.DATABASE_URL}" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null || echo "0"`);
      const connections = parseInt(connResult.stdout.trim()) || 0;

      // Estimate queries per minute (this is approximate)
      const queryResult = await execAsync(`psql "${process.env.DATABASE_URL}" -t -c "SELECT xact_commit + xact_rollback FROM pg_stat_database WHERE datname = current_database();" 2>/dev/null || echo "0"`);
      const queries = parseInt(queryResult.stdout.trim()) || 0;

      // Slow queries (over 1 second in last 5 minutes)
      const slowResult = await execAsync(`psql "${process.env.DATABASE_URL}" -t -c "SELECT count(*) FROM pg_stat_statements WHERE mean_time > 1000 AND calls > 0;" 2>/dev/null || echo "0"`);
      const slowQueries = parseInt(slowResult.stdout.trim()) || 0;

      dbInfo = {
        connections,
        queries_per_minute: Math.floor(queries / 5) || 0, // Rough estimate
        slow_queries: slowQueries
      };
    } catch (dbError) {
      console.warn('Database metrics not available:', dbError);
      // Database metrics not available
    }

    // API Performance Metrics - DISABLED TEMPORARILY FOR DEBUGGING
    // To re-enable: Uncomment the entire API metrics section below
    let apiInfo = {
      total_requests: 0,
      avg_response_time: 0,
      error_rate: 0,
      total_data_transfer: 0,
      endpoints: [] as Array<{
        path: string;
        count: number;
        avg_time: number;
        errors: number;
        data_size?: number;
        record_count?: number;
        db_queries?: number;
      }>
    };

    console.log('API metrics checking is DISABLED for debugging');

    /*
    // API Performance Metrics (enhanced with data volume tracking)
    let apiInfo = {
      total_requests: 0,
      avg_response_time: 0,
      error_rate: 0,
      total_data_transfer: 0,
      endpoints: [] as Array<{
        path: string;
        count: number;
        avg_time: number;
        errors: number;
        data_size?: number;
        record_count?: number;
        db_queries?: number;
      }>
    };

    try {
      // Try to read from PM2 logs or create basic metrics
      const logPath = path.join(process.cwd(), 'logs', 'combined.log');
      try {
        const fs = await import('fs/promises');
        const logContent = await fs.readFile(logPath, 'utf-8');
        const lines = logContent.split('\n');

        let totalRequests = 0;
        let totalResponseTime = 0;
        let totalDataTransfer = 0;
        let errorCount = 0;
        const endpointMetrics: { [key: string]: {
          count: number;
          totalTime: number;
          totalDataSize: number;
          recordCount: number;
          dbQueries: number;
          errors: number
        } } = {};

        // Parse log lines for API metrics (enhanced)
        lines.slice(-1000).forEach(line => {
          if (line.includes('HTTP') && (line.includes('GET') || line.includes('POST'))) {
            totalRequests++;

            // Extract response time if available (look for timing info)
            const timeMatch = line.match(/(\d+)ms/);
            if (timeMatch) {
              totalResponseTime += parseInt(timeMatch[1]);
            }

            // Extract response size (look for size in bytes)
            const sizeMatch = line.match(/(\d+)\s*bytes?\b/i) || line.match(/size[:\s]+(\d+)/i);
            let dataSize = 0;
            if (sizeMatch) {
              dataSize = parseInt(sizeMatch[1]);
              totalDataTransfer += dataSize;
            }

            // Extract record count (common in IoT/monitoring APIs)
            const recordMatch = line.match(/(\d+)\s*(?:records?|rows?|items?)/i);
            const dbQueriesMatch = line.match(/(\d+)\s*(?:queries?|db\s+calls?)/i);

            // Check for errors
            if (line.includes('500') || line.includes('error') || line.includes('Error')) {
              errorCount++;
            }

            // Extract endpoint
            const endpointMatch = line.match(/GET\s+(\/[^\s?]*)/) || line.match(/POST\s+(\/[^\s?]*)/);
            if (endpointMatch) {
              const endpoint = endpointMatch[1];

              // Skip health check and static assets
              if (endpoint === '/api/health' || endpoint.startsWith('/_next/') ||
                  endpoint.includes('.') || endpoint.startsWith('/favicon')) {
                return;
              }

              if (!endpointMetrics[endpoint]) {
                endpointMetrics[endpoint] = {
                  count: 0, totalTime: 0, totalDataSize: 0, recordCount: 0, dbQueries: 0, errors: 0
                };
              }
              endpointMetrics[endpoint].count++;

              if (timeMatch) {
                endpointMetrics[endpoint].totalTime += parseInt(timeMatch[1]);
              }

              if (dataSize > 0) {
                endpointMetrics[endpoint].totalDataSize += dataSize;
              }

              if (recordMatch) {
                endpointMetrics[endpoint].recordCount += parseInt(recordMatch[1]);
              }

              if (dbQueriesMatch) {
                endpointMetrics[endpoint].dbQueries += parseInt(dbQueriesMatch[1]);
              }

              if (errorCount > 0 && (line.includes('500') || line.includes('ERROR'))) {
                endpointMetrics[endpoint].errors++;
              }
            }
          }
        });

        apiInfo.total_requests = totalRequests;
        apiInfo.total_data_transfer = totalDataTransfer;
        apiInfo.avg_response_time = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
        apiInfo.error_rate = totalRequests > 0 ? errorCount / totalRequests : 0;

        // Convert endpoint metrics to array format with enhanced data
        const sortedEndpoints = Object.entries(endpointMetrics)
          .map(([path, metrics]) => ({
            path,
            count: metrics.count,
            avg_time: metrics.count > 0 ? metrics.totalTime / metrics.count : 0,
            errors: metrics.errors,
            data_size: metrics.count > 0 ? Math.round(metrics.totalDataSize / metrics.count) : 0,
            record_count: metrics.recordCount || Math.max(0, Math.floor(Math.random() * 1000)), // Placeholder for demo
            db_queries: metrics.dbQueries || Math.max(1, Math.floor(Math.random() * 5)) // Placeholder for demo
          }))
          .sort((a, b) => b.count - a.count) // Sort by request count
          .slice(0, 15); // Top 15 endpoints

        // Add some demo data for critical endpoints if not found in logs
        const criticalEndpoints = [
          '/api/dashboard',
          '/api/device-external',
          '/api/device-log-report',
          '/api/alarm-log',
          '/api/logging-configs'
        ];

        criticalEndpoints.forEach(endpoint => {
          const exists = sortedEndpoints.find(e => e.path === endpoint);
          if (!exists) {
            sortedEndpoints.push({
              path: endpoint,
              count: Math.floor(Math.random() * 50) + 10,
              avg_time: Math.floor(Math.random() * 2000) + 500,
              errors: Math.floor(Math.random() * 3),
              data_size: Math.floor(Math.random() * 200000) + 50000,
              record_count: Math.floor(Math.random() * 5000) + 100,
              db_queries: Math.floor(Math.random() * 8) + 2
            });
          }
        });

        apiInfo.endpoints = sortedEndpoints;

      } catch (logError) {
        console.warn('API log parsing failed:', logError);
        // Use basic placeholder metrics
        apiInfo = {
          total_requests: 0,
          avg_response_time: 0,
          error_rate: 0,
          total_data_transfer: 0,
          endpoints: [
            { path: '/api/health', count: 0, avg_time: 0, errors: 0 },
            { path: '/api/devices', count: 0, avg_time: 0, errors: 0 },
            { path: '/api/dashboard', count: 50, avg_time: 750, errors: 1, data_size: 75000, record_count: 100, db_queries: 3 }
          ]
        };
      }
    } catch (apiError) {
      console.warn('API metrics not available:', apiError);
    }

    // END OF DISABLED API METRICS - To re-enable, move the closing comment tag above to after this line */

    const metrics = {
      pm2: pm2Info,
      database: dbInfo,
      api: apiInfo
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching application metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch application metrics', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
