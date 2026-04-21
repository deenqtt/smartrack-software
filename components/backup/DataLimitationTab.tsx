"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { showToast } from "@/lib/toast-utils";

// Icons
import {
  HardDrive,
  Database,
  AlertTriangle,
  Info,
  CheckCircle,
  RefreshCw,
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

interface DataLimitationTabProps {
  dataLimits: DataLimits;
  dataUsage: DataUsage | null;
  savingLimits: boolean;
  loadingLimits: boolean;
  onLoadLimits: () => Promise<void>;
  onSaveLimits: (limits: DataLimits) => Promise<void>;
}

export function DataLimitationTab({
  dataLimits,
  dataUsage,
  savingLimits,
  loadingLimits,
  onLoadLimits,
  onSaveLimits,
}: DataLimitationTabProps) {
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

  const getStatusBadge = (percentage: number) => {
    if (percentage >= 95) return { variant: "destructive" as const, text: "Critical" };
    if (percentage >= 85) return { variant: "secondary" as const, text: "Warning" };
    if (percentage >= 70) return { variant: "outline" as const, text: "Caution" };
    if (percentage >= 50) return { variant: "outline" as const, text: "Moderate" };
    return { variant: "default" as const, text: "Good" };
  };
  const [localLimits, setLocalLimits] = useState<DataLimits>(dataLimits);

  // Update local limits when props change
  useEffect(() => {
    setLocalLimits(dataLimits);
  }, [dataLimits]);

  const handleSaveLimits = async () => {
    await onSaveLimits(localLimits);
  };

  const resetToDefaults = () => {
    setLocalLimits({
      loggedData: 100000,
      alarmLog: 50000,
      alarmNotificationRecipient: 1000,
      notification: 10000,
    });
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="h-5 w-5" />
          Data Limitation Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Configure maximum row limits for database tables to maintain
          performance and storage efficiency
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            These settings control the maximum number of rows allowed in each
            table. When limits are exceeded, older data will be automatically
            cleaned up to maintain system performance.
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
                  max="1000000"
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
                  max="100000"
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
                  max="10000"
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
                  max="50000"
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
  );
}
