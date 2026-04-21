#!/bin/bash
# ============================================================
#  Smartrack — Deploy Script
#  Jalankan di TARGET MACHINE (server / Raspberry Pi).
#
#  Mode offline (tanpa internet):
#    bash deploy/deploy.sh --offline smartrack-arm64-20240101.tar.gz
#
#  Mode online (dengan internet + Docker registry):
#    bash deploy/deploy.sh --pull --registry docker.io/username
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.prod.yml"
ENV_FILE="$PROJECT_ROOT/.env"

# Shortcut — selalu sertakan --env-file agar variable substitution di compose terbaca
DC() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }

MODE=""
TAR_FILE=""
REGISTRY=""
SERVER_IP=""
APP_PORT="${APP_PORT:-3030}"
MQTT_TCP_PORT="${MQTT_HOST_PORT:-1883}"
MQTT_WS_PORT="${MQTT_WS_PORT:-9000}"

# ─── Parse args ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --offline)  MODE="offline"; TAR_FILE="$2"; shift 2 ;;
    --pull)     MODE="online"; shift ;;
    --registry) REGISTRY="$2"; shift 2 ;;
    --ip)       SERVER_IP="$2"; shift 2 ;;
    --port)     APP_PORT="$2"; shift 2 ;;
    -h|--help)
      echo "Usage:"
      echo "  bash deploy/deploy.sh --offline smartrack-arm64-YYYYMMDD.tar.gz"
      echo "  bash deploy/deploy.sh --pull --registry docker.io/username"
      echo "  bash deploy/deploy.sh --offline FILE --ip 192.168.1.100 --port 3030"
      exit 0 ;;
    *) shift ;;
  esac
done

echo "================================================================"
echo "  🚀 Smartrack — Deploy"
echo "  Mode   : ${MODE:-auto-detect}"
echo "================================================================"
echo ""

# ─── 1. Cek Docker ───────────────────────────────────────────
echo "🔍 Mengecek prerequisites..."

if ! command -v docker &>/dev/null; then
  echo "❌ Docker tidak ditemukan. Install dengan:"
  echo "   curl -fsSL https://get.docker.com | sh"
  echo "   sudo usermod -aG docker \$USER && newgrp docker"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "❌ Docker Compose plugin tidak ditemukan."
  echo "   Pastikan Docker Engine v20.10+ terinstall."
  exit 1
fi

echo "   ✅ Docker    : $(docker --version | awk '{print $3}' | tr -d ',')"
echo "   ✅ Compose   : $(docker compose version --short)"
echo ""

# ─── 2. Deteksi IP server ────────────────────────────────────
if [ -z "$SERVER_IP" ]; then
  SERVER_IP=$(hostname -I | awk '{print $1}')
  echo "🌐 IP server terdeteksi: $SERVER_IP"
  read -p "   Gunakan IP ini untuk akses dashboard & MQTT? [Y/n] " CONFIRM
  if [[ "$CONFIRM" =~ ^[Nn] ]]; then
    read -p "   Masukkan IP atau domain server: " SERVER_IP
  fi
fi
echo ""

