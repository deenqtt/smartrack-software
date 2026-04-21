"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Icons
import {
  Clock,
  RefreshCw,
  Trash2,
  Download,
  AlertTriangle,
  Shield,
  Cloud,
} from "lucide-react";

interface BackupSchedule {
  id: string;
  name: string;
  type: string;
  frequency: string;
  time: string;
  daysOfWeek?: number[];
  daysOfMonth?: number[];
  config: any;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  destinationId?: string;
  encrypt?: boolean;
  retentionPolicy?: any;
}

interface ScheduleStats {
  totalSchedules: number;
  activeSchedules: number;
  runningCount: number;
  lastExecution?: Date;
  nextExecution?: Date;
}

interface ScheduleManagerTabProps {
  schedules: BackupSchedule[];
  scheduleStats: ScheduleStats | null;
  schedulerLoading: boolean;
  onLoadSchedules: () => Promise<void>;
  onCreateSchedule: (scheduleData: any) => Promise<void>;
  onUpdateSchedule: (scheduleId: string, updates: any) => Promise<void>;
  onDeleteSchedule: (scheduleId: string, scheduleName: string) => Promise<void>;
  onToggleSchedule: (
    scheduleId: string,
    currentEnabled: boolean
  ) => Promise<void>;
  onExecuteNow: (scheduleId: string, scheduleName: string) => Promise<void>;
}

