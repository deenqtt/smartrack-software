"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/lib/toast-utils";

// Dialog and Input components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Icons
import {
  Database,
  Server,
  FileText,
  FileDown,
  RefreshCw,
  AlertTriangle,
  Lock,
  Shield,
} from "lucide-react";

interface DatabaseAnalysis {
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

interface DatabaseAnalyzerTabProps {
  analysisLoading: boolean;
  dbAnalysis: DatabaseAnalysis | null;
  onAnalyze: () => Promise<void>;
  onCancel?: () => void;
}

export function DatabaseAnalyzerTab({
  analysisLoading,
  dbAnalysis,
  onAnalyze,
  onCancel,
}: DatabaseAnalyzerTabProps) {
  const [showPasswordDialog, setShowPasswordDialog] = useState(true);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const CORRECT_PASSWORD = "IOT@1868";

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordDialog(false);
      setPasswordError("");
    } else {
      setPasswordError("Incorrect password. Please try again.");
      setPassword("");
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

  const handleTableExport = async (
    tableName: string,
    format: "csv" | "json" = "csv"
  ) => {
    try {
      const response = await fetch("/api/backup/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tableName,
          format,
          limit: 10000, // Limit for performance
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Export failed");
      }

      if (format === "csv") {
        // For CSV, download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${tableName}_export_${new Date().toISOString().split("T")[0]
          }.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast.success(`Table ${tableName} exported successfully!`);
      } else {
        // For JSON, handle as data
        const data = await response.json();
        showToast.success(`Table ${tableName} exported successfully!`);
        console.log("Export data:", data);
      }
    } catch (error) {
      console.error(`Export error for table ${tableName}:`, error);
      showToast.error(`Failed to export table ${tableName}`);
    }
  };

  const handleGenerateReport = async () => {
    try {
      showToast.info("Generating backup report...");

      const response = await fetch("/api/backup/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "summary",
          periodType: "monthly",
          format: "pdf",
          generatedBy: "user",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Report generation failed");
      }

      // The response will be a file download, so we don't need to handle the data
      showToast.success("Report generated and download started!");
    } catch (error) {
      console.error("Report generation error:", error);
      showToast.error(
        `Failed to generate report: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  const handleExportAllCSV = async () => {
    try {
      showToast.info("Exporting all database tables...");

      const response = await fetch("/api/backup/export-all", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          limit: 50000, // Limit per table for performance
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Export all failed");
      }

      // The response will be a ZIP file download, so we don't need to handle the data
      showToast.success("Export completed and download started!");
    } catch (error) {
      console.error("Export all error:", error);
      showToast.error(
        `Failed to export all tables: ${error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  // Show password dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {/* Password Protection Dialog */}
        <Dialog
          open={showPasswordDialog}
          onOpenChange={(open) => {
            if (!open) {
              setShowPasswordDialog(false);
              if (onCancel) onCancel();
            }
          }}
        >
          <DialogContent className="max-w-md">
            <DialogHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="text-xl">Database Analyzer Access</DialogTitle>
              <DialogDescription>
                This feature requires authentication. Please enter the password to access database analysis tools.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="analyzer-password">Password</Label>
                <Input
                  id="analyzer-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password..."
                  className="text-center text-lg font-mono"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {passwordError}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg">
                <Lock className="h-4 w-4 mr-2" />
                Access Database Analyzer
              </Button>
            </form>

            <div className="text-center text-xs text-muted-foreground">
              <p>Contact administrator for access credentials</p>
            </div>
          </DialogContent>
        </Dialog>

        {/* Protected Content Placeholder */}
        <Card className="opacity-70 mt-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Database Analyzer
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Analyze database structure, table sizes, and data distribution
            </p>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center mb-6">
              <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium">Access Restricted</p>
              <p className="text-sm text-muted-foreground">
                Authentication required to view database analysis
              </p>
            </div>
            <Button onClick={() => setShowPasswordDialog(true)} variant="default">
              <Lock className="h-4 w-4 mr-2" />
              Authenticate
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  // Main analyzer content (only shown when authenticated)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Database Analyzer
          <Badge variant="secondary" className="ml-2">
            <Shield className="h-3 w-3 mr-1" />
            Authenticated
          </Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Analyze database structure, table sizes, and data distribution
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={onAnalyze} disabled={analysisLoading}>
          {analysisLoading ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <>
              <Database className="h-4 w-4 mr-2" />
              Analyze Database
            </>
          )}
        </Button>

        {dbAnalysis && (
          <div className="space-y-4">
            {/* Summary Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {dbAnalysis.summary.totalTables}
                </div>
                <div className="text-sm text-muted-foreground">
                  Total Tables
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {dbAnalysis.summary.totalRows.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {formatBytes(dbAnalysis.summary.totalSizeBytes)}
                </div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
            </div>

            {/* Database File Information */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Database Information:</h4>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>
                  <strong>Path:</strong> {dbAnalysis.summary.databasePath}
                </p>
                <p>
                  <strong>Created:</strong>{" "}
                  {formatDate(dbAnalysis.summary.createdDate)}
                </p>
                <p>
                  <strong>Last Modified:</strong>{" "}
                  {formatDate(dbAnalysis.summary.lastModified)}
                </p>
              </div>
            </div>

            {/* Table Details with Export Options */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Table Details:</h4>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleGenerateReport}
                  >
                    <FileText className="h-3 w-3" />
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleExportAllCSV}
                  >
                    <FileDown className="h-3 w-3" />
                    Export All CSV
                  </Button>
                </div>
              </div>
              <div className="text-xs text-muted-foreground border border-blue-200 rounded p-2">
                <Database className="h-3 w-3 inline mr-1 text-blue-600" />
                <strong>Progress Bar Explanation:</strong> Bars show each table's
                size as a percentage of the total{" "}
                <strong>database size.</strong> Longer bars indicate tables that{" "}
                <strong>
                  use more storage space.
                </strong>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {dbAnalysis.tableStats.map((table) => (
                  <div
                    key={table.tableName}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        {table.tableName}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Rows: {table.rowCount.toLocaleString()} | Size:{" "}
                        {formatBytes(table.sizeBytes)} | Last Modified:{" "}
                        {formatDate(table.lastModified)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Progress bar for size visualization */}
                      <div className="w-20">
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{
                              width: `${Math.min(
                                (table.sizeBytes /
                                  dbAnalysis.summary.totalSizeBytes) *
                                100,
                                100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                      {/* Export button for individual table */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleTableExport(table.tableName, "csv")
                        }
                        className="gap-1"
                      >
                        <FileDown className="h-3 w-3" />
                        CSV
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!dbAnalysis && !analysisLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Click "Analyze Database" to view detailed statistics</p>
            <p className="text-xs mt-1">
              Get insights into your database structure and usage
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
