"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Download, RefreshCw, TrendingUp, Activity, Database, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface SummaryData {
  date: string;
  deviceCount: number;
  totalLogs: number;
  devices: Array<{
    deviceId: string;
    deviceName: string;
    topic: string;
    keys: Array<{
      key: string;
      customName: string;
      units: string | null;
      stats: {
        count: number;
        min: number;
        max: number;
        avg: number;
        lastValue: number;
      };
    }>;
  }>;
}

interface DailySummaryData {
  date: Date;
  deviceCount: number;
  totalLogs: number;
  devices: Array<{
    deviceId: string;
    deviceName: string;
    topic: string;
    keys: Array<{
      key: string;
      customName: string;
      units: string | null;
      stats: {
        count: number;
        min: number;
        max: number;
        avg: number;
        lastValue: number;
      };
    }>;
  }>;
}

interface DailyDeviceSummaryWidgetProps {
  config?: {
    title?: string;
    defaultDate?: string;
  };
  id?: string;
  className?: string;
}

export default function DailyDeviceSummaryWidget({ config, id, className }: DailyDeviceSummaryWidgetProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Use config defaultDate if available, otherwise yesterday
    if (config?.defaultDate) {
      return new Date(config.defaultDate);
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
  });
  const [summary, setSummary] = useState<DailySummaryData | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available dates on mount
  useEffect(() => {
    loadAvailableDates();
  }, []);

  // Update selectedDate when config.defaultDate changes
  useEffect(() => {
    if (config?.defaultDate) {
      const newDefaultDate = new Date(config.defaultDate);
      // Only update if the date is actually different to avoid unnecessary re-renders
      if (!selectedDate || selectedDate.getTime() !== newDefaultDate.getTime()) {
        setSelectedDate(newDefaultDate);
      }
    }
  }, [config?.defaultDate, selectedDate]);

  // Load summary when date changes
  useEffect(() => {
    if (selectedDate) {
      loadSummary(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableDates = async () => {
    try {
      const response = await fetch('/api/widgets/daily-device-summary?action=dates');
      const result: ApiResponse<string[]> = await response.json();

      if (result.success && result.data) {
        // Convert date strings to local Date objects for comparison
        const dates = result.data.map(dateStr => new Date(dateStr + 'T00:00:00'));
        setAvailableDates(dates);
      } else {
        console.error('Failed to load available dates:', result.message);
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
    }
  };

  const loadSummary = async (date: Date) => {
    setLoading(true);
    setError(null);

    try {
      // Use local date instead of UTC to match user expectation
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`; // YYYY-MM-DD in local timezone
      const response = await fetch(`/api/widgets/daily-device-summary?date=${dateStr}`);
      const result: ApiResponse<SummaryData> = await response.json();

      if (result.success && result.data) {
        // Convert API response to component format
        const summaryData: DailySummaryData = {
          date: new Date(result.data.date + 'T00:00:00.000Z'),
          deviceCount: result.data.deviceCount,
          totalLogs: result.data.totalLogs,
          devices: result.data.devices
        };
        setSummary(summaryData);
      } else {
        // Handle case when no summary data is available (404)
        if (response.status === 404) {
          setSummary(null); // Clear summary to show "no data" message
          setError(null); // Clear error
        } else {
          setError(result.message || 'Failed to load summary');
          setSummary(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleRefresh = () => {
    if (selectedDate) {
      loadSummary(selectedDate);
    }
  };

  const handleExport = () => {
    if (!summary) return;

    // Create CSV content
    const csvContent = generateCSV(summary);

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `daily-device-summary-${summary.date && !isNaN(summary.date.getTime()) ? summary.date.toISOString().split('T')[0] : 'unknown-date'}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (data: DailySummaryData): string => {
    const headers = ['Device Name', 'Topic', 'Key', 'Custom Name', 'Units', 'Count', 'Min', 'Max', 'Average', 'Last Value'];
    const rows: string[] = [headers.join(',')];

    data.devices.forEach(device => {
      device.keys.forEach(key => {
        const row = [
          `"${device.deviceName}"`,
          `"${device.topic}"`,
          `"${key.key}"`,
          `"${key.customName}"`,
          `"${key.units || ''}"`,
          key.stats.count,
          key.stats.min,
          key.stats.max,
          key.stats.avg,
          key.stats.lastValue
        ];
        rows.push(row.join(','));
      });
    });

    return rows.join('\n');
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(availableDate =>
      availableDate.getFullYear() === date.getFullYear() &&
      availableDate.getMonth() === date.getMonth() &&
      availableDate.getDate() === date.getDate()
    );
  };

  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="truncate">{config?.title || "Daily Device Summary"}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 px-3 text-xs font-medium justify-start min-w-[80px]",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, "MMM dd") : "Select date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end" side="bottom">
                <CustomCalendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                />
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleExport} disabled={!summary}>
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden flex flex-col min-h-0">
        {error && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-red-500">
              <p className="text-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                Try Again
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading summary...</p>
            </div>
          </div>
        )}

        {!loading && !error && summary && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Compact Summary Cards */}
            <div className="flex-shrink-0 grid grid-cols-3 gap-2">
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Devices</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.deviceCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-green-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Logs</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{summary.totalLogs.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {summary.date ? format(summary.date, "MMM dd") : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Device Details Table */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-shrink-0 mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Device Details</h4>
              </div>

              {summary.devices.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center p-4">
                  <div className="text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No device data available</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                  <div className="h-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-muted/30 hover:scrollbar-thumb-muted/50 scrollbar-track-transparent">
                    <table className="w-full min-w-[800px] border-collapse">
                      <thead className="bg-background border-b sticky top-0">
                        <tr className="hover:bg-transparent">
                          <th className="h-9 text-xs font-medium text-left pl-4 pr-3 w-[180px] align-middle border-r border-border/50">Device</th>
                          <th className="h-9 text-xs font-medium text-left pl-3 pr-3 w-[140px] align-middle border-r border-border/50">Name</th>
                          <th className="h-9 text-xs font-medium text-center pl-3 pr-3 w-[60px] align-middle border-r border-border/50">Unit</th>
                          <th className="h-9 text-xs font-medium text-right pl-3 pr-4 w-[70px] align-middle border-r border-border/50">Count</th>
                          <th className="h-9 text-xs font-medium text-right pl-3 pr-4 w-[70px] align-middle border-r border-border/50">Min</th>
                          <th className="h-9 text-xs font-medium text-right pl-3 pr-4 w-[70px] align-middle border-r border-border/50">Max</th>
                          <th className="h-9 text-xs font-medium text-right pl-3 pr-4 w-[70px] align-middle border-r border-border/50">Avg</th>
                          <th className="h-9 text-xs font-medium text-right pl-3 pr-4 w-[70px] align-middle">Last</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.devices.map((device: any) =>
                          device.keys.map((key: any, keyIndex: number) => (
                            <tr key={`${device.deviceId}-${key.key}`} className="h-9 hover:bg-muted/50 border-b border-border/30">
                              {keyIndex === 0 && (
                                <td rowSpan={device.keys.length} className="text-xs font-medium pl-4 pr-3 align-middle border-r border-border/50">
                                  <div className="truncate" title={device.deviceName}>
                                    {device.deviceName}
                                  </div>
                                </td>
                              )}
                              <td className="text-xs pl-3 pr-3 align-middle border-r border-border/50">
                                <div className="truncate" title={key.customName}>
                                  {key.customName}
                                </div>
                              </td>
                              <td className="text-center pl-3 pr-3 align-middle border-r border-border/50">
                                {key.units && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 text-[10px] font-medium">
                                    {key.units}
                                  </Badge>
                                )}
                              </td>
                              <td className="text-xs text-right font-mono pr-4 pl-3 tabular-nums align-middle border-r border-border/50">
                                {key.stats.count.toLocaleString()}
                              </td>
                              <td className="text-xs text-right font-mono pr-4 pl-3 tabular-nums align-middle border-r border-border/50">
                                {key.stats.min.toFixed(2)}
                              </td>
                              <td className="text-xs text-right font-mono pr-4 pl-3 tabular-nums align-middle border-r border-border/50">
                                {key.stats.max.toFixed(2)}
                              </td>
                              <td className="text-xs text-right font-mono pr-4 pl-3 tabular-nums align-middle border-r border-border/50">
                                {key.stats.avg.toFixed(2)}
                              </td>
                              <td className="text-xs text-right font-mono pr-4 pl-3 tabular-nums align-middle">
                                {key.stats.lastValue.toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && !error && !summary && selectedDate && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No summary available</p>
              <p className="text-xs mt-1">
                Try selecting a different date or check if the daily summary has been generated.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Custom Calendar Component with proper header centering
interface CustomCalendarProps {
  selected?: Date | undefined;
  onSelect?: (date: Date) => void;
}

function CustomCalendar({ selected, onSelect }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleDateClick = (date: Date) => {
    onSelect?.(date);
  };

  return (
    <div className="p-3 bg-background border rounded-md shadow-lg w-64">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handlePrevMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNextMonth}
          className="h-7 w-7 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Weekday Headers - Perfectly Centered */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekdays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-medium text-muted-foreground h-6 flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-1">
        {calendarDays.map((date, index) => {
          const isSelected = selected && isSameDay(date, selected);
          const isToday = isSameDay(date, new Date());

          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleDateClick(date)}
              className={cn(
                "h-8 w-8 p-0 text-xs font-normal hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                isToday && !isSelected && "bg-accent text-accent-foreground font-semibold"
              )}
            >
              {format(date, 'd')}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
