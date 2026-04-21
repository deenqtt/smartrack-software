"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useMqtt } from '@/contexts/MqttContext';

export interface AccessControlUser {
  id: string;
  uid: number;
  name: string;
  privilege: number;
  password?: string;
  group_id?: string;
  user_id?: string;
  card?: number;
  devices?: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FingerprintTemplate {
  id: string;
  uid: number;
  fid: number;
  templateData: Buffer;
  size?: number;
  valid: boolean;
  sourceDeviceId?: string;
  storedAt: Date;
  updatedAt: Date;
}

export interface UseAccessControlUsersResult {
  users: AccessControlUser[];
  loading: boolean;
  error: string | null;
  selectedDeviceId: string | null;

  // User CRUD operations
  createUser: (userData: Omit<AccessControlUser, 'id' | 'devices' | 'uid'> & { uid?: number }) => Promise<boolean>;
  getUsers: (deviceId?: string) => Promise<void>;
  getUserByUid: (uid: number, deviceId?: string) => Promise<AccessControlUser | null>;
  updateUser: (uid: number, updates: Partial<AccessControlUser>) => Promise<boolean>;
  deleteUser: (uid: number) => Promise<boolean>;
  getNextAvailableUID: () => Promise<number | null>;
  syncUser: (uid: number, deviceIds?: string[]) => Promise<any>;

  // Fingerprint operations
  getFingerprints: (deviceId?: string) => Promise<FingerprintTemplate[]>;
  getUserFingerprints: (uid: number, deviceId?: string) => Promise<FingerprintTemplate[]>;
  syncFingerprint: (uid: number, fid?: number, deviceIds?: string[]) => Promise<any>;
  syncFingerprints: (uid?: number, deviceIds?: string[]) => Promise<any>;

  // Device selection
  setSelectedDevice: (deviceId: string | null) => void;

  // Utility functions
  clearError: () => void;
}

export function useAccessControlUsers(): UseAccessControlUsersResult {
  const { publish, subscribe, unsubscribe } = useMqtt();

  // State management
  const [users, setUsers] = useState<AccessControlUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  // Refs untuk tracking promises
  const pendingOperations = useRef<Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
    timeout: NodeJS.Timeout;
  }>>(new Map());

  // MQTT Topics
  const USER_COMMAND_TOPIC = 'accessControl/user/command';
  const USER_RESPONSE_TOPIC = 'accessControl/user/response';

  // Setup MQTT subscriptions
  useEffect(() => {
    const handleUserResponse = (topic: string, message: string) => {
      try {
        const response = JSON.parse(message);

        // Handle different response types
        if (response.data?.user && !('deleted_user' in response.data)) {
          handleCreateResponse(response);
        } else if (response.data?.query_type) {
          handleListResponse(response);
        } else if (response.data?.user && 'device_id' in response.data) {
          handleGetByUIDResponse(response);
        } else if (response.data?.user && response.data?.old_user) {
          handleUpdateResponse(response);
        } else if (response.data?.deleted_user) {
          handleDeleteResponse(response);
        } else if (response.data?.next_available_uid !== undefined) {
          handleGetNextAvailableUIDResponse(response);
        } else if (response.data?.synced_devices !== undefined) {
          handleSyncResponse(response);
        } else if (response.data?.consolidated_fingerprints !== undefined || response.data?.fingerprints !== undefined) {
          handleFingerprintListResponse(response);
        }
      } catch (err) {
        console.error('Failed to parse MQTT response:', err);
      }
    };

    subscribe(USER_RESPONSE_TOPIC, handleUserResponse);

    return () => {
      unsubscribe(USER_RESPONSE_TOPIC, handleUserResponse);
      // Cleanup pending operations
      pendingOperations.current.forEach(({ timeout, reject }) => {
        clearTimeout(timeout);
      });
      pendingOperations.current.clear();
    };
  }, [subscribe, unsubscribe]);

