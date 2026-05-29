# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Workflow

Each GitHub issue gets its own branch cut from `master`. When done, open a PR targeting `master`. Never close an issue directly — the merge closes it.

```
git checkout master
git checkout -b feat/issue-N-short-description
# implement...
git push -u origin feat/issue-N-short-description
gh pr create --base master --title "..." --body "Closes #N\n..."
```

---

## Commands

This is an npm workspace monorepo. All commands run from the repo root unless noted.

### Development

```bash
# Monolith (legacy, src/) — still the deployed production path
npm run dev            # node --watch src/server.js
npm start              # node src/server.js

# Split workspaces (backend/ + frontend/) — the refactored path
npm run dev:split      # runs backend and frontend dev servers concurrently (scripts/run-split.js)
npm run dev:backend    # node --watch backend/src/server.js
npm run dev:frontend   # Vite dev server (cd frontend && npm run dev)
```

### Build & Lint

```bash
npm run build:split    # build:backend (no-op) + build:frontend (tsc + vite build)
npm run build:frontend # builds React SPA to frontend/dist/ — required before backend serves it

npm run lint           # lint monolith (src/, controllers/, routes/)
npm run lint:split     # lint backend/ and frontend/ workspaces separately

npm run hash-password -- "your-password"  # generate scrypt hash for ADMIN_PASSWORD_HASH
npm run smoke          # basic smoke test against running server
```

## Architecture

### Two deployment modes coexist on this branch

The repo contains both the **legacy monolith** (`src/`) and the **refactored split** (`backend/` + `frontend/`). The root `package.json` scripts use `:monolith` / `:split` / `:backend` / `:frontend` suffixes to target each.

---

### Refactored backend (`backend/src/`)

**Entry**: `backend/src/server.js` → `bootstrap/createApp.js` creates the Express app, `bootstrap/startServer.js` binds it.

**Layer structure:**
- `config/` — `env.js` (all env parsing in one place, call `getEnv()`), `paths.js` (absolute path constants), `cacheControl.js`
- `contracts/` — serialization/deserialization layer for all API responses. Each domain has a `serialize*` and `deserialize*` pair plus a schema object. Contracts decouple HTTP shape from DB shape.
- `repositories/` — raw SQLite access using prepared statements (`presellRepository.js`, `analyticsRepository.js`, `uploadRepository.js`)
- `services/` — business logic that orchestrates repositories
- `controllers/` — route handlers (`adminApiController.js` for the React API, `publicController.js` for presell pages, etc.)
- `routes/` — Express routers; `apiAdmin.js` mounts at `/api/admin`, `apiPublic.js` at `/api/public`
- `templates/` — template manifest registry (`registry.js`). Each template has an `id`, `fields` (used by the admin UI to render the settings form), and a `name`/`description`. No renderer config — all templates render client-side in the frontend.

**Auth model (refactored API):** Session-based only (no JWT). CSRF token is sent as `x-csrf-token` header (not hidden form field). Session state is exposed at `GET /api/admin/session`. The `verifyApiCsrf` middleware checks the header.

**Admin path routing:** Controlled by `ADMIN_FRONTEND_PATH` (default `/admin`) — where the React SPA is served. The backend serves the built frontend dist from `frontend/dist/` only when it exists.

---

### Refactored frontend (`frontend/src/`)

React 19 + TypeScript + Vite 8 + React Router 7. No Bootstrap — custom CSS only (`src/styles/global.css`). Uses `@` alias for `src/`.

**Feature-slice structure**: `src/features/<domain>/` — each domain owns its pages, components, and API calls. Shared utilities live in `src/lib/` and `src/components/`.

**Auth**: Session cookie (set by backend). The frontend calls `GET /api/admin/session` on load to check auth state, reads a `csrfToken` from the response, and passes that token as `x-csrf-token` on all mutating requests.

**Vite config**: The `base` path matches `ADMIN_FRONTEND_PATH`. In dev, Vite proxies `/api`, `/p`, `/go`, `/media`, `/health`, `/static` to `DEV_PROXY_TARGET` (default `http://127.0.0.1:3001`).

**Frontend env vars** (set at build time via `.env` in the repo root):

| Variable | Purpose |
|---|---|
| `VITE_APP_NAME` | Display name |
| `VITE_API_BASE_URL` | API base path (default `/api`) |
| `VITE_AUTH_MODE` | `session` (default) or `placeholder` |
| `VITE_AUTH_SESSION_PATH` | Session endpoint relative to `VITE_API_BASE_URL` (default `/admin/session`) |
| `VITE_LEGACY_ADMIN_URL` | Fallback link to EJS admin (default `/admin`) |

---

### Key env vars (backend, from `.env` at repo root)

| Variable | Purpose |
|---|---|
| `PORT` | Monolith port (default 3001) |
| `BACKEND_PORT` | Backend workspace port when running split (falls back to `PORT`) |
| `ADMIN_USER` / `ADMIN_PASSWORD_HASH` | Admin credentials; hash via `npm run hash-password` |
| `SESSION_SECRET` | Session cookie secret |
| `SESSION_COOKIE_SECURE` | `true`, `false`, or `auto` (auto = true when HTTPS detected) |
| `SESSION_COOKIE_SAME_SITE` | `lax` (default), `strict`, or `none` |
| `TRUST_PROXY` | Express trust proxy level; set to `1` when behind nginx/Cloudflare |
| `ADMIN_FRONTEND_PATH` | Route where the React SPA is served (default `/admin`) |

---

### Adding a new template

Templates are React components rendered entirely client-side. EJS is no longer used for presell pages (only `backend/src/views/presell/404.ejs` remains for the 404 error page).

1. Create `frontend/src/features/presells/templates/<id>.tsx` — a React component that accepts `{ presell: PresellPublicData }` and calls `registerTemplate('<id>', Component)` at the bottom.
2. Add the file to the barrel: `frontend/src/features/presells/templates/index.ts`.
3. Add a manifest entry to `backend/src/templates/registry.js` with `id`, `name`, `description`, and `fields`. The `fields` array drives the admin settings form — each field has `name`, `label`, `type`, and `defaultValue`.

No renderer config, no backend render code — `PresellPage.tsx` fetches the presell data via API and renders the matching template via `getTemplate(templateId)`.

---

### Database

SQLite via Node's built-in `node:sqlite` (Node ≥ 22.5). Files: `storage/database.sqlite` (main), `storage/sessions.sqlite` (sessions). Migrations run automatically on server start via `backend/src/db/migrations.js`. Add new migrations as `runMigration("NNN_name", sql)` calls at the bottom.
