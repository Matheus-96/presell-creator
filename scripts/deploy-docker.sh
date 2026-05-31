#!/bin/bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-/home/victor/presell-creator}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-master}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yaml}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-http://localhost:80/health}"
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

echo "📁 Entrando em $REPO_DIR"
cd "$REPO_DIR"

echo "🔍 Verificando atualizações em origin/$DEPLOY_BRANCH..."
git fetch origin "$DEPLOY_BRANCH"

LOCAL_COMMIT="$(git rev-parse HEAD)"
REMOTE_COMMIT="$(git rev-parse "origin/$DEPLOY_BRANCH")"

if [ "$LOCAL_COMMIT" = "$REMOTE_COMMIT" ]; then
  if [ "$FORCE_DEPLOY" = true ]; then
    echo "⚠️ Sem mudanças, mas continuando devido ao --force"
  else
    echo "✅ Sem mudanças — nada a fazer"
    exit 0
  fi
fi

echo "🚀 Atualizando código..."
git pull --ff-only origin "$DEPLOY_BRANCH"

echo "🐳 Buildando imagens e subindo containers..."
docker compose -f "$COMPOSE_FILE" up -d --build --remove-orphans

echo "🩺 Aguardando healthcheck em $HEALTHCHECK_URL..."
curl \
  --fail \
  --silent \
  --show-error \
  --retry 20 \
  --retry-delay 3 \
  --retry-connrefused \
  "$HEALTHCHECK_URL" >/dev/null

echo "✅ Deploy concluído"
echo "   Compose file: $COMPOSE_FILE"
echo "   Healthcheck:  $HEALTHCHECK_URL"
