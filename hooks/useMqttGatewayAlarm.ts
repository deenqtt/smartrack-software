import { useState, useEffect, useCallback, useRef } from 'react';
import { useMqttServer } from '@/contexts/MqttServerProvider';

interface AlarmData {
  gatewayName: string;
  baseTopic: string;
  publishedAt: string;
  totalRecords: number;
  summary?: {
    activeAlarms: number;
    clearedAlarms: number;
    acknowledgedAlarms: number;
  };
  alarmLogs?: Array<{
    id: string;
    status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
    triggeringValue: string;
    timestamp: number;
    clearedAt?: number | null;
    alarmConfigId: string;
    alarmConfig: {
      customName: string;
      alarmType: 'CRITICAL' | 'MAJOR' | 'MINOR';
      keyType: 'THRESHOLD' | 'BIT_VALUE';
      key: string;
      deviceUniqId: string;
      minValue?: number;
      maxValue?: number;
      maxOnly: number;
    };
  }>;
  alarmConfigurations?: Array<{
    id: string;
    customName: string;
    alarmType: 'CRITICAL' | 'MAJOR' | 'MINOR';
    keyType: 'THRESHOLD' | 'BIT_VALUE';
    key: string;
    deviceUniqId: string;
    directTriggerOnTrue: boolean;
    totalTriggers: number;
    minValue?: number;
    maxValue?: number;
    maxOnly?: number;
  }>;
}

export interface LocationAlarmCount {
  locationId: string;
  locationName: string;
  totalAlarms: number;
  activeAlarms: number;
  clearedAlarms: number;
  acknowledgedAlarms: number;
}

export interface AlarmDetail {
  id: string;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'CLEARED';
  triggeringValue: string;
  timestamp: number;
  clearedAt?: number | null;
  alarmConfigId: string;
  alarmConfig: {
    customName: string;
    alarmType: 'CRITICAL' | 'MAJOR' | 'MINOR';
    keyType: 'THRESHOLD' | 'BIT_VALUE';
    key: string;
    deviceUniqId: string;
    minValue?: number;
    maxValue?: number;
    maxOnly: number;
  };
}

export interface LocationAlarmDetails {
  locationId: string;
  locationName: string;
  lastUpdated: string;
  alarms: AlarmDetail[];
}

export interface GatewayLocation {
  id: string;
  name: string;
  topic?: string | null;
}

export interface DeviceStatus {
  isOnline: boolean;
  lastSeen: number | null;
}

/**
 * Hook for handling Gateway Location MQTT alarm monitoring and Online Status
 * Subscribes to gateway topics and provides real-time updates.
 * Status is derived from MQTT activity: Message received = Online. No message for 60s = Offline.
 *
 * @param locations - Array of gateway client locations with MQTT topic configuration
 * @returns Object containing alarm counts, connection status, and utility functions
 */
