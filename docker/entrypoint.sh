#!/bin/sh
set -e

# Gera rendered_html para presells published que ainda não têm HTML estático.
# Idempotente: não faz nada se todos já estiverem populados.
# Falhas individuais são logadas mas não abortam a inicialização.
node backend/scripts/backfill-rendered-html.js || true

exec node backend/src/server.js