export function ScheduleManagerTab({
  schedules,
  scheduleStats,
  schedulerLoading,
  onLoadSchedules,
  onCreateSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onToggleSchedule,
  onExecuteNow,
}: ScheduleManagerTabProps) {
  const [showCreateSchedule, setShowCreateSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [showEditSchedule, setShowEditSchedule] = useState(false);

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

  const handleCreateSchedule = async (scheduleData: any) => {
    await onCreateSchedule(scheduleData);
    setShowCreateSchedule(false);
  };

  const handleUpdateSchedule = async (scheduleId: string, updates: any) => {
    await onUpdateSchedule(scheduleId, updates);
    setShowEditSchedule(false);
    setEditingSchedule(null);
  };

  const handleDeleteSchedule = async (
    scheduleId: string,
    scheduleName: string
  ) => {
    await onDeleteSchedule(scheduleId, scheduleName);
  };

  const handleToggleSchedule = async (
    scheduleId: string,
    currentEnabled: boolean
  ) => {
    await onToggleSchedule(scheduleId, currentEnabled);
  };

  const handleExecuteNow = async (scheduleId: string, scheduleName: string) => {
    await onExecuteNow(scheduleId, scheduleName);
  };

  const handleSchemaAnalysis = () => {
    alert(
      "Schema Analysis feature is coming soon. This will allow you to compare database schemas between current state and backup files."
    );
  };

  const handleSelectiveRestore = () => {
    alert(
      "Selective Restore feature is coming soon. This will allow you to restore specific tables from backup files."
    );
  };

  const handlePointInTimeRestore = () => {
    alert(
      "Point-in-Time Restore feature is coming soon. This will allow you to restore the database to a specific point in time."
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Schedule Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Manage automated backup schedules with cron-based execution
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Schedule Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {scheduleStats?.totalSchedules || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Schedules
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {scheduleStats?.activeSchedules || 0}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Schedules
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {scheduleStats?.runningCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Running Now</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {scheduleStats?.nextExecution
                  ? formatDate(scheduleStats.nextExecution)
                  : "Never"}
              </div>
              <div className="text-xs">Next Execution</div>
            </div>
          </div>

          {/* Create New Schedule Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Backup Schedules</h3>
            <div className="flex gap-2">
              <Button
                onClick={onLoadSchedules}
                variant="outline"
                disabled={schedulerLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${schedulerLoading ? "animate-spin" : ""
                    }`}
                />
                Refresh
              </Button>
              <Button
                onClick={() => setShowCreateSchedule(true)}
                className="gap-2"
                disabled={schedulerLoading}
              >
                <Clock className="h-4 w-4" />
                Create Schedule
              </Button>
            </div>
          </div>

          {/* Schedules List */}
          <div className="space-y-3">
            {schedulerLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : schedules.length > 0 ? (
              schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${schedule.enabled ? "bg-green-500" : "bg-gray-400"
                          }`}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{schedule.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {schedule.frequency.toUpperCase()}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {schedule.time}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Type: {schedule.type} | Next Run:{" "}
                          {formatDate(schedule.nextRun)} | Last Run:{" "}
                          {formatDate(schedule.lastRun)}
                        </div>
                        {schedule.frequency === "weekly" &&
                          schedule.daysOfWeek && (
                            <div className="text-xs text-muted-foreground">
                              Days:{" "}
                              {schedule.daysOfWeek
                                .map(
                                  (d) =>
                                    [
                                      "Sun",
                                      "Mon",
                                      "Tue",
                                      "Wed",
                                      "Thu",
                                      "Fri",
                                      "Sat",
                                    ][d]
                                )
                                .join(", ")}
                            </div>
                          )}
                        {schedule.frequency === "monthly" &&
                          schedule.daysOfMonth && (
                            <div className="text-xs text-muted-foreground">
                              Day: {schedule.daysOfMonth[0]} of each month
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={schedule.enabled ? "outline" : "default"}
                      onClick={() =>
                        handleToggleSchedule(schedule.id, schedule.enabled)
                      }
                      disabled={schedulerLoading}
                    >
                      {schedule.enabled ? "Pause" : "Resume"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingSchedule(schedule);
                        setShowEditSchedule(true);
                      }}
                      disabled={schedulerLoading}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      onClick={() =>
                        handleExecuteNow(schedule.id, schedule.name)
                      }
                      disabled={schedulerLoading}
                      title="Force backup execution immediately bypassing schedule"
                    >
                      Instant Backup
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() =>
                        handleDeleteSchedule(schedule.id, schedule.name)
                      }
                      disabled={schedulerLoading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">
                  No backup schedules configured
                </p>
                <p className="text-sm mt-1">
                  Create automated backup schedules to run daily, weekly, or
                  monthly
                </p>
              </div>
            )}
          </div>

          {/* Schedule Types Info */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Schedule Types:</strong> DAILY (every day), WEEKLY
              (specific day of week), MONTHLY (specific day of month). All
              schedules use Asia/Jakarta timezone.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>



      {/* Create Schedule Dialog */}
      <Dialog open={showCreateSchedule} onOpenChange={setShowCreateSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Backup Schedule</DialogTitle>
            <DialogDescription>
              Set up an automated backup schedule that will run at specified
              times.
            </DialogDescription>
          </DialogHeader>
          <CreateScheduleForm
            onSubmit={handleCreateSchedule}
            onCancel={() => setShowCreateSchedule(false)}
            loading={schedulerLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Schedule Dialog */}
      <Dialog open={showEditSchedule} onOpenChange={setShowEditSchedule}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Backup Schedule</DialogTitle>
            <DialogDescription>
              Modify the backup schedule configuration.
            </DialogDescription>
          </DialogHeader>
          {editingSchedule && (
            <EditScheduleForm
              schedule={editingSchedule}
              onSubmit={handleUpdateSchedule}
              onCancel={() => {
                setShowEditSchedule(false);
                setEditingSchedule(null);
              }}
              loading={schedulerLoading}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ===== SCHEDULE FORM COMPONENTS =====

interface ScheduleFormData {
  name: string;
  type: string;
  frequency: string;
  time: string;
  daysOfWeek: number[];
  daysOfMonth: number[];
  enabled: boolean;
  config?: any;
  compress: boolean;
  includeWal: boolean;
  verifyIntegrity: boolean;
  encrypt: boolean;
  destinationId: string | undefined;
  retentionPolicy: {
    daily: number;
    weekly: number;
    monthly: number;
    yearly: number;
  } | undefined;
  // NEW: Backup Strategy Selection
  backupStrategy: "intelligent" | "always-full" | "always-incremental";
}

function CreateScheduleForm({
  onSubmit,
  onCancel,
  loading,
}: {
  onSubmit: (data: ScheduleFormData) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: "",
    type: "database",
    frequency: "daily",
    time: "02:00",
    daysOfWeek: [],
    daysOfMonth: [],
    compress: true,
    includeWal: false,
    verifyIntegrity: true,
    enabled: true,
    encrypt: false,
    destinationId: "",
    retentionPolicy: {
      daily: 7,
      weekly: 4,
      monthly: 12,
      yearly: 1,
    },
    backupStrategy: "intelligent", // Default to intelligent
  });

  const [destinations, setDestinations] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch("/api/backup/destinations");
        const data = await response.json();
        if (response.ok) {
          setDestinations(data.destinations);
        }
      } catch (error) {
        console.error("Failed to fetch destinations:", error);
      }
    };
    fetchDestinations();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Form validation
    if (!formData.name.trim()) {
      alert("Schedule name is required");
      return;
    }

    if (!formData.time.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
      alert("Please enter a valid time in HH:MM format");
      return;
    }

    if (
      formData.frequency === "weekly" &&
      (!formData.daysOfWeek || formData.daysOfWeek.length === 0)
    ) {
      alert("Please select at least one day of the week for weekly schedules");
      return;
    }

    onSubmit({
      name: formData.name,
      type: "database",
      frequency: formData.frequency,
      time: formData.time,
      daysOfWeek: formData.daysOfWeek,
      daysOfMonth: formData.daysOfMonth,
      enabled: formData.enabled,
      compress: formData.compress,
      includeWal: formData.includeWal,
      verifyIntegrity: formData.verifyIntegrity,
      config: {
        name: formData.name,
        type: "database",
        retentionDays: 30,
        compress: formData.compress,
        includeWal: formData.includeWal,
        verifyIntegrity: formData.verifyIntegrity,
        encrypt: formData.encrypt,
        destinationId: formData.destinationId || undefined,
      },
      encrypt: formData.encrypt,
      destinationId: formData.destinationId || undefined,
      retentionPolicy: formData.retentionPolicy || undefined,
      backupStrategy: formData.backupStrategy,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schedule-name">Schedule Name *</Label>
          <Input
            id="schedule-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Daily Backup, Weekly Full Backup"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="schedule-time">Time (HH:MM) *</Label>
          <Input
            id="schedule-time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="schedule-frequency">Frequency *</Label>
        <Select
          value={formData.destinationId || "none"}
          onValueChange={(value) =>
            setFormData({ ...formData, destinationId: value === "none" ? undefined : value })
          }
        >
          <SelectTrigger id="schedule-frequency">
            <SelectValue placeholder="Select frequency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.frequency === "weekly" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Days of Week</label>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.daysOfWeek?.includes(index) || false}
                    onChange={(e) => {
                      const newDays = e.target.checked
                        ? [...(formData.daysOfWeek || []), index]
                        : (formData.daysOfWeek || []).filter(
                          (d) => d !== index
                        );
                      setFormData({ ...formData, daysOfWeek: newDays });
                    }}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              )
            )}
          </div>
        </div>
      )}

      {formData.frequency === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="schedule-day">Day of Month</Label>
          <Select
            value={(formData.daysOfMonth?.[0] || 1).toString()}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                daysOfMonth: [parseInt(value)],
              })
            }
          >
            <SelectTrigger id="schedule-day">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-sm font-medium">Backup Options</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.compress}
              onChange={(e) =>
                setFormData({ ...formData, compress: e.target.checked })
              }
            />
            <span className="text-sm">Compress backup (.sql.gz)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.includeWal}
              onChange={(e) =>
                setFormData({ ...formData, includeWal: e.target.checked })
              }
            />
            <span className="text-sm">Include WAL files</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.verifyIntegrity}
              onChange={(e) =>
                setFormData({ ...formData, verifyIntegrity: e.target.checked })
              }
            />
            <span className="text-sm">Verify integrity after backup</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.encrypt}
              onChange={(e) =>
                setFormData({ ...formData, encrypt: e.target.checked })
              }
            />
            <span className="text-sm">Encrypt backup (AES-256)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
            />
            <span className="text-sm">Enable schedule immediately</span>
          </label>
        </div>
      </div>

      {/* NEW: Backup Strategy Selection */}
      <div className="space-y-2">
        <Label htmlFor="backup-strategy">Backup Strategy *</Label>
        <Select
          value={formData.backupStrategy}
          onValueChange={(value: "intelligent" | "always-full" | "always-incremental") =>
            setFormData({ ...formData, backupStrategy: value })
          }
        >
          <SelectTrigger id="backup-strategy">
            <SelectValue placeholder="Select backup strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="intelligent">
              <div className="flex flex-col">
                <span className="font-medium">Intelligent (Recommended)</span>
                <span className="text-xs text-muted-foreground">Automatically choose full or incremental based on changes</span>
              </div>
            </SelectItem>
            <SelectItem value="always-full">
              <div className="flex flex-col">
                <span className="font-medium">Always Full Backup</span>
                <span className="text-xs text-muted-foreground">Complete database backup every time</span>
              </div>
            </SelectItem>
            <SelectItem value="always-incremental">
              <div className="flex flex-col">
                <span className="font-medium">Always Incremental</span>
                <span className="text-xs text-muted-foreground">Only backup changes since last backup</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {formData.backupStrategy === "intelligent" && "💡 Automatically optimizes backup size and speed"}
          {formData.backupStrategy === "always-full" && "💾 Ensures complete backup but uses more storage"}
          {formData.backupStrategy === "always-incremental" && "⚡ Fast backups but requires full backup history"}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Schedule"
          )}
        </Button>
      </div>
    </form>
  );
}

function EditScheduleForm({
  schedule,
  onSubmit,
  onCancel,
  loading,
}: {
  schedule: any;
  onSubmit: (scheduleId: string, updates: Partial<ScheduleFormData>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [formData, setFormData] = useState<ScheduleFormData>({
    name: schedule.name || "",
    type: schedule.type || "database",
    frequency: schedule.frequency || "daily",
    time: schedule.time || "02:00",
    daysOfWeek: schedule.daysOfWeek || [],
    daysOfMonth: schedule.daysOfMonth || [],
    compress: schedule.config?.compress ?? true,
    includeWal: schedule.config?.includeWal ?? false,
    verifyIntegrity: schedule.config?.verifyIntegrity ?? true,
    enabled: schedule.enabled ?? true,
    encrypt: schedule.encrypt ?? false,
    destinationId: schedule.destinationId || "",
    retentionPolicy: schedule.retentionPolicy || {
      daily: 7,
      weekly: 4,
      monthly: 12,
      yearly: 1,
    },
    backupStrategy: schedule.config?.backupStrategy || "intelligent", // Default to intelligent
  });

  const [destinations, setDestinations] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const response = await fetch("/api/backup/destinations");
        const data = await response.json();
        if (response.ok) {
          setDestinations(data.destinations);
        }
      } catch (error) {
        console.error("Failed to fetch destinations:", error);
      }
    };
    fetchDestinations();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(schedule.id, {
      ...formData,
      type: schedule.type,
      config: {
        ...schedule.config,
        name: formData.name,
        compress: formData.compress,
        includeWal: formData.includeWal,
        verifyIntegrity: formData.verifyIntegrity,
        encrypt: formData.encrypt,
        destinationId: formData.destinationId || undefined,
      },
      encrypt: formData.encrypt,
      destinationId: formData.destinationId || undefined,
      retentionPolicy: formData.retentionPolicy,
      backupStrategy: formData.backupStrategy,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-schedule-name">Schedule Name *</Label>
          <Input
            id="edit-schedule-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Daily Backup, Weekly Full Backup"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-schedule-time">Time (HH:MM) *</Label>
          <Input
            id="edit-schedule-time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Frequency: {formData.frequency.toUpperCase()}
        </label>
        <p className="text-sm text-muted-foreground">
          Frequency cannot be changed. Create a new schedule if needed.
        </p>
      </div>

      {formData.frequency === "weekly" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Days of Week</label>
          <div className="grid grid-cols-7 gap-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
              (day, index) => (
                <label key={day} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.daysOfWeek?.includes(index) || false}
                    onChange={(e) => {
                      const newDays = e.target.checked
                        ? [...(formData.daysOfWeek || []), index]
                        : (formData.daysOfWeek || []).filter(
                          (d) => d !== index
                        );
                      setFormData({ ...formData, daysOfWeek: newDays });
                    }}
                  />
                  <span className="text-sm">{day}</span>
                </label>
              )
            )}
          </div>
        </div>
      )}

      {formData.frequency === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="edit-schedule-day">Day of Month</Label>
          <Select
            value={(formData.daysOfMonth?.[0] || 1).toString()}
            onValueChange={(value) =>
              setFormData({
                ...formData,
                daysOfMonth: [parseInt(value)],
              })
            }
          >
            <SelectTrigger id="edit-schedule-day">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <SelectItem key={day} value={day.toString()}>
                  {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-4">
        <label className="text-sm font-medium">Backup Options</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.compress}
              onChange={(e) =>
                setFormData({ ...formData, compress: e.target.checked })
              }
            />
            <span className="text-sm">Compress backup (.sql.gz)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.includeWal}
              onChange={(e) =>
                setFormData({ ...formData, includeWal: e.target.checked })
              }
            />
            <span className="text-sm">Include WAL files</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.verifyIntegrity}
              onChange={(e) =>
                setFormData({ ...formData, verifyIntegrity: e.target.checked })
              }
            />
            <span className="text-sm">Verify integrity after backup</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.encrypt}
              onChange={(e) =>
                setFormData({ ...formData, encrypt: e.target.checked })
              }
            />
            <span className="text-sm">Encrypt backup (AES-256)</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={formData.enabled}
              onChange={(e) =>
                setFormData({ ...formData, enabled: e.target.checked })
              }
            />
            <span className="text-sm">Enable schedule</span>
          </label>
        </div>
      </div>

      {/* NEW: Backup Strategy Selection for Edit Form */}
      <div className="space-y-2">
        <Label htmlFor="edit-backup-strategy">Backup Strategy *</Label>
        <Select
          value={formData.backupStrategy}
          onValueChange={(value: "intelligent" | "always-full" | "always-incremental") =>
            setFormData({ ...formData, backupStrategy: value })
          }
        >
          <SelectTrigger id="edit-backup-strategy">
            <SelectValue placeholder="Select backup strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="intelligent">
              <div className="flex flex-col">
                <span className="font-medium">Intelligent (Recommended)</span>
                <span className="text-xs text-muted-foreground">Automatically choose full or incremental based on changes</span>
              </div>
            </SelectItem>
            <SelectItem value="always-full">
              <div className="flex flex-col">
                <span className="font-medium">Always Full Backup</span>
                <span className="text-xs text-muted-foreground">Complete database backup every time</span>
              </div>
            </SelectItem>
            <SelectItem value="always-incremental">
              <div className="flex flex-col">
                <span className="font-medium">Always Incremental</span>
                <span className="text-xs text-muted-foreground">Only backup changes since last backup</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground">
          {formData.backupStrategy === "intelligent" && "💡 Automatically optimizes backup size and speed"}
          {formData.backupStrategy === "always-full" && "💾 Ensures complete backup but uses more storage"}
          {formData.backupStrategy === "always-incremental" && "⚡ Fast backups but requires full backup history"}
        </div>
      </div>



      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !formData.name}>
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Schedule"
          )}
        </Button>
      </div>
    </form>
  );
}
