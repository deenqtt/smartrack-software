const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...');
  console.log('⚠️  WARNING: This will delete ALL data from the database!');
  console.log('');

  try {
    // Delete in order to respect foreign key constraints
    // Start with tables that have foreign keys (child tables), then parent tables

    console.log('🧹 Clearing MQTT related data...');

    // MQTT logs and history (no dependencies)
    const mqttMessageLogCount = await prisma.mqttMessageLog.deleteMany();
    console.log(`   - Deleted ${mqttMessageLogCount.count} MQTT message logs`);

    const mqttConnectionHistoryCount = await prisma.mqttConnectionHistory.deleteMany();
    console.log(`   - Deleted ${mqttConnectionHistoryCount.count} MQTT connection history entries`);

    const mqttTopicSubscriptionCount = await prisma.mqttTopicSubscription.deleteMany();
    console.log(`   - Deleted ${mqttTopicSubscriptionCount.count} MQTT topic subscriptions`);

    // MQTT configurations
    const mqttConfigCount = await prisma.mqttConfiguration.deleteMany();
    console.log(`   - Deleted ${mqttConfigCount.count} MQTT configurations`);

    console.log('🧹 Clearing logging and monitoring data...');

    // Logging data (has foreign keys)
    const loggedDataCount = await prisma.loggedData.deleteMany();
    console.log(`   - Deleted ${loggedDataCount.count} logged data entries`);

    const loggingConfigCount = await prisma.loggingConfiguration.deleteMany();
    console.log(`   - Deleted ${loggingConfigCount.count} logging configurations`);

    // Bill logs
    const billLogCount = await prisma.billLog.deleteMany();
    console.log(`   - Deleted ${billLogCount.count} bill logs`);

    const billConfigCount = await prisma.billConfiguration.deleteMany();
    console.log(`   - Deleted ${billConfigCount.count} bill configurations`);

    // Alarm logs and configs
    const alarmLogCount = await prisma.alarmLog.deleteMany();
    console.log(`   - Deleted ${alarmLogCount.count} alarm logs`);

    const alarmBitConfigCount = await prisma.alarmBitConfiguration.deleteMany();
    console.log(`   - Deleted ${alarmBitConfigCount.count} alarm bit configurations`);

    const alarmConfigCount = await prisma.alarmConfiguration.deleteMany();
    console.log(`   - Deleted ${alarmConfigCount.count} alarm configurations`);

    // Notification recipients
    const notificationRecipientCount = await prisma.alarmNotificationRecipient.deleteMany();
    console.log(`   - Deleted ${notificationRecipientCount.count} alarm notification recipients`);

    console.log('🧹 Clearing device and sensor data...');

    // Lora data
    const deviceDataCount = await prisma.deviceData.deleteMany();
    console.log(`   - Deleted ${deviceDataCount.count} LoRa device data entries`);

    const loraDeviceCount = await prisma.loraDevice.deleteMany();
    console.log(`   - Deleted ${loraDeviceCount.count} LoRa devices`);


    console.log('🧹 Clearing layout and visualization data...');

    // Layout data (delete in reverse dependency order)
    const layout2DFlowIndicatorCount = await prisma.layout2DFlowIndicator.deleteMany();
    console.log(`   - Deleted ${layout2DFlowIndicatorCount.count} 2D layout flow indicators`);

    const layout2DDataPointCount = await prisma.layout2DDataPoint.deleteMany();
    console.log(`   - Deleted ${layout2DDataPointCount.count} 2D layout data points`);

    const layout2DCount = await prisma.layout2D.deleteMany();
    console.log(`   - Deleted ${layout2DCount.count} 2D layouts`);

    // Dashboard layouts
    const containerRackCount = await prisma.containerRack.deleteMany();
    console.log(`   - Deleted ${containerRackCount.count} container racks`);

    const container3dWidgetCount = await prisma.container3dWidgetConfig.deleteMany();
    console.log(`   - Deleted ${container3dWidgetCount.count} 3D container widgets`);

    const dashboardLayoutCount = await prisma.dashboardLayout.deleteMany();
    console.log(`   - Deleted ${dashboardLayoutCount.count} dashboard layouts`);

    console.log('🧹 Clearing gateway and location data...');

    // Gateway location MQTT payloads (child table)
    const gatewayLocationMqttPayloadCount = await prisma.gatewayLocationMqttPayload.deleteMany();
    console.log(`   - Deleted ${gatewayLocationMqttPayloadCount.count} gateway location MQTT payloads`);

    // Gateway locations (has foreign keys to client and dashboard)
    const gatewayLocationCount = await prisma.gatewayLocation.deleteMany();
    console.log(`   - Deleted ${gatewayLocationCount.count} gateway locations`);

    // Gateway dashboards (referenced by gateway locations)
    const gatewayDashboardCount = await prisma.gatewayDashboard.deleteMany();
    console.log(`   - Deleted ${gatewayDashboardCount.count} gateway dashboards`);

    console.log('🧹 Clearing system and configuration data...');

    // System configurations
    const systemConfigCount = await prisma.systemConfiguration.deleteMany();
    console.log(`   - Deleted ${systemConfigCount.count} system configurations`);

    // Menu constants (no more presets)

    // Modbus RTU configs
    const modbusConfigCount = await prisma.modbusRTUConfig.deleteMany();
    console.log(`   - Deleted ${modbusConfigCount.count} Modbus RTU configurations`);

    // Backup schedules (delete in reverse dependency order)
    const backupExecutionCount = await prisma.backupScheduleExecution.deleteMany();
    console.log(`   - Deleted ${backupExecutionCount.count} backup schedule executions`);

    const backupScheduleCount = await prisma.backupSchedule.deleteMany();
    console.log(`   - Deleted ${backupScheduleCount.count} backup schedules`);

    // Energy targets
    const energyTargetCount = await prisma.energyTarget.deleteMany();
    console.log(`   - Deleted ${energyTargetCount.count} energy targets`);

    console.log('🧹 Clearing access control and user data...');

    // Access controllers and logs
    const activityLogCount = await prisma.activityLog.deleteMany();
    console.log(`   - Deleted ${activityLogCount.count} activity logs`);

    const accessControllerCount = await prisma.accessController.deleteMany();
    console.log(`   - Deleted ${accessControllerCount.count} access controllers`);

    // LoRa gateways
    const gatewayStatsCount = await prisma.gatewayStats.deleteMany();
    console.log(`   - Deleted ${gatewayStatsCount.count} gateway stats`);

    const loraGatewayCount = await prisma.loraGateway.deleteMany();
    console.log(`   - Deleted ${loraGatewayCount.count} LoRa gateways`);

    console.log('🧹 Clearing rule chains and maintenance data...');

    // Rule chains (has foreign key to user)
    const ruleChainCount = await prisma.ruleChain.deleteMany();
    console.log(`   - Deleted ${ruleChainCount.count} rule chains`);

    // Maintenance tasks (has foreign keys)
    const maintenanceCount = await prisma.maintenance.deleteMany();
    console.log(`   - Deleted ${maintenanceCount.count} maintenance tasks`);

    console.log('🧹 Clearing device and rack data...');

    // Devices and racks (devices have foreign key to rack)
    const deviceExternalCount = await prisma.deviceExternal.deleteMany();
    console.log(`   - Deleted ${deviceExternalCount.count} external devices`);

    const rackCount = await prisma.rack.deleteMany();
    console.log(`   - Deleted ${rackCount.count} racks`);

    console.log('🧹 Clearing user and permission data...');

    // User data (notifications have foreign key to user)
    const notificationCount = await prisma.notification.deleteMany();
    console.log(`   - Deleted ${notificationCount.count} notifications`);

    // Role and permission data (delete in reverse dependency order)
    const rolePermissionCount = await prisma.rolePermission.deleteMany();
    console.log(`   - Deleted ${rolePermissionCount.count} role permissions`);

    const roleMenuPermissionCount = await prisma.roleMenuPermission.deleteMany();
    console.log(`   - Deleted ${roleMenuPermissionCount.count} role menu permissions`);

    const permissionCount = await prisma.permission.deleteMany();
    console.log(`   - Deleted ${permissionCount.count} permissions`);

    // Menu items and groups (roleMenuPermissions reference menuItem)
    const menuItemCount = await prisma.menuItem.deleteMany();
    console.log(`   - Deleted ${menuItemCount.count} menu items`);

    const menuGroupCount = await prisma.menuGroup.deleteMany();
    console.log(`   - Deleted ${menuGroupCount.count} menu groups`);

    // Users (has foreign keys to role, menuPreset)
    const userCount = await prisma.user.deleteMany();
    console.log(`   - Deleted ${userCount.count} users`);

    // Roles (referenced by users and rolePermissions)
    const roleCount = await prisma.role.deleteMany();
    console.log(`   - Deleted ${roleCount.count} roles`);

    // Clients (referenced by gatewayLocations)
    const clientCount = await prisma.client.deleteMany();
    console.log(`   - Deleted ${clientCount.count} clients`);

    console.log('');
    console.log('✅ Database cleanup completed successfully!');
    console.log('ℹ️  All data has been deleted. The database is now empty.');
    console.log('🔄 You can now run seed scripts to populate fresh data.');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  // Confirmation prompt
  console.log('🚨 DANGER ZONE 🚨');
  console.log('This script will DELETE ALL DATA from the Smartrack database!');
  console.log('This action CANNOT be undone!');
  console.log('');
  console.log('Make sure you have backups if you need to restore data.');
  console.log('');

  // In a real scenario, you'd want user confirmation here
  // For now, we'll proceed automatically since this is a development script

  await clearDatabase();
}

// Export for use in other scripts
module.exports = {
  clearDatabase,
  default: clearDatabase
};

// Run if called directly
if (require.main === module) {
  main()
    .catch((e) => {
      console.error('Script failed:', e);
      process.exit(1);
    });
}
