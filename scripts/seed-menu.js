const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Menu Item ID Constants (Explicit String IDs) - UPDATED FOR SMART RACK ONLY
const MENU_ITEM_IDS = {
  // Dashboard Group
  DASHBOARD_OVERVIEW: 'menu-item-dashboard-overview',
  DASHBOARD_LAYOUT2D: 'menu-item-dashboard-layout2d',
  DASHBOARD_MANAGE: 'menu-item-dashboard-manage',
  DASHBOARD_EDITOR: 'menu-item-dashboard-editor',
  DASHBOARD_VIEW: 'menu-item-dashboard-view',
  LAYOUT_MANAGE: 'menu-item-layout-manage',

  // Infrastructure Group
  RACKS_MANAGEMENT: 'menu-item-racks-management',
  RACK_MONITOR: 'menu-item-rack-monitor',

  // Devices Group
  DEVICES_INTERNAL: 'menu-item-devices-internal',
  DEVICES_EXTERNAL: 'menu-item-devices-external',
  DEVICES_ACCESS_CONTROLLERS: 'menu-item-devices-access-controllers',
  DEVICES_LIBRARY: 'menu-item-devices-library',
  DEVICES_DEVICE_CATALOG: 'menu-item-devices-device-catalog',
  LOGGING_CONFIGS: 'menu-item-logging-configs',

  // Network Group
  NETWORK_MQTT_BROKER: 'menu-item-network-mqtt-broker',
  NETWORK_MQTT_MANAGEMENT: 'menu-item-network-mqtt-management',
  NETWORK_COMMUNICATION_SETUP: 'menu-item-network-communication-setup',
  NETWORK_SETTINGS: 'menu-item-network-settings',
  NETWORK_PAYLOAD_DISCOVER: 'menu-item-network-payload-discover',
  NETWORK_PROTOCOL_CONFIG: 'menu-item-network-protocol-config',
  // Legacy network menu entries removed: IP Address Pools, IP Allocations

  // Monitoring Group
  SYSTEM_MONITORING: 'menu-item-system-monitoring',
  POWER_ANALYZER: 'menu-item-power-analyzer',

  // Report/Analytics Group
  REPORT_ALARM_LOG_REPORTS: 'menu-item-report-alarm-log-reports',
  REPORT_DEVICES_LOG_REPORT: 'menu-item-report-devices-log-report',
  REPORT_NOTIFICATION_HISTORY: 'menu-item-report-notification-history',

  // Security Group
  SECURITY_ALARM_MANAGEMENT: 'menu-item-security-alarm-management',

  // Layout Management
  LAYOUT_OVERVIEW: 'menu-item-layout-overview',

  // Rule Management
  MANAGE_RULE_CHAINS: 'menu-item-manage-rule-chains',

  // System Config Group
  SYSTEM_USER_MANAGEMENT: 'menu-item-system-user-management',
  SYSTEM_BACKUP_MANAGEMENT: 'menu-item-system-backup-management',
  SYSTEM_OTA_MANAGEMENT: 'menu-item-system-ota-management',
  SYSTEM_GENERAL_CONFIG: 'menu-item-system-general-config',
  MANAGE_MENU: 'menu-item-manage-menu',

  // Maintenance Group
  MAINTENANCE_SCHEDULE_MANAGEMENT: 'menu-item-maintenance-schedule-management',
  MAINTENANCE_REPORT: 'menu-item-maintenance-report',

  // System Info Group
  SYSTEM_INFORMATION: 'menu-item-system-information',

  // AI Assistant
  AI_INSIGHTS: 'menu-item-ai-insights',
};

// Menu Group ID Constants (Explicit String IDs)
const MENU_GROUP_IDS = {
  DASHBOARD: 'menu-group-dashboard',
  INFRASTRUCTURE: 'menu-group-infrastructure',
  DEVICES: 'menu-group-devices',
  NETWORK: 'menu-group-network',
  MONITORING: 'menu-group-monitoring',
  ANALYTICS: 'menu-group-analytics',
  SECURITY: 'menu-group-security',
  MAINTENANCE: 'menu-group-maintenance',
  SYSTEM_CONFIG: 'menu-group-system-config',
  SYSTEM_INFO: 'menu-group-system-info',
  CONTROL: 'menu-group-control',
};

