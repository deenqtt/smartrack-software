const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const models = [
        'user', 'rack', 'deviceExternal', 'ruleChain', 'dashboardLayout', 'scadaLayout', 'layout2D'
    ];

    console.log('📊 Database Status:');
    for (const model of models) {
        try {
            const count = await prisma[model].count();
            console.log(`   - ${model}: ${count}`);
        } catch (e) {
            console.log(`   - ${model}: Error (${e.message})`);
        }
    }
    await prisma.$disconnect();
}

main();