# ─── 3. Setup .env ───────────────────────────────────────────
ENV_EXAMPLE="$PROJECT_ROOT/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚙️  Membuat file .env dari .env.example..."

  if [ ! -f "$ENV_EXAMPLE" ]; then
    echo "❌ File .env.example tidak ditemukan di $PROJECT_ROOT"
    exit 1
  fi

  cp "$ENV_EXAMPLE" "$ENV_FILE"

  # Generate random secrets
  JWT_SECRET=$(openssl rand -hex 32)
  NEXTAUTH_SECRET=$(openssl rand -hex 32)

  # Patch nilai penting di .env
  sed -i "s|JWT_SECRET=.*|JWT_SECRET=\"$JWT_SECRET\"|g" "$ENV_FILE"
  sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=\"$NEXTAUTH_SECRET\"|g" "$ENV_FILE"
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=\"http://$SERVER_IP:$APP_PORT\"|g" "$ENV_FILE"
  sed -i "s|NEXT_PUBLIC_MQTT_HOST=.*|NEXT_PUBLIC_MQTT_HOST=\"$SERVER_IP\"|g" "$ENV_FILE"
  sed -i "s|NEXT_PUBLIC_MQTT_PORT=.*|NEXT_PUBLIC_MQTT_PORT=\"$MQTT_WS_PORT\"|g" "$ENV_FILE"
  sed -i "s|NEXT_PUBLIC_ACCESSCONTROL_API_URL=.*|NEXT_PUBLIC_ACCESSCONTROL_API_URL=\"http://$SERVER_IP:8081\"|g" "$ENV_FILE"
  # Pastikan DATABASE_URL pakai nama service Docker (bukan localhost)
  sed -i "s|DATABASE_URL=.*localhost.*|DATABASE_URL=\"postgresql://smartrack:smartrack_pass@postgres:5432/smartrack_db?schema=public\"|g" "$ENV_FILE"

  echo "   ✅ .env dibuat. JWT secrets di-generate otomatis."
  echo "   ⚠️  Review $ENV_FILE jika perlu custom config."
else
  echo "✅ File .env sudah ada — menggunakan yang existing."

  # Generate secrets jika masih kosong
  CURRENT_JWT=$(grep "^JWT_SECRET=" "$ENV_FILE" | cut -d= -f2 | tr -d '"')
  CURRENT_NEXT=$(grep "^NEXTAUTH_SECRET=" "$ENV_FILE" | cut -d= -f2 | tr -d '"')

  if [ -z "$CURRENT_JWT" ]; then
    JWT_SECRET=$(openssl rand -hex 32)
    sed -i "s|JWT_SECRET=.*|JWT_SECRET=$JWT_SECRET|g" "$ENV_FILE"
    echo "   🔑 JWT_SECRET di-generate (sebelumnya kosong)."
  fi
  if [ -z "$CURRENT_NEXT" ]; then
    NEXTAUTH_SECRET=$(openssl rand -hex 32)
    sed -i "s|NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$NEXTAUTH_SECRET|g" "$ENV_FILE"
    echo "   🔑 NEXTAUTH_SECRET di-generate (sebelumnya kosong)."
  fi

  # Pastikan MQTT host & NEXTAUTH_URL terupdate
  sed -i "s|NEXT_PUBLIC_MQTT_HOST=.*|NEXT_PUBLIC_MQTT_HOST=$SERVER_IP|g" "$ENV_FILE"
  sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=http://$SERVER_IP:$APP_PORT|g" "$ENV_FILE"
  echo "   📡 NEXT_PUBLIC_MQTT_HOST → $SERVER_IP"
  echo "   🌐 NEXTAUTH_URL → http://$SERVER_IP:$APP_PORT"
fi
echo ""

# ─── 4. Buat direktori yang diperlukan ───────────────────────
echo "📁 Menyiapkan direktori..."
mkdir -p \
  "$PROJECT_ROOT/public/images" \
  "$PROJECT_ROOT/public/uploads" \
  "$PROJECT_ROOT/public/snapshots" \
  "$PROJECT_ROOT/public/files"
echo "   ✅ Public directories ready."
echo ""

# ─── 5. Load / Pull image ────────────────────────────────────
if [ "$MODE" = "offline" ]; then
  # Auto-detect tar jika tidak disebutkan
  if [ -z "$TAR_FILE" ]; then
    TAR_FILE=$(ls "$PROJECT_ROOT"/smartrack-*.tar.gz 2>/dev/null | sort -r | head -1)
    if [ -z "$TAR_FILE" ]; then
      echo "❌ File image tidak ditemukan."
      echo "   Jalankan dengan: bash deploy/deploy.sh --offline smartrack-arm64-YYYYMMDD.tar.gz"
      exit 1
    fi
    echo "🔍 File image terdeteksi: $TAR_FILE"
  fi

  echo "📦 Loading Docker image dari $TAR_FILE..."
  docker load < "$TAR_FILE"
  echo "   ✅ Image loaded."

