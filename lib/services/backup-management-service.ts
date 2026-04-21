// Unified Backup System Service
// Combines BackupManagementService and BackupScheduler into comprehensive backup system

import * as fs from "fs";
import * as path from "path";
import * as cron from "node-cron";
import { spawn, execSync } from "child_process";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { loggers } from "../logger";
import {
  format,
  formatDistance,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  isSameDay,
  isSameWeek,
  isSameMonth,
  isSameYear,
  subDays,
} from "date-fns";
import jsPDF from "jspdf";
import "jspdf-autotable";
import Papa from "papaparse";
import * as crypto from "crypto";

// Extend jsPDF to include autoTable
declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: any) => any;
  }
}

// ===== ERROR CLASSES =====

export class BackupError extends Error {
  public readonly code: string;
  public readonly originalError?: Error | undefined;

  constructor(message: string, code: string, originalError?: Error) {
    super(message);
    this.name = "BackupError";
    this.code = code;
    this.originalError = originalError;
  }
}

export class DatabaseConnectionError extends BackupError {
  constructor(message: string, originalError?: Error) {
    super(message, "DATABASE_CONNECTION_ERROR", originalError);
    this.name = "DatabaseConnectionError";
  }
}

export class EncryptionError extends BackupError {
  constructor(message: string, originalError?: Error) {
    super(message, "ENCRYPTION_ERROR", originalError);
    this.name = "EncryptionError";
  }
}

// ===== SCHEDULER TYPES =====
import type {
  BackupSchedule,
  ScheduleExecution,
  SchedulerStats,
  GranularRestoreOptions,
  RetentionPolicy,
} from "@/lib/types/backup";
import { BackupType, BackupFrequency } from "@/lib/types/backup";

// ===== BACKUP TYPES & INTERFACES =====

// Database Backup Configuration
export interface DatabaseBackupConfig {
  name?: string;
  includeUsers?: boolean;
  includePermissions?: boolean;
  compress?: boolean;
  compressionLevel?: number;
  encrypt?: boolean;
  destinationId?: string;
}

// Backup Info for Retention Analysis
export interface BackupInfo {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  created: Date;
  age: number; // days old
  backupType: "full" | "incremental" | "differential";
  businessCriticality: "high" | "medium" | "low";
  priority: number;
}

// Backup Result
export interface BackupResult {
  success: boolean;
  backupId: string;
  size: number;
  duration: number;
  message: string;
  filePath?: string;
  status: "completed" | "failed";
  metadata?: any;
}

// Restore Result
export interface RestoreResult {
  success: boolean;
  restoreId: string;
  duration: number;
  message: string;
}

// Retention Cleanup Result
export interface RetentionCleanupResult {
  deleted: number;
  freedSpace: number;
  message: string;
}

// Backup Statistics
export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  successRate: number;
  lastBackup: Date | null;
  oldestBackup: Date | null;
  newestBackup: Date | null;
  spaceUsed: number;
  spaceAvailable: number;
}

// Database Analysis
export interface DatabaseAnalysis {
  totalTables: number;
  totalRecords: number;
  totalSize: number;
  largestTables: Array<{
    table: string;
    records: number;
    size: number;
  }>;
  tableStats: Array<{
    tableName: string;
    rowCount: number;
    sizeBytes: number;
    lastModified: Date | undefined;
  }>;
  summary: {
    totalRows: number;
    totalSizeBytes: number;
    totalTables: number;
    databasePath: string;
    createdDate: Date | undefined;
    lastModified: Date | undefined;
  };
}

// ===== BACKUP REPORT TYPES =====

export interface BackupReport {
  id: string;
  title: string;
  type: "performance" | "trend" | "compliance" | "summary";
  period: {
    start: Date;
    end: Date;
    type: "weekly" | "monthly" | "quarterly" | "yearly";
  };
  data: {
    summary: {
      totalBackups: number;
      totalSize: number;
      successRate: number;
      avgBackupTime: number;
      compressionRatio: number;
    };
    performance: {
      largestBackup: { name: string; size: number; created: Date };
      fastestBackup: { name: string; time: number; created: Date };
      slowestBackup: { name: string; time: number; created: Date };
    };
    trends: {
      dailyBackups: Array<{ date: Date; count: number; size: number }>;
      weeklyGrowth: number;
      monthlyGrowth: number;
    };
    compliance: {
      retentionCompliance: number;
      encryptionStatus: boolean;
      lastBackupAge: number;
      backupFrequency: number;
    };
  };
  generatedAt: Date;
  generatedBy: string;
  format: "pdf" | "html";
}

export interface ExportOptions {
  tableName: string;
  format: "csv" | "json";
  whereClause?: string;
  limit?: number;
  offset?: number;
  columns?: string[];
}

export interface ExportResult {
  filename: string;
  data: string;
  mimeType: string;
}

// ===== MAIN BACKUP MANAGEMENT SERVICE =====

export class BackupManagementService {
  private static instance: BackupManagementService;
  private backupBaseDir: string;
  private reportDir: string;
  private offsiteDir: string;
  private initialized: boolean = false;
  private isDockerEnv: boolean = false;

  // Scheduler components
  private runningSchedules: Map<string, cron.ScheduledTask> = new Map();
  private runningExecutions: Map<string, ScheduleExecution> = new Map();
  private encryptionAlgorithm = "aes-256-cbc";
  private encryptionKey: Buffer;

  private constructor() {
    // Detect Docker environment
    this.isDockerEnv = this.isDockerEnvironment();

    // Set appropriate backup directory based on environment
    this.backupBaseDir = this.isDockerEnv
      ? "/app/backups"
      : process.env.BACKUP_PATH || path.join(process.cwd(), "backups");
    this.reportDir = path.join(this.backupBaseDir, "reports");

    // Define off-site backup directory (outside project root)
    this.offsiteDir = this.isDockerEnv
      ? "/app/offsite-backups"
      : path.join(process.cwd(), "..", "smartrack-offsite-backups");

    loggers.service.info(
      `Backup service initialized (${this.isDockerEnv ? "Docker" : "Native"})`,
    );

    // Initialize encryption key from environment or generate a stable one
    const secret =
      process.env.BACKUP_ENCRYPTION_SECRET ||
      "smartrack-default-secret-key-32-chars!!";
    this.encryptionKey = crypto.scryptSync(secret, "salt", 32);

    // Ensure directories exist
    this.ensureDirectories();
  }

  public static getInstance(): BackupManagementService {
    if (!BackupManagementService.instance) {
      BackupManagementService.instance = new BackupManagementService();
    }
    return BackupManagementService.instance;
  }

  /**
   * Detect if running in Docker environment
   */
  private isDockerEnvironment(): boolean {
    try {
      // Check for Docker environment indicators
      const isDocker =
        process.env.NODE_ENV === "production" &&
        (fs.existsSync("/.dockerenv") ||
          process.env.DOCKER_CONTAINER === "true");

      // Also check if we're running as nextjs user (Docker-specific)
      const isNextjsUser = process.getuid && process.getuid() === 1001; // nextjs user ID

      return isDocker || isNextjsUser || false;
    } catch (error) {
      // If any check fails, assume not Docker
      return false;
    }
  }

