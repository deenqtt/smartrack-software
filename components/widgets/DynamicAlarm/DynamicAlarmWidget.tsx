"use client";

import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from "react";
import { useMqttServer } from "@/contexts/MqttServerProvider";
import {
  AlertTriangle,
  Loader2,
  WifiOff,
  Clock,
  Wifi,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  Settings,
  CheckCircle,
  Info,
  X,
  Database,
  Activity,
  Pin,
} from "lucide-react";
import { getIconComponent } from "@/lib/icon-library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DynamicAlarmConfig, AlarmData, DeviceInfo } from './types';
import { calculateAlarmStatus, formatAlarmValue, formatTimeAgo, calculateTrend, getTrendIcon } from './utils';

// Import design system
import { chartDesignSystem, getResponsiveSize } from "../design-system";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: DynamicAlarmConfig;
  isEditMode?: boolean;
}

export const DynamicAlarmWidget = ({ config, isEditMode = false }: Props) => {
  const { subscribe, unsubscribe, isReady, brokers } = useMqttServer();

  // Safe access to config properties
  const items = config?.items || [];
  const showOfflineDevices = config?.showOfflineDevices ?? false;
  const treatMissingDataAsFalse = config?.treatMissingDataAsFalse ?? false;
  const widgetTitle = config?.widgetTitle || "Alarm Widget";

  // State management
  const [alarmData, setAlarmData] = useState<Map<string, AlarmData>>(new Map());
  const [deviceTopics, setDeviceTopics] = useState<Map<string, string>>(new Map());
  const [deviceInfos, setDeviceInfos] = useState<Map<string, DeviceInfo>>(new Map());
  const [connectionStatuses, setConnectionStatuses] = useState<Map<string, boolean>>(new Map());
  const [filterStatus, setFilterStatus] = useState<'all' | 'critical' | 'warning' | 'normal'>('all');
  const [showOffline, setShowOffline] = useState(showOfflineDevices);

  // Modal and device details state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [deviceDetails, setDeviceDetails] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);

  // Enhanced responsive layout system
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [dynamicSizes, setDynamicSizes] = useState({
    titleFontSize: 14,
    headerPadding: 12,
    contentPadding: 16,
    itemGap: 8,
    badgeFontSize: 11,
  });

  // Enhanced responsive calculation
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateLayout = () => {
      const rect = container.getBoundingClientRect();
      const { width, height } = rect;
      setDimensions({ width, height });

      // Calculate responsive sizes using design system
      const titleFontSize = getResponsiveSize(14, width, 12, 16);
      const headerPadding = getResponsiveSize(12, width, 8, 16);
      const contentPadding = getResponsiveSize(16, width, 12, 20);
      const itemGap = getResponsiveSize(8, width, 6, 12);
      const badgeFontSize = getResponsiveSize(11, width, 10, 12);

      setDynamicSizes({
        titleFontSize,
        headerPadding,
        contentPadding,
        itemGap,
        badgeFontSize,
      });
    };

    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(container);
    updateLayout();

    return () => resizeObserver.disconnect();
  }, []);

  // Calculate connection status
  const connectionStatus = brokers.some(broker => broker.status === 'connected');

  // Fetch device topics and info
  const fetchDeviceData = useCallback(async () => {
    const devicePromises = items.map(async (item) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/devices/external/${item.deviceUniqId}`);
        if (!response.ok) {
          throw new Error(`Device ${item.deviceUniqId} not found`);
        }
        const deviceData = await response.json();
        return {
          itemId: item.id,
          topic: deviceData.topic,
          deviceInfo: {
            uniqId: deviceData.uniqId,
            name: deviceData.name,
            topic: deviceData.topic,
            address: deviceData.address,
          } as DeviceInfo
        };
      } catch (error) {
        console.error(`Failed to fetch device ${item.deviceUniqId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(devicePromises);
    const validResults = results.filter(result => result !== null);

    const newTopics = new Map<string, string>();
    const newDeviceInfos = new Map<string, DeviceInfo>();

    validResults.forEach(result => {
      if (result) {
        newTopics.set(result.itemId, result.topic);
        newDeviceInfos.set(result.itemId, result.deviceInfo);
      }
    });

    setDeviceTopics(newTopics);
    setDeviceInfos(newDeviceInfos);
  }, [items]);

  // Initialize data fetching
  useEffect(() => {
    fetchDeviceData();

    // Initialize alarm data for all items
    const initialData = new Map<string, AlarmData>();
    items.forEach(item => {
      initialData.set(item.id, {
        value: treatMissingDataAsFalse ? false : null,
        status: 'waiting',
        lastUpdate: null,
      });
    });
    setAlarmData(initialData);
  }, [items, treatMissingDataAsFalse, fetchDeviceData]);

  // MQTT message handler
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string, serverId: string, retained?: boolean) => {
      try {
        console.log(`[MQTT_DEBUG] Received on topic ${receivedTopic}:`, payloadString);

        const payload = JSON.parse(payloadString);

        // Find ALL alarm items that match this topic (multiple items can monitor different keys from same device)
        const matchedItemIds: string[] = [];
        for (const [itemId, topic] of deviceTopics.entries()) {
          if (receivedTopic === topic) {
            matchedItemIds.push(itemId);
          }
        }

        if (matchedItemIds.length === 0) {
          console.log(`[MQTT_DEBUG] No matching items for topic ${receivedTopic}`);
          return;
        }

        console.log(`[MQTT_DEBUG] Found ${matchedItemIds.length} matching items:`, matchedItemIds);

        // Process each matching item
        matchedItemIds.forEach(itemId => {
          const item = items.find(item => item.id === itemId);
          if (!item) {
            console.log(`[MQTT_DEBUG] Item ${itemId} not found in config`);
            return;
          }

          console.log(`[MQTT_DEBUG] Processing item ${item.customName} with key ${item.selectedKey}`);

          // Parse payload for this specific item - ROBUST HANDLING FOR ALL DATA TYPES
          const innerPayload = (() => {
            console.log(`[MQTT_PARSE_DEBUG] Parsing payload for ${item.customName}:`, {
              payloadValue: payload.value,
              payloadValueType: typeof payload.value,
              selectedKey: item.selectedKey
            });

            // Handle different payload structures
            if (typeof payload.value === "string") {
              console.log(`[MQTT_PARSE_DEBUG] Payload is string, attempting JSON parse`);

              // Try to parse as JSON first
              try {
                const parsed = JSON.parse(payload.value);
                console.log(`[MQTT_PARSE_DEBUG] JSON parsed successfully:`, parsed);

                // If parsed result is an object, return it directly
                if (typeof parsed === 'object' && parsed !== null) {
                  console.log(`[MQTT_PARSE_DEBUG] Returning parsed object directly`);
                  return parsed;
                }
                // If parsed result is a primitive, wrap it in an object
                console.log(`[MQTT_PARSE_DEBUG] Wrapping parsed primitive in object`);
                return { [item.selectedKey]: parsed };
              } catch (jsonError) {
                console.log(`[MQTT_PARSE_DEBUG] JSON parse failed, processing as string:`, jsonError);

                // If not valid JSON, check if it's a plain boolean or other value
                const trimmedValue = payload.value.trim();
                const lowerValue = trimmedValue.toLowerCase();

                console.log(`[MQTT_PARSE_DEBUG] Processing string value: "${trimmedValue}" -> "${lowerValue}"`);

                // Handle boolean strings - convert to actual booleans
                if (lowerValue === 'true') {
                  console.log(`[MQTT_PARSE_DEBUG] Converting "true" string to boolean true`);
                  return { [item.selectedKey]: true };
                }
                if (lowerValue === 'false') {
                  console.log(`[MQTT_PARSE_DEBUG] Converting "false" string to boolean false`);
                  return { [item.selectedKey]: false };
                }

                // Handle numeric strings
                const numValue = Number(trimmedValue);
                if (!isNaN(numValue) && trimmedValue !== '') {
                  console.log(`[MQTT_PARSE_DEBUG] Converting numeric string to number: ${numValue}`);
                  return { [item.selectedKey]: numValue };
                }

                // Handle other string boolean representations
                if (['on', '1', 'active', 'enabled', 'yes'].includes(lowerValue)) {
                  console.log(`[MQTT_PARSE_DEBUG] Converting truthy string "${lowerValue}" to boolean true`);
                  return { [item.selectedKey]: true };
                }
                if (['off', '0', 'inactive', 'disabled', 'no'].includes(lowerValue)) {
                  console.log(`[MQTT_PARSE_DEBUG] Converting falsy string "${lowerValue}" to boolean false`);
                  return { [item.selectedKey]: false };
                }

                // Otherwise treat as plain string
                console.log(`[MQTT_PARSE_DEBUG] Treating as plain string: "${payload.value}"`);
                return { [item.selectedKey]: payload.value };
              }
            } else if (typeof payload.value === "object" && payload.value !== null) {
              // If payload.value is already an object, return it directly
              console.log(`[MQTT_PARSE_DEBUG] Payload is object, returning directly:`, payload.value);
              return payload.value;
            } else {
              // If payload.value is a primitive (boolean, number, etc.), wrap it in an object
              console.log(`[MQTT_PARSE_DEBUG] Payload is primitive, wrapping in object:`, payload.value);
              return { [item.selectedKey]: payload.value };
            }
          })();

          console.log(`[MQTT_DEBUG] Parsed payload for ${item.customName}:`, innerPayload);

          // Check if the message contains the configured key for this specific item
          if (innerPayload.hasOwnProperty(item.selectedKey)) {
            let rawValue = innerPayload[item.selectedKey];
            console.log(`[MQTT_DEBUG] Found value for key ${item.selectedKey}:`, rawValue);

            // Store original value like SingleValueCard (Metric Display) widget
            // DynamicAlarm doesn't have multiply property, so just store rawValue
            const finalValue = rawValue;

            setAlarmData(prevData => {
              const newData = new Map(prevData);
              const currentData = newData.get(itemId) || {
                value: null,
                status: 'waiting',
                lastUpdate: null,
              };



              newData.set(itemId, {
                ...currentData,
                value: finalValue,
                status: 'ok',
                lastUpdate: new Date(),
                isRetain: retained || false,
                payloadTimestamp: payload.Timestamp || innerPayload.Timestamp || null,
                trend: calculateTrend(finalValue, currentData.value),
                previousValue: currentData.value,
              });

              return newData;
            });

            // Update connection status for this item
            setConnectionStatuses(prev => new Map(prev.set(itemId, true)));

            console.log(`[MQTT_DEBUG] Updated data for item ${item.customName}:`, finalValue);

            // CRITICAL FIX: Ensure boolean false values are properly stored
            // If finalValue is exactly false (not falsy), make sure it's stored as boolean false
            if (finalValue === false) {
              console.log(`[MQTT_DEBUG] Storing explicit boolean false for ${item.customName}`);
            }
          } else {
            console.log(`[MQTT_DEBUG] Key ${item.selectedKey} not found in payload for item ${item.customName}`);
            console.log(`[MQTT_DEBUG] Available keys:`, Object.keys(innerPayload));
          }
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload:", e);
        console.error("Raw payload string:", payloadString);
      }
    },
    [deviceTopics, items]
  );

  // MQTT subscriptions
  useEffect(() => {
    if (!isReady || !connectionStatus) return;

    // Subscribe to all device topics
    deviceTopics.forEach((topic, itemId) => {
      subscribe(topic, handleMqttMessage);
    });

    return () => {
      deviceTopics.forEach((topic) => {
        unsubscribe(topic, handleMqttMessage);
      });
    };
  }, [deviceTopics, isReady, connectionStatus, subscribe, unsubscribe, handleMqttMessage]);

  // Auto refresh connection statuses removed to prevent flickering
  useEffect(() => {
    // Statuses updated when MQTT messages arrive
  }, [deviceTopics, alarmData]);

  // Filter and sort alarm items - prioritize enabled items first
  const filteredItems = items
    .filter(item => {
      const data = alarmData.get(item.id);
      const isOnline = connectionStatuses.get(item.id) !== false;

      // Filter by online/offline status
      if (!showOffline && !isOnline) return false;

      // Filter by alarm status
      if (filterStatus === 'all') return true;

      const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
      return status.level === filterStatus;
    })
    .sort((a, b) => {
      // Sort by enabled status first (enabled items come first)
      if (a.enabled && !b.enabled) return -1;
      if (!a.enabled && b.enabled) return 1;

      // Then sort by alarm status priority (critical > warning > normal)
      const aData = alarmData.get(a.id);
      const bData = alarmData.get(b.id);
      const aStatus = calculateAlarmStatus(a, aData || { value: null, status: 'waiting', lastUpdate: null });
      const bStatus = calculateAlarmStatus(b, bData || { value: null, status: 'waiting', lastUpdate: null });

      const statusPriority = { critical: 3, warning: 2, normal: 1 };
      const aPriority = statusPriority[aStatus.level];
      const bPriority = statusPriority[bStatus.level];

      if (aPriority !== bPriority) return bPriority - aPriority;

      // Finally sort by name
      return a.customName.localeCompare(b.customName);
    });

  // Helper function to evaluate value as three states: true, false, or null
  // Simplified logic like IconStatusCard widget
  const evaluateAsThreeState = (value: string | number | boolean | null | undefined): 'true' | 'false' | 'null' => {
    if (value === null || value === undefined) return 'null';

    // For boolean values, check truthiness
    if (typeof value === 'boolean') return value ? 'true' : 'false';

    // For numbers, check if > 0
    if (typeof value === 'number') return value > 0 ? 'true' : 'false';

    // For strings, check if it's not empty and not "false"/"0"
    if (typeof value === 'string') {
      const trimmed = value.trim().toLowerCase();
      if (trimmed === '' || trimmed === 'false' || trimmed === '0') return 'false';
      return 'true';
    }

    // Default to false for other types
    return 'false';
  };

  // Helper function for conditional background based on three-state value
  const getConditionalBackground = (data: AlarmData | undefined, isOnline: boolean) => {
    if (!isOnline) return 'bg-muted/50 border-muted';

    const value = data?.value;
    const state = evaluateAsThreeState(value);

    switch (state) {
      case 'true':
        // True case - use green background
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'false':
        // False case - use red background
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'null':
      default:
        // Null case - use neutral gray background
        return 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  // Helper function to get value color based on three-state evaluation
  const getValueColor = (value: string | number | boolean | null | undefined): string => {
    const state = evaluateAsThreeState(value);

    switch (state) {
      case 'true':
        return '#10b981'; // green-500
      case 'false':
        return '#ef4444'; // red-500
      case 'null':
      default:
        return '#6b7280'; // gray-500
    }
  };

  // Click handler for showing device details
  const handleWidgetClick = async (e: React.MouseEvent) => {
    // Don't show details if in edit mode
    if (isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    if (!items.length) return;

    setIsDetailModalOpen(true);
    setIsLoadingDetails(true);

    try {
      // Fetch detailed device information for all devices in the widget
      const devicePromises = items.map(async (item) => {
        try {
          const response = await fetch(`${API_BASE_URL}/api/devices/external/${item.deviceUniqId}`);
          if (response.ok) {
            return await response.json();
          }
          return null;
        } catch (error) {
          console.error(`Failed to fetch device ${item.deviceUniqId}:`, error);
          return null;
        }
      });

      const devices = await Promise.all(devicePromises);
      const validDevices = devices.filter(device => device !== null);

      if (validDevices.length > 0) {
        // For simplicity, show details of the first device
        // In a real implementation, you might want to show all devices or allow selection
        setDeviceDetails(validDevices[0]);
      }
    } catch (error) {
      console.error('Failed to fetch device details:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Render functions for different display styles
  const renderBadgesView = () => (
    <div className="space-y-2">
      {filteredItems.map((item) => {
        const data = alarmData.get(item.id);
        const deviceInfo = deviceInfos.get(item.id);
        const isOnline = connectionStatuses.get(item.id) !== false;
        const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
        const IconComponent = getIconComponent(item.selectedIcon || "Zap");

        return (
          <div
            key={item.id}
            className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-sm font-medium transition-all min-w-0 ${getConditionalBackground(data, isOnline)} ${!item.enabled ? 'opacity-60' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div
                className="flex items-center justify-center rounded-lg flex-shrink-0"
                style={{
                  backgroundColor: item.iconBgColor,
                  color: item.iconColor,
                  width: 32,
                  height: 32,
                }}
              >
                {IconComponent && <IconComponent size={16} />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium truncate ${!item.enabled ? 'line-through' : ''}`}>
                    {item.customName}
                  </span>
                  {!item.enabled && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      Disabled
                    </Badge>
                  )}
                  {!isOnline && <WifiOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <span>{formatAlarmValue(data?.value || null)}</span>
                  <span>•</span>
                  <span>{formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}</span>
                </div>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="text-xs px-2 py-1 flex-shrink-0"
              style={{
                backgroundColor: status.bgColor,
                color: status.color,
                borderColor: status.color,
              }}
            >
              {status.label}
            </Badge>
          </div>
        );
      })}
    </div>
  );

  const renderCardsView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
      {filteredItems.map((item) => {
        const data = alarmData.get(item.id);
        const deviceInfo = deviceInfos.get(item.id);
        const isOnline = connectionStatuses.get(item.id) !== false;
        const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
        const IconComponent = getIconComponent(item.selectedIcon || "Zap");
        const trend = getTrendIcon(data?.trend || null);

        return (
          <div
            key={item.id}
            className={`group relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${isOnline
                ? 'bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-700/50 border-slate-200/80 dark:border-slate-600/80 shadow-xl'
                : 'bg-gradient-to-br from-slate-100 to-slate-200/50 dark:from-slate-900/50 dark:to-slate-800/50 border-slate-300/60 dark:border-slate-500/60'
              } ${!item.enabled ? 'opacity-60' : ''}`}
          >
            {/* Status indicator stripe */}
            <div
              className="h-1 w-full transition-all duration-300"
              style={{ backgroundColor: status.bgColor }}
            />

            {/* Card Content */}
            <div className="p-6">
              {/* Header Section */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center rounded-2xl shadow-lg ring-4 ring-white/20 dark:ring-slate-800/20"
                    style={{
                      backgroundColor: item.iconBgColor,
                      color: item.iconColor,
                      width: 56,
                      height: 56,
                    }}
                  >
                    {IconComponent && <IconComponent size={28} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-lg font-bold text-slate-900 dark:text-slate-100 truncate mb-1 ${!item.enabled ? 'line-through' : ''}`}>
                      {item.customName}
                    </h3>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {deviceInfo?.name || 'Unknown Device'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-xs font-bold shadow-sm"
                    style={{
                      backgroundColor: status.bgColor,
                      color: status.color,
                      borderColor: status.color,
                    }}
                  >
                    {status.label}
                  </Badge>
                  {!isOnline && <WifiOff className="h-5 w-5 text-slate-400" />}
                </div>
              </div>

              {/* Value Display Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-3">
                    <span
                      className="text-3xl font-black tabular-nums"
                      style={{
                        color: getValueColor(data?.value)
                      }}
                    >
                      {formatAlarmValue(data?.value || null)}
                    </span>
                    {trend && (
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700" style={{ color: trend.color }}>
                        {React.createElement(
                          getIconComponent(trend.icon) || AlertTriangle,
                          { size: 16 }
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="pt-4 border-t border-slate-200/60 dark:border-slate-600/60">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span className="font-medium">Updated</span>
                  </div>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}
                  </span>
                </div>
              </div>
            </div>

            {/* Hover effect overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            {/* Disabled overlay */}
            {!item.enabled && (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/20 to-slate-900/10 dark:from-slate-100/20 dark:to-slate-100/10 flex items-center justify-center rounded-2xl backdrop-blur-sm">
                <div className="bg-white/90 dark:bg-slate-800/90 px-4 py-2 rounded-full shadow-lg">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Disabled</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderListView = () => (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800 shadow-sm">
      {/* Table Header */}
      <div className="bg-slate-50 dark:bg-slate-700 px-4 py-3 border-b border-slate-200 dark:border-slate-600">
        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <div className="col-span-4">Monitor Name</div>
          <div className="col-span-2 text-center">Current Value</div>
          <div className="col-span-2 text-center">Status</div>
          <div className="col-span-2 text-center">Device</div>
          <div className="col-span-2 text-center">Last Update</div>
        </div>
      </div>

      {/* Table Body */}
      <div className="divide-y divide-slate-200 dark:divide-slate-700">
        {filteredItems.map((item, index) => {
          const data = alarmData.get(item.id);
          const deviceInfo = deviceInfos.get(item.id);
          const isOnline = connectionStatuses.get(item.id) !== false;
          const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
          const IconComponent = getIconComponent(item.selectedIcon || "Zap");

          return (
            <div
              key={item.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!isOnline ? 'opacity-60 bg-slate-25 dark:bg-slate-800/30' : ''
                } ${!item.enabled ? 'opacity-50' : ''}`}
            >
              {/* Name Column */}
              <div className="col-span-4 flex items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-lg shadow-sm"
                  style={{
                    backgroundColor: item.iconBgColor,
                    color: item.iconColor,
                    width: 32,
                    height: 32,
                  }}
                >
                  {IconComponent && <IconComponent size={16} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-slate-900 dark:text-slate-100 truncate ${!item.enabled ? 'line-through' : ''}`}>
                    {item.customName}
                  </div>
                  {!item.enabled && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Disabled
                    </Badge>
                  )}
                </div>
              </div>

              {/* Value Column */}
              <div className="col-span-2 flex items-center justify-center">
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatAlarmValue(data?.value || null)}
                </span>
              </div>

              {/* Status Column */}
              <div className="col-span-2 flex items-center justify-center">
                <Badge
                  variant="secondary"
                  className="font-medium"
                  style={{
                    backgroundColor: status.bgColor,
                    color: status.color,
                    borderColor: status.color,
                  }}
                >
                  {status.label}
                </Badge>
              </div>

              {/* Device Column */}
              <div className="col-span-2 flex items-center justify-center">
                <span className="text-center text-slate-600 dark:text-slate-400 truncate max-w-full">
                  {deviceInfo?.name || 'Unknown'}
                </span>
              </div>

              {/* Updated Column */}
              <div className="col-span-2 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}
                  </div>
                  {!isOnline && (
                    <div className="flex items-center justify-center mt-1">
                      <WifiOff className="h-3 w-3 text-slate-400" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 && (
        <div className="px-4 py-8 text-center">
          <div className="text-slate-400 dark:text-slate-500 mb-2">
            <AlertTriangle className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No items to display
          </p>
        </div>
      )}
    </div>
  );

  const renderContent = () => {
    if (filteredItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {items.length === 0 ? 'No alarm items configured' : 'No items match current filters'}
          </p>
        </div>
      );
    }

    // Group items by display style
    const badgesItems = filteredItems.filter(item => item.displayStyle === 'badges');
    const cardsItems = filteredItems.filter(item => item.displayStyle === 'cards');
    const listItems = filteredItems.filter(item => item.displayStyle === 'list');

    return (
      <div className="space-y-6">
        {/* Badges Section */}
        {badgesItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Badges View ({badgesItems.length})
            </h4>
            <div className="space-y-2">
              {badgesItems.map((item) => {
                const data = alarmData.get(item.id);
                const deviceInfo = deviceInfos.get(item.id);
                const isOnline = connectionStatuses.get(item.id) !== false;
                const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
                const IconComponent = getIconComponent(item.selectedIcon || "Zap");

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-lg border text-sm font-medium transition-all min-w-0 ${getConditionalBackground(data, isOnline)} ${!item.enabled ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className="flex items-center justify-center rounded-lg flex-shrink-0"
                        style={{
                          backgroundColor: item.iconBgColor,
                          color: item.iconColor,
                          width: 32,
                          height: 32,
                        }}
                      >
                        {IconComponent && <IconComponent size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium truncate ${!item.enabled ? 'line-through' : ''}`}>
                            {item.customName}
                          </span>
                          {!item.enabled && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Disabled
                            </Badge>
                          )}
                          {!isOnline && <WifiOff className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>{formatAlarmValue(data?.value || null)}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}</span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="secondary"
                      className="text-xs px-2 py-1 flex-shrink-0"
                      style={{
                        backgroundColor: status.bgColor,
                        color: status.color,
                        borderColor: status.color,
                      }}
                    >
                      {status.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cards Section */}
        {cardsItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Cards View ({cardsItems.length})
            </h4>
            <div className="space-y-3">
              {cardsItems.map((item) => {
                const data = alarmData.get(item.id);
                const deviceInfo = deviceInfos.get(item.id);
                const isOnline = connectionStatuses.get(item.id) !== false;
                const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
                const IconComponent = getIconComponent(item.selectedIcon || "Zap");
                const trend = getTrendIcon(data?.trend || null);

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border transition-all ${isOnline ? 'bg-card border-border shadow-sm' : 'bg-muted/30 border-muted'
                      } ${!item.enabled ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: item.iconBgColor,
                            color: item.iconColor,
                            width: dynamicSizes.badgeFontSize * 2.5,
                            height: dynamicSizes.badgeFontSize * 2.5,
                          }}
                        >
                          {IconComponent && <IconComponent style={{ width: dynamicSizes.badgeFontSize * 1.5, height: dynamicSizes.badgeFontSize * 1.5 }} />}
                        </div>
                        <div>
                          <h4 className={`font-medium text-sm ${!item.enabled ? 'line-through' : ''}`}>{item.customName}</h4>
                          <p className="text-xs text-muted-foreground">{deviceInfo?.name || 'Unknown Device'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!item.enabled && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Disabled
                          </Badge>
                        )}
                        <Badge
                          variant="secondary"
                          className="text-xs"
                          style={{
                            backgroundColor: status.bgColor,
                            color: status.color,
                            borderColor: status.color,
                          }}
                        >
                          {status.label}
                        </Badge>
                        {!isOnline && <WifiOff className="h-3 w-3 text-muted-foreground" />}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold">
                          {formatAlarmValue(data?.value || null)}
                        </span>
                        {trend && (
                          <div style={{ color: trend.color }}>
                            {React.createElement(
                              getIconComponent(trend.icon) || AlertTriangle,
                              { size: 14 }
                            )}
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground text-right">
                        {formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* List Section */}
        {listItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              List View ({listItems.length})
            </h4>
            <div className="space-y-1">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-2 py-1 text-xs font-medium text-muted-foreground border-b">
                <div className="col-span-4">Name</div>
                <div className="col-span-2 text-center">Value</div>
                <div className="col-span-2 text-center">Status</div>
                <div className="col-span-2 text-center">Device</div>
                <div className="col-span-2 text-center">Updated</div>
              </div>

              {/* Items */}
              {listItems.map((item) => {
                const data = alarmData.get(item.id);
                const deviceInfo = deviceInfos.get(item.id);
                const isOnline = connectionStatuses.get(item.id) !== false;
                const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });
                const IconComponent = getIconComponent(item.selectedIcon || "Zap");

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-12 gap-2 px-2 py-2 text-xs rounded hover:bg-muted/50 transition-colors ${!isOnline ? 'opacity-60' : ''
                      } ${!item.enabled ? 'opacity-60' : ''}`}
                  >
                    <div className="col-span-4 flex items-center gap-2">
                      <div
                        className="flex items-center justify-center rounded"
                        style={{
                          backgroundColor: item.iconBgColor,
                          color: item.iconColor,
                          width: dynamicSizes.badgeFontSize * 1.5,
                          height: dynamicSizes.badgeFontSize * 1.5,
                        }}
                      >
                        {IconComponent && <IconComponent style={{ width: dynamicSizes.badgeFontSize, height: dynamicSizes.badgeFontSize }} />}
                      </div>
                      <span className={`font-medium truncate ${!item.enabled ? 'line-through' : ''}`}>{item.customName}</span>
                      {!item.enabled && (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Disabled
                        </Badge>
                      )}
                    </div>

                    <div className="col-span-2 text-center font-mono">
                      {formatAlarmValue(data?.value || null)}
                    </div>

                    <div className="col-span-2 flex justify-center">
                      <Badge
                        variant="secondary"
                        className="text-xs"
                        style={{
                          backgroundColor: status.bgColor,
                          color: status.color,
                          borderColor: status.color,
                        }}
                      >
                        {status.label}
                      </Badge>
                    </div>

                    <div className="col-span-2 text-center truncate">
                      {deviceInfo?.name || '—'}
                    </div>

                    <div className="col-span-2 text-center text-muted-foreground">
                      {formatTimeAgo(data?.lastUpdate || null, data?.payloadTimestamp || null, data?.isRetain || false)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden rounded-xl shadow-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
        style={{
          minWidth: chartDesignSystem.layout.minWidgetWidth,
          minHeight: chartDesignSystem.layout.minWidgetHeight,
        }}
      >
        {/* Status indicator - Removed green dot since WiFi icon already shows status */}
        {/* Modern Header */}
        <div
          className="bg-gradient-to-r from-slate-50/80 to-white/80 dark:from-slate-800/80 dark:to-slate-900/80 backdrop-blur-sm border-b border-slate-200/40 dark:border-slate-700/40"
          style={{ padding: `${dynamicSizes.headerPadding}px` }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4" />
              <div>
                <h3
                  className="text-slate-800 dark:text-slate-200 font-semibold truncate"
                  style={{ fontSize: `${dynamicSizes.titleFontSize}px` }}
                >
                  {widgetTitle}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {filteredItems.length} active monitor{filteredItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Connection Status - WiFi Icon */}
              <Wifi
                className={`h-5 w-5 ${connectionStatus
                    ? 'text-green-500'
                    : !isReady || brokers.length === 0
                      ? 'text-orange-500'
                      : 'text-red-500'
                  }`}
              />

              {/* Info Button - Positioned after WiFi icon */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  handleWidgetClick(e);
                }}
                title={isEditMode ? "Edit mode active" : "Device Information"}
                disabled={isEditMode}
              >
                <Info className="h-4 w-4" />
              </Button>

              {/* Filter Menu - Modern Design */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-white/60 hover:bg-white/80 border-slate-200/60 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 dark:border-slate-700/60"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Filter className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Filter by Status
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setFilterStatus('all')}
                    className={`cursor-pointer ${filterStatus === 'all' ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span>All Items</span>
                      {filterStatus === 'all' && <CheckCircle className="h-3.5 w-3.5 text-blue-500" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterStatus('critical')}
                    className={`cursor-pointer ${filterStatus === 'critical' ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full" />
                        Critical Only
                      </span>
                      {filterStatus === 'critical' && <CheckCircle className="h-3.5 w-3.5 text-red-500" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterStatus('warning')}
                    className={`cursor-pointer ${filterStatus === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        Warning Only
                      </span>
                      {filterStatus === 'warning' && <CheckCircle className="h-3.5 w-3.5 text-yellow-500" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterStatus('normal')}
                    className={`cursor-pointer ${filterStatus === 'normal' ? 'bg-green-50 dark:bg-green-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                        Normal Only
                      </span>
                      {filterStatus === 'normal' && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowOffline(!showOffline)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {showOffline ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      <span>{showOffline ? 'Hide' : 'Show'} Offline</span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Refresh Button - Modern Design */}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fetchDeviceData();
                }}
                className="h-8 w-8 p-0 bg-white/60 hover:bg-white/80 border-slate-200/60 dark:bg-slate-800/60 dark:hover:bg-slate-800/80 dark:border-slate-700/60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content - Modern Layout */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: `${dynamicSizes.contentPadding}px` }}
        >
          {renderContent()}
        </div>
      </div>

      {/* Device Details Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Database className="text-blue-500" size={24} />
              Device Details: {widgetTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {isLoadingDetails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading device details...</span>
              </div>
            ) : deviceDetails ? (
              <>
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Info className="text-blue-500" size={20} />
                      Basic Information
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Device ID:</span>
                        <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                          {deviceDetails.uniqId}
                        </code>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Name:</span>
                        <span className="font-semibold">{deviceDetails.name}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">MQTT Topic:</span>
                        <code className="text-sm bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded max-w-xs truncate">
                          {deviceDetails.topic}
                        </code>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Address:</span>
                        <span className="text-green-600 font-medium">
                          {deviceDetails.address || 'Not specified'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Activity className="text-green-500" size={20} />
                      Widget Status
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Connection:</span>
                        <div className="flex items-center gap-2">
                          {connectionStatus ? (
                            <Wifi className="text-green-500" size={16} />
                          ) : (
                            <WifiOff className="text-red-500" size={16} />
                          )}
                          <span className={`font-medium ${connectionStatus ? 'text-green-600' : 'text-red-600'}`}>
                            {connectionStatus ? 'Connected' : 'Disconnected'}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Active Monitors:</span>
                        <span className="font-semibold text-blue-600">{filteredItems.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Total Items:</span>
                        <span className="font-semibold">{items.length}</span>
                      </div>
                      <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <span className="font-medium text-slate-600 dark:text-slate-400">Widget Title:</span>
                        <span className="font-semibold">{widgetTitle}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monitor Items Summary */}
                {items.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <AlertTriangle className="text-orange-500" size={20} />
                      Monitor Items ({items.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((item, index) => {
                        const data = alarmData.get(item.id);
                        const deviceInfo = deviceInfos.get(item.id);
                        const isOnline = connectionStatuses.get(item.id) !== false;
                        const status = calculateAlarmStatus(item, data || { value: null, status: 'waiting', lastUpdate: null });

                        return (
                          <div key={item.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                                  {item.customName}
                                </h4>
                                <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                                  {deviceInfo?.name || 'Unknown Device'}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 ml-2">
                                {!isOnline && <WifiOff className="h-4 w-4 text-red-500" />}
                                <div className={`w-2 h-2 rounded-full ${status.level === 'critical' ? 'bg-red-500' :
                                    status.level === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`} />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Key:</span>
                                <code className="text-xs bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">
                                  {item.selectedKey}
                                </code>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Status:</span>
                                <Badge
                                  variant="secondary"
                                  className="text-xs"
                                  style={{
                                    backgroundColor: status.bgColor,
                                    color: status.color,
                                    borderColor: status.color,
                                  }}
                                >
                                  {status.label}
                                </Badge>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-slate-600 dark:text-slate-400">Value:</span>
                                <span className="text-sm font-mono">
                                  {formatAlarmValue(data?.value || null)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t pt-4">
                  <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">Device Metadata</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                    <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify({
                        id: deviceDetails.id,
                        uniqId: deviceDetails.uniqId,
                        name: deviceDetails.name,
                        topic: deviceDetails.topic,
                        address: deviceDetails.address,
                        createdAt: deviceDetails.createdAt,
                        updatedAt: deviceDetails.updatedAt,
                      }, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Device Details Not Found
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Unable to load detailed information for devices in this widget.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
