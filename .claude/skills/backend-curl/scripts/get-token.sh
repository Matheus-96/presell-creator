#!/usr/bin/env bash
# Authenticates against the local backend and prints export commands for
# COOKIE (jar path) and CSRF (token string) ready to use in curl calls.

set -euo pipefail

COOKIE_JAR="/tmp/presell_cookies.txt"
BASE_URL="${BACKEND_URL:-http://localhost:3001}"
ENV_FILE="$(git rev-parse --show-toplevel 2>/dev/null)/.env"

# Load ADMIN_USER from .env if present (.env stores the hash, not the plain password)
if [[ -f "$ENV_FILE" ]]; then
  ADMIN_USER="${ADMIN_USER:-$(grep -E '^ADMIN_USER=' "$ENV_FILE" | cut -d= -f2- | tr -d '"'"'" 2>/dev/null || true)}"
fi

if [[ -z "${ADMIN_USER:-}" ]]; then
  read -rp "Admin username: " ADMIN_USER
fi

if [[ -z "${ADMIN_PASSWORD:-}" ]]; then
  read -rsp "Admin password: " ADMIN_PASSWORD
  echo ""
fi

# Step 1: seed cookie jar and get initial CSRF token
SESSION_RESP=$(curl -s -c "$COOKIE_JAR" "$BASE_URL/api/admin/session")
CSRF=$(echo "$SESSION_RESP" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [[ -z "$CSRF" ]]; then
  echo "ERROR: Could not get CSRF token. Is the backend running at $BASE_URL?" >&2
  exit 1
fi

# Step 2: login
LOGIN_RESP=$(curl -s -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
  -X POST "$BASE_URL/api/admin/session" \
  -H "Content-Type: application/json" \
  -H "x-csrf-token: $CSRF" \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESP" | grep -q '"error"'; then
  echo "ERROR: Login failed — $LOGIN_RESP" >&2
  exit 1
fi

# Step 3: refresh CSRF token (bound to authenticated session)
SESSION_RESP=$(curl -s -b "$COOKIE_JAR" "$BASE_URL/api/admin/session")
CSRF=$(echo "$SESSION_RESP" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

echo ""
echo "# Paste these into your terminal:"
echo "export COOKIE=\"$COOKIE_JAR\""
echo "export CSRF=\"$CSRF\""
echo ""
echo "# Then use in curl:"
echo "# curl -b \$COOKIE http://localhost:3001/api/admin/presells"
echo "# curl -b \$COOKIE -X POST ... -H \"x-csrf-token: \$CSRF\" ..."
