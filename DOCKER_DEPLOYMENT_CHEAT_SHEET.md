# 🚀 Smartrack Docker Production Cheat Sheet

## 📋 Prerequisites
```bash
# Tools yang dibutuhkan
docker --version          # Docker terinstall
docker compose version    # Docker Compose v2 terinstall
git --version             # Git untuk clone repository

# Persyaratan sistem
# - RAM minimal 4GB
# - Port 3030, 5432, 6379, 1883, 9000 tersedia
# - Server Ubuntu/Debian/CentOS/RHEL
```

---

## 🛠️ Initial Setup

### 1. Clone & Setup Project
```bash
# Clone repository
git clone <your-smartrack-repo-url>
cd software-smartrack

# Setup environment (salin dan isi nilainya)
cp .env.example .env
nano .env   # Isi semua variabel production
```

### 2. Konfigurasi `.env` Penting
```bash
# Wajib diisi sebelum deploy:
POSTGRES_USER=smartrack
POSTGRES_PASSWORD=smartrack_pass_GANTI_INI
POSTGRES_DB=smartrack_db
DATABASE_URL=postgresql://smartrack:smartrack_pass_GANTI_INI@postgres:5432/smartrack_db?schema=public

REDIS_URL=redis://redis:6379/0

NEXT_PUBLIC_MQTT_HOST=<IP_SERVER_ANDA>   # IP server yang bisa diakses browser
NEXT_PUBLIC_MQTT_PORT=9000

JWT_SECRET=<random_string_32_karakter>
NEXTAUTH_SECRET=<random_string_32_karakter>
NEXTAUTH_URL=http://<IP_SERVER_ANDA>:3030
```

> 💡 Generate secret: `openssl rand -hex 32`

### 3. First Production Deploy
```bash
# Build & start semua service (otomatis migrasi DB + seed)
docker compose up -d --build

# Pantau log saat pertama kali start
docker compose logs -f app
```

---

## 🔄 Operasi Sehari-hari

### Start / Stop Services
```bash
# Jalankan semua service
docker compose up -d

# Hentikan semua service
docker compose down

# Restart service tertentu
docker compose restart app

# Hentikan & hapus volumes (⚠️ DATA HILANG)
docker compose down -v
```

### Update Aplikasi (Zero-Downtime)
```bash
# 1. Pull kode terbaru
git pull origin main

# 2. Rebuild & restart hanya service app
docker compose build app
docker compose up -d --no-deps app

# 3. Verifikasi
docker compose ps
docker compose logs --tail=30 app
```

### Full Rebuild
```bash
# Build ulang semua tanpa cache
docker compose build --no-cache

# Pull image terbaru + rebuild semua
docker compose pull
docker compose up -d --build

# Force recreate semua container
docker compose up -d --force-recreate
```

---

## 🗄️ Database Management

### Operasi Database
```bash
# Masuk ke shell PostgreSQL
docker compose exec postgres psql -U smartrack -d smartrack_db

# Jalankan migrasi Prisma manual
docker compose exec --user root app npx prisma@6.19.2 migrate deploy

# Push schema (untuk setup awal / tanpa migration history)
docker compose exec --user root app npx prisma@6.19.2 db push

# Generate Prisma client
docker compose exec --user root app npx prisma@6.19.2 generate

# Buka Prisma Studio (GUI database)
docker compose exec --user root app npx prisma@6.19.2 studio --port 5556 --hostname 0.0.0.0
```

### Seed Data
```bash
# Seed data awal (users, roles, menu, permission, dll)
docker compose exec --user root app node scripts/seed-init.js

# Seed templates (SCADA, Layout, Dashboard)
docker compose exec --user root app node scripts/seed-templates.js all
```

### Backup & Restore Database
```bash
# Buat backup
docker compose exec postgres pg_dump -U smartrack smartrack_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker compose exec -T postgres psql -U smartrack -d smartrack_db < backup_file.sql

# Backup volume postgres (binary)
docker run --rm \
  -v smartrack_pg_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup_$(date +%Y%m%d).tar.gz -C /data .
```

---

## 📊 Monitoring & Logs

### Status Service
```bash
# Cek semua service
docker compose ps

# Resource usage (CPU, RAM)
docker stats

# Health check aplikasi
docker compose exec app curl -f http://localhost:3030/api/health
```

### Lihat Logs
```bash
# Semua service
docker compose logs -f

# Per service
docker compose logs -f app
docker compose logs -f postgres
docker compose logs -f redis
docker compose logs -f mosquitto

# 100 baris terakhir
docker compose logs --tail=100 app
```

---

## 🔍 Troubleshooting

### Cek Koneksi Service
```bash
# Test Redis
docker compose exec redis redis-cli ping

# Test PostgreSQL
docker compose exec postgres pg_isready -U smartrack -d smartrack_db

# Test MQTT publish
docker compose exec mosquitto mosquitto_pub -h localhost -t "smartrack/test" -m "hello"

# Masuk ke dalam container app
docker compose exec app sh
```

