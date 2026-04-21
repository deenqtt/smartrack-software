const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SMARTRACK_RACKS = [
  {
    id: "smartrack-rack-1",
    name: "Rack 1 (Smartrack)",
    capacityU: 42,
    location: "Smartrack Room",
    rackType: "NORMAL",
    notes: "Primary SmartRack equipment rack",
  },
  {
    id: "smartrack-rack-2",
    name: "Rack 2 (Smartrack)",
    capacityU: 42,
    location: "Smartrack Room",
    rackType: "NORMAL",
    notes: "Secondary SmartRack rack",
  },
  {
    id: "smartrack-rack-3",
    name: "Rack 3 (Smartrack)",
    capacityU: 42,
    location: "Smartrack Room",
    rackType: "NORMAL",
    notes: "Tertiary SmartRack rack",
  },
  {
    id: "smartrack-rack-4",
    name: "Rack 4 (Smartrack)",
    capacityU: 42,
    location: "Smartrack Room",
    rackType: "NORMAL",
    notes: "Spare SmartRack rack",
  },
];

const RACK_1_DEVICE_LAYOUT = [
  {
    uniqId: "smartrack-ups-1",
    positionU: 1,
    sizeU: 4,
  },
  {
    uniqId: "smartrack-cooling-1",
    positionU: 5,
    sizeU: 4,
  },
  {
    uniqId: "smartrack-sensorvib-1",
    positionU: 12,
    sizeU: 1,
  },
  {
    uniqId: "smartrack-temphum-1",
    positionU: 13,
    sizeU: 1,
  },
  {
    uniqId: "smartrack-temphum-2",
    positionU: 14,
    sizeU: 1,
  },
  {
    uniqId: "smartrack-rpdu-1",
    positionU: 42,
    sizeU: 1,
  },
];

async function ensureRack(tx, rackData) {
  const existingByName = await tx.rack.findUnique({
    where: { name: rackData.name },
    select: { id: true },
  });

  if (existingByName) {
    return tx.rack.update({
      where: { id: existingByName.id },
      data: {
        capacityU: rackData.capacityU,
        location: rackData.location,
        rackType: rackData.rackType,
        notes: rackData.notes,
      },
    });
  }

  return tx.rack.create({
    data: rackData,
  });
}

async function seedDevicesToRacks() {
  console.log("🚀 Seeding Smartrack racks and rack devices...");

  try {
    const result = await prisma.$transaction(async (tx) => {
      const resolvedRacks = [];

      for (const rack of SMARTRACK_RACKS) {
        const savedRack = await ensureRack(tx, rack);
        resolvedRacks.push(savedRack);
      }

      const rack1 = resolvedRacks[0];
      let assignedDevices = 0;
      let missingDevices = 0;

      const targetUniqIds = RACK_1_DEVICE_LAYOUT.map((item) => item.uniqId);

      await tx.deviceExternal.updateMany({
        where: {
          uniqId: { in: targetUniqIds },
        },
        data: {
          rackId: null,
          positionU: 0,
          sizeU: 1,
        },
      });

      for (const deviceLayout of RACK_1_DEVICE_LAYOUT) {
        const existingDevice = await tx.deviceExternal.findUnique({
          where: { uniqId: deviceLayout.uniqId },
          select: { id: true },
        });

        if (!existingDevice) {
          console.log(`   ⚠️ Device not found, skipping rack assignment: ${deviceLayout.uniqId}`);
          missingDevices++;
          continue;
        }

        await tx.deviceExternal.update({
          where: { uniqId: deviceLayout.uniqId },
          data: {
            rackId: rack1.id,
            positionU: deviceLayout.positionU,
            sizeU: deviceLayout.sizeU,
            status: "INSTALLED",
          },
        });

        assignedDevices++;
      }

      return {
        racks: resolvedRacks,
        assignedDevices,
        missingDevices,
      };
    });

    console.log(`   ✅ Racks processed: ${result.racks.length}`);
    result.racks.forEach((rack, index) => {
      console.log(`   ${index + 1}. ${rack.name} [${rack.id}]`);
    });
    console.log(`   ✅ Devices assigned to rack 1: ${result.assignedDevices}`);
    console.log(`   ⚠️ Missing devices skipped: ${result.missingDevices}`);
  } catch (error) {
    console.error("❌ Failed to seed Smartrack racks:", error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

module.exports = {
  seedDevicesToRacks,
  SMARTRACK_RACKS,
  RACK_1_DEVICE_LAYOUT,
  default: seedDevicesToRacks,
};

if (require.main === module) {
  seedDevicesToRacks()
    .then(() => {
      console.log("\nSmartrack rack seeding completed successfully!");
    })
    .catch((error) => {
      console.error("\n❌ Rack seeding failed:", error);
      process.exit(1);
    });
}
