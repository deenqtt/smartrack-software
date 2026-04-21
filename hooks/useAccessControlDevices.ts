"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useMqtt } from '@/contexts/MqttContext';

export interface AccessControlDevice {
  id: string;
  deviceId: string;
  name: string;
  ip: string;
  port: number;
  password: number;
  timeout: number;
  forceUdp: boolean;
  enabled: boolean;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'MAINTENANCE';
  lastSeen?: Date;
  firmwareVersion?: string;
  userCount?: number;
  serialNumber?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UseAccessControlDevicesResult {
  devices: AccessControlDevice[];
  loading: boolean;
  error: string | null;

  // Device operations
  getDevices: () => Promise<void>;
  createDevice: (deviceData: Omit<AccessControlDevice, 'id' | 'status' | 'lastSeen' | 'createdAt' | 'updatedAt'>) => Promise<boolean>;
  updateDevice: (deviceId: string, updates: Partial<AccessControlDevice>) => Promise<boolean>;
  deleteDevice: (deviceId: string) => Promise<boolean>;
  testConnection: (deviceId: string) => Promise<boolean>;

  // Utility functions
  clearError: () => void;
}

export function useAccessControlDevices(): UseAccessControlDevicesResult {
  const { publish, subscribe, unsubscribe } = useMqtt();

  // State management
  const [devices, setDevices] = useState<AccessControlDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs untuk tracking promises
  const pendingOperations = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  // MQTT Topics
  const DEVICE_COMMAND_TOPIC = 'accessControl/device/command';
  const DEVICE_RESPONSE_TOPIC = 'accessControl/device/response';

  // Setup MQTT subscriptions
  useEffect(() => {
    const handleDeviceResponse = (topic: string, message: string) => {
      try {
        const response = JSON.parse(message);

        // Handle different response types
        if (response.data?.devices) {
          handleListResponse(response);
        } else if (response.data?.device && !response.data?.old_device) {
          handleCreateResponse(response);
        } else if (response.data?.device && response.data?.old_device) {
          handleUpdateResponse(response);
        } else if (response.data?.deleted_device) {
          handleDeleteResponse(response);
        } else if (response.data?.connection_test) {
          handleTestConnectionResponse(response);
        }
      } catch (err) {
        console.error('Failed to parse MQTT response:', err);
      }
    };

    subscribe(DEVICE_RESPONSE_TOPIC, handleDeviceResponse);

    return () => {
      unsubscribe(DEVICE_RESPONSE_TOPIC, handleDeviceResponse);
      // Cleanup pending operations
      pendingOperations.current.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
      });
      pendingOperations.current.clear();
    };
  }, [subscribe, unsubscribe]);

  // Response handlers
  const handleListResponse = useCallback((response: any) => {
    const operationId = 'device_list';
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.devices) {
        setDevices(response.data.devices);
        toast.success(`Retrieved ${response.data.devices.length} devices`);
      }
      pending?.resolve(response.data);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleCreateResponse = useCallback((response: any) => {
    const operationId = `device_create_${response.data?.device?.deviceId || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.device) {
        setDevices(prev => [...prev, response.data.device]);
        toast.success(`Device ${response.data.device.name} created successfully`);
      }
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleUpdateResponse = useCallback((response: any) => {
    const operationId = `device_update_${response.data?.device?.deviceId || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.device) {
        setDevices(prev => prev.map(device =>
          device.deviceId === response.data.device.deviceId ? response.data.device : device
        ));
        toast.success(`Device ${response.data.device.name} updated successfully`);
      }
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleDeleteResponse = useCallback((response: any) => {
    const operationId = `device_delete_${response.data?.deleted_device?.deviceId || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.deleted_device) {
        setDevices(prev => prev.filter(device => device.deviceId !== response.data.deleted_device.deviceId));
        toast.success(`Device ${response.data.deleted_device.name} deleted successfully`);
      }
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleTestConnectionResponse = useCallback((response: any) => {
    const operationId = `device_test_${response.data?.device_id || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      toast.success(`Connection test successful for device ${response.data?.device_id}`);
      pending?.resolve(true);
    } else {
      toast.error(`Connection test failed: ${response.message}`);
      pending?.reject(new Error(response.message));
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
        publish(DEVICE_COMMAND_TOPIC, JSON.stringify(command));
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

  // Device operations
  const getDevices = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'getData'
      };

      const operationId = 'device_list';
      await sendCommand<void>(command, operationId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get devices';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  const createDevice = useCallback(async (deviceData: Omit<AccessControlDevice, 'id' | 'status' | 'lastSeen' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'createData',
        data: deviceData
      };

      const operationId = `device_create_${deviceData.deviceId}`;
      await sendCommand<any>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const updateDevice = useCallback(async (deviceId: string, updates: Partial<AccessControlDevice>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'updateData',
        data: {
          deviceId,
          ...updates
        }
      };

      const operationId = `device_update_${deviceId}`;
      await sendCommand<any>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const deleteDevice = useCallback(async (deviceId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'deleteData',
        data: {
          deviceId
        }
      };

      const operationId = `device_delete_${deviceId}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete device';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const testConnection = useCallback(async (deviceId: string): Promise<boolean> => {
    setError(null);

    try {
      const command = {
        command: 'testConnection',
        data: {
          deviceId
        }
      };

      const operationId = `device_test_${deviceId}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to test connection';
      setError(message);
      return false;
    }
  }, [sendCommand]);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-load devices on mount
  useEffect(() => {
    getDevices();
  }, [getDevices]);

  return {
    devices,
    loading,
    error,

    // Device operations
    getDevices,
    createDevice,
    updateDevice,
    deleteDevice,
    testConnection,

    // Utility functions
    clearError
  };
}
