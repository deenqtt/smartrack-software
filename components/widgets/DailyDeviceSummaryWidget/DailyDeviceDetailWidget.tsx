"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, RefreshCw, Database, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

interface DeviceDetailData {
  deviceId: string;
  deviceName: string;
  date: string;
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
}

interface DailyDeviceDetailWidgetProps {
  config?: {
    title?: string;
    deviceId?: string;
    defaultDate?: string;
  };
  id?: string;
  className?: string;
}

export default function DailyDeviceDetailWidget({
  config,
  id,
  className
}: DailyDeviceDetailWidgetProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(config?.deviceId || "");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (config?.defaultDate) {
      return new Date(config.defaultDate);
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
  });

  const [deviceDetail, setDeviceDetail] = useState<DeviceDetailData | null>(null);
  const [availableDevices, setAvailableDevices] = useState<Array<{id: string, name: string}>>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available devices and dates on mount
  useEffect(() => {
    loadAvailableDevices();
    loadAvailableDates();
  }, []);

  // Load device detail when device or date changes
  useEffect(() => {
    if (selectedDeviceId && selectedDate) {
      loadDeviceDetail(selectedDeviceId, selectedDate);
    }
  }, [selectedDeviceId, selectedDate]);

  const loadAvailableDevices = async () => {
    try {
      // Get devices from the latest summary
      const response = await fetch('/api/widgets/daily-device-summary?action=devices');
      const result: ApiResponse<Array<{id: string, name: string}>> = await response.json();

      if (result.success && result.data) {
        setAvailableDevices(result.data);
      }
    } catch (err) {
      console.error('Failed to load available devices:', err);
    }
  };

  const loadAvailableDates = async () => {
    try {
      const response = await fetch('/api/widgets/daily-device-summary?action=dates');
      const result: ApiResponse<string[]> = await response.json();

      if (result.success && result.data) {
        const dates = result.data.map(dateStr => new Date(dateStr + 'T00:00:00'));
        setAvailableDates(dates);
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
    }
  };

  const loadDeviceDetail = async (deviceId: string, date: Date) => {
    setLoading(true);
    setError(null);

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`/api/widgets/daily-device-detail?deviceId=${deviceId}&date=${dateStr}`);
      const result: ApiResponse<DeviceDetailData> = await response.json();

      if (result.success && result.data) {
        setDeviceDetail(result.data);
      } else {
        setError(result.message || 'Failed to load device detail');
        setDeviceDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load device detail');
      setDeviceDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
  };

  const handleRefresh = () => {
    if (selectedDeviceId && selectedDate) {
      loadDeviceDetail(selectedDeviceId, selectedDate);
    }
  };

  const handleExport = () => {
    if (!deviceDetail) return;

    const csvContent = generateCSV(deviceDetail);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `device-detail-${deviceDetail.deviceId}-${deviceDetail.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (data: DeviceDetailData): string => {
    const headers = ['Key', 'Custom Name', 'Units', 'Count', 'Min', 'Max', 'Average', 'Last Value'];
    const rows: string[] = [headers.join(',')];

    data.keys.forEach(key => {
      const row = [
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
            <span className="truncate">{config?.title || "Daily Device Detail"}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue placeholder="Select device" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(availableDevices) && availableDevices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

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
                  onSelect={setSelectedDate}
                />
              </PopoverContent>
            </Popover>

            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={cn("h-3 w-3", loading && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleExport} disabled={!deviceDetail}>
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
              <p className="text-sm text-muted-foreground">Loading device detail...</p>
            </div>
          </div>
        )}

        {!loading && !error && deviceDetail && (
          <div className="flex-1 flex flex-col min-h-0 space-y-3">
            {/* Device Info */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <h4 className="font-medium text-sm">{deviceDetail.deviceName}</h4>
                  <p className="text-xs text-muted-foreground">ID: {deviceDetail.deviceId}</p>
                  <p className="text-xs text-muted-foreground">Topic: {deviceDetail.topic}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{format(new Date(deviceDetail.date), "MMM dd, yyyy")}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {deviceDetail.keys.length} parameters
                  </Badge>
                </div>
              </div>
            </div>

            {/* Parameters Table */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-shrink-0 mb-2 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground">Parameters</h4>
              </div>

              <div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
                <div className="h-full overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-muted/30 hover:scrollbar-thumb-muted/50 scrollbar-track-transparent">
                  <table className="w-full min-w-[600px] border-collapse">
                    <thead className="bg-background border-b sticky top-0">
                      <tr className="hover:bg-transparent">
                        <th className="h-9 text-xs font-medium text-left pl-4 pr-3 w-[120px] align-middle border-r border-border/50">Parameter</th>
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
                      {deviceDetail.keys.map((key) => (
                        <tr key={key.key} className="h-9 hover:bg-muted/50 border-b border-border/30">
                          <td className="text-xs font-mono pl-4 pr-3 align-middle border-r border-border/50">
                            <div className="truncate" title={key.key}>
                              {key.key}
                            </div>
                          </td>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !deviceDetail && selectedDeviceId && selectedDate && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No device data available</p>
              <p className="text-xs mt-1">
                Try selecting a different device or date.
              </p>
            </div>
          </div>
        )}

        {!selectedDeviceId && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select a device to view details</p>
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
