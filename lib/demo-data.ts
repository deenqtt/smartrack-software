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
    id: "smartrack-cooling-1",
    uniqId: "smartrack-cooling-1",
    name: "Cooling (Schneider ACRMD4KI)",
    topic: "smartrack/cooling/1",
    address: "192.168.1.103",
    deviceType: "COOLING",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ Air_Return_Temperature: 26.4, Air_Outlet_Temperature: 18.2, Air_Return_Humidity: 51.2, ON_OFF_UNIT: 1, Operation_Mode: "COOL", Suction_Pressure: 8.4, Exhaust_Pressure: 22.1 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-rpdu-1",
    uniqId: "smartrack-rpdu-1",
    name: "Rack PDU (UNITECH UT-D140205)",
    topic: "smartrack/rackpdu/1",
    address: "192.168.1.104",
    deviceType: "PDU",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ output_current: 8.7, output_voltage: 220.4, output_power: 1914, outlet1: 1, outlet2: 1, outlet3: 1, outlet4: 1 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-ups-1",
    uniqId: "smartrack-ups-1",
    name: "UPS (APC SMART UPS SRT96BP)",
    topic: "smartrack/ups/1",
    address: "192.168.1.105",
    deviceType: "UPS",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ battery_capacity: 97, battery_runtime_remaining: 3840, battery_voltage: 54.2, battery_current: 2.1, battery_health: 98, battery_temperature: 28, input_voltage: 220.1, input_frequency: 50.01, input_bypass_voltage: 220.0, input_bypass_frequency: 50.0, output_voltage: 220.0, output_current: 7.2, output_frequency: 50.0, output_load: 48, output_active_power: 1584, output_apparent_power: 1650, output_status: "ONLINE", state_total_time_on_normal: 86400, state_alarm_status: 0 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-sensorvib-1",
    uniqId: "smartrack-sensorvib-1",
    name: "Nexabrick Vibration Sensor",
    topic: "smartrack/vibration/1",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ activity: 0, vibration_x: 0.02, vibration_y: 0.01, vibration_z: 0.98 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-temphum-1",
    uniqId: "smartrack-temphum-1",
    name: "Nexabrick Temp Hum 1",
    topic: "smartrack/temphum/1",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ temp: 24.1, hum: 49.5 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-temphum-2",
    uniqId: "smartrack-temphum-2",
    name: "Nexabrick Temp Hum 2",
    topic: "smartrack/temphum/2",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ temp: 22.8, hum: 51.2 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-pue-1",
    uniqId: "smartrack-pue-1",
    name: "Smartrack PUE",
    topic: "smartrack/pue/1",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ pue: 1.42, it_load: 3460, total_facility: 4913, it_load_percent: 48 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-poweranalyzer-1",
    uniqId: "smartrack-poweranalyzer-1",
    name: "Smartrack Power Analyzers",
    topic: "smartrack/poweranalyzer/1",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ it_load_percent: 48.2, total_power_kw: 3.46, efficiency: 0.97 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "smartrack-bill-rpdu-1",
    uniqId: "smartrack-bill-rpdu-1",
    name: "Smartrack Rack PDU Bill",
    topic: "smartrack/bill/rpdu/1",
    address: "",
    deviceType: "SENSOR",
    status: "INSTALLED",
    lastPayload: JSON.stringify({ energy_kwh: 1842.5, cost: 2763750, carbon_kg: 1473.6 }),
    lastUpdatedByMqtt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Device Topic Map ─────────────────────────────────────────────────────────
export const DEMO_DEVICE_TOPIC_MAP: Record<string, string> = {
  "smartrack-cooling-1": "smartrack/cooling/1",
  "smartrack-rpdu-1": "smartrack/rackpdu/1",
  "smartrack-ups-1": "smartrack/ups/1",
  "smartrack-sensorvib-1": "smartrack/vibration/1",
  "smartrack-temphum-1": "smartrack/temphum/1",
  "smartrack-temphum-2": "smartrack/temphum/2",
  "smartrack-pue-1": "smartrack/pue/1",
  "smartrack-poweranalyzer-1": "smartrack/poweranalyzer/1",
  "smartrack-bill-rpdu-1": "smartrack/bill/rpdu/1",
};

