# Rule Chain Automation Plan
> Based on: Scope Automation (AUTO-01 s/d AUTO-05), device seed data, dan MQTT payload spec

---

## Ringkasan Device & Key yang Dibutuhkan

### External Devices (Database mode)

| Device | Topic | Key yang Dibutuhkan |
|---|---|---|
| Cooling (Schneider ACRMD4KI) | `smartrack/cooling/1` | `Serious_Alarm_Output`, `Common_Alarm_Output`, `Air_Return_Temperature`, `Air_Outlet_Temperature`, `IDU_Fan_Output`, `ON_OFF_UNIT` |
| UPS (APC) | `smartrack/ups/1` | `Output_Status`, `Input_Status`, `Battery_Status`, `On_Battery_Alarm`, `Low_Battery_Alarm`, `Depleted_Battery_Alarm`, `General_Fault_Alarm` |
| Rack PDU (UNITECH) | `smartrack/rackpdu/1` | `inlet_voltage`, `output_current_1`, `output_current_2` |
| Temp Hum 1 | `smartrack/temphum/1` | `temp`, `hum` |
| Temp Hum 2 | `smartrack/temphum/2` | `temp`, `hum` |
| Vibration | `smartrack/vibration/1` | `activity`, `x`, `y`, `z` |

> **Catatan payload:** Semua device di atas membungkus data dalam field `value` sebagai JSON string.
> Rule chain perlu node **Extract Fields** atau **Map Payload** untuk mengurai `value` sebelum field bisa dipakai.

### Internal Devices (Modular I2C)

| Device | Part Number | Topic | Key yang Dibutuhkan |
|---|---|---|---|
| Dry Contact | `DRYCONTACT` | `DRYCONTACT/1` | `DI1`, `DI2`, `DI5` (channel digital input) |
| Relay Mini | `RELAYMINI` | `RELAYMINI/1` | `relay_1`, `relay_2`, `relay_3` (atau sesuai naming firmware) |

> **Catatan:** Key aktual DRYCONTACT dan RELAYMINI perlu diverifikasi dari firmware — subscribe ke topik masing-masing dan lihat payload yang dikirim.

---

## AUTO-01 — Lighting berdasarkan Status Pintu & Emergency

**Input:** DI1, DI2, DI5 (DRYCONTACT)
**Output:** Relay 1 (RELAYMINI)
**Logika:** Lampu ON jika **salah satu** dari DI1, DI2, atau DI5 aktif (HIGH)

### Node Flow

```
[InputNode: DRYCONTACT/1 → DI1]
        |
        |-- (DI1 == 1) ──────────────────────────────┐
                                                      ▼
[InputNode: DRYCONTACT/1 → DI2]             [ControlNode: Relay 1 → ON]
        |
        |-- (DI2 == 1) ──────────────────────────────┘

[InputNode: DRYCONTACT/1 → DI5]
        |
        |-- (DI5 == 1) ──────────────────────────────┘

(semua OFF → edge menuju)
        ▼
[ControlNode: Relay 1 → OFF]
```

### Detail Node

| # | Node | Type | Config |
|---|---|---|---|
| 1 | Sumber DI | `inputNode` | Device: DRYCONTACT/1, Key: `DI1` |
| 2 | Sumber DI | `inputNode` | Device: DRYCONTACT/1, Key: `DI2` |
| 3 | Sumber Emergency | `inputNode` | Device: DRYCONTACT/1, Key: `DI5` |
| 4 | Switch kondisi | `switchNode` | Left: DI1/DI2/DI5, operator: `== 1` |
| 5 | Relay ON | `controlNode` | Device: RELAYMINI/1, Key: relay_1, Action: ON |
| 6 | Relay OFF | `controlNode` | Device: RELAYMINI/1, Key: relay_1, Action: OFF |

### Edge Conditions

| Edge | Field | Operator | Value |
|---|---|---|---|
| DI → Relay ON | `DI1` | `==` | `1` |
| DI → Relay ON | `DI2` | `==` | `1` |
| DI → Relay ON | `DI5` | `==` | `1` |
| Default → Relay OFF | — | default | — |

---

## AUTO-02 — Buka Pintu berdasarkan Status Emergency

