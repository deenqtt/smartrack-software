# Requirement & Bug Fix Checklist

## Login Page

- [x] Halaman login tidak support light mode — full light/dark mode support ditambahkan
- [x] Fungsi forget password dihapus — fitur, API route (`/api/auth/forgot-password`, `/api/auth/reset-password`), dan halaman `/reset-password` dihapus bersih
- [x] Fungsi "Remember Me" diperbaiki:
  - Checked = persistent cookie 30 hari
  - Unchecked = session cookie (hilang saat browser ditutup)
  - Label di UI menampilkan durasi aktif: "(30 days)" atau "(session only)"
- [x] Icon logo menyesuaikan tema — light mode pakai `icon1.svg`, dark mode pakai `icon2.svg`

## Sidebar

- [x] Default sidebar collapsed agar tampilan dashboard full-sized

## 3D Dashboard

- [x] Button INFO pada toolbar control 3D dashboard tidak berfungsi — dibuat RackInfoModal terpisah (menampilkan nama, kapasitas, utilisasi per rack)
- [x] Display setting rack color/style error putih — glass door white rack diperbaiki: sebelumnya solid opaque putih (devices tidak kelihatan), sekarang semi-transparent light blue tint (konsisten dengan dark rack)

## Rack Management

- [x] Saat create rack, field Location/Notes kosong gagal save — fix: tambah `.nullable()` pada Zod schema `notes` di API
- [x] Gagal update rack error 500 — fix: hapus manual `updatedAt = new Date()` yang konflik dengan Prisma `@updatedAt`
- [x] Gagal duplicate rack — sama dengan fix notes nullable di atas
- [x] Gagal delete rack — confirmed working
- [x] Halaman `/infrastructure/racks/[id]` tidak support light mode — full light/dark mode support ditambahkan
- [x] Hapus button: Config, Duplicate, Monitor All — dihapus dari header [id] page

## Report

- [x] Halaman `/report/devices-log-report` — tab "Custom Log" dihapus: CustomLogsTable component, DataChart widget, `logToDb` case di rule chain action executor, dan referensi di WidgetRenderer/WidgetConfigSelector
- [x] Tab wrapper dihapus dari devices-log-report (hanya 1 tab tersisa) — konten device logs langsung tampil tanpa Tabs component
- [x] Model `ManualLoggedData` dihapus dari Prisma schema + `/api/logging/route.ts` dihapus — database di-push ulang

## User & Role Management

- [x] Menu "Manage" tidak perlu ditampilkan ke user biasa — buat preset role untuk membedakan akses user dan admin
  - `ADMIN_ONLY_ITEMS` ditambahkan di `scripts/seed-menu.js`: `system-user-management`, `system-general-config`, `system-ota-management`
  - `canView` USER di-set `false` untuk ketiga item tersebut di DB (langsung update + seed diperbaiki)
  - Fix `update: {}` → `update: { canView: ..., canCreate: false, ... }` di seed agar re-run benar-benar update existing records
  - Page guard ditambahkan: `user-management`, `general-config` (dikonversi ke client component), `ota` — semua return `<AccessDenied />` jika `canView: false`
- [x] Halaman `system-config/user-management` di-restyle sesuai tema mqtt-monitoring (rounded-[32px], font-black uppercase, stat cards dengan bg icon)

## Export / Import

### Pages dengan Export + Import (lengkap)

- [x] `devices-internal/modular` — Export client-side JSON, Import via MQTT (`importDevices` → `command_device_i2c`) → middleware restart `modular_i2c.service`
- [x] `devices-internal/modbus` — Export client-side JSON, Import via MQTT (`importDevices` → `command_device_modbus`) → middleware restart `MODBUS_SNMP.service`
- [x] `system-config/user-management` — Export + Import via `ImportExportButtons` → REST API
- [x] `devices/devices-for-logging` — Export + Import via `ImportExportButtons` → REST API
- [x] `security/alarm-management` — Export + Import via `ImportExportButtons` → REST API
- [x] `manage-rule-chains` — Export + Import via `ImportExportButtons` → REST API
- [x] `network/mqtt-config` — Export all + export single, Import via `ImportDialog` → REST API `/api/mqtt-config/import`
- [x] `system-config/manage-menu` — Export + Import via `ImportDialog` → REST API `/api/menu-management/import`
  - Restyle sesuai tema: rounded-[32px], font-black uppercase, stat cards dengan bg icon, page guard canView

### Pages Export only (log data, tidak perlu import)

- [x] `report/devices-log-report` — Export logs
- [x] `report/alarm-log-reports` — Export logs
- [x] `devices/access-controllers/[id]/users` — Export logs

### Fix & Middleware

- [x] Import button fix: pakai `useRef<HTMLInputElement>` + `ref.current?.click()` — pattern `<label asChild>` tidak trigger file picker
- [x] Handler `importDevices` ditambahkan ke production middleware `NexusNode_Middleware/CONFIG_SYSTEM_DEVICES/DeviceConfig.py` untuk `handle_modbus_snmp_message` & `handle_i2c_message`
- [x] Support `mode: 'add_only'` (skip duplikat by name) dan `mode: 'replace_all'` (overwrite semua)

## Seed / Config

- [x] Seed sudah lengkap: users, permissions, menu, devices, racks, mqtt-config, logging-configs, bill-configs, alarms, templates (rulechains/layout2d/scada/dashboard)