### Masalah Umum
```bash
# Cek konflik port
netstat -tulpn | grep -E ':3030|:5432|:6379|:1883|:9000'

# Inspect container tertentu
docker inspect smartrack-app

# Clean restart (hapus semua, mulai dari awal)
docker compose down -v --remove-orphans
docker system prune -f
docker compose up -d --build
```

### Debug Migrasi Gagal
```bash
# Jika migrate deploy gagal (DB tidak kosong), gunakan db push
docker compose exec --user root app npx prisma@6.19.2 db push --accept-data-loss

# Atau masuk manual ke DB dan reset
docker compose exec postgres psql -U smartrack -d smartrack_db
```

---

## 🌐 Network & Security

### Firewall (Ubuntu/UFW)
```bash
# Port yang perlu dibuka
ufw allow 3030/tcp    # Aplikasi Smartrack
ufw allow 1883/tcp    # MQTT TCP (perangkat IoT)
ufw allow 9000/tcp    # MQTT WebSocket (browser)
ufw allow 22/tcp      # SSH
ufw --force enable
```

### SSL/HTTPS dengan Nginx Reverse Proxy
```bash
# Install nginx & certbot
apt install nginx certbot python3-certbot-nginx

# Konfigurasi nginx untuk Smartrack
nano /etc/nginx/sites-available/smartrack

# Contoh konfigurasi:
# server {
#     listen 80;
#     server_name yourdomain.com;
#     location / {
#         proxy_pass http://localhost:3030;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade $http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host $host;
#         proxy_cache_bypass $http_upgrade;
#     }
# }

# Generate SSL certificate
certbot --nginx -d yourdomain.com
```

---

## 🔁 Backup Otomatis

### Script Backup Harian
```bash
# Buat script backup
cat > /opt/smartrack-backup.sh << 'EOF'
#!/bin/bash
cd /path/to/software-smartrack
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U smartrack smartrack_db > "backups/smartrack_backup_$DATE.sql"
# Hapus backup lebih dari 7 hari
find backups/ -name "*.sql" -mtime +7 -delete
echo "Backup selesai: smartrack_backup_$DATE.sql"
EOF

chmod +x /opt/smartrack-backup.sh

# Tambahkan ke crontab (setiap hari jam 02:00)
crontab -e
# Tambahkan: 0 2 * * * /opt/smartrack-backup.sh
```

---

## ⚠️ Emergency Commands

```bash
# Kill semua container secara paksa
docker compose kill

# Hapus semua container + volumes (⚠️ DATA HILANG PERMANEN)
docker compose down -v --remove-orphans

# Bersihkan semua image & data Docker yang tidak terpakai
docker system prune -a -f
docker volume prune -f

# Fresh start dari awal
docker compose up -d --build
```

---

## 🎯 Quick Reference

| Command | Deskripsi |
|---------|-----------|
| `docker compose up -d` | Jalankan semua service |
| `docker compose down` | Hentikan semua service |
| `docker compose logs -f` | Pantau log real-time |
| `docker compose ps` | Cek status semua service |
| `docker compose restart app` | Restart aplikasi |
| `docker compose exec app sh` | Masuk ke container app |
| `docker compose exec postgres psql -U smartrack -d smartrack_db` | Akses database |
| `docker compose build app && docker compose up -d --no-deps app` | Update app tanpa downtime |

---

## 📍 Access Points

| Layanan | URL / Address |
|---------|---------------|
| **Aplikasi Smartrack** | `http://<IP-SERVER>:3030` |
| **Health Check** | `http://<IP-SERVER>:3030/api/health` |
| **PostgreSQL** | `localhost:5432` (internal only) |
| **Redis** | `localhost:6379` (internal only) |
| **MQTT TCP** | `<IP-SERVER>:1883` (perangkat IoT) |
| **MQTT WebSocket** | `<IP-SERVER>:9000` (browser) |

---

## ✅ Production Checklist

- [ ] Server RAM minimal 4GB
- [ ] Port 3030, 1883, 9000 dibuka di firewall
- [ ] File `.env` sudah diisi dengan benar (bukan nilai default)
- [ ] `JWT_SECRET` dan `NEXTAUTH_SECRET` sudah di-generate secara random
- [ ] `NEXT_PUBLIC_MQTT_HOST` diisi dengan IP server yang bisa diakses browser
- [ ] Docker dan Docker Compose v2 terinstall
- [ ] SSL/HTTPS sudah dikonfigurasi (opsional, tapi disarankan)
- [ ] Strategi backup sudah disiapkan
- [ ] `docker compose up -d --build` berhasil dijalankan
- [ ] Health check `http://<IP>:3030/api/health` mengembalikan 200 OK

---

> **Ingat**: Selalu backup sebelum operasi besar! 🔒
