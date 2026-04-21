// lib/queue-manager.ts
import { Queue, Worker } from 'bullmq'
import Redis from 'ioredis'

// Redis connection configuration
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: false,
})

// Queue definitions
export const queues = {
  backup: new Queue('backup-queue', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 50,  // Keep last 50 completed jobs
      removeOnFail: 100,     // Keep last 100 failed jobs
      attempts: 3,           // Retry failed jobs 3 times
      backoff: {
        type: 'exponential',
        delay: 5000,         // 5 second initial delay
      },
    },
  }),

  alarm: new Queue('alarm-queue', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 2,
    },
  }),

  logging: new Queue('logging-queue', {
    connection: redisConnection,
    defaultJobOptions: {
      removeOnComplete: 20,
      removeOnFail: 10,
    },
  }),
}

// Note: QueueScheduler removed - not available in current BullMQ version
// Delayed jobs can be handled with job.delay() method instead

// Job data types
export interface BackupJobData {
  type: 'database' | 'filesystem' | 'full'
  userId: string
  config?: {
    includeData?: boolean
    compressionLevel?: number
    retentionDays?: number
  }
}

export interface AlarmJobData {
  type: 'check-thresholds' | 'send-notification' | 'escalate'
  deviceId: string
  alarmConfigId: string
  severity: 'critical' | 'major' | 'minor'
}

export interface LoggingJobData {
  type: 'aggregate-metrics' | 'cleanup-old-logs' | 'export-report'
  timeframe: 'hourly' | 'daily' | 'weekly'
  config?: Record<string, any>
}

// Job result types
export interface BackupJobResult {
  success: boolean
  filePath?: string
  fileSize?: number
  duration: number
  error?: string
}

export interface AlarmJobResult {
  success: boolean
  notificationsSent?: number
  actionsTaken?: string[]
  error?: string
}

export interface LoggingJobResult {
  success: boolean
  recordsProcessed?: number
  filesGenerated?: string[]
  error?: string
}

// Helper functions
export async function addBackupJob(data: BackupJobData) {
  return await queues.backup.add('process-backup', data, {
    priority: data.type === 'full' ? 10 : 5,
  })
}

export async function addAlarmJob(data: AlarmJobData, delay?: number) {
  const options: any = {
    priority: data.severity === 'critical' ? 10 : data.severity === 'major' ? 7 : 5,
  }

  if (delay) {
    options.delay = delay
  }

  return await queues.alarm.add('process-alarm', data, options)
}

export async function addLoggingJob(data: LoggingJobData, delay?: number) {
  const options: any = {
    priority: 3, // Lower priority for logging
  }

  if (delay) {
    options.delay = delay
  }

  return await queues.logging.add('process-logging', data, options)
}

// Queue status monitoring
export async function getQueueStats() {
  const [backupStats, alarmStats, loggingStats] = await Promise.all([
    queues.backup.getJobCounts(),
    queues.alarm.getJobCounts(),
    queues.logging.getJobCounts(),
  ])

  return {
    backup: backupStats,
    alarm: alarmStats,
    logging: loggingStats,
  }
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    queues.backup.close(),
    queues.alarm.close(),
    queues.logging.close(),
  ])

  await redisConnection.quit()
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('Shutting down queues...')
  await closeQueues()
  process.exit(0)
})

process.on('SIGINT', async () => {
  console.log('Shutting down queues...')
  await closeQueues()
  process.exit(0)
})
