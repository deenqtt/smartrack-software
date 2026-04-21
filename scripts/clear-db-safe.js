const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clearDatabase() {
    console.log('🚀 Starting safe database cleanup (keeping Users and Menu structures)...');

    const modelsToClear = [
        'loggedData',
        'loggingConfiguration',
        'manualLoggedData',
        'alarmLog',
        'alarmBitConfiguration',
        'alarmNotificationRecipient',
        'alarmConfiguration',
        'billLog',
        'billConfiguration',
        'maintenance',
        'deviceExternal',
        'rack',
        'ruleChain',
        'dashboardLayout',
        'scadaLayout',
        'layout2DDataPoint',
        'layout2DFlowIndicator',
        'layout2DTextLabel',
        'layout2D',
        'containerRack',
        'container3dWidgetConfig',
        'energyTarget',
        'activityLog',
        'accessController',
        'deviceData',
        'loraDevice',
        'gatewayStats',
        'loraGateway',
        'gatewayLocationMqttPayload',
        'gatewayLocation',
        'gatewayDashboard',
        'client',
        'pueConfiguration',
        'powerAnalyzerConfiguration',
        'aggregateNodeState',
        'notification',
        'backupScheduleExecution',
        'backupSchedule',
        'mqttConnectionHistory',
        'mqttTopicSubscription',
        'mqttMessageLog',
        'mqttConfiguration',
        'modbusRTUConfig',
        'vLAN',
        'dailyDeviceSummary',
        'zktecoAttendance',
        'zktecoFingerprintTemplate',
        'zktecoUser',
        'zktecoDevice',
        'deviceControlSavedItem',
        'systemConfiguration'
    ];

    for (const model of modelsToClear) {
        try {
            if (prisma[model]) {
                const result = await prisma[model].deleteMany({});
                console.log(`✅ Cleared ${model}: ${result.count} records`);
            } else {
                console.warn(`⚠️ Model ${model} not found in Prisma client`);
            }
        } catch (error) {
            console.error(`❌ Failed to clear ${model}:`, error.message);
        }
    }

    console.log('\n✨ Safe database cleanup completed!');
    await prisma.$disconnect();
}

clearDatabase();
