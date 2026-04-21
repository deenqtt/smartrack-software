export interface BackupConfig {
  name: string;
  type: BackupType;
  retentionDays: number;
  schedule?: BackupSchedule;
  compress: boolean;
  encrypt: boolean;
  encryptionKey?: string;
}

export interface BackupResult {
  id: string;
  configId: string;
  type: BackupType;
  status: BackupStatus;
  size: number;
  path: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

export interface RetentionPolicy {
  type?: BackupType;
  days?: number;
  maxBackups?: number;
  compress?: boolean;
  // Professional GFS settings
  daily?: number;
  weekly?: number;
  monthly?: number;
  yearly?: number;
  keepMin?: number;
  maxTotalSizeGB?: number;
}

export enum BackupType {
  DATABASE = 'database'
}

export enum BackupStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}



export interface DatabaseBackupConfig extends BackupConfig {
  type: BackupType.DATABASE;
  includeWal: boolean;
  verifyIntegrity: boolean;
  destinationId?: string;
  backupStrategy?: "intelligent" | "always-full" | "always-incremental";
}



export interface BackupSchedule {
  id?: string;
  name: string;
  type: BackupType;
  frequency: BackupFrequency;  // DAILY, WEEKLY, MONTHLY, MANUAL, CUSTOM
  time: string;               // HH:MM format
  daysOfWeek?: number[];      // [0,1,2,3,4,5,6] for Sunday-Saturday
  daysOfMonth?: number[];     // [1,15,30] for specific dates
  customSchedule?: CustomScheduleConfig; // NEW: For CUSTOM frequency
  config: DatabaseBackupConfig;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt?: Date;
  updatedAt?: Date;

  // Professional features
  destinationId?: string;
  encrypt?: boolean;
  encryptionKey?: string;
  retentionPolicy?: any;
}

// ===== CUSTOM SCHEDULING CONFIGURATIONS =====

export interface CustomScheduleConfig {
  type: 'cron' | 'interval' | 'smart' | 'conditional';
  cronExpression?: string;                    // For 'cron' type
  interval?: {
    value: number;
    unit: 'minutes' | 'hours' | 'days';     // For 'interval' type
  };
  smartConfig?: SmartScheduleConfig;         // For 'smart' type
  conditions?: ScheduleCondition[];          // For 'conditional' type
}

export interface SmartScheduleConfig {
  // AI-powered scheduling based on system load and patterns
  optimizeFor: 'performance' | 'cost' | 'reliability' | 'balance';
  loadThresholds: {
    cpuPercent: number;
    memoryPercent: number;
    diskPercent: number;
  };
  peakHours: {
    start: string;    // HH:MM
    end: string;      // HH:MM
    timezone: string;
  };
  avoidWeekends: boolean;
  maxDailyBackups: number;
  learningPeriod: number; // days to learn patterns
}

export interface ScheduleCondition {
  type: 'system_load' | 'backup_success' | 'storage_available' | 'time_window' | 'custom_script';
  operator: 'lt' | 'gt' | 'eq' | 'between' | 'in' | 'not_in';
  value: any;
  andConditions?: ScheduleCondition[]; // For complex conditions
  orConditions?: ScheduleCondition[];
}

export enum BackupFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  MANUAL = 'manual',
  CUSTOM = 'custom'  // NEW: Custom scheduling
}

// ===== ADVANCED SCHEDULING FEATURES =====

export interface AdvancedBackupSchedule extends BackupSchedule {
  // Execution controls
  maxRuntime?: number; // Maximum runtime in minutes
  retryPolicy?: RetryPolicy;
  timeout?: number;    // Execution timeout in minutes

  // Resource management
  resourceLimits?: {
    maxCpuPercent?: number;
    maxMemoryPercent?: number;
    maxDiskPercent?: number;
    maxNetworkMbps?: number;
  };

  // Dependencies and relationships
  dependencies?: ScheduleDependency[];
  conflicts?: ScheduleConflict[];

  // Notifications and alerting
  notifications?: NotificationConfig;

  // Advanced options
  priority?: 'low' | 'normal' | 'high' | 'critical';
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface RetryPolicy {
  maxRetries: number;
  retryDelay: number; // minutes
  backoffStrategy: 'linear' | 'exponential' | 'fibonacci';
  retryOnFailureOnly: boolean;
}

export interface ScheduleDependency {
  type: 'schedule' | 'resource' | 'condition';
  dependsOn?: string; // Schedule ID for 'schedule' type
  condition?: {
    type: 'success' | 'failure' | 'completion';
    withinMinutes?: number;
  };
  blocking: boolean; // If true, dependent schedule won't run if dependency fails
}

export interface ScheduleConflict {
  type: 'resource' | 'time' | 'exclusive';
  conflictingSchedules: string[];
  resolutionStrategy: 'skip' | 'delay' | 'parallel' | 'cancel_older';
}

export interface NotificationConfig {
  onStart: boolean;
  onSuccess: boolean;
  onFailure: boolean;
  onTimeout: boolean;
  channels: {
    email?: string[];
    webhook?: string[];
    slack?: string[];
    sms?: string[];
  };
  templates?: {
    start?: string;
    success?: string;
    failure?: string;
  };
}

// ===== SCHEDULING INTELLIGENCE =====

export interface ScheduleIntelligence {
  // Pattern learning
  executionHistory: ExecutionPattern[];
  optimalTimes: OptimalTimeRecommendation[];
  failureAnalysis: FailurePattern[];