// ─── Demo Racks ──────────────────────────────────────────────────────────────
export const DEMO_RACKS = {
  racks: [
    {
      id: "smartrack-rack-1",
      name: "Rack 1 (Smartrack)",
      capacityU: 42,
      usedU: 11,
      utilizationPercent: 26,
      location: "Smartrack Room",
      notes: "Primary SmartRack equipment rack",
      rackType: "NORMAL",
      _count: { devices: 6 },
      devices: [
        { id: "smartrack-ups-1",       name: "UPS (APC SMART UPS SRT96BP)",    positionU: 1,  sizeU: 4, deviceType: "UPS",     status: "INSTALLED" },
        { id: "smartrack-cooling-1",   name: "Cooling (Schneider ACRMD4KI)",   positionU: 5,  sizeU: 4, deviceType: "COOLING", status: "INSTALLED" },
        { id: "smartrack-sensorvib-1", name: "Nexabrick Vibration Sensor",      positionU: 12, sizeU: 1, deviceType: "SENSOR",  status: "INSTALLED" },
        { id: "smartrack-temphum-1",   name: "Nexabrick Temp Hum 1",            positionU: 13, sizeU: 1, deviceType: "SENSOR",  status: "INSTALLED" },
        { id: "smartrack-temphum-2",   name: "Nexabrick Temp Hum 2",            positionU: 14, sizeU: 1, deviceType: "SENSOR",  status: "INSTALLED" },
        { id: "smartrack-rpdu-1",      name: "Rack PDU (UNITECH UT-D140205)",   positionU: 42, sizeU: 1, deviceType: "PDU",     status: "INSTALLED" },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "smartrack-rack-2",
      name: "Rack 2 (Smartrack)",
      capacityU: 42,
      usedU: 0,
      utilizationPercent: 0,
      location: "Smartrack Room",
      notes: "Secondary SmartRack rack",
      rackType: "NORMAL",
      _count: { devices: 0 },
      devices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "smartrack-rack-3",
      name: "Rack 3 (Smartrack)",
      capacityU: 42,
      usedU: 0,
      utilizationPercent: 0,
      location: "Smartrack Room",
      notes: "Tertiary SmartRack rack",
      rackType: "NORMAL",
      _count: { devices: 0 },
      devices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: "smartrack-rack-4",
      name: "Rack 4 (Smartrack)",
      capacityU: 42,
      usedU: 0,
      utilizationPercent: 0,
      location: "Smartrack Room",
      notes: "Spare SmartRack rack",
      rackType: "NORMAL",
      _count: { devices: 0 },
      devices: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  total: 4,
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
        name: "RPDU High Current",
        customName: "Rack PDU Output Current High (>9.5A)",
        alarmType: "MAJOR",
        device: { name: "Rack PDU (UNITECH UT-D140205)", uniqId: "smartrack-rpdu-1" },
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
        name: "Return Air Temp High",
        customName: "Cooling Return Air Temperature (>28°C)",
        alarmType: "MINOR",
        device: { name: "Cooling (Schneider ACRMD4KI)", uniqId: "smartrack-cooling-1" },
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
        name: "Rack Humidity High",
        customName: "Temp Hum 1 Humidity High (>52%)",
        alarmType: "MINOR",
        device: { name: "Nexabrick Temp Hum 1", uniqId: "smartrack-temphum-1" },
      },
    },
    {
      id: "alm-004",
      status: "CLEARED",
      triggeringValue: "220.8",
      timestamp: t(360),
      clearedAt: t(300),
      alarmConfiguration: {
        id: "cfg-004",
        name: "PDU Voltage Spike",
        customName: "Rack PDU Output Voltage Spike (>221V)",
        alarmType: "MINOR",
        device: { name: "Rack PDU (UNITECH UT-D140205)", uniqId: "smartrack-rpdu-1" },
      },
    },
    {
      id: "alm-005",
      status: "ACTIVE",
      triggeringValue: "26.8",
      timestamp: t(15),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-005",
        name: "Supply Air Temp High",
        customName: "Cooling Outlet Temperature High (>26°C)",
        alarmType: "MAJOR",
        device: { name: "Cooling (Schneider ACRMD4KI)", uniqId: "smartrack-cooling-1" },
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
        customName: "UPS Battery Capacity Below 93%",
        alarmType: "CRITICAL",
        device: { name: "UPS (APC SMART UPS SRT96BP)", uniqId: "smartrack-ups-1" },
      },
    },
    {
      id: "alm-007",
      status: "CLEARED",
      triggeringValue: "58",
      timestamp: t(500),
      clearedAt: t(480),
      alarmConfiguration: {
        id: "cfg-007",
        name: "UPS Load High",
        customName: "UPS Output Load High (>55%)",
        alarmType: "MINOR",
        device: { name: "UPS (APC SMART UPS SRT96BP)", uniqId: "smartrack-ups-1" },
      },
    },
    {
      id: "alm-008",
      status: "ACTIVE",
      triggeringValue: "0.03",
      timestamp: t(8),
      clearedAt: null,
      alarmConfiguration: {
        id: "cfg-008",
        name: "Vibration Detected",
        customName: "Vibration Axis X Threshold (>0.02g)",
        alarmType: "MINOR",
        device: { name: "Nexabrick Vibration Sensor", uniqId: "smartrack-sensorvib-1" },
      },
    },
    {
      id: "alm-009",
      status: "CLEARED",
      triggeringValue: "27.4",
      timestamp: t(1440),
      clearedAt: t(1380),
      alarmConfiguration: {
        id: "cfg-009",
        name: "Rack Temp 2 High",
        customName: "Temp Hum 2 Temperature High (>27°C)",
        alarmType: "MINOR",
        device: { name: "Nexabrick Temp Hum 2", uniqId: "smartrack-temphum-2" },
      },
    },
    {
      id: "alm-010",
      status: "CLEARED",
      triggeringValue: "1.58",
      timestamp: t(2880),
      clearedAt: t(2820),
      alarmConfiguration: {
        id: "cfg-010",
        name: "PUE High",
        customName: "PUE Value High (>1.5)",
        alarmType: "MINOR",
        device: { name: "Smartrack PUE", uniqId: "smartrack-pue-1" },
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
    // Cooling
    { id: "smartrack_log_cooling_return_temp",  customName: "Cooling Return Air Temperature",    deviceUniqId: "smartrack-cooling-1",      key: "Air_Return_Temperature",  units: "°C", loggingIntervalMinutes: 5, isActive: true, device: { name: "Cooling (Schneider ACRMD4KI)" } },
    { id: "smartrack_log_cooling_supply_temp",  customName: "Cooling Supply Air Temperature 1",  deviceUniqId: "smartrack-cooling-1",      key: "Air_Outlet_Temperature",  units: "°C", loggingIntervalMinutes: 5, isActive: true, device: { name: "Cooling (Schneider ACRMD4KI)" } },
    { id: "smartrack_log_cooling_suction_p",    customName: "Cooling Suction Pressure",          deviceUniqId: "smartrack-cooling-1",      key: "Suction_Pressure",        units: "bar", loggingIntervalMinutes: 5, isActive: true, device: { name: "Cooling (Schneider ACRMD4KI)" } },
    { id: "smartrack_log_cooling_exhaust_p",    customName: "Cooling Exhaust Pressure",          deviceUniqId: "smartrack-cooling-1",      key: "Exhaust_Pressure",        units: "bar", loggingIntervalMinutes: 5, isActive: true, device: { name: "Cooling (Schneider ACRMD4KI)" } },
    // Vibration
    { id: "smartrack_log_vib_x",                customName: "Vibration Axis X",                  deviceUniqId: "smartrack-sensorvib-1",    key: "vibration_x",             units: "g",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Nexabrick Vibration Sensor" } },
    { id: "smartrack_log_vib_y",                customName: "Vibration Axis Y",                  deviceUniqId: "smartrack-sensorvib-1",    key: "vibration_y",             units: "g",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Nexabrick Vibration Sensor" } },
    { id: "smartrack_log_vib_z",                customName: "Vibration Axis Z",                  deviceUniqId: "smartrack-sensorvib-1",    key: "vibration_z",             units: "g",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Nexabrick Vibration Sensor" } },
    // Temp Hum
    { id: "smartrack_log_temphum1_hum",         customName: "Nexabrick Temp Hum 1 - Humidity",   deviceUniqId: "smartrack-temphum-1",      key: "hum",                     units: "%",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Nexabrick Temp Hum 1" } },
    { id: "smartrack_log_temphum2_hum",         customName: "Nexabrick Temp Hum 2 - Humidity",   deviceUniqId: "smartrack-temphum-2",      key: "hum",                     units: "%",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Nexabrick Temp Hum 2" } },
    // UPS
    { id: "smartrack_log_ups_load",             customName: "UPS Load Percentage",               deviceUniqId: "smartrack-ups-1",          key: "output_load",             units: "%",  loggingIntervalMinutes: 5, isActive: true, device: { name: "UPS (APC SMART UPS SRT96BP)" } },
    // RPDU
    { id: "smartrack_chart_rpdu_output_current_1", customName: "RPDU Output Current 1",          deviceUniqId: "smartrack-rpdu-1",         key: "output_current",          units: "A",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Rack PDU (UNITECH UT-D140205)" } },
    // PUE & Power Analyzer
    { id: "smartrack_pue_value_log",            customName: "Smartrack PUE Value",               deviceUniqId: "smartrack-pue-1",          key: "pue",                     units: "",   loggingIntervalMinutes: 5, isActive: true, device: { name: "Smartrack PUE" } },
    { id: "smartrack_poweranalyzer_load_log",   customName: "Smartrack IT Load %",               deviceUniqId: "smartrack-poweranalyzer-1",key: "it_load_percent",         units: "%",  loggingIntervalMinutes: 5, isActive: true, device: { name: "Smartrack Power Analyzers" } },
    // Billing
    { id: "smartrack_bill_energy_kwh",          customName: "Smartrack Bill Energy kWh",         deviceUniqId: "smartrack-bill-rpdu-1",    key: "energy_kwh",              units: "kWh", loggingIntervalMinutes: 60, isActive: true, device: { name: "Smartrack Rack PDU Bill" } },
  ],
  total: 14,
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
// demoRestricted: true  → intercept navigation, show DemoRestrictedModal
export const DEMO_MENU_DATA = {
  success: true,
  isDeveloper: true,
  activePreset: null,
  data: [
    {
      id: "menu-group-dashboard",
      name: "dashboard",
      label: "Dashboard",
      icon: "LayoutDashboard",
      order: 0,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-dashboard-overview",
          name: "dashboard-overview",
          label: "Dashboard",
          path: "/",
          icon: "LayoutDashboard",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-infrastructure",
      name: "infrastructure",
      label: "Infrastructure",
      icon: "Server",
      order: 1,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-racks-management",
          name: "racks-management",
          label: "Rack Management",
          path: "/infrastructure/racks",
          icon: "Archive",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-rack-monitor",
          name: "rack-monitor",
          label: "Rack Monitor 2D",
          path: "/infrastructure/rack-monitor",
          icon: "LayoutGrid",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-devices",
      name: "devices",
      label: "Devices",
      icon: "Cpu",
      order: 2,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-devices-internal",
          name: "devices-internal",
          label: "Internal Devices",
          path: "/devices/devices-internal",
          icon: "Server",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-devices-external",
          name: "devices-external",
          label: "External Devices",
          path: "/devices/devices-external",
          icon: "Globe",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-devices-access-controllers",
          name: "devices-access-controllers",
          label: "Access Controllers",
          path: "/devices/access-controllers",
          icon: "KeyRound",
          order: 2,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-devices-library",
          name: "devices-library",
          label: "Device Library",
          path: "/devices/library",
          icon: "Library",
          order: 3,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-devices-device-catalog",
          name: "devices-device-catalog",
          label: "Device Catalog",
          path: "/devices/device-catalog",
          icon: "Blocks",
          order: 4,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-logging-configs",
          name: "logging-configs",
          label: "Log Sources",
          path: "/devices/devices-for-logging",
          icon: "Database",
          order: 5,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-network",
      name: "network",
      label: "Network",
      icon: "Network",
      order: 3,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-network-mqtt-broker",
          name: "network-mqtt-broker",
          label: "Local MQTT Broker",
          path: "/network/mqtt-broker",
          icon: "Radio",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-network-mqtt-management",
          name: "network-mqtt-management",
          label: "Remote MQTT Broker",
          path: "/network/mqtt-config",
          icon: "Settings",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-network-communication-setup",
          name: "network-communication-setup",
          label: "Network Out",
          path: "/network/communication-setup",
          icon: "Waves",
          order: 2,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-network-settings",
          name: "network-settings",
          label: "Network In",
          path: "/network/network-settings",
          icon: "Settings",
          order: 3,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-network-protocol-config",
          name: "network-protocol-config",
          label: "Protocol Config",
          path: "/network/protocol-config",
          icon: "Cog",
          order: 4,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-network-payload-discover",
          name: "network-payload-discover",
          label: "Payload Discover",
          path: "/network/payload/discover",
          icon: "Search",
          order: 5,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-control",
      name: "control",
      label: "Automation",
      icon: "Sliders",
      order: 4,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-manage-rule-chains",
          name: "manage-rule-chains",
          label: "Automation Rules",
          path: "/manage-rule-chains",
          icon: "GitBranch",
          order: 0,
          isActive: true,
          isDeveloper: true,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-monitoring",
      name: "monitoring",
      label: "Monitoring",
      icon: "Activity",
      order: 5,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-system-monitoring",
          name: "system-monitoring",
          label: "System Performance",
          path: "/system-config/system-monitoring",
          icon: "Activity",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-power-analyzer",
          name: "power-analyzer",
          label: "Power Analysis",
          path: "/system-config/power-analyzer",
          icon: "Zap",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-analytics",
      name: "analytics",
      label: "Reports",
      icon: "BarChart3",
      order: 6,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-report-alarm-log-reports",
          name: "report-alarm-log-reports",
          label: "Alarm Reports",
          path: "/report/alarm-log-reports",
          icon: "FileBarChart",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-report-devices-log-report",
          name: "report-devices-log-report",
          label: "Device Reports",
          path: "/report/devices-log-report",
          icon: "BarChart",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-report-notification-history",
          name: "report-notification-history",
          label: "Notification Reports",
          path: "/report/notification-history",
          icon: "Bell",
          order: 2,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-security",
      name: "security",
      label: "Security",
      icon: "Shield",
      order: 7,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-security-alarm-management",
          name: "security-alarm-management",
          label: "Alarm Management",
          path: "/security/alarm-management",
          icon: "AlertTriangle",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-maintenance",
      name: "maintenance",
      label: "Maintenance",
      icon: "Wrench",
      order: 8,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-maintenance-schedule-management",
          name: "maintenance-schedule-management",
          label: "Maintenance Schedule",
          path: "/maintenance/schedule-management",
          icon: "Wrench",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-maintenance-report",
          name: "maintenance-report",
          label: "Maintenance Report",
          path: "/maintenance/report",
          icon: "FileBarChart",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-system-config",
      name: "system_config",
      label: "System Config",
      icon: "ServerCog",
      order: 9,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-system-user-management",
          name: "system-user-management",
          label: "User Management",
          path: "/system-config/user-management",
          icon: "Users",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-system-backup-management",
          name: "system-backup-management",
          label: "Backup Management",
          path: "/backup-management",
          icon: "HardDrive",
          order: 2,
          isActive: true,
          isDeveloper: true,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-system-ota-management",
          name: "system-ota-management",
          label: "OTA Management",
          path: "/system-config/ota",
          icon: "Download",
          order: 3,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-system-general-config",
          name: "system-general-config",
          label: "General Config",
          path: "/system-config/general-config",
          icon: "Settings",
          order: 4,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-manage-menu",
          name: "manage-menu",
          label: "Manage Menu",
          path: "/system-config/manage-menu",
          icon: "Menu",
          order: 6,
          isActive: true,
          isDeveloper: true,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
    {
      id: "menu-group-system-info",
      name: "system_info",
      label: "System Info",
      icon: "Info",
      order: 10,
      isActive: true,
      menuItems: [
        {
          id: "menu-item-system-information",
          name: "system-information",
          label: "System Information",
          path: "/info",
          icon: "Info",
          order: 0,
          isActive: true,
          isDeveloper: false,
          demoRestricted: true,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
        {
          id: "menu-item-ai-insights",
          name: "ai-insights",
          label: "AI Assistant",
          path: "/ai-insights",
          icon: "Sparkles",
          order: 1,
          isActive: true,
          isDeveloper: false,
          demoRestricted: false,
          permissions: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        },
      ],
    },
  ],
};

// ─── Demo Dashboard Layouts (mirrored from templates/dashboard-templates/smartrack.json) ──
export const DEMO_DASHBOARDS = [
  {
    id: "demo-dashboard-default",
    name: "Default Dashboard",
    userId: "demo-user-id",
    layout: "[]",
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-analytic",
    name: "Smartrack Analytic",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 12, i: "Chart-CoolingEfficiency-1769747000000", w: 12, x: 0, y: 0, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Cooling Return Air Temperature", "Cooling Supply Air Temperature 1"], smoothLines: true, widgetTitle: "Cooling Efficiency (Return vs Supply)", showCorrelations: true } },
      { h: 10, i: "Chart-PressureTrend-1769747200000", w: 6, x: 0, y: 12, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Vibration Axis X", "Vibration Axis Y", "Vibration Axis Z"], smoothLines: true, widgetTitle: "Vibration Axis Trend", showCorrelations: false } },
      { h: 10, i: "Chart-HumidityTrend-1769747300000", w: 6, x: 6, y: 12, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Nexabrick Temp Hum 1 - Humidity", "Nexabrick Temp Hum 2 - Humidity"], smoothLines: true, widgetTitle: "Rack Humidity Distribution", showCorrelations: false } },
      { h: 12, i: "Chart-PowerCorrelation-1769747400000", w: 12, x: 0, y: 22, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["UPS Load Percentage", "RPDU Output Current 1"], smoothLines: true, widgetTitle: "UPS Load vs PDU Current", showCorrelations: true } },
      { h: 12, i: "Chart-PueTrend-1769748400000", w: 6, x: 0, y: 34, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Smartrack PUE Value"], smoothLines: true, widgetTitle: "PUE Trend (24h)", showCorrelations: false } },
      { h: 12, i: "Chart-ItLoadTrend-1769748500000", w: 6, x: 6, y: 34, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Smartrack IT Load %"], smoothLines: true, widgetTitle: "IT Load % Trend (24h)", showCorrelations: false } },
      { h: 7, i: "Carbon-BillL1-1769748600000", w: 6, x: 0, y: 46, minH: 2, minW: 2, moved: false, static: false, widgetType: "Carbon Emissions", config: { widgetTitle: "Carbon Emissions L1", billConfigId: "smartrack_bill_rpdu_feed_1", publishTopic: "IOT/BillCalculation/Smartrack_Rack_PDU_Bill" } },
      { h: 7, i: "Billing-Predictive-1769748800000", w: 6, x: 6, y: 46, minH: 2, minW: 2, moved: false, static: false, widgetType: "Predictive Billing", config: { showType: "all", widgetTitle: "Predictive Bill L1", billConfigId: "smartrack_bill_rpdu_feed_1" } },
      { h: 14, i: "AI-Energy-Advisor-1769749900000", w: 12, x: 0, y: 53, minH: 6, minW: 4, moved: false, static: false, widgetType: "AI Energy Advisor", config: { widgetTitle: "AI Energy Advisor" } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-cooling",
    name: "Smartrack Cooling",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 12, i: "Cooling-Dashboard-widget-1770109636953", w: 12, x: 0, y: 0, minH: 4, minW: 4, moved: false, static: false, widgetType: "Cooling Dashboard", config: { customName: "Cooling", keyMapping: { mode: "Operation_Mode", acStatus: "ON_OFF_UNIT", returnHum: "Air_Return_Humidity", supplyHum: "", returnTemp: "Air_Return_Temperature", supplyTemp: "Air_Outlet_Temperature" }, deviceUniqId: "smartrack-cooling-1" } },
      { h: 6, i: "Status-CoolingStatus-1770088200000", w: 3, x: 0, y: 12, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "", iconColor: "#FFFFFF", customName: "Cooling Status", iconBgColor: "#0ea5e9", selectedKey: "ON_OFF_UNIT", deviceUniqId: "smartrack-cooling-1", selectedIcon: "Wind" } },
      { h: 6, i: "Gauge-ReturnTemp-1770088300000", w: 3, x: 3, y: 12, minH: 2, minW: 2, moved: false, static: false, widgetType: "Analog Meter", config: { max: 35, min: 15, units: "°C", customName: "Return Air Temp", selectedKey: "Air_Return_Temperature", deviceUniqId: "smartrack-cooling-1", selectedIcon: "Thermometer" } },
      { h: 6, i: "Gauge-SupplyTemp-1770088400000", w: 3, x: 6, y: 12, minH: 2, minW: 2, moved: false, static: false, widgetType: "Analog Meter", config: { max: 30, min: 10, units: "°C", customName: "Supply Air Temp", selectedKey: "Air_Outlet_Temperature", deviceUniqId: "smartrack-cooling-1", selectedIcon: "Thermometer" } },
      { h: 6, i: "Gauge-ReturnHum-1770088500000", w: 3, x: 9, y: 12, minH: 2, minW: 2, moved: false, static: false, widgetType: "Analog Meter", config: { max: 100, min: 0, units: "%", customName: "Return Humidity", selectedKey: "Air_Return_Humidity", deviceUniqId: "smartrack-cooling-1", selectedIcon: "Droplets" } },
      { h: 13, i: "Chart-TempDelta-1770088600000", w: 6, x: 0, y: 18, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Cooling Return Air Temperature", "Cooling Supply Air Temperature 1"], smoothLines: true, widgetTitle: "Temperature Delta (Efficiency)", showCorrelations: true } },
      { h: 13, i: "Chart-PressureHealth-1770088700000", w: 6, x: 6, y: 18, minH: 4, minW: 4, moved: false, static: false, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Cooling Suction Pressure", "Cooling Exhaust Pressure"], smoothLines: true, widgetTitle: "Compressor Health (Pressure)", showCorrelations: false } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-ups",
    name: "Smartrack UPS",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 17, i: "Ups-Dashboard-widget-1769746000000", w: 12, x: 0, y: 0, minH: 4, minW: 4, moved: false, static: false, widgetType: "Ups Dashboard", config: { line: { keyMapping: { voltage: "input_voltage", frequency: "input_frequency" }, deviceUniqId: "smartrack-ups-1" }, load: { keyMapping: { percent: "output_load", activePower: "output_active_power", apparentPower: "output_apparent_power" }, deviceUniqId: "smartrack-ups-1" }, bypass: { keyMapping: { voltage: "input_bypass_voltage", frequency: "input_bypass_frequency" }, deviceUniqId: "smartrack-ups-1" }, output: { keyMapping: { current: "output_current", voltage: "output_voltage", frequency: "output_frequency" }, deviceUniqId: "smartrack-ups-1" }, status: { keyMapping: { status: "output_status", runningTime: "state_total_time_on_normal", communicationStatus: "state_alarm_status" }, deviceUniqId: "smartrack-ups-1" }, battery: { keyMapping: { time: "battery_runtime_remaining", health: "battery_health", current: "battery_current", percent: "battery_capacity", voltage: "battery_actual_voltage", temperature: "battery_temperature" }, deviceUniqId: "smartrack-ups-1" }, customName: "Smartrack UPS Status" } },
      { h: 5, i: "Status-Card-Battery-1769746100000", w: 2, x: 0, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "%", iconColor: "#FFFFFF", customName: "Battery Level", iconBgColor: "#22c55e", selectedKey: "battery_capacity", deviceUniqId: "smartrack-ups-1", selectedIcon: "BatteryCharging" } },
      { h: 5, i: "Status-Card-Load-1769746200000", w: 2, x: 2, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "%", iconColor: "#FFFFFF", customName: "Load Level", iconBgColor: "#eab308", selectedKey: "output_load", deviceUniqId: "smartrack-ups-1", selectedIcon: "Zap" } },
      { h: 5, i: "Status-Card-InputV-1769746300000", w: 2, x: 4, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "V", iconColor: "#FFFFFF", customName: "Input Voltage", iconBgColor: "#3b82f6", selectedKey: "input_voltage", deviceUniqId: "smartrack-ups-1", selectedIcon: "Plug" } },
      { h: 5, i: "Status-Card-OutputV-1769746400000", w: 2, x: 6, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "V", iconColor: "#FFFFFF", customName: "Output Voltage", iconBgColor: "#8b5cf6", selectedKey: "output_voltage", deviceUniqId: "smartrack-ups-1", selectedIcon: "Zap" } },
      { h: 5, i: "Status-Card-Runtime-1769746500000", w: 2, x: 8, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "sec", iconColor: "#FFFFFF", customName: "Runtime", iconBgColor: "#64748b", selectedKey: "battery_runtime_remaining", deviceUniqId: "smartrack-ups-1", selectedIcon: "Clock" } },
      { h: 5, i: "Status-Card-Status-1769746600000", w: 2, x: 10, y: 17, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "", iconColor: "#FFFFFF", customName: "UPS Status", iconBgColor: "#0ea5e9", selectedKey: "output_status", deviceUniqId: "smartrack-ups-1", selectedIcon: "Activity" } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-power",
    name: "Smartrack Power",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 20, i: "PDM-Topology-widget-1769745000000", w: 12, x: 0, y: 0, minH: 4, minW: 4, moved: false, static: false, widgetType: "PDM Topology", config: { devices: { ac: [{ id: "ac-1", label: "Smartrack Cooling", enabled: true, deviceUniqId: "smartrack-cooling-1" }], pdm: { label: "Main Rack PDU", enabled: true, deviceUniqId: "smartrack-rpdu-1" }, pdu: [{ id: "pdu-1", label: "Smartrack PDU", enabled: true, deviceUniqId: "smartrack-rpdu-1" }], ups: [{ id: "ups-1", label: "Smartrack UPS", enabled: true, deviceUniqId: "smartrack-ups-1" }] }, location: "Smartrack Rack", appearance: { size: "large", theme: "dark", showLines: true, showLabels: true, showStatus: true }, thresholds: { battery: { min: 20 }, voltage: { max: 240, min: 210 }, temperature: { max: 40 } }, widgetName: "Smartrack Power Distribution", refreshRate: 3 } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-security",
    name: "Smartrack Security",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 5, i: "Active-Alarms-widget-1769592730711", w: 4, x: 0, y: 0, minH: 2, minW: 2, moved: false, static: false, widgetType: "Active Alarms", config: { widgetTitle: "Active Alarms" } },
      { h: 13, i: "Alarm-History-widget-1769592737305", w: 4, x: 0, y: 5, minH: 2, minW: 2, moved: false, static: false, widgetType: "Alarm History", config: { logLimit: 10, widgetTitle: "Alarm Log" } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-main",
    name: "Smartrack Dashboard",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 20, i: "Server-Rack-3D-widget-1766736884252", w: 6, x: 2, y: 0, minH: 2, minW: 2, moved: false, static: false, widgetType: "Server Rack 3D", config: { rackId: "smartrack-rack-1", rackType: "server" } },
      { h: 5, i: "Status-Indicator-Card-widget-1766737097246", w: 2, x: 10, y: 20, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "°C", multiply: 1, iconColor: "#FFFFFF", customName: "Temp Hum 1", iconBgColor: "#3B82F6", selectedKey: "temp", deviceUniqId: "smartrack-temphum-1", selectedIcon: "Thermometer" } },
      { h: 5, i: "Status-Indicator-Card-widget-1766737123966", w: 2, x: 10, y: 15, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "%", multiply: 1, iconColor: "#FFFFFF", customName: "Humidity 1", iconBgColor: "#3B82F6", selectedKey: "hum", deviceUniqId: "smartrack-temphum-1", selectedIcon: "Droplets" } },
      { h: 5, i: "Status-Indicator-Card-widget-1766737210640", w: 2, x: 8, y: 0, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "", multiply: 1, iconColor: "#FFFFFF", customName: "Vibration", iconBgColor: "#3B82F6", selectedKey: "activity", deviceUniqId: "smartrack-sensorvib-1", selectedIcon: "AlertTriangle" } },
      { h: 5, i: "Status-Indicator-Card-widget-1769612046664", w: 2, x: 8, y: 5, minH: 2, minW: 2, moved: false, static: false, widgetType: "Status Indicator Card", config: { units: "%", multiply: 1, iconColor: "#FFFFFF", customName: "Humidity 2", iconBgColor: "#3B82F6", selectedKey: "hum", deviceUniqId: "smartrack-temphum-2", selectedIcon: "Droplets" } },
      { h: 4, i: "Image-Display-widget-1769743608173", w: 2, x: 0, y: 0, minH: 2, minW: 2, moved: false, static: false, widgetType: "Image Display", config: { fitMode: "contain", imageUrl: "https://i.ibb.co.com/p6mjx55s/Untitled-removebg-preview.png", customName: "Logo", borderColor: "#000000", borderWidth: 0, borderRadius: "lg", backgroundColor: "transparent" } },
      { h: 3, i: "Dashboard-Shortcut-widget-1766737331999", w: 2, x: 0, y: 7, minH: 2, minW: 2, moved: false, static: false, widgetType: "Dashboard Shortcut", config: { icon: "LayoutDashboard", targetType: "dashboard", shortcutTitle: "Analytic", targetDashboardId: "demo-dashboard-analytic" } },
      { h: 3, i: "Dashboard-Shortcut-widget-1766737343625", w: 2, x: 0, y: 4, minH: 2, minW: 2, moved: false, static: false, widgetType: "Dashboard Shortcut", config: { icon: "Shield", targetType: "dashboard", shortcutTitle: "Security", targetDashboardId: "demo-dashboard-security" } },
      { h: 3, i: "Dashboard-Shortcut-widget-1770084452883", w: 2, x: 0, y: 10, minH: 2, minW: 2, moved: false, static: false, widgetType: "Dashboard Shortcut", config: { icon: "Zap", targetType: "dashboard", shortcutTitle: "Power", targetDashboardId: "demo-dashboard-power" } },
      { h: 3, i: "Dashboard-Shortcut-widget-1770084475410", w: 2, x: 0, y: 13, minH: 2, minW: 2, moved: false, static: false, widgetType: "Dashboard Shortcut", config: { icon: "Cog", targetType: "dashboard", shortcutTitle: "UPS", targetDashboardId: "demo-dashboard-ups" } },
      { h: 4, i: "Dashboard-Shortcut-widget-1770107834386", w: 2, x: 0, y: 16, minH: 2, minW: 2, moved: false, static: false, widgetType: "Dashboard Shortcut", config: { icon: "LayoutDashboard", targetType: "dashboard", shortcutTitle: "Cooling", targetDashboardId: "demo-dashboard-cooling" } },
    ]),
    inUse: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "demo-dashboard-admin",
    name: "Admin Panel",
    userId: "demo-user-id",
    layout: JSON.stringify([
      { h: 12, i: "Server-Rack-3D-1775019161354-1", w: 12, x: 0, y: 0, widgetType: "Server Rack 3D", config: { rackId: "smartrack-rack-1", rackIds: ["smartrack-rack-1", "smartrack-rack-2", "smartrack-rack-3", "smartrack-rack-4"], rackType: "server", rackSpacing: 62, assignedCategory: "Overview" } },
      { h: 8, i: "Energy-Target-Chart-1775019161354-a1", w: 6, x: 0, y: 0, widgetType: "Energy Target Chart", config: { assignedCategory: "Analytic", widgetTitle: "Energy Target Chart", loggingConfigId: "smartrack_chart_rpdu_output_current_1", configNames: ["RPDU Output Current 1"], chartType: "heatmap", targetUnit: "A", showProjections: true, showAchievements: true, year: 2026, heatmapMonth: 4, heatmapYear: 2026, colorScheme: "github-green", activityLevelMode: "auto" } },
      { h: 5, i: "Carbon-Emissions-1775019161354-a4", w: 3, x: 0, y: 8, widgetType: "Carbon Emissions", config: { widgetTitle: "Total Carbon Emissions", billConfigId: "smartrack_bill_rpdu_feed_1", assignedCategory: "Analytic", publishTopic: "" } },
      { h: 11, i: "PDM-Topology-1775019161354-p1", w: 12, x: 0, y: 0, widgetType: "PDM Topology", config: { devices: { pdm: { enabled: true, deviceUniqId: "smartrack-ups-1", label: "Main PDM" }, ups: [{ id: "dummy_ups_1", label: "UPS A", enabled: true, deviceUniqId: "smartrack-ups-1" }], pdu: [{ id: "dummy_pdu_1", label: "Rack PDU 1", enabled: true, deviceUniqId: "smartrack-rpdu-1" }], ac: [{ id: "dummy_ac_1", label: "PAC 1", enabled: true, deviceUniqId: "smartrack-cooling-1" }] }, location: "Data Center 1", appearance: { size: "medium", theme: "dark", showLabels: true, showLines: true, showStatus: true }, thresholds: { voltage: { min: 190, max: 240 }, temperature: { max: 45 }, battery: { min: 20 } }, widgetName: "Floor Power Topology", refreshRate: 5, assignedCategory: "Power" } },
      { h: 11, i: "Ups-Dashboard-1775019161354-u1", w: 12, x: 0, y: 0, widgetType: "Ups Dashboard", config: { line: { keyMapping: { voltage: "input_voltage", frequency: "input_frequency" }, deviceUniqId: "smartrack-ups-1" }, load: { keyMapping: { percent: "output_load", activePower: "output_active_power", apparentPower: "output_apparent_power" }, deviceUniqId: "smartrack-ups-1" }, bypass: { keyMapping: { voltage: "input_bypass_voltage", frequency: "input_bypass_frequency" }, deviceUniqId: "smartrack-ups-1" }, output: { keyMapping: { current: "output_current", voltage: "output_voltage", frequency: "output_frequency" }, deviceUniqId: "smartrack-ups-1" }, status: { keyMapping: { status: "output_status", runningTime: "state_total_time_on_normal", communicationStatus: "state_alarm_status" }, deviceUniqId: "smartrack-ups-1" }, battery: { keyMapping: { time: "battery_runtime_remaining", health: "battery_health", current: "battery_current", percent: "battery_capacity", voltage: "battery_actual_voltage", temperature: "battery_temperature" }, deviceUniqId: "smartrack-ups-1" }, customName: "Main UPS Dashboard", assignedCategory: "UPS" } },
      { h: 10, i: "Active-Alarms-1775019161354-s1", w: 4, x: 0, y: 0, widgetType: "Active Alarms", config: { assignedCategory: "Security", widgetTitle: "Active Alarm" } },
      { h: 10, i: "Alarm-History-1775019161354-s2", w: 8, x: 4, y: 0, widgetType: "Alarm History", config: { assignedCategory: "Security", widgetTitle: "Alarm History", logLimit: 10 } },
      { h: 11, i: "Cooling-Dashboard-1775019161354-c1", w: 12, x: 0, y: 0, widgetType: "Cooling Dashboard", config: { customName: "Cooling Dashboard", keyMapping: { mode: "Operation_Mode", acStatus: "ON_OFF_UNIT", returnHum: "Air_Return_Humidity", supplyHum: "", returnTemp: "Air_Return_Temperature", supplyTemp: "Air_Outlet_Temperature" }, deviceUniqId: "smartrack-cooling-1", assignedCategory: "Cooling" } },
      { h: 8, i: "Chart-PueTrend-1775019161355-a9", w: 6, x: 6, y: 0, widgetType: "Multi-Line Chart", config: { timeRange: "24h", showLegend: true, configNames: ["Smartrack PUE Value", "Smartrack IT Load %"], smoothLines: true, widgetTitle: "PUE Trend (24h) & IT Load Trend", showCorrelations: false, assignedCategory: "Analytic" } },
      { h: 5, i: "Billing-AnalyticPred-1775019161355-a12", w: 3, x: 3, y: 8, widgetType: "Predictive Billing", config: { widgetTitle: "Predictive Bill L1", billConfigId: "smartrack_bill_rpdu_feed_1", assignedCategory: "Analytic", showType: "all" } },
      { h: 5, i: "GroupedStatus-TH1-env-e1", w: 4, x: 0, y: 0, widgetType: "Status Dashboard", config: { title: "Temp Hum 1", assignedCategory: "Environment", items: [{ customName: "Temperature 1", deviceUniqId: "smartrack-temphum-1", selectedKey: "temp", units: "°C", multiply: 1, selectedIcon: "Thermometer", iconColor: "#FFFFFF", iconBgColor: "#ef4444" }, { customName: "Humidity 1", deviceUniqId: "smartrack-temphum-1", selectedKey: "hum", units: "%", multiply: 1, selectedIcon: "Droplets", iconColor: "#FFFFFF", iconBgColor: "#3b82f6" }] } },
      { h: 5, i: "GroupedStatus-TH2-env-e2", w: 4, x: 4, y: 0, widgetType: "Status Dashboard", config: { title: "Temp Hum 2", assignedCategory: "Environment", items: [{ customName: "Temperature 2", deviceUniqId: "smartrack-temphum-2", selectedKey: "temp", units: "°C", multiply: 1, selectedIcon: "Thermometer", iconColor: "#FFFFFF", iconBgColor: "#f97316" }, { customName: "Humidity 2", deviceUniqId: "smartrack-temphum-2", selectedKey: "hum", units: "%", multiply: 1, selectedIcon: "Droplets", iconColor: "#FFFFFF", iconBgColor: "#06b6d4" }] } },
      { h: 5, i: "GroupedStatus-Vibration-env-e3", w: 4, x: 8, y: 0, widgetType: "Status Dashboard", config: { title: "Vibration Sensor", assignedCategory: "Environment", items: [{ customName: "Activity", deviceUniqId: "smartrack-sensorvib-1", selectedKey: "activity", units: "", multiply: 1, selectedIcon: "Zap", iconColor: "#FFFFFF", iconBgColor: "#f59e0b" }] } },
      { i: "AI-Energy-Advisor-1775658801911", x: 6, y: 8, w: 6, h: 5, widgetType: "AI Energy Advisor", config: { widgetTitle: "AI Energy Advisor", assignedCategory: "Analytic", deviceSources: [{ uniqId: "smartrack-poweranalyzer-1", name: "Smartrack Power Analyzers" }, { uniqId: "smartrack-pue-1", name: "Smartrack PUE" }, { uniqId: "smartrack-bill-rpdu-1", name: "Smartrack Rack PDU Bill" }], logSources: [{ id: "smartrack_bill_energy_kwh", customName: "Smartrack Bill Energy kWh" }, { id: "smartrack_poweranalyzer_load_log", customName: "Smartrack IT Load %" }, { id: "smartrack_pue_value_log", customName: "Smartrack PUE Value" }] } },
    ]),
    inUse: true,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// ─── Demo Chart Data Generator ───────────────────────────────────────────────
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

  // Base values per logging config ID
  const baseValues: Record<string, { base: number; amplitude: number; unit: string; name: string }> = {
    // Cooling
    "smartrack_log_cooling_return_temp":  { base: 26.0, amplitude: 3,    unit: "°C",  name: "Cooling Return Air Temperature" },
    "smartrack_log_cooling_supply_temp":  { base: 18.5, amplitude: 2,    unit: "°C",  name: "Cooling Supply Air Temperature 1" },
    "smartrack_log_cooling_suction_p":    { base: 8.2,  amplitude: 0.8,  unit: "bar", name: "Cooling Suction Pressure" },
    "smartrack_log_cooling_exhaust_p":    { base: 22.0, amplitude: 1.5,  unit: "bar", name: "Cooling Exhaust Pressure" },
    // Vibration
    "smartrack_log_vib_x":                { base: 0.02, amplitude: 0.01, unit: "g",   name: "Vibration Axis X" },
    "smartrack_log_vib_y":                { base: 0.01, amplitude: 0.01, unit: "g",   name: "Vibration Axis Y" },
    "smartrack_log_vib_z":                { base: 0.98, amplitude: 0.02, unit: "g",   name: "Vibration Axis Z" },
    // Humidity
    "smartrack_log_temphum1_hum":         { base: 49.5, amplitude: 4,    unit: "%",   name: "Nexabrick Temp Hum 1 - Humidity" },
    "smartrack_log_temphum2_hum":         { base: 51.2, amplitude: 4,    unit: "%",   name: "Nexabrick Temp Hum 2 - Humidity" },
    // UPS & PDU
    "smartrack_log_ups_load":             { base: 48.0, amplitude: 8,    unit: "%",   name: "UPS Load Percentage" },
    "smartrack_chart_rpdu_output_current_1": { base: 8.7, amplitude: 1.2, unit: "A",  name: "RPDU Output Current 1" },
    // PUE & Power Analyzer
    "smartrack_pue_value_log":            { base: 1.42, amplitude: 0.08, unit: "",    name: "Smartrack PUE Value" },
    "smartrack_poweranalyzer_load_log":   { base: 48.0, amplitude: 8,    unit: "%",   name: "Smartrack IT Load %" },
    // Billing
    "smartrack_bill_energy_kwh":          { base: 1842, amplitude: 200,  unit: "kWh", name: "Smartrack Bill Energy kWh" },
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
    case "smartrack/cooling/1":
      return { Air_Return_Temperature: vary(26.4, 0.02), Air_Outlet_Temperature: vary(18.2, 0.02), Air_Return_Humidity: vary(51.2, 0.03), ON_OFF_UNIT: 1, Operation_Mode: "COOL", Suction_Pressure: vary(8.4, 0.03), Exhaust_Pressure: vary(22.1, 0.02) };
    case "smartrack/rackpdu/1":
      return { output_current: vary(8.7, 0.03), output_voltage: vary(220.4, 0.01), output_power: vary(1914, 0.03), outlet1: 1, outlet2: 1, outlet3: 1, outlet4: 1 };
    case "smartrack/ups/1":
      return { battery_capacity: vary(97, 0.01), battery_runtime_remaining: vary(3840, 0.02), battery_voltage: vary(54.2, 0.01), battery_current: vary(2.1, 0.05), battery_health: 98, battery_temperature: vary(28, 0.02), input_voltage: vary(220.1, 0.005), input_frequency: vary(50.01, 0.002), input_bypass_voltage: vary(220.0, 0.005), input_bypass_frequency: vary(50.0, 0.002), output_voltage: vary(220.0, 0.005), output_current: vary(7.2, 0.04), output_frequency: vary(50.0, 0.002), output_load: vary(48, 0.06), output_active_power: vary(1584, 0.04), output_apparent_power: vary(1650, 0.04), output_status: "ONLINE", state_total_time_on_normal: 86400, state_alarm_status: 0 };
    case "smartrack/vibration/1":
      return { activity: 0, vibration_x: vary(0.02, 0.1), vibration_y: vary(0.01, 0.1), vibration_z: vary(0.98, 0.01) };
    case "smartrack/temphum/1":
      return { temp: vary(24.1, 0.02), hum: vary(49.5, 0.03) };
    case "smartrack/temphum/2":
      return { temp: vary(22.8, 0.02), hum: vary(51.2, 0.03) };
    case "smartrack/pue/1":
      return { pue: vary(1.42, 0.02), it_load: vary(3460, 0.03), total_facility: vary(4913, 0.02), it_load_percent: vary(48, 0.05) };
    case "smartrack/poweranalyzer/1":
      return { it_load_percent: vary(48.2, 0.05), total_power_kw: vary(3.46, 0.03), efficiency: vary(0.97, 0.01) };
    case "smartrack/bill/rpdu/1":
      return { energy_kwh: vary(1842.5, 0.001), cost: vary(2763750, 0.001), carbon_kg: vary(1473.6, 0.001) };
    default:
      return { value: vary(100, 0.1) };
  }
}
