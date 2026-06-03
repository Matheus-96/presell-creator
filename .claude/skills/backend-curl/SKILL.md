---
name: backend-curl
description: Generates a session cookie and CSRF token to make authenticated curl calls against the local backend API. Use when testing or needing access to backend API endpoints with curl.
---

# Backend Curl

## Uso

```bash
BACKEND_URL=http://localhost:3002 ADMIN_PASSWORD=admin123 .claude/skills/backend-curl/scripts/get-token.sh
```

Cole os `export` impressos no terminal, depois use `$COOKIE` e `$CSRF` nos curls:

```bash
curl -b $COOKIE http://localhost:3002/api/admin/presells
curl -b $COOKIE -X POST ... -H "x-csrf-token: $CSRF" ...
```

## Notas

- `ADMIN_USER` é lido do `.env` automaticamente.
- `ADMIN_PASSWORD` deve ser passado via env (plain text — o `.env` só armazena o hash).
- Se receber `403 csrf_invalid`, rode o script novamente para renovar o token.
