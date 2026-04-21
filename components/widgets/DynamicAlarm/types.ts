// Dynamic Alarm Widget Types and Interfaces

export interface AlarmItemConfig {
  id: string;
  deviceUniqId: string;
  selectedKey: string;
  customName: string;
  selectedIcon: string;
  iconColor: string;
  iconBgColor: string;
  displayStyle: 'badges' | 'cards' | 'list';
  alarmThreshold?: {
    min?: number | undefined;
    max?: number | undefined;
    enabled: boolean;
  };
  enabled: boolean;
}

export interface DynamicAlarmConfig {
  widgetTitle: string;
  showOfflineDevices: boolean;
  autoRefreshInterval: number; // in seconds
  treatMissingDataAsFalse?: boolean; // New option: treat missing data as false instead of null
  items: AlarmItemConfig[];
}

export interface AlarmData {
  value: string | number | boolean | null;
  status: 'loading' | 'error' | 'ok' | 'waiting';
  lastUpdate: Date | null;
  errorMessage?: string;
  isRetain?: boolean;
  payloadTimestamp?: string | null;
  trend?: 'up' | 'down' | 'stable' | null;
  previousValue?: string | number | boolean | null;
}

export interface DeviceInfo {
  uniqId: string;
  name: string;
  topic: string;
  address?: string;
}

export interface AlarmStatus {
  level: 'normal' | 'warning' | 'critical';
  color: string;
  bgColor: string;
  icon: string;
  label: string;
}

export type DisplayStyle = 'badges' | 'cards' | 'list';
