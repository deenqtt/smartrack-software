#!/bin/sh
# ============================================================
#  Smartrack — Docker Entrypoint
#
#  Alur:
#    1. Tunggu PostgreSQL siap
#    2. Prisma migrate deploy
#    3. Jalankan seed-init (idempotent — aman diulang)
#    4. Start Next.js server
# ============================================================

set -e

echo "================================================================"
echo "  🚀 Smartrack — Starting Container"
echo "  NODE_ENV : ${NODE_ENV:-production}"
echo "  PORT     : ${PORT:-3030}"
echo "================================================================"

# ─── 1. Tunggu PostgreSQL siap ─────────────────────────────────
echo ""
echo "⏳ Menunggu PostgreSQL..."
RETRIES=30
until pg_isready \
  -h "${PGHOST:-postgres}" \
  -p "${PGPORT:-5432}" \
  -U "${POSTGRES_USER:-smartrack}" \
  -d "${POSTGRES_DB:-smartrack_db}" \
  -q 2>/dev/null; do
  RETRIES=$((RETRIES - 1))
  if [ "$RETRIES" -le 0 ]; then
    echo "❌ PostgreSQL tidak bisa diakses setelah 60 detik."
    exit 1
  fi
  printf "."
  sleep 2
done
echo " ✅ PostgreSQL siap."

# ─── 2. Prisma migrate deploy ─────────────────────────────────
echo ""
echo "📦 Sinkronisasi database schema..."
if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  if ! npx --yes prisma@6.19.2 migrate deploy; then
    echo "⚠️  migrate deploy gagal — fallback ke db push..."
    npx --yes prisma@6.19.2 db push --accept-data-loss
  fi
else
  npx --yes prisma@6.19.2 db push --accept-data-loss
fi
echo "✅ Database schema sinkron."

# ─── 3. Seed (idempotent) ──────────────────────────────────────
echo ""
echo "🌱 Menjalankan seed-init..."
node scripts/seed-init.js \
  && echo "✅ Seed selesai." \
  || echo "⚠️  Seed gagal (mungkin sudah ter-seed sebelumnya, lanjut...)"

# ─── 4. Start server ───────────────────────────────────────────
echo ""
echo "================================================================"
echo "  🌐 Dashboard  : http://0.0.0.0:${PORT:-3030}"
echo "  📡 MQTT Host  : ${NEXT_PUBLIC_MQTT_HOST:-localhost}:${NEXT_PUBLIC_MQTT_PORT:-9000}"
echo "  🗄️  Database  : ${POSTGRES_DB:-smartrack_db}@postgres"
echo "================================================================"
echo ""
exec node server.js
