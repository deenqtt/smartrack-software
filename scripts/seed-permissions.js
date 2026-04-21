const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedPermissions() {
  try {
    // Define permissions needed for admin-only operations
    const permissions = [
      // System Configuration permissions
      { name: 'System Config - Read', resource: 'system-config', action: 'read' },
      { name: 'System Config - Create', resource: 'system-config', action: 'create' },
      { name: 'System Config - Update', resource: 'system-config', action: 'update' },
      { name: 'System Config - Delete', resource: 'system-config', action: 'delete' },

      // Backup permissions
      { name: 'Backup - Read', resource: 'backup', action: 'read' },
      { name: 'Backup - Create', resource: 'backup', action: 'create' },
      { name: 'Backup - Delete', resource: 'backup', action: 'delete' },

      // User management permissions
      { name: 'Users - Create', resource: 'users', action: 'create' },
      { name: 'Users - Read', resource: 'users', action: 'read' },
      { name: 'Users - Update', resource: 'users', action: 'update' },
      { name: 'Users - Delete', resource: 'users', action: 'delete' },

      // Role management permissions
      { name: 'Roles - Read', resource: 'roles', action: 'read' },
      { name: 'Roles - Create', resource: 'roles', action: 'create' },
      { name: 'Roles - Update', resource: 'roles', action: 'update' },
      { name: 'Roles - Delete', resource: 'roles', action: 'delete' },

      // Menu permissions
      { name: 'Menu - Read', resource: 'menu', action: 'read' },
      { name: 'Menu - Create', resource: 'menu', action: 'create' },
      { name: 'Menu - Update', resource: 'menu', action: 'update' },
      { name: 'Menu - Delete', resource: 'menu', action: 'delete' },

      // Device permissions
      { name: 'Devices - Read', resource: 'devices', action: 'read' },
      { name: 'Devices - Create', resource: 'devices', action: 'create' },
      { name: 'Devices - Update', resource: 'devices', action: 'update' },
      { name: 'Devices - Delete', resource: 'devices', action: 'delete' },

      // Services permissions
      { name: 'Services - Read', resource: 'services', action: 'read' },
      { name: 'Services - Update', resource: 'services', action: 'update' },

      // Control permissions
      { name: 'Control - Read', resource: 'control', action: 'read' },
      { name: 'Control - Create', resource: 'control', action: 'create' },
      { name: 'Control - Update', resource: 'control', action: 'update' },
      { name: 'Control - Delete', resource: 'control', action: 'delete' },


      // Maintenance permissions
      { name: 'Maintenance - Read', resource: 'maintenance', action: 'read' },
      { name: 'Maintenance - Create', resource: 'maintenance', action: 'create' },
      { name: 'Maintenance - Update', resource: 'maintenance', action: 'update' },
      { name: 'Maintenance - Delete', resource: 'maintenance', action: 'delete' },

      // Clients permissions
      { name: 'Clients - Read', resource: 'clients', action: 'read' },
      { name: 'Clients - Create', resource: 'clients', action: 'create' },
      { name: 'Clients - Update', resource: 'clients', action: 'update' },
      { name: 'Clients - Delete', resource: 'clients', action: 'delete' },

      // Missing permissions that are checked in backend but not seeded
      { name: 'Notifications - Read', resource: 'notification-history', action: 'read' },
      { name: 'Notifications - Update', resource: 'notification-history', action: 'update' },
      { name: 'Notifications - Delete', resource: 'notification-history', action: 'delete' },
      { name: 'Notifications - Create', resource: 'notification-history', action: 'create' },

      { name: 'Historical Data - Read', resource: 'historical-data', action: 'read' },

      { name: 'Network Info - Read', resource: 'network-info', action: 'read' },

      { name: 'Energy Targets - Read', resource: 'energy-targets', action: 'read' },
      { name: 'Energy Targets - Create', resource: 'energy-targets', action: 'create' },

      { name: 'Dashboard Management - Read', resource: 'dashboard-management', action: 'read' },
      { name: 'Dashboard Management - Create', resource: 'dashboard-management', action: 'create' },
      { name: 'Dashboard Management - Update', resource: 'dashboard-management', action: 'update' },
      { name: 'Dashboard Management - Delete', resource: 'dashboard-management', action: 'delete' },



      { name: 'Layout2D - Read', resource: 'dashboard-layout2d', action: 'read' },
      { name: 'Layout2D - Create', resource: 'dashboard-layout2d', action: 'create' },
      { name: 'Layout2D - Update', resource: 'dashboard-layout2d', action: 'update' },
      { name: 'Layout2D - Delete', resource: 'dashboard-layout2d', action: 'delete' },

      { name: 'Network - Update', resource: 'network', action: 'update' },

      { name: 'Gateway Locations - Read', resource: 'gateway-locations', action: 'read' },
      { name: 'Gateway Locations - Create', resource: 'gateway-locations', action: 'create' },
      { name: 'Gateway Locations - Update', resource: 'gateway-locations', action: 'update' },
      { name: 'Gateway Locations - Delete', resource: 'gateway-locations', action: 'delete' },

      // REMOVED: ZKTeco permissions removed as part of ZKTeco feature elimination

      { name: 'Racks - Read', resource: 'racks', action: 'read' },
      { name: 'Racks - Create', resource: 'racks', action: 'create' },

      { name: 'MQTT Topics - Read', resource: 'mqtt-topics', action: 'read' },

      { name: 'Bill Logs - Read', resource: 'bill-logs', action: 'read' },

      { name: 'Cron Management - Read', resource: 'cron-management', action: 'read' },
      { name: 'Cron Management - Update', resource: 'cron-management', action: 'update' },

      // MQTT Config permissions
      { name: 'MQTT Config - Read', resource: 'mqtt-config', action: 'read' },
      { name: 'MQTT Config - Create', resource: 'mqtt-config', action: 'create' },
      { name: 'MQTT Config - Update', resource: 'mqtt-config', action: 'update' },
      { name: 'MQTT Config - Delete', resource: 'mqtt-config', action: 'delete' },

      // Alarms permissions
      { name: 'Alarms - Read', resource: 'alarms', action: 'read' },
      { name: 'Alarms - Update', resource: 'alarms', action: 'update' },
      { name: 'Alarms - Delete', resource: 'alarms', action: 'delete' },
    ];

    const createdPermissions = {};
    let permissionCount = 0;

    for (const permission of permissions) {
      try {
        const created = await prisma.permission.upsert({
          where: {
            resource_action: {
              resource: permission.resource,
              action: permission.action
            }
          },
          update: {},
          create: permission,
        });
        createdPermissions[`${permission.resource}:${permission.action}`] = created;
        permissionCount++;
      } catch (error) {
        // Try to fetch existing permission
        try {
          const existing = await prisma.permission.findUnique({
            where: {
              resource_action: {
                resource: permission.resource,
                action: permission.action
              }
            }
          });
          if (existing) {
            createdPermissions[`${permission.resource}:${permission.action}`] = existing;
            permissionCount++;
          }
        } catch (fetchError) {
          // Continue with next permission
        }
      }
    }

    // Get ADMIN role
    const adminRole = await prisma.role.findUnique({
      where: { name: 'ADMIN' },
      include: { permissions: true }
    });

    if (!adminRole) {
      throw new Error('ADMIN role not found. Please run user seeding first.');
    }

    // Assign all permissions to ADMIN role
    let assignmentCount = 0;

    for (const [key, permission] of Object.entries(createdPermissions)) {
      try {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: adminRole.id,
              permissionId: permission.id
            }
          },
          update: {},
          create: {
            roleId: adminRole.id,
            permissionId: permission.id
          }
        });
        assignmentCount++;
      } catch (error) {
        // Permission might already be assigned
      }
    }

    // Get USER role
    let userRole = await prisma.role.findUnique({
      where: { name: 'USER' }
    });

    if (userRole) {
      // Assign specific read permissions to USER role
      const userPermissions = [
        'gateway-locations:read',
        'dashboard-management:read',
        'dashboard-management:create',
        'dashboard-management:update',
        'dashboard-management:delete',
        'devices:read',
        'racks:read',
        'historical-data:read',
        'notification-history:read',
        'alarms:read'
      ];
      for (const permKey of userPermissions) {
        const permission = createdPermissions[permKey];
        if (permission) {
          try {
            await prisma.rolePermission.upsert({
              where: {
                roleId_permissionId: {
                  roleId: userRole.id,
                  permissionId: permission.id
                }
              },
              update: {},
              create: {
                roleId: userRole.id,
                permissionId: permission.id
              }
            });
            console.log(`   ✅ Assigned ${permKey} to USER role`);
          } catch (error) {
            // Already assigned
          }
        }
      }
    }

    console.log(`✅ SUCCESS: ${permissionCount} permissions created/found, ${assignmentCount} assigned to ADMIN`);

  } catch (error) {
    console.log(`❌ FAILED: Permission seeding error - ${error.message}`);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedPermissions,
  default: seedPermissions
};

// Run if called directly
if (require.main === module) {
  seedPermissions()
    .then(() => {
      console.log('🔐 Permission seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Permission seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