  private ensureDirectories(): void {
    try {
      const dirs = [this.backupBaseDir, this.reportDir, this.offsiteDir];
      dirs.forEach((dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });

          // In Docker environment, ensure proper permissions
          if (this.isDockerEnv) {
            try {
              // This would require running with appropriate permissions
              loggers.service.info(
                `Created backup directory: ${dir}`,
              );
            } catch (permError) {
              console.warn(
                `[Backup] Could not set permissions for ${dir}:`,
                permError,
              );
            }
          }
        }
      });
    } catch (error) {
      console.error("Failed to ensure backup directories exist:", error);
      throw new BackupError(
        `Failed to create backup directories: ${error instanceof Error ? error.message : "Unknown error"}`,
        "DIRECTORY_CREATION_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  // ===== BACKUP SERVICE FUNCTIONALITY =====

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initializing backup system service

    try {
      // Ensure backup directories exist
      this.ensureDirectories();

      // Test database connection with retry
      await this.testDatabaseConnectionWithRetry();

      // Initialize existing schedules
      await this.initializeExistingSchedules();

      this.initialized = true;
      // Removed initialization log for cleaner startup
    } catch (error) {
      loggers.service.error(
        "Failed to initialize backup system service:",
        error,
      );
      this.logError("Initialization failed", error);
      throw new BackupError(
        "Failed to initialize backup system service",
        "INITIALIZATION_ERROR",
        error instanceof Error ? error : undefined,
      );
    }
  }

  private async testDatabaseConnection(): Promise<void> {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      throw new DatabaseConnectionError(
        `Database connection test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Log error with structured format
   */
  private logError(context: string, error: unknown): void {
    const timestamp = new Date().toISOString();
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[${timestamp}] [Backup] Service Error in ${context}:`, {
      message: errorMessage,
      stack: errorStack,
      context,
    });

    // In production, you might want to send this to a logging service
    // logService.error('BACKUP_SERVICE_ERROR', { context, error: errorMessage, stack: errorStack });
  }

  /**
   * Test database connection with retry logic
   */
  private async testDatabaseConnectionWithRetry(
    maxRetries: number = 3,
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.testDatabaseConnection();
        // Removed database connection test log for cleaner startup
        return;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Unknown database error");
        console.warn(
          `[Backup] Database connection test failed (attempt ${attempt}/${maxRetries}):`,
          lastError.message,
        );

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.log(`[Backup] Retrying database connection in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new DatabaseConnectionError(
      `Database connection failed after ${maxRetries} attempts: ${lastError?.message || "Unknown error"}`,
      lastError,
    );
  }

  // ===== PARALLEL BACKUP PROCESSING =====

  /**
   * Enhanced backup with parallel processing, incremental backups, and smart compression
   */
  public async backupDatabase(
    config: DatabaseBackupConfig = {},
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const backupId = uuidv4();

    // Use backup name from config or generate default
    const backupName = config.name || "smartrack-database-backup";
    const cleanName = backupName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase();

    console.log(
      `[Backup] Starting Enhanced PostgreSQL database backup: ${cleanName} (${backupId})`,
    );
    console.log(
      `[Backup] Features: Parallel Processing, Smart Compression, Incremental Support`,
    );

    try {
      // Create backup directory with descriptive name
      const backupDate = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const backupDir = path.join(
        this.backupBaseDir,
        `${cleanName}-${backupDate}-${backupId.slice(0, 6)}`,
      );

      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Determine backup strategy (full or incremental)
      const backupStrategy = await this.determineBackupStrategy(config);
      console.log(`[Backup] Strategy: ${backupStrategy.type}`);

      let dumpResult: { size: number; path: string; metadata: any };

      if (backupStrategy.type === "incremental") {
        // Perform incremental backup
        dumpResult = await this.performIncrementalBackup(
          backupDir,
          backupStrategy,
          config,
        );
      } else {
        // Perform parallel full backup
        dumpResult = await this.performParallelFullBackup(backupDir, config);
      }

      const duration = Date.now() - startTime;

      // Handle Encryption
      let finalPath = dumpResult.path;
      let isEncrypted = false;
      if (config.encrypt) {
        const encryptedPath = `${dumpResult.path}.enc`;
        console.log(
          `[Backup] Encrypting backup: ${dumpResult.path} -> ${encryptedPath}`,
        );
        await this.encryptFile(dumpResult.path, encryptedPath);
        finalPath = encryptedPath;
        isEncrypted = true;
        // Optionally remove the unencrypted file
        // fs.unlinkSync(dumpResult.path);
      }

      // Cloud upload feature removed - only local backup supported

      const result: BackupResult = {
        success: true,
        backupId,
        size: dumpResult.size,
        duration,
        message: `PostgreSQL database backup completed successfully (${dumpResult.size} bytes in ${duration}ms, ${backupStrategy.type} strategy)${isEncrypted ? " [Encrypted]" : ""}`,
        filePath: finalPath,
        status: "completed",
        metadata: {
          ...dumpResult.metadata,
          encrypted: isEncrypted,
        },
      };

      console.log(result.message);
      console.log(
        `[Backup] Compression Ratio: ${dumpResult.metadata?.compressionRatio?.toFixed(2) || "N/A"
        }`,
      );
      console.log(
        `[Backup] Performance: ${(
          dumpResult.size /
          1024 /
          1024 /
          (duration / 1000)
        ).toFixed(2)} MB/s`,
      );

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = `PostgreSQL database backup failed: ${error instanceof Error ? error.message : "Unknown error"
        }`;

      if (loggers.service?.error) {
        loggers.service.error(message);
      } else {
        console.error(message);
      }

      return {
        success: false,
        backupId,
        size: 0,
        duration,
        message,
        status: "failed",
      };
    }
  }

  // ===== PARALLEL BACKUP PROCESSING IMPLEMENTATION =====

  /**
   * Determine backup strategy based on configuration and previous backups
   */
  private async determineBackupStrategy(config: DatabaseBackupConfig): Promise<{
    type: "full" | "incremental";
    baseBackupId?: string;
    lastBackupTime?: Date;
    changesDetected?: number;
  }> {
    try {
      // Check if incremental backups are enabled
      const incrementalEnabled = config.compress !== false; // Default true

      if (!incrementalEnabled) {
        console.log("[Backup] Incremental backups disabled, using full backup");
        return { type: "full" };
      }

      // Get database changes since last backup
      const changes = await this.detectDatabaseChanges();
      console.log(
        `[Backup] Detected ${changes.totalChanges} changes across ${changes.changedTables} tables`,
      );

      // If significant changes detected, use incremental backup
      if (changes.totalChanges > 100) {
        // Threshold for incremental backup
        const recentBackups = await this.getAvailableBackups(
          BackupType.DATABASE,
        );
        const lastBackup = recentBackups
          .filter((b) => b.size > 0)
          .filter(
            (b) => b.created > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          ) // Last 7 days
          .sort((a, b) => b.created.getTime() - a.created.getTime())[0];

        if (lastBackup) {
          console.log(
            `[Backup] Using incremental backup (detected ${changes.totalChanges} changes)`,
          );
          return {
            type: "incremental",
            baseBackupId: lastBackup.name,
            lastBackupTime: lastBackup.created,
            changesDetected: changes.totalChanges,
          };
        }
      }

      // Default to full backup
      console.log("[Backup] Using full backup strategy");
      return { type: "full" };
    } catch (error) {
      console.warn(
        "Could not determine backup strategy, defaulting to full:",
        error,
      );
      return { type: "full" };
    }
  }

  /**
   * Validate table name against a whitelist to prevent SQL injection
   */
  private async validateTableName(tableName: string): Promise<string> {
    const validTables = await this.getDatabaseTables();
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }
    return tableName;
  }

  /**
   * Detect database changes for incremental backup decision
   */
  private async detectDatabaseChanges(): Promise<{
    totalChanges: number;
    changedTables: number;
    details: Array<{ table: string; changes: number }>;
  }> {
    try {
      // Get all tables
      const allTables = await this.getDatabaseTables();
      let totalChanges = 0;
      let changedTablesCount = 0;
      const details: Array<{ table: string; changes: number }> = [];

      // Check last 24 hours for changes (reasonable window for incremental)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const tableName of allTables) {
        try {
          // Check if table has updatedAt column
          const hasUpdatedAt = await this.tableHasColumn(
            tableName,
            "updatedAt",
          );
          if (!hasUpdatedAt) continue;

          // Validate table name before unsafe query
          const safeTableName = await this.validateTableName(tableName);

          // Count recent changes
          const changesCount = (await prisma.$queryRawUnsafe(
            `SELECT COUNT(*) as count FROM "${safeTableName}" WHERE "updatedAt" > $1`,
            since,
          )) as Array<{ count: bigint }>;

          const count = Number(changesCount[0]?.count || 0);

          if (count > 0) {
            totalChanges += count;
            changedTablesCount++;
            details.push({ table: tableName, changes: count });
          }
        } catch (error) {
          // Skip tables that can't be analyzed
          continue;
        }
      }

      return {
        totalChanges,
        changedTables: changedTablesCount,
        details,
      };
    } catch (error) {
      console.warn("Failed to detect database changes:", error);
      return { totalChanges: 0, changedTables: 0, details: [] };
    }
  }

  /**
   * Check if table has specific column
   */
  private async tableHasColumn(
    tableName: string,
    columnName: string,
  ): Promise<boolean> {
    try {
      const safeTableName = await this.validateTableName(tableName);

      const result = (await prisma.$queryRawUnsafe(
        `SELECT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = $1 AND column_name = $2
        ) as has_column`,
        safeTableName,
        columnName,
      )) as Array<{ has_column: boolean }>;

      return result[0]?.has_column || false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Perform incremental backup (changes since last backup)
   */
  private async performIncrementalBackup(
    backupDir: string,
    strategy: any,
    config: DatabaseBackupConfig,
  ): Promise<{ size: number; path: string; metadata: any }> {
    console.log(
      `[Backup] Performing incremental backup since: ${strategy.lastBackupTime}`,
    );

    const backupPath = path.join(backupDir, "incremental-changes.sql");

    try {
      // Get database changes since last backup
      const changes = await this.getDatabaseChanges(strategy.lastBackupTime);

      if (changes.length === 0) {
        console.log(
          "[Backup] No changes detected, skipping incremental backup",
        );
        // Instead of creating empty file, return success with zero size
        // This will prevent invalid backup files from being created
        return {
          size: 0,
          path: backupPath, // Path exists but file won't be created
          metadata: {
            compressionRatio: 1,
            changesCount: 0,
            baseBackupId: strategy.baseBackupId,
            skipped: true, // Mark as skipped
          },
        };
      }

      // Create incremental backup with only changed data
      const { execSync } = require("child_process");

      // Parse DATABASE_URL
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL not set");

      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      // Create incremental dump focusing on recently changed tables
      const changedTables = [...new Set(changes.map((c) => c.table))];
      console.log(
        `[Backup] Backing up ${changedTables.length
        } changed tables: ${changedTables.join(", ")}`,
      );

      let pgDumpCmd = "pg_dump";

      // Add smart compression based on data type analysis
      const compressionLevel = await this.getOptimalCompression(changedTables);
      if (compressionLevel > 0) {
        pgDumpCmd += ` -Z ${compressionLevel}`;
      }

      pgDumpCmd += " -Fc"; // Custom format
      pgDumpCmd += ` -f "${backupPath}"`;
      pgDumpCmd += ` -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName}`;

      // Only dump changed tables
      changedTables.forEach((table) => {
        pgDumpCmd += ` -t "${table}"`;
      });

      const env = { ...process.env };
      if (dbPassword) env.PGPASSWORD = dbPassword;

      console.log(
        `Executing incremental dump: ${pgDumpCmd.replace(dbPassword, "***")}`,
      );

      // Async execution using spawn
      await new Promise<void>((resolve, reject) => {
        const args = [
          "-Fc",
          "-f",
          backupPath,
          "-h",
          dbHost,
          "-p",
          dbPort,
          "-U",
          dbUser,
          "-d",
          dbName,
        ];

        if (compressionLevel > 0) {
          args.push("-Z", String(compressionLevel));
        }

        // Add table arguments
        changedTables.forEach((table) => {
          args.push("-t", table);
        });

        const child = spawn("pg_dump", args, {
          env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pg_dump exited with code ${code}`));
        });

        child.on("error", (err) => reject(err));
      });

      const stats = fs.statSync(backupPath);

      return {
        size: stats.size,
        path: backupPath,
        metadata: {
          compressionRatio: await this.calculateActualCompressionRatio(
            stats.size,
            changes,
          ),
          changesCount: changes.length,
          changedTables: changedTables.length,
          baseBackupId: strategy.baseBackupId,
        },
      };
    } catch (error) {
      console.error("Incremental backup failed:", error);
      throw error;
    }
  }

  /**
   * Perform full database backup (single dump, not per-table)
   */
  private async performParallelFullBackup(
    backupDir: string,
    config: DatabaseBackupConfig,
  ): Promise<{ size: number; path: string; metadata: any }> {
    console.log(
      "[Backup] Performing FULL DATABASE backup (single dump approach)",
    );

    try {
      const finalBackupPath = path.join(backupDir, "database.backup");

      // Parse DATABASE_URL
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL not set");

      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      // Use full database dump without -t (table-specific) flag
      // This bypasses per-table permission issues
      let pgDumpCmd = `pg_dump -Fc -f "${finalBackupPath}"`;
      pgDumpCmd += ` -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName}`;

      // Add compression if configured
      if (config.compress !== false) {
        pgDumpCmd = pgDumpCmd.replace("pg_dump", `pg_dump -Z 6`);
      }

      const env = { ...process.env };
      if (dbPassword) env.PGPASSWORD = dbPassword;

      console.log(
        `[Backup] Executing full database dump: ${pgDumpCmd.replace(
          dbPassword,
          "***",
        )}`,
      );

      // Async execution using spawn
      await new Promise<void>((resolve, reject) => {
        const args = [
          "-Fc",
          "-f",
          finalBackupPath,
          "-h",
          dbHost,
          "-p",
          dbPort,
          "-U",
          dbUser,
          "-d",
          dbName,
        ];

        if (config.compress !== false) {
          args.push("-Z", "6");
        }

        const child = spawn("pg_dump", args, {
          env,
          stdio: ["ignore", "pipe", "pipe"],
        });

        child.on("close", (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pg_dump exited with code ${code}`));
        });

        child.on("error", (err) => reject(err));
      });

      // Get file size
      const stats = fs.statSync(finalBackupPath);

      console.log(
        `[Backup] Full database backup completed: ${this.formatBytes(stats.size)}`,
      );

      return {
        size: stats.size,
        path: finalBackupPath,
        metadata: {
          fullDatabaseDump: true,
          compressionRatio: 1, // Will be calculated by caller if needed
          tableCount: "all",
          parallelProcessed: false,
          singleDump: true,
        },
      };
    } catch (error) {
      console.error("Full database backup failed:", error);
      throw error;
    }
  }

  /**
   * Get database changes since timestamp for incremental backups
   */
  private async getDatabaseChanges(
    since: Date,
  ): Promise<Array<{ table: string; operation: string; recordId?: string }>> {
    try {
      // This is a simplified implementation
      // In a real scenario, you'd use PostgreSQL's logical replication or audit triggers

      const changes: Array<{
        table: string;
        operation: string;
        recordId?: string;
      }> = [];

      // Get recently modified tables (simplified approach)
      const tables = await this.getDatabaseTables();

      for (const table of tables) {
        try {
          const safeTableName = await this.validateTableName(table);

          // Check for recent updates (this is a basic implementation)
          const recentRecords = (await prisma.$queryRawUnsafe(
            `SELECT id FROM "${safeTableName}" WHERE "updatedAt" > $1 LIMIT 10`,
            since,
          )) as Array<{ id: string }>;

          if (recentRecords.length > 0) {
            changes.push({
              table,
              operation: "UPDATE",
              recordId: recentRecords[0].id,
            });
          }
        } catch (error) {
          // Skip tables that don't have expected columns
          continue;
        }
      }

      return changes;
    } catch (error) {
      console.warn("Could not determine database changes:", error);
      return [];
    }
  }

  /**
   * Get optimal compression level based on table data characteristics
   */
  private async getOptimalCompression(tables: string[]): Promise<number> {
    try {
      // Analyze data types in tables to determine optimal compression
      let textColumns = 0;
      let numericColumns = 0;

      for (const table of tables.slice(0, 3)) {
        // Sample first 3 tables
        try {
          const safeTable = await this.validateTableName(table);

          const columns = await prisma.$queryRawUnsafe<
            Array<{
              column_name: string;
              data_type: string;
            }>
          >(
            `SELECT column_name, data_type FROM information_schema.columns
             WHERE table_name = $1 AND table_schema = 'public'`,
            safeTable,
          );

          columns.forEach((col: { column_name: string; data_type: string }) => {
            if (["text", "varchar", "character"].includes(col.data_type)) {
              textColumns++;
            } else if (
              ["integer", "numeric", "real", "double precision"].includes(
                col.data_type,
              )
            ) {
              numericColumns++;
            }
          });
        } catch (error) {
          continue;
        }
      }

      const textRatio = textColumns / (textColumns + numericColumns || 1);

      // High compression for text-heavy data, lower for numeric data
      if (textRatio > 0.7) return 9; // Maximum compression for text
      if (textRatio > 0.4) return 6; // Balanced compression
      return 3; // Lower compression for numeric data
    } catch (error) {
      console.warn(
        "Could not determine optimal compression, using default:",
        error,
      );
      return 6; // Default compression level
    }
  }

  /**
   * Check if we can access a specific table
   */
  private async checkTableAccess(tableName: string): Promise<boolean> {
    try {
      const safeTableName = await this.validateTableName(tableName);

      // Try a simple SELECT query to check access
      await prisma.$queryRawUnsafe(`SELECT 1 FROM "${safeTableName}" LIMIT 1`);
      return true;
    } catch (error) {
      console.warn(
        `No access to table ${tableName}:`,
        error instanceof Error ? error.message : "Unknown error",
      );
      return false;
    }
  }

  /**
   * Get all database tables
   */
  private async getDatabaseTables(): Promise<string[]> {
    try {
      const result = await prisma.$queryRawUnsafe<
        Array<{ table_name: string }>
      >(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         ORDER BY table_name`,
      );
      return result.map((row: { table_name: string }) => row.table_name);
    } catch (error) {
      console.warn("Could not query tables, using fallback list");
      // Fallback list of common tables
      return [
        "User",
        "Tenant",
        "Device",
        "DeviceData",
        "Gateway",
        "ActivityLog",
        "AlarmLog",
        "Rule",
        "ControlAction",
        "BackupSchedule",
        "Location",
        "Floor",
        "Room",
      ];
    }
  }

  /**
   * Backup a single table with permission checking
   */
  private async backupSingleTable(
    tableName: string,
    backupDir: string,
    config: DatabaseBackupConfig,
  ): Promise<{ table: string; path: string; size: number }> {
    const tableBackupPath = path.join(backupDir, `${tableName}.backup`);

    try {
      // First check if we can access this table
      const hasAccess = await this.checkTableAccess(tableName);
      if (!hasAccess) {
        console.warn(
          `[Backup] Skipping table ${tableName}: insufficient permissions`,
        );
        // Return empty result instead of throwing error
        return {
          table: tableName,
          path: tableBackupPath,
          size: 0, // Mark as skipped
        };
      }

      const { execSync } = require("child_process");

      // Parse DATABASE_URL
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL not set");

      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      // Dump single table with custom format
      let pgDumpCmd = `pg_dump -Fc -t "${tableName}" -f "${tableBackupPath}"`;
      pgDumpCmd += ` -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName}`;

      // Add compression if configured
      if (config.compress !== false) {
        const compressionLevel = await this.getOptimalCompression([tableName]);
        pgDumpCmd = pgDumpCmd.replace(
          "pg_dump",
          `pg_dump -Z ${compressionLevel}`,
        );
      }

      const env = { ...process.env };
      if (dbPassword) env.PGPASSWORD = dbPassword;

      execSync(pgDumpCmd, { env, stdio: "pipe", timeout: 120000 }); // 2 min timeout per table

      const stats = fs.statSync(tableBackupPath);

      console.log(
        `[Backup] Backed up table ${tableName}: ${this.formatBytes(stats.size)}`,
      );
      return {
        table: tableName,
        path: tableBackupPath,
        size: stats.size,
      };
    } catch (error) {
      console.error(`[Backup] Failed to backup table ${tableName}:`, error);
      // Instead of throwing, return empty result to continue with other tables
      console.warn(
        `[Backup] Skipping table ${tableName} due to error, continuing with others...`,
      );
      return {
        table: tableName,
        path: tableBackupPath,
        size: 0, // Mark as failed/skipped
      };
    }
  }

  /**
   * Combine multiple table backups into a single archive
   */
  private async combineTableBackups(
    tableBackups: Array<{ table: string; path: string; size: number }>,
    finalPath: string,
  ): Promise<number> {
    try {
      const { execSync } = require("child_process");

      // Filter out failed/skipped backups (size = 0)
      const successfulBackups = tableBackups.filter(
        (backup) => backup.size > 0,
      );

      if (successfulBackups.length === 0) {
        console.warn(
          "No successful table backups to combine, creating empty archive",
        );
        // Create an empty tar file
        execSync(`touch "${finalPath}"`, { stdio: "pipe" });
        return 0;
      }

      // Create a tar archive containing only successful table backups
      const backupDir = path.dirname(finalPath);
      const backupFiles = successfulBackups
        .map((b) => path.basename(b.path))
        .join(" ");

      const tarCmd = `cd "${backupDir}" && tar -cf "${path.basename(
        finalPath,
      )}" ${backupFiles}`;

      execSync(tarCmd, { stdio: "pipe" });

      // Compress the tar archive
      const gzipCmd = `gzip "${finalPath}"`;
      execSync(gzipCmd, { stdio: "pipe" });

      // Get final compressed size
      const finalStats = fs.statSync(`${finalPath}.gz`);

      // Rename to final path
      fs.renameSync(`${finalPath}.gz`, finalPath);

      // Cleanup individual table files
      tableBackups.forEach((backup) => {
        try {
          if (fs.existsSync(backup.path)) {
            fs.unlinkSync(backup.path);
          }
        } catch (error) {
          console.warn(`Could not cleanup ${backup.path}:`, error);
        }
      });

      console.log(
        `[Backup] Combined ${successfulBackups.length} successful backups (${tableBackups.length - successfulBackups.length
        } skipped)`,
      );
      return finalStats.size;
    } catch (error) {
      console.error("Failed to combine table backups:", error);
      throw error;
    }
  }

  /**
   * Calculate actual compression ratio
   */
  private async calculateActualCompressionRatio(
    compressedSize: number,
    changes: any[],
  ): Promise<number> {
    // Estimate original size (rough calculation)
    const estimatedOriginalSize = changes.length * 1000; // 1KB per change estimate
    return estimatedOriginalSize / compressedSize;
  }

  /**
   * Calculate overall compression ratio for parallel backup
   */
  private async calculateOverallCompressionRatio(
    tableResults: Array<{ table: string; path: string; size: number }>,
  ): Promise<number> {
    // Estimate original database size (rough calculation)
    const estimatedDbSize = tableResults.length * 1000000; // 1MB per table estimate
    const totalCompressedSize = tableResults.reduce(
      (sum, result) => sum + result.size,
      0,
    );
    return estimatedDbSize / totalCompressedSize;
  }

  private async dumpPostgreSQLToFile(
    outputPath: string,
    config: DatabaseBackupConfig,
  ): Promise<{ size: number }> {
    try {
      const { execSync } = require("child_process");

      // Parse DATABASE_URL for connection parameters
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable not set");
      }

      // Parse the PostgreSQL connection URL
      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      // PostgreSQL pg_dump command with custom format for better compression
      let pgDumpCmd = "pg_dump";

      // Add compression if requested
      if (config.compress) {
        pgDumpCmd += " -Z 6"; // gzip compression level 6 (balance speed/size)
      }

      // Use custom format for compressed binary dumps
      pgDumpCmd += " -Fc";

      // Output to file
      pgDumpCmd += ` -f "${outputPath}"`;

      // Database connection parameters
      pgDumpCmd += ` -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName}`;

      // Set PGPASSWORD environment variable for password
      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

      console.log(
        `Executing PostgreSQL dump: ${pgDumpCmd.replace(dbPassword, "***")}`,
      );

      execSync(pgDumpCmd, {
        env,
        stdio: "pipe",
        timeout: 300000, // 5 minute timeout
      });

      // Get file size
      const stats = fs.statSync(outputPath);
      return { size: stats.size };
    } catch (error) {
      console.error("Failed to dump PostgreSQL database:", error);
      throw new Error(
        `PostgreSQL dump failed: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  public async restoreDatabase(backupPath: string): Promise<BackupResult> {
    const startTime = Date.now();
    const restoreId = uuidv4();

    console.log(`[Restore] Starting PostgreSQL database restore: ${restoreId}`);

    try {
      // Verify backup file exists
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      // Verify backup integrity
      await this.verifyBackupForRestore(backupPath);

      // Parse DATABASE_URL for connection parameters
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable not set");
      }

      // Parse the PostgreSQL connection URL
      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      // For PostgreSQL, we use a simpler approach:
      // 1. Terminate active connections to the database
      // 2. Drop all existing tables and restore from backup
      // This avoids the need for CREATE DATABASE permission

      console.log(` Preparing PostgreSQL restore for database: ${dbName}`);

      // Get backup file stats
      const backupStats = fs.statSync(backupPath);

      // Check backup file format to determine restore method
      const fd = fs.openSync(backupPath, "r");
      const header = Buffer.alloc(5);
      fs.readSync(fd, header, 0, 5, 0);
      fs.closeSync(fd);

      const isCustomFormat = header.toString("ascii", 0, 5) === "PGDMP";
      console.log(
        ` Backup format detected: ${isCustomFormat ? "Custom (compressed)" : "SQL dump"
        }`,
      );

      const { execSync } = require("child_process");
      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

      try {
        // Step 1: Disconnect current Prisma connections
        await prisma.$disconnect();

        // Step 2: Terminate active connections to the database (except our own)
        console.log(` Terminating active connections to ${dbName}...`);
        // We use psql to terminate other backends. This is necessary to drop the schema/database.
        const terminateCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -t -A -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`;
        try {
          execSync(terminateCmd, { env, stdio: "pipe" });
        } catch (error) {
          console.warn(
            "Could not terminate active connections, proceeding anyway",
          );
        }

        // Step 3: Clean slate - Drop and recreate public schema
        // This is much more reliable than dropping tables one by one
        console.log(
          ` Recreating public schema for a clean restore to ${dbName}...`,
        );
        const cleanSlateCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public; ALTER SCHEMA public OWNER TO ${dbUser}; GRANT ALL ON SCHEMA public TO ${dbUser}; GRANT ALL ON SCHEMA public TO public;"`;

        try {
          execSync(cleanSlateCmd, { env, stdio: "pipe" });
        } catch (error: any) {
          console.error(
            "[Backup] Failed to clear database schema:",
            error.message,
          );
          // Fallback to manual table drop if schema drop fails
          console.log("[Restore] Attempting manual table cleanup fallback...");
          const dropTablesSql = `
            DO $$ DECLARE
              r RECORD;
            BEGIN
              FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
              END LOOP;
            END $$;`;
          execSync(
            `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" -c "${dropTablesSql}"`,
            { env, stdio: "pipe" },
          );
        }

        // Step 4: Restore from backup
        console.log(` Restoring from backup...`);
        let restoreCmd: string;

        if (isCustomFormat) {
          // Use pg_restore for custom format
          restoreCmd = `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" "${backupPath}" --clean --if-exists --no-owner --no-privileges`;
        } else {
          // Use psql for SQL format
          restoreCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" -f "${backupPath}"`;
        }

        console.log(
          `Executing restore: ${restoreCmd.replace(dbPassword, "***")}`,
        );
        execSync(restoreCmd, {
          env,
          stdio: "pipe",
          timeout: 600000, // 10 minute timeout for large restores
        });

        // Step 5: Reconnect Prisma
        await this.reconnectToDatabase();

        const duration = Date.now() - startTime;
        const result: BackupResult = {
          success: true,
          backupId: restoreId,
          size: backupStats.size,
          duration,
          message: `PostgreSQL database restored successfully from ${backupPath} (${backupStats.size} bytes in ${duration}ms)`,
          filePath: backupPath,
          status: "completed",
        };

        console.log(result.message);
        return result;
      } catch (restoreError) {
        // Try to reconnect to original database even on failure
        await this.reconnectToDatabase();
        throw restoreError;
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = `PostgreSQL database restore failed: ${error instanceof Error ? error.message : "Unknown error"
        }`;

      if (loggers.service?.error) {
        loggers.service.error(message);
      } else {
        console.error(message);
      }

      return {
        success: false,
        backupId: restoreId,
        size: 0,
        duration,
        message,
        status: "failed",
      };
    }
  }

  /**
   * Perform granular database restore (specific tables, point-in-time, etc.)
   */
  public async performGranularRestore(
    backupPath: string,
    options: GranularRestoreOptions,
  ): Promise<BackupResult> {
    const startTime = Date.now();
    const restoreId = uuidv4();

    console.log(`[Restore] Starting GRANULAR PostgreSQL restore: ${restoreId}`);
    console.log(` Options:`, JSON.stringify(options));

    try {
      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupPath}`);
      }

      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) throw new Error("DATABASE_URL not set");

      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      const { execSync } = require("child_process");
      const env = { ...process.env };
      if (dbPassword) env.PGPASSWORD = dbPassword;

      // Disconnect Prisma
      await (prisma as any).$disconnect();

      let restoreCmd = "";

      // Determine restore command based on options
      if (options.tables && options.tables.length > 0) {
        console.log(
          ` Restoring specific tables: ${options.tables.join(", ")}`,
        );
        // We use pg_restore with -t for each table
        const tableFlags = options.tables.map((t) => `-t "${t}"`).join(" ");
        restoreCmd = `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" ${tableFlags} --clean --if-exists --no-owner --no-privileges "${backupPath}"`;
      } else {
        // Fallback to full restore if no specific tables provided but called granularly
        restoreCmd = `pg_restore -h ${dbHost} -p ${dbPort} -U ${dbUser} -d "${dbName}" --clean --if-exists --no-owner --no-privileges "${backupPath}"`;
      }

      console.log(
        `Executing granular restore: ${restoreCmd.replace(dbPassword, "***")}`,
      );
      execSync(restoreCmd, { env, stdio: "pipe", timeout: 600000 });

      // Reconnect Prisma
      await this.reconnectToDatabase();

      const duration = Date.now() - startTime;
      return {
        success: true,
        backupId: restoreId,
        size: fs.statSync(backupPath).size,
        duration,
        message: `Granular restore completed successfully`,
        status: "completed",
        metadata: { options },
      };
    } catch (error) {
      await this.reconnectToDatabase();
      const message = `Granular restore failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      console.error(message);
      return {
        success: false,
        backupId: restoreId,
        size: 0,
        duration: Date.now() - startTime,
        message,
        status: "failed",
      };
    }
  }

  /**
   * Get list of tables available in a backup file
   */
  public async getBackupTableList(backupPath: string): Promise<string[]> {
    try {
      if (!fs.existsSync(backupPath)) return [];

      const { execSync } = require("child_process");
      const listCmd = `pg_restore -l "${backupPath}"`;

      try {
        const output = execSync(listCmd, { encoding: "utf8", stdio: "pipe" });
        // Parse pg_restore -l output to find tables
        const tableLines = output
          .split("\n")
          .filter((line: string) => line.includes(" TABLE "));
        const tables = tableLines.map((line: string) => {
          const parts = line.trim().split(/\s+/);
          // Format usually: "123; 1234 12345 TABLE public tablename owner"
          const tableIdx = parts.indexOf("TABLE");
          if (tableIdx !== -1 && parts.length > tableIdx + 2) {
            return parts[tableIdx + 2]; // Name is after schema
          }
          return parts[parts.length - 2];
        });
        const uniqueTables: string[] = [...new Set(tables)]
          .filter((t): t is string => !!t)
          .sort();
        return uniqueTables;
      } catch (e) {
        console.warn(
          "Could not list backup tables using pg_restore, using DB tables as fallback",
        );
        return this.getDatabaseTables();
      }
    } catch (error) {
      console.error("Failed to get backup table list:", error);
      return [];
    }
  }

  // ===== SIMPLIFIED DATE-BASED RETENTION MANAGEMENT SYSTEM =====

  /**
   * Enhanced GFS (Grandfather-Father-Son) Retention Cleanup
   * Parses actual creation dates from backup folder names and applies tiered retention
   */
  public async cleanupBackups(
    policyInput: number | RetentionPolicy = 30,
  ): Promise<RetentionCleanupResult> {
    const policy: RetentionPolicy =
      typeof policyInput === "number" ? { daily: policyInput } : policyInput;

    const dailyRetention = policy.daily || policy.days || 30;
    const weeklyRetention = policy.weekly || 0;
    const monthlyRetention = policy.monthly || 0;
    const yearlyRetention = policy.yearly || 0;
    const minBackupsToKeep = policy.keepMin || 3;
    const maxTotalSizeGB = policy.maxTotalSizeGB || 100;

    console.log(
      "[Backup] Starting GFS (Grandfather-Father-Son) Retention Cleanup",
    );
    console.log(
      `[Backup] Policy: Daily=${dailyRetention}d, Weekly=${weeklyRetention}d, Monthly=${monthlyRetention}d, Yearly=${yearlyRetention}d`,
    );
    console.log(
      `[Backup] Safety: min ${minBackupsToKeep} backups, max ${maxTotalSizeGB}GB total size`,
    );
    console.log(
      `[Backup] Today's Date: ${new Date().toISOString().split("T")[0]}`,
    );

    const startTime = Date.now();
    const results = {
      deleted: 0,
      freedSpace: 0,
      errors: [] as string[],
      partialFailures: [] as string[],
      keptBackups: [] as BackupInfo[],
      deletedBackups: [] as BackupInfo[],
    };

    try {
      // 1. Get all available backups with parsed metadata from folder names
      console.log(
        "[Backup] Scanning backup directory and parsing folder names for dates...",
      );
      const allBackups = await this.getAvailableBackupsWithParsedDates();
      console.log(
        `[Backup] Found ${allBackups.length} backup files/folders with parsed dates`,
      );

      if (allBackups.length === 0) {
        return {
          deleted: 0,
          freedSpace: 0,
          message: "No backups found to clean up",
        };
      }

      // 2. Convert to BackupInfo format with parsed dates
      const backupInfos: BackupInfo[] = allBackups.map((backup: any) => ({
        name: backup.name,
        path: backup.path,
        type: backup.type,
        size: backup.size,
        created: backup.parsedDate || backup.created, // Use parsed date if available
        age: backup.daysOld,
        backupType: this.determineBackupType(backup.name, {
          size: backup.size,
        } as any),
        businessCriticality: this.determineBusinessCriticality(backup.name),
        priority: this.calculateBackupPriority(
          "full",
          "medium",
          backup.daysOld,
        ),
      }));

      // Sort by date descending (newest first)
      backupInfos.sort((a, b) => b.created.getTime() - a.created.getTime());

      const keepPaths = new Set<string>();

      // 3. Apply GFS Retention Selection

      // Tier 1: Daily (keep everything within dailyRetention)
      backupInfos.forEach((b) => {
        if (b.age <= dailyRetention) {
          keepPaths.add(b.path);
        }
      });

      // Tier 2: Weekly (keep latest backup of each week within weeklyRetention)
      if (weeklyRetention > 0) {
        const weeks = new Map<string, BackupInfo>();
        backupInfos.forEach((b) => {
          if (b.age <= weeklyRetention) {
            const weekKey = format(startOfWeek(b.created), "yyyy-ww");
            if (!weeks.has(weekKey)) {
              weeks.set(weekKey, b);
            }
          }
        });
        weeks.forEach((b) => keepPaths.add(b.path));
      }

      // Tier 3: Monthly (keep latest backup of each month within monthlyRetention)
      if (monthlyRetention > 0) {
        const months = new Map<string, BackupInfo>();
        backupInfos.forEach((b) => {
          if (b.age <= monthlyRetention) {
            const monthKey = format(b.created, "yyyy-MM");
            if (!months.has(monthKey)) {
              months.set(monthKey, b);
            }
          }
        });
        months.forEach((b) => keepPaths.add(b.path));
      }

      // Tier 4: Yearly (keep latest backup of each year within yearlyRetention)
      if (yearlyRetention > 0) {
        const years = new Map<string, BackupInfo>();
        backupInfos.forEach((b) => {
          if (b.age <= yearlyRetention) {
            const yearKey = format(b.created, "yyyy");
            if (!years.has(yearKey)) {
              years.set(yearKey, b);
            }
          }
        });
        years.forEach((b) => keepPaths.add(b.path));
      }

      let backupsToKeep = backupInfos.filter((b) => keepPaths.has(b.path));
      let backupsToDelete = backupInfos.filter((b) => !keepPaths.has(b.path));

      console.log(
        `🔍 Initial bucket selection: ${backupsToKeep.length} to keep, ${backupsToDelete.length} to delete`,
      );

      // 4. Apply safety measures
      console.log(`\n[Backup] Applying safety measures...`);

      // Safety 1: Ensure minimum backups are kept (regardless of age)
      if (backupsToKeep.length < minBackupsToKeep && backupInfos.length > 0) {
        console.log(
          `[Backup] Would keep only ${backupsToKeep.length} backups, minimum required: ${minBackupsToKeep}`,
        );

        // Keep the most recent ones up to minBackupsToKeep
        const emergencyKeep = backupInfos.slice(
          0,
          Math.min(minBackupsToKeep, backupInfos.length),
        );

        // Re-categorize
        backupsToKeep = emergencyKeep;
        backupsToDelete = backupInfos.filter(
          (b) => !emergencyKeep.some((k) => k.path === b.path),
        );

        console.log(
          `[Backup] Emergency override: keeping ${backupsToKeep.length} most recent backups`,
        );
      }

      // Safety 2: Apply size limits if needed
      const maxSizeBytes = maxTotalSizeGB * 1024 * 1024 * 1024;
      let totalSize = backupsToKeep.reduce((sum, b) => sum + b.size, 0);

      if (totalSize > maxSizeBytes) {
        console.log(
          `[Backup] Size limit exceeded (${this.formatBytes(totalSize)} > ${maxTotalSizeGB}GB)`,
        );

        // Sort kept backups by date (oldest first) and remove until under limit
        backupsToKeep.sort((a, b) => a.created.getTime() - b.created.getTime());

        const originalCount = backupsToKeep.length;
        while (
          totalSize > maxSizeBytes &&
          backupsToKeep.length > minBackupsToKeep
        ) {
          const removed = backupsToKeep.shift();
          if (removed) {
            backupsToDelete.push(removed);
            totalSize -= removed.size;
            console.log(`    Removed ${removed.name} to reduce size`);
          }
        }
        console.log(
          `[Backup] Size cleanup: removed ${originalCount - backupsToKeep.length} backups`,
        );
      }

      results.keptBackups = backupsToKeep;
      results.deletedBackups = backupsToDelete;

      console.log(`\n[Backup] GFS Cleanup Summary:`);
      console.log(`   [Keep] Backups to keep: ${backupsToKeep.length}`);
      console.log(`   [Delete] Backups to delete: ${backupsToDelete.length}`);
      console.log(
        `   [Space] Space to free: ${this.formatBytes(backupsToDelete.reduce((sum, b) => sum + b.size, 0))}`,
      );

      // 5. Execute cleanup with detailed logging
      if (backupsToDelete.length > 0) {
        console.log("\n Executing cleanup...");
        const cleanupResults =
          await this.executeBackupCleanupWithDetailedLogging(backupsToDelete);
        results.deleted = cleanupResults.deleted;
        results.freedSpace = cleanupResults.freedSpace;
        results.partialFailures = cleanupResults.partialFailures;
      }

      // 6. Generate summary report
      const duration = Date.now() - startTime;
      const report = `GFS Retention Cleanup completed in ${duration}ms. 
      Total Backups: ${backupInfos.length}
      Kept: ${backupsToKeep.length}
      Deleted: ${results.deleted}
      Space Freed: ${this.formatBytes(results.freedSpace)}
      Policy: Daily=${dailyRetention}d, Weekly=${weeklyRetention}d, Monthly=${monthlyRetention}d, Yearly=${yearlyRetention}d`;

      console.log(`\n[Backup] GFS Cleanup completed in ${duration}ms`);
      console.log(`   Deleted: ${results.deleted} backups`);
      console.log(`   Space freed: ${this.formatBytes(results.freedSpace)}`);

      if (results.partialFailures.length > 0) {
        console.warn(
          `[Backup] ${results.partialFailures.length} partial failures during cleanup`,
        );
      }

      return {
        deleted: results.deleted,
        freedSpace: results.freedSpace,
        message: report,
      };
    } catch (error) {
      const errorMsg = `GFS cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`;
      results.errors.push(errorMsg);
      console.error("[Backup] Cleanup failed:", error);

      return {
        deleted: results.deleted,
        freedSpace: results.freedSpace,
        message: `Partial GFS cleanup completed: ${results.deleted} deleted. Error: ${errorMsg}`,
      };
    }
  }

  /**
   * Get available backups with enhanced metadata parsing from folder names
   */
  private async getAvailableBackupsWithMetadata(): Promise<
    Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      size: number;
      created: Date;
    }>
  > {
    try {
      const backups: Array<{
        name: string;
        path: string;
        type: "file" | "directory";
        size: number;
        created: Date;
      }> = [];

      // List backup directories
      const items = fs.readdirSync(this.backupBaseDir);

      for (const item of items) {
        const itemPath = path.join(this.backupBaseDir, item);

        // Skip if not a directory
        try {
          const stats = fs.statSync(itemPath);
          if (!stats.isDirectory()) {
            continue;
          }
        } catch (statError) {
          console.log(`[Backup] Skip inaccessible item: ${item}`);
          continue;
        }

        // Parse creation date from folder name
        // Expected format: smartrack-database-backup-YYYY-MM-DD_HH-mm-ss-UUID
        let parsedDate: Date | null = null;

        try {
          // Extract date from folder name using regex
          const dateMatch = item.match(
            /(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/,
          );
          if (dateMatch) {
            const dateStr = dateMatch[1]; // YYYY-MM-DD
            const timeStr = dateMatch[2]; // HH-MM-SS
            const dateTimeStr = `${dateStr}T${timeStr.replace(/-/g, ":")}`;
            parsedDate = new Date(dateTimeStr);

            // Validate the parsed date
            if (isNaN(parsedDate.getTime())) {
              parsedDate = null;
            }
          }
        } catch (parseError) {
          console.warn(
            `[Backup] Could not parse date from folder name: ${item}`,
          );
          parsedDate = null;
        }

        // If we couldn't parse date from name, use file system date as fallback
        if (!parsedDate) {
          try {
            const stats = fs.statSync(itemPath);
            parsedDate = stats.mtime; // Use modification time as fallback
            // console.log(`[Backup] Using filesystem date for ${item}: ${parsedDate.toISOString()}`);
          } catch (statError) {
            console.warn(`[Backup] Could not get date for ${item}, skipping`);
            continue;
          }
        }

        // Find PostgreSQL backup file
        let sqlFile: string | undefined;
        let totalSize = 0;

        try {
          const files = fs.readdirSync(itemPath);

          // Look for common backup file patterns
          sqlFile = files.find(
            (file) =>
              (file.includes("database") ||
                file.includes(".sql") ||
                file.includes(".db") ||
                file.includes(".backup")) &&
              (file.endsWith(".sql") ||
                file.endsWith(".sql.gz") ||
                file.endsWith(".db") ||
                file.endsWith(".db.gz") ||
                file.endsWith(".backup")),
          );

          if (sqlFile) {
            const filePath = path.join(itemPath, sqlFile);
            try {
              const stats = fs.statSync(filePath);
              totalSize = stats.size;
            } catch (statError) {
              console.warn(`[Backup] Could not access backup file ${filePath}`);
              totalSize = 0;
            }
          } else {
            // Calculate directory size if no specific file found
            totalSize = this.getDirectorySize(itemPath);
          }
        } catch (readError) {
          console.warn(`[Backup] Could not read directory ${item}`);
          totalSize = this.getDirectorySize(itemPath);
        }

        if (totalSize > 0) {
          // Only include if we found actual backup content
          backups.push({
            name: item,
            path: sqlFile ? path.join(itemPath, sqlFile) : itemPath,
            type: sqlFile ? "file" : "directory",
            size: totalSize,
            created: parsedDate,
          });

          console.log(
            `📁 Found backup: ${item} (${this.formatBytes(totalSize)}) - Created: ${parsedDate.toISOString().split("T")[0]}`,
          );
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      console.error("Failed to get available backups with metadata:", error);
      return [];
    }
  }

  /**
   * Get available backups with parsed dates from folder names for retention cleanup
   */
  private async getAvailableBackupsWithParsedDates(): Promise<
    Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      size: number;
      created: Date;
      parsedDate: Date | null;
      daysOld: number;
    }>
  > {
    const parsedBackups: Array<{
      name: string;
      path: string;
      type: "file" | "directory";
      size: number;
      created: Date;
      parsedDate: Date | null;
      daysOld: number;
    }> = [];

    try {
      // List backup directories
      const items = fs.readdirSync(this.backupBaseDir);
      const now = new Date();

      for (const item of items) {
        const itemPath = path.join(this.backupBaseDir, item);

        // Skip if not a directory
        try {
          const stats = fs.statSync(itemPath);
          if (!stats.isDirectory()) {
            continue;
          }
        } catch (statError) {
          console.log(`[Backup] Skip inaccessible item: ${item}`);
          continue;
        }

        // Parse creation date from folder name
        // Expected format: smartrack-database-backup-YYYY-MM-DD_HH-mm-ss-UUID
        let parsedDate: Date | null = null;
        let daysOld = Infinity;

        try {
          // Extract date from folder name using regex
          const dateMatch = item.match(
            /(\d{4}-\d{2}-\d{2})_(\d{2}-\d{2}-\d{2})/,
          );
          if (dateMatch) {
            const dateStr = dateMatch[1]; // YYYY-MM-DD
            const timeStr = dateMatch[2]; // HH-MM-SS
            const dateTimeStr = `${dateStr}T${timeStr.replace(/-/g, ":")}`;
            parsedDate = new Date(dateTimeStr);

            // Validate the parsed date
            if (!isNaN(parsedDate.getTime())) {
              daysOld = Math.floor(
                (now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24),
              );
              // console.log(`[Backup] Parsed date from folder: ${item} -> ${parsedDate.toISOString()} (${daysOld} days old)`);
            } else {
              parsedDate = null;
            }
          }
        } catch (parseError) {
          console.warn(
            `[Backup] Could not parse date from folder name: ${item}`,
          );
          parsedDate = null;
        }

        // If we couldn't parse date from name, use file system date as fallback
        if (!parsedDate) {
          try {
            const stats = fs.statSync(itemPath);
            parsedDate = stats.mtime; // Use modification time as fallback
            daysOld = Math.floor(
              (now.getTime() - parsedDate.getTime()) / (1000 * 60 * 60 * 24),
            );
            // console.log(`[Backup] Using filesystem fallback date for ${item}: ${parsedDate.toISOString()} (${daysOld} days old)`);
          } catch (statError) {
            console.warn(`[Backup] Could not get date for ${item}, skipping`);
            continue;
          }
        }

        // Find PostgreSQL backup file
        let sqlFile: string | undefined;
        let totalSize = 0;

        try {
          const files = fs.readdirSync(itemPath);

          // Look for common backup file patterns
          sqlFile = files.find(
            (file) =>
              (file.includes("database") ||
                file.includes(".sql") ||
                file.includes(".db") ||
                file.includes(".backup")) &&
              (file.endsWith(".sql") ||
                file.endsWith(".sql.gz") ||
                file.endsWith(".db") ||
                file.endsWith(".db.gz") ||
                file.endsWith(".backup")),
          );

          if (sqlFile) {
            const filePath = path.join(itemPath, sqlFile);
            try {
              const stats = fs.statSync(filePath);
              totalSize = stats.size;
            } catch (statError) {
              console.warn(`[Backup] Could not access backup file ${filePath}`);
              totalSize = 0;
            }
          } else {
            // Calculate directory size if no specific file found
            totalSize = this.getDirectorySize(itemPath);
          }
        } catch (readError) {
          console.warn(`[Backup] Could not read directory ${item}`);
          totalSize = this.getDirectorySize(itemPath);
        }

        if (totalSize > 0) {
          // Only include if we found actual backup content
          parsedBackups.push({
            name: item,
            path: sqlFile ? path.join(itemPath, sqlFile) : itemPath,
            type: sqlFile ? "file" : "directory",
            size: totalSize,
            created: parsedDate,
            parsedDate: parsedDate,
            daysOld: daysOld,
          });
        }
      }

      // Sort by creation date (newest first)
      parsedBackups.sort((a, b) => b.created.getTime() - a.created.getTime());

      console.log(
        `[Backup] Found ${parsedBackups.length} backups with parsed dates for retention analysis`,
      );
      return parsedBackups;
    } catch (error) {
      console.error(
        "Failed to get available backups with parsed dates:",
        error,
      );
      return [];
    }
  }

  /**
   * Execute backup cleanup with detailed logging
   */
  private async executeBackupCleanupWithDetailedLogging(
    backupsToDelete: BackupInfo[],
  ): Promise<{
    deleted: number;
    freedSpace: number;
    partialFailures: string[];
  }> {
    const results = {
      deleted: 0,
      freedSpace: 0,
      partialFailures: [] as string[],
    };

    console.log(` Starting cleanup of ${backupsToDelete.length} backups...`);

    for (const backup of backupsToDelete) {
      try {
        console.log(
          `    Deleting: ${backup.name} (${this.formatBytes(backup.size)})`,
        );

        const deletedSize = await this.safeDeleteBackup(backup);
        results.deleted++;
        results.freedSpace += deletedSize;

        console.log(
          `   [Backup] Deleted: ${backup.name} - Freed ${this.formatBytes(deletedSize)}`,
        );

        // Small delay to prevent overwhelming the filesystem
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        const errorMsg = `${backup.name}: ${error instanceof Error ? error.message : "Unknown error"}`;
        results.partialFailures.push(errorMsg);
        console.error(`   [Backup] Failed to delete ${backup.name}:`, error);
      }
    }

    console.log(
      ` Cleanup completed: ${results.deleted} deleted, ${results.partialFailures.length} failures`,
    );

    return results;
  }

  /**
   * Generate detailed date-based cleanup report
   */
  private generateDetailedDateBasedCleanupReport(
    results: any,
    retentionDays: number,
    duration: number,
  ): string {
    const messages = [
      `Date-Based Retention Cleanup Report`,
      `====================================`,
      `Retention Period: ${retentionDays} days`,
      `Execution Time: ${duration}ms`,
      ``,
      `Summary:`,
      `--------`,
      `Total backups analyzed: ${results.keptBackups.length + results.deletedBackups.length}`,
      `Backups kept: ${results.keptBackups.length}`,
      `Backups deleted: ${results.deleted}`,
      `Space freed: ${this.formatBytes(results.freedSpace)}`,
      ``,
    ];

    if (results.deletedBackups.length > 0) {
      messages.push(`Deleted Backups:`, `----------------`);
      results.deletedBackups.forEach((backup: BackupInfo) => {
        const daysOld = Math.floor(
          (Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24),
        );
        messages.push(
          `• ${backup.name} (${daysOld} days old, ${this.formatBytes(backup.size)})`,
        );
      });
      messages.push(``);
    }

    if (results.keptBackups.length > 0) {
      messages.push(`Kept Backups:`, `-------------`);
      results.keptBackups.slice(0, 10).forEach((backup: BackupInfo) => {
        const daysOld = Math.floor(
          (Date.now() - backup.created.getTime()) / (1000 * 60 * 60 * 24),
        );
        messages.push(
          `• ${backup.name} (${daysOld} days old, ${this.formatBytes(backup.size)})`,
        );
      });
      if (results.keptBackups.length > 10) {
        messages.push(`... and ${results.keptBackups.length - 10} more`);
      }
      messages.push(``);
    }

    if (results.partialFailures.length > 0) {
      messages.push(`Partial Failures:`, `-----------------`);
      results.partialFailures.forEach((failure: string) => {
        messages.push(`• ${failure}`);
      });
      messages.push(``);
    }

    if (results.errors.length > 0) {
      messages.push(`Errors:`, `-------`);
      results.errors.forEach((error: string) => {
        messages.push(`• ${error}`);
      });
      messages.push(``);
    }

    messages.push(`Report generated: ${new Date().toISOString()}`);

    return messages.join(`\n`);
  }

  /**
   * Determine backup type and characteristics
   */
  private determineBackupType(
    name: string,
    stats: fs.Stats,
  ): "full" | "incremental" | "differential" {
    if (name.includes("incremental") || name.includes("changes")) {
      return "incremental";
    }
    if (name.includes("differential")) {
      return "differential";
    }
    return "full"; // Default assumption
  }

  /**
   * Determine business criticality based on backup name/content
   */
  private determineBusinessCriticality(
    name: string,
  ): "high" | "medium" | "low" {
    // High priority patterns
    if (
      name.includes("critical") ||
      name.includes("production") ||
      name.includes("master")
    ) {
      return "high";
    }

    // Medium priority patterns
    if (
      name.includes("weekly") ||
      name.includes("monthly") ||
      name.includes("important")
    ) {
      return "medium";
    }

    return "low"; // Default
  }

  /**
   * Calculate backup priority score
   */
  private calculateBackupPriority(
    type: string,
    criticality: string,
    age: number,
  ): number {
    let score = 0;

    // Type priority
    if (type === "full") score += 100;
    else if (type === "incremental") score += 50;
    else if (type === "differential") score += 75;

    // Criticality priority
    if (criticality === "high") score += 50;
    else if (criticality === "medium") score += 25;

    // Age penalty (newer is better, but not too new)
    const agePenalty = Math.abs(age - 7) * 2; // Optimal age around 7 days
    score -= Math.min(agePenalty, 50);

    return Math.max(score, 0);
  }

  /**
   * Safely delete backup with retry mechanism
   */
  private async safeDeleteBackup(backup: BackupInfo): Promise<number> {
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        let deletedSize = 0;

        if (backup.type === "directory") {
          const dirSize = this.getDirectorySize(backup.path);

          if (backup.age >= 7) {
            // Move directory to off-site
            const targetPath = path.join(this.offsiteDir, backup.name);
            console.log(`[Backup Offsite] Moving old backup directory to: ${targetPath}`);
            fs.renameSync(backup.path, targetPath);
          } else {
            // Delete directory recursively
            fs.rmSync(backup.path, { recursive: true, force: true });
          }

          deletedSize = dirSize;
        } else {
          const fileSize = fs.statSync(backup.path).size;

          if (backup.age >= 7) {
            // Move file to off-site
            const targetPath = path.join(this.offsiteDir, backup.name);
            console.log(`[Backup Offsite] Moving old backup file to: ${targetPath}`);
            fs.renameSync(backup.path, targetPath);
          } else {
            // Delete single file
            fs.unlinkSync(backup.path);
          }

          deletedSize = fileSize;
        }

        return deletedSize;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000),
        );
      }
    }

    throw new Error("Max retries exceeded");
  }

  public async getAvailableBackups(
    type: BackupType = BackupType.DATABASE,
  ): Promise<
    Array<{
      name: string;
      path: string;
      size: number;
      created: Date;
      type: BackupType;
    }>
  > {
    try {
      const backups: Array<{
        name: string;
        path: string;
        size: number;
        created: Date;
        type: BackupType;
      }> = [];

      // List backup directories
      const items = fs.readdirSync(this.backupBaseDir);

      for (const item of items) {
        const itemPath = path.join(this.backupBaseDir, item);

        // Skip if not a directory
        try {
          const stats = fs.statSync(itemPath);
          if (!stats.isDirectory()) {
            continue;
          }
        } catch (statError) {
          // Skip items that can't be accessed or don't exist
          console.log(`[Backup] Skip inaccessible item: ${item}`);
          continue;
        }

        // Support multiple backup naming patterns:
        // - Legacy: backup-YYYY-MM-DD_HH-mm-ss-UUID
        // - Custom: smartrack-database-backup-YYYY-MM-DD_HH-mm-ss-UUID (or similar custom names)
        /*
        const isBackupDirectory =
          item.startsWith("backup-") ||
          item.includes("-backup-") ||
          item.startsWith("smartrack-database-");

        if (!isBackupDirectory) {
          continue;
        }
        */

        // Find PostgreSQL backup file (SQL dump) or other database files
        let sqlFile: string | undefined;
        try {
          const files = fs.readdirSync(itemPath);

          // Look for common backup file patterns
          sqlFile = files.find(
            (file) =>
              (file.includes("database") ||
                file.includes(".sql") ||
                file.includes(".db") ||
                file.includes(".backup")) &&
              (file.endsWith(".sql") ||
                file.endsWith(".sql.gz") ||
                file.endsWith(".db") ||
                file.endsWith(".db.gz") ||
                file.endsWith(".backup")),
          );
        } catch (readError) {
          console.warn(
            `[Backup] Could not read directory ${item}:`,
            readError instanceof Error ? readError.message : "Unknown",
          );
          continue;
        }

        if (sqlFile) {
          const filePath = path.join(itemPath, sqlFile);
          try {
            const stats = fs.statSync(filePath);

            backups.push({
              name: item,
              path: filePath,
              size: stats.size,
              created: stats.mtime,
              type: type,
            });
          } catch (statError) {
            console.warn(
              `[Backup] Could not access backup file ${filePath}:`,
              statError instanceof Error ? statError.message : "Unknown",
            );
          }
        } else {
          console.log(`[Backup] No database file found in ${item}`);
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created.getTime() - a.created.getTime());

      return backups;
    } catch (error) {
      console.error("Failed to get available backups:", error);
      return [];
    }
  }

  public async verifyBackupForRestore(backupPath: string): Promise<{
    valid: boolean;
    schemaVersion?: string | undefined;
    tablesCount?: number | undefined;
    recordsCount?: number | undefined;
  }> {
    try {
      console.log(`🔍 Verifying backup file: ${backupPath}`);

      // Check if file exists
      if (!fs.existsSync(backupPath)) {
        console.log(`[Backup] Backup file not found: ${backupPath}`);
        return {
          valid: false,
          schemaVersion: undefined,
          tablesCount: undefined,
          recordsCount: undefined,
        };
      }

      // Check file size is reasonable (> 0 bytes)
      const stats = fs.statSync(backupPath);
      if (stats.size === 0) {
        console.log(`[Backup] Backup file is empty: ${backupPath}`);
        return {
          valid: false,
          schemaVersion: undefined,
          tablesCount: undefined,
          recordsCount: undefined,
        };
      }

      console.log(`[Backup] Backup file size: ${this.formatBytes(stats.size)}`);

      // Check if it's a valid dump file by checking the first few bytes
      const fd = fs.openSync(backupPath, "r");
      const buffer = Buffer.alloc(100);
      fs.readSync(fd, buffer, 0, 100, 0);
      fs.closeSync(fd);

      // PostgreSQL custom format dump files start with 'PGDMP' signature (for -Fc format)
      // Plain SQL files would be text
      const isCustomFormat = buffer.toString("ascii", 0, 5) === "PGDMP";
      const isSqlFormat = buffer
        .toString("utf8", 0, 50)
        .includes("-- PostgreSQL database dump");

      if (!isCustomFormat && !isSqlFormat) {
        console.log(
          `[Backup] Backup file format not recognized: ${backupPath}`,
        );
        console.log(
          `   Expected: 'PGDMP' signature or '-- PostgreSQL database dump'`,
        );
        console.log(`   Found: '${buffer.toString("ascii", 0, 10)}...'`);
        return {
          valid: false,
          schemaVersion: undefined,
          tablesCount: undefined,
          recordsCount: undefined,
        };
      }

      console.log(
        `[Backup] Backup file validation successful (${isCustomFormat ? "custom format" : "SQL format"})`,
      );

      return {
        valid: true,
        schemaVersion: "PostgreSQL",
        tablesCount: undefined, // Would require parsing the dump to count tables
        recordsCount: undefined, // Would require parsing the dump to count records
      };
    } catch (error) {
      console.error("[Backup] Verification failed:", error);
      console.error(
        "   Error details:",
        error instanceof Error ? error.message : "Unknown error",
      );

      // Always return a valid object structure, never undefined
      return {
        valid: false,
        schemaVersion: undefined,
        tablesCount: undefined,
        recordsCount: undefined,
      };
    }
  }

  public async getDatabaseAnalysis(): Promise<DatabaseAnalysis> {
    try {
      console.log(
        "[Backup] Analyzing database structure with optimized queries...",
      );

      // 1. Get all tables and their sizes from pg_stat
      const dbStats = (await prisma.$queryRaw`
        SELECT 
          relname as "tableName",
          pg_total_relation_size(relid) as "sizeBytes"
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY pg_total_relation_size(relid) DESC
      `) as any[];

      const tableStats = await Promise.all(dbStats.map(async (s) => {
        let exactCount = 0;
        try {
          // Attempt exact row count for synchronization
          const safeTableName = await this.validateTableName(s.tableName);
          const countRes = (await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM "${safeTableName}"`)) as any[];
          exactCount = Number(countRes[0]?.count || 0);
        } catch (e) {
          // Fallback handled silently
        }

        return {
          tableName: s.tableName,
          rowCount: exactCount,
          sizeBytes: Number(s.sizeBytes),
          lastModified: undefined as Date | undefined,
        };
      }));

      // 2. Get last modification times (best effort via updatedAt column if exists)
      for (const stat of tableStats) {
        try {
          const hasUpdatedAt = await this.tableHasColumn(
            stat.tableName,
            "updatedAt",
          );
          if (hasUpdatedAt) {
            const safeTableName = await this.validateTableName(stat.tableName);
            const lastMod = (await prisma.$queryRawUnsafe(
              `SELECT MAX("updatedAt") as last_mod FROM "${safeTableName}"`,
            )) as any[];
            stat.lastModified = lastMod[0]?.last_mod || undefined;
          }
        } catch (e) {
          // Ignore errors for individual tables
        }
      }

      const totalRecords = tableStats.reduce((sum, s) => sum + s.rowCount, 0);
      const totalSize = tableStats.reduce((sum, s) => sum + s.sizeBytes, 0);

      // 3. Summarize
      const largestTables = tableStats.slice(0, 5).map((s) => ({
        table: s.tableName,
        records: s.rowCount,
        size: s.sizeBytes,
      }));

      return {
        totalTables: tableStats.length,
        totalRecords,
        totalSize,
        largestTables,
        tableStats,
        summary: {
          totalRows: totalRecords,
          totalSizeBytes: totalSize,
          totalTables: tableStats.length,
          databasePath: "PostgreSQL Database",
          createdDate: undefined,
          lastModified: tableStats.reduce(
            (latest, s) =>
              s.lastModified && (!latest || s.lastModified > latest)
                ? s.lastModified
                : latest,
            undefined as Date | undefined,
          ),
        },
      };
    } catch (error) {
      console.error("[Backup] Database analysis failed:", error);
      throw error;
    }
  }

  public async getBackupStats(): Promise<BackupStats> {
    try {
      const backups = await this.getAvailableBackups();

      if (backups.length === 0) {
        return {
          totalBackups: 0,
          totalSize: 0,
          successRate: 0,
          lastBackup: null,
          oldestBackup: null,
          newestBackup: null,
          spaceUsed: 0,
          spaceAvailable: 10 * 1024 * 1024 * 1024, // 10 GB default
        };
      }

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
      const successRate = 100; // Assuming all listed backups are successful

      // Date ranges
      const sortedBackups = backups.sort(
        (a, b) => a.created.getTime() - b.created.getTime(),
      );
      const oldestBackup = sortedBackups[0].created;
      const newestBackup = sortedBackups[sortedBackups.length - 1].created;

      return {
        totalBackups: backups.length,
        totalSize,
        successRate,
        lastBackup: newestBackup,
        oldestBackup,
        newestBackup,
        spaceUsed: totalSize,
        spaceAvailable: 10 * 1024 * 1024 * 1024, // Assuming 10GB for now or handle appropriately
      };
    } catch (error) {
      console.error("Failed to get backup stats:", error);
      return {
        totalBackups: 0,
        totalSize: 0,
        successRate: 0,
        lastBackup: null,
        oldestBackup: null,
        newestBackup: null,
        spaceUsed: 0,
        spaceAvailable: 0,
      };
    }
  }

  private async compressFile(
    inputPath: string,
    outputPath: string,
  ): Promise<number> {
    try {
      const { execSync } = require("child_process");
      execSync(`gzip -c "${inputPath}" > "${outputPath}"`);

      const stats = fs.statSync(outputPath);
      return stats.size;
    } catch (error) {
      console.error("Compression failed:", error);
      throw error;
    }
  }

  private async decompressFile(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    try {
      const { execSync } = require("child_process");
      execSync(`gzip -dc "${inputPath}" > "${outputPath}"`);
    } catch (error) {
      console.error("Decompression failed:", error);
      throw error;
    }
  }

  private getDirectorySize(dirPath: string): number {
    let totalSize = 0;

    function calculateSize(filePath: string) {
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        const files = fs.readdirSync(filePath);
        files.forEach((file) => {
          calculateSize(path.join(filePath, file));
        });
      } else {
        totalSize += stat.size;
      }
    }

    calculateSize(dirPath);
    return totalSize;
  }

  private reconnectToDatabase(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        try {
          await prisma.$connect();
          console.log("[Backup] Reconnected to database");
          resolve();
        } catch (error) {
          console.error("Failed to reconnect to database:", error);
          resolve(); // Continue anyway
        }
      }, 1000);
    });
  }

  // ===== REPORTING FUNCTIONALITY =====

  /**
   * Generate comprehensive backup report
   */
  public async generateBackupReport(
    type: BackupReport["type"] = "summary",
    periodType: BackupReport["period"]["type"] = "monthly",
    generatedBy: string = "system",
  ): Promise<BackupReport> {
    console.log(
      `[Backup] Generating ${type} backup report for ${periodType} period`,
    );

    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (periodType) {
      case "weekly":
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case "monthly":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case "quarterly":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case "yearly":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Generate report data
    const [backupStats, databaseAnalysis, availableBackups] = await Promise.all(
      [
        this.getBackupStats(),
        this.getDatabaseAnalysis(),
        this.getAvailableBackups(BackupType.DATABASE),
      ],
    );

    const reportData = this.generateReportData(
      backupStats,
      databaseAnalysis,
      availableBackups,
      startDate,
      endDate,
    );

    const report: BackupReport = {
      id: uuidv4(),
      title: `${type.charAt(0).toUpperCase() + type.slice(1)
        } Backup Report - ${format(startDate, "MMM yyyy")}`,
      type,
      period: {
        start: startDate,
        end: endDate,
        type: periodType,
      },
      data: reportData,
      generatedAt: now,
      generatedBy,
      format: "pdf",
    };

    console.log(`[Backup] Report generated: ${report.title}`);
    return report;
  }

  /**
   * Generate PDF report
   */
  public async generatePDFReport(report: BackupReport): Promise<Buffer> {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(20);
    doc.text(report.title, 20, 30);

    doc.setFontSize(12);
    doc.text(
      `Period: ${format(report.period.start, "MMM dd, yyyy")} - ${format(
        report.period.end,
        "MMM dd, yyyy",
      )}`,
      20,
      45,
    );
    doc.text(
      `Generated: ${format(report.generatedAt, "MMM dd, yyyy HH:mm:ss")}`,
      20,
      55,
    );
    doc.text(`Generated by: ${report.generatedBy}`, 20, 65);

    let yPosition = 80;

    // Summary Table
    doc.setFontSize(14);
    doc.text("Summary Statistics", 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [["Metric", "Value"]],
      body: [
        ["Total Backups", report.data.summary.totalBackups.toString()],
        ["Total Size", this.formatBytes(report.data.summary.totalSize)],
        ["Success Rate", `${report.data.summary.successRate.toFixed(1)}%`],
        ["Avg Backup Time", `${report.data.summary.avgBackupTime.toFixed(1)}s`],
        [
          "Compression Ratio",
          `${report.data.summary.compressionRatio.toFixed(2)}x`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Performance Metrics
    doc.setFontSize(14);
    doc.text("Performance Metrics", 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [["Metric", "Details"]],
      body: [
        [
          "Largest Backup",
          `${report.data.performance.largestBackup.name} (${this.formatBytes(
            report.data.performance.largestBackup.size,
          )})`,
        ],
        [
          "Fastest Backup",
          `${report.data.performance.fastestBackup.name
          } (${report.data.performance.fastestBackup.time.toFixed(1)}s)`,
        ],
        [
          "Slowest Backup",
          `${report.data.performance.slowestBackup.name
          } (${report.data.performance.slowestBackup.time.toFixed(1)}s)`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [39, 174, 96] },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 20;

    // Compliance Section
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(14);
    doc.text("Compliance Status", 20, yPosition);
    yPosition += 10;

    doc.autoTable({
      startY: yPosition,
      head: [["Compliance Check", "Status", "Details"]],
      body: [
        [
          "Retention Policy",
          report.data.compliance.retentionCompliance > 80 ? "✓ PASS" : "✗ FAIL",
          `${report.data.compliance.retentionCompliance.toFixed(1)}% compliant`,
        ],
        [
          "Encryption",
          report.data.compliance.encryptionStatus ? "✓ ENABLED" : "✗ DISABLED",
          "Backup encryption status",
        ],
        [
          "Backup Freshness",
          report.data.compliance.lastBackupAge < 7 ? "✓ RECENT" : "✗ STALE",
          `${report.data.compliance.lastBackupAge} days old`,
        ],
        [
          "Backup Frequency",
          report.data.compliance.backupFrequency > 80 ? "✓ GOOD" : "✗ POOR",
          `${report.data.compliance.backupFrequency.toFixed(1)}% target met`,
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [142, 68, 173] },
    });

    return Buffer.from(doc.output("arraybuffer"));
  }

  /**
   * Export table data to CSV
   */
  public async exportTableToCSV(options: ExportOptions): Promise<ExportResult> {
    const {
      tableName,
      whereClause,
      limit,
      offset,
      columns: specifiedColumns,
    } = options;
    const exportFormat = options.format;
    console.log(`📤 Exporting table ${tableName} to CSV format`);

    try {
      // Get columns first - use PostgreSQL information schema
      let exportColumns: string[];
      if (specifiedColumns && specifiedColumns.length > 0) {
        exportColumns = specifiedColumns;
      } else {
        // Use PostgreSQL information_schema to get column names
        const columnsResult = await prisma.$queryRaw<
          Array<{ column_name: string }>
        >`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = ${tableName}
          AND table_schema = 'public'
          ORDER BY ordinal_position;
        `;
        exportColumns = (columnsResult as Array<{ column_name: string }>).map(
          (col: { column_name: string }) => col.column_name,
        );
      }

      // Build WHERE clause
      const sqlWhereClause = whereClause ? `WHERE ${whereClause}` : "";
      const sqlLimit = limit || 10000;
      const sqlOffset = offset || 0;

      // Build CSV query using PostgreSQL's COPY command
      const selectColumns = exportColumns
        .map((c: string) => `"${c}"`)
        .join(", ");
      const query = `COPY (
        SELECT ${selectColumns}
        FROM "${tableName}"
        ${sqlWhereClause}
        LIMIT ${sqlLimit} OFFSET ${sqlOffset}
      ) TO STDOUT WITH CSV HEADER`;

      // Execute the query using psql or similar PostgreSQL client
      const { execSync } = require("child_process");

      // Parse DATABASE_URL for connection parameters
      const { parse } = require("url");
      const url = process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable not set");
      }

      // Parse the PostgreSQL connection URL
      const urlObj = parse(url);
      const dbHost = urlObj.hostname || "localhost";
      const dbPort = urlObj.port || "5432";
      const dbName = urlObj.pathname
        ? urlObj.pathname.substring(1)
        : "postgres";
      const dbUser = urlObj.auth ? urlObj.auth.split(":")[0] : "postgres";
      const dbPassword = urlObj.auth ? urlObj.auth.split(":")[1] : "";

      const env = { ...process.env };
      if (dbPassword) {
        env.PGPASSWORD = dbPassword;
      }

      // Use psql to execute the COPY command
      const psqlCmd = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -c "${query}"`;
      console.log(`Executing: ${psqlCmd.replace(dbPassword, "***")}`);

      const csvData = execSync(psqlCmd, {
        env,
        encoding: "utf8",
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer
      });

      const timestamp = format(new Date(), "yyyy-MM-dd_HH-mm-ss");
      const filename = `${tableName}_export_${timestamp}.csv`;

      return {
        filename,
        data: csvData,
        mimeType: "text/csv",
      };
    } catch (error) {
      console.error(
        `[Backup] CSV export failed for table ${tableName}:`,
        error,
      );
      throw new Error(
        `Failed to export table ${tableName}: ${error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }

  /**
   * Save report to file
   */
  public async saveReportToFile(
    report: BackupReport,
    format: "pdf" | "html" = "pdf",
  ): Promise<string> {
    const filename = `backup-report-${report.id}.${format}`;
    const filepath = path.join(this.reportDir, filename);

    if (report.format === "pdf") {
      const pdfBuffer = await this.generatePDFReport(report);
      fs.writeFileSync(filepath, pdfBuffer);
    } else {
      const htmlContent = this.generateHTMLReport(report);
      fs.writeFileSync(filepath, htmlContent, "utf-8");
    }

    return filepath;
  }

  // ===== PRIVATE HELPER METHODS =====

  private generateReportData(
    backupStats: BackupStats,
    databaseAnalysis: DatabaseAnalysis,
    availableBackups: any[],
    startDate: Date,
    endDate: Date,
  ) {
    const summary = {
      totalBackups: backupStats.totalBackups,
      totalSize: backupStats.totalSize,
      successRate: backupStats.successRate,
      avgBackupTime: this.calculateAverageBackupTime(availableBackups),
      compressionRatio: this.calculateCompressionRatio(availableBackups),
    };

    const performance = {
      largestBackup: availableBackups.reduce(
        (max, backup) => (backup.size > max.size ? backup : max),
        availableBackups[0] || { name: "None", size: 0, created: new Date() },
      ),
      fastestBackup: availableBackups.find((b) => b.fastestTime) ||
        availableBackups[0] || { name: "None", time: 0, created: new Date() },
      slowestBackup: availableBackups.find((b) => b.slowestTime) ||
        availableBackups[0] || { name: "None", time: 0, created: new Date() },
    };

    const trends = {
      dailyBackups: this.generateDailyBackupTrend(
        availableBackups,
        startDate,
        endDate,
      ),
      weeklyGrowth: this.calculateWeeklyGrowth(availableBackups),
      monthlyGrowth: this.calculateMonthlyGrowth(availableBackups),
    };

    const compliance = {
      retentionCompliance: this.calculateRetentionCompliance(availableBackups),
      encryptionStatus: false, // Would implement encryption check
      lastBackupAge: backupStats.lastBackup
        ? Math.floor(
          (Date.now() - backupStats.lastBackup.getTime()) /
          (1000 * 60 * 60 * 24),
        )
        : Infinity,
      backupFrequency: this.calculateBackupFrequency(
        availableBackups,
        startDate,
        endDate,
      ),
    };

    return { summary, performance, trends, compliance };
  }

  private calculateAverageBackupTime(backups: any[]): number {
    return 120; // Mock: 2 minutes average
  }

  private calculateCompressionRatio(backups: any[]): number {
    const compressed = backups.filter((b) => b.isCompressed).length;
    return compressed > 0 ? backups.length / compressed : 1;
  }

  private generateDailyBackupTrend(
    backups: any[],
    startDate: Date,
    endDate: Date,
  ): Array<{ date: Date; count: number; size: number }> {
    const dailyData: { [key: string]: { count: number; size: number } } = {};

    backups.forEach((backup) => {
      const dateKey = format(backup.created, "yyyy-MM-dd");
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = { count: 0, size: 0 };
      }
      dailyData[dateKey].count++;
      dailyData[dateKey].size += backup.size;
    });

    const result: Array<{ date: Date; count: number; size: number }> = [];
    let current = new Date(startDate);

    while (current <= endDate) {
      const dateKey = format(current, "yyyy-MM-dd");
      const data = dailyData[dateKey] || { count: 0, size: 0 };
      result.push({
        date: new Date(current),
        count: data.count,
        size: data.size,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  private calculateWeeklyGrowth(backups: any[]): number {
    const totalBackups = backups.length;
    const oldBackups = backups.filter(
      (b) => b.created < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    ).length;
    if (oldBackups === 0) return 0;
    return ((totalBackups - oldBackups) / oldBackups) * 100;
  }

  private calculateMonthlyGrowth(backups: any[]): number {
    const totalBackups = backups.length;
    const oldBackups = backups.filter(
      (b) => b.created < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    ).length;
    if (oldBackups === 0) return 0;
    return ((totalBackups - oldBackups) / oldBackups) * 100;
  }

  private calculateRetentionCompliance(backups: any[]): number {
    const recentBackups = backups.filter(
      (b) => b.created > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    );
    const expectedBackups = 30; // Daily backups expected
    return Math.min((recentBackups.length / expectedBackups) * 100, 100);
  }

  private calculateBackupFrequency(
    backups: any[],
    startDate: Date,
    endDate: Date,
  ): number {
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalBackups = backups.length;
    return Math.min((totalBackups / daysDiff) * 100, 100);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * Generate HTML report
   */
  public generateHTMLReport(report: BackupReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${report.title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 30px; }
        .section { margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>${report.title}</h1>
        <p><strong>Period:</strong> ${format(
      report.period.start,
      "MMM dd, yyyy",
    )} - ${format(report.period.end, "MMM dd, yyyy")}</p>
        <p><strong>Generated:</strong> ${format(
      report.generatedAt,
      "MMM dd, yyyy HH:mm:ss",
    )}</p>
        <p><strong>Generated by:</strong> ${report.generatedBy}</p>
    </div>

    <div class="section">
        <h2>Summary Statistics</h2>
        <table>
            <tr><th>Metric</th><th>Value</th></tr>
            <tr><td>Total Backups</td><td>${report.data.summary.totalBackups
      }</td></tr>
            <tr><td>Total Size</td><td>${this.formatBytes(
        report.data.summary.totalSize,
      )}</td></tr>
            <tr><td>Success Rate</td><td>${report.data.summary.successRate.toFixed(
        1,
      )}%</td></tr>
            <tr><td>Avg Backup Time</td><td>${report.data.summary.avgBackupTime.toFixed(
        1,
      )}s</td></tr>
            <tr><td>Compression Ratio</td><td>${report.data.summary.compressionRatio.toFixed(
        2,
      )}x</td></tr>
        </table>
    </div>

    <!-- Additional sections would be added here -->
</body>
</html>`;
  }

  // ===== SCHEDULER FUNCTIONALITY =====

  /**
   * Initialize existing schedules from database
   */
  private async initializeExistingSchedules(): Promise<void> {
    try {
      const schedules = await this.getAllSchedules();
      console.log(
        `[Backup] Initializing ${schedules.length} backup schedules...`,
      );

      for (const schedule of schedules) {
        if (schedule.enabled) {
          await this.scheduleBackup(schedule);
        }
      }

      console.log("[Backup] Scheduler initialized");

      // Initialize data cleanup scheduler
      await this.initializeDataCleanupScheduler();
    } catch (error) {
      console.error("[Backup] Failed to initialize backup scheduler:", error);
    }
  }

  // ===== DATA LIMITATION & CLEANUP SCHEDULER =====

  /**
   * Initialize automatic data cleanup scheduler
   */
  private async initializeDataCleanupScheduler(): Promise<void> {
    try {
      console.log("[Backup] Initializing data cleanup scheduler...");

      // Schedule daily cleanup at 2:00 AM
      const cleanupSchedule = cron.schedule(
        "0 2 * * *",
        async () => {
          console.log("[Backup] Starting scheduled data cleanup...");
          try {
            await this.performScheduledDataCleanup();
          } catch (error) {
            console.error("[Backup] Scheduled data cleanup failed:", error);
          }
        },
        {
          timezone: "Asia/Jakarta",
        },
      );

      // Schedule limit monitoring every 6 hours
      const monitoringSchedule = cron.schedule(
        "0 */6 * * *",
        async () => {
          console.log("[Backup] Monitoring data limits...");
          try {
            await this.monitorDataLimits();
          } catch (error) {
            console.error("[Backup] Data limit monitoring failed:", error);
          }
        },
        {
          timezone: "Asia/Jakarta",
        },
      );

      // Store cleanup scheduler references
      this.runningSchedules.set(
        "data-cleanup-scheduler",
        cleanupSchedule as any,
      );
      this.runningSchedules.set(
        "data-monitoring-scheduler",
        monitoringSchedule as any,
      );

      console.log("[Backup] Data cleanup scheduler initialized");
    } catch (error) {
      console.error(
        "[Backup] Failed to initialize data cleanup scheduler:",
        error,
      );
    }
  }

  /**
   * Perform scheduled data cleanup with enhanced logic
   */
  private async performScheduledDataCleanup(): Promise<{
    cleanupResults: any;
    alertsTriggered: string[];
  }> {
    const cleanupResults: any = {};
    const alertsTriggered: string[] = [];

    try {
      // Get current limits from system configuration
      const limitConfigs = await this.getDataLimitsFromConfig();
      const currentUsage = await this.getCurrentTableUsage();
      const retentionDays = limitConfigs.retentionDays || 30;

      console.log(
        `[Backup] Starting enhanced data cleanup (Retention: ${retentionDays} days)...`,
      );

      // Process each table with intelligent cleanup logic
      for (const [tableName, limit] of Object.entries(limitConfigs)) {
        // Skip keys that are not table names
        if (tableName === "retentionDays" || !currentUsage[tableName]) continue;

        const currentCount = currentUsage[tableName].current;
        const cleanupResult = await this.performIntelligentCleanup(
          tableName,
          limit,
          currentCount,
          retentionDays,
        );

        if (cleanupResult.deleted > 0) {
          cleanupResults[tableName] = cleanupResult;

          // Log cleanup activity
          await this.logCleanupActivity({
            tableName,
            cleanupDate: new Date(),
            triggerType: "scheduled",
            recordsBefore: cleanupResult.before,
            recordsAfter: cleanupResult.after,
            recordsDeleted: cleanupResult.deleted,
            cleanupStrategy: cleanupResult.strategy,
          });

          console.log(
            `[Backup] Cleaned ${tableName}: ${cleanupResult.deleted} records removed`,
          );
        }
      }

      // Send cleanup summary notification
      if (Object.keys(cleanupResults).length > 0) {
        await this.sendCleanupSummaryNotification(cleanupResults);
      }

      console.log("[Backup] Scheduled data cleanup completed successfully");
      return { cleanupResults, alertsTriggered };
    } catch (error) {
      console.error("[Backup] Scheduled data cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Perform intelligent cleanup with multiple strategies
   */
  private async performIntelligentCleanup(
    tableName: string,
    limit: number,
    currentCount: number,
    retentionDays: number = 30,
  ): Promise<{
    before: number;
    after: number;
    deleted: number;
    strategy: string;
  }> {
    let deleted = 0;
    let strategy = "none";

    try {
      // Strategy 1: Time-based retention (keep last N days regardless of count)
      const cutoffDate = new Date(
        Date.now() - retentionDays * 24 * 60 * 60 * 1000,
      );

      const timeBasedDeletions = await this.deleteRecordsOlderThan(
        tableName,
        cutoffDate,
      );
      deleted += timeBasedDeletions;
      strategy = "time-based";

      // Strategy 2: If still over limit, delete oldest records based on priority
      const updatedCount = currentCount - deleted;
      if (updatedCount > limit) {
        const excessRecords = updatedCount - limit;
        const priorityDeletions = await this.deleteRecordsByPriority(
          tableName,
          excessRecords,
        );
        deleted += priorityDeletions;
        strategy = "time-based+priority";
      }

      return {
        before: currentCount,
        after: currentCount - deleted,
        deleted,
        strategy,
      };
    } catch (error) {
      console.error(
        `[Backup] Intelligent cleanup failed for ${tableName}:`,
        error,
      );
      return {
        before: currentCount,
        after: currentCount,
        deleted: 0,
        strategy: "failed",
      };
    }
  }

  /**
   * Delete records older than specified date
   */
  private async deleteRecordsOlderThan(
    tableName: string,
    cutoffDate: Date,
  ): Promise<number> {
    try {
      let deletedCount = 0;

      switch (tableName) {
        case "loggedData":
          const loggedDataResult = await prisma.loggedData.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
          });
          deletedCount = loggedDataResult.count;
          break;

        case "alarmLog":
          // Only delete cleared alarms older than cutoff
          const alarmResult = await prisma.alarmLog.deleteMany({
            where: {
              timestamp: { lt: cutoffDate },
              status: "CLEARED",
            },
          });
          deletedCount = alarmResult.count;
          break;

        case "notification":
          // Only delete read notifications older than cutoff
          const notificationResult = await prisma.notification.deleteMany({
            where: {
              createdAt: { lt: cutoffDate },
              isRead: true,
            },
          });
          deletedCount = notificationResult.count;
          break;

        case "activityLog":
          const activityResult = await (prisma as any).activityLog.deleteMany({
            where: { timestamp: { lt: cutoffDate } },
          });
          deletedCount = activityResult.count;
          break;

        case "alarmNotificationRecipient":
          // Delete old recipient configurations (no time column, use count-based)
          deletedCount = 0;
          break;
      }

      return deletedCount;
    } catch (error) {
      console.error(
        `[Backup] Failed to delete old records from ${tableName}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Delete records by priority (oldest first with business logic)
   */
  private async deleteRecordsByPriority(
    tableName: string,
    count: number,
  ): Promise<number> {
    try {
      let deletedCount = 0;

      switch (tableName) {
        case "loggedData":
          const loggedDataRecords = await prisma.loggedData.findMany({
            orderBy: { timestamp: "asc" },
            take: count,
            select: { id: true },
          });
          const loggedDataIds = loggedDataRecords.map(
            (r: { id: string }) => r.id,
          );
          const loggedDataResult = await prisma.loggedData.deleteMany({
            where: { id: { in: loggedDataIds } },
          });
          deletedCount = loggedDataResult.count;
          break;

        case "alarmLog":
          // Delete oldest cleared alarms
          const alarmRecords = await prisma.alarmLog.findMany({
            where: { status: "CLEARED" },
            orderBy: { timestamp: "asc" },
            take: count,
            select: { id: true },
          });
          const alarmIds = alarmRecords.map((r: { id: string }) => r.id);
          const alarmResult = await prisma.alarmLog.deleteMany({
            where: { id: { in: alarmIds } },
          });
          deletedCount = alarmResult.count;
          break;

        case "notification":
          // Delete oldest read notifications
          const notificationRecords = await prisma.notification.findMany({
            where: { isRead: true },
            orderBy: { createdAt: "asc" },
            take: count,
            select: { id: true },
          });
          const notificationIds = notificationRecords.map(
            (r: { id: string }) => r.id,
          );
          const notificationResult = await prisma.notification.deleteMany({
            where: { id: { in: notificationIds } },
          });
          deletedCount = notificationResult.count;
          break;

        case "activityLog":
          const activityRecords = await (prisma as any).activityLog.findMany({
            orderBy: { timestamp: "asc" },
            take: count,
            select: { id: true },
          });
          const activityIds = activityRecords.map((r: { id: string }) => r.id);
          const activityResult = await (prisma as any).activityLog.deleteMany({
            where: { id: { in: activityIds } },
          });
          deletedCount = activityResult.count;
          break;
      }

      return deletedCount;
    } catch (error) {
      console.error(
        `[Backup] Failed to delete records by priority from ${tableName}:`,
        error,
      );
      return 0;
    }
  }

  /**
   * Monitor data limits and send alerts
   */
  private async monitorDataLimits(): Promise<void> {
    try {
      const limits = await this.getDataLimitsFromConfig();
      const usage = await this.getCurrentTableUsage();

      const alertsTriggered: string[] = [];

      for (const [tableName, usageData] of Object.entries(usage)) {
        const limit = limits[tableName] || 0;

        if (usageData.percentage >= 95) {
          // Critical alert
          await this.sendDataLimitAlert(
            tableName,
            "critical",
            usageData,
            limit,
          );
          alertsTriggered.push(`${tableName}-critical`);
        } else if (usageData.percentage >= 85) {
          // Warning alert
          await this.sendDataLimitAlert(tableName, "warning", usageData, limit);
          alertsTriggered.push(`${tableName}-warning`);
        }
      }

      if (alertsTriggered.length > 0) {
        console.log(
          ` Data limit alerts triggered: ${alertsTriggered.join(", ")}`,
        );
      }
    } catch (error) {
      console.error("[Backup] Data limit monitoring failed:", error);
    }
  }

  /**
   * Get data limits from system configuration
   */
  private async getDataLimitsFromConfig(): Promise<Record<string, number>> {
    try {
      const limitConfigs = await prisma.systemConfiguration.findMany({
        where: {
          key: {
            in: [
              "data-limit-logged-data",
              "data-limit-alarm-log",
              "data-limit-alarm-notification-recipient",
              "data-limit-notification",
              "data-limit-activity-log",
              "data-retention-days",
            ],
          },
        },
      });

      const limits = {
        loggedData: 100000,
        alarmLog: 50000,
        alarmNotificationRecipient: 1000,
        notification: 10000,
        activityLog: 50000,
        retentionDays: 30,
      };

      limitConfigs.forEach((config: { key: string; value: string }) => {
        const value = parseInt(config.value);
        if (!isNaN(value)) {
          switch (config.key) {
            case "data-limit-logged-data":
              limits.loggedData = value;
              break;
            case "data-limit-alarm-log":
              limits.alarmLog = value;
              break;
            case "data-limit-alarm-notification-recipient":
              limits.alarmNotificationRecipient = value;
              break;
            case "data-limit-notification":
              limits.notification = value;
              break;
            case "data-limit-activity-log":
              limits.activityLog = value;
              break;
            case "data-retention-days":
              limits.retentionDays = value;
              break;
          }
        }
      });

      return limits;
    } catch (error) {
      console.error("Failed to get data limits from config:", error);
      return {
        loggedData: 100000,
        alarmLog: 50000,
        alarmNotificationRecipient: 1000,
        notification: 10000,
        activityLog: 50000,
        retentionDays: 30,
      };
    }
  }

  /**
   * Get current table usage statistics
   */
  private async getCurrentTableUsage(): Promise<
    Record<string, { current: number; percentage: number; status: string }>
  > {
    try {
      const limits = await this.getDataLimitsFromConfig();

      const [
        loggedDataCount,
        alarmLogCount,
        alarmNotificationRecipientCount,
        notificationCount,
        activityLogCount,
      ] = await Promise.all([
        prisma.loggedData.count(),
        prisma.alarmLog.count(),
        prisma.alarmNotificationRecipient.count(),
        prisma.notification.count(),
        (prisma as any).activityLog.count(),
      ]);

      return {
        loggedData: {
          current: loggedDataCount,
          percentage: Math.min(
            (loggedDataCount / limits.loggedData) * 100,
            100,
          ),
          status:
            loggedDataCount >= limits.loggedData * 0.95
              ? "critical"
              : loggedDataCount >= limits.loggedData * 0.8
                ? "warning"
                : "normal",
        },
        alarmLog: {
          current: alarmLogCount,
          percentage: Math.min((alarmLogCount / limits.alarmLog) * 100, 100),
          status:
            alarmLogCount >= limits.alarmLog * 0.95
              ? "critical"
              : alarmLogCount >= limits.alarmLog * 0.8
                ? "warning"
                : "normal",
        },
        alarmNotificationRecipient: {
          current: alarmNotificationRecipientCount,
          percentage: Math.min(
            (alarmNotificationRecipientCount /
              limits.alarmNotificationRecipient) *
            100,
            100,
          ),
          status:
            alarmNotificationRecipientCount >=
              limits.alarmNotificationRecipient * 0.95
              ? "critical"
              : alarmNotificationRecipientCount >=
                limits.alarmNotificationRecipient * 0.8
                ? "warning"
                : "normal",
        },
        notification: {
          current: notificationCount,
          percentage: Math.min(
            (notificationCount / limits.notification) * 100,
            100,
          ),
          status:
            notificationCount >= limits.notification * 0.95
              ? "critical"
              : notificationCount >= limits.notification * 0.8
                ? "warning"
                : "normal",
        },
        activityLog: {
          current: activityLogCount,
          percentage: Math.min(
            (activityLogCount / limits.activityLog) * 100,
            100,
          ),
          status:
            activityLogCount >= limits.activityLog * 0.95
              ? "critical"
              : activityLogCount >= limits.activityLog * 0.8
                ? "warning"
                : "normal",
        },
      };
    } catch (error) {
      console.error("Failed to get current table usage:", error);
      return {};
    }
  }

  /**
   * Log cleanup activity for audit trail
   */
  private async logCleanupActivity(activity: {
    tableName: string;
    cleanupDate: Date;
    triggerType: "manual" | "scheduled" | "automatic";
    recordsBefore: number;
    recordsAfter: number;
    recordsDeleted: number;
    cleanupStrategy: string;
  }): Promise<void> {
    try {
      // Store in system logs or dedicated cleanup log table
      console.log(
        `📝 Cleanup Log: ${activity.tableName} - ${activity.recordsDeleted} records deleted (${activity.cleanupStrategy})`,
      );
    } catch (error) {
      console.error("Failed to log cleanup activity:", error);
    }
  }

  /**
   * Send data limit alert notifications
   */
  private async sendDataLimitAlert(
    tableName: string,
    severity: "warning" | "critical",
    usage: any,
    limit: number,
  ): Promise<void> {
    try {
      const alertMessage = `${severity.toUpperCase()}: ${tableName} table is at ${usage.percentage.toFixed(1)}% capacity (${usage.current}/${limit} records)`;

      console.log(` ${alertMessage}`);

      // In a real implementation, this would send notifications via email, Slack, etc.
      // For now, just log the alert
    } catch (error) {
      console.error(
        `Failed to send ${severity} alert for ${tableName}:`,
        error,
      );
    }
  }

  /**
   * Send cleanup summary notification
   */
  private async sendCleanupSummaryNotification(
    cleanupResults: any,
  ): Promise<void> {
    try {
      const totalDeleted = Object.values(cleanupResults).reduce(
        (sum: number, result: any) => sum + result.deleted,
        0,
      );

      const summaryMessage = `Data cleanup completed: ${totalDeleted} records removed across ${Object.keys(cleanupResults).length} tables`;

      console.log(`[Backup] ${summaryMessage}`);

      // In a real implementation, this would send a summary email/Slack notification
    } catch (error) {
      console.error("Failed to send cleanup summary notification:", error);
    }
  }

  /**
   * Schedule a backup operation
   */
  public async scheduleBackup(schedule: BackupSchedule): Promise<void> {
    if (!schedule.enabled) {
      this.unscheduleBackup(schedule.id!);
      return;
    }

    // Unschedule existing if any
    this.unscheduleBackup(schedule.id!);

    const cronExpression = this.buildCronExpression(schedule);
    const task = cron.schedule(
      cronExpression,
      async () => {
        await this.executeScheduledBackup(schedule.id!);
      },
      {
        timezone: "Asia/Jakarta",
      },
    );

    this.runningSchedules.set(schedule.id!, task);
    console.log(
      `[Backup] Scheduled backup "${schedule.name}": ${cronExpression}`,
    );
  }

  /**
   * Unschedule a backup operation
   */
  public unscheduleBackup(scheduleId: string): void {
    const existingTask = this.runningSchedules.get(scheduleId);
    if (existingTask) {
      existingTask.destroy();
      this.runningSchedules.delete(scheduleId);
      console.log(`[Backup] Unscheduled backup: ${scheduleId}`);
    }
  }

  /**
   * Execute a scheduled backup
   */
  private async executeScheduledBackup(scheduleId: string): Promise<void> {
    try {
      const schedule = await this.getScheduleById(scheduleId);
      if (!schedule || !schedule.enabled) return;

      const executionId = uuidv4();
      const execution: ScheduleExecution = {
        id: executionId,
        scheduleId,
        startTime: new Date(),
        status: "running",
        logs: [`Starting scheduled backup: ${schedule.name}`],
      };

      // Update schedule's lastRun
      await this.updateScheduleLastRun(scheduleId, new Date());

      // Store execution
      this.runningExecutions.set(executionId, execution);

      console.log(`[Backup] Executing scheduled backup: ${schedule.name}`);

      // Only support database backups
      if (schedule.type !== BackupType.DATABASE) {
        throw new Error(
          `Unsupported backup type: ${schedule.type}. Only DATABASE backups are supported.`,
        );
      }

      const result = await this.backupDatabase({
        ...(schedule.config as any),
        encrypt: !!schedule.encrypt,
        destinationId: schedule.destinationId || undefined,
      });

      // Update execution
      execution.endTime = new Date();
      execution.status = result.status === "completed" ? "completed" : "failed";

      execution.logs.push(`Backup result: ${result.message}`);

      // Store execution in database (future enhancement)
      await this.storeExecution(execution);
      this.runningExecutions.delete(executionId);

      console.log(
        `[Backup] Scheduled backup completed: ${schedule.name} (${execution.status})`,
      );

      // Run retention cleanup if policy is defined
      if (schedule.retentionPolicy && result.status === "completed") {
        try {
          console.log(
            `[Backup] Running automated retention cleanup for schedule: ${schedule.name}`,
          );
          const cleanupResult = await this.cleanupBackups(
            schedule.retentionPolicy,
          );
          execution.logs.push(`Retention cleanup: ${cleanupResult.message}`);
          console.log(
            `[Backup] Automated cleanup completed: ${cleanupResult.deleted} deleted`,
          );
        } catch (cleanupError) {
          console.error(
            `[Backup] Retention cleanup failed for schedule ${schedule.id}:`,
            cleanupError,
          );
          execution.logs.push(
            `Warning: Retention cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`,
          );
        }
      }
    } catch (error) {
      console.error(`[Backup] Scheduled backup failed: ${scheduleId}`, error);
      const execution = this.runningExecutions.get(scheduleId);
      if (execution) {
        execution.status = "failed";
        execution.error =
          error instanceof Error ? error.message : "Unknown error";
        execution.endTime = new Date();
        await this.storeExecution(execution);
        this.runningExecutions.delete(scheduleId);
      }
    }
  }

  /**
   * Build cron expression from schedule config
   */
  private buildCronExpression(schedule: BackupSchedule): string {
    const [hour, minute] = schedule.time.split(":");

    switch (schedule.frequency) {
      case BackupFrequency.DAILY:
        return `${minute} ${hour} * * *`; // Every day at specified time

      case BackupFrequency.WEEKLY:
        const dayOfWeek = schedule.daysOfWeek?.[0] ?? 0; // Default to Sunday
        return `${minute} ${hour} * * ${dayOfWeek}`;

      case BackupFrequency.MONTHLY:
        const dayOfMonth = schedule.daysOfMonth?.[0] ?? 1; // Default to 1st of month
        return `${minute} ${hour} ${dayOfMonth} * *`;

      default:
        return `${minute} ${hour} * * *`; // Daily as fallback
    }
  }

  /**
   * Calculate next run time for schedule
   */
  private calculateNextRun(schedule: BackupSchedule): Date {
    const [scheduleHour, scheduleMinute] = schedule.time.split(":").map(Number);
    const now = new Date();

    switch (schedule.frequency) {
      case BackupFrequency.DAILY:
        const nextDaily = new Date(now);
        nextDaily.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextDaily <= now) {
          nextDaily.setDate(nextDaily.getDate() + 1);
        }
        return nextDaily;

      case BackupFrequency.WEEKLY:
        const nextWeekly = new Date(now);
        const targetDay = schedule.daysOfWeek?.[0] ?? 0;
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        nextWeekly.setDate(now.getDate() + daysUntilTarget);
        nextWeekly.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextWeekly <= now) {
          nextWeekly.setDate(nextWeekly.getDate() + 7);
        }
        return nextWeekly;

      case BackupFrequency.MONTHLY:
        const nextMonthly = new Date(now);
        const targetDate = schedule.daysOfMonth?.[0] ?? 1;
        nextMonthly.setDate(targetDate);
        nextMonthly.setHours(scheduleHour, scheduleMinute, 0, 0);
        if (nextMonthly <= now) {
          nextMonthly.setMonth(nextMonthly.getMonth() + 1);
        }
        return nextMonthly;

      default:
        return now;
    }
  }

  /**
   * Encrypt a file using AES-256-CBC
   */
  private async encryptFile(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.encryptionAlgorithm,
        this.encryptionKey,
        iv,
      );
      const input = fs.createReadStream(inputPath);
      const output = fs.createWriteStream(outputPath);

      output.write(iv); // Prepend IV to the file

      input.pipe(cipher).pipe(output);

      output.on("finish", resolve);
      output.on("error", reject);
      input.on("error", reject);
    });
  }

  /**
   * Decrypt a file using AES-256-CBC
   */
  private async decryptFile(
    inputPath: string,
    outputPath: string,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const input = fs.createReadStream(inputPath);
      const iv = Buffer.alloc(16);

      input.once("readable", () => {
        const chunk = input.read(16);
        if (!chunk) return reject(new Error("Failed to read IV from file"));
        chunk.copy(iv);

        const decipher = crypto.createDecipheriv(
          this.encryptionAlgorithm,
          this.encryptionKey,
          iv,
        );
        const output = fs.createWriteStream(outputPath);

        input.pipe(decipher).pipe(output);

        output.on("finish", resolve);
        output.on("error", reject);
        decipher.on("error", reject);
      });

      input.on("error", reject);
    });
  }

  /**
   * Get scheduler statistics
   */
  public async getSchedulerStats(): Promise<SchedulerStats> {
    const schedules = await this.getAllSchedules();
    const activeSchedules = schedules.filter((s) => s.enabled);
    const runningCount = this.runningExecutions.size;

    const executions = await this.getRecentExecutions();
    const lastExecution =
      executions.length > 0 ? executions[0].startTime : null;

    // Fixed Next Run calculation to avoid showing past dates if cron wasn't triggered
    const now = new Date();
    const futureNextRuns = activeSchedules
      .filter((s) => s.nextRun)
      .map((s) => {
        let runDate = s.nextRun!;
        if (runDate <= now) {
          runDate = this.calculateNextRun(s);
        }
        return runDate.getTime();
      });

    const nextExecution =
      futureNextRuns.length > 0
        ? new Date(Math.min(...futureNextRuns))
        : null;

    return {
      totalSchedules: schedules.length,
      activeSchedules: activeSchedules.length,
      runningCount,
      lastExecution,
      nextExecution,
    } as SchedulerStats;
  }

  /**
   * Create a new backup schedule
   */
  public async createSchedule(
    schedule: Omit<BackupSchedule, "id" | "createdAt" | "updatedAt">,
  ): Promise<BackupSchedule> {
    const nextRun = this.calculateNextRun(schedule);

    // Store in database
    const dbSchedule = await (prisma as any).backupSchedule.create({
      data: {
        name: schedule.name,
        type: schedule.type,
        frequency: schedule.frequency,
        time: schedule.time,
        daysOfWeek: schedule.daysOfWeek
          ? JSON.stringify(schedule.daysOfWeek)
          : null,
        daysOfMonth: schedule.daysOfMonth
          ? JSON.stringify(schedule.daysOfMonth)
          : null,
        enabled: schedule.enabled,
        config: JSON.stringify(schedule.config),
        nextRun: nextRun,
      },
    });

    // Convert database record to BackupSchedule type
    const newSchedule: BackupSchedule = {
      id: dbSchedule.id,
      name: dbSchedule.name,
      type: dbSchedule.type as any,
      frequency: dbSchedule.frequency as any,
      time: dbSchedule.time,
      daysOfWeek: dbSchedule.daysOfWeek
        ? JSON.parse(dbSchedule.daysOfWeek)
        : undefined,
      daysOfMonth: dbSchedule.daysOfMonth
        ? JSON.parse(dbSchedule.daysOfMonth)
        : undefined,
      enabled: dbSchedule.enabled,
      config: JSON.parse(dbSchedule.config) as any,
      nextRun: dbSchedule.nextRun || undefined,
      lastRun: dbSchedule.lastRun || undefined,
      createdAt: dbSchedule.createdAt,
      updatedAt: dbSchedule.updatedAt,
    };

    if (schedule.enabled) {
      await this.scheduleBackup(newSchedule);
    }

    return newSchedule;
  }

  /**
   * Update an existing schedule
   */
  public async updateSchedule(
    scheduleId: string,
    updates: Partial<BackupSchedule>,
  ): Promise<BackupSchedule | null> {
    try {
      // Prepare update data for database
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.type !== undefined) updateData.type = updates.type;
      if (updates.frequency !== undefined)
        updateData.frequency = updates.frequency;
      if (updates.time !== undefined) updateData.time = updates.time;
      if (updates.daysOfWeek !== undefined)
        updateData.daysOfWeek = updates.daysOfWeek
          ? JSON.stringify(updates.daysOfWeek)
          : null;
      if (updates.daysOfMonth !== undefined)
        updateData.daysOfMonth = updates.daysOfMonth
          ? JSON.stringify(updates.daysOfMonth)
          : null;
      if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
      if (updates.config !== undefined)
        updateData.config = JSON.stringify(updates.config);
      if (updates.lastRun !== undefined) updateData.lastRun = updates.lastRun;

      // Update in database
      const dbSchedule = await (prisma as any).backupSchedule.update({
        where: { id: scheduleId },
        data: updateData,
      });

      // Convert to BackupSchedule type
      const updatedSchedule: BackupSchedule = {
        id: dbSchedule.id,
        name: dbSchedule.name,
        type: dbSchedule.type as any,
        frequency: dbSchedule.frequency as any,
        time: dbSchedule.time,
        daysOfWeek: dbSchedule.daysOfWeek
          ? JSON.parse(dbSchedule.daysOfWeek)
          : undefined,
        daysOfMonth: dbSchedule.daysOfMonth
          ? JSON.parse(dbSchedule.daysOfMonth)
          : undefined,
        enabled: dbSchedule.enabled,
        config: JSON.parse(dbSchedule.config) as any,
        nextRun: dbSchedule.nextRun || undefined,
        lastRun: dbSchedule.lastRun || undefined,
        createdAt: dbSchedule.createdAt,
        updatedAt: dbSchedule.updatedAt,
      };

      // Recalculate next run and update database
      const nextRun = this.calculateNextRun(updatedSchedule);
      await (prisma as any).backupSchedule.update({
        where: { id: scheduleId },
        data: { nextRun },
      });
      updatedSchedule.nextRun = nextRun;

      // Reschedule if needed
      if (updates.enabled !== undefined || Object.keys(updates).length > 0) {
        await this.scheduleBackup(updatedSchedule);
      }

      return updatedSchedule;
    } catch (error) {
      console.error("Error updating schedule:", error);
      return null;
    }
  }

  /**
   * Delete a schedule
   */
  public async deleteSchedule(scheduleId: string): Promise<boolean> {
    try {
      this.unscheduleBackup(scheduleId);
      await (prisma as any).backupSchedule.delete({
        where: { id: scheduleId },
      });
      return true;
    } catch (error) {
      console.error("Error deleting schedule:", error);
      return false;
    }
  }

  /**
   * Get all schedules
   */
  public async getAllSchedules(): Promise<BackupSchedule[]> {
    try {
      // Removed database query logs for cleaner startup

      const schedules = await (prisma as any).backupSchedule.findMany({
        include: {
          executions: true,
        },
        orderBy: { createdAt: "desc" },
      });

      return schedules.map((s: any) => {
        const parsedSchedule = {
          ...s,
          type: s.type as BackupType,
          frequency: s.frequency as BackupFrequency,
          daysOfWeek: s.daysOfWeek ? JSON.parse(s.daysOfWeek) : undefined,
          daysOfMonth: s.daysOfMonth ? JSON.parse(s.daysOfMonth) : undefined,
          config: JSON.parse(s.config),
          retentionPolicy: s.retentionPolicy ? s.retentionPolicy : undefined,
        } as BackupSchedule;

        // Auto correct past dates on the fly for UI accurately
        if (parsedSchedule.nextRun && parsedSchedule.nextRun <= new Date()) {
          parsedSchedule.nextRun = this.calculateNextRun(parsedSchedule);
        }
        return parsedSchedule;
      });
    } catch (error) {
      console.error("[Backup] Failed to fetch schedules:", error);
      console.error(
        "   This might indicate that the BackupSchedule table doesn't exist in the database",
      );
      console.error("   Run 'npm run db:push' to update the database schema");

      // Return empty array instead of throwing to prevent API crashes
      return [];
    }
  }

  /**
   * Get schedule by ID
   */
  public async getScheduleById(
    scheduleId: string,
  ): Promise<BackupSchedule | null> {
    try {
      const schedule = await prisma.backupSchedule.findUnique({
        where: { id: scheduleId },
        include: {
          executions: true,
        },
      });

      if (!schedule) return null;

      const parsedSchedule = {
        ...schedule,
        type: schedule.type as BackupType,
        frequency: schedule.frequency as BackupFrequency,
        daysOfWeek: schedule.daysOfWeek
          ? JSON.parse(schedule.daysOfWeek)
          : undefined,
        daysOfMonth: schedule.daysOfMonth
          ? JSON.parse(schedule.daysOfMonth)
          : undefined,
        config: JSON.parse(schedule.config),
        retentionPolicy: schedule.retentionPolicy
          ? schedule.retentionPolicy
          : undefined,
      } as BackupSchedule;

      if (parsedSchedule.nextRun && parsedSchedule.nextRun <= new Date()) {
        parsedSchedule.nextRun = this.calculateNextRun(parsedSchedule);
      }
      return parsedSchedule;
    } catch (error) {
      console.error(`Failed to fetch schedule ${scheduleId}:`, error);
      return null;
    }
  }

  /**
   * Update schedule's last run time
   */
  private async updateScheduleLastRun(
    scheduleId: string,
    lastRun: Date,
  ): Promise<void> {
    const nextRun = this.calculateNextRun(
      (await this.getScheduleById(scheduleId)) as BackupSchedule,
    );
    // Update database record - implementation simplified
  }

  /**
   * Store execution in database
   */
  private async storeExecution(execution: ScheduleExecution): Promise<void> {
    // In a real implementation, you'd store execution logs in database
    console.log(`📝 Execution log: ${execution.id} - ${execution.status}`);
  }

  /**
   * Get recent executions
   */
  public async getRecentExecutions(
    limit: number = 10,
  ): Promise<ScheduleExecution[]> {
    // In a real implementation, you'd fetch from database
    return [];
  }

  /**
   * Execute backup immediately (for testing/on-demand)
   */
  public async executeNow(
    scheduleId: string,
  ): Promise<ScheduleExecution | null> {
    console.log("[Backup] executeNow called for schedule:", scheduleId);

    // First check if schedule exists
    const schedule = await this.getScheduleById(scheduleId);
    if (!schedule) {
      console.log("[Backup] Schedule not found:", scheduleId);
      return null;
    }

    console.log(
      "[Backup] Schedule found:",
      schedule.name,
      "Type:",
      schedule.type,
    );

    // Create execution record
    const executionId = uuidv4();
    const execution: ScheduleExecution = {
      id: executionId,
      scheduleId,
      startTime: new Date(),
      status: "running",
      logs: [`Starting manual backup execution: ${schedule.name}`],
    };

    this.runningExecutions.set(executionId, execution);

    try {
      console.log("[Backup] Executing manual backup for:", schedule.name);

      // Only support database backups
      if (schedule.type !== BackupType.DATABASE) {
        throw new Error(
          `Unsupported backup type: ${schedule.type}. Only DATABASE backups are supported.`,
        );
      }

      const result = await this.backupDatabase(
        schedule.config as DatabaseBackupConfig,
      );

      // Update execution
      execution.endTime = new Date();
      execution.status = result.status === "completed" ? "completed" : "failed";
      execution.logs.push(`Backup result: ${result.message}`);

      console.log(
        `[Backup] Manual backup completed: ${schedule.name} (${execution.status})`,
      );
    } catch (error) {
      console.error(`[Backup] Manual backup failed: ${scheduleId}`, error);

      execution.status = "failed";
      execution.error =
        error instanceof Error ? error.message : "Unknown error";
      execution.endTime = new Date();
      execution.logs.push(`Error: ${execution.error}`);
    }

    // Store execution (if needed)
    await this.storeExecution(execution);

    return execution;
  }

  /**
   * Shutdown all running schedules and cleanup
   */
  public shutdown(): void {
    // Stop backup schedules
    for (const [scheduleId, task] of this.runningSchedules) {
      task.destroy();
      console.log(`🛑 Shutdown schedule: ${scheduleId}`);
    }
    this.runningSchedules.clear();
    this.runningExecutions.clear();

    console.log("🛑 Backup system shutdown complete");
  }
}

// ===== EXPORT SINGLETON INSTANCE =====
export const backupService = BackupManagementService.getInstance();