**Input:** DI5 (DRYCONTACT)
**Output:** MQTT publish ke firmware LockAccessController via `iot/door/command/{IP}`
**Logika:** Kirim unlock command saat emergency aktif; catat ke audit log

> **Koreksi arsitektur:** Pintu TIDAK dikontrol via relay biasa. Firmware ESP32 (`LockAccessController`) membuka pintu melalui Modbus RTU RS485 ketika menerima pesan MQTT ke topic `iot/door/command/{device_IP}` dengan payload `{"lockAddress": N}`. Output node di rule chain adalah **`actionNode` (MQTT Publish)**, bukan `controlNode` (Relay).

### Node Flow

```
[InputNode: DRYCONTACT/1 → DI5]
        |
        |-- (DI5 == 1) ──→ [ActionNode: MQTT Publish → iot/door/command/192.168.1.210]
                                    |                   payload: {"lockAddress": 1}
                                    ▼
                        [DatabaseNode: Log to DB (audit log)]
        |
        |-- (DI5 == 0) → tidak ada aksi
```

### Detail Node

| # | Node | Type | Config |
|---|---|---|---|
| 1 | Emergency input | `inputNode` | Device: DRYCONTACT/1, Key: `DI5` |
| 2 | Publish unlock | `actionNode` | MQTT topic: `iot/door/command/{controller_IP}`, payload: `{"lockAddress": 1}` |
| 3 | Audit log | `databaseNode` | Log to DB dengan timestamp + triggeredBy |

### Edge Conditions

| Edge | Field | Operator | Value |
|---|---|---|---|
| DI5 aktif → unlock | `DI5` | `==` | `1` |
| Unlock sukses → log | — | success | — |

### Firmware Reference

| Cara Unlock | Detail |
|---|---|
| **MQTT topic** | `iot/door/command/{device_IP}` |
| **Payload** | `{"lockAddress": N}` (N = Modbus address lock, 1–10) |
| **Yang terjadi** | ESP32 tulis Modbus register 8196 = 51 via RS485 → relay lock aktif |
| **Controller IP** | Cek dari dashboard Access Controllers (default seed: `192.168.1.210`) |

> **Untuk multi-lock:** Jika ada lebih dari 1 pintu yang harus dibuka saat emergency, tambahkan 1 `actionNode` per lock address yang diinginkan, semua terhubung dari edge yang sama.

---

## AUTO-03 — Control Fan berdasarkan Status Cooling & Suhu

**Input:** `Serious_Alarm_Output`, `Air_Return_Temperature`, `Air_Outlet_Temperature` (Cooling device)
**Output:** Relay 3 (RELAYMINI)
**Logika:**
- Fan ON jika: cooling fault (`Serious_Alarm_Output == 1`) **ATAU** suhu inlet tinggi (> 28°C) **ATAU** suhu outlet tinggi (> 25°C)
- Fan OFF dengan hysteresis 60 detik (tidak langsung OFF saat kondisi pulih)

> **Catatan:** Ketiga field input berasal dari **topic yang sama** (`smartrack/cooling/1`), sehingga cukup menggunakan **1 InputNode** — tidak perlu 3 node terpisah. Field di-extract sekaligus setelah input diterima. Tidak diperlukan `analyticsNode` karena semua evaluasi dilakukan langsung pada nilai field mentah di `switchNode`.

### Key yang Dibutuhkan dari Cooling

```
value.Serious_Alarm_Output       → 0 atau 1 (cooling fault)
value.Air_Return_Temperature     → float (suhu inlet/return, °C)
value.Air_Outlet_Temperature     → float (suhu outlet/supply, °C)
```

### Node Flow

```
[1. InputNode]
    Topic: smartrack/cooling/1
    (trigger setiap ada data baru dari cooling)
          |
          ▼
[2. ExtractFieldsNode]
    Extract: Serious_Alarm_Output
             Air_Return_Temperature
             Air_Outlet_Temperature
          |
          ▼
[3. SwitchNode]  ← evaluasi 3 kondisi langsung (OR logic)
    |
    ├─ Case 1: Serious_Alarm_Output == 1  ─┐
    ├─ Case 2: Air_Return_Temperature > 28 ─┼──▶ [4. ControlNode: Relay 3 → ON]
    ├─ Case 3: Air_Outlet_Temperature > 25 ─┘
    │
    └─ Default (semua normal)
                  |
                  ▼
         [5. DelayNode: 60 detik]
                  |
                  ▼
         [6. ControlNode: Relay 3 → OFF]
```

