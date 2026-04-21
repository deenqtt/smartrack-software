import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { prisma } from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const { message, history = [] } = await req.json();

    // 1. Fetch RAW & SENSITIVE Data for Full System Transparency (UNIVERSAL MASTERY MODE)
    let nodeInfoConfig = {};
    try {
      const configPath = path.join(
        process.cwd(),
        "middleware/CONFIG_SYSTEM_DEVICE/JSON/nodeInfoConfig.json",
      );
      
      // Check if file exists before reading to avoid noisy ENOENT warnings
      try {
        await fs.access(configPath);
        const fileData = await fs.readFile(configPath, "utf8");
        nodeInfoConfig = JSON.parse(fileData);
      } catch (accessError: any) {
        if (accessError.code !== 'ENOENT') {
          console.warn("Error accessing nodeInfoConfig.json:", accessError);
        }
        // If file is missing (ENOENT), we just leave nodeInfoConfig as {}
      }
    } catch (e) {
      console.warn("Could not parse nodeInfoConfig.json:", e);
    }

    const [
      users,
      devices,
      logCount,
      alarmCount,
      ruleChains,
      maintenances,
      recentAlarms,

      dashboards,
      layouts2d,
      systemConfigs,
      billConfigs,
      racks,
    ] = await Promise.all([
      prisma.user.findMany({
        select: { email: true, phoneNumber: true, roleId: true },
        take: 10,
      }),
      prisma.deviceExternal.findMany({
        select: {
          name: true,
          topic: true,
          status: true,
          lastPayload: true,
          lastUpdatedByMqtt: true,
        },
        orderBy: { lastUpdatedByMqtt: "desc" },
        take: 15,
      }),
      prisma.loggedData.count(),
      prisma.alarmLog.count(),
      prisma.ruleChain.findMany({
        select: { name: true, isActive: true },
        take: 10,
      }),
      prisma.maintenance.findMany({ where: { status: "Scheduled" }, take: 5 }),
      prisma.alarmLog.findMany({
        orderBy: { timestamp: "desc" },
        take: 5,
        include: { alarmConfig: true },
      }),

      prisma.dashboardLayout.findMany({
        select: { name: true, inUse: true },
        take: 10,
      }),
      prisma.layout2D.findMany({
        select: { name: true, isUse: true },
        take: 10,
      }),
      prisma.systemConfiguration.findMany({
        select: { key: true, value: true },
        take: 10,
      }),
      prisma.billConfiguration.findMany({
        select: { customName: true, rupiahRatePerKwh: true },
        take: 5,
      }),
      prisma.rack.findMany({
        select: { name: true, capacityU: true },
        take: 10,
      }),
    ]);

    const PROJECT_CONTEXT = `
Project Name: Smart Rack Management System
Security Level: OMNISCIENT LEVEL GRANTED
Current Server Time: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })} (WIB)

SYSTEM CORE MODULES:
- Infrastructure: Next.js 14, Prisma, TimescaleDB, Redis, MQTT.
- Monitoring: 2D/3D Layouts, Rule Engine, Alarms, System Performance.
- Smart Management: IP Address Management (IPAM), Asset Tracking (Racks), Power Analyzer.
- Connectivity: IoT (MQTT), SNMP.

LIVE MQTT TOPIC SUBSCRIPTION (Real-time Telemetry):
${devices.map((d) => `[${d.topic}] ${d.name}: ${JSON.stringify(d.lastPayload) || "No Data"} (Last: ${d.lastUpdatedByMqtt?.toISOString() || "N/A"})`).join("\n")}

LIVE DATABASE ANALYTICS:
[ENERGY & POWER]
${billConfigs.map((b) => `Power Meter: ${b.customName} | Rate: Rp ${b.rupiahRatePerKwh}/kWh`).join("\n")}

[PHYSICAL INFRASTRUCTURE]
${racks.map((r) => `Rack: ${r.name} | Cap: ${r.capacityU}U`).join("\n")}

[SYSTEM CONFIGURATIONS]
${systemConfigs.map((s) => `${s.key}: ${s.value}`).join("\n")}

[NODE CONFIG (from JSON)]
${JSON.stringify(nodeInfoConfig, null, 2)}

[METRICS]
- Total IoT Payload Logs: ${logCount}
- Historical Alarms: ${alarmCount}

Role: You are Smartrack Assistant.
General Instruction: Respond in Indonesian. You are a highly intelligent, friendly, and versatile AI assistant. While you are the brain of the Smartrack IOT environment, you can also have general conversations, tell stories, help with general coding, and give advice on any topic. 
IF asked about the system specifically, use the metadata provided to give a highly technical and precise answer. 
IF asked for general chat (not about smartrack), respond naturally like an expert and helpful companion. Maintain your "Smartrack Assistant" persona but don't be limited to only technical IoT topics.
`;

    if (process.env.GROQ_API_KEY) {
      const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
      
      // Limit history to last 10 messages to avoid context overflow
      const recentHistory = history.slice(-10);
      
      const completion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: `Anda adalah Smartrack Assistant.
            
            ${PROJECT_CONTEXT}
            
            KEPRIBADIAN:
            - Cerdas, ramah, kritis, dan serba bisa.
            - Sebagai "otak" dari sistem Smartrack ini, Anda memiliki akses penuh ke data sistem (Gunakan data di atas untuk menjawab hal sistem).
            - Sebagai **Researcher**, Anda bersikap proaktif: jika melihat potensi kerawanan (misal: MQTT topic yang terekspos, user admin tanpa 2FA, perangkat yang tidak aktif, dll), Anda harus melapor.
            
            KEMAMPUAN AUDIT & RISET:
            1. **Deep Audit**: Jika user meminta audit atau riset, analisis semua metadata (Devices, Rules, Alarms, Users). Cari anomali, red flag keamanan, atau inefisiensi performa.
            2. **Gap Analysis**: Identifikasi fitur atau konfigurasi yang mungkin kurang dibandingkan standar manajemen infrastruktur modern.
            3. **Security Check**: Periksa pola data untuk mendeteksi potensi serangan atau kebocoran (misal: frekuensi payload yang mencurigakan, status alarm yang terabaikan).
            
            Gaya bicara profesional tapi luwes (friendly assistant). Anda juga bisa diajak mengobrol santai tentang apa saja diluar smartrack. Gunakan Markdown yang rapi dalam merespons.`,
          },
          ...recentHistory,
          { role: "user", content: message },
        ],
        model: "llama-3.3-70b-versatile",
      });

      return NextResponse.json({
        role: "assistant",
        content:
          completion.choices[0]?.message?.content ||
          "Maaf, Smartrack Assistant sedang tidak dapat merespon.",
      });
    }

    return NextResponse.json({
      role: "assistant",
      content: "⚠️ **SmartAssistant Error:** API Key tidak ditemukan di konfigurasi sistem (.env). Silakan hubungi pengembang untuk aktivasi layanan AI.",
    });
  } catch (error: any) {
    console.error("AI Chat Error:", error);

    let errorMessage = `⚠️ **Terjadi Kesalahan:** ${error.message || "Error tidak diketahui"}`;

    if (
      error.status === 429 ||
      error.message?.includes("429") ||
      error.message?.includes("rate_limit")
    ) {
      errorMessage = `🚀 **SmartAssistant sedang beristirahat sejenak!**\n\nWah, sepertinya saya baru saja memproses terlalu banyak data "Supreme Knowledge". Mohon tunggu sekitar **5-10 menit** ya sebelum bertanya lagi. Terima kasih atas kesabarannya!`;
    } else if (error.status === 401 || error.message?.includes("401")) {
      errorMessage = `🔑 **Masalah Autentikasi:** API Key tidak valid atau sudah kedaluwarsa. Pastikan GROQ_API_KEY sudah benar.`;
    }

    return NextResponse.json({
      role: "assistant",
      content: errorMessage,
    });
  }
}
