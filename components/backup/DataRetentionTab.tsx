"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { showToast } from "@/lib/toast-utils";

// Icons
import {
  HardDrive,
  Database,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
  Clock,
  Shield,
  Archive,
  Trash2,
  BarChart3,
  Settings,
  Zap,
  Calendar,
  FileText,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
} from "lucide-react";

interface DataLimits {
  loggedData: number;
  alarmLog: number;
  alarmNotificationRecipient: number;
  notification: number;
}

interface DataUsage {
  loggedData: {
    current: number;
    limit: number;
    percentage: number;
    status: string;
  };
  alarmLog: {
    current: number;
    limit: number;
    percentage: number;
    status: string;
  };
  alarmNotificationRecipient: {
    current: number;
    limit: number;
    percentage: number;
    status: string;
  };
  notification: {
    current: number;
    limit: number;
    percentage: number;
    status: string;
  };
}

interface RetentionPolicy {
  id: string;
  name: string;
  type: 'data_cleanup' | 'backup_retention' | 'archive_policy';
  enabled: boolean;
  schedule: 'daily' | 'weekly' | 'monthly';
  retentionDays: number;
  priority: 'low' | 'medium' | 'high';
  lastExecuted?: Date;
  nextExecution?: Date;
  rules: RetentionRule[];
}

interface RetentionRule {
  tableName: string;
  condition: string;
  action: 'delete' | 'archive' | 'compress';
  priority: number;
}

interface DataRetentionTabProps {
  dataLimits: DataLimits;
  dataUsage: DataUsage | null;
  savingLimits: boolean;
  loadingLimits: boolean;
  onLoadLimits: () => Promise<void>;
  onSaveLimits: (limits: DataLimits) => Promise<void>;
}

