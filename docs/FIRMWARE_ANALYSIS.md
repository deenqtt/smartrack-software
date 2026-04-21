# Firmware & Communication Analysis — LockAccessController

**Date:** 2026-04-07  
**Firmware Path:** `FIRMWARE/V1/src/main.cpp`  
**Config:** `FIRMWARE/V1/src/config.h`

---

## 1. Project Structure

```
LockAccessController/
├── FIRMWARE/V1/
│   ├── src/
│   │   ├── main.cpp         # Core firmware (~1750 lines)
│   │   └── config.h         # Hardware pin definitions
│   ├── data/
│   │   ├── index.html       # Embedded web UI
│   │   ├── script.js        # Client-side JS
│   │   └── style.css
│   └── platformio.ini       # Build config & dependencies
├── HARDWARE/                # PCB files & 3D models
└── SOFTWARE/
```

---

## 2. Hardware & Pin Configuration

### RS485 / Modbus RTU (Lock Bus)

| Signal | GPIO |
|--------|------|
| TX     | 17   |
| RX     | 16   |
| DE/RE  | 25   |

- Baud: 9600 bps, 8N1
- Protocol: Modbus Master (ESP32) → up to 10 locks

### Dry Contact Door Sensors

| Door | GPIO |
|------|------|
| 1    | 4    |
| 2    | 26   |
| 3    | 32   |
| 4    | 2    |

- Active-LOW: `0` = open, `1` = closed

### Ethernet (W5500 via SPI)

| Signal | GPIO |
|--------|------|
| SCLK   | 18   |
| MISO   | 19   |
| MOSI   | 23   |
| CS     | 14   |
| RST    | 27   |

### I2C Devices

- DS3231 RTC @ 0x68
- EEPROM @ 0x57
- SDA: GPIO 21, SCL: GPIO 22

---

## 3. Communication Channels

The firmware exposes **three independent channels** for external communication:

```
[ Browser / Server ]
       │
       ├── HTTP  (port 80)    → Static files + /api/logs
       ├── WebSocket (/ws)    → Real-time commands & events
       └── MQTT (configurable broker)
                │
                ↓
          [ ESP32 Firmware ]
                │
                └── RS485 Modbus RTU → Physical Locks (up to 10)
```

---

## 4. MQTT — Full Reference

### Broker Configuration

| Setting  | Default        | Storage      |
|----------|----------------|--------------|
| Broker   | 52.74.91.79    | NVS "mqtt-config" |
| Port     | 1883           | NVS          |
| Username | (empty)        | NVS          |
| Password | (empty)        | NVS          |

> **Note:** The default broker is a public IP. All topics and payloads are transmitted in plaintext over an unencrypted connection.

---

### Topics Published by Firmware

| Topic | Interval | Payload (JSON) |
|-------|----------|----------------|
| `iot/door/health/{IP}` | 30 s | `{ip, macAddress, locks, doorStatus[], lockAddresses[]}` |
| `iot/door/stats/{IP}` | 5 s | `{uptime, freeHeap, totalHeap, spiffsUsed, spiffsTotal, logFileSize}` |
| `iot/door/discovery` | On connect | `{ipAddress, macAddress, name, firmware}` |
| `iot/door/activity/new-card` | On card tap | `{cardNumber, lockAddress}` |
| `iot/door/logs` | On lock activity | `{controllerIp, lockAddress, jobId, cardNumber, username, method, timestamp}` |
| `iot/door/log_export` | On request | Chunked: `{chunkIndex, totalChunks, isLast, payload[]}` |
| `iot/door/data/users/{IP}` | On change | `{payload: {payload: [{jobId, cardNumber, username}, ...]}}` |

---

### Topics Subscribed by Firmware

| Topic | Purpose | Payload |
|-------|---------|---------|
| `iot/door/command/{IP}` | **Open/unlock a specific lock** | `{"lockAddress": <uint8>}` |
| `iot/door/request/{IP}` | Get user list | `{"command": "GET_USER_LIST"}` |
| `iot/door/command/user_management/{IP}` | Add or delete user | `{"command": "ADD_USER" \| "DELETE_USER", "payload": {...}}` |
| `iot/door/command/device_action/{IP}` | Device control | `{"command": "REBOOT_DEVICE" \| "FACTORY_RESET" \| "CHANGE_LOCK_ADDRESS", "payload": {...}}` |
| `iot/door/command` (global) | Export all logs | `{"command": "GET_ALL_LOGS"}` |

