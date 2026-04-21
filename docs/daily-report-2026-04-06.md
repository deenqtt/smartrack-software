# Daily Report — 2026-04-06

## Fitur & Fix yang Dikerjakan

### 1. Dashboard Template (`smartrack.json`)
Tambah widget ke tab **Analytic** dan **Power** (serta Admin Panel):
- PUE Value, Total IT Power, Total Facility Power, IT Load % Gauge
- PUE Trend, IT Load Trend, Carbon Emissions L1/L2
- Predictive Billing, Energy kWh L1/L2, Bill Cost L1/L2, Energy Trend

---

### 2. Fix AnalogueGaugeWidget
- Stale closure pada `handleMqttMessage` → fix dengan functional `setState`
- `itLoadPercentage` dikirim sebagai string `"42.50%"` → widget loading forever → fix di `calculation-service.ts` + fallback `parseFloat()` di widget

---

### 3. Fix PredictiveBillingWidget
- Logic prediksi salah (rawValue dianggap kumulatif) → fix: sum `rupiahCost`, derive kWh dari tariff
- UI rewrite: konsisten dengan widget lain, rename "AI Confidence" → "Data coverage"
- Tambah `"showType": "all"` ke semua widget di template

---

### 4. Widget Baru: AI Energy Advisor
Widget analisis energi berbasis AI (Groq / Llama 3.3 70B), tampil di tab Analytic.

- Config modal: pilih **device** (real-time lastPayload) + **log config** (historical LoggedData) sebagai sumber data
- Analisis dalam **Bahasa Indonesia** — rekomendasi hemat energi, PUE, billing
- Tombol **"Analisa Ulang"** untuk re-trigger kapan saja
- API: `POST /api/ai/energy-advisor` (include BillLog 7-hari sebagai konteks)

---

### 5. Public Preview (`/preview`)
Halaman dashboard yang bisa diakses **tanpa login**.

- Route: `/preview`
- API: `GET /api/dashboards/public-active` (no auth required)
- Menampilkan dashboard yang sedang aktif (`inUse: true`) lengkap dengan category navigator
- Middleware otomatis inject short-lived preview token

---

## Files Changed
| Area | File |
|------|------|
| Widget baru | `components/widgets/AiEnergyAdvisor/` |
| API baru | `app/api/ai/energy-advisor/route.ts` |
| API publik | `app/api/dashboards/public-active/route.ts` |
| Preview page | `app/preview/page.tsx`, `app/preview/layout.tsx` |
| Template | `templates/dashboard-templates/smartrack.json` |
| Fix widget | `AnalogueGaugeWidget.tsx`, `PredictiveBillingWidget.tsx` |
| Fix service | `calculation-service.ts`, `prediction-service.ts` |
| Registry | `WidgetConfigSelector.tsx`, `WidgetRenderer.tsx` |

**Commit:** `2040fdb` → branch `beta1`
