# SMARTRACK IoT Solutions — User Manual

> **Versi:** v1.2.0 Build 2026
> **Dokumen ini** adalah panduan pengguna lengkap untuk software SMARTRACK IoT Solutions. Setiap section disertai petunjuk **[SCREENSHOT]** sebagai panduan pengambilan gambar untuk presentasi Canva.

---

## Daftar Isi

1. [Pengenalan Software](#1-pengenalan-software)
2. [Login](#2-login)
3. [Dashboard Utama](#3-dashboard-utama)
4. [Dashboard Settings](#4-dashboard-settings)
5. [Infrastructure — Racks](#5-infrastructure--racks)
6. [Devices — Internal Devices](#6-devices--internal-devices)
7. [Devices — External Devices](#7-devices--external-devices)
8. [Devices — Access Controllers](#8-devices--access-controllers)
9. [Devices — Device Catalog & Library](#9-devices--device-catalog--library)
10. [Network — MQTT Monitoring](#10-network--mqtt-monitoring)
11. [Network — MQTT Config & Broker](#11-network--mqtt-config--broker)
12. [Network — Communication Setup](#12-network--communication-setup)
13. [Network — Payload Discovery](#13-network--payload-discovery)
14. [Security — Overview](#14-security--overview)
15. [Security — Alarm Management](#15-security--alarm-management)
16. [Maintenance — Schedule Management](#16-maintenance--schedule-management)
17. [Maintenance — Report](#18-maintenance--report)
18. [Report — Device Log](#19-report--device-log)
19. [Report — Alarm Log](#20-report--alarm-log)
20. [Report — Notification History](#21-report--notification-history)
21. [System Config — General Config](#22-system-config--general-config)
22. [System Config — User Management](#23-system-config--user-management)
23. [System Config — Manage Menu](#24-system-config--manage-menu)
24. [System Config — OTA Update](#25-system-config--ota-update)
25. [System Config — Power Analyzer](#26-system-config--power-analyzer)
26. [AI Insights](#27-ai-insights)
27. [Manage Rule Chains](#28-manage-rule-chains)
28. [Backup Management](#29-backup-management)
29. [Info](#30-info)

---

## 1. Pengenalan Software

**SMARTRACK IoT Solutions** adalah platform monitoring dan kontrol infrastruktur data center generasi berikutnya. Software ini dirancang untuk memantau, mengelola, dan menganalisis seluruh perangkat dan infrastruktur rack secara real-time melalui antarmuka web yang modern.

### Apa yang bisa dilakukan SMARTRACK?

| Kemampuan | Deskripsi |
|-----------|-----------|
| **Real-time Monitoring** | Memantau status perangkat, suhu, daya, dan jaringan secara langsung via MQTT |
| **Multi-Rack Management** | Mengelola banyak rack sekaligus dalam satu platform terpusat |
| **Modbus Integration** | Komunikasi dengan perangkat industri menggunakan protokol Modbus RTU/TCP |
| **AI-Powered Insights** | Analitik cerdas dan rekomendasi berbasis kecerdasan buatan |
| **RBAC Security** | Kontrol akses berbasis peran (Role-Based Access Control) |
| **Alarm & Security** | Manajemen alarm dan kontrol akses fisik |
| **Maintenance Scheduler** | Penjadwalan dan pelaporan pemeliharaan terpadu |
| **Dashboard Kustom** | Widget dashboard yang dapat dikonfigurasi sesuai kebutuhan |

> **[SCREENSHOT: Halaman login atau splash screen SMARTRACK — tampilkan branding utama software]**

---

## 2. Login

**Fungsi:** Autentikasi pengguna sebelum mengakses sistem.
**URL:** `/login`

> **[SCREENSHOT: Tampilan penuh halaman login — tampilkan form login dan panel fitur di sebelah kiri]**

### Tampilan Halaman Login

Halaman login dibagi dua bagian:

- **Kiri:** Panel informasi — menampilkan nama software, versi, dan 4 fitur unggulan
- **Kanan:** Form login — input email, password, dan tombol masuk

### Cara Login

1. Buka browser dan akses alamat IP/domain server SMARTRACK
2. Masukkan **Email** pada field yang tersedia
3. Masukkan **Password** (klik ikon mata untuk melihat/menyembunyikan)
4. Centang **Remember Me** jika ingin tetap login
5. Klik tombol **Sign In**

> **[SCREENSHOT: Form login dengan field email dan password terisi — zoom pada card login]**

### Akun Default (untuk Demo/Testing)

Klik tombol **"Use Preset Admin Account"** untuk mengisi otomatis:

- **Email:** `admin@smartrack.com`
- **Password:** `admin123`

> ⚠️ **Penting:** Ganti password default setelah pertama kali login untuk keamanan sistem.

### Lupa Password

1. Klik link **"Forgot password?"**
2. Masukkan email yang terdaftar
3. Ikuti instruksi reset password yang dikirim ke email

---

## 3. Dashboard Utama

**Fungsi:** Halaman utama yang menampilkan ringkasan kondisi seluruh infrastruktur dalam bentuk widget yang dapat dikustomisasi.
**Akses:** Klik logo SMARTRACK atau menu **Dashboard** di sidebar

> **[SCREENSHOT: Tampilan penuh Dashboard Utama — tampilkan semua widget aktif]**

### Apa yang Ditampilkan Dashboard?

Dashboard menampilkan data real-time dalam bentuk widget, antara lain:

- Status daya dan konsumsi energi
- Kondisi pendinginan (cooling)
- Status UPS
- Emisi karbon
- Peringatan dan alarm aktif
- Kapasitas rack

### Fitur Utama

- **Multi-Profile Dashboard:** Beralih antar profil dashboard yang berbeda (misal: tampilan harian vs mingguan)
- **Widget Modular:** Setiap kotak informasi adalah widget yang bisa diaktifkan/nonaktifkan
- **Layout Responsif:** Tampilan menyesuaikan ukuran layar secara otomatis
- **Refresh Real-time:** Data diperbarui otomatis tanpa perlu reload halaman

> **[SCREENSHOT: Bagian atas dashboard — tampilkan tab profil dan tombol edit layout]**

### Cara Berpindah Profil Dashboard

1. Lihat **tab di bagian atas** halaman dashboard
2. Klik nama profil yang ingin ditampilkan (misal: "Overview", "Power", "Cooling")
3. Dashboard akan memuat widget sesuai profil yang dipilih

> **[SCREENSHOT: Tab profil dashboard yang aktif — highlight tab yang sedang dipilih]**

---

## 4. Dashboard Settings

**Fungsi:** Mengkonfigurasi widget apa saja yang tampil di dashboard dan mengatur tata letaknya.
**Akses:** Sidebar → **Dashboard Settings**

> **[SCREENSHOT: Tampilan halaman Dashboard Settings dengan daftar widget]**

### Fitur Utama

- **Enable/Disable Widget:** Aktifkan atau nonaktifkan widget tertentu
- **Drag & Drop Layout:** Atur posisi dan ukuran widget secara visual
- **Widget Properties:** Setiap widget memiliki pengaturan spesifik (warna, sumber data, dll)
- **Simpan Layout:** Simpan konfigurasi layout untuk digunakan kembali

### Cara Menambah/Mengatur Widget

1. Buka **Dashboard Settings**
2. Pada daftar widget, toggle switch untuk mengaktifkan widget yang diinginkan
3. Klik **Edit Layout** untuk masuk ke mode drag-and-drop
4. Seret widget ke posisi yang diinginkan, ubah ukuran dengan menarik sudut widget
5. Klik **Save** untuk menyimpan perubahan

> **[SCREENSHOT: Mode edit layout — tampilkan widget yang sedang di-drag]**

---

## 5. Infrastructure — Racks

**Fungsi:** Mengelola seluruh rack fisik yang terdaftar dalam sistem, termasuk status, kapasitas, dan perangkat di dalamnya.
**Akses:** Sidebar → **Infrastructure** → **Racks**

> **[SCREENSHOT: Halaman daftar Racks — tampilkan grid/tabel semua rack]**

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Daftar Rack** | Tampilan semua rack dengan status aktif/tidak aktif |
| **Tambah Rack** | Form untuk mendaftarkan rack baru ke sistem |
| **Edit Rack** | Ubah nama, lokasi, kapasitas, dan konfigurasi rack |
| **Hapus Rack** | Menghapus rack yang sudah tidak digunakan |
| **Duplikasi Rack** | Salin konfigurasi rack yang sudah ada ke rack baru |
| **Visualisasi 3D** | Tampilan visual rack dalam bentuk 3D untuk memudahkan pemantauan |
| **Monitor Rack** | Lihat semua perangkat dan sensor dalam satu rack |

### Cara Menambah Rack Baru

1. Klik tombol **"+ Add Rack"** di sudut kanan atas
2. Isi form:
   - **Nama Rack:** identifikasi unik rack
   - **Lokasi:** ruangan atau zona rack berada
   - **Kapasitas (U):** jumlah unit rack (1U, 2U, dst)
   - **Keterangan:** deskripsi tambahan
3. Klik **Save** untuk menyimpan

> **[SCREENSHOT: Form tambah rack baru (modal/dialog)]**

### Cara Melihat Detail Rack

1. Klik nama atau kartu rack yang ingin dilihat
2. Halaman detail rack akan menampilkan:
   - Semua perangkat yang terpasang
   - Status sensor (suhu, kelembaban, daya)
   - Kapasitas yang terpakai vs tersedia

> **[SCREENSHOT: Halaman detail rack — tampilkan perangkat dan sensor di dalam rack]**

---

## 6. Devices — Internal Devices

**Fungsi:** Mengelola perangkat internal yang terhubung langsung ke sistem melalui protokol Modbus RTU/TCP atau I2C Modular.
**Akses:** Sidebar → **Devices** → **Internal Devices**

> **[SCREENSHOT: Halaman Internal Devices dengan tab Modbus dan Modular]**

### Tab Modbus

Perangkat yang berkomunikasi menggunakan protokol **Modbus RTU** (serial) atau **Modbus TCP** (jaringan).

**Contoh perangkat:** PDU (Power Distribution Unit), sensor suhu industri, modul relay, power meter.

> **[SCREENSHOT: Tab Modbus — tampilkan daftar perangkat Modbus]**

#### Cara Menambah Perangkat Modbus

1. Pilih tab **Modbus**
2. Klik **"+ Add Device"**
3. Isi konfigurasi:
   - **Nama Perangkat**
   - **Tipe Koneksi:** RTU (Serial) atau TCP (Network)
   - **Slave ID / Unit ID**
   - **Register Address** dan tipe register
4. Klik **Test Connection** untuk verifikasi
5. Klik **Save**

### Tab Modular

Perangkat modular yang terhubung melalui bus **I2C** — biasanya berupa sensor-sensor yang dipasang langsung pada board kontroler.

**Contoh perangkat:** Sensor suhu/kelembaban, sensor arus, sensor tegangan, sensor pintu.

> **[SCREENSHOT: Tab Modular — tampilkan daftar sensor modular]**

---

## 7. Devices — External Devices

**Fungsi:** Mengelola perangkat eksternal yang terhubung melalui jaringan (IP-based) atau protokol komunikasi lainnya.
**Akses:** Sidebar → **Devices** → **External Devices**

> **[SCREENSHOT: Halaman External Devices — tampilkan tabel perangkat eksternal]**

### Fitur Utama

- **Status Koneksi Real-time:** Indikator hijau/merah untuk setiap perangkat
- **Tambah Perangkat:** Daftarkan perangkat eksternal baru
- **Import/Export:** Impor daftar perangkat dari file atau ekspor ke file

### Cara Menambah Perangkat Eksternal

1. Klik **"+ Add Device"**
2. Masukkan:
   - **IP Address / Hostname**
   - **Port**
   - **Protokol komunikasi**
   - **Nama dan deskripsi**
3. Klik **Save**

---

## 8. Devices — Access Controllers

**Fungsi:** Mengelola sistem kontrol akses fisik seperti pintu, kunci elektrik, dan hak akses pengguna ke area tertentu.
**Akses:** Sidebar → **Devices** → **Access Controllers**

> **[SCREENSHOT: Halaman Access Controllers — tampilkan daftar controller dan status pintu]**

### Fitur Utama

- **Monitor Status Pintu:** Melihat pintu mana yang terbuka/tertutup/terkunci
- **Manajemen Controller:** Tambah dan konfigurasi controller akses
- **Assignment Pengguna:** Tentukan siapa yang berhak mengakses area tertentu
- **Log Akses:** Riwayat siapa masuk ke mana dan kapan

### Cara Mengelola Hak Akses

1. Pilih controller yang ingin dikonfigurasi
2. Klik **"Manage Users"**
3. Tambahkan atau hapus pengguna dari daftar yang diizinkan
4. Simpan perubahan

> **[SCREENSHOT: Dialog pengelolaan user pada access controller]**

---

## 9. Devices — Device Catalog & Library

**Fungsi:** Referensi katalog semua jenis perangkat yang didukung sistem, beserta spesifikasi teknisnya.
**Akses:** Sidebar → **Devices** → **Device Catalog** atau **Library**

> **[SCREENSHOT: Halaman Device Catalog — tampilkan grid katalog perangkat]**

### Fitur Utama

- **Browser Katalog:** Jelajahi semua jenis perangkat yang kompatibel
- **Filter Tipe:** Filter berdasarkan Modbus, Modular, External, dll
- **Spesifikasi Teknis:** Detail register address, parameter, dan cara konfigurasi
- **QR Scanner:** Scan QR code pada perangkat fisik untuk identifikasi otomatis

### Cara Menggunakan QR Scanner

1. Klik tombol **"Scan QR"** di pojok kanan atas
2. Izinkan akses kamera
3. Arahkan kamera ke QR code pada label perangkat
4. Sistem akan otomatis mengidentifikasi tipe perangkat dan mengisi form konfigurasi

> **[SCREENSHOT: QR Scanner aktif atau halaman detail spesifikasi perangkat]**

---

## 10. Network — MQTT Monitoring

**Fungsi:** Memantau status broker MQTT secara real-time, termasuk koneksi aktif, pesan masuk/keluar, dan topik yang aktif.
**Akses:** Sidebar → **Network** → **MQTT Monitoring**

> **[SCREENSHOT: Halaman MQTT Monitoring — tampilkan status broker dan metrics]**

### Apa itu MQTT?

**MQTT (Message Queuing Telemetry Transport)** adalah protokol komunikasi ringan yang digunakan perangkat IoT untuk mengirim data sensor ke server secara real-time. SMARTRACK menggunakan MQTT sebagai jalur utama penerimaan data dari semua perangkat.

### Informasi yang Ditampilkan

| Informasi | Deskripsi |
|-----------|-----------|
| **Status Broker** | Online / Offline / Connecting |
| **Alamat Broker** | IP address dan port broker MQTT |
| **Koneksi Aktif** | Jumlah klien yang sedang terhubung |
| **Message Rate** | Jumlah pesan per detik yang diproses |
| **Topik Aktif** | Daftar topik MQTT yang sedang menerima data |
| **Live Telemetry** | Pesan terbaru dari setiap topik |

> **[SCREENSHOT: Panel status broker dan metrics — zoom pada angka koneksi dan message rate]**

### Cara Membaca Live Telemetry

1. Scroll ke bagian **"Live Messages"** atau **"Topic Monitor"**
2. Pilih topik yang ingin dipantau
3. Pesan terbaru akan muncul secara real-time di bawah

---

## 11. Network — MQTT Config & Broker

**Fungsi:** Mengonfigurasi koneksi ke broker MQTT, termasuk autentikasi, QoS, dan manajemen topik.
**Akses:** Sidebar → **Network** → **MQTT Config** atau **MQTT Broker**

> **[SCREENSHOT: Halaman MQTT Config — tampilkan form konfigurasi broker]**

### Parameter Konfigurasi MQTT

| Parameter | Deskripsi |
|-----------|-----------|
| **Broker URL** | Alamat server MQTT (misal: `mqtt://192.168.1.100`) |
| **Port** | Port koneksi (default: 1883 untuk non-SSL, 8883 untuk SSL) |
| **Client ID** | Identifikasi unik klien SMARTRACK |
| **Username** | Username autentikasi broker (jika ada) |
| **Password** | Password autentikasi broker (jika ada) |
| **QoS Level** | Quality of Service: 0 (at most once), 1 (at least once), 2 (exactly once) |
| **Keep Alive** | Interval heartbeat dalam detik |
| **Clean Session** | Reset session saat koneksi baru |

### Cara Mengubah Konfigurasi MQTT

1. Isi semua parameter yang diperlukan
2. Klik **"Test Connection"** untuk memastikan koneksi berhasil
3. Jika berhasil, klik **"Save Configuration"**
4. Sistem akan restart koneksi MQTT secara otomatis

> **[SCREENSHOT: Hasil test connection berhasil — tampilkan notifikasi sukses]**

---

## 12. Network — Communication Setup

**Fungsi:** Mengatur protokol komunikasi keluar (output protocol) dari SMARTRACK ke sistem eksternal seperti BACnet, SNMP, atau protokol lainnya.
**Akses:** Sidebar → **Network** → **Communication Setup**

> **[SCREENSHOT: Halaman Communication Setup — tampilkan daftar protokol yang tersedia]**

### Protokol yang Didukung

- **BACnet/IP** — Untuk integrasi dengan sistem BMS (Building Management System)
- **SNMP** — Untuk monitoring via Network Management System
- **Modbus TCP Server** — Expose data sebagai Modbus server
- **REST API** — Kirim data ke sistem eksternal via HTTP

### Cara Mengaktifkan Protokol

1. Pilih protokol yang ingin diaktifkan
2. Klik tombol toggle atau **"Configure"**
3. Isi parameter spesifik protokol (port, address, community string, dll)
4. Klik **Save** dan aktifkan

---

## 13. Network — Payload Discovery

**Fungsi:** Melakukan discovery otomatis terhadap topik-topik MQTT yang aktif dan memetakan payload data yang diterima.
**Akses:** Sidebar → **Network** → **Payload Discovery**

> **[SCREENSHOT: Halaman Payload Discovery — tampilkan hasil scan topik MQTT]**

### Cara Menggunakan Payload Discovery

1. Klik **"Start Discovery"**
2. Sistem akan memindai semua pesan MQTT yang masuk selama beberapa detik
3. Hasil berupa daftar topik beserta contoh payload-nya
4. Klik topik untuk melihat struktur data secara detail
5. Gunakan hasil ini untuk mengonfigurasi mapping data perangkat baru

---

## 14. Security — Overview

**Fungsi:** Halaman ringkasan modul keamanan — Alarm dan Kontrol Akses — dalam satu tampilan.
**Akses:** Sidebar → **Security**

> **[SCREENSHOT: Halaman Security Overview — tampilkan modul keamanan]**

### Panel yang Ditampilkan

- **Alarm Aktif:** Jumlah alarm yang sedang aktif beserta tingkat keparahannya
- **Kontrol Akses:** Status door controller dan akses terbaru
- **Quick Links:** Tombol langsung ke sub-modul keamanan

---

---

## 16. Security — Alarm Management

**Fungsi:** Mengonfigurasi aturan alarm, melihat alarm aktif, dan mengatur notifikasi yang dikirim saat alarm terpicu.
**Akses:** Sidebar → **Security** → **Alarm Management**

> **[SCREENSHOT: Halaman Alarm Management — tampilkan daftar alarm aktif dan aturan]**

### Fitur Utama

| Fitur | Deskripsi |
|-------|-----------|
| **Daftar Alarm Aktif** | Alarm yang sedang berjalan dengan tingkat keparahan |
| **Aturan Alarm** | Kondisi yang memicu alarm (threshold suhu, daya, dll) |
| **Notifikasi** | Konfigurasi pengiriman notifikasi via email/SMS/push |
| **Acknowledge Alarm** | Tandai alarm sebagai sudah diketahui |
| **Riwayat Alarm** | Log semua alarm yang pernah terjadi |

### Cara Membuat Aturan Alarm Baru

1. Klik **"+ Add Rule"**
2. Pilih:
   - **Sumber Data:** perangkat/sensor mana yang dipantau
   - **Kondisi:** misal "suhu > 35°C" atau "daya > 10kW"
   - **Tingkat Keparahan:** Info / Warning / Critical
3. Atur **Notifikasi:** pilih channel dan penerima
4. Klik **Save**

> **[SCREENSHOT: Form pembuatan aturan alarm baru]**

---

## 17. Maintenance — Schedule Management

**Fungsi:** Menjadwalkan, mengelola, dan melacak kegiatan pemeliharaan perangkat dan infrastruktur.
**Akses:** Sidebar → **Maintenance** → **Schedule Management**

> **[SCREENSHOT: Halaman Maintenance Schedule — tampilkan kalender atau daftar jadwal]**

### Fitur Utama

- **Kalender Pemeliharaan:** Tampilan kalender bulanan dengan semua jadwal
- **Tambah Jadwal:** Buat jadwal pemeliharaan baru dengan detail tugas
- **Assignment Teknisi:** Tetapkan siapa yang bertanggung jawab
- **Status Tugas:** Pending / In Progress / Completed / Overdue
- **Riwayat:** Lihat semua pemeliharaan yang sudah dilakukan

### Cara Membuat Jadwal Pemeliharaan

1. Klik **"+ Add Schedule"** atau klik langsung pada tanggal di kalender
2. Isi form:
   - **Judul Tugas**
   - **Perangkat/Rack** yang akan dimaintenance
   - **Tanggal & Waktu**
   - **Teknisi Penanggungjawab**
   - **Deskripsi Pekerjaan**
3. Klik **Save**

> **[SCREENSHOT: Form tambah jadwal maintenance]**

---

## 18. Maintenance — Report

**Fungsi:** Laporan hasil kegiatan pemeliharaan yang telah dilakukan.
**Akses:** Sidebar → **Maintenance** → **Report**

> **[SCREENSHOT: Halaman Maintenance Report — tampilkan daftar laporan]**

### Fitur Utama

- **Filter Tanggal:** Lihat laporan berdasarkan rentang tanggal
- **Filter Teknisi:** Tampilkan laporan per teknisi
- **Detail Laporan:** Klik laporan untuk melihat detail pekerjaan
- **Export:** Unduh laporan ke format PDF atau CSV

---

## 19. Report — Device Log

**Fungsi:** Log historis operasional semua perangkat — data telemetri, perubahan status, dan event.
**Akses:** Sidebar → **Report** → **Device Log Report**

> **[SCREENSHOT: Halaman Device Log — tampilkan tabel log dengan filter]**

### Cara Membaca Log

1. Gunakan **filter tanggal** untuk menentukan rentang waktu
2. Pilih **perangkat** spesifik yang ingin dilihat log-nya
3. Gunakan **filter tipe event** (data, status, error, dll)
4. Klik **Apply** untuk memperbarui hasil

### Cara Export Log

1. Setelah filter diterapkan, klik **"Export"**
2. Pilih format: **CSV** atau **Excel**
3. File akan otomatis terunduh

> **[SCREENSHOT: Tabel log yang sudah difilter — zoom pada baris data dan tombol export]**

---

## 20. Report — Alarm Log

**Fungsi:** Riwayat lengkap semua alarm keamanan yang pernah terjadi di sistem.
**Akses:** Sidebar → **Report** → **Alarm Log Reports**

> **[SCREENSHOT: Halaman Alarm Log — tampilkan timeline atau tabel alarm]**

### Informasi yang Tersedia

- Waktu alarm terpicu dan diselesaikan
- Sumber alarm (perangkat/sensor mana)
- Tingkat keparahan (Info / Warning / Critical)
- Siapa yang mengacknowledge alarm
- Durasi alarm berlangsung

---

## 21. Report — Notification History

**Fungsi:** Riwayat semua notifikasi yang pernah dikirim sistem (email, SMS, push notification).
**Akses:** Sidebar → **Report** → **Notification History**

> **[SCREENSHOT: Halaman Notification History — tampilkan daftar notifikasi yang terkirim]**

### Cara Menggunakan

1. Filter berdasarkan **tanggal**, **channel** (email/SMS), atau **status** (terkirim/gagal)
2. Klik baris notifikasi untuk melihat isi pesan lengkap
3. Gunakan ini untuk memverifikasi bahwa notifikasi penting sudah tersampaikan

---

## 22. System Config — General Config

**Fungsi:** Pengaturan umum sistem seperti sinkronisasi waktu, pengaturan tampilan layar, dan monitoring resource server.
**Akses:** Sidebar → **System Config** → **General Config**

> **[SCREENSHOT: Halaman General Config dengan tab-tab pengaturan]**

### Tab RTC / Time Sync

Sinkronisasi jam sistem dengan server NTP.

1. Masukkan **NTP Server** (default: `pool.ntp.org`)
2. Pilih **Timezone**
3. Klik **Sync Now** untuk sinkronisasi manual
4. Klik **Save** untuk menyimpan pengaturan

> **[SCREENSHOT: Tab RTC / Time Sync]**

### Tab Screen Settings

Konfigurasi tampilan layar untuk deployment pada display khusus (kiosk mode).

- **Brightness:** Kecerahan layar
- **Screen Timeout:** Waktu hingga layar mati otomatis
- **Orientation:** Portrait / Landscape

### Tab System Monitoring

Memantau kondisi resource server SMARTRACK.

- **CPU Usage:** Persentase penggunaan prosesor
- **RAM Usage:** Penggunaan memori
- **Disk Usage:** Kapasitas penyimpanan yang terpakai
- **Network I/O:** Trafik jaringan server

> **[SCREENSHOT: Tab System Monitoring — tampilkan grafik CPU, RAM, dan Disk]**

---

## 23. System Config — User Management

**Fungsi:** Mengelola akun pengguna yang dapat mengakses sistem SMARTRACK, termasuk peran dan hak akses.
**Akses:** Sidebar → **System Config** → **User Management**

> **[SCREENSHOT: Halaman User Management — tampilkan tabel daftar pengguna]**

### Peran Pengguna (Roles)

| Role | Akses |
|------|-------|
| **Super Admin** | Akses penuh ke seluruh fitur dan konfigurasi |
| **Admin** | Akses ke sebagian besar fitur, kecuali konfigurasi sistem kritis |
| **Operator** | Monitoring dan kontrol perangkat, tidak bisa ubah konfigurasi |
| **Viewer** | Hanya bisa melihat data, tidak bisa melakukan perubahan |

### Cara Menambah Pengguna Baru

1. Klik **"+ Add User"**
2. Isi form:
   - **Nama Lengkap**
   - **Email** (digunakan sebagai username login)
   - **Password** (minimal 8 karakter, kombinasi huruf dan angka)
   - **Role:** pilih peran sesuai kebutuhan
3. Klik **Save** — pengguna baru bisa langsung login

> **[SCREENSHOT: Form tambah pengguna baru]**

### Cara Menonaktifkan Pengguna

1. Temukan pengguna di tabel
2. Klik toggle **Status** dari Active menjadi Inactive
3. Pengguna tidak bisa login tetapi data akun tetap tersimpan

---

## 24. System Config — Manage Menu

**Fungsi:** Mengkonfigurasi item menu navigasi yang tampil di sidebar — bisa disembunyikan atau diurutkan ulang sesuai kebutuhan.
**Akses:** Sidebar → **System Config** → **Manage Menu**

> **[SCREENSHOT: Halaman Manage Menu — tampilkan daftar item menu dengan toggle]**

### Cara Menggunakan

1. Daftar semua menu akan tampil
2. Toggle switch untuk menampilkan/menyembunyikan menu tertentu
3. Drag item untuk mengubah urutan
4. Klik **Save** untuk menerapkan perubahan

> **Catatan:** Perubahan menu dapat berdampak pada akses semua pengguna. Pastikan menu penting tetap aktif.

---

## 25. System Config — OTA Update

**Fungsi:** Melakukan pembaruan firmware/software SMARTRACK secara Over-The-Air (OTA) tanpa perlu akses fisik ke server.
**Akses:** Sidebar → **System Config** → **OTA**

> **[SCREENSHOT: Halaman OTA Update — tampilkan versi saat ini dan tombol cek update]**

### Cara Melakukan Update

1. Klik **"Check for Updates"**
2. Jika ada update tersedia, informasi versi baru akan tampil
3. Baca **Release Notes** untuk mengetahui perubahan
4. Klik **"Download & Install"**
5. Sistem akan restart otomatis setelah update selesai

> ⚠️ **Penting:** Lakukan backup sebelum update. Proses update akan menyebabkan downtime beberapa menit.

---

## 26. System Config — Power Analyzer

**Fungsi:** Alat analisis konsumsi daya infrastruktur — membantu mengidentifikasi perangkat boros daya dan mengoptimalkan penggunaan energi.
**Akses:** Sidebar → **System Config** → **Power Analyzer**

> **[SCREENSHOT: Halaman Power Analyzer — tampilkan grafik konsumsi daya]**

### Fitur Analisis

- **Total Konsumsi:** Daya total seluruh infrastruktur
- **Per-Rack Breakdown:** Konsumsi daya tiap rack
- **Trend Historis:** Grafik konsumsi dari waktu ke waktu
- **Peak Analysis:** Identifikasi waktu puncak penggunaan daya
- **Efisiensi PUE:** Power Usage Effectiveness data center

---

## 27. AI Insights

**Fungsi:** Asisten AI cerdas yang dapat menjawab pertanyaan tentang kondisi infrastruktur, memberikan analisis, dan rekomendasi tindakan.
**Akses:** Sidebar → **AI Insights**

> **[SCREENSHOT: Halaman AI Insights — tampilkan antarmuka chat dengan AI]**

### Apa yang Bisa Ditanyakan ke AI?

- "Rack mana yang paling banyak mengonsumsi daya minggu ini?"
- "Apakah ada anomali suhu pada perangkat server rack A?"
- "Berikan rekomendasi untuk mengurangi konsumsi energi"
- "Kapan maintenance terakhir dilakukan pada rack B?"
- "Prediksi kapasitas rack dalam 3 bulan ke depan"

### Cara Menggunakan AI Insights

1. Ketik pertanyaan di kotak teks di bagian bawah
2. Tekan **Enter** atau klik tombol kirim
3. AI akan menganalisis data sistem dan memberikan jawaban
4. Riwayat percakapan tersimpan dan bisa diakses kembali

> **[SCREENSHOT: Contoh percakapan dengan AI — tampilkan pertanyaan dan jawaban AI]**

### Multi-Session Chat

- Setiap sesi chat tersimpan secara terpisah
- Klik **"+ New Chat"** untuk memulai percakapan baru
- Klik riwayat chat di panel kiri untuk melanjutkan diskusi sebelumnya

---

## 28. Manage Rule Chains

**Fungsi:** Membuat dan mengelola aturan otomasi (rule chains) — logika kondisi-aksi yang berjalan otomatis saat kondisi tertentu terpenuhi.
**Akses:** Sidebar → **Manage Rule Chains**

> **[SCREENSHOT: Halaman Rule Chains — tampilkan daftar rule chain dan editor visual]**

### Apa itu Rule Chain?

Rule Chain adalah rangkaian aturan otomatis berupa: **"Jika [kondisi] terjadi, maka lakukan [aksi]"**

**Contoh penggunaan:**

- Jika suhu rack > 40°C → kirim notifikasi ke admin + aktifkan alarm
- Jika UPS baterai < 20% → kirim peringatan ke tim teknis
- Jika pintu server room terbuka > 5 menit → trigger alarm keamanan

### Cara Membuat Rule Chain

1. Klik **"+ New Rule Chain"**
2. Beri nama rule chain
3. Gunakan editor visual untuk membangun logika:
   - **Drag node kondisi** (Trigger) ke canvas
   - **Drag node aksi** (Action) ke canvas
   - **Hubungkan** node kondisi ke node aksi
4. Konfigurasi setiap node dengan parameter spesifik
5. Klik **"Save & Activate"**

> **[SCREENSHOT: Editor visual rule chain — tampilkan node kondisi dan aksi yang terhubung]**

### Mengaktifkan/Menonaktifkan Rule Chain

- Toggle switch pada daftar rule chain untuk mengaktifkan atau menonaktifkan
- Rule chain yang nonaktif tidak akan dieksekusi meskipun kondisi terpenuhi

---

## 29. Backup Management

**Fungsi:** Membuat, mengelola, dan memulihkan backup konfigurasi dan data sistem SMARTRACK.
**Akses:** Sidebar → **Backup Management**

> **[SCREENSHOT: Halaman Backup Management — tampilkan daftar backup dan tombol aksi]**

### Jenis Backup

| Tipe | Isi |
|------|-----|
| **Full Backup** | Seluruh konfigurasi + data historis |
| **Config Backup** | Hanya konfigurasi sistem (lebih cepat dan kecil) |
| **Scheduled Backup** | Backup otomatis terjadwal |

### Cara Membuat Backup Manual

1. Klik **"Create Backup"**
2. Pilih tipe backup
3. Tambahkan keterangan (opsional)
4. Klik **"Start Backup"**
5. Tunggu proses selesai — file backup akan muncul di daftar

> **[SCREENSHOT: Progress pembuatan backup]**

### Cara Restore Backup

1. Temukan backup yang ingin dipulihkan di daftar
2. Klik **"Restore"**
3. Konfirmasi tindakan (akan menimpa data saat ini)
4. Sistem akan restart setelah restore selesai

> ⚠️ **Perhatian:** Restore akan menimpa semua konfigurasi dan data saat ini. Pastikan backup yang dipilih adalah yang benar.

---

## 30. Info

**Fungsi:** Menampilkan informasi teknis sistem — versi software, tech stack, dependensi, dan informasi deployment.
**Akses:** Sidebar → **Info**

> **[SCREENSHOT: Halaman Info — tampilkan versi software dan tech stack]**

### Informasi yang Tersedia

- **Versi Software:** Nomor versi dan build date
- **Tech Stack:** Framework, database, dan library yang digunakan
- **Server Info:** Versi Node.js, OS, dan resource
- **Lisensi:** Informasi lisensi software
- **Kontak Support:** Informasi kontak tim support SMARTRACK

---

## Panduan Screenshot untuk Canva

Berikut adalah daftar lengkap screenshot yang perlu diambil untuk melengkapi presentasi Canva:

### Checklist Screenshot

| No | Halaman | Deskripsi Screenshot | Prioritas |
|----|---------|---------------------|-----------|
| 1 | Login | Tampilan penuh halaman login | ⭐⭐⭐ Wajib |
| 2 | Login | Zoom card login (form email/password) | ⭐⭐ |
| 3 | Dashboard | Tampilan penuh dashboard dengan semua widget | ⭐⭐⭐ Wajib |
| 4 | Dashboard | Tab profil dashboard | ⭐⭐ |
| 5 | Dashboard Settings | Daftar widget dan toggle | ⭐⭐ |
| 6 | Dashboard Settings | Mode edit layout (drag-drop) | ⭐⭐ |
| 7 | Racks | Daftar semua rack (grid view) | ⭐⭐⭐ Wajib |
| 8 | Racks | Detail satu rack (perangkat di dalamnya) | ⭐⭐⭐ Wajib |
| 9 | Racks | Form tambah rack baru | ⭐⭐ |
| 10 | Internal Devices | Tab Modbus — daftar perangkat | ⭐⭐⭐ Wajib |
| 11 | Internal Devices | Tab Modular — daftar sensor | ⭐⭐ |
| 12 | External Devices | Tabel perangkat eksternal + status | ⭐⭐ |
| 13 | MQTT Monitoring | Status broker + metrics real-time | ⭐⭐⭐ Wajib |
| 14 | MQTT Config | Form konfigurasi broker | ⭐⭐ |
| 15 | Security Overview | Panel ringkasan keamanan | ⭐⭐⭐ Wajib |
| 16 | Alarm Management | Daftar alarm aktif | ⭐⭐⭐ Wajib |
| 18 | Alarm Management | Form aturan alarm baru | ⭐⭐ |
| 19 | Maintenance | Kalender jadwal maintenance | ⭐⭐ |
| 20 | Device Log | Tabel log dengan filter aktif | ⭐⭐ |
| 21 | User Management | Tabel daftar pengguna | ⭐⭐⭐ Wajib |
| 22 | User Management | Form tambah pengguna | ⭐⭐ |
| 23 | General Config | Tab system monitoring (grafik resource) | ⭐⭐ |
| 24 | AI Insights | Antarmuka chat dengan contoh percakapan | ⭐⭐⭐ Wajib |
| 25 | Rule Chains | Editor visual rule chain | ⭐⭐⭐ Wajib |
| 26 | Backup Management | Daftar backup dan progress | ⭐⭐ |

### Tips Pengambilan Screenshot

1. **Gunakan mode light/dark** yang konsisten untuk semua screenshot
2. **Resolusi minimal 1920×1080** untuk kualitas terbaik di Canva
3. **Pastikan ada data contoh** — jangan screenshot halaman kosong
4. **Crop/zoom** pada fitur utama jika tampilan terlalu penuh
5. **Gunakan browser full-screen** (F11) untuk menghilangkan toolbar browser
6. **Untuk tabel:** pastikan beberapa baris data terisi agar terlihat realistis

---

## Informasi Kontak & Support

Untuk pertanyaan, laporan bug, atau permintaan fitur, hubungi tim SMARTRACK melalui:

- **Email Support:** <support@smartrack.com>
- **Dokumentasi Online:** [Tersedia di portal SMARTRACK]
- **Versi Dokumen:** v1.2.0 — April 2026

---

*Dokumen ini dibuat sebagai panduan referensi untuk pembuatan materi presentasi Canva. Semua placeholder [SCREENSHOT] harus digantikan dengan tangkapan layar aktual dari sistem SMARTRACK yang sedang berjalan.*
