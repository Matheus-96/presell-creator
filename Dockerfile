###############################################################################
# Stage 1 — Build frontend (React + Vite)
###############################################################################
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy workspace manifests first to maximise layer cache
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Skip puppeteer Chromium download — not needed to build the frontend
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm ci

# Vite build-time variables — override via --build-arg if needed
ARG VITE_APP_NAME="Presell Creator Admin"
ARG VITE_API_BASE_URL="/api"
ARG VITE_AUTH_MODE="session"
ARG VITE_AUTH_SESSION_PATH="/admin/session"
ARG VITE_LEGACY_ADMIN_URL="/admin"
ARG ADMIN_FRONTEND_PATH="/admin-app"

ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_AUTH_MODE=$VITE_AUTH_MODE \
    VITE_AUTH_SESSION_PATH=$VITE_AUTH_SESSION_PATH \
    VITE_LEGACY_ADMIN_URL=$VITE_LEGACY_ADMIN_URL \
    ADMIN_FRONTEND_PATH=$ADMIN_FRONTEND_PATH

COPY frontend/ ./frontend/
COPY backend/ ./backend/
COPY scripts/ ./scripts/

RUN npm run build:templates && npm run build:frontend

###############################################################################
# Stage 2 — lighttpd com arquivos estáticos do frontend
###############################################################################
FROM debian:bookworm-slim AS lighttpd-static

RUN apt-get update && apt-get install -y --no-install-recommends \
    lighttpd \
 && rm -rf /var/lib/apt/lists/*

# Config customizada para Docker (proxy para o serviço "app" na rede interna)
COPY docker/lighttpd/lighttpd.conf /etc/lighttpd/lighttpd.conf

# Arquivos estáticos buildados no stage anterior
ARG ADMIN_FRONTEND_PATH="/admin-app"
COPY --from=builder /app/frontend/dist /var/www/html${ADMIN_FRONTEND_PATH}

EXPOSE 80

# -D = foreground (obrigatório no Docker)
CMD ["lighttpd", "-D", "-f", "/etc/lighttpd/lighttpd.conf"]

###############################################################################
# Stage 3 — Node.js backend (produção)
###############################################################################
FROM node:22-bookworm-slim AS app

# System Chromium so Puppeteer doesn't bundle its own ~170 MB download
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests and install production deps (no devDeps, no Chromium download)
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm ci --omit=dev

# Backend source
COPY backend/ ./backend/

# Bundle de templates SSR gerado no builder (gitignored, não está no source)
COPY --from=builder /app/backend/src/templates/templates.bundle.js ./backend/src/templates/

# Built frontend from builder stage
COPY --from=builder /app/frontend/dist ./frontend/dist

# Entrypoint: roda backfill de HTML SSR antes de iniciar o servidor
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Persistent storage directory (SQLite files + uploads) — mount as volume
RUN mkdir -p /app/storage/uploads

# Tell Puppeteer to use the system Chromium instead of the bundled one
ENV NODE_ENV=production \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

EXPOSE 3002

CMD ["/entrypoint.sh"]
