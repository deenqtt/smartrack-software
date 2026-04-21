import { useState, useEffect, useCallback } from 'react';
import { useMqtt } from '@/contexts/MqttContext';

interface AlarmData {
  nodeName: string;
  baseTopic: string;
  publishedAt: string;
  totalRecords: number;
  alarmLogs: Array<{
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
}

interface LocationAlarmCount {
  locationId: string;
  locationName: string;
  totalAlarms: number;
  activeAlarms: number;
  clearedAlarms: number;
}

export const useMQTTAlarms = (locations: Array<{ id: string; name: string; topic?: string | null }>) => {
  const [alarmCounts, setAlarmCounts] = useState<Record<string, LocationAlarmCount>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const processAlarmData = useCallback((topic: string, alarmData: AlarmData) => {
    // Topic format: iot/{location_node_name}/Alarm
    // Need to match with location.topic (without /Alarm suffix)
    const originalTopic = topic.replace('/Alarm', '');

    const location = locations.find(loc => loc.topic === originalTopic);

    if (!location) {
      console.warn(`[MQTT] No location found for topic: ${originalTopic}`);
      return;
    }

    // Create alarm counts only for this specific location
    // Include all alarm statuses: ACTIVE, ACKNOWLEDGED, CLEARED
    const counts: LocationAlarmCount = {
      locationId: location.id,
      locationName: location.name,
      totalAlarms: alarmData.totalRecords,
      activeAlarms: alarmData.alarmLogs.filter(log => log.status === 'ACTIVE' || log.status === 'ACKNOWLEDGED').length,
      clearedAlarms: alarmData.alarmLogs.filter(log => log.status === 'CLEARED').length,
    };

    // Only update this specific location's alarm counts
    setAlarmCounts(prev => ({
      ...prev,
      [location.id]: counts
    }));

    setLastUpdate(new Date());
  }, [locations]);

  const { subscribe, unsubscribe, connectionStatus: mqttConnectionStatus } = useMqtt();

  useEffect(() => {
    if (typeof window === 'undefined' || !locations.length) {
      return;
    }

    // Map WebSocket context connection status to expected format
    switch (mqttConnectionStatus) {
      case "Connected":
        setConnectionStatus('connected');
        break;
      case "Connecting":
        setConnectionStatus('connecting');
        break;
      case "Disconnected":
      case "Failed to Connect":
        setConnectionStatus('disconnected');
        break;
      default:
        setConnectionStatus('connecting');
        break;
    }

    // Subscribe to alarm topics using WebSocket context
    const topics = locations
      .filter(loc => loc.topic) // Only locations with topics
      .map(loc => `${loc.topic}/Alarm`);

    const listeners: Array<{ topic: string; listener: (topic: string, payload: string) => void }> = [];

    topics.forEach(topic => {
      const listener = (receivedTopic: string, payload: string) => {
        try {
          const alarmData: AlarmData = JSON.parse(payload);
          processAlarmData(receivedTopic, alarmData);
        } catch (error) {
          console.error('Error parsing MQTT alarm message:', error);
        }
      };

      // Subscribe using WebSocket context
      subscribe(topic, listener);
      listeners.push({ topic, listener });
    });

    console.log('Subscribed to alarm topics:', topics);

    // Cleanup function - unsubscribe from all topics
    return () => {
      listeners.forEach(({ topic, listener }) => {
        unsubscribe(topic, listener);
      });
    };
  }, [locations, processAlarmData, subscribe, unsubscribe, mqttConnectionStatus]);

  const refreshAlarms = useCallback(() => {
    // Optional: Trigger manual refresh if needed
    console.log('Manual alarm refresh requested');
  }, []);

  return {
    alarmCounts,
    connectionStatus,
    lastUpdate,
    refreshAlarms,
  };
};