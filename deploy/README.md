# Smartrack — Deployment Guide

Semua file deployment ada di folder `deploy/`. Alur umum:

1. **Dev machine** → build image → export `.tar.gz`
2. **Target machine** → load image → jalankan `deploy.sh`

---

## Struktur folder `deploy/`

```
deploy/
├── Makefile                 # Shortcut commands
├── build-export.sh          # Script build + export di dev machine
├── deploy.sh                # Script deploy di target machine
├── docker-compose.prod.yml  # Docker Compose untuk production (pakai pre-built image)
├── entrypoint.sh            # Docker entrypoint (migrate + seed + start)
├── mosquitto/
│   └── config/
│       └── mosquitto.conf   # Konfigurasi MQTT broker
└── postgres/
    └── init.sql             # Inisialisasi PostgreSQL
```

---

## Prerequisites

### Dev machine (untuk build)

- Docker Engine dengan `buildx` support
- **Untuk build arm64 di laptop amd64** (cross-platform): perlu QEMU — setup sekali:
  ```bash
  docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
  ```
  > Harus diulang setelah Docker daemon di-restart / reboot.

### Target machine (server / RPi)

- Docker Engine v20.10+
- Docker Compose plugin (`docker compose`)
- `curl` (untuk health check)
- `openssl` (untuk generate JWT secret)

Install Docker di target:
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
```

---

## Alur 1: Offline Deploy (Direkomendasikan untuk RPi / server tanpa internet)

### Step 1 — Setup QEMU di dev machine (khusus build arm64)

Lewati step ini kalau mau build amd64 saja.

```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```

### Step 2 — Build di dev machine

```bash
# Untuk server/laptop (x86_64/amd64)
bash deploy/build-export.sh --amd64

# Untuk Raspberry Pi (arm64)
bash deploy/build-export.sh --arm64
```

Output: folder `smartrack-release-arm64-YYYYMMDD_HHMM/` di root project, berisi semua yang dibutuhkan target:
```
smartrack-release-arm64-YYYYMMDD_HHMM/
├── smartrack-arm64-YYYYMMDD_HHMM.tar.gz  ← Docker image
├── .env                                   ← siap pakai (dari .env.example)
├── deploy/                                ← compose + scripts
├── prisma/
├── scripts/
└── templates/
```

Atau pakai Makefile (dari folder `deploy/`):
```bash
cd deploy
make export-amd64
# atau
make export-arm64
```

### Step 3 — Kirim 1 folder ke target

```bash
scp -r smartrack-release-arm64-*/  user@TARGET_IP:~/smartrack
```

### Step 4 — Deploy di target

```bash
ssh user@TARGET_IP
cd ~/smartrack

# Setup .env (edit jika perlu) lalu start
bash deploy/deploy.sh
```

Atau dengan opsi explicit:
```bash
bash deploy/deploy.sh --offline smartrack-arm64-20240101_1200.tar.gz --ip 192.168.1.100
```

---

## Alur 2: Online Deploy (server dengan akses internet + Docker registry)

### Step 1 — Build & push dari dev machine

```bash
bash deploy/build-export.sh --push --registry docker.io/yourusername
# atau dari folder deploy/
cd deploy && make build-push REGISTRY=docker.io/yourusername
```

### Step 2 — Pull & deploy di target

```bash
bash deploy/deploy.sh --pull --registry docker.io/yourusername
```

---

## Konfigurasi `.env`

`deploy.sh` akan membuat `.env` otomatis dari `.env.example` dengan:
- `JWT_SECRET` dan `NEXTAUTH_SECRET` di-generate random (`openssl rand -hex 32`)
- `NEXT_PUBLIC_MQTT_HOST` di-set ke IP server yang terdeteksi
- `NEXTAUTH_URL` di-set ke `http://SERVER_IP:PORT`

Untuk custom config, edit `.env` setelah deploy:
```bash
nano ~/smartrack/.env
docker compose -f ~/smartrack/deploy/docker-compose.prod.yml restart app
```

### Variabel penting di `.env`

| Variable | Keterangan |
|---|---|
| `APP_PORT` | Port dashboard (default: 3030) |
| `NEXT_PUBLIC_MQTT_HOST` | IP/domain server untuk browser connect ke MQTT |
| `NEXT_PUBLIC_MQTT_PORT` | Port MQTT WebSocket (default: 9000) |
| `MQTT_HOST_PORT` | Port MQTT TCP untuk IoT devices (default: 1883) |
| `JWT_SECRET` | Secret untuk JWT token (generate random) |
| `NEXTAUTH_SECRET` | Secret untuk NextAuth session |
| `NEXTAUTH_URL` | URL publik dashboard |
| `GROQ_API_KEY` | API key untuk AI assistant (opsional) |
| `GEMINI_API_KEY` | API key Gemini untuk AI assistant (opsional) |

---

## Perintah berguna setelah deploy

```bash
COMPOSE="docker compose -f ~/smartrack/deploy/docker-compose.prod.yml"

$COMPOSE logs -f app          # lihat logs
$COMPOSE restart app          # restart app
$COMPOSE ps                   # cek status semua container
$COMPOSE exec app sh          # masuk shell container
$COMPOSE exec app node scripts/seed-init.js  # seed manual
$COMPOSE down                 # stop semua
$COMPOSE pull app && $COMPOSE up -d --no-deps app  # update image (online)
```

Atau pakai Makefile dari folder `deploy/`:
```bash
cd ~/smartrack/deploy
make status
make logs
make restart
make shell
make seed
```

---

## Port yang digunakan

| Port | Service | Keterangan |
|---|---|---|
| 3030 | Dashboard | Bisa diubah via `APP_PORT` |
| 1883 | MQTT TCP | Untuk IoT devices |
| 9000 | MQTT WebSocket | Untuk browser |
| 15432 | PostgreSQL | Hanya localhost (internal) |
| 16379 | Redis | Hanya localhost (internal) |

---

## Akun default

| Field | Value |
|---|---|
| Email | admin@smartrack.com |
| Password | admin123 |

> Ganti password setelah login pertama di: **Settings → User Management**

---

## Troubleshooting

**Build arm64 gagal: `exec format error`**

Laptop kamu amd64 dan belum ada QEMU untuk emulasi arm64. Jalankan:
```bash
docker run --rm --privileged multiarch/qemu-user-static --reset -p yes
```
Lalu build ulang. Perlu diulang setiap kali Docker daemon restart.

**App tidak mau start:**
```bash
docker compose -f deploy/docker-compose.prod.yml logs app
```

**Database error:**
```bash
docker compose -f deploy/docker-compose.prod.yml logs postgres
```

**MQTT tidak bisa diakses dari browser:**
- Pastikan `NEXT_PUBLIC_MQTT_HOST` di `.env` adalah IP/domain yang bisa diakses dari browser (bukan `localhost`)
- Pastikan port 9000 tidak diblokir firewall

**Reset dan mulai ulang (hapus semua data):**
```bash
docker compose -f deploy/docker-compose.prod.yml down -v
bash deploy/deploy.sh
```
