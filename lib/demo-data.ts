// lib/demo-data.ts
// Central mock data for DEMO_MODE portfolio deployment

// ─── Demo User ────────────────────────────────────────────────────────────────
export const DEMO_USER = {
  userId: "demo-user-id",
  email: "demo@smartrack.io",
  role: "ADMIN",
  isAuthenticated: true,
  isDemo: true,
};

// ─── Demo External Devices ────────────────────────────────────────────────────
export const DEMO_EXTERNAL_DEVICES = [
  {
    id: "dev-001",
    uniqId: "pdu-a-01",
    name: "Rack-A PDU A (Power Strip)",
    topic: "demo/rack01/pdu-a",
    address: "192.168.1.10",
    lastPayload: JSON.stringify({ power: 1840, current: 8.2, voltage: 220, freq: 50.1, pf: 0.97 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-002",
    uniqId: "pdu-b-01",
    name: "Rack-A PDU B (Redundant)",
    topic: "demo/rack01/pdu-b",
    address: "192.168.1.11",
    lastPayload: JSON.stringify({ power: 1620, current: 7.4, voltage: 220, freq: 50.0, pf: 0.96 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-003",
    uniqId: "env-rack01",
    name: "Rack-A Environment Sensor",
    topic: "demo/rack01/env",
    address: "192.168.1.20",
    lastPayload: JSON.stringify({ temp: 24.1, hum: 49.5, co2: 412 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-004",
    uniqId: "env-rack02",
    name: "Rack-B Environment Sensor",
    topic: "demo/rack02/env",
    address: "192.168.1.21",
    lastPayload: JSON.stringify({ temp: 22.8, hum: 51.2, co2: 408 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-005",
    uniqId: "ups-main",
    name: "UPS Main (APC 20kVA)",
    topic: "demo/ups/main",
    address: "192.168.1.30",
    lastPayload: JSON.stringify({ battery: 97, load: 48, input_voltage: 220, runtime: 42 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-006",
    uniqId: "crac-01",
    name: "CRAC Unit-1 (Liebert DS)",
    topic: "demo/cooling/crac01",
    address: "192.168.1.40",
    lastPayload: JSON.stringify({ setpoint: 22.0, actual: 23.1, mode: "COOL", fan_speed: 65 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-007",
    uniqId: "power-meter-01",
    name: "Main Power Meter (Schneider PM7000)",
    topic: "demo/power/meter01",
    address: "192.168.1.50",
    lastPayload: JSON.stringify({ power: 3460, kwh: 18420.5, pf: 0.97, freq: 50.01, voltage: 220 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-008",
    uniqId: "server-rack01-01",
    name: "Server-01 (Dell PowerEdge R750)",
    topic: "demo/rack01/server01",
    address: "192.168.1.101",
    lastPayload: JSON.stringify({ cpu: 45, memory: 62, disk: 78, temp: 42 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-009",
    uniqId: "server-rack01-02",
    name: "Server-02 (Dell PowerEdge R750)",
    topic: "demo/rack01/server02",
    address: "192.168.1.102",
    lastPayload: JSON.stringify({ cpu: 32, memory: 55, disk: 61, temp: 39 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-010",
    uniqId: "sw-rack02-01",
    name: "Core Switch Rack-B (Cisco Catalyst 9300)",
    topic: "demo/rack02/switch01",
    address: "192.168.1.60",
    lastPayload: JSON.stringify({ status: "online", throughput: 45.2, ports_up: 22, ports_down: 2 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-011",
    uniqId: "fw-rack02-01",
    name: "Firewall (Fortigate 600E)",
    topic: "demo/rack02/firewall",
    address: "192.168.1.61",
    lastPayload: JSON.stringify({ status: "online", cpu: 18, sessions: 4820, throughput: 2.4 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "dev-012",
    uniqId: "pue-sensor",
    name: "PUE Monitor (Integrated)",
    topic: "demo/pue/monitor",
    address: "192.168.1.55",
    lastPayload: JSON.stringify({ pue: 1.42, it_load: 3460, total_facility: 4913 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Device Topic Map ─────────────────────────────────────────────────────────
export const DEMO_DEVICE_TOPIC_MAP: Record<string, string> = {
  "pdu-a-01": "demo/rack01/pdu-a",
  "pdu-b-01": "demo/rack01/pdu-b",
  "env-rack01": "demo/rack01/env",
  "env-rack02": "demo/rack02/env",
  "ups-main": "demo/ups/main",
  "crac-01": "demo/cooling/crac01",
  "power-meter-01": "demo/power/meter01",
  "server-rack01-01": "demo/rack01/server01",
  "server-rack01-02": "demo/rack01/server02",
  "sw-rack02-01": "demo/rack02/switch01",
  "fw-rack02-01": "demo/rack02/firewall",
  "pue-sensor": "demo/pue/monitor",
};

// ─── Demo Racks ──────────────────────────────────────────────────────────────
export const DEMO_RACKS = {
  racks: [
    {
      id: "rack-a",
      name: "Rack-A (Server Rack)",
      capacityU: 42,
      usedU: 18,
      utilizationPercent: 43,
      location: "Row A, Position 1",
      notes: "Primary server rack",
      rackType: "MAIN",
      _count: { devices: 8 },
      devices: [
        { id: "srv-01", name: "Server-01 Dell R750", positionU: 1, sizeU: 2, type: "SERVER", status: "INSTALLED" },
        { id: "srv-02", name: "Server-02 Dell R750", positionU: 3, sizeU: 2, type: "SERVER", status: "INSTALLED" },
        { id: "srv-03", name: "Server-03 Dell R750", positionU: 5, sizeU: 2, type: "SERVER", status: "INSTALLED" },
        { id: "srv-04", name: "Server-04 Dell R750", positionU: 7, sizeU: 2, type: "SERVER", status: "INSTALLED" },
        { id: "sw-01", name: "ToR Switch (Aruba)", positionU: 10, sizeU: 1, type: "SWITCH", status: "INSTALLED" },
        { id: "pdu-a", name: "PDU A", positionU: 40, sizeU: 1, type: "PDU", status: "INSTALLED" },
        { id: "pdu-b", name: "PDU B", positionU: 41, sizeU: 1, type: "PDU", status: "INSTALLED" },
        { id: "env-01", name: "Env Sensor", positionU: 42, sizeU: 1, type: "SENSOR", status: "INSTALLED" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rack-b",
      name: "Rack-B (Network Rack)",
      capacityU: 32,
      usedU: 10,
      utilizationPercent: 31,
      location: "Row A, Position 2",
      notes: "Core network infrastructure",
      rackType: "NORMAL",
      _count: { devices: 5 },
      devices: [
        { id: "sw-core", name: "Core Switch Cisco 9300", positionU: 1, sizeU: 2, type: "SWITCH", status: "INSTALLED" },
        { id: "fw-01", name: "Firewall Fortigate 600E", positionU: 3, sizeU: 2, type: "FIREWALL", status: "INSTALLED" },
        { id: "patch-01", name: "Patch Panel 48P", positionU: 6, sizeU: 2, type: "PATCH_PANEL", status: "INSTALLED" },
        { id: "patch-02", name: "Patch Panel 48P", positionU: 8, sizeU: 2, type: "PATCH_PANEL", status: "INSTALLED" },
        { id: "env-02", name: "Env Sensor", positionU: 30, sizeU: 1, type: "SENSOR", status: "INSTALLED" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "rack-c",
      name: "Rack-C (Power Cabinet)",
      capacityU: 16,
      usedU: 8,
      utilizationPercent: 50,
      location: "Row A, Position 3",
      notes: "UPS and power distribution",
      rackType: "NORMAL",
      _count: { devices: 3 },
      devices: [
        { id: "ups-01", name: "UPS APC 20kVA", positionU: 1, sizeU: 4, type: "UPS", status: "INSTALLED" },
        { id: "bat-01", name: "Battery Pack 1", positionU: 5, sizeU: 2, type: "BATTERY", status: "INSTALLED" },
        { id: "pdu-main", name: "Main PDU", positionU: 10, sizeU: 2, type: "PDU", status: "INSTALLED" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  total: 3,
  page: 1,
  limit: 50,
};

// ─── Demo Alarm Logs ──────────────────────────────────────────────────────────
const now = new Date();
const t = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60000).toISOString();

export const DEMO_ALARM_LOGS = {
  data: [
    {
      id: "alm-001",
      status: "CLEARED",
      triggeringValue: "9.8",
      timestamp: t(180),
      clearedAt: t(120),
      alarmConfiguration: {
        id: "cfg-001",
        name: "PDU-A High Current",
        customName: "PDU-A Feed1 High Current (>9.5A)",
        alarmType: "MAJOR",
        device: { name: "Rack-A PDU A", uniqId: "pdu-a-01" },
      },
    },
    {
      id: "alm-002",
      status: "ACKNOWLEDGED",
      triggeringValue: "28.5",
      timestamp: t(95),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-002",
        name: "Rack Temp High",
        customName: "Rack-A Temperature Threshold (>28°C)",
        alarmType: "MINOR",
        device: { name: "Rack-A Env Sensor", uniqId: "env-rack01" },
      },
    },
    {
      id: "alm-003",
      status: "ACTIVE",
      triggeringValue: "52.1",
      timestamp: t(22),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-003",
        name: "Rack Humidity",
        customName: "Rack-A Humidity High (>52%)",
        alarmType: "MINOR",
        device: { name: "Rack-A Env Sensor", uniqId: "env-rack01" },
      },
    },
    {
      id: "alm-004",
      status: "CLEARED",
      triggeringValue: "220.2",
      timestamp: t(360),
      clearedAt: t(300),
      alarmConfiguration: {
        id: "cfg-004",
        name: "Voltage Spike",
        customName: "Main PDU Voltage Spike (>221V)",
        alarmType: "MINOR",
        device: { name: "Main Power Meter", uniqId: "power-meter-01" },
      },
    },
    {
      id: "alm-005",
      status: "ACTIVE",
      triggeringValue: "8.9",
      timestamp: t(15),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-005",
        name: "PDU-B High Current",
        customName: "PDU-B Current High (>8.5A)",
        alarmType: "MAJOR",
        device: { name: "Rack-A PDU B", uniqId: "pdu-b-01" },
      },
    },
    {
      id: "alm-006",
      status: "CLEARED",
      triggeringValue: "92",
      timestamp: t(720),
      clearedAt: t(690),
      alarmConfiguration: {
        id: "cfg-006",
        name: "UPS Battery Low",
        customName: "UPS Battery Below 93%",
        alarmType: "CRITICAL",
        device: { name: "UPS Main", uniqId: "ups-main" },
      },
    },
    {
      id: "alm-007",
      status: "CLEARED",
      triggeringValue: "0.91",
      timestamp: t(500),
      clearedAt: t(480),
      alarmConfiguration: {
        id: "cfg-007",
        name: "Low Power Factor",
        customName: "Power Factor Low (<0.95)",
        alarmType: "MINOR",
        device: { name: "Main Power Meter", uniqId: "power-meter-01" },
      },
    },
    {
      id: "alm-008",
      status: "ACTIVE",
      triggeringValue: "23.5",
      timestamp: t(8),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-008",
        name: "CRAC Actual Temp High",
        customName: "CRAC-1 Outlet Temp (>23°C)",
        alarmType: "MINOR",
        device: { name: "CRAC Unit-1", uniqId: "crac-01" },
      },
    },
    {
      id: "alm-009",
      status: "CLEARED",
      triggeringValue: "1500",
      timestamp: t(1440),
      clearedAt: t(1380),
      alarmConfiguration: {
        id: "cfg-009",
        name: "High Sessions",
        customName: "Firewall Sessions High (>5000)",
        alarmType: "MINOR",
        device: { name: "Firewall Fortigate 600E", uniqId: "fw-rack02-01" },
      },
    },
    {
      id: "alm-010",
      status: "CLEARED",
      triggeringValue: "55",
      timestamp: t(2880),
      clearedAt: t(2820),
      alarmConfiguration: {
        id: "cfg-010",
        name: "UPS High Load",
        customName: "UPS Load >50%",
        alarmType: "MINOR",
        device: { name: "UPS Main", uniqId: "ups-main" },
      },
    },
  ],
  total: 10,
  page: 1,
  limit: 100,
};

// ─── Demo Alarm Summary ───────────────────────────────────────────────────────
export const DEMO_ALARM_SUMMARY = {
  CRITICAL: 0,
  MAJOR: 2,
  MINOR: 3,
};

// ─── Demo Logging Configs ─────────────────────────────────────────────────────
export const DEMO_LOGGING_CONFIGS = {
  data: [
    {
      id: "demo-log-power-001",
      customName: "Total Power Consumption",
      deviceUniqId: "pdu-a-01",
      key: "power",
      units: "W",
      loggingIntervalMinutes: 5,
      isActive: true,
      device: { name: "Rack-A PDU A" },
    },
    {
      id: "demo-log-power-002",
      customName: "Main Power Meter kWh",
      deviceUniqId: "power-meter-01",
      key: "kwh",
      units: "kWh",
      loggingIntervalMinutes: 5,
      isActive: true,
      device: { name: "Main Power Meter" },
    },
    {
      id: "demo-log-temp-001",
      customName: "Rack-A Temperature",
      deviceUniqId: "env-rack01",
      key: "temp",
      units: "°C",
      loggingIntervalMinutes: 5,
      isActive: true,
      device: { name: "Rack-A Env Sensor" },
    },
    {
      id: "demo-log-ups-001",
      customName: "UPS Battery Level",
      deviceUniqId: "ups-main",
      key: "battery",
      units: "%",
      loggingIntervalMinutes: 5,
      isActive: true,
      device: { name: "UPS Main" },
    },
  ],
  total: 4,
  page: 1,
  limit: 100,
};

// ─── Demo Notifications ───────────────────────────────────────────────────────
export const DEMO_NOTIFICATIONS = [
  {
    id: "notif-001",
    userId: "demo-user-id",
    title: "Alarm Cleared: PDU-A High Current",
    message: "PDU-A Feed1 current returned to normal (8.2A)",
    type: "SUCCESS",
    isRead: false,
    createdAt: t(120),
  },
  {
    id: "notif-002",
    userId: "demo-user-id",
    title: "New Alarm: Rack Humidity High",
    message: "Rack-A humidity exceeded threshold: 52.1%",
    type: "WARNING",
    isRead: false,
    createdAt: t(22),
  },
  {
    id: "notif-003",
    userId: "demo-user-id",
    title: "Backup Completed",
    message: "Daily backup completed successfully (2.4 GB)",
    type: "SUCCESS",
    isRead: true,
    createdAt: t(480),
  },
  {
    id: "notif-004",
    userId: "demo-user-id",
    title: "Maintenance Reminder",
    message: "Scheduled cooling system inspection in 3 days",
    type: "INFO",
    isRead: true,
    createdAt: t(720),
  },
  {
    id: "notif-005",
    userId: "demo-user-id",
    title: "New Alarm: PDU-B Current High",
    message: "PDU-B current exceeded threshold: 8.9A",
    type: "WARNING",
    isRead: false,
    createdAt: t(15),
  },
];

// ─── Demo Menu ────────────────────────────────────────────────────────────────
export const DEMO_MENU_DATA = {
  success: true,
  isDeveloper: true,
  activePreset: null,
  data: [
    {
      id: "grp-monitoring",
      name: "monitoring",
      label: "Monitoring",
      icon: "LayoutDashboard",
      order: 1,
      isActive: true,
      items: [
        {
          id: "item-dashboard",
          name: "dashboard",
          label: "Dashboard",
          path: "/",
          icon: "LayoutDashboard",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "item-ai-insights",
          name: "ai-insights",
          label: "AI Insights",
          path: "/ai-insights",
          icon: "Brain",
          order: 2,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-infrastructure",
      name: "infrastructure",
      label: "Infrastructure",
      icon: "Server",
      order: 2,
      isActive: true,
      items: [
        {
          id: "item-devices-external",
          name: "devices-external",
          label: "External Devices",
          path: "/devices/devices-external",
          icon: "Cpu",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "item-racks",
          name: "racks",
          label: "Rack Management",
          path: "/infrastructure/racks",
          icon: "Server",
          order: 2,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-network",
      name: "network",
      label: "Network",
      icon: "Network",
      order: 3,
      isActive: true,
      items: [
        {
          id: "item-mqtt-monitoring",
          name: "mqtt-monitoring",
          label: "MQTT Monitoring",
          path: "/network/mqtt-monitoring",
          icon: "Activity",
          order: 1,
          isActive: true,
          isDeveloper: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "item-mqtt-config",
          name: "mqtt-config",
          label: "MQTT Configuration",
          path: "/network/mqtt-config",
          icon: "Settings",
          order: 2,
          isActive: true,
          isDeveloper: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-security",
      name: "security",
      label: "Security & Alarms",
      icon: "Shield",
      order: 4,
      isActive: true,
      items: [
        {
          id: "item-alarms",
          name: "alarms",
          label: "Alarm Management",
          path: "/security/alarm-management",
          icon: "Bell",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-reports",
      name: "reports",
      label: "Reports",
      icon: "BarChart3",
      order: 5,
      isActive: true,
      items: [
        {
          id: "item-alarm-report",
          name: "alarm-report",
          label: "Alarm Reports",
          path: "/report/alarm-log-reports",
          icon: "FileText",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "item-device-report",
          name: "device-report",
          label: "Device Log Reports",
          path: "/report/devices-log-report",
          icon: "FileBarChart",
          order: 2,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-maintenance",
      name: "maintenance",
      label: "Maintenance",
      icon: "Wrench",
      order: 6,
      isActive: true,
      items: [
        {
          id: "item-maintenance",
          name: "maintenance",
          label: "Maintenance Tasks",
          path: "/maintenance",
          icon: "Wrench",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "grp-system",
      name: "system",
      label: "System",
      icon: "Settings",
      order: 7,
      isActive: true,
      items: [
        {
          id: "item-user-management",
          name: "user-management",
          label: "User Management",
          path: "/system-config/user-management",
          icon: "Users",
          order: 1,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "item-backup",
          name: "backup",
          label: "Backup Management",
          path: "/backup-management",
          icon: "HardDrive",
          order: 2,
          isActive: true,
          isDeveloper: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
  ],
};

// ─── Demo Dashboard Layouts ───────────────────────────────────────────────────
const DASHBOARD_1_LAYOUT = JSON.stringify([
  // Row 1: 4 metric cards
  { i: "w1", x: 0, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Temperature", deviceUniqId: "env-rack01", selectedKey: "temp", units: "°C" } },
  { i: "w2", x: 3, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Humidity", deviceUniqId: "env-rack01", selectedKey: "hum", units: "%" } },
  { i: "w3", x: 6, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Total Power", deviceUniqId: "pdu-a-01", selectedKey: "power", units: "W" } },
  { i: "w4", x: 9, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "UPS Load", deviceUniqId: "ups-main", selectedKey: "load", units: "%" } },
  // Row 2: trend chart + alarm summary
  { i: "w5", x: 0, y: 3, w: 7, h: 5, widgetType: "Simple Trend Chart", config: { widgetTitle: "Power Trend (24h)", configName: "Total Power Consumption", timeRange: "24h" } },
  { i: "w6", x: 7, y: 3, w: 5, h: 5, widgetType: "Active Alarms", config: { widgetTitle: "Active Alarms" } },
  // Row 3: smart rack 2D
  { i: "w7", x: 0, y: 8, w: 12, h: 6, widgetType: "Smart Rack 2D", config: { customName: "Infrastructure Overview", displayMode: "multi" } },
]);

const DASHBOARD_2_LAYOUT = JSON.stringify([
  // Row 1: power metrics
  { i: "w1", x: 0, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Power (W)", deviceUniqId: "power-meter-01", selectedKey: "power", units: "W" } },
  { i: "w2", x: 3, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Energy (kWh)", deviceUniqId: "power-meter-01", selectedKey: "kwh", units: "kWh" } },
  { i: "w3", x: 6, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "Power Factor", deviceUniqId: "power-meter-01", selectedKey: "pf", units: "" } },
  { i: "w4", x: 9, y: 0, w: 3, h: 3, widgetType: "Metric Display", config: { customName: "PUE Index", deviceUniqId: "pue-sensor", selectedKey: "pue", units: "" } },
  // Row 2: power trend
  { i: "w5", x: 0, y: 3, w: 12, h: 5, widgetType: "Simple Trend Chart", config: { widgetTitle: "Energy Trend (7 Days)", configName: "Main Power Meter kWh", timeRange: "7d" } },
  // Row 3: current + ups load
  { i: "w6", x: 0, y: 8, w: 4, h: 4, widgetType: "Metric Display", config: { customName: "PDU-A Current", deviceUniqId: "pdu-a-01", selectedKey: "current", units: "A" } },
  { i: "w7", x: 4, y: 8, w: 4, h: 4, widgetType: "Metric Display", config: { customName: "UPS Battery", deviceUniqId: "ups-main", selectedKey: "battery", units: "%" } },
  { i: "w8", x: 8, y: 8, w: 4, h: 4, widgetType: "Active Alarms", config: { widgetTitle: "Power Alarms" } },
]);

const DASHBOARD_3_LAYOUT = JSON.stringify([
  // Row 1: Alarm history (full width)
  { i: "w1", x: 0, y: 0, w: 12, h: 6, widgetType: "Alarm History", config: { widgetTitle: "Alarm Log" } },
  // Row 2: device summary + rack 2D
  { i: "w2", x: 0, y: 6, w: 5, h: 6, widgetType: "Device Connectivity Summary", config: { customName: "Device Status", refreshInterval: 30, showDetails: true, showProgressBars: true } },
  { i: "w3", x: 5, y: 6, w: 7, h: 6, widgetType: "Smart Rack 2D", config: { customName: "Rack View", displayMode: "single", rackType: "MAIN" } },
]);

export const DEMO_DASHBOARDS = [
  {
    id: "demo-dashboard-001",
    name: "Data Center Overview",
    userId: "demo-user-id",
    layout: DASHBOARD_1_LAYOUT,
    inUse: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-002",
    name: "Power & Energy",
    userId: "demo-user-id",
    layout: DASHBOARD_2_LAYOUT,
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-003",
    name: "Security & Operations",
    userId: "demo-user-id",
    layout: DASHBOARD_3_LAYOUT,
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Demo Chart Data Generator ────────────────────────────────────────────────
export function generateDemoChartData(configId: string, timeRange: string = "24h") {
  const now = Date.now();

  const timeRangeMs: Record<string, number> = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
    "7d": 7 * 24 * 60 * 60 * 1000,
    "30d": 30 * 24 * 60 * 60 * 1000,
  };

  const intervalMs: Record<string, number> = {
    "1h": 2 * 60 * 1000,
    "6h": 10 * 60 * 1000,
    "12h": 15 * 60 * 1000,
    "24h": 30 * 60 * 1000,
    "7d": 3 * 60 * 60 * 1000,
    "30d": 12 * 60 * 60 * 1000,
  };

  const rangeMs = timeRangeMs[timeRange] || timeRangeMs["24h"];
  const interval = intervalMs[timeRange] || intervalMs["24h"];

  // Base values and patterns per config
  const baseValues: Record<string, { base: number; amplitude: number; unit: string; name: string }> = {
    "demo-log-power-001": { base: 1800, amplitude: 400, unit: "W", name: "Total Power Consumption" },
    "demo-log-power-002": { base: 18000, amplitude: 2000, unit: "kWh", name: "Main Power Meter kWh" },
    "demo-log-temp-001": { base: 24, amplitude: 4, unit: "°C", name: "Rack-A Temperature" },
    "demo-log-ups-001": { base: 97, amplitude: 3, unit: "%", name: "UPS Battery Level" },
  };

  const cfg = baseValues[configId] || { base: 100, amplitude: 20, unit: "value", name: "Data" };

  const points: Array<{ timestamp: string; value: number }> = [];
  const startTime = now - rangeMs;
  let t = startTime;

  // Seed for deterministic random (based on configId)
  let seed = configId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pseudoRandom = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  while (t <= now) {
    const hourOfDay = new Date(t).getHours();
    // Business hours pattern (higher usage 8am-8pm)
    const timeMultiplier = hourOfDay >= 8 && hourOfDay <= 20 ? 1.2 : 0.85;
    const sinWave = Math.sin((t / (4 * 60 * 60 * 1000)) * Math.PI) * 0.3;
    const noise = (pseudoRandom() - 0.5) * 0.15;
    const value = cfg.base * timeMultiplier * (1 + sinWave + noise);

    points.push({
      timestamp: new Date(t).toISOString(),
      value: Math.round(value * 100) / 100,
    });
    t += interval;
  }

  const lastValue = points.length > 0 ? points[points.length - 1].value : cfg.base;
  const prevValue = points.length > 1 ? points[points.length - 2].value : lastValue;
  const change = prevValue !== 0 ? ((lastValue - prevValue) / prevValue) * 100 : 0;

  return {
    success: true,
    data: {
      current: lastValue,
      change: Math.round(change * 100) / 100,
      trend: change > 2 ? "up" : change < -2 ? "down" : "stable",
      unit: cfg.unit,
      data: points,
      timeRange,
      configName: cfg.name,
      totalPoints: points.length,
      isSampled: false,
      samplingInfo: null,
    },
  };
}

// ─── Demo MQTT Payload Generator ──────────────────────────────────────────────
let _seed = 42;
const rng = () => {
  _seed = (_seed * 9301 + 49297) % 233280;
  return _seed / 233280;
};
const vary = (base: number, pct: number) => Math.round((base + (rng() - 0.5) * 2 * base * pct) * 100) / 100;

export function generateDemoMqttPayload(topic: string): Record<string, number | string> {
  switch (topic) {
    case "demo/rack01/pdu-a":
      return { power: vary(1840, 0.04), current: vary(8.2, 0.03), voltage: vary(220, 0.01), freq: vary(50.0, 0.005), pf: vary(0.97, 0.01) };
    case "demo/rack01/pdu-b":
      return { power: vary(1620, 0.04), current: vary(7.4, 0.03), voltage: vary(220, 0.01), freq: vary(50.0, 0.005), pf: vary(0.96, 0.01) };
    case "demo/rack01/env":
      return { temp: vary(24.1, 0.02), hum: vary(49.5, 0.03), co2: vary(412, 0.02) };
    case "demo/rack02/env":
      return { temp: vary(22.8, 0.02), hum: vary(51.2, 0.03), co2: vary(408, 0.02) };
    case "demo/ups/main":
      return { battery: vary(97, 0.01), load: vary(48, 0.04), input_voltage: vary(220, 0.01), runtime: vary(42, 0.02) };
    case "demo/cooling/crac01":
      return { setpoint: 22.0, actual: vary(23.1, 0.02), mode: "COOL", fan_speed: vary(65, 0.04) };
    case "demo/power/meter01":
      return { power: vary(3460, 0.03), kwh: vary(18420, 0.001), pf: vary(0.97, 0.01), freq: vary(50.01, 0.005), voltage: vary(220, 0.01) };
    case "demo/rack01/server01":
      return { cpu: vary(45, 0.15), memory: vary(62, 0.05), disk: vary(78, 0.01), temp: vary(42, 0.03) };
    case "demo/rack01/server02":
      return { cpu: vary(32, 0.15), memory: vary(55, 0.05), disk: vary(61, 0.01), temp: vary(39, 0.03) };
    case "demo/rack02/switch01":
      return { status: "online", throughput: vary(45.2, 0.08), ports_up: 22, ports_down: 2 };
    case "demo/rack02/firewall":
      return { status: "online", cpu: vary(18, 0.12), sessions: vary(4820, 0.06), throughput: vary(2.4, 0.1) };
    case "demo/pue/monitor":
      return { pue: vary(1.42, 0.02), it_load: vary(3460, 0.03), total_facility: vary(4913, 0.02) };
    default:
      return { value: vary(100, 0.1) };
  }
}