export function DataRetentionTab({
  dataLimits,
  dataUsage,
  savingLimits,
  loadingLimits,
  onLoadLimits,
  onSaveLimits,
}: DataRetentionTabProps) {
  // Enhanced status color scheme with more granular levels
  const getStatusColor = (percentage: number): string => {
    if (percentage >= 95) return "text-red-600 dark:text-red-400"; // Critical
    if (percentage >= 85) return "text-orange-600 dark:text-orange-400"; // Warning
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-500"; // Caution
    if (percentage >= 50) return "text-blue-600 dark:text-blue-400"; // Moderate
    return "text-green-600 dark:text-green-400"; // Good
  };

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 95)
      return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
    if (percentage >= 85)
      return <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    if (percentage >= 70)
      return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />;
    if (percentage >= 50)
      return <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
    return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
  };

  const [localLimits, setLocalLimits] = useState<DataLimits>(dataLimits);


  // Data lifecycle management
  const [lifecycleRules, setLifecycleRules] = useState([
    {
      id: '1',
      name: 'Sensor Data Lifecycle',
      tableName: 'loggedData',
      stages: [
        { phase: 'active', retentionDays: 30, action: 'keep' },
        { phase: 'archive', retentionDays: 180, action: 'compress' },
        { phase: 'delete', retentionDays: 365, action: 'remove' },
      ],
      enabled: true,
    },
    {
      id: '2',
      name: 'Alarm History Lifecycle',
      tableName: 'alarmLog',
      stages: [
        { phase: 'active', retentionDays: 90, action: 'keep' },
        { phase: 'archive', retentionDays: 270, action: 'compress' },
        { phase: 'delete', retentionDays: 730, action: 'remove' },
      ],
      enabled: true,
    },
  ]);

  // Update local limits when props change
  useEffect(() => {
    setLocalLimits(dataLimits);
  }, [dataLimits]);



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

  const resetToDefaults = () => {
    setLocalLimits({
      loggedData: 500000,
      alarmLog: 500000,
      alarmNotificationRecipient: 500000,
      notification: 500000,
    });
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const handleSaveLimits = async () => {
    await onSaveLimits(localLimits);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Archive className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="font-semibold">Data Retention Management</div>
              <div className="text-sm font-normal text-muted-foreground">
                Comprehensive data lifecycle management with automated retention policies
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
            <Shield className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Intelligent Data Management:</strong> Automated retention policies ensure optimal storage utilization while maintaining compliance and data accessibility.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Main Content Sections - Stacked Instead of Tabbed */}
      <div className="space-y-8 mt-6">
        {/* Overview Section */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Retention Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Retention Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">2</div>
                    <div className="text-sm text-muted-foreground">Active Time Policies</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">4</div>
                    <div className="text-sm text-muted-foreground">Active Row Limits</div>
                  </div>
                  <div className="col-span-2 text-center p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {dataUsage ? formatNumber(Object.values(dataUsage).reduce((acc, val) => acc + val.current, 0)) : "0"}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Managed Rows</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Usage Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataUsage && (
                  <div className="space-y-3">
                    {Object.entries(dataUsage).map(([key, usage]) => (
                      <div key={key} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <span className={`text-sm font-bold ${getStatusColor(usage.percentage)}`}>
                            {usage.percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${usage.percentage >= 95 ? 'bg-red-500' :
                              usage.percentage >= 85 ? 'bg-orange-500' :
                                usage.percentage >= 70 ? 'bg-yellow-500' :
                                  usage.percentage >= 50 ? 'bg-blue-500' : 'bg-green-500'
                              }`}
                            style={{ width: `${Math.min(usage.percentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(usage.current)} / {formatNumber(usage.limit)} rows
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Recent Retention Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No recent retention activity</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>


        {/* Data Lifecycle Section */}
        <div className="space-y-6 mt-6 border-t pt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Data Lifecycle Management
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Define multi-stage lifecycle policies for different data types
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Lifecycle Rules */}
              <div className="space-y-4">
                {lifecycleRules.map((rule) => (
                  <div key={rule.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-3 h-3 rounded-full ${rule.enabled ? "bg-green-500" : "bg-gray-400"
                            }`}
                        />
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Table: {rule.tableName}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rule.enabled ? "default" : "secondary"}>
                          {rule.enabled ? "Active" : "Disabled"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setLifecycleRules(prev =>
                              prev.map(r =>
                                r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                              )
                            );
                          }}
                        >
                          {rule.enabled ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>

                    {/* Lifecycle Stages */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {rule.stages.map((stage, index) => (
                        <div
                          key={stage.phase}
                          className={`p-3 rounded-lg border-2 ${stage.phase === 'active'
                            ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20'
                            : stage.phase === 'archive'
                              ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20'
                              : 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20'
                            }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {stage.phase === 'active' && <CheckCircle className="h-4 w-4 text-green-600" />}
                            {stage.phase === 'archive' && <Archive className="h-4 w-4 text-yellow-600" />}
                            {stage.phase === 'delete' && <Trash2 className="h-4 w-4 text-red-600" />}
                            <span className="font-medium capitalize text-sm">{stage.phase}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <div>Retention: {stage.retentionDays} days</div>
                            <div>Action: {stage.action}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Data Lifecycle Stages:</strong>
                  <ul className="mt-2 space-y-1">
                    <li>• <strong>Active:</strong> Data is actively used and kept in primary storage</li>
                    <li>• <strong>Archive:</strong> Data is compressed and moved to cheaper storage</li>
                    <li>• <strong>Delete:</strong> Data is permanently removed after retention period</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Data Limits Section */}
        <div className="space-y-6 mt-6 border-t pt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Data Limits Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Set maximum row limits for database tables to maintain performance
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These settings control the maximum number of rows allowed in each table.
                  When limits are exceeded, older data will be automatically cleaned up to maintain system performance.
                </AlertDescription>
              </Alert>

              <div className="space-y-6">
                {/* LoggedData Limit */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Database className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium">LoggedData Table</h4>
                        <p className="text-sm text-muted-foreground">
                          Sensor and device logging data with timestamps
                        </p>
                        {dataUsage && (
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusIcon(dataUsage.loggedData.percentage)}
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                dataUsage.loggedData.percentage
                              )}`}
                            >
                              {formatNumber(dataUsage.loggedData.current)} /{" "}
                              {formatNumber(dataUsage.loggedData.limit)} rows (
                              {dataUsage.loggedData.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Label
                        htmlFor="logged-data-limit"
                        className="text-sm font-medium"
                      >
                        Max Rows
                      </Label>
                      <Input
                        id="logged-data-limit"
                        type="number"
                        value={localLimits.loggedData}
                        onChange={(e) =>
                          setLocalLimits((prev) => ({
                            ...prev,
                            loggedData: Number(e.target.value),
                          }))
                        }
                        className="w-24 mt-1"
                        min="1000"
                        max="10000000"
                      />
                    </div>
                  </div>
                </div>

                {/* AlarmLog Limit */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600" />
                      <div>
                        <h4 className="font-medium">AlarmLog Table</h4>
                        <p className="text-sm text-muted-foreground">
                          Alarm events and notifications history
                        </p>
                        {dataUsage && (
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusIcon(dataUsage.alarmLog.percentage)}
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                dataUsage.alarmLog.percentage
                              )}`}
                            >
                              {formatNumber(dataUsage.alarmLog.current)} /{" "}
                              {formatNumber(dataUsage.alarmLog.limit)} rows (
                              {dataUsage.alarmLog.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Label
                        htmlFor="alarm-log-limit"
                        className="text-sm font-medium"
                      >
                        Max Rows
                      </Label>
                      <Input
                        id="alarm-log-limit"
                        type="number"
                        value={localLimits.alarmLog}
                        onChange={(e) =>
                          setLocalLimits((prev) => ({
                            ...prev,
                            alarmLog: Number(e.target.value),
                          }))
                        }
                        className="w-24 mt-1"
                        min="100"
                        max="10000000"
                      />
                    </div>
                  </div>
                </div>

                {/* AlarmNotificationRecipient Limit */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-purple-600" />
                      <div>
                        <h4 className="font-medium">
                          AlarmNotificationRecipient Table
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Alarm notification recipient configurations
                        </p>
                        {dataUsage && (
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusIcon(
                              dataUsage.alarmNotificationRecipient.percentage
                            )}
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                dataUsage.alarmNotificationRecipient.percentage
                              )}`}
                            >
                              {formatNumber(
                                dataUsage.alarmNotificationRecipient.current
                              )}{" "}
                              /{" "}
                              {formatNumber(
                                dataUsage.alarmNotificationRecipient.limit
                              )}{" "}
                              rows (
                              {dataUsage.alarmNotificationRecipient.percentage.toFixed(
                                1
                              )}
                              %)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Label
                        htmlFor="alarm-notification-recipient-limit"
                        className="text-sm font-medium"
                      >
                        Max Rows
                      </Label>
                      <Input
                        id="alarm-notification-recipient-limit"
                        type="number"
                        value={localLimits.alarmNotificationRecipient}
                        onChange={(e) =>
                          setLocalLimits((prev) => ({
                            ...prev,
                            alarmNotificationRecipient: Number(e.target.value),
                          }))
                        }
                        className="w-24 mt-1"
                        min="10"
                        max="10000000"
                      />
                    </div>
                  </div>
                </div>

                {/* Notification Limit */}
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Info className="h-5 w-5 text-green-600" />
                      <div>
                        <h4 className="font-medium">Notification Table</h4>
                        <p className="text-sm text-muted-foreground">
                          User notifications and system messages
                        </p>
                        {dataUsage && (
                          <div className="flex items-center gap-2 mt-2">
                            {getStatusIcon(dataUsage.notification.percentage)}
                            <span
                              className={`text-sm font-medium ${getStatusColor(
                                dataUsage.notification.percentage
                              )}`}
                            >
                              {formatNumber(dataUsage.notification.current)} /{" "}
                              {formatNumber(dataUsage.notification.limit)} rows (
                              {dataUsage.notification.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <Label
                        htmlFor="notification-limit"
                        className="text-sm font-medium"
                      >
                        Max Rows
                      </Label>
                      <Input
                        id="notification-limit"
                        type="number"
                        value={localLimits.notification}
                        onChange={(e) =>
                          setLocalLimits((prev) => ({
                            ...prev,
                            notification: Number(e.target.value),
                          }))
                        }
                        className="w-24 mt-1"
                        min="50"
                        max="10000000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={resetToDefaults}>
                  Reset to Defaults
                </Button>
                <Button onClick={handleSaveLimits} disabled={savingLimits}>
                  {savingLimits ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Save Limits
                    </>
                  )}
                </Button>
              </div>

              {/* Information Section */}
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong>How it works:</strong>
                </p>
                <ul className="list-disc list-inside space-y-1 ml-4">
                  <li>
                    LoggedData: Automatically cleaned when exceeding the row limit
                    (oldest first)
                  </li>
                  <li>
                    AlarmLog: Maintains alarm history while preventing unlimited
                    growth
                  </li>
                  <li>Notification: Keeps recent notifications for user reference</li>
                </ul>
                <p className="mt-2">
                  <strong>Note:</strong> These limits are enforced during data cleanup
                  operations and do not affect existing data immediately.
                </p>
              </div>

              {/* Current Usage Summary */}
              {dataUsage && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Current Usage Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div
                        className={`font-bold ${getStatusColor(
                          dataUsage.loggedData.percentage
                        )}`}
                      >
                        {dataUsage.loggedData.percentage.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">LoggedData</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`font-bold ${getStatusColor(
                          dataUsage.alarmLog.percentage
                        )}`}
                      >
                        {dataUsage.alarmLog.percentage.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">AlarmLog</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`font-bold ${getStatusColor(
                          dataUsage.alarmNotificationRecipient.percentage
                        )}`}
                      >
                        {dataUsage.alarmNotificationRecipient.percentage.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">Recipients</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`font-bold ${getStatusColor(
                          dataUsage.notification.percentage
                        )}`}
                      >
                        {dataUsage.notification.percentage.toFixed(1)}%
                      </div>
                      <div className="text-muted-foreground">Notifications</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
