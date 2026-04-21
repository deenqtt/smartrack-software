import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const activeDashboard = await prisma.dashboardLayout.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
  })

  if (!activeDashboard) {
    console.error("No active dashboard found.")
    process.exit(1)
  }

  // Retrieve default rack (for 3D visualizer etc)
  const mainRack = await prisma.rack.findFirst({ where: { rackType: 'MAIN' } })
  const defaultRackId = mainRack ? mainRack.id : undefined

  // Existing layout elements (if we want to append or just overwrite)
  // Let's just overwrite the layout completely to guarantee a clean slate
  const newLayout = [
    // --- OVERVIEW TAB ---
    {
      i: `Server-Rack-3D-${Date.now()}-1`,
      x: 0, y: 0, w: 6, h: 10,
      widgetType: "Server Rack 3D",
      config: { assignedCategory: "Overview", rackId: defaultRackId }
    },
    {
      i: `System-Health-${Date.now()}-2`,
      x: 6, y: 0, w: 3, h: 4,
      widgetType: "System Health",
      config: { assignedCategory: "Overview" }
    },
    {
      i: `Database-Status-${Date.now()}-3`,
      x: 9, y: 0, w: 3, h: 4,
      widgetType: "Database Status",
      config: { assignedCategory: "Overview" }
    },
    {
      i: `Active-Alarms-${Date.now()}-4`,
      x: 6, y: 4, w: 6, h: 6,
      widgetType: "Active Alarms",
      config: { assignedCategory: "Overview" }
    },

    // --- SECURITY TAB ---
    {
      i: `Active-Alarms-${Date.now()}-s1`,
      x: 0, y: 0, w: 4, h: 10,
      widgetType: "Active Alarms",
      config: { assignedCategory: "Security" }
    },
    {
      i: `Alarm-History-${Date.now()}-s2`,
      x: 4, y: 0, w: 8, h: 10,
      widgetType: "Alarm History",
      config: { assignedCategory: "Security" }
    },

    // --- ANALYTIC TAB ---
    {
      i: `Energy-Target-Chart-${Date.now()}-a1`,
      x: 0, y: 0, w: 6, h: 8,
      widgetType: "Energy Target Chart",
      config: { assignedCategory: "Analytic" }
    },
    {
      i: `Data-Chart-${Date.now()}-a2`,
      x: 6, y: 0, w: 6, h: 8,
      widgetType: "Data Chart",
      config: { assignedCategory: "Analytic" }
    },
    {
      i: `Top-Values-Comparator-${Date.now()}-a3`,
      x: 0, y: 8, w: 12, h: 6,
      widgetType: "Top Values Comparator",
      config: { assignedCategory: "Analytic" }
    },

    // --- POWER TAB ---
    {
      i: `PDM-Topology-${Date.now()}-p1`,
      x: 0, y: 0, w: 8, h: 10,
      widgetType: "PDM Topology",
      config: { assignedCategory: "Power" }
    },
    {
      i: `Carbon-Emissions-${Date.now()}-p2`,
      x: 8, y: 0, w: 4, h: 5,
      widgetType: "Carbon Emissions",
      config: { assignedCategory: "Power" }
    },
    {
      i: `Current-Month-Energy-Usage-${Date.now()}-p3`,
      x: 8, y: 5, w: 4, h: 5,
      widgetType: "Current Month Energy Usage",
      config: { assignedCategory: "Power" }
    },

    // --- UPS TAB ---
    {
      i: `Ups-Dashboard-${Date.now()}-u1`,
      x: 0, y: 0, w: 12, h: 12,
      widgetType: "Ups Dashboard",
      config: { assignedCategory: "UPS" }
    },

    // --- COOLING TAB ---
    {
      i: `Cooling-Dashboard-${Date.now()}-c1`,
      x: 0, y: 0, w: 12, h: 12,
      widgetType: "Cooling Dashboard",
      config: { assignedCategory: "Cooling" }
    }
  ]

  await prisma.dashboardLayout.update({
    where: { id: activeDashboard.id },
    data: { layout: JSON.stringify(newLayout) }
  })

  console.log("Successfully assigned existing widgets to all tabs!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
