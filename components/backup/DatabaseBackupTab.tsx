"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { showToast } from "@/lib/toast-utils";
import type { BackupStats } from "@/lib/types/backup";
import { BackupType } from "@/lib/types/backup";

// Icons
import {
  Database,
  Trash2,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  FolderOpen,
  HardDrive,
  Shield,
  Cloud,
  Clock,
  Table,
  Columns,
  Filter,
  Zap,
  Upload,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";


interface BackupResult {
  result: {
    id: string;
    configId: string;
    type: BackupType;
    status: string;
    size: number;
    path: string;
    startedAt: string;
    completedAt?: string;
    error?: string;
    metadata?: any;
  };
  message: string;
}

interface DatabaseBackupTabProps {
  stats: BackupStats | null;
  backupInProgress: boolean;
  cleanupInProgress: boolean;
  restoreInProgress: boolean;
  onBackup: (config: any) => Promise<void>;
  onCleanup: (type: BackupType, retentionDays: number) => Promise<void>;
  onLoadStats: () => Promise<void>;
  onRestoreProgress: (inProgress: boolean) => void;
  onCleanupProgress: (inProgress: boolean) => void;
  retentionDays?: number;
  onRetentionDaysChange?: (days: number) => void;
}

export function DatabaseBackupTab({
  stats,
  backupInProgress,
  cleanupInProgress,
  restoreInProgress,
  onBackup,
  onCleanup,
  onLoadStats,
  onRestoreProgress,
  onCleanupProgress,
  retentionDays: propRetentionDays,
  onRetentionDaysChange,
}: DatabaseBackupTabProps) {
  // Database backup form - use prop values if provided, otherwise use defaults
  const [dbBackupName, setDbBackupName] = useState("smartrack-database-backup");
  const [dbRetentionDays, setDbRetentionDays] = useState(propRetentionDays ?? 30);
  const [dbCompress, setDbCompress] = useState(true);
  const [dbIncludeWal, setDbIncludeWal] = useState(true);
  const [dbVerifyIntegrity, setDbVerifyIntegrity] = useState(true);
  const [dbEncrypt, setDbEncrypt] = useState(false);

  // Sync with prop changes
  useEffect(() => {
    if (propRetentionDays !== undefined) {
      setDbRetentionDays(propRetentionDays);
    }
  }, [propRetentionDays]);

  // Database restore
  const [availableBackups, setAvailableBackups] = useState<
    Array<{
      name: string;
      path: string;
      size: number;
      created: Date;
      isCompressed: boolean;
    }>
  >([]);
  const [restoreVerifyBefore, setRestoreVerifyBefore] = useState(true);

  // Granular restore options
  const [selectedBackupForGranular, setSelectedBackupForGranular] = useState<string>("");
  const [restoreType, setRestoreType] = useState<"full" | "table-selective" | "column-selective" | "point-in-time" | "conditional">("full");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [columnSelections, setColumnSelections] = useState<Record<string, string[]>>({});
  const [pointInTime, setPointInTime] = useState<string>("");
  const [whereClause, setWhereClause] = useState<string>("");
  const [skipTableValidation, setSkipTableValidation] = useState(false);

  // Auto cleanup retention settings
  const [retentionPolicy, setRetentionPolicy] = useState({
    autoCleanup: true,
    cleanupSchedule: "daily" as "daily" | "weekly" | "monthly",
    cleanupTime: "02:00",
    maxTotalSizeGB: 100,
    emergencyRetentionDays: 7,
  });



  // Dialog states
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [showDeleteBackupConfirm, setShowDeleteBackupConfirm] = useState(false);
  const [pendingRestorePath, setPendingRestorePath] = useState("");
  const [pendingBackupDelete, setPendingBackupDelete] = useState<{
    path: string;
    name: string;
    size: number;
  } | null>(null);

  // Upload states
  const [uploading, setUploading] = useState(false);

  // Load available backups when component mounts
  useEffect(() => {
    loadAvailableBackups();
    loadRetentionPolicy();
  }, []);

  // Load tables when backup is selected
  useEffect(() => {
    if (selectedBackupForGranular) {
      loadAvailableTables();
    }
  }, [selectedBackupForGranular]);

  const loadAvailableTables = async () => {
    if (!selectedBackupForGranular) return;

    try {
      const response = await fetch(`/api/backup/restore/granular/tables?backupPath=${encodeURIComponent(selectedBackupForGranular)}`);
      const data = await response.json();

      if (response.ok) {
        setAvailableTables(data.tables);
      } else {
        console.error("Failed to load available tables:", data.message);
      }
    } catch (error) {
      console.error("Error loading available tables:", error);
    }
  };

  const loadRetentionPolicy = async () => {
    try {
      // For now, use default policy. In future, load from API
      console.log("Using default retention policy");
    } catch (error) {
      console.error("Error loading retention policy:", error);
    }
  };

  const performGranularRestore = async (type: string) => {
    if (!selectedBackupForGranular) {
      showToast.error("Please select a backup file first");
      return;
    }

    try {
      const requestBody: any = {
        backupPath: selectedBackupForGranular,
        restoreType: type,
        skipTableValidation,
      };

      switch (type) {
        case "table-selective":
          if (selectedTables.length === 0) {
            showToast.error("Please select at least one table to restore");
            return;
          }
          requestBody.tables = selectedTables;
          break;
        case "column-selective":
          if (Object.keys(columnSelections).length === 0) {
            showToast.error("Please specify column selections");
            return;
          }
          requestBody.columns = columnSelections;
          break;
        case "point-in-time":
          if (!pointInTime) {
            showToast.error("Please select a point-in-time");
            return;
          }
          requestBody.pointInTime = pointInTime;
          break;
        case "conditional":
          if (!whereClause.trim()) {
            showToast.error("Please enter a WHERE clause");
            return;
          }
          requestBody.whereClause = whereClause;
          break;
      }

      onRestoreProgress(true);

      const response = await fetch("/api/backup/restore/granular", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        // Reload the page to ensure all components reconnect to the restored database
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast.error(result.message || "Granular restore failed");
      }
    } catch (error) {
      console.error("Granular restore error:", error);
      showToast.error("Failed to perform granular restore");
    } finally {
      onRestoreProgress(false);
    }
  };

  // Refresh backup list when stats change (indicating scheduled backups may have completed)
  useEffect(() => {
    if (stats) {
      loadAvailableBackups();
    }
  }, [stats?.totalBackups, stats?.lastBackup]);

  const performDatabaseBackup = async () => {
    const config = {
      name: dbBackupName,
      retentionDays: dbRetentionDays,
      compress: dbCompress,
      includeWal: dbIncludeWal,
      verifyIntegrity: dbVerifyIntegrity,
      encrypt: dbEncrypt,
    };

    await onBackup({
      type: BackupType.DATABASE,
      config,
    });
  };

  const performBackupCleanup = async (type: BackupType) => {
    await onCleanup(type, dbRetentionDays);
  };

  const loadAvailableBackups = async () => {
    try {
      const response = await fetch("/api/backup/restore");
      const data = await response.json();

      if (response.ok) {
        setAvailableBackups(data.backups);
      } else {
        console.error("Failed to load available backups:", data.message);
      }
    } catch (error) {
      console.error("Failed to load available backups:", error);
    }
  };

  const requestDatabaseRestore = (backupPath: string) => {
    setPendingRestorePath(backupPath);
    setShowRestoreConfirm(true);
  };

  const confirmDatabaseRestore = async () => {
    const backupPath = pendingRestorePath;
    setShowRestoreConfirm(false);
    onRestoreProgress(true);

    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          backupPath,
          verifyBeforeRestore: restoreVerifyBefore,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        // Reload the page to ensure all components reconnect to the restored database
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast.error(result.message || "Database restore failed");
      }
    } catch (error) {
      console.error("Database restore error:", error);
      showToast.error("Failed to restore database");
    } finally {
      onRestoreProgress(false);
      setPendingRestorePath("");
    }
  };

  const cancelDatabaseRestore = () => {
    setShowRestoreConfirm(false);
    setPendingRestorePath("");
  };

  const verifyBackup = async (backupPath: string) => {
    try {
      const response = await fetch("/api/backup/restore", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupPath }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(
          result.verification.valid
            ? "Backup verification successful!"
            : `Backup verification failed: ${result.verification.message}`
        );
      } else {
        showToast.error("Backup verification failed");
      }
    } catch (error) {
      console.error("Backup verification error:", error);
      showToast.error("Failed to verify backup");
    }
  };

  const deleteBackup = async (
    backupPath: string,
    backupName: string,
    backupSize: number
  ) => {
    setPendingBackupDelete({
      path: backupPath,
      name: backupName,
      size: backupSize,
    });
    setShowDeleteBackupConfirm(true);
  };

  const confirmDeleteBackup = async () => {
    if (!pendingBackupDelete) return;

    const { path: backupPath, name: backupName } = pendingBackupDelete;
    setShowDeleteBackupConfirm(false);

    try {
      const response = await fetch("/api/backup/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ backupPath }),
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(
          result.message || `Backup "${backupName}" deleted successfully`
        );
        loadAvailableBackups(); // Refresh the list
        onLoadStats(); // Refresh stats
      } else {
        showToast.error(result.message || "Failed to delete backup");
      }
    } catch (error) {
      console.error("Delete backup error:", error);
      showToast.error(
        `Failed to delete backup: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setPendingBackupDelete(null);
    }
  };

  const cancelDeleteBackup = () => {
    setShowDeleteBackupConfirm(false);
    setPendingBackupDelete(null);
  };

  const downloadBackup = async (backup: {
    name: string;
    path: string;
    size: number;
    created: Date;
    isCompressed: boolean;
  }) => {
    try {
      showToast.info("Preparing download...");
      const response = await fetch(
        `/api/backup/download?path=${encodeURIComponent(backup.path)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Download failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${backup.name}${backup.isCompressed ? ".sql.gz" : ".sql"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showToast.success(`Download started: ${backup.name}`);
    } catch (error) {
      console.error("Download error:", error);
      showToast.error(
        `Failed to download backup: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = [
      "application/sql",
      "application/octet-stream",
      "application/x-sql",
      "text/plain",
    ];
    const maxSize = 500 * 1024 * 1024; // 500MB

    if (
      !allowedTypes.includes(file.type) &&
      !file.name.endsWith(".sql.gz") &&
      !file.name.endsWith(".sql") &&
      !file.name.endsWith(".backup")
    ) {
      showToast.error(
        "Invalid file type. Please upload a PostgreSQL backup file (.sql, .sql.gz, or .backup)"
      );
      return;
    }

    if (file.size > maxSize) {
      showToast.error("File too large. Maximum size is 500MB");
      return;
    }

    setUploading(true);
    showToast.info(`Uploading backup file: ${file.name} (${formatBytes(file.size)})`);

    try {
      const formData = new FormData();
      formData.append("backupFile", file);
      formData.append("verifyBeforeRestore", restoreVerifyBefore.toString());

      const response = await fetch("/api/backup/restore/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        showToast.success(result.message);
        // Reload the page to ensure all components reconnect to the restored database
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        showToast.error(result.message || "File upload restore failed");
      }
    } catch (error) {
      console.error("File upload restore error:", error);
      showToast.error("Failed to upload and restore file");
    } finally {
      setUploading(false);
      // Reset file input
      const fileInput = document.getElementById("backup-upload-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (date: Date | undefined): string => {
    if (!date) return "Never";
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };



  return (
    <>
      {/* Database Backup Section */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-muted rounded-lg">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Database Backup</div>
              <div className="text-sm font-normal text-muted-foreground">
                Create and manage database backups
              </div>
            </div>
          </CardTitle>
          <div className="mt-4 pt-4 border-t border-dashed">
            <Alert className="bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
              <Cloud className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                <strong>S3 Storage Available:</strong> System backups are stored securely outside the active project folder <code>(../)</code>.
              </AlertDescription>
            </Alert>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Create Backup Section */}
            <div className="space-y-4 border-r pr-4">
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-bold text-foreground">Manual Backup Creation</h3>
                <p className="text-xs text-muted-foreground">Create a backup snapshot immediately</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-name" className="text-sm font-medium">
                  Backup Name
                </Label>
                <Input
                  id="db-name"
                  value={dbBackupName}
                  onChange={(e) => setDbBackupName(e.target.value)}
                  placeholder="e.g., smartrack-database-backup"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Choose a descriptive name for your backup
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">Backup Options</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={dbCompress}
                      onChange={(e) => setDbCompress(e.target.checked)}
                      className="rounded border-muted-foreground"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-xs">Compress</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={dbIncludeWal}
                      onChange={(e) => setDbIncludeWal(e.target.checked)}
                      className="rounded border-muted-foreground"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-xs">Include WAL</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={dbVerifyIntegrity}
                      onChange={(e) => setDbVerifyIntegrity(e.target.checked)}
                      className="rounded border-muted-foreground"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-xs">Verify</div>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={dbEncrypt}
                      onChange={(e) => setDbEncrypt(e.target.checked)}
                      className="rounded border-muted-foreground"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-xs">Encrypt</div>
                    </div>
                  </label>
                </div>
              </div>

              <Button
                onClick={performDatabaseBackup}
                disabled={backupInProgress}
                size="lg"
                className="w-full h-11 mt-4"
              >
                {backupInProgress ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Database className="h-4 w-4 mr-2" />
                )}
                {backupInProgress
                  ? "Creating Backup..."
                  : "Create Database Backup"}
              </Button>
            </div>

            {/* Retention Settings Section */}
            <div className="space-y-4 pl-2">
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-bold text-foreground">Backup Lifecycle settings</h3>
                <p className="text-xs text-muted-foreground">Configure global retention policy</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="db-retention" className="text-sm font-medium">
                  Default Retention Period (Days)
                </Label>
                <Input
                  id="db-retention"
                  type="number"
                  value={dbRetentionDays}
                  onChange={(e) => setDbRetentionDays(Number(e.target.value))}
                  min="1"
                  max="365"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground leading-tight">
                  Days to keep backups before auto-deletion. <br />
                  This setting applies globally to your system's database backup routines.
                </p>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  if (onRetentionDaysChange) onRetentionDaysChange(dbRetentionDays);
                  showToast.success("Retention configuration saved!");
                }}
                className="w-full h-11 mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Clock className="h-4 w-4 mr-2" />
                Save Retention Settings
              </Button>
            </div>
          </div>

          {/* The create button and options have been moved to the grid above */}

        </CardContent>
      </Card>

      {/* Database Restore Section */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-muted rounded-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Database Restore</div>
              <div className="text-sm font-normal text-muted-foreground">
                Restore database from available backup files
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Critical Warning */}
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-sm text-red-800 dark:text-red-200">
              <span className="font-semibold">Critical Warning:</span> Restoring
              the database will{" "}
              <span className="font-medium underline">
                completely overwrite all current data
              </span>
              . Always create a backup before proceeding to prevent irreversible
              data loss.
            </AlertDescription>
          </Alert>

          {/* Restore Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Restore Options</Label>
            <label className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors">
              <input
                type="checkbox"
                checked={restoreVerifyBefore}
                onChange={(e) => setRestoreVerifyBefore(e.target.checked)}
                className="rounded border-muted-foreground"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">
                  Verify Backup Integrity
                </div>
                <div className="text-xs text-muted-foreground">
                  Check backup file validity before starting restore process
                </div>
              </div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </label>
          </div>

          {/* Upload and Refresh Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={() => document.getElementById('backup-upload-input')?.click()}
              variant="outline"
              className="gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {uploading ? "Uploading..." : "Upload Backup"}
            </Button>
            <Button
              onClick={loadAvailableBackups}
              variant="outline"
              disabled={uploading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Backup List
            </Button>
          </div>

          {/* Hidden file input for backup upload */}
          <input
            id="backup-upload-input"
            type="file"
            accept=".sql,.sql.gz,.backup"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {/* Available Backups */}
          {availableBackups.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">
                  Available Database Backups ({availableBackups.length})
                </h4>
                <Badge variant="secondary" className="text-xs">
                  {availableBackups.length} backup
                  {availableBackups.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="space-y-3 max-h-80 overflow-y-auto border rounded-lg p-4 bg-muted/20">
                {availableBackups.map((backup, index) => (
                  <div
                    key={backup.path}
                    className="flex items-center justify-between p-4 bg-background border rounded-lg hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Database className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">
                              {backup.name}
                            </span>
                            {backup.isCompressed && (
                              <Badge
                                variant="secondary"
                                className="text-xs shrink-0"
                              >
                                Compressed
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Size:</span>{" "}
                              {formatBytes(backup.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="font-medium">Created:</span>{" "}
                              {formatDate(backup.created)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => downloadBackup(backup)}
                        className="h-8 px-3"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => verifyBackup(backup.path)}
                        className="h-8 px-3"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          deleteBackup(backup.path, backup.name, backup.size)
                        }
                        className="h-8 px-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => requestDatabaseRestore(backup.path)}
                        disabled={restoreInProgress}
                        className="h-8 px-3 bg-green-600 hover:bg-green-700"
                      >
                        {restoreInProgress ? (
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Restore
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed border-muted-foreground/25 rounded-lg">
              <h3 className="text-lg font-medium mb-2">
                No Database Backups Available
              </h3>
              <p className="text-sm mb-4">
                Create your first database backup to see it listed here
              </p>
            </div>
          )}

          {/* Clean All Restore Backup Button */}
          <div className="flex justify-end pt-4 border-t">
            <Button
              onClick={() => performBackupCleanup(BackupType.DATABASE)}
              variant="destructive"
              disabled={cleanupInProgress || availableBackups.length === 0}
              size="lg"
              className="gap-2"
            >
              {cleanupInProgress ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {cleanupInProgress ? "Cleaning..." : "Clean All Restore Backup"}
            </Button>
          </div>
        </CardContent>
      </Card>



      {/* Auto Cleanup Retention Settings */}
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-lg">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold">Auto Cleanup Settings</div>
              <div className="text-sm font-normal text-muted-foreground">
                Automatic retention policy management
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Retention Policy Explanation */}
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>What is Auto Cleanup?</strong> The system will automatically delete older backup files based on age categories to free up storage space. <br />
              Backups will be retained according to intelligent prioritization (Full {"\u003e"} Incremental {"\u003e"} Differential) to ensure you always have a safe restore point without exhausting your server's disk space.
            </AlertDescription>
          </Alert>

          {/* Retention Categories Display */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Retention Categories Strategy</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-sm">Daily (0-30 days)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Max 30 recent backups kept.</p>
                <p className="text-xs text-muted-foreground">Priority: Full &gt; Incremental &gt; Differential</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-sm">Weekly (30-210 days)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Max 4 backups (1 per week) kept.</p>
                <p className="text-xs text-muted-foreground">Chosen based on priority score.</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="font-medium text-sm">Monthly (210-900 days)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Max 12 backups (1 per month) kept.</p>
                <p className="text-xs text-muted-foreground">Optimal for long-term recovery.</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span className="font-medium text-sm">Yearly (900+ days)</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Max 1 backup per year kept.</p>
                <p className="text-xs text-muted-foreground">Retained for audit and compliance.</p>
              </div>
            </div>
          </div>

          {/* Auto Cleanup Settings */}
          <div className="border-t pt-4">
            <Label className="text-sm font-medium mb-3 block">Auto Cleanup Configuration</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cleanup-schedule" className="text-sm font-medium">
                  Cleanup Schedule
                </Label>
                <Select
                  value={retentionPolicy.cleanupSchedule}
                  onValueChange={(value: "daily" | "weekly" | "monthly") =>
                    setRetentionPolicy({ ...retentionPolicy, cleanupSchedule: value })
                  }
                >
                  <SelectTrigger id="cleanup-schedule" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (Every day at 2 AM)</SelectItem>
                    <SelectItem value="weekly">Weekly (Every Sunday at 2 AM)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st of month at 2 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cleanup-time" className="text-sm font-medium">
                  Cleanup Time
                </Label>
                <Input
                  id="cleanup-time"
                  type="time"
                  value={retentionPolicy.cleanupTime}
                  onChange={(e) => setRetentionPolicy({ ...retentionPolicy, cleanupTime: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors mt-3">
              <input
                type="checkbox"
                checked={retentionPolicy.autoCleanup}
                onChange={(e) => setRetentionPolicy({ ...retentionPolicy, autoCleanup: e.target.checked })}
                className="rounded border-muted-foreground"
              />
              <div className="flex-1">
                <div className="font-medium text-sm">Enable Auto Cleanup</div>
                <div className="text-xs text-muted-foreground">
                  Automatically clean old backups based on retention policy
                </div>
              </div>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex justify-end pt-4 border-t gap-2">
            <Button
              onClick={() => showToast.success("Auto Cleanup settings saved successfully")}
              variant="default"
              size="sm"
            >
              Save Settings
            </Button>
            <Button
              onClick={() => performBackupCleanup(BackupType.DATABASE)}
              variant="outline"
              disabled={cleanupInProgress || availableBackups.length === 0}
              size="sm"
              className="gap-2"
            >
              {cleanupInProgress ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {cleanupInProgress ? "Running Cleanup..." : "Run Manual Cleanup"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmationDialog
        open={showRestoreConfirm}
        onOpenChange={setShowRestoreConfirm}
        type="destructive"
        title="Database Restore Confirmation"
        description={`WARNING: This action will replace the entire current database with the selected backup. This action cannot be undone and will temporarily disconnect all users.

Are you sure you want to proceed?`}
        confirmText="Yes, Restore Database"
        cancelText="Cancel"
        onConfirm={confirmDatabaseRestore}
        onCancel={cancelDatabaseRestore}
      />

      {/* Delete Backup Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteBackupConfirm}
        onOpenChange={setShowDeleteBackupConfirm}
        type="destructive"
        title="Delete Backup File"
        description={`Are you sure you want to delete this backup?\n\nBackup: ${pendingBackupDelete?.name
          }\nSize: ${pendingBackupDelete ? formatBytes(pendingBackupDelete.size) : ""
          }\n\nThis action cannot be undone and the backup file will be permanently removed.`}
        confirmText="Yes, Delete Backup"
        cancelText="Cancel"
        onConfirm={confirmDeleteBackup}
        onCancel={cancelDeleteBackup}
      />

      {/* Cleanup Progress Dialog */}
      <ConfirmationDialog
        open={cleanupInProgress}
        onOpenChange={() => { }} // Prevent closing by clicking outside
        type="info"
        title="Cleaning Up Backups"
        description="Please wait while we clean up old backup files based on retention policies. This may take a few moments..."
        confirmText=""
        cancelText=""
        onConfirm={() => { }} // No action needed for loading dialog
        onCancel={() => { }} // No action needed for loading dialog
      />
    </>
  );
}