> `{IP}` is the Ethernet IP address of the ESP32 (e.g., `192.168.1.100`).

---

### How to Open a Door via MQTT

Publish to: `iot/door/command/{device_IP}`

```json
{
  "lockAddress": 1
}
```

Replace `1` with the Modbus address of the target lock (1–10, auto-discovered).

**What happens internally (main.cpp ~line 899):**

```cpp
void openDoorViaModbus(uint8_t lockAddress) {
    node.begin(lockAddress, rs485);
    node.writeSingleRegister(8196, 51);  // register 8196, value 51
}
```

The ESP32 writes Modbus register **8196** with value **51** to the addressed lock over RS485. The lock's relay/solenoid then activates and the door unlocks.

---

## 5. WebSocket API — Full Reference

**Endpoint:** `ws://{device_IP}/ws`

No authentication is required.

### Commands (Client → ESP32)

| Command | Payload | Effect |
|---------|---------|--------|
| `OPEN_DOOR` | `{"lockAddress": 1}` | **Unlocks the specified door** |
| `ADD_USER` | `{"lockAddress":1, "cardNumber":"...", "jobId":..., "username":"..."}` | Register card on all locks |
| `DELETE_USER` | `{"jobId":..., "cardNumber":"..."}` | Remove user from all locks |
| `CHANGE_LOCK_ADDRESS` | `{"currentAddress":1, "newAddress":2}` | Change Modbus ID of a lock |
| `REBOOT_DEVICE` | (none) | Restart ESP32 |
| `FACTORY_RESET` | Requires `"RESET"` confirmation | Wipe all config & users |
| `SAVE_NETWORK_SETTINGS` | Network + MQTT config object | Update and save settings |
| `GET_INITIAL_DATA` | (none) | Fetch all dashboard state |
| `SYNC_TIME_NTP` | (none) | Sync from NTP server |
| `SET_MANUAL_TIME` | `{"datetime": "YYYY-MM-DDTHH:MM"}` | Set device clock manually |

### Events (ESP32 → Client)

| Message Type | Data |
|--------------|------|
| `STATUS_UPDATE` | `{ip, mqttStatus, doors[], locks[]}` |
| `ACTIVITY_LOG` | Single log entry |
| `NEW_CARD_TAP` | `{cardNumber, lockAddress}` |
| `USER_LIST` | Array of user objects |
| `COMMAND_RESPONSE` | `{message: string}` |
| `NETWORK_SETTINGS` | Current network config |
| `MQTT_SETTINGS` | Current MQTT config |
| `DEVICE_TIME_UPDATE` | `{currentTime: "YYYY-MM-DD HH:MM:SS"}` |

### How to Open a Door via WebSocket

```json
{
  "command": "OPEN_DOOR",
  "payload": {
    "lockAddress": 1
  }
}
```

---

## 6. HTTP REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Serves the embedded web UI (index.html) |
| `/api/logs` | GET | Paginated activity log — `?page=N`, 10 entries/page |
| `/{filename}` | GET | Serves static assets from SPIFFS (CSS, JS) |

No authentication on any HTTP endpoint.

---

## 7. Modbus RTU Register Map (Lock Control)

| Register | Operation | Value / Purpose |
|----------|-----------|-----------------|
| 0 | Read | Lock status |
| 38 | Read | Last card tapped flag |
| 38–41 | Read | Card data (job ID, card low, card high) |
| 0xC000–0xC006 | Read | Activity log (method, job, card, timestamp) |
| 60–65 | Write | Time sync (year, month, day, hour, min, sec) |
| 67–69 | Write | Add user (job, card low, card high) |
| 71–73 | Write | Delete user (job, card low, card high) |
| **8196** | **Write** | **Open door (value: 51)** |
| 8192 | Write | Change lock address |
| 0x2006 | Write | Clear all users (value: 0x0055) |

---

## 8. Unlock Flow Diagrams

### Remote Unlock via MQTT

```
External System
  → Publish to iot/door/command/{IP}
  → Payload: {"lockAddress": 1}
      ↓
  ESP32 mqttCallback()
      ↓
  openDoorViaModbus(lockAddress)
      ↓
  RS485 Modbus write: register 8196 = 51
      ↓
  Physical lock relay activates → Door opens
```

### Remote Unlock via WebSocket

```
Web Browser / API Client
  → WS connect to ws://{IP}/ws
  → Send: {"command":"OPEN_DOOR","payload":{"lockAddress":1}}
      ↓
  ESP32 onWsEvent()
      ↓
  openDoorViaModbus(lockAddress)
      ↓
  RS485 Modbus write: register 8196 = 51
      ↓
  Physical lock relay activates → Door opens
```

