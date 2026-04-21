"use client";

import dynamic from "next/dynamic";
import React from "react";
import { widgets } from "@/lib/widget-data";
import { SingleValueCardWidget } from "./SingleValueCard/SingleValueCardWidget";
import { IconStatusCardWidget } from "./IconStatusCard/IconStatusCardWidget";
import { GroupedIconStatusWidget } from "./GroupedIconStatus/GroupedIconStatusWidget";
import { AnalogueGaugeWidget } from "./AnalogueGauge/AnalogueGaugeWidget";
import { TemperatureIndicatorBarWidget } from "./TemperatureIndicatorBar/TemperatureIndicatorBarWidget";
import { CalculatedParameterWidget } from "./CalculatedParameter/CalculatedParameterWidget";
import { RunningHoursLogWidget } from "./RunningHoursLog/RunningHoursLogWidget";
import { EnergyUsageWidget } from "./EnergyUsage/EnergyUsageWidget";
import { CarbonEmissionsWidget } from "./CarbonEmissions/CarbonEmissionsWidget";
import { PredictiveBillingWidget } from "./PredictiveBilling/PredictiveBillingWidget";
import { EnergyTargetGapWidget } from "./EnergyTargetGap/EnergyTargetGapWidget";
import { BreakerStatusWidget } from "./BreakerStatus/BreakerStatusWidget";
import { MultiProtocolMonitorWidget } from "./MultiProtocolMonitor/MultiProtocolMonitorWidget";
import { ButtonControlModbusWidget } from "./ButtonControlModbus/ButtonControlModbusWidget";
import { ButtonControlModularWidget } from "./ButtonControlModular/ButtonControlModularWidget";
import { DeviceControlPanelWidget } from "./DeviceControlPanel/DeviceControlPanelWidget";

import { AlarmLogListWidget } from "./AlarmLogList/AlarmLogListWidget";
import { AlarmSummaryWidget } from "./AlarmSummary/AlarmSummaryWidget";
import { DashboardShortcutWidget } from "./DashboardShortcut/DashboardShortcutWidget";
import { MaintenanceListWidget } from "./MaintenanceList/MaintenanceListWidget";
import { MaintenanceCalendarWidget } from "./MaintenanceCalendar/MaintenanceCalendarWidget";
import { MaintenanceStatisticsWidget } from "./MaintenanceStatistics/MaintenanceStatisticsWidget";

import { TopValuesComparatorWidget } from "./TopValuesComparator/TopValuesComparatorWidget";
import { DeviceLogsWidget } from "./DeviceLogs/DeviceLogsWidget";
import { DeviceActiveSummaryWidget } from "./DeviceActiveSummary/DeviceActiveSummaryWidget";
import { UPSDashboardWidget } from "./UpsDashboard/Upsdashboardwidget";
import { CoolingDashboardWidget } from "./CoolingDashboard/CoolingDashboardWidget";

import { PDMTopologyWidget } from "./PdmTopology/PDMTopologyWidget";
import { TextCardWidget } from "./TextCard/TextCardWidget";
import { DocumentViewerWidget } from "./DocumentViewer/DocumentViewerWidget";
import { ImageDisplayWidget } from "./ImageDisplay/ImageDisplayWidget";

// New specialized widgets
import DailyDeviceSummaryWidget from "./DailyDeviceSummaryWidget/DailyDeviceSummaryWidget";
import DailyDeviceDetailWidget from "./DailyDeviceSummaryWidget/DailyDeviceDetailWidget";
import DailyKeyDetailWidget from "./DailyDeviceSummaryWidget/DailyKeyDetailWidget";
import { DashboardAutoSwitcherWidget } from "./DashboardAutoSwitcher/DashboardAutoSwitcherWidget";
import { DynamicAlarmWidget } from "./DynamicAlarm/DynamicAlarmWidget";
import { ConnectionWidget } from "./Connection/ConnectionWidget";
import { ProcessWidget } from "./Process/ProcessWidget";
import { ProcessConnectionWidget } from "./Process/ProcessConnectionWidget";

import { AiEnergyAdvisorWidget } from "./AiEnergyAdvisor/AiEnergyAdvisorWidget";

// New Widgets
import { SimpleTextCardWidget } from "./SimpleTextCard/SimpleTextCardWidget";
import { AdvancedCardWidget } from "./AdvancedCard/AdvancedCardWidget";
import { UserListWidget } from "./UserList/UserListWidget";
import { SystemHealthWidget } from "./SystemHealth/SystemHealthWidget";
import { DockerStatusWidget } from "./DockerStatus/DockerStatusWidget";
import { DatabaseStatusWidget } from "./DatabaseStatus/DatabaseStatusWidget";
import { StorageCapacityWidget } from "./StorageCapacity/StorageCapacityWidget";
import { SmartRack2DWidget } from "./SmartRack2D/SmartRack2DWidget";
import { EnvironmentMonitorWidget } from "./EnvironmentMonitor/EnvironmentMonitorWidget";
import { MqttKeyStatusCardWidget } from "./MqttKeyStatusCard/MqttKeyStatusCardWidget";

