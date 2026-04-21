#!/bin/bash
# ============================================================
#  Smartrack — Build & Export Script
#  Jalankan di DEV MACHINE sebelum deploy ke target.
#
#  Usage:
#    bash deploy/build-export.sh --amd64          # server/laptop x86
#    bash deploy/build-export.sh --arm64          # Raspberry Pi
#    bash deploy/build-export.sh --push --registry docker.io/username
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

PLATFORM="linux/amd64"
ARCH="amd64"
MODE="export"
REGISTRY=""
VERSION=$(date +%Y%m%d_%H%M)

# ─── Parse args ──────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case $1 in
    --arm64)    PLATFORM="linux/arm64"; ARCH="arm64"; shift ;;
    --amd64)    PLATFORM="linux/amd64"; ARCH="amd64"; shift ;;
    --push)     MODE="push"; shift ;;
    --registry) REGISTRY="$2"; shift 2 ;;
    --version)  VERSION="$2"; shift 2 ;;
    -h|--help)
      echo "Usage:"
      echo "  bash deploy/build-export.sh --amd64            # export release folder (offline deploy)"
      echo "  bash deploy/build-export.sh --arm64            # export release folder untuk RPi"
      echo "  bash deploy/build-export.sh --push --registry docker.io/username"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

IMAGE_TAG="smartrack-app:${ARCH}"
RELEASE_DIR="${PROJECT_ROOT}/smartrack-release-${ARCH}-${VERSION}"
TAR_FILENAME="smartrack-${ARCH}-${VERSION}.tar.gz"

echo "================================================================"
echo "  🔨 Smartrack — Build & Export"
echo "  Platform : $PLATFORM"
echo "  Mode     : $MODE"
if [ "$MODE" = "export" ]; then
  echo "  Output   : $RELEASE_DIR/"
else
  echo "  Registry : $REGISTRY"
fi
echo "================================================================"
echo ""

# ─── Mode: Push ke registry (multi-arch) ─────────────────────
if [ "$MODE" = "push" ]; then
  if [ -z "$REGISTRY" ]; then
    echo "❌ --registry diperlukan untuk mode push."
    echo "   Contoh: bash deploy/build-export.sh --push --registry docker.io/username"
    exit 1
  fi

  echo "🔧 Setup Docker Buildx untuk multi-arch..."
  docker buildx create --name smartrack-builder --use 2>/dev/null \
    || docker buildx use smartrack-builder

  FULL_TAG="${REGISTRY}/smartrack-app"
  echo "📤 Building & pushing linux/amd64 + linux/arm64..."
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    -t "${FULL_TAG}:latest" \
    -t "${FULL_TAG}:${VERSION}" \
    --push \
    "$PROJECT_ROOT"

  echo ""
  echo "✅ Image pushed:"
  echo "   ${FULL_TAG}:latest"
  echo "   ${FULL_TAG}:${VERSION}"
  echo ""
  echo "📋 Di target, jalankan:"
  echo "   bash deploy/deploy.sh --pull --registry ${REGISTRY}"
  exit 0
fi

# ─── Mode: Export ke release folder (offline) ────────────────
echo "🔨 Building image untuk $PLATFORM..."
echo "   (Proses ini bisa memakan waktu beberapa menit)"
echo ""

# Setup buildx builder (diperlukan untuk cross-platform, misal arm64 di laptop amd64)
docker buildx create --name smartrack-builder --use 2>/dev/null \
  || docker buildx use smartrack-builder

docker buildx build \
  --platform "$PLATFORM" \
  -t "$IMAGE_TAG" \
  --load \
  -f "$PROJECT_ROOT/Dockerfile" \
  "$PROJECT_ROOT"

echo ""
echo "📦 Menyiapkan release folder..."
mkdir -p "$RELEASE_DIR"

# Export docker image
echo "   → Exporting Docker image..."
docker save "$IMAGE_TAG" | gzip > "$RELEASE_DIR/$TAR_FILENAME"

# Copy semua yang dibutuhkan di target
echo "   → Copying deploy files..."
cp -r "$SCRIPT_DIR"       "$RELEASE_DIR/deploy"
cp -r "$PROJECT_ROOT/prisma"    "$RELEASE_DIR/prisma"
cp -r "$PROJECT_ROOT/scripts"   "$RELEASE_DIR/scripts"
cp -r "$PROJECT_ROOT/templates" "$RELEASE_DIR/templates"

# Copy .env (dari .env.example kalau belum ada .env)
if [ -f "$PROJECT_ROOT/.env" ]; then
  cp "$PROJECT_ROOT/.env" "$RELEASE_DIR/.env"
  echo "   → .env disalin dari project."
else
  cp "$PROJECT_ROOT/.env.example" "$RELEASE_DIR/.env"
  echo "   → .env disalin dari .env.example (review sebelum deploy)."
fi

SIZE=$(du -sh "$RELEASE_DIR" | cut -f1)
RELEASE_NAME="$(basename "$RELEASE_DIR")"

echo ""
echo "✅ Release folder siap!"
echo "   Folder : $RELEASE_DIR"
echo "   Size   : $SIZE"
echo ""
echo "================================================================"
echo "  📋 Langkah selanjutnya (kirim ke target):"
echo "================================================================"
echo ""
echo "  # Kirim 1 folder ke target:"
echo "  scp -r $RELEASE_DIR  user@TARGET_IP:~/smartrack"
echo ""
echo "  # Di target:"
echo "  cd ~/smartrack"
echo "  bash deploy/deploy.sh --offline $TAR_FILENAME"
echo ""
echo "================================================================"
