import { NextResponse } from 'next/server';
import { loggers } from '@/lib/logger';
import { processMonitor } from '@/lib/system-stability';

export async function GET() {
  try {
    // Get detailed memory statistics
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const externalMB = Math.round(memUsage.external / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);

    // Calculate memory efficiency
    const heapEfficiency = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);

    // Get uptime
    const uptimeSeconds = Math.round(process.uptime());
    const uptimeFormatted = {
      seconds: uptimeSeconds,
      minutes: Math.round(uptimeSeconds / 60),
      hours: Math.round(uptimeSeconds / 3600),
      days: Math.round(uptimeSeconds / 86400)
    };

    // Memory health assessment
    const memoryHealth = {
      status: heapEfficiency > 85 ? 'critical' : heapEfficiency > 70 ? 'warning' : 'healthy',
      efficiency: heapEfficiency,
      recommendation: heapEfficiency > 85
        ? 'Immediate memory cleanup required'
        : heapEfficiency > 70
        ? 'Monitor memory usage closely'
        : 'Memory usage within normal range'
    };

    // Get system information
    const systemInfo = {
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      pid: process.pid,
      title: process.title
    };

    // Get process monitor status
    const monitorStatus = {
      memoryWarningThreshold: '600MB',
      memoryCriticalThreshold: '900MB',
      memoryEmergencyThreshold: '1200MB',
      monitoringInterval: '60 seconds',
      lastCleanupTime: 'tracked internally'
    };

    const memoryReport = {
      timestamp: new Date().toISOString(),
      memory: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        external: `${externalMB}MB`,
        rss: `${rssMB}MB`,
        heapEfficiency: `${heapEfficiency}%`
      },
      uptime: uptimeFormatted,
      health: memoryHealth,
      system: systemInfo,
      monitor: monitorStatus,
      recommendations: [
        heapEfficiency > 85 ? 'Consider restarting application to free memory' : null,
        heapEfficiency > 70 ? 'Monitor for memory leaks in application code' : null,
        'Consider implementing lazy loading for heavy components',
        'Review MQTT subscription cleanup',
        'Check for timer leaks in React components'
      ].filter(Boolean)
    };

    // Log memory report for monitoring
    loggers.service.info(`[MEMORY-REPORT] Heap: ${heapUsedMB}/${heapTotalMB}MB (${heapEfficiency}%)`);

    return NextResponse.json(memoryReport, {
      status: memoryHealth.status === 'critical' ? 503 : 200
    });

  } catch (error: any) {
    loggers.service.error('[MEMORY-REPORT] Failed to generate memory report:', error.message);

    return NextResponse.json({
      error: 'Failed to generate memory report',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Support POST for compatibility
export async function POST() {
  return GET();
}
