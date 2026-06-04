#!/bin/bash
set -euo pipefail

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1090
  source "$NVM_DIR/nvm.sh"
fi

REPO_DIR="${REPO_DIR:-/home/pi/presell-creator}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
PM2_APP_NAME="${PM2_APP_NAME:-presell-backend}"
LEGACY_PM2_APP_NAME="${LEGACY_PM2_APP_NAME:-presell-server}"
BACKEND_ENTRY="${BACKEND_ENTRY:-backend/src/server.js}"
ADMIN_FRONTEND_PATH="${ADMIN_FRONTEND_PATH:-/admin-app}"
LIGHTTPD_DOCROOT="${LIGHTTPD_DOCROOT:-/var/www/html}"
ENV_FILE="${ENV_FILE:-$REPO_DIR/.env}"
BACKEND_INTERNAL_HOST="${BACKEND_INTERNAL_HOST:-127.0.0.1}"

FORCE_DEPLOY=false

for arg in "$@"; do
  case "$arg" in
    --force)
      FORCE_DEPLOY=true
      ;;
    *)
      echo "❌ Argumento desconhecido: $arg"
      exit 1
      ;;
  esac
done

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

read_env_file_var() {
  local key="$1"
  local env_file="$2"

  if [ ! -f "$env_file" ]; then
    return 1
  fi

  bash -lc '
    set -a
    source "$1" >/dev/null 2>&1
    eval "printf %s \"\${$2-}\""
  ' _ "$env_file" "$key"
}

echo "📁 Entrando em $REPO_DIR"
cd "$REPO_DIR"

ENV_BACKEND_PORT="$(read_env_file_var BACKEND_PORT "$ENV_FILE" || true)"
ENV_PORT="$(read_env_file_var PORT "$ENV_FILE" || true)"
BACKEND_INTERNAL_PORT="${BACKEND_INTERNAL_PORT:-${BACKEND_PORT:-${ENV_BACKEND_PORT:-${PORT:-${ENV_PORT:-3002}}}}}"
BACKEND_HEALTHCHECK_URL="${BACKEND_HEALTHCHECK_URL:-http://${BACKEND_INTERNAL_HOST}:${BACKEND_INTERNAL_PORT}/health}"

if ! [[ "$BACKEND_INTERNAL_PORT" =~ ^[1-9][0-9]*$ ]]; then
  echo "❌ Porta interna do backend inválida: $BACKEND_INTERNAL_PORT"
  exit 1
fi

export BACKEND_PORT="${BACKEND_PORT:-$BACKEND_INTERNAL_PORT}"

echo "🔍 Verificando atualizações em origin/$DEPLOY_BRANCH..."
git fetch origin "$DEPLOY_BRANCH"

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$DEPLOY_BRANCH")"

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  if [ "$FORCE_DEPLOY" = true ]; then
    echo "⚠️ Sem mudanças, mas continuando devido ao parâmetro --force"
  else
    echo "✅ Sem mudanças"
    exit 0
  fi
fi

echo "🚀 Atualizando projeto..."
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "📦 Instalando dependências..."
npm install

echo "🏗️ Compilando bundle de templates SSR..."
npm run build:templates

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
echo "   Processo: $PM2_APP_NAME"
echo "   Entry: $BACKEND_ENTRY"
echo "   Porta interna: ${BACKEND_INTERNAL_HOST}:${BACKEND_INTERNAL_PORT}"

if [ "$PM2_APP_NAME" = "presell-backend" ] && \
   [ "$LEGACY_PM2_APP_NAME" != "$PM2_APP_NAME" ] && \
   pm2 describe "$LEGACY_PM2_APP_NAME" >/dev/null 2>&1; then
  echo "🧹 Removendo processo legado do PM2: $LEGACY_PM2_APP_NAME"
  pm2 delete "$LEGACY_PM2_APP_NAME"
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$PM2_APP_NAME"
fi

pm2 start "$BACKEND_ENTRY" --name "$PM2_APP_NAME" --cwd "$REPO_DIR"
pm2 save

echo "🩺 Validando healthcheck do backend..."
curl \
  --fail \
  --silent \
  --show-error \
  --retry 15 \
  --retry-delay 1 \
  --retry-connrefused \
  "$BACKEND_HEALTHCHECK_URL" >/dev/null

echo "🖼️  Re-renderizando HTML SSR de todos os presells publicados..."
node "$REPO_DIR/backend/scripts/rerender-all.js" || echo "⚠️  Re-render concluído com falhas (veja logs acima)"

echo "✅ Deploy concluído"
echo "   Frontend: $FRONTEND_TARGET_DIR"
echo "   Backend PM2: $PM2_APP_NAME"
echo "   Backend healthcheck: $BACKEND_HEALTHCHECK_URL"