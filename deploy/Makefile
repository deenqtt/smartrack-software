# ============================================================
#  Smartrack — Makefile
#  Shortcut commands untuk development & deployment
#
#  Jalankan dari folder deploy/:
#    cd deploy && make export-amd64
#    cd deploy && make up
# ============================================================

IMAGE     := smartrack-app
VERSION   := $(shell date +%Y%m%d_%H%M)
REGISTRY  ?= docker.io/yourusername
COMPOSE   := docker compose -f docker-compose.prod.yml

.PHONY: help \
        build-amd64 build-arm64 build-push \
        export-amd64 export-arm64 \
        up down restart logs status shell \
        seed update

# ─── Default: tampilkan help ─────────────────────────────────
help:
	@echo ""
	@echo "  Smartrack Makefile  (jalankan dari folder deploy/)"
	@echo ""
	@echo "  ── Build (jalankan di dev machine) ──────────────────────"
	@echo "  make build-amd64     Build image untuk server/laptop (x86_64)"
	@echo "  make build-arm64     Build image untuk Raspberry Pi (arm64)"
	@echo "  make export-amd64    Build + export .tar.gz untuk offline deploy (amd64)"
	@echo "  make export-arm64    Build + export .tar.gz untuk offline deploy (arm64)"
	@echo "  make build-push      Build multi-arch + push ke Docker registry"
	@echo ""
	@echo "  ── Container (jalankan di target machine) ───────────────"
	@echo "  make up              Start semua containers"
	@echo "  make down            Stop semua containers"
	@echo "  make restart         Restart app container"
	@echo "  make logs            Tail logs app"
	@echo "  make status          Cek status containers"
	@echo "  make shell           Shell ke dalam app container"
	@echo ""
	@echo "  ── Maintenance ──────────────────────────────────────────"
	@echo "  make seed            Jalankan seed-init di container"
	@echo "  make update          Pull image terbaru + restart"
	@echo ""
	@echo "  ── Variables ────────────────────────────────────────────"
	@echo "  REGISTRY=docker.io/user make build-push"
	@echo ""

# ─── Build ───────────────────────────────────────────────────
build-amd64:
	@echo "🔨 Building untuk linux/amd64..."
	bash build-export.sh --amd64

build-arm64:
	@echo "🔨 Building untuk linux/arm64 (RPi)..."
	bash build-export.sh --arm64

build-push:
	@echo "🔨 Building multi-arch + pushing ke $(REGISTRY)..."
	bash build-export.sh --push --registry $(REGISTRY)

# ─── Export untuk offline deploy ─────────────────────────────
export-amd64:
	bash build-export.sh --amd64

export-arm64:
	bash build-export.sh --arm64

# ─── Container management ────────────────────────────────────
up:
	$(COMPOSE) up -d
	@echo "✅ Containers running. Akses: http://localhost:3030"

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart app
	@echo "✅ App restarted."

logs:
	$(COMPOSE) logs -f app

status:
	$(COMPOSE) ps

shell:
	$(COMPOSE) exec app sh

# ─── Maintenance ─────────────────────────────────────────────
seed:
	@echo "🌱 Menjalankan seed-init..."
	$(COMPOSE) exec app node scripts/seed-init.js

update:
	@echo "🔄 Pulling image terbaru..."
	$(COMPOSE) pull app
	$(COMPOSE) up -d --no-deps app
	@echo "✅ App updated."