> **Logika OR pada SwitchNode:** Case 1, 2, dan 3 semuanya mengarah ke node yang sama (Relay ON). Jika salah satu case terpenuhi, fan langsung ON. Jika tidak ada satupun yang terpenuhi, masuk ke Default → delay 60 detik → fan OFF.

> **Kenapa DelayNode (hysteresis)?** Tanpa delay, fan akan ON-OFF-ON-OFF setiap kali nilai cooling berfluktuasi di sekitar threshold. Delay 60 detik memastikan fan baru dimatikan setelah kondisi benar-benar stabil.

### Detail Node

| # | Node | Type | Yang Dikonfigurasi |
|---|---|---|---|
| 1 | Cooling data input | `inputNode` | Topic: `smartrack/cooling/1`, Key: `Serious_Alarm_Output` |
| 2 | Extract semua field | `extractFieldsNode` | Fields: `Serious_Alarm_Output`, `Air_Return_Temperature`, `Air_Outlet_Temperature` |
| 3 | Evaluasi kondisi | `switchNode` | 3 case + 1 default (lihat tabel di bawah) |
| 4 | Fan ON | `controlNode` | Device: RELAYMINI/1, Key: `relay_3`, Action: ON |
| 5 | Hysteresis delay | `delayNode` | 60 detik |
| 6 | Fan OFF | `controlNode` | Device: RELAYMINI/1, Key: `relay_3`, Action: OFF |

### SwitchNode — Konfigurasi Case

| Case | Field | Operator | Value | Edge ke |
|---|---|---|---|---|
| Case 1 | `Serious_Alarm_Output` | `==` | `1` | Node 4 (Relay ON) |
| Case 2 | `Air_Return_Temperature` | `>` | `28` | Node 4 (Relay ON) |
| Case 3 | `Air_Outlet_Temperature` | `>` | `25` | Node 4 (Relay ON) |
| Default | — | — | — | Node 5 (Delay 60s) |

> **Threshold suhu (28°C inlet / 25°C outlet) perlu dikonfirmasi** sesuai spesifikasi desain cooling rack.

---

## AUTO-04 — Rotary Alarm berdasarkan Emergency

**Input:** DI5 (DRYCONTACT)
**Output:** Relay 2 (RELAYMINI)
**Logika:** Rotary ON saat DI5 aktif, OFF setelah clear/reset

### Node Flow

```
[InputNode: DRYCONTACT/1 → DI5]
        |
        ├─ (DI5 == 1) ──→ [ControlNode: Relay 2 → ON]
        │
        └─ (DI5 == 0) ──→ [ControlNode: Relay 2 → OFF]
```

### Detail Node

| # | Node | Type | Config |
|---|---|---|---|
| 1 | Emergency input | `inputNode` | Device: DRYCONTACT/1, Key: `DI5` |
| 2 | Switch | `switchNode` | Left: DI5, case: `== 1` / default |
| 3 | Rotary ON | `controlNode` | RELAYMINI/1, relay_2, ON |
| 4 | Rotary OFF | `controlNode` | RELAYMINI/1, relay_2, OFF |

### Edge Conditions

| Edge | Field | Operator | Value |
|---|---|---|---|
| Emergency aktif → ON | `DI5` | `==` | `1` |
| Clear/reset → OFF | `DI5` | `==` | `0` |

> AUTO-04 adalah automation paling sederhana — satu input, dua jalur output.

---

## AUTO-05 — Control RGB Controller berdasarkan Alarm Severity

**Input:** Alarm severity aggregate (dari UPS, Cooling, PDU, Sensor)
**Output:** Modbus RTU RGB Controller (MQTT command)
**Logika:**
- 🔴 CRITICAL → Merah: ada alarm critical (UPS, cooling serius)
- 🟡 MINOR → Kuning: ada alarm minor
- 🟢 NORMAL → Hijau: tidak ada alarm
- Priority: critical > minor > normal

### Key Alarm yang Perlu Di-aggregate

