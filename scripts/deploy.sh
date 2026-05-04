#!/bin/bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
fi

REPO_DIR="${REPO_DIR:-/home/pi/presell-creator}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-feat/refactor}"
PM2_APP_NAME="${PM2_APP_NAME:-presell-server}"
BACKEND_ENTRY="${BACKEND_ENTRY:-src/server.js}"
ADMIN_FRONTEND_PATH="${ADMIN_FRONTEND_PATH:-/admin-app}"
LIGHTTPD_DOCROOT="${LIGHTTPD_DOCROOT:-/var/www/html}"
BACKEND_HEALTHCHECK_URL="${BACKEND_HEALTHCHECK_URL:-http://127.0.0.1:${PORT:-3000}/health}"

if [ "$ADMIN_FRONTEND_PATH" = "/" ]; then
  FRONTEND_TARGET_DIR_DEFAULT="$LIGHTTPD_DOCROOT"
else
  FRONTEND_TARGET_DIR_DEFAULT="$LIGHTTPD_DOCROOT/${ADMIN_FRONTEND_PATH#/}"
fi

FRONTEND_TARGET_DIR="${FRONTEND_TARGET_DIR:-$FRONTEND_TARGET_DIR_DEFAULT}"
FRONTEND_DIST_DIR="${FRONTEND_DIST_DIR:-$REPO_DIR/frontend/dist}"
LIGHTTPD_OWNER="${LIGHTTPD_OWNER:-}"

SUDO=""
if [ "$(id -u)" -ne 0 ] && command -v sudo >/dev/null 2>&1; then
  SUDO="sudo"
fi

sync_directory() {
  local source_dir="$1"
  local target_dir="$2"

  if command -v rsync >/dev/null 2>&1; then
    $SUDO rsync -a --delete "$source_dir"/ "$target_dir"/
    return
  fi

  $SUDO find "$target_dir" -mindepth 1 -maxdepth 1 -exec rm -rf {} +
  $SUDO cp -a "$source_dir"/. "$target_dir"/
}

echo "📁 Entrando em $REPO_DIR"
cd "$REPO_DIR"

echo "🔍 Verificando atualizações em origin/$DEPLOY_BRANCH..."
git fetch origin "$DEPLOY_BRANCH"

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$DEPLOY_BRANCH")"

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  echo "✅ Sem mudanças"
  exit 0
fi

echo "🚀 Atualizando projeto..."
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "📦 Instalando dependências..."
npm install

echo "🏗️ Gerando build do frontend..."
npm run build:frontend

if [ ! -d "$FRONTEND_DIST_DIR" ]; then
  echo "❌ Build do frontend não encontrado em $FRONTEND_DIST_DIR"
  exit 1
fi

echo "🌐 Publicando frontend para o lighttpd em $FRONTEND_TARGET_DIR"
$SUDO mkdir -p "$FRONTEND_TARGET_DIR"
sync_directory "$FRONTEND_DIST_DIR" "$FRONTEND_TARGET_DIR"

if [ -n "$LIGHTTPD_OWNER" ]; then
  echo "🔐 Ajustando ownership para $LIGHTTPD_OWNER"
  $SUDO chown -R "$LIGHTTPD_OWNER" "$FRONTEND_TARGET_DIR"
fi

echo "♻️ Reiniciando backend no PM2..."
if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_APP_NAME" --update-env
else
  pm2 start "$BACKEND_ENTRY" --name "$PM2_APP_NAME" --cwd "$REPO_DIR"
fi
pm2 save

echo "🩺 Validando healthcheck do backend..."
curl --fail --silent --show-error "$BACKEND_HEALTHCHECK_URL" >/dev/null

echo "✅ Deploy concluído"
echo "   Frontend: $FRONTEND_TARGET_DIR"
echo "   Backend PM2: $PM2_APP_NAME"
