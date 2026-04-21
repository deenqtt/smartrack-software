import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export interface Recommendation {
  severity: "info" | "warning" | "critical";
  icon: string;
  title: string;
  description: string;
}

function parseDevicePayload(lastPayload: any): Record<string, any> {
  if (!lastPayload) return {};
  try {
    if (typeof lastPayload.value === "string") return JSON.parse(lastPayload.value);
    return lastPayload.value ?? lastPayload;
  } catch { return {}; }
}

export async function POST(req: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY tidak dikonfigurasi" }, { status: 503 });
    }

    const body = await req.json();
    const deviceIds: string[] = body.deviceSources ?? [];
    const logConfigIds: string[] = body.logSources ?? [];

    if (deviceIds.length === 0 && logConfigIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal 1 source (perangkat atau log)" }, { status: 400 });
    }

    const now = new Date();
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since7d  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // ── Fetch semua data secara paralel ─────────────────────────────────────
    const [devices, logConfigs, recentLogData, billLogsToday] = await Promise.all([
      // Real-time lastPayload dari device yang dipilih
      deviceIds.length > 0
        ? prisma.deviceExternal.findMany({
            where: { uniqId: { in: deviceIds } },
            select: { uniqId: true, name: true, topic: true, lastPayload: true, lastUpdatedByMqtt: true },
          })
        : Promise.resolve([]),

      // Logging config metadata
      logConfigIds.length > 0
        ? prisma.loggingConfiguration.findMany({
            where: { id: { in: logConfigIds } },
            select: { id: true, customName: true, key: true, units: true },
          })
        : Promise.resolve([]),

      // LoggedData 24 jam terakhir untuk semua log config yang dipilih
      logConfigIds.length > 0
        ? prisma.loggedData.findMany({
            where: {
              configId: { in: logConfigIds },
              timestamp: { gte: since24h },
            },
            select: { configId: true, value: true, timestamp: true },
            orderBy: { timestamp: "asc" },
          })
        : Promise.resolve([]),

      // BillLog 7 hari terakhir (selalu disertakan sebagai konteks biaya)
      prisma.billLog.findMany({
        where: { timestamp: { gte: since7d } },
        select: { timestamp: true, rupiahCost: true, carbonEmission: true },
        orderBy: { timestamp: "asc" },
      }),
    ]);

    // ── Parse device payloads ────────────────────────────────────────────────
    const deviceSections = devices.map(d => {
      const payload = parseDevicePayload(d.lastPayload);
      const age = d.lastUpdatedByMqtt
        ? Math.round((now.getTime() - new Date(d.lastUpdatedByMqtt).getTime()) / 60000)
        : null;
      const payloadStr = Object.entries(payload)
        .filter(([, v]) => typeof v !== "object")
        .map(([k, v]) => `    ${k}: ${v}`)
        .join("\n");

      return `  Perangkat: ${d.name} (${d.topic})
    Terakhir update: ${age !== null ? `${age} menit lalu` : "N/A"}
${payloadStr || "    (tidak ada data payload)"}`;
    }).join("\n\n");

    // ── Parse log data per config ────────────────────────────────────────────
    const logSections = logConfigs.map(cfg => {
      const entries = recentLogData.filter(l => l.configId === cfg.id);
      if (entries.length === 0) {
        return `  Log: ${cfg.customName} (${cfg.key}${cfg.units ? " / " + cfg.units : ""})\n    (belum ada data dalam 24 jam)`;
      }
      const values = entries.map(e => e.value);
      const avg  = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
      const min  = Math.min(...values).toFixed(2);
      const max  = Math.max(...values).toFixed(2);
      const last = values[values.length - 1].toFixed(2);
      return `  Log: ${cfg.customName} (${cfg.key}${cfg.units ? " / " + cfg.units : ""})
    Data points 24 jam: ${entries.length}
    Nilai terakhir: ${last} | Rata-rata: ${avg} | Min: ${min} | Max: ${max}`;
    }).join("\n\n");

    // ── Bill cost trend 7 hari ───────────────────────────────────────────────
    const dayMap = new Map<string, { cost: number; carbon: number }>();
    billLogsToday.forEach(l => {
      const key = l.timestamp.toISOString().split("T")[0];
      const prev = dayMap.get(key) ?? { cost: 0, carbon: 0 };
      dayMap.set(key, { cost: prev.cost + l.rupiahCost, carbon: prev.carbon + l.carbonEmission });
    });
    const billTrend = Array.from(dayMap.entries())
      .map(([date, { cost, carbon }]) =>
        `    ${date}: Rp ${Math.round(cost).toLocaleString("id-ID")}, CO₂ ${carbon.toFixed(2)} kg`
      ).join("\n");

    // ── Build prompt ─────────────────────────────────────────────────────────
    const dataContext = `
=== ANALISIS DATA SMARTRACK ===
Waktu: ${now.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB

[DATA REAL-TIME PERANGKAT]
${deviceSections || "  (tidak ada perangkat dipilih)"}

[DATA HISTORIS LOG 24 JAM]
${logSections || "  (tidak ada log dipilih)"}

[TREN BIAYA & EMISI 7 HARI (dari BillLog)]
${billTrend || "  (belum ada data billing)"}
`.trim();

    const systemPrompt = `Kamu adalah AI Energy Advisor untuk sistem manajemen data center Smartrack.

Tugasmu: Analisis data energi yang diberikan dan hasilkan rekomendasi yang spesifik dan actionable dalam Bahasa Indonesia.

ATURAN OUTPUT:
- Kembalikan HANYA JSON array yang valid, tanpa teks, markdown, atau penjelasan tambahan apapun
- Format setiap item: {"severity":"info"|"warning"|"critical","icon":"emoji","title":"judul singkat max 5 kata","description":"penjelasan 1-2 kalimat konkret"}
- Berikan 3–5 rekomendasi berdasarkan data yang tersedia
- severity "critical": butuh tindakan segera | "warning": perlu diperhatikan | "info": insight berguna
- Fokus pada: efisiensi daya (PUE, IT Load), biaya, emisi karbon, anomali nilai, keseimbangan beban
- Jika data terbatas atau N/A, tetap berikan rekomendasi berdasarkan yang ada
- Hindari saran yang terlalu umum — spesifik ke data yang diberikan`;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: dataContext },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 1024,
    });

    const rawContent = completion.choices[0]?.message?.content ?? "[]";

    let recommendations: Recommendation[] = [];
    try {
      const cleaned = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      recommendations = Array.isArray(parsed) ? parsed : [];
    } catch {
      recommendations = [{
        severity: "info",
        icon: "🤖",
        title: "Analisis Sistem",
        description: rawContent.slice(0, 200),
      }];
    }

    // Snapshot summary untuk widget header
    const firstDevice = devices[0];
    const firstPayload = firstDevice ? parseDevicePayload(firstDevice.lastPayload) : {};

    return NextResponse.json({
      recommendations,
      generatedAt: now.toISOString(),
      sourceSummary: {
        deviceCount: devices.length,
        logCount: logConfigs.length,
        deviceNames: devices.map(d => d.name),
        logNames: logConfigs.map(l => l.customName),
      },
      // Pass-through snapshot dari payload pertama (untuk metric pills di widget)
      dataSnapshot: firstPayload,
    });
  } catch (error: any) {
    console.error("[AI Energy Advisor]", error);
    return NextResponse.json({ error: error.message || "Gagal menganalisis" }, { status: 500 });
  }
}