async function cleanupMenu() {
  console.log('🧹 Cleaning up menu data...');
  try {
    await prisma.roleMenuPermission.deleteMany();
    await prisma.menuItem.deleteMany();
    await prisma.menuGroup.deleteMany();
    console.log('   ✅ Menu cleanup completed');
  } catch (error) {
    console.error('❌ Error cleaning up menu:', error);
    throw error;
  }
}

// Items that are ADMIN/DEVELOPER only — hidden from USER even if isDeveloper: false
const ADMIN_ONLY_ITEMS = new Set([
  'system-user-management',   // User Management
  'system-general-config',    // General Config
  'system-ota-management',    // OTA Management
]);

async function seedMenu() {
  console.log('📋 Seeding menu system...');
  try {
    // Roles — upsert agar tidak crash kalau belum ada
    const roleData = [
      { name: 'ADMIN',     description: 'Administrator with full system access' },
      { name: 'USER',      description: 'Regular user with limited access' },
      { name: 'DEVELOPER', description: 'Developer with advanced access' },
    ];
    for (const r of roleData) {
      await prisma.role.upsert({ where: { name: r.name }, update: {}, create: r });
    }

    let adminRole     = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
    let userRole      = await prisma.role.findUnique({ where: { name: 'USER' } });
    let developerRole = await prisma.role.findUnique({ where: { name: 'DEVELOPER' } });

    // Menu Groups
    const menuGroups = [
      { id: MENU_GROUP_IDS.DASHBOARD, name: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard', order: 0, isActive: true },
      { id: MENU_GROUP_IDS.INFRASTRUCTURE, name: 'infrastructure', label: 'Infrastructure', icon: 'Server', order: 1, isActive: true },
      { id: MENU_GROUP_IDS.DEVICES, name: 'devices', label: 'Devices', icon: 'Cpu', order: 2, isActive: true },
      { id: MENU_GROUP_IDS.NETWORK, name: 'network', label: 'Network', icon: 'Network', order: 3, isActive: true },
      { id: MENU_GROUP_IDS.CONTROL, name: 'control', label: 'Automation', icon: 'Sliders', order: 4, isActive: true },
      { id: MENU_GROUP_IDS.MONITORING, name: 'monitoring', label: 'Monitoring', icon: 'Activity', order: 5, isActive: true },
      { id: MENU_GROUP_IDS.ANALYTICS, name: 'analytics', label: 'Reports', icon: 'BarChart3', order: 6, isActive: true },
      { id: MENU_GROUP_IDS.SECURITY, name: 'security', label: 'Security', icon: 'Shield', order: 7, isActive: true },
      { id: MENU_GROUP_IDS.MAINTENANCE, name: 'maintenance', label: 'Maintenance', icon: 'Wrench', order: 8, isActive: true },
      { id: MENU_GROUP_IDS.SYSTEM_CONFIG, name: 'system_config', label: 'System Config', icon: 'ServerCog', order: 9, isActive: true },
      { id: MENU_GROUP_IDS.SYSTEM_INFO, name: 'system_info', label: 'System Info', icon: 'Info', order: 10, isActive: true },
    ];

    const createdMenuGroups = {};
    for (const group of menuGroups) {
      createdMenuGroups[group.name] = await prisma.menuGroup.upsert({
        where: { id: group.id },
        update: group,
        create: group,
      });
    }

    // Menu Items
    const menuItems = [
      // Dashboard
      { id: MENU_ITEM_IDS.DASHBOARD_OVERVIEW, name: 'dashboard-overview', label: 'Dashboard', path: '/', icon: 'LayoutDashboard', order: 0, groupName: 'dashboard', isActive: true, isDeveloper: false },

      // Infrastructure
      { id: MENU_ITEM_IDS.RACKS_MANAGEMENT, name: 'racks-management', label: 'Rack Management', path: '/infrastructure/racks', icon: 'Archive', order: 0, groupName: 'infrastructure', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.RACK_MONITOR, name: 'rack-monitor', label: 'Rack Monitor 2D', path: '/infrastructure/rack-monitor', icon: 'LayoutGrid', order: 1, groupName: 'infrastructure', isActive: true, isDeveloper: false },

      // Devices
      { id: MENU_ITEM_IDS.DEVICES_INTERNAL, name: 'devices-internal', label: 'Internal Devices', path: '/devices/devices-internal', icon: 'Server', order: 0, groupName: 'devices', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.DEVICES_EXTERNAL, name: 'devices-external', label: 'External Devices', path: '/devices/devices-external', icon: 'Globe', order: 1, groupName: 'devices', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.DEVICES_ACCESS_CONTROLLERS, name: 'devices-access-controllers', label: 'Access Controllers', path: '/devices/access-controllers', icon: 'KeyRound', order: 2, groupName: 'devices', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.DEVICES_LIBRARY, name: 'devices-library', label: 'Device Library', path: '/devices/library', icon: 'Library', order: 3, groupName: 'devices', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.DEVICES_DEVICE_CATALOG, name: 'devices-device-catalog', label: 'Device Catalog', path: '/devices/device-catalog', icon: 'Blocks', order: 4, groupName: 'devices', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.LOGGING_CONFIGS, name: 'logging-configs', label: 'Log Sources', path: '/devices/devices-for-logging', icon: 'Database', order: 5, groupName: 'devices', isActive: true, isDeveloper: false },

      // Network
      { id: MENU_ITEM_IDS.NETWORK_MQTT_BROKER, name: 'network-mqtt-broker', label: 'Local MQTT Broker', path: '/network/mqtt-broker', icon: 'Radio', order: 0, groupName: 'network', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.NETWORK_MQTT_MANAGEMENT, name: 'network-mqtt-management', label: 'Remote MQTT Broker', path: '/network/mqtt-config', icon: 'Settings', order: 1, groupName: 'network', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.NETWORK_COMMUNICATION_SETUP, name: 'network-communication-setup', label: 'Network Out', path: '/network/communication-setup', icon: 'Waves', order: 2, groupName: 'network', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.NETWORK_SETTINGS, name: 'network-settings', label: 'Network In', path: '/network/network-settings', icon: 'Settings', order: 3, groupName: 'network', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.NETWORK_PROTOCOL_CONFIG, name: 'network-protocol-config', label: 'Protocol Config', path: '/network/protocol-config', icon: 'Cog', order: 4, groupName: 'network', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.NETWORK_PAYLOAD_DISCOVER, name: 'network-payload-discover', label: 'Payload Discover', path: '/network/payload/discover', icon: 'Search', order: 5, groupName: 'network', isActive: true, isDeveloper: false },

      // Automation
      { id: MENU_ITEM_IDS.MANAGE_RULE_CHAINS, name: 'manage-rule-chains', label: 'Automation Rules', path: '/manage-rule-chains', icon: 'GitBranch', order: 0, groupName: 'control', isActive: true, isDeveloper: true },

      // Monitoring
      { id: MENU_ITEM_IDS.SYSTEM_MONITORING, name: 'system-monitoring', label: 'System Performance', path: '/system-config/system-monitoring', icon: 'Activity', order: 0, groupName: 'monitoring', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.POWER_ANALYZER, name: 'power-analyzer', label: 'Power Analysis', path: '/system-config/power-analyzer', icon: 'Zap', order: 1, groupName: 'monitoring', isActive: true, isDeveloper: false },

      // Reports
      { id: MENU_ITEM_IDS.REPORT_ALARM_LOG_REPORTS, name: 'report-alarm-log-reports', label: 'Alarm Reports', path: '/report/alarm-log-reports', icon: 'FileBarChart', order: 0, groupName: 'analytics', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.REPORT_DEVICES_LOG_REPORT, name: 'report-devices-log-report', label: 'Device Reports', path: '/report/devices-log-report', icon: 'BarChart', order: 1, groupName: 'analytics', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.REPORT_NOTIFICATION_HISTORY, name: 'report-notification-history', label: 'Notification Reports', path: '/report/notification-history', icon: 'Bell', order: 2, groupName: 'analytics', isActive: true, isDeveloper: false },

      // Security
      { id: MENU_ITEM_IDS.SECURITY_ALARM_MANAGEMENT, name: 'security-alarm-management', label: 'Alarm Management', path: '/security/alarm-management', icon: 'AlertTriangle', order: 0, groupName: 'security', isActive: true, isDeveloper: false },

      // Maintenance
      { id: MENU_ITEM_IDS.MAINTENANCE_SCHEDULE_MANAGEMENT, name: 'maintenance-schedule-management', label: 'Maintenance Schedule', path: '/maintenance/schedule-management', icon: 'Wrench', order: 0, groupName: 'maintenance', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.MAINTENANCE_REPORT, name: 'maintenance-report', label: 'Maintenance Report', path: '/maintenance/report', icon: 'FileBarChart', order: 1, groupName: 'maintenance', isActive: true, isDeveloper: false },

      // System Config
      { id: MENU_ITEM_IDS.SYSTEM_USER_MANAGEMENT, name: 'system-user-management', label: 'User Management', path: '/system-config/user-management', icon: 'Users', order: 0, groupName: 'system_config', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.SYSTEM_BACKUP_MANAGEMENT, name: 'system-backup-management', label: 'Backup Management', path: '/backup-management', icon: 'HardDrive', order: 2, groupName: 'system_config', isActive: true, isDeveloper: true },
      { id: MENU_ITEM_IDS.SYSTEM_OTA_MANAGEMENT, name: 'system-ota-management', label: 'OTA Management', path: '/system-config/ota', icon: 'Download', order: 3, groupName: 'system_config', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.SYSTEM_GENERAL_CONFIG, name: 'system-general-config', label: 'General Config', path: '/system-config/general-config', icon: 'Settings', order: 4, groupName: 'system_config', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.MANAGE_MENU, name: 'manage-menu', label: 'Manage Menu', path: '/system-config/manage-menu', icon: 'Menu', order: 6, groupName: 'system_config', isActive: true, isDeveloper: true },

      // System Info
      { id: MENU_ITEM_IDS.SYSTEM_INFORMATION, name: 'system-information', label: 'System Information', path: '/info', icon: 'Info', order: 0, groupName: 'system_info', isActive: true, isDeveloper: false },
      { id: MENU_ITEM_IDS.AI_INSIGHTS, name: 'ai-insights', label: 'AI Assistant', path: '/ai-insights', icon: 'Sparkles', order: 1, groupName: 'system_info', isActive: true, isDeveloper: false },
    ];

    for (const item of menuItems) {
      const menuGroupId = createdMenuGroups[item.groupName].id;
      const menuItem = await prisma.menuItem.upsert({
        where: { id: item.id },
        update: { ...item, groupName: undefined, menuGroupId },
        create: { ...item, groupName: undefined, menuGroupId },
      });

      const userCanView = !item.isDeveloper && !ADMIN_ONLY_ITEMS.has(item.name);

      // Admin permissions
      await prisma.roleMenuPermission.upsert({
        where: { roleId_menuItemId: { roleId: adminRole.id, menuItemId: menuItem.id } },
        update: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        create: { roleId: adminRole.id, menuItemId: menuItem.id, canView: true, canCreate: true, canUpdate: true, canDelete: true },
      });

      // User permissions — view-only for operational items, hidden for admin-only & developer items
      await prisma.roleMenuPermission.upsert({
        where: { roleId_menuItemId: { roleId: userRole.id, menuItemId: menuItem.id } },
        update: { canView: userCanView, canCreate: false, canUpdate: false, canDelete: false },
        create: { roleId: userRole.id, menuItemId: menuItem.id, canView: userCanView, canCreate: false, canUpdate: false, canDelete: false },
      });

      // Developer permissions
      await prisma.roleMenuPermission.upsert({
        where: { roleId_menuItemId: { roleId: developerRole.id, menuItemId: menuItem.id } },
        update: { canView: true, canCreate: true, canUpdate: true, canDelete: true },
        create: { roleId: developerRole.id, menuItemId: menuItem.id, canView: true, canCreate: true, canUpdate: true, canDelete: true },
      });
    }

    console.log('✅ Menu system seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    throw error;
  }
}

async function main() {
  await cleanupMenu();
  await seedMenu();
  await prisma.$disconnect();
}

module.exports = {
  seedMenu,
  cleanupMenu
};

if (require.main === module) {
  main();
}