### Card-Based Access (Automatic)

```
User taps RFID card on lock
  → Lock stores card UID at Modbus register 38
      ↓
  ESP32 polls register 38 every 500ms (pollLastCardAction)
      ↓
  New card detected → lookup in userDatabase[]
      ↓
  If registered: log activity → door granted at lock level
  If unregistered: notify UI via WebSocket (NEW_CARD_TAP)
                   → operator manually confirms + assigns job ID
```

---

## 9. Network Configuration

### Access Point (Always Active)

- SSID: `ESP32-Lock-Controller` (configurable)
- IP: `10.10.0.1`
- Captive portal DNS redirect enabled
- Purpose: Local config & fallback access

### Ethernet (W5500)

- Mode: DHCP by default (static configurable)
- Auto-detects link before init
- NTP sync on connect via `id.pool.ntp.org` (GMT+7)

### Settings Storage (NVS)

| Namespace | Keys |
|-----------|------|
| `net-config` | `isStatic`, `staticIP`, `staticGW`, `staticSN`, `apSsid`, `apPass` |
| `mqtt-config` | `broker`, `port`, `username`, `password` |
| `config` | User database (JSON, max 200 users) |

---

## 10. User & Activity Management

### User Structure

```cpp
struct User {
  uint16_t jobId;       // 0–65535
  uint32_t cardNumber;  // RFID UID
  char username[32];
};
// Max 200 users, stored in NVS
```

### Activity Log

- Stored in SPIFFS: `/activity_log.json`
- Max 100 entries (FIFO rotation — older entries are dropped)
- Fields: `controllerIp`, `lockAddress`, `jobId`, `cardNumber`, `username`, `method`, `timestamp`
- Access: HTTP `/api/logs?page=N` or MQTT `GET_ALL_LOGS` command

---

## 11. Firmware Dependencies

```ini
knolleary/PubSubClient          ; MQTT
me-no-dev/ESPAsyncWebServer     ; HTTP + WebSocket
me-no-dev/AsyncTCP
arduino-libraries/Ethernet      ; W5500 Ethernet
4-20ma/ModbusMaster @ 2.0.1    ; RS485 Modbus
bblanchon/ArduinoJson @ ^7.0.4
arduino-libraries/NTPClient
adafruit/RTClib                 ; DS3231 RTC
```

---

## 12. Key Source Locations

| Function | File | Purpose |
|----------|------|---------|
| `openDoorViaModbus()` | main.cpp ~899 | Door unlock via Modbus |
| `mqttCallback()` | main.cpp ~1174 | MQTT message handler |
| `onWsEvent()` | main.cpp ~629 | WebSocket command dispatcher |
| `pollLastCardAction()` | main.cpp ~1041 | Card detection polling (500ms) |
| `checkActivityLog()` | main.cpp ~1082 | Read lock activity log |
| `setupMqttClient()` | main.cpp ~569 | MQTT connect & subscriptions |
| `addCardViaModbus()` | main.cpp ~804 | User registration |
| `deleteCardViaModbus()` | main.cpp ~851 | User removal |
| `/api/logs` handler | main.cpp ~216 | Paginated log endpoint |

---

## 13. Security Observations

| Area | Finding |
|------|---------|
| HTTP/WebSocket | No authentication — any client on the network can open doors |
| MQTT | Optional credentials; default broker is a public IP with no TLS |
| Transport | All traffic in plaintext (no HTTPS, no MQTTS) |
| Rate limiting | None — unlock commands can be sent repeatedly |
| Activity log | Capped at 100 entries; no off-device persistence by default |
| Factory reset | Requires physical button hold OR "RESET" string over WebSocket |

---

## Summary

The firmware supports **three ways to remotely unlock a door**:

1. **MQTT** — Publish `{"lockAddress": N}` to `iot/door/command/{device_IP}`
2. **WebSocket** — Send `{"command":"OPEN_DOOR","payload":{"lockAddress":N}}` to `ws://{device_IP}/ws`
3. **Physical card tap** — Automatic if the card is registered in the user database

All three paths ultimately call `openDoorViaModbus()`, which writes value `51` to Modbus register `8196` on the addressed lock over RS485.

There is no separate web server application — the ESP32 itself serves the web UI, WebSocket, and REST API directly. Communication with any external backend/dashboard is done entirely through MQTT.
