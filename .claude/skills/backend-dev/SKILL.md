---
name: backend-dev
description: Reference for developing and analysing the refactored Express backend (backend/src/). Use when adding routes, controllers, services, repositories, migrations, or auth middleware; debugging session/CSRF issues; or reviewing backend architecture in this project.
---

# Backend Dev

## Stack

Node ≥ 22.5, Express, SQLite via `node:sqlite` (built-in). Session-based auth (no JWT).

## Entry points

```
backend/src/server.js
  └── bootstrap/createApp.js   # creates Express app
  └── bootstrap/startServer.js # binds to port
```

## Layer structure

| Layer | Path | Responsibility |
|---|---|---|
| config | `config/env.js` | All env parsing — always call `getEnv()` |
| config | `config/paths.js` | Absolute path constants |
| contracts | `contracts/` | Serialize/deserialize API responses; decouple HTTP shape from DB shape |
| repositories | `repositories/` | Raw SQLite via prepared statements |
| services | `services/` | Business logic, orchestrates repositories |
| controllers | `controllers/` | Route handlers (`adminApiController.js`, `publicController.js`) |
| routes | `routes/` | Express routers — `apiAdmin.js` → `/api/admin`, `apiPublic.js` → `/api/public` |
| templates | `templates/registry.js` | Manifest registry for presell templates |

## Auth model

- Session-based only (no JWT).
- CSRF token sent as `x-csrf-token` request header (not a hidden form field).
- Session state at `GET /api/admin/session`.
- `verifyApiCsrf` middleware validates the header on mutating routes.

## Database

- Main DB: `storage/database.sqlite`
- Sessions DB: `storage/sessions.sqlite`
- Migrations run automatically on start via `backend/src/db/migrations.js`.
- Add migrations as `runMigration("NNN_name", sql)` at the bottom of that file.

## Key env vars (repo root `.env`)

| Variable | Purpose |
|---|---|
| `PORT` | Monolith port (default 3001) |
| `BACKEND_PORT` | Split-mode backend port (falls back to `PORT`) |
| `ADMIN_USER` / `ADMIN_PASSWORD_HASH` | Admin credentials; hash via `npm run hash-password` |
| `SESSION_SECRET` | Session cookie secret |
| `SESSION_COOKIE_SECURE` | `true`, `false`, or `auto` |
| `SESSION_COOKIE_SAME_SITE` | `lax` (default), `strict`, `none` |
| `TRUST_PROXY` | Set to `1` behind nginx/Cloudflare |
| `ADMIN_FRONTEND_PATH` | Route where React SPA is served (default `/admin`) |

## Running

```bash
npm run dev:backend     # backend only
npm run dev:split       # backend + frontend together
npm run dev:monolith    # legacy monolith (src/)
```

## Conventions

- Always read env through `getEnv()` from `config/env.js` — never `process.env` directly.
- New API responses must go through a contract (`serialize*` / `deserialize*`) — don't return raw DB rows.
- Prepared statements only in repositories — no raw SQL in services or controllers.
- The template manifest (`registry.js`) lists available templates; rendering is entirely client-side.