// Dynamic imports moved to top level to prevent constant re-mounting
const ChartLineWidget = dynamic(
  () =>
    import("./ChartLine/ChartLineWidget").then((mod) => mod.ChartLineWidget),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading line chart...
      </div>
    ),
    ssr: false,
  },
);

const ChartBarWidget = dynamic(
  () => import("./ChartBar/ChartBarWidget").then((mod) => mod.ChartBarWidget),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading bar chart...
      </div>
    ),
    ssr: false,
  },
);

const MultiSeriesChartWidget = dynamic(
  () =>
    import("./MultiSeriesChart/MultiSeriesChartWidget").then(
      (mod) => mod.MultiSeriesChartWidget,
    ),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading multi-chart...
      </div>
    ),
    ssr: false,
  },
);

const BasicTrendChartWidget = dynamic(
  () =>
    import("./BasicTrendChart/BasicTrendChartWidget").then(
      (mod) => mod.BasicTrendChartWidget,
    ),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading trend chart...
      </div>
    ),
    ssr: false,
  },
);

const PowerAnalyzerChartWidget = dynamic(
  () =>
    import("./PowerAnalyzerChart/PowerAnalyzerChartWidget").then(
      (mod) => mod.PowerAnalyzerChartWidget,
    ),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading analysis...
      </div>
    ),
    ssr: false,
  },
);

const EnergyTargetChartWidget = dynamic(
  () =>
    import("./EnergyTargetChart/EnergyTargetChartWidget").then(
      (mod) => mod.EnergyTargetChartWidget,
    ),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading energy chart...
      </div>
    ),
    ssr: false,
  },
);

const PowerGenerateChartWidget = dynamic(
  () =>
    import("./PowerGenerateChart/PowerGenerateChartWidget").then(
      (mod) => mod.PowerGenerateChartWidget,
    ),
  {
    loading: () => (
      <div className="p-4 text-center text-xs opacity-50">
        Loading generation chart...
      </div>
    ),
    ssr: false,
  },
);

const RackServer3dWidget = dynamic(
  () =>
    import("./RackServer3d/RackServer3dWidget").then(
      (mod) => mod.RackServer3dWidget,
    ),
  {
    loading: () => <div className="p-4 text-center">Loading 3D view...</div>,
    ssr: false,
  },
);

interface Props {
  item: {
    i: string;
    widgetType: string;
    config: any;
    h?: number; // height in grid units (optional for backward compatibility)
    w?: number; // width in grid units (optional for backward compatibility)
  };
  isSelected?: boolean; // Add isSelected prop for dynamic line control points
  onConfigChange?: (newConfig: any) => void; // Callback for config changes
  isEditMode?: boolean; // ✅ NEW: Indicates if widget is in edit mode (disable click interactions)
}