  // Response handlers
  const handleCreateResponse = useCallback((response: any) => {
    let operationId: string | null = null;
    let pending: any = null;

    for (const [id, op] of pendingOperations.current.entries()) {
      if (id.startsWith('user_create_')) {
        operationId = id;
        pending = op;
        break;
      }
    }

    if (pending && operationId) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.user) {
        setUsers(prev => {
          const exists = prev.some(user => user.uid === response.data.user.uid);
          if (exists) return prev;
          return [...prev, response.data.user];
        });
        toast.success(`User ${response.data.user.name} created successfully`);

        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('userCreated'));
        }, 500);
      }
      pending?.resolve(true);
    } else {
      const errorMsg = response.message || 'Failed to create user';
      setError(errorMsg);
      toast.error(errorMsg);
      pending?.reject(new Error(errorMsg));
    }

    setLoading(false);
  }, []);

  const handleListResponse = useCallback((response: any) => {
    const operationId = `user_list_${selectedDeviceId || 'all'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.query_type === 'all_devices' && response.data.unique_users) {
        setUsers(response.data.unique_users);
        toast.success(`Retrieved ${response.data.unique_users.length} users`);
      } else if (response.data?.query_type === 'single_device' && response.data.users) {
        setUsers(response.data.users);
        toast.success(`Retrieved ${response.data.users.length} users`);
      }
      pending?.resolve(response.data);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, [selectedDeviceId]);

  const handleGetByUIDResponse = useCallback((response: any) => {
    const operationId = `user_get_${response.data?.user.uid || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.user) {
        pending?.resolve(response.data.user);
      }
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }
  }, []);

  const handleUpdateResponse = useCallback((response: any) => {
    const operationId = `user_update_${response.data?.user.uid || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.user) {
        setUsers(prev => prev.map(user =>
          user.uid === response.data.user.uid ? response.data.user : user
        ));
        toast.success(`User ${response.data.user.name} updated successfully`);

        window.dispatchEvent(new CustomEvent('userUpdateSuccess'));
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
    const operationId = `user_delete_${response.data?.deleted_user.uid || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.deleted_user) {
        setUsers(prev => prev.filter(user => user.uid !== response.data.deleted_user.uid));
        toast.success(`User ${response.data.deleted_user.name} deleted successfully`);
      }
      pending?.resolve(true);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }

    setLoading(false);
  }, []);

  const handleGetNextAvailableUIDResponse = useCallback((response: any) => {
    let foundOperationId: string | null = null;
    let foundPending: any = null;

    for (const [operationId, pending] of pendingOperations.current.entries()) {
      if (operationId.startsWith('user_get_next_uid_')) {
        foundOperationId = operationId;
        foundPending = pending;
        break;
      }
    }

    if (foundPending && foundOperationId) {
      clearTimeout(foundPending.timeout);
      pendingOperations.current.delete(foundOperationId);
    }

    if (response.status === 'success') {
      const nextUid = response.data?.next_available_uid;
      if (nextUid !== undefined && nextUid !== null) {
        foundPending?.resolve(nextUid);
      } else {
        const errorMsg = 'Invalid response: next_available_uid not found';
        setError(errorMsg);
        foundPending?.reject(new Error(errorMsg));
      }
    } else {
      const errorMsg = response.message || 'Failed to get next available UID';
      setError(errorMsg);
      foundPending?.reject(new Error(errorMsg));
    }
  }, []);

  const handleSyncResponse = useCallback((response: any) => {
    const operationId = `user_sync_${response.data?.user.uid || 'unknown'}`;
    const pending = pendingOperations.current.get(operationId);

    if (pending) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      if (response.data?.user) {
        setUsers(prev => prev.map(user =>
          user.uid === response.data.user.uid ? response.data.user : user
        ));

        const syncedCount = response.data.synced_devices;
        const totalCount = response.data.total_devices;
        toast.success(`User ${response.data.user.name} synced to ${syncedCount}/${totalCount} devices`);
      }
      pending?.resolve(response.data);
    } else {
      setError(response.message);
      toast.error(response.message);
      pending?.reject(new Error(response.message));
    }
  }, []);

  const handleFingerprintListResponse = useCallback((response: any) => {
    let operationId: string | null = null;
    let pending: any = null;

    for (const [id, op] of pendingOperations.current.entries()) {
      if (id.startsWith('fingerprint_list_') || id.startsWith('user_fingerprints_')) {
        operationId = id;
        pending = op;
        break;
      }
    }

    if (pending && operationId) {
      clearTimeout(pending.timeout);
      pendingOperations.current.delete(operationId);
    }

    if (response.status === 'success') {
      let fingerprints: FingerprintTemplate[] = [];

      if (response.data?.consolidated_fingerprints) {
        fingerprints = response.data.consolidated_fingerprints;
      } else if (response.data?.fingerprints) {
        fingerprints = response.data.fingerprints;
      }

      pending?.resolve(fingerprints);
    } else {
      const errorMsg = response.message || 'Failed to get fingerprint list';
      setError(errorMsg);
      toast.error(errorMsg);
      pending?.reject(new Error(errorMsg));
    }
  }, []);

  // Generic MQTT command sender
  const sendCommand = useCallback(async <T>(
    command: any,
    operationId: string,
    timeoutMs: number = 30000,
    showTimeoutError: boolean = true
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingOperations.current.delete(operationId);
        const timeoutError = `Operation timed out after ${timeoutMs}ms`;
        setError(timeoutError);
        if (showTimeoutError) {
          toast.error(timeoutError);
        }
        reject(new Error(timeoutError));
      }, timeoutMs);

      pendingOperations.current.set(operationId, {
        resolve,
        reject,
        timeout
      });

      try {
        publish(USER_COMMAND_TOPIC, JSON.stringify(command));
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

  // User CRUD Operations
  const createUser = useCallback(async (userData: Omit<AccessControlUser, 'id' | 'devices' | 'uid'> & { uid?: number }): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'createData',
        data: userData
      };

      const operationId = `user_create_${Date.now()}`;
      await sendCommand<any>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create user';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const getUsers = useCallback(async (deviceId?: string): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'getData',
        data: deviceId ? { device_id: deviceId } : undefined
      };

      const operationId = `user_list_${deviceId || 'all'}`;
      await sendCommand<void>(command, operationId, 30000, false); // Don't show timeout errors for getUsers
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get users';
      setError(message);
      setLoading(false);
    }
  }, [sendCommand]);

  const getUserByUid = useCallback(async (uid: number, deviceId?: string): Promise<AccessControlUser | null> => {
    setError(null);

    try {
      const command = {
        command: 'getByUID',
        data: {
          uid,
          ...(deviceId && { device_id: deviceId })
        }
      };

      const operationId = `user_get_${uid}`;
      const user = await sendCommand<AccessControlUser>(command, operationId);
      return user;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user';
      setError(message);
      return null;
    }
  }, [sendCommand]);

  const updateUser = useCallback(async (uid: number, updates: Partial<AccessControlUser>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'updateData',
        data: {
          uid,
          ...updates
        }
      };

      const operationId = `user_update_${uid}`;
      await sendCommand<any>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const deleteUser = useCallback(async (uid: number): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const command = {
        command: 'deleteData',
        data: {
          uid
        }
      };

      const operationId = `user_delete_${uid}`;
      await sendCommand<boolean>(command, operationId);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      setError(message);
      setLoading(false);
      return false;
    }
  }, [sendCommand]);

  const getNextAvailableUID = useCallback(async (): Promise<number | null> => {
    setError(null);

    try {
      const command = {
        command: 'getNextAvailableUID'
      };

      const operationId = `user_get_next_uid_${Date.now()}`;
      const uid = await sendCommand<number>(command, operationId);
      return uid;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get next available UID';
      setError(message);
      return null;
    }
  }, [sendCommand]);

  const syncUser = useCallback(async (uid: number, deviceIds?: string[]): Promise<any> => {
    setError(null);

    try {
      const command = {
        command: 'syncUser',
        data: {
          uid,
          ...(deviceIds && { device_ids: deviceIds })
        }
      };

      const operationId = `user_sync_${uid}`;
      const result = await sendCommand<any>(command, operationId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync user';
      setError(message);
      return null;
    }
  }, [sendCommand]);

  // Fingerprint operations
  const getFingerprints = useCallback(async (deviceId?: string): Promise<FingerprintTemplate[]> => {
    setError(null);

    try {
      const command = {
        command: 'getFingerprintList',
        data: deviceId ? { device_id: deviceId } : undefined
      };

      const operationId = `fingerprint_list_${deviceId || 'all'}`;
      const fingerprints = await sendCommand<FingerprintTemplate[]>(command, operationId);
      return fingerprints;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get fingerprints';
      setError(message);
      return [];
    }
  }, [sendCommand]);

  const getUserFingerprints = useCallback(async (uid: number, deviceId?: string): Promise<FingerprintTemplate[]> => {
    setError(null);

    try {
      const command = {
        command: 'getFingerprintList',
        data: deviceId ? { device_id: deviceId } : undefined
      };

      const operationId = `user_fingerprints_${uid}_${deviceId || 'all'}`;
      const allFingerprints = await sendCommand<FingerprintTemplate[]>(command, operationId);
      return allFingerprints.filter(fp => fp.uid === uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get user fingerprints';
      setError(message);
      return [];
    }
  }, [sendCommand]);

  const syncFingerprint = useCallback(async (uid: number, fid?: number, deviceIds?: string[]): Promise<any> => {
    setError(null);

    try {
      const command = {
        command: 'syncFingerprint',
        data: {
          uid,
          ...(fid !== undefined && { fid }),
          ...(deviceIds && { device_ids: deviceIds })
        }
      };

      const operationId = `fingerprint_sync_${uid}_${fid || 0}`;
      const result = await sendCommand<any>(command, operationId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync fingerprint';
      setError(message);
      return null;
    }
  }, [sendCommand]);

  const syncFingerprints = useCallback(async (uid?: number, deviceIds?: string[]): Promise<any> => {
    setError(null);

    try {
      const command = {
        command: 'syncFingerprints',
        data: {
          ...(uid !== undefined && { uid }),
          ...(deviceIds && { device_ids: deviceIds })
        }
      };

      const operationId = `fingerprints_sync_${uid || 'all'}_${Date.now()}`;
      const result = await sendCommand<any>(command, operationId);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync fingerprints';
      setError(message);
      return null;
    }
  }, [sendCommand]);

  // Utility functions
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    users,
    loading,
    error,
    selectedDeviceId,

    // User CRUD operations
    createUser,
    getUsers,
    getUserByUid,
    updateUser,
    deleteUser,
    getNextAvailableUID,
    syncUser,

    // Fingerprint operations
    getFingerprints,
    getUserFingerprints,
    syncFingerprint,
    syncFingerprints,

    // Device selection
    setSelectedDevice: setSelectedDeviceId,

    // Utility functions
    clearError
  };
}
