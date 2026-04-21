"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Download, RefreshCw, Database, Activity, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight } from "lucide-react";
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

interface KeyDetailData {
  deviceId: string;
  deviceName: string;
  key: string;
  customName: string;
  units: string | null;
  date: string;
  stats: {
    count: number;
    min: number;
    max: number;
    avg: number;
    lastValue: number;
  };
  trend: 'up' | 'down' | 'stable';
}

interface DailyKeyDetailWidgetProps {
  config?: {
    title?: string;
    deviceId?: string;
    key?: string;
    defaultDate?: string;
  };
  id?: string;
  className?: string;
}

export default function DailyKeyDetailWidget({
  config,
  id,
  className
}: DailyKeyDetailWidgetProps) {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(config?.deviceId || "");
  const [selectedKey, setSelectedKey] = useState<string>(config?.key || "");
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (config?.defaultDate) {
      return new Date(config.defaultDate);
    }
    return new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
  });

  const [keyDetail, setKeyDetail] = useState<KeyDetailData | null>(null);
  const [availableDevices, setAvailableDevices] = useState<Array<{id: string, name: string}>>([]);
  const [availableKeys, setAvailableKeys] = useState<Array<{key: string, name: string}>>([]);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available devices and dates on mount
  useEffect(() => {
    loadAvailableDevices();
    loadAvailableDates();
  }, []);

  // Load available keys when device changes
  useEffect(() => {
    if (selectedDeviceId) {
      loadAvailableKeys(selectedDeviceId);
    } else {
      setAvailableKeys([]);
      setSelectedKey("");
    }
  }, [selectedDeviceId]);

  // Load key detail when device, key, or date changes
  useEffect(() => {
    if (selectedDeviceId && selectedKey && selectedDate) {
      loadKeyDetail(selectedDeviceId, selectedKey, selectedDate);
    }
  }, [selectedDeviceId, selectedKey, selectedDate]);

  const loadAvailableDevices = async () => {
    try {
      const response = await fetch('/api/widgets/daily-device-summary?action=devices');
      const result: ApiResponse<Array<{id: string, name: string}>> = await response.json();

      if (result.success && result.data) {
        setAvailableDevices(result.data);
      }
    } catch (err) {
      console.error('Failed to load available devices:', err);
    }
  };

  const loadAvailableKeys = async (deviceId: string) => {
    try {
      // Get keys for the selected device from the latest summary
      const response = await fetch(`/api/widgets/daily-device-detail?deviceId=${deviceId}`);
      const result: ApiResponse<any> = await response.json();

      if (result.success && result.data) {
        const keys = result.data.keys.map((key: any) => ({
          key: key.key,
          name: key.customName
        }));
        setAvailableKeys(keys);
      }
    } catch (err) {
      console.error('Failed to load available keys:', err);
      setAvailableKeys([]);
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

  const loadKeyDetail = async (deviceId: string, key: string, date: Date) => {
    setLoading(true);
    setError(null);

    try {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const response = await fetch(`/api/widgets/daily-key-detail?deviceId=${deviceId}&key=${key}&date=${dateStr}`);
      const result: ApiResponse<KeyDetailData> = await response.json();

      if (result.success && result.data) {
        setKeyDetail(result.data);
      } else {
        setError(result.message || 'Failed to load key detail');
        setKeyDetail(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load key detail');
      setKeyDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeviceChange = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    // Reset key selection when device changes
    setSelectedKey("");
  };

  const handleKeyChange = (key: string) => {
    setSelectedKey(key);
  };



  const handleRefresh = () => {
    if (selectedDeviceId && selectedKey && selectedDate) {
      loadKeyDetail(selectedDeviceId, selectedKey, selectedDate);
    }
  };

  const handleExport = () => {
    if (!keyDetail) return;

    const csvContent = generateCSV(keyDetail);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `key-detail-${keyDetail.deviceId}-${keyDetail.key}-${keyDetail.date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const generateCSV = (data: KeyDetailData): string => {
    const headers = ['Device', 'Key', 'Custom Name', 'Units', 'Date', 'Count', 'Min', 'Max', 'Average', 'Last Value', 'Trend'];
    const row = [
      `"${data.deviceName}"`,
      `"${data.key}"`,
      `"${data.customName}"`,
      `"${data.units || ''}"`,
      `"${data.date}"`,
      data.stats.count,
      data.stats.min,
      data.stats.max,
      data.stats.avg,
      data.stats.lastValue,
      `"${data.trend}"`
    ];
    return [headers.join(','), row.join(',')].join('\n');
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  return (
    <Card className={cn("w-full h-full flex flex-col", className)}>
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            <span className="truncate">{config?.title || "Daily Key Detail"}</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Select value={selectedDeviceId} onValueChange={handleDeviceChange}>
              <SelectTrigger className="w-28 h-8 text-xs">
                <SelectValue placeholder="Device" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(availableDevices) && availableDevices.map(device => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedKey} onValueChange={handleKeyChange} disabled={!selectedDeviceId}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Key" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(availableKeys) && availableKeys.map(key => (
                  <SelectItem key={key.key} value={key.key}>
                    {key.name}
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
                    "h-8 px-3 text-xs font-medium justify-start min-w-[70px]",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-3 w-3" />
                  {selectedDate && !isNaN(selectedDate.getTime()) ? format(selectedDate, "MMM dd") : "Date"}
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
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={handleExport} disabled={!keyDetail}>
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
              <p className="text-sm text-muted-foreground">Loading key detail...</p>
            </div>
          </div>
        )}

        {!loading && !error && keyDetail && (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Key Info */}
            <div className="flex-shrink-0">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-blue-500" />
                    <div>
                      <h4 className="font-medium text-sm">{keyDetail.deviceName}</h4>
                      <p className="text-xs text-muted-foreground">Device ID: {keyDetail.deviceId}</p>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <div>
                      <h4 className="font-medium text-sm">{keyDetail.customName}</h4>
                      <p className="text-xs text-muted-foreground">Key: {keyDetail.key}</p>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getTrendIcon(keyDetail.trend)}
                    <span className={cn("text-xs font-medium capitalize", getTrendColor(keyDetail.trend))}>
                      {keyDetail.trend}
                    </span>
                  </div>
                  <div className="h-8 w-px bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm font-medium">{format(new Date(keyDetail.date), "MMM dd, yyyy")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Count */}
              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Count</span>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {keyDetail.stats.count.toLocaleString()}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Data points
                </div>
              </div>

              {/* Min */}
              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">Minimum</span>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {keyDetail.stats.min.toFixed(2)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {keyDetail.units || 'units'}
                </div>
              </div>

              {/* Max */}
              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Maximum</span>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {keyDetail.stats.max.toFixed(2)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                  {keyDetail.units || 'units'}
                </div>
              </div>

              {/* Average */}
              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Average</span>
                  <Activity className="h-4 w-4 text-purple-500" />
                </div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {keyDetail.stats.avg.toFixed(2)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                  {keyDetail.units || 'units'}
                </div>
              </div>

              {/* Last Value */}
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Last Value</span>
                  <Database className="h-4 w-4 text-orange-500" />
                </div>
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {keyDetail.stats.lastValue.toFixed(2)}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {keyDetail.units || 'units'}
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="flex-shrink-0 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 rounded-lg p-3">
              <div className="flex items-center gap-4">
                <span>Units: <Badge variant="outline" className="text-xs">{keyDetail.units || 'N/A'}</Badge></span>
                <span>Trend: <span className={cn("font-medium capitalize", getTrendColor(keyDetail.trend))}>{keyDetail.trend}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <span>Last updated: {format(new Date(), "HH:mm:ss")}</span>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && !keyDetail && (selectedDeviceId || selectedKey) && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No key data available</p>
              <p className="text-xs mt-1">
                {!selectedDeviceId ? "Select a device first" :
                 !selectedKey ? "Select a key to view details" :
                 "Try selecting a different date"}
              </p>
            </div>
          </div>
        )}

        {!selectedDeviceId && !selectedKey && (
          <div className="flex-1 flex items-center justify-center text-center p-4">
            <div className="text-muted-foreground">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Select device and key to view details</p>
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
