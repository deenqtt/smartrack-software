# ============================================================
#  Smartrack — Multi-Stage Docker Build
#  Stage 1 : deps      (install npm packages)
#  Stage 2 : builder   (generate prisma + next build)
#  Stage 3 : runner    (minimal production image)
# ============================================================

# ─── Stage 1: Install dependencies ──────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ─── Stage 2: Build application ─────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable Next.js telemetry saat build
ENV NEXT_TELEMETRY_DISABLED=1

# Placeholder DATABASE_URL agar prisma generate tidak error saat build
ENV DATABASE_URL=postgresql://smartrack:smartrack_pass@postgres:5432/smartrack_db

# Generate Prisma client
RUN npx prisma@6.19.2 generate

# Build Next.js (output: standalone)
# Gunakan build:without-prisma agar tidak double-generate prisma
RUN NODE_OPTIONS='--max-old-space-size=4096' npx next build

# ─── Stage 3: Production runner ─────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Install runtime utilities
RUN apk add --no-cache \
  postgresql-client \
  curl \
  bash \
  gzip \
  tar \
  libc6-compat

# Buat non-root user untuk keamanan
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 smartrack

# Buat direktori logs & backups dengan ownership yang benar
RUN mkdir -p /app/backups /app/logs /app/offsite-backups && \
    chown -R smartrack:nodejs /app/backups /app/logs /app/offsite-backups && \
    chmod 755 /app/backups /app/logs /app/offsite-backups

# Salin output standalone dan static assets dari builder
COPY --from=builder /app/public                          ./public
COPY --from=builder --chown=smartrack:nodejs /app/.next/standalone ./
COPY --from=builder --chown=smartrack:nodejs /app/.next/static     ./.next/static

# Salin file runtime yang diperlukan
COPY --from=builder --chown=smartrack:nodejs /app/prisma    ./prisma
COPY --from=builder --chown=smartrack:nodejs /app/scripts   ./scripts
COPY --from=builder --chown=smartrack:nodejs /app/templates ./templates
COPY --from=builder --chown=smartrack:nodejs /app/lib       ./lib
COPY --from=builder                          /app/package.json ./package.json

# Salin dependency yang dibutuhkan seed scripts (tidak di-include standalone)
COPY --from=builder /app/node_modules/bcryptjs        ./node_modules/bcryptjs
COPY --from=builder /app/node_modules/nodemailer      ./node_modules/nodemailer

# Salin entrypoint script
COPY --chown=smartrack:nodejs deploy/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER smartrack

EXPOSE 3030
ENV PORT=3030
ENV HOSTNAME="0.0.0.0"

HEALTHCHECK --interval=30s --timeout=10s --start-period=90s --retries=3 \
  CMD curl -f http://localhost:3030/api/health || exit 1

# Jalankan entrypoint (migrasi DB → seed → start server)
ENTRYPOINT ["sh", "./entrypoint.sh"]
