# Dokumentasi MQTT API - Device Config

Dokumen ini menjelaskan spesifikasi antarmuka MQTT untuk mengambil daftar perangkat yang sudah ter-install di sistem (berdasarkan tipe modul: Modbus atau Modular I2C).

Sistem menyediakan **dua cara utama** untuk mengambil list perangkat. Cara mana yang digunakan tergantung pada kebutuhan di frontend/klien.

---

## 1. Mode Standar / Manajemen (Direct CRUD API)
Mode ini digunakan jika Anda membutuhkan data Mentah/Lengkap persis seperti di database JSON (seperti untuk keperluan form Edit/Create). Data dikembalikan secara native, terpisah antara `profile` dan `protocol_setting`.

### A. Mendapatkan Daftar Perangkat "Modbus"
- **Topic Request:** `command_device_modbus`
- **Topic Response:** `response_device_modbus`
- **Bentuk Data Request (Payload):**
  ```json
  {
    "command": "getDataModbus"
  }
  ```
- **Bentuk Data Response:**
  ```json
  [
    {
      "profile": { 
        "name": "dummy_ups", 
        "device_type": "ups", 
        "manufacturer": "Hitachi", 
        "part_number": "HM33",
        "topic": "smartrack/ups/ups_1", 
        "interval_publish": 60, 
        "qos": 1
      }, 
      "protocol_setting": { 
        "protocol": "Modbus RTU", 
        "address": 1, 
        ...
      }
    }
  ]
  ```

### B. Mendapatkan Daftar Perangkat "Modular (I2C)"
- **Topic Request:** `command_device_i2c`
- **Topic Response:** `response_device_i2c`
- **Bentuk Data Request (Payload):**
  ```json
  {
    "command": "getDataI2C"
  }
  ```
- **Bentuk Data Response:** Array Object Original (mirip strukturnya dengan Modbus, dipisah `profile` dan `protocol_setting`).

---

## 2. Mode Ternormalisasi (API "Available Devices") 
**[👉 SANGAT DISARANKAN UNTUK DASHBOARD/WIDGET/MAP]**

Mode ini merubah tipe data dari database menjadi standarisasi flat array 1 tingkat. Berguna untuk membuat daftar ringan di UI tanpa memilah object bertingkat, di mana setiap list akan selalu memiliki *id, name, address, dll.*

Pola komunikasinya: Anda nge-request ke **1 topik request tunggal**, lalu server akan mengirim output (*broadcast*) ke **topik target masing-masing** (bukan ke response biasa).

**Topik Request Tunggal (Untuk Keduanya):** `command_available_devices`

### A. Meminta Daftar Perangkat Modbus Saja
- **Payload Request:**
  ```json
  {
    "command": "get_modbus_availables"
  }
  ```
- **Topic Response Target (Tempat Anda mendengarkan/Subscribe):** `MODBUS_DEVICE/AVAILABLES`
- **Bentuk Data Response:** Flat Array
  ```json
  [
    {
      "id": "89f22b40-e242-447e-86a4-65727ebd2d4d", 
      "name": "cooling_dummy_1", 
      "address": "192.168.0.134", 
      "device_bus": 0, 
      "part_number": "ACRMD4KI", 
      "mac": "", 
      "manufacturer": "Schneider", 
      "device_type": "aircond", 
      "topic": "smartrack/cooling/1"
    }
  ]
  ```

### B. Meminta Daftar Perangkat Modular Saja
- **Payload Request:**
  ```json
  {
    "command": "get_modular_availables"
  }
  ```
- **Topic Response Target:** `MODULAR_DEVICE/AVAILABLES`
- **Bentuk Data Response:** Flat Array
  ```json
  [
    {
      "id": "1dbe5bcc-82a1-4726-9049-bd7edda94c90", 
      "name": "drycontact_dummy_1", 
      "address": 36, 
      "device_bus": 0, 
      "part_number": "DRYCONTACT", 
      "mac": "", 
      "manufacturer": "IOT", 
      "device_type": "Modular", 
      "topic": "DRYCONTACT/1"
    }
  ]
  ```

### C. Meminta Semua Sekaligus
- **Payload Request:**
  ```json
  {
    "command": "get_all_availables"
  }
  ```
- **Sistem akan langsung melempar data ke dua topik secara bersamaan:** 
  1. `MODBUS_DEVICE/AVAILABLES`
  2. `MODULAR_DEVICE/AVAILABLES`

> **PENGINGAT OTOMATISASI:** Topik `MODULAR_DEVICE/AVAILABLES` dan `MODBUS_DEVICE/AVAILABLES` sebenarnya secara konstan dan otomatis di-publish oleh sistem setiap 30 detik tanpa dipicu request. Request manual ini hanya dibutuhkan jika front-end ingin data secara instan saat pertama kali dilaunch.