  // Performance metrics
  averageRuntime: number;
  successRate: number;
  resourceUsage: ResourceUsageStats;

  // Recommendations
  suggestions: ScheduleSuggestion[];
}

export interface ExecutionPattern {
  dayOfWeek: number;
  hour: number;
  averageRuntime: number;
  successRate: number;
  resourceUsage: ResourceUsageStats;
  frequency: number; // How often this pattern occurs
}

export interface OptimalTimeRecommendation {
  dayOfWeek: number;
  timeRange: {
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  confidence: number; // 0-100
  reasoning: string[];
}

export interface FailurePattern {
  timeRange: string;
  failureRate: number;
  commonErrors: string[];
  contributingFactors: string[];
  recommendations: string[];
}

export interface ResourceUsageStats {
  cpuAverage: number;
  memoryAverage: number;
  diskAverage: number;
  networkAverage: number;
  duration: number;
}

export interface ScheduleSuggestion {
  type: 'time_optimization' | 'resource_adjustment' | 'frequency_change' | 'dependency_addition';
  description: string;
  impact: {
    performance: number; // percentage improvement
    reliability: number;
    cost: number;
  };
  implementation: string;
  riskLevel: 'low' | 'medium' | 'high';
}

// ===== SCHEDULE MANAGEMENT =====

export interface ScheduleManagement {
  // CRUD operations
  createSchedule: (schedule: Omit<AdvancedBackupSchedule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AdvancedBackupSchedule>;
  updateSchedule: (id: string, updates: Partial<AdvancedBackupSchedule>) => Promise<AdvancedBackupSchedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  getSchedule: (id: string) => Promise<AdvancedBackupSchedule | null>;
  listSchedules: (filters?: ScheduleFilters) => Promise<AdvancedBackupSchedule[]>;

  // Advanced operations
  validateSchedule: (schedule: AdvancedBackupSchedule) => Promise<ValidationResult>;
  optimizeSchedule: (scheduleId: string) => Promise<ScheduleIntelligence>;
  simulateSchedule: (schedule: AdvancedBackupSchedule, days: number) => Promise<ScheduleSimulation>;

  // Bulk operations
  bulkEnable: (scheduleIds: string[]) => Promise<BulkOperationResult>;
  bulkDisable: (scheduleIds: string[]) => Promise<BulkOperationResult>;
  bulkDelete: (scheduleIds: string[]) => Promise<BulkOperationResult>;
}

export interface ScheduleFilters {
  enabled?: boolean;
  type?: BackupType;
  frequency?: BackupFrequency;
  tags?: string[];
  priority?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ScheduleSimulation {
  scheduleId: string;
  simulatedRuns: SimulatedExecution[];
  conflicts: ScheduleConflict[];
  resourceUtilization: ResourceUtilization[];
  summary: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    averageRuntime: number;
    peakResourceUsage: ResourceUsageStats;
  };
}

export interface SimulatedExecution {
  scheduledTime: Date;
  estimatedRuntime: number;
  estimatedResources: ResourceUsageStats;
  conflicts: string[];
  success: boolean;
  reason?: string;
}

export interface ResourceUtilization {
  timestamp: Date;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  networkMbps: number;
  activeSchedules: number;
}

export interface BulkOperationResult {
  successful: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
  summary: {
    total: number;
    successCount: number;
    failureCount: number;
  };
}

export interface SchedulerStats {
  totalSchedules: number;
  activeSchedules: number;
  runningCount: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

export interface ScheduleExecution {
  id: string;
  scheduleId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  result?: BackupResult;
  error?: string;
  logs: string[];
}

export interface GranularRestoreOptions {
  pointInTime?: Date;
  tables?: string[];
  columns?: { [tableName: string]: string[] };
  whereClause?: string;
  limit?: number;
  offset?: number;
  skipTableValidation?: boolean;
}

export interface RestoreValidation {
  canRestore: boolean;
  warnings: string[];
  errors: string[];
  schemaDiff?: {
    addedTables: string[];
    removedTables: string[];
    changedTables: string[];
    details: string[];
  };
  compatibility: {
    version: string;
    compatible: boolean;
  };
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  lastBackup?: Date;
  successRate: number;
  spaceUsed: number;
  spaceAvailable: number;
}

export interface RetentionCleanupResult {
  deletedCount: number;
  spaceFreed: number;
  errors: string[];
}
