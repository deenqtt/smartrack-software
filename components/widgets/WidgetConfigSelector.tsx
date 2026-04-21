"use client";

import React from "react";
import dynamic from "next/dynamic";

const EnergyUsageConfigModal = dynamic(
  () =>
    import("./EnergyUsage/EnergyUsageConfigModal").then(
      (m) => m.EnergyUsageConfigModal,
    ),
  { ssr: false },
);

const CurrentMonthEnergyUsageConfig = (props: any) => (
  <EnergyUsageConfigModal
    {...props}
    period="current_month"
    title="Current Month Energy Usage"
  />
);

const PreviousMonthEnergyUsageConfig = (props: any) => (
  <EnergyUsageConfigModal
    {...props}
    period="last_month"
    title="Previous Month Energy Usage"
  />
);

// Configuration Modals mapping
const CONFIG_MODALS: Record<string, any> = {
  "Metric Display": dynamic(
    () =>
      import("./SingleValueCard/SingleValueCardConfigModal").then(
        (m) => m.SingleValueCardConfigModal,
      ),
    { ssr: false },
  ),
  "Status Indicator Card": dynamic(
    () =>
      import("./IconStatusCard/IconStatusCardConfigModal").then(
        (m) => m.IconStatusCardConfigModal,
      ),
    { ssr: false },
  ),
  "Status Dashboard": dynamic(
    () =>
      import("./GroupedIconStatus/GroupedIconStatusConfigModal").then(
        (m) => m.GroupedIconStatusConfigModal,
      ),
    { ssr: false },
  ),
  "Analog Meter": dynamic(
    () =>
      import("./AnalogueGauge/AnalogueGaugeConfigModal").then(
        (m) => m.AnalogueGaugeConfigModal,
      ),
    { ssr: false },
  ),
  "Temperature Gauge": dynamic(
    () =>
      import("./TemperatureIndicatorBar/TemperatureIndicatorBarConfigModal").then(
        (m) => m.TemperatureIndicatorBarConfigModal,
      ),
    { ssr: false },
  ),
  "Computed Metric": dynamic(
    () =>
      import("./CalculatedParameter/CalculatedParameterConfigModal").then(
        (m) => m.CalculatedParameterConfigModal,
      ),
    { ssr: false },
  ),
  "Equipment Runtime": dynamic(
    () =>
      import("./RunningHoursLog/RunningHoursLogConfigModal").then(
        (m) => m.RunningHoursLogConfigModal,
      ),
    { ssr: false },
  ),
  "Circuit Breaker Status": dynamic(
    () =>
      import("./BreakerStatus/BreakerStatusConfigModal").then(
        (m) => m.BreakerStatusConfigModal,
      ),
    { ssr: false },
  ),
  "Protocol Monitor": dynamic(
    () =>
      import("./MultiProtocolMonitor/MultiProtocolMonitorConfigModal").then(
        (m) => m.MultiProtocolMonitorConfigModal,
      ),
    { ssr: false },
  ),
  "Line Chart": dynamic(
    () =>
      import("./ChartLine/ChartLineConfigModal").then(
        (m) => m.ChartLineConfigModal,
      ),
    { ssr: false },
  ),
  "Bar Chart": dynamic(
    () =>
      import("./ChartBar/ChartBarConfigModal").then(
        (m) => m.ChartBarConfigModal,
      ),
    { ssr: false },
  ),
  "Multi-Line Chart": dynamic(
    () =>
      import("./MultiSeriesChart/MultiSeriesChartConfigModal").then(
        (m) => m.MultiSeriesChartConfigModal,
      ),
    { ssr: false },
  ),
  "Server Rack 3D": dynamic(
    () =>
      import("./RackServer3d/RackServer3dConfigModal").then(
        (m) => m.RackServer3dConfigModal,
      ),
    { ssr: false },
  ),
  "Smart Rack 2D": dynamic(
    () =>
      import("./SmartRack2D/SmartRack2DConfigModal").then(
        (m) => m.SmartRack2DConfigModal,
      ),
    { ssr: false },
  ),
  "Ups Dashboard": dynamic(
    () =>
      import("./UpsDashboard/Upsdashboardconfigmodal").then(
        (m) => m.UPSDashboardConfigModal,
      ),
    { ssr: false },
  ),
  "Cooling Dashboard": dynamic(
    () =>
      import("./CoolingDashboard/CoolingDashboardConfigModal").then(
        (m) => m.CoolingDashboardConfigModal,
      ),
    { ssr: false },
  ),
  "PDM Topology": dynamic(
    () =>
      import("./PdmTopology/Pdmtopologyconfigmodal").then(
        (m) => m.PDMTopologyConfigModal,
      ),
    { ssr: false },
  ),
  "System Health": dynamic(
    () =>
      import("./SystemHealth/SystemHealthConfigModal").then(
        (m) => m.SystemHealthConfigModal,
      ),
    { ssr: false },
  ),
  "Docker Status": dynamic(
    () =>
      import("./DockerStatus/DockerStatusConfigModal").then(
        (m) => m.DockerStatusConfigModal,
      ),
    { ssr: false },
  ),
  "Database Status": dynamic(
    () =>
      import("./DatabaseStatus/DatabaseStatusConfigModal").then(
        (m) => m.DatabaseStatusConfigModal,
      ),
    { ssr: false },
  ),
  "Storage Capacity": dynamic(
    () =>
      import("./StorageCapacity/StorageCapacityConfigModal").then(
        (m) => m.StorageCapacityConfigModal,
      ),
    { ssr: false },
  ),
  "Top Values Comparator": dynamic(
    () =>
      import("./TopValuesComparator/TopValuesComparatorConfigModal").then(
        (m) => m.TopValuesComparatorConfigModal,
      ),
    { ssr: false },
  ),
  "Dynamic Content Card": dynamic(
    () =>
      import("./TextCard/TextCardConfigModal").then(
        (m) => m.TextCardConfigModal,
      ),
    { ssr: false },
  ),
  "Simple Text Card": dynamic(
    () =>
      import("./SimpleTextCard/SimpleTextCardConfigModal").then(
        (m) => m.SimpleTextCardConfigModal,
      ),
    { ssr: false },
  ),
  "Advanced Card": dynamic(
    () =>
      import("./AdvancedCard/AdvancedCardConfigModal").then(
        (m) => m.AdvancedCardConfigModal,
      ),
    { ssr: false },
  ),
  "Carbon Emissions": dynamic(
    () =>
      import("./CarbonEmissions/CarbonEmissionsConfigModal").then(
        (m) => m.CarbonEmissionsConfigModal,
      ),
    { ssr: false },
  ),
  "Predictive Billing": dynamic(
    () =>
      import("./PredictiveBilling/PredictiveBillingConfigModal").then(
        (m) => m.PredictiveBillingConfigModal,
      ),
    { ssr: false },
  ),
  "Energy Target Chart": dynamic(
    () =>
      import("./EnergyTargetChart/EnergyTargetChartConfigModal").then(
        (m) => m.EnergyTargetChartConfigModal,
      ),
    { ssr: false },
  ),
  "Current Month Energy Usage": CurrentMonthEnergyUsageConfig,
  "Previous Month Energy Usage": PreviousMonthEnergyUsageConfig,
  "Environment Monitor": dynamic(
    () =>
      import("./EnvironmentMonitor/EnvironmentMonitorConfig").then(
        (m) => m.EnvironmentMonitorConfigModal,
      ),
    { ssr: false },
  ),
  "AI Energy Advisor": dynamic(
    () =>
      import("./AiEnergyAdvisor/AiEnergyAdvisorConfigModal").then(
        (m) => m.AiEnergyAdvisorConfigModal,
      ),
    { ssr: false },
  ),
  "MQTT Status Card": dynamic(
    () =>
      import("./MqttKeyStatusCard/MqttKeyStatusCardConfigModal").then(
        (m) => m.MqttKeyStatusCardConfigModal,
      ),
    { ssr: false },
  ),
  "Modbus Button Control": dynamic(
    () =>
      import("./ButtonControlModbus/ButtonControlModbusConfigModal").then(
        (m) => m.ButtonControlModbusConfigModal,
      ),
    { ssr: false },
  ),
  "Modular Button Control": dynamic(
    () =>
      import("./ButtonControlModular/ButtonControlModularConfigModal").then(
        (m) => m.ButtonControlModularConfigModal,
      ),
    { ssr: false },
  ),
  // Security widgets
  "Active Alarms": dynamic(
    () =>
      import("./AlarmSummary/AlarmSummaryConfigModal").then(
        (m) => m.AlarmSummaryConfigModal,
      ),
    { ssr: false },
  ),
  "Alarm History": dynamic(
    () =>
      import("./AlarmLogList/AlarmLogListConfigModal").then(
        (m) => m.AlarmLogListConfigModal,
      ),
    { ssr: false },
  ),
  "Dynamic Alarm": dynamic(
    () =>
      import("./DynamicAlarm/DynamicAlarmConfigModal").then(
        (m) => m.DynamicAlarmConfigModal,
      ),
    { ssr: false },
  ),
};

interface WidgetConfigSelectorProps {
  widgetType: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: any) => void;
  initialConfig?: any;
}

export const WidgetConfigSelector = ({
  widgetType,
  isOpen,
  onClose,
  onSave,
  initialConfig,
}: WidgetConfigSelectorProps) => {
  const ConfigModal = CONFIG_MODALS[widgetType];

  if (!ConfigModal) {
    if (isOpen) {
      console.warn(
        `No configuration modal found for widget type: ${widgetType}`,
      );
      // If we're open but have no modal, we should probably close or show an alert
      // But for now we just return null to not break things
    }
    return null;
  }

  return (
    <ConfigModal
      isOpen={isOpen}
      onClose={onClose}
      onSave={onSave}
      initialConfig={initialConfig}
    />
  );
};