**Dari UPS (`smartrack/ups/1`):**
```
value.On_Battery_Alarm           → 1 = critical
value.Low_Battery_Alarm          → 1 = critical
value.Depleted_Battery_Alarm     → 1 = critical
value.General_Fault_Alarm        → 1 = critical
value.Input_Bad_Alarm            → 1 = minor
value.Output_Bad_Alarm           → 1 = minor
value.Charger_Failed_Alarm       → 1 = minor
value.Communications_Lost_Alarm  → 1 = minor
```

**Dari Cooling (`smartrack/cooling/1`):**
```
value.Serious_Alarm_Output       → 1 = critical
value.Common_Alarm_Output        → 1 = minor
value.AL49_Fire_Smoke_Alarm      → 1 = critical
value.AL55_Water_On_Floor        → 1 = critical
```

**Dari PDU (`smartrack/rackpdu/1`):**
```
value.output_current_1           → threshold check → minor/critical
value.output_current_2           → threshold check → minor/critical
value.inlet_voltage              → threshold check → minor
```

### Node Flow

```
[InputNode: UPS → alarm fields]   [InputNode: Cooling → alarm fields]   [InputNode: PDU → current/voltage]
        |                                    |                                      |
        └────────────── [EnrichmentNode: merge semua alarm ke satu context] ───────┘
                                             |
                              [AnalyticsNode: hitung severity aggregate]
                              (critical jika ada alarm critical; minor jika ada minor)
                                             |
                                    [SwitchNode: severity level]
                                    /           |            \
                              (critical)      (minor)      (normal)
                                  ↓             ↓              ↓
                        [ActionNode:      [ActionNode:    [ActionNode:
                         MQTT publish      MQTT publish    MQTT publish
                         RGB = RED]        RGB = YELLOW]   RGB = GREEN]
```

### Detail Node

| # | Node | Type | Config |
|---|---|---|---|
| 1 | UPS alarm source | `inputNode` | Topic: ups/1, Key: `On_Battery_Alarm` (dan lainnya) |
| 2 | Cooling alarm source | `inputNode` | Topic: cooling/1, Key: `Serious_Alarm_Output` |
| 3 | PDU source | `inputNode` | Topic: rackpdu/1, Key: `output_current_1` |
| 4 | Merge context | `enrichmentNode` | Gabungkan semua alarm field ke payload |
| 5 | Hitung severity | `analyticsNode` | SumValues atau custom logic severity |
| 6 | Switch severity | `switchNode` | Case: critical / minor / default=normal |
| 7 | Publish Merah | `actionNode` | MQTT: `command/rgb`, payload: `{"color":"red"}` |
| 8 | Publish Kuning | `actionNode` | MQTT: `command/rgb`, payload: `{"color":"yellow"}` |
| 9 | Publish Hijau | `actionNode` | MQTT: `command/rgb`, payload: `{"color":"green"}` |

### Edge Conditions

| Edge | Field | Operator | Value |
|---|---|---|---|
| → Critical (Merah) | `severity` | `==` | `"critical"` |
| → Minor (Kuning) | `severity` | `==` | `"minor"` |
| → Normal (Hijau) | — | default | — |

---

## Checklist Implementasi

### Yang perlu diverifikasi dulu sebelum build:
- [ ] **Payload DRYCONTACT** — subscribe ke `DRYCONTACT/1`, konfirmasi nama key DI1, DI2, DI5
- [ ] **Payload RELAYMINI** — konfirmasi nama key relay channel (relay_1, relay_2, relay_3?)
- [ ] **Topic RGB Controller** — konfirmasi MQTT topic dan format payload untuk Modbus RTU RGB
- [ ] **Access Controller handle status** — topic dan key untuk status handle online (AUTO-02)
- [ ] **Threshold suhu** — konfirmasi nilai batas `Air_Return_Temperature` (inlet) dan `Air_Outlet_Temperature` (outlet) untuk AUTO-03

### Urutan build yang disarankan (termudah → tersulit):
1. **AUTO-04** — paling sederhana, 1 input 2 output
2. **AUTO-01** — 3 input OR logic, 1 output
3. **AUTO-02** — tambah audit log dan field existence check
4. **AUTO-03** — 3 direct threshold checks + hysteresis delay
5. **AUTO-05** — paling kompleks, multi-source aggregate + priority logic
