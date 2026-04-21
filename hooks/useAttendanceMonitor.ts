"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useMqtt } from '@/contexts/MqttContext';

export interface AttendanceRecord {
  id: string;
  uid: number;
  deviceId: string;
  timestamp: Date;
  punchType: 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_OUT' | 'BREAK_IN' | 'OVERTIME_IN' | 'OVERTIME_OUT';
  verifyCode: number;
  status: 'SUCCESS' | 'FAILED' | 'DENIED' | 'ERROR';
  temperature?: number;
  maskStatus?: boolean;
  workCode?: string;
  user?: {
    uid: number;
    name: string;
  };
  device?: {
    deviceId: string;
    name: string;
  };
}

export interface UseAttendanceMonitorResult {
  attendanceRecords: AttendanceRecord[];
  loading: boolean;
  error: string | null;
  totalRecords: number;

  // Attendance operations
  getAttendanceRecords: (deviceId?: string, limit?: number) => Promise<void>;
  getAttendanceByUser: (uid: number, limit?: number) => Promise<void>;
  getAttendanceByDateRange: (startDate: Date, endDate: Date, deviceId?: string) => Promise<void>;
  clearAttendanceRecords: (deviceId?: string) => Promise<boolean>;

  // Real-time monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
  isMonitoring: boolean;

  // Utility functions
  clearError: () => void;
}

export function useAttendanceMonitor(): UseAttendanceMonitorResult {
  const { publish, subscribe, unsubscribe } = useMqtt();

  // State management
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRecords, setTotalRecords] = useState(0);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Refs untuk tracking promises
  const pendingOperations = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  // MQTT Topics
  const ATTENDANCE_COMMAND_TOPIC = 'accessControl/attendance/command';
  const ATTENDANCE_RESPONSE_TOPIC = 'accessControl/attendance/response';
  const ATTENDANCE_REALTIME_TOPIC = 'accessControl/attendance/realtime';

  // Setup MQTT subscriptions
  useEffect(() => {
    const handleAttendanceResponse = (topic: string, message: string) => {
      try {
        const response = JSON.parse(message);

        // Handle different response types
        if (response.data?.attendance_records) {
          handleListResponse(response);
        } else if (response.data?.cleared_records) {
          handleClearResponse(response);
        } else if (response.data?.attendance && topic === ATTENDANCE_REALTIME_TOPIC) {
          handleRealtimeAttendance(response);
        }
      } catch (err) {
        console.error('Failed to parse MQTT response:', err);
      }
    };

    subscribe(ATTENDANCE_RESPONSE_TOPIC, handleAttendanceResponse);

    // Subscribe to real-time attendance if monitoring is active
    if (isMonitoring) {
      subscribe(ATTENDANCE_REALTIME_TOPIC, handleAttendanceResponse);
    }

    return () => {
      unsubscribe(ATTENDANCE_RESPONSE_TOPIC, handleAttendanceResponse);
      unsubscribe(ATTENDANCE_REALTIME_TOPIC, handleAttendanceResponse);

      // Cleanup pending operations
      pendingOperations.current.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
      });
      pendingOperations.current.clear();
    };
  }, [subscribe, unsubscribe, isMonitoring]);

  // Response handlers
  const handleListResponse = useCallback((response: any) => {
    const operationId = response.data?.query_type ?
      `attendance_list_${response.data.query_type}` :
      'attendance_list';
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.attendance_records) {
        setAttendanceRecords(response.data.attendance_records);
        setTotalRecords(response.data.total_count || response.data.attendance_records.length);
        toast.success(`Retrieved ${response.data.attendance_records.length} attendance records`);
      }
      pending?.resolve(response.data);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleClearResponse = useCallback((response: any) => {
    const operationId = 'attendance_clear';
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      const clearedCount = response.data?.cleared_records || 0;
      toast.success(`Cleared ${clearedCount} attendance records`);
      // Refresh the list after clearing
      getAttendanceRecords();
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleRealtimeAttendance = useCallback((response: any) => {
    if (response.data?.attendance) {
      const newRecord: AttendanceRecord = response.data.attendance;

      // Add to the beginning of the array for real-time updates
      setAttendanceRecords(prev => [newRecord, ...prev.slice(0, 99)]); // Keep only last 100 records

      // Show notification for new attendance
      const userName = newRecord.user?.name || `User ${newRecord.uid}`;
      const punchType = newRecord.punchType.replace('_', ' ').toLowerCase();
      toast.info(`${userName} ${punchType} at ${new Date(newRecord.timestamp).toLocaleTimeString()}`);
    }
  }, []);

  // Generic MQTT command sender
  const sendCommand = useCallback(async <T>(
    command: any,
    operationId: string,
    timeoutMs: number = 30000
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingOperations.current.delete(operationId);
        const timeoutError = `Operation timed out after ${timeoutMs}ms`;
        setError(timeoutError);
        toast.error(timeoutError);
        reject(new Error(timeoutError));
      }, timeoutMs);

      pendingOperations.current.set(operationId, {
        resolve,
        reject,
        timeout
      });

      try {
        publish(ATTENDANCE_COMMAND_TOPIC, JSON.stringify(command));
        // Assume success if no exception thrown
      } catch (publishError) {
        clearTimeout(timeout);
        pendingOperations.current.delete(operationId);
        const errorMsg = 'Failed to publish MQTT command';
        setError(errorMsg);
        toast.error(errorMsg);
        reject(new Error(errorMsg));
      }
    });
  }, [publish]);

  // Attendance operations
  const getAttendanceRecords = useCallback(async (deviceId?: string, limit: number = 100): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'getData',
        data: {
          ...(deviceId && { device_id: deviceId }),
          limit
        }
      };

      const operationId = deviceId ? `attendance_list_device_${deviceId}` : 'attendance_list_all';
      await sendCommand<void>(command, operationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get attendance records';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  const getAttendanceByUser = useCallback(async (uid: number, limit: number = 50): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'getByUser',
        data: {
          uid,
          limit
        }
      };

      const operationId = `attendance_list_user_${uid}`;
      await sendCommand<void>(command, operationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user attendance records';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  const getAttendanceByDateRange = useCallback(async (startDate: Date, endDate: Date, deviceId?: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'getByDateRange',
        data: {
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          ...(deviceId && { device_id: deviceId })
        }
      };

      const operationId = `attendance_list_date_${startDate.getTime()}_${endDate.getTime()}`;
      await sendCommand<void>(command, operationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get attendance records by date range';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  const clearAttendanceRecords = useCallback(async (deviceId?: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'clearData',
        data: {
          ...(deviceId && { device_id: deviceId })
        }
      };

      const operationId = 'attendance_clear';
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear attendance records';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  // Real-time monitoring
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    toast.success('Started real-time attendance monitoring');
  }, []);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
    toast.info('Stopped real-time attendance monitoring');
  }, []);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load recent attendance records on mount
  useEffect(() => {
    getAttendanceRecords(undefined, 50);
  }, [getAttendanceRecords]);

  return {
    attendanceRecords,
    loading,
    error,
    totalRecords,

    // Attendance operations
    getAttendanceRecords,
    getAttendanceByUser,
    getAttendanceByDateRange,
    clearAttendanceRecords,

    // Real-time monitoring
    startMonitoring,
    stopMonitoring,
    isMonitoring,

    // Utility functions
    clearError
  };
}