elif [ "$MODE" = "online" ]; then
  if [ -z "$REGISTRY" ]; then
    read -p "🔑 Masukkan registry (contoh: docker.io/username): " REGISTRY
  fi
  echo "📥 Pulling image dari ${REGISTRY}/smartrack-app:latest..."
  REGISTRY="$REGISTRY" DC pull app
  echo "   ✅ Image pulled."

else
  # Auto-detect: cek apakah ada tar file
  TAR_FILE=$(ls "$PROJECT_ROOT"/smartrack-*.tar.gz 2>/dev/null | sort -r | head -1)
  if [ -n "$TAR_FILE" ]; then
    echo "🔍 Auto-detect: ditemukan $(basename "$TAR_FILE") → mode offline"
    MODE="offline"
    echo "📦 Loading Docker image..."
    docker load < "$TAR_FILE"
    echo "   ✅ Image loaded."
  else
    echo "🔨 Tidak ada tar file — build dari source..."
    DC build app
    echo "   ✅ Image built."
  fi
fi
echo ""

# ─── 6. Deteksi MQTT broker existing ─────────────────────────
MQTT_PORT_CHECK="${MQTT_TCP_PORT}"
USE_EXTERNAL_MQTT=false

if ss -tlnp 2>/dev/null | grep -q ":${MQTT_PORT_CHECK} " || \
   netstat -tlnp 2>/dev/null | grep -q ":${MQTT_PORT_CHECK} "; then
  echo "📡 MQTT broker terdeteksi di port $MQTT_PORT_CHECK."
  read -p "   Pakai broker yang sudah ada (skip container mosquitto)? [Y/n] " MQTT_CONFIRM
  if [[ ! "$MQTT_CONFIRM" =~ ^[Nn] ]]; then
    USE_EXTERNAL_MQTT=true
    # Arahkan app ke host machine, bukan container mosquitto
    export MQTT_INTERNAL_HOST=host.docker.internal
    export MQTT_INTERNAL_PORT="${MQTT_PORT_CHECK}"
    echo "   ✅ Akan pakai external MQTT di host:$MQTT_PORT_CHECK"
  fi
fi
echo ""

# ─── 7. Start semua containers ───────────────────────────────
if [ "$USE_EXTERNAL_MQTT" = true ]; then
  echo "🐳 Starting containers (app + postgres + redis) — mosquitto dilewati..."
  DC up -d --scale mosquitto=0
else
  echo "🐳 Starting containers (app + postgres + redis + mosquitto)..."
  DC up -d
fi
echo ""

# ─── 8. Tunggu app ready (health check) ──────────────────────
echo "⏳ Menunggu Smartrack siap (max 3 menit)..."
RETRIES=36
while ! curl -sf "http://localhost:$APP_PORT/api/health" &>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo ""
    echo "⚠️  App belum merespons setelah 3 menit."
    echo "   Cek logs dengan: docker compose -f $COMPOSE_FILE --env-file .env logs app"
    break
  fi
  printf "."
  sleep 5
done
echo ""

# ─── 9. Summary ──────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  ✅ Smartrack berhasil dideploy!"
echo "================================================================"
echo ""
echo "  🌐 Dashboard     : http://$SERVER_IP:$APP_PORT"
echo "  📡 MQTT TCP      : $SERVER_IP:$MQTT_TCP_PORT  (IoT devices)"
echo "  📡 MQTT WebSocket: $SERVER_IP:$MQTT_WS_PORT   (browser)"
echo ""
echo "  🔑 Login default:"
echo "     Email    : admin@smartrack.com"
echo "     Password : admin123"
echo ""
echo "  📋 Perintah berguna:"
echo "     docker compose -f $COMPOSE_FILE --env-file .env logs -f app"
echo "     docker compose -f $COMPOSE_FILE --env-file .env restart app"
echo "     docker compose -f $COMPOSE_FILE --env-file .env down"
echo "     docker compose -f $COMPOSE_FILE --env-file .env exec app node scripts/seed-init.js"
echo ""
echo "================================================================"
