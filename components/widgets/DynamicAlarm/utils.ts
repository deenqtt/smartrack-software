// Dynamic Alarm Widget Utility Functions

import type { AlarmItemConfig, AlarmData, AlarmStatus } from './types';

export const calculateAlarmStatus = (
  config: AlarmItemConfig,
  data: AlarmData
): AlarmStatus => {
  if (data.status === 'error' || data.status === 'loading') {
    return {
      level: 'critical',
      color: '#ef4444',
      bgColor: '#fef2f2',
      icon: 'AlertTriangle',
      label: data.status === 'error' ? 'Error' : 'Loading'
    };
  }

  if (data.status === 'waiting' || data.value === null) {
    return {
      level: 'warning',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      icon: 'Clock',
      label: 'Waiting'
    };
  }

  // Check threshold if enabled
  if (config.alarmThreshold?.enabled && typeof data.value === 'number') {
    const value = data.value;
    const { min, max } = config.alarmThreshold;

    if ((min !== undefined && value < min) || (max !== undefined && value > max)) {
      return {
        level: 'critical',
        color: '#ef4444',
        bgColor: '#fef2f2',
        icon: 'AlertTriangle',
        label: 'Critical'
      };
    }

    // Warning zone (close to threshold)
    if (min !== undefined && value >= min && value < min + (min * 0.1)) {
      return {
        level: 'warning',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        icon: 'AlertCircle',
        label: 'Warning'
      };
    }

    if (max !== undefined && value <= max && value > max - (max * 0.1)) {
      return {
        level: 'warning',
        color: '#f59e0b',
        bgColor: '#fffbeb',
        icon: 'AlertCircle',
        label: 'Warning'
      };
    }
  }

  // Normal status
  return {
    level: 'normal',
    color: '#10b981',
    bgColor: '#f0fdf4',
    icon: 'CheckCircle',
    label: 'Normal'
  };
};

export const formatAlarmValue = (value: string | number | boolean | null, units?: string): string => {
  if (value === null) return '—';

  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 1 })}M`;
    }
    if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })}K`;
    }
    return value.toLocaleString(undefined, {
      maximumFractionDigits: 2,
      minimumFractionDigits: value % 1 === 0 ? 0 : 1,
    });
  }

  // Simple string conversion like IconStatusCard widget - no complex boolean parsing
  return String(value);
};

export const formatTimeAgo = (date: Date | null, payloadTs?: string | null, retain?: boolean): string => {
  if (payloadTs) return payloadTs;
  if (retain) return '—';
  if (!date) return 'Never';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 30000) return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getTrendIcon = (trend: 'up' | 'down' | 'stable' | null) => {
  switch (trend) {
    case 'up':
      return { icon: 'TrendingUp', color: '#ef4444' };
    case 'down':
      return { icon: 'TrendingDown', color: '#10b981' };
    case 'stable':
      return { icon: 'Minus', color: '#6b7280' };
    default:
      return null;
  }
};

export const calculateTrend = (
  current: string | number | boolean | null,
  previous: string | number | boolean | null
): 'up' | 'down' | 'stable' | null => {
  if (current === null || previous === null) return null;

  const curr = Number(current);
  const prev = Number(previous);

  if (isNaN(curr) || isNaN(prev)) return null;

  const diff = curr - prev;
  if (Math.abs(diff) < 0.001) return 'stable';
  return diff > 0 ? 'up' : 'down';
};

let alarmItemCounter = 0;

export const generateAlarmItemId = (): string => {
  alarmItemCounter += 1;
  return `alarm-${Date.now()}-${alarmItemCounter}`;
};

export const validateAlarmConfig = (config: AlarmItemConfig): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!config.deviceUniqId) {
    errors.push('Device must be selected');
  }

  if (!config.selectedKey) {
    errors.push('Data key must be selected');
  }

  if (!config.customName?.trim()) {
    errors.push('Custom name is required');
  }

  if (!config.selectedIcon) {
    errors.push('Icon must be selected');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};
