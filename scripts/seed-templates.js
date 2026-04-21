const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEMPLATES_BASE_DIR = path.join(__dirname, '..', 'templates');

const USER_TYPE_TO_EMAIL = {
    admin: "admin@smartrack.com",
    user: "user@smartrack.com",
    smartrack: "admin@smartrack.com", // smartrack templates map to admin
};

/**
 * Generic helper to get user ID by type or email
 */
async function getUserId(input) {
    const email = USER_TYPE_TO_EMAIL[input] || input;
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return user ? user.id : null;
}

const Seeders = {
    /**
     * Rule Chains
     */
    async rulechains(action = 'seed', target = null) {
        const dir = path.join(TEMPLATES_BASE_DIR, 'rule-chain-templates');
        if (action === 'seed') {
            console.log("\n🔗 Seeding Rule Chains...");
            if (!fs.existsSync(dir)) return;
            const files = target ? [`${target}.json`] : fs.readdirSync(dir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const filePath = path.join(dir, file);
                if (!fs.existsSync(filePath)) continue;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                for (const chain of (data.ruleChains || [])) {
                    const userId = await getUserId(chain.userEmail);
                    if (!userId) continue;
                    await prisma.ruleChain.upsert({
                        where: { userId_name: { userId, name: chain.name } },
                        update: { description: chain.description, nodes: chain.nodes, edges: chain.edges, isActive: chain.isActive },
                        create: { userId, name: chain.name, description: chain.description, nodes: chain.nodes, edges: chain.edges, isActive: chain.isActive }
                    });
                    console.log(`   ✅ Seeded Rule Chain: ${chain.name} (${chain.userEmail})`);
                }
            }
        } else {
            console.log("\n📤 Fetching Rule Chains from DB...");
            const userTypes = target ? [target] : Object.keys(USER_TYPE_TO_EMAIL);
            for (const type of userTypes) {
                const userId = await getUserId(type);
                if (!userId) continue;
                const chains = await prisma.ruleChain.findMany({ where: { userId } });
                if (chains.length === 0) continue;
                const data = { userType: type, ruleChains: chains.map(c => ({ ...c, userEmail: USER_TYPE_TO_EMAIL[type] })) };
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, `${type}.json`), JSON.stringify(data, null, 2));
                console.log(`   ✅ Fetched ${chains.length} Rule Chains for ${type}`);
            }
        }
    },

    /**
     * Layout2D
     */
    async layout2d(action = 'seed', target = null) {
        const dir = path.join(TEMPLATES_BASE_DIR, 'layout2d-templates');
        const userTypes = target ? [target] : Object.keys(USER_TYPE_TO_EMAIL);

        if (action === 'seed') {
            console.log("\n🏞️ Seeding Layout2D...");
            const sanitizeNestedData = (items) => {
                if (!items) return undefined;
                return items.map(item => {
                    const { id, layoutId, createdAt, updatedAt, ...rest } = item;
                    return rest;
                });
            };

            for (const type of userTypes) {
                const filePath = path.join(dir, `${type}.json`);
                if (!fs.existsSync(filePath)) continue;
                const userId = await getUserId(type);
                if (!userId) continue;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                for (const template of data.layouts) {
                    const existing = await prisma.layout2D.findFirst({ where: { userId, name: template.name } });

                    const dataPoints = sanitizeNestedData(template.dataPoints)?.map(dp => ({
                        ...dp, selectedKeys: typeof dp.selectedKeys === 'string' ? dp.selectedKeys : JSON.stringify(dp.selectedKeys)
                    }));
                    const flowIndicators = sanitizeNestedData(template.flowIndicators);
                    const textLabels = sanitizeNestedData(template.textLabels);

                    await prisma.$transaction(async (tx) => {
                        if (existing) {
                            await tx.layout2DDataPoint.deleteMany({ where: { layoutId: existing.id } });
                            await tx.layout2DFlowIndicator.deleteMany({ where: { layoutId: existing.id } });
                            await tx.layout2DTextLabel.deleteMany({ where: { layoutId: existing.id } });
                            await tx.layout2D.update({
                                where: { id: existing.id },
                                data: {
                                    image: template.image, layoutTemplate: template.layoutTemplate, images: template.images,
                                    dataPoints: { create: dataPoints },
                                    flowIndicators: { create: flowIndicators },
                                    textLabels: textLabels ? { create: textLabels } : undefined
                                }
                            });
                        } else {
                            await tx.layout2D.create({
                                data: {
                                    name: template.name, userId, image: template.image, layoutTemplate: template.layoutTemplate, images: template.images,
                                    dataPoints: { create: dataPoints },
                                    flowIndicators: { create: flowIndicators },
                                    textLabels: textLabels ? { create: textLabels } : undefined
                                }
                            });
                        }
                    });
                    console.log(`   ✅ Seeded Layout2D: ${template.name} (${type})`);
                }
            }
        } else {
            console.log("\n📤 Fetching Layout2D from DB...");
            for (const type of userTypes) {
                const userId = await getUserId(type);
                if (!userId) continue;
                const layouts = await prisma.layout2D.findMany({
                    where: { userId },
                    include: {
                        dataPoints: { select: { deviceUniqId: true, selectedKeys: true, customName: true, positionX: true, positionY: true, fontSize: true, iconName: true, iconColor: true, showIcon: true, displayLayout: true } },
                        flowIndicators: { select: { deviceUniqId: true, selectedKey: true, customName: true, positionX: true, positionY: true, arrowDirection: true, logicOperator: true, compareValue: true, valueType: true, trueColor: true, trueAnimation: true, falseColor: true, falseAnimation: true, warningColor: true, warningAnimation: true, warningEnabled: true, warningOperator: true, warningValue: true } },
                        textLabels: { select: { text: true, customName: true, positionX: true, positionY: true, fontSize: true, fontWeight: true, color: true, backgroundColor: true, padding: true } }
                    }
                });
                if (layouts.length === 0) continue;
                const data = { userType: type, layouts };
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, `${type}.json`), JSON.stringify(data, null, 2));
                console.log(`   ✅ Fetched ${layouts.length} Layout2D templates for ${type}`);
            }
        }
    },

    /**
     * SCADA
     */
    async scada(action = 'seed', target = null) {
        const dir = path.join(TEMPLATES_BASE_DIR, 'scada-templates');
        const userTypes = target ? [target] : Object.keys(USER_TYPE_TO_EMAIL);

        if (action === 'seed') {
            console.log("\n📊 Seeding SCADA...");
            for (const type of userTypes) {
                const filePath = path.join(dir, `${type}.json`);
                if (!fs.existsSync(filePath)) continue;
                const userId = await getUserId(type);
                if (!userId) continue;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                for (const template of data.layouts) {
                    // 1. Try to find by unique name for this user
                    let existing = await prisma.scadaLayout.findUnique({
                        where: { userId_name: { userId, name: template.name } }
                    });

                    if (existing) {
                        // Found by Name. Simply update content (don't touch ID to avoid conflicts)
                        await prisma.scadaLayout.update({
                            where: { id: existing.id },
                            data: { layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                        });
                    } else if (template.id) {
                        // Not found by name, try lookup by ID
                        existing = await prisma.scadaLayout.findUnique({ where: { id: template.id } });
                        if (existing) {
                            // ID exists but has a different name (and we know the new name is free from Step 1)
                            await prisma.scadaLayout.update({
                                where: { id: template.id },
                                data: { name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                            });
                        } else {
                            // Neither ID nor Name exists. Create new.
                            await prisma.scadaLayout.create({
                                data: { id: template.id, userId, name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                            });
                        }
                    } else {
                        // Regular create
                        await prisma.scadaLayout.create({
                            data: { userId, name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                        });
                    }
                    console.log(`   ✅ Seeded SCADA: ${template.name} (${type})`);
                }
            }
        } else {
            console.log("\n📤 Fetching SCADA from DB...");
            for (const type of userTypes) {
                const userId = await getUserId(type);
                if (!userId) continue;
                const layouts = await prisma.scadaLayout.findMany({ where: { userId } });
                if (layouts.length === 0) continue;
                const data = { userType: type, layouts, totalLayouts: layouts.length };
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, `${type}.json`), JSON.stringify(data, null, 2));
                console.log(`   ✅ Fetched ${layouts.length} SCADA layouts for ${type}`);
            }
        }
    },

    /**
     * Dashboard
     */
    async dashboard(action = 'seed', target = null) {
        const dir = path.join(TEMPLATES_BASE_DIR, 'dashboard-templates');
        const userTypes = target ? [target] : Object.keys(USER_TYPE_TO_EMAIL);

        if (action === 'seed') {
            console.log("\n📈 Seeding Dashboards...");
            for (const type of userTypes) {
                const filePath = path.join(dir, `${type}.json`);
                if (!fs.existsSync(filePath)) continue;
                const userId = await getUserId(type);
                if (!userId) continue;
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                for (const template of data.dashboards) {
                    // 1. Try to find by unique name for this user
                    let existing = await prisma.dashboardLayout.findUnique({
                        where: { userId_name: { userId, name: template.name } }
                    });

                    let dashboard;
                    if (existing) {
                        // Found by Name. Simply update
                        dashboard = await prisma.dashboardLayout.update({
                            where: { id: existing.id },
                            data: { layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                        });
                    } else if (template.id) {
                        // Not found by name, try lookup by ID
                        existing = await prisma.dashboardLayout.findUnique({ where: { id: template.id } });
                        if (existing) {
                            dashboard = await prisma.dashboardLayout.update({
                                where: { id: template.id },
                                data: { name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                            });
                        } else {
                            dashboard = await prisma.dashboardLayout.create({
                                data: { id: template.id, userId, name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                            });
                        }
                    } else {
                        dashboard = await prisma.dashboardLayout.create({
                            data: { userId, name: template.name, layout: template.layout, inUse: template.inUse, isActive: template.isActive }
                        });
                    }

                    // Handle Special Widgets (Container 3D, Containment 3D)
                    try {
                        const layout = JSON.parse(template.layout);
                        for (const widget of layout) {
                            if (["Container 3D", "Containment 3D"].includes(widget.widgetType) && widget.config) {
                                const config = widget.config;
                                if (config.id) {
                                    await prisma.container3dWidgetConfig.upsert({
                                        where: { id: config.id },
                                        update: {
                                            layoutId: dashboard.id,
                                            customName: config.customName || "3D Container",
                                            totalRack: config.totalRack || 11,
                                            coolingRacks: config.coolingRacks || [],
                                            rackMappings: config.rackMappings || [],
                                            containerType: config.containerType || "industrial",
                                            frontTopics: config.frontTopics || [],
                                            backTopics: config.backTopics || [],
                                            powerTopic: config.powerTopic || null,
                                            gridX: config.gridX ?? 0,
                                            gridY: config.gridY ?? 0,
                                            gridWidth: config.gridWidth ?? 4,
                                            gridHeight: config.gridHeight ?? 4,
                                        },
                                        create: {
                                            id: config.id,
                                            layoutId: dashboard.id,
                                            customName: config.customName || "3D Container",
                                            totalRack: config.totalRack || 11,
                                            coolingRacks: config.coolingRacks || [],
                                            rackMappings: config.rackMappings || [],
                                            containerType: config.containerType || "industrial",
                                            frontTopics: config.frontTopics || [],
                                            backTopics: config.backTopics || [],
                                            powerTopic: config.powerTopic || null,
                                            gridX: config.gridX ?? 0,
                                            gridY: config.gridY ?? 0,
                                            gridWidth: config.gridWidth ?? 4,
                                            gridHeight: config.gridHeight ?? 4,
                                        }
                                    });

                                    // Restore containerRacks if present
                                    if (config.containerRacks && Array.isArray(config.containerRacks)) {
                                        for (const rack of config.containerRacks) {
                                            await prisma.containerRack.upsert({
                                                where: { id: rack.id },
                                                update: {
                                                    container3dWidgetConfigId: config.id,
                                                    rackNumber: rack.rackNumber,
                                                    servers: rack.servers || null
                                                },
                                                create: {
                                                    id: rack.id,
                                                    container3dWidgetConfigId: config.id,
                                                    rackNumber: rack.rackNumber,
                                                    servers: rack.servers || null
                                                }
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Silent fail for layout parsing or nested seeding
                        console.error(`      ⚠️  Failed to process special widgets for ${template.name}:`, e.message);
                    }

                    console.log(`   ✅ Seeded Dashboard: ${template.name} (${type})`);
                }
            }
        } else {
            console.log("\n📤 Fetching Dashboards from DB...");
            for (const type of userTypes) {
                const userId = await getUserId(type);
                if (!userId) continue;

                const dashboards = await prisma.dashboardLayout.findMany({
                    where: { userId },
                    include: {
                        container3dWidgets: {
                            include: {
                                containerRacks: true
                            }
                        }
                    }
                });

                if (dashboards.length === 0) continue;

                // Process dashboards to embed 3D config into the layout string if needed
                const processedDashboards = dashboards.map(db => {
                    const dbObj = { ...db };
                    try {
                        let layout = JSON.parse(db.layout);
                        let updated = false;

                        layout = layout.map(widget => {
                            if (["Container 3D", "Containment 3D"].includes(widget.widgetType)) {
                                const dbConfig = db.container3dWidgets.find(w =>
                                    w.customName === widget.config?.customName ||
                                    w.layoutId === db.id
                                );
                                if (dbConfig) {
                                    widget.config = { ...widget.config, ...dbConfig };
                                    updated = true;
                                }
                            }
                            return widget;
                        });

                        if (updated) {
                            dbObj.layout = JSON.stringify(layout);
                        }
                    } catch (e) {
                        console.error(`      ⚠️  Error processing layout for fetch: ${db.name}`);
                    }

                    // Remove the relations from the final JSON so it stays clean
                    delete dbObj.container3dWidgets;
                    return dbObj;
                });

                const data = {
                    userType: type,
                    dashboards: processedDashboards,
                    totalDashboards: dashboards.length,
                    generatedAt: new Date().toISOString()
                };

                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, `${type}.json`), JSON.stringify(data, null, 2));
                console.log(`   ✅ Fetched ${dashboards.length} Dashboards for ${type}`);
            }
        }
    },

    /**
     * Racks
     */
    async racks(action = 'seed', target = null) {
        if (action === 'seed') {
            console.log("\n🏢 Seeding Racks & Devices...");
            const { seedDevices } = require('./seed-devices');
            await seedDevices();
        } else {
            console.log("\n📤 Fetching Racks from DB...");
            const dir = path.join(TEMPLATES_BASE_DIR, 'rack-templates');
            const racks = target
                ? await prisma.rack.findMany({ where: { name: target }, include: { devices: true } })
                : await prisma.rack.findMany({ include: { devices: true } });

            for (const rack of racks) {
                const fileName = `${rack.name.toLowerCase().replace(/\s+/g, '-')}.json`;
                const data = {
                    description: `Rack template for ${rack.name}`,
                    generatedAt: new Date().toISOString(),
                    racks: [{
                        id: rack.id, name: rack.name, capacityU: rack.capacityU, location: rack.location, notes: rack.notes,
                        visualizationConfigs: rack.visualizationConfigs,
                        devices: rack.devices.map(d => ({
                            id: d.id, uniqId: d.uniqId, name: d.name, deviceType: d.deviceType, status: d.status,
                            position: { startU: d.positionU, endU: d.positionU + (d.sizeU || 1) - 1, sizeU: d.sizeU },
                            topic: d.topic, address: d.address
                        }))
                    }]
                };
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(path.join(dir, fileName), JSON.stringify(data, null, 2));
                console.log(`   ✅ Fetched Rack: ${rack.name}`);
            }
        }
    }
};

async function main() {
    const args = process.argv.slice(2);
    const mode = args.includes('--fetch') ? 'fetch' : 'seed';
    const command = args.find(a => !a.startsWith('--')) || 'all';
    const target = args.find(a => !a.startsWith('--') && a !== command);

    console.log(`🛠️  Smartrack Template Manager [Mode: ${mode.toUpperCase()}]`);
    console.log("-----------------------------------------");

    try {
        if (command === 'all') {
            await Seeders.racks(mode);
            await Seeders.rulechains(mode);
            await Seeders.layout2d(mode);
            await Seeders.scada(mode);
            await Seeders.dashboard(mode);
        } else if (Seeders[command]) {
            await Seeders[command](mode, target);
        } else {
            console.log("Usage:");
            console.log("  node scripts/seed-templates.js [all|racks|layout2d|scada|dashboard|rulechains] [userType/RackName]");
            console.log("  node scripts/seed-templates.js all --fetch      # Export current DB to templates");
            process.exit(1);
        }
        console.log(`\n✨ Template ${mode}ing completed!`);
    } catch (error) {
        console.error(`\n❌ ${mode.toUpperCase()} failed:`, error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
}

module.exports = { ...Seeders };