export const WidgetRenderer = ({
  item,
  isSelected,
  isEditMode = false,
  onConfigChange,
}: Props) => {
  if (!item || !item.widgetType) {
    return (
      <div className="p-4 text-center text-destructive">
        Error: Widget data is missing or invalid.
      </div>
    );
  }

  const { widgetType, config } = item;

  // Pastikan config ada sebelum merender
  if (!config) {
    return <div className="p-4 text-center">Please configure this widget.</div>;
  }

  switch (widgetType) {
    case "Metric Display":
      return <SingleValueCardWidget config={config} isEditMode={isEditMode} />;
    case "Status Indicator Card":
      return <IconStatusCardWidget config={config} isEditMode={isEditMode} />;
    case "Status Dashboard":
      return (
        <GroupedIconStatusWidget config={config} isEditMode={isEditMode} />
      );
    case "Analog Meter":
      return <AnalogueGaugeWidget config={config} />;
    case "Temperature Gauge":
      return <TemperatureIndicatorBarWidget config={config} />;
    case "Computed Metric":
      return <CalculatedParameterWidget config={config} />;
    case "Equipment Runtime":
      return <RunningHoursLogWidget config={config} />;
    case "Previous Month Energy Usage":
      return <EnergyUsageWidget config={config} />;
    case "Current Month Energy Usage":
      return <EnergyUsageWidget config={config} />;
    case "Carbon Emissions":
      return <CarbonEmissionsWidget config={config} />;
    case "Predictive Billing":
      return <PredictiveBillingWidget config={config} />;
    case "Energy Variance Tracker":
      return <EnergyTargetGapWidget config={config} />;
    case "Circuit Breaker Status":
      return <BreakerStatusWidget config={config} isEditMode={isEditMode} />;
    case "Protocol Monitor":
      return <MultiProtocolMonitorWidget config={config} />;
    case "Line Chart":
      return <ChartLineWidget config={config} />;
    case "Bar Chart":
      return <ChartBarWidget config={config} />;
    case "Multi-Line Chart":
      return <MultiSeriesChartWidget config={config} />;
    case "Simple Trend Chart":
      return <BasicTrendChartWidget config={config} />;
    case "Power Analysis Chart":
      return <PowerAnalyzerChartWidget config={config} />;
    case "Energy Target Chart":
      return <EnergyTargetChartWidget config={config} />;
    case "Power Generation Chart":
      return <PowerGenerateChartWidget config={config} />;
    case "Device Control Panel":
      return <DeviceControlPanelWidget config={config} />;
    case "Modular Control Button":
      return <ButtonControlModularWidget config={config} />;
    case "Modbus Button Control":
      return <ButtonControlModbusWidget config={config} />;
    case "Modular Button Control":
      return <ButtonControlModularWidget config={config} />;
    case "MQTT Status Card":
      return <MqttKeyStatusCardWidget config={config} />;
    case "Alarm History":
      return <AlarmLogListWidget config={config} />;
    case "Active Alarms":
      return <AlarmSummaryWidget config={config} />;
    case "Dashboard Shortcut":
      return (
        <DashboardShortcutWidget config={config} isEditMode={isEditMode} />
      );

    case "Device Activity Logs":
      return <DeviceLogsWidget config={config} isEditMode={isEditMode} />;
    case "Device Connectivity Summary":
      return <DeviceActiveSummaryWidget config={config} />;
    case "Maintenance Tasks":
      return <MaintenanceListWidget config={config} />;
    case "Maintenance Schedule":
      return <MaintenanceCalendarWidget config={config} />;
    case "Maintenance Analytics":
      return <MaintenanceStatisticsWidget config={config} />;
    case "Server Rack 3D":
      return <RackServer3dWidget config={config} />;

    case "Dynamic Content Card":
      return <TextCardWidget config={config} />;
    case "Simple Text Card":
      return <SimpleTextCardWidget config={config} />;
    case "Advanced Card":
      return <AdvancedCardWidget config={config} />;

    case "Document Viewer":
      return <DocumentViewerWidget config={config} isEditMode={isEditMode} />;
    case "Image Display":
      return <ImageDisplayWidget config={config} />;
    case "User List":
      return <UserListWidget config={config} />;

    case "System Health":
      return <SystemHealthWidget config={config} />;
    case "Docker Status":
      return <DockerStatusWidget config={config} />;
    case "Database Status":
      return <DatabaseStatusWidget config={config} />;
    case "Storage Capacity":
      return <StorageCapacityWidget config={config} />;
    case "Top Values Comparator":
      return (
        <TopValuesComparatorWidget config={config} isEditMode={isEditMode} />
      );

    case "Ups Dashboard":
      return <UPSDashboardWidget config={config} />;
    case "Cooling Dashboard":
      return <CoolingDashboardWidget config={config} />;

    case "PDM Topology":
      return <PDMTopologyWidget config={config} />;
    // Advanced Analytic Widgets
    case "Daily Device Summary":
      return <DailyDeviceSummaryWidget config={config} />;
    case "Daily Device Detail":
      return <DailyDeviceDetailWidget config={config} />;
    case "Daily Key Detail":
      return <DailyKeyDetailWidget config={config} />;
    case "Environment Monitor":
      return (
        <EnvironmentMonitorWidget config={config} isEditMode={isEditMode} />
      );

    // Operational Widgets
    case "Dashboard Auto Switcher":
      return (
        <DashboardAutoSwitcherWidget config={config} isEditMode={isEditMode} />
      );
    case "Connection":
      return <ConnectionWidget config={config} />;

    // Security Widgets
    case "Dynamic Alarm":
      return <DynamicAlarmWidget config={config} />;

    // Process Widgets
    case "Process":
    case "Process Box":
    case "Process Cylinder":
    case "Process Box Custom":
    case "Process Cylinder Custom":
    case "Process Circle":
    case "Process Triangle":
      return <ProcessWidget config={config} widgetType={widgetType} />;
    case "Process Connection":
      return <ProcessConnectionWidget config={config} />;

    case "Smart Rack 2D":
      return <SmartRack2DWidget config={config} />;
    case "AI Energy Advisor":
      return (
        <AiEnergyAdvisorWidget
          config={config}
          isEditMode={isEditMode}
          onConfigChange={onConfigChange}
        />
      );

    default:
      // Get widget icon from data
      const widgetData = widgets.find((w) => w.name === widgetType);
      const IconComponent = widgetData?.icon as any;

      return (
        <div
          className="p-4 rounded-lg border flex flex-col items-center justify-center min-h-[120px]"
          style={{ background: "rgba(0, 0, 0, 0.05)" }}
        >
          {IconComponent && (
            <div className="mb-2">
              {React.createElement(IconComponent, {
                className: "h-8 w-8 text-muted-foreground",
              })}
            </div>
          )}
          <p className="text-sm font-medium text-center">
            Widget: {widgetType}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configuration coming soon
          </p>
        </div>
      );
  }
};