export const useMqttGatewayAlarm = (locations: GatewayLocation[]) => {
  const [alarmCounts, setAlarmCounts] = useState<Record<string, LocationAlarmCount>>({});
  const [alarmDetails, setAlarmDetails] = useState<Record<string, LocationAlarmDetails>>({});
  const [deviceStatuses, setDeviceStatuses] = useState<Record<string, DeviceStatus>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // We use a ref to track lastSeen updates to avoid excessive re-renders during the interval check
  // But we also need state for the UI to update.
  // Strategy: Update state on message arrival. Interval checks state.

  const OFFLINE_THRESHOLD_MS = 60000; // 60 seconds

  // Process incoming alarm data from MQTT
  const processAlarmData = useCallback((location: GatewayLocation, alarmData: AlarmData) => {
    // Create alarm counts for this location
    const counts: LocationAlarmCount = {
      locationId: location.id,
      locationName: location.name,
      totalAlarms: alarmData.totalRecords || 0,
      activeAlarms: 0,
      clearedAlarms: 0,
      acknowledgedAlarms: 0
    };

    // Use summary if available (preferred method)
    if (alarmData.summary) {
      counts.activeAlarms = alarmData.summary.activeAlarms || 0;
      counts.clearedAlarms = alarmData.summary.clearedAlarms || 0;
      counts.acknowledgedAlarms = alarmData.summary.acknowledgedAlarms || 0;
    }
    // Fallback to counting from alarmLogs
    else if (alarmData.alarmLogs) {
      counts.activeAlarms = alarmData.alarmLogs.filter(log =>
        log.status === 'ACTIVE' || log.status === 'ACKNOWLEDGED'
      ).length;
      counts.clearedAlarms = alarmData.alarmLogs.filter(log =>
        log.status === 'CLEARED'
      ).length;
      counts.acknowledgedAlarms = alarmData.alarmLogs.filter(log =>
        log.status === 'ACKNOWLEDGED'
      ).length;
    }

    // Update alarm counts for this location
    setAlarmCounts(prev => ({
      ...prev,
      [location.id]: counts
    }));

    // Store detailed alarm information if available
    let alarmDetailsToStore: AlarmDetail[] = [];

    if (alarmData.alarmLogs && alarmData.alarmLogs.length > 0) {
      // Use alarmLogs if available (original format)
      alarmDetailsToStore = alarmData.alarmLogs;
    } else if (alarmData.alarmConfigurations && alarmData.alarmConfigurations.length > 0) {
      // Transform alarmConfigurations into AlarmDetail format
      const publishedTimestamp = new Date(alarmData.publishedAt).getTime();

      alarmDetailsToStore = alarmData.alarmConfigurations.map(config => ({
        id: config.id,
        status: config.totalTriggers > 0 ? 'ACTIVE' : 'CLEARED', // Consider active if has triggers
        triggeringValue: config.totalTriggers.toString(), // Show trigger count
        timestamp: publishedTimestamp,
        clearedAt: config.totalTriggers === 0 ? publishedTimestamp : null,
        alarmConfigId: config.id,
        alarmConfig: {
          customName: config.customName,
          alarmType: config.alarmType,
          keyType: config.keyType,
          key: config.key,
          deviceUniqId: config.deviceUniqId,
          minValue: config.minValue || 0,
          maxValue: config.maxValue || 0,
          maxOnly: config.maxOnly || 0
        }
      }));
    }

    if (alarmDetailsToStore.length > 0) {
      const details: LocationAlarmDetails = {
        locationId: location.id,
        locationName: location.name,
        lastUpdated: alarmData.publishedAt,
        alarms: alarmDetailsToStore
      };

      setAlarmDetails(prev => ({
        ...prev,
        [location.id]: details
      }));
    }
  }, []);

  const { subscribe, unsubscribe, brokers, isReady } = useMqttServer();
  const getAggregatedStatus = () => {
    if (!isReady || brokers.length === 0) return 'Disconnected';
    if (brokers.some(b => b.status === 'connected')) return 'Connected';
    if (brokers.some(b => b.status === 'connecting')) return 'Connecting';
    return 'Disconnected';
  };
  const mqttConnectionStatus = getAggregatedStatus();

  // Setup MQTT subscriptions
  useEffect(() => {
    if (typeof window === 'undefined' || !locations.length) {
      setIsSubscribed(false);
      return;
    }

    // Map MQTT connection status
    switch (mqttConnectionStatus) {
      case "Connected":
        setConnectionStatus('connected');
        break;
      case "Connecting":
        setConnectionStatus('connecting');
        break;
      case "Disconnected":
        setConnectionStatus('disconnected');
        setIsSubscribed(false);
        break;
      default:
        setConnectionStatus('connecting');
        break;
    }

    // Only subscribe if MQTT is connected
    if (mqttConnectionStatus !== "Connected") {
      return;
    }

    // Get topics to subscribe - both Base and Alarm topics
    const uniqueTopics = new Set<string>();
    locations.forEach(loc => {
      if (loc.topic) {
        uniqueTopics.add(loc.topic);        // Base topic for status/heartbeat
        uniqueTopics.add(`${loc.topic}/Alarm`); // Alarm topic
      }
    });

    const topics = Array.from(uniqueTopics);

    if (topics.length === 0) {
      setIsSubscribed(false);
      return;
    }

    // Create subscription listeners
    const listeners: Array<{ topic: string; listener: (topic: string, payload: string) => void }> = [];

    topics.forEach(topic => {
      const listener = (receivedTopic: string, payload: string) => {
        // 1. Identify Location
        // Base topic could be "iot/id/jakarta"
        // Alarm topic "iot/id/jakarta/Alarm"
        const isAlarmTopic = receivedTopic.endsWith('/Alarm');
        const baseTopic = isAlarmTopic ? receivedTopic.replace('/Alarm', '') : receivedTopic;

        const location = locations.find(loc => loc.topic === baseTopic);

        if (!location) return;

        // 2. Update Status (Heartbeat) - ANY message considers the device online
        setDeviceStatuses(prev => ({
          ...prev,
          [location.id]: { isOnline: true, lastSeen: Date.now() }
        }));
        setLastUpdate(new Date());

        // 3. Process Alarm Data if applicable
        if (isAlarmTopic) {
          try {
            const alarmData: AlarmData = JSON.parse(payload);
            processAlarmData(location, alarmData);
          } catch (error) {
            console.error('[useMqttGatewayAlarm] Error parsing alarm JSON:', error);
          }
        }
      };

      subscribe(topic, listener);
      listeners.push({ topic, listener });
    });

    setIsSubscribed(true);

    // Cleanup function - unsubscribe from all topics
    return () => {
      listeners.forEach(({ topic, listener }) => {
        unsubscribe(topic, listener);
      });
      setIsSubscribed(false);
    };
  }, [locations, processAlarmData, subscribe, unsubscribe, mqttConnectionStatus]);


  // Offline Checker Interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();
      setDeviceStatuses(prev => {
        const next = { ...prev };
        let hasChanges = false;

        Object.keys(next).forEach(locationId => {
          const status = next[locationId];
          if (status.isOnline && status.lastSeen) {
            if (now - status.lastSeen > OFFLINE_THRESHOLD_MS) {
              next[locationId] = { ...status, isOnline: false };
              hasChanges = true;
            }
          }
        });

        return hasChanges ? next : prev;
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(intervalId);
  }, []);


  // Utility function to get alarm data for a specific location
  const getLocationAlarmData = useCallback((locationId: string): LocationAlarmCount | null => {
    return alarmCounts[locationId] || null;
  }, [alarmCounts]);

  // Utility to get online status
  const getDeviceStatus = useCallback((locationId: string): DeviceStatus => {
    return deviceStatuses[locationId] || { isOnline: false, lastSeen: null };
  }, [deviceStatuses]);

  const hasActiveAlarms = useCallback((): boolean => {
    return Object.values(alarmCounts).some(counts => counts.activeAlarms > 0);
  }, [alarmCounts]);

  // Function to get detailed alarm data for a specific location
  const getLocationAlarmDetails = useCallback((locationId: string): LocationAlarmDetails | null => {
    return alarmDetails[locationId] || null;
  }, [alarmDetails]);

  return {
    // Data
    alarmCounts,
    alarmDetails,
    deviceStatuses,
    connectionStatus,
    lastUpdate,
    isSubscribed,

    // Utility functions
    getLocationAlarmData,
    getLocationAlarmDetails,
    getDeviceStatus,
    hasActiveAlarms,
  };
};
