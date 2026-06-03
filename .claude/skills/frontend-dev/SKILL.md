---
name: frontend-dev
description: Reference for developing and analysing the refactored React frontend (frontend/src/). Use when adding pages, components, hooks, or styles; reviewing frontend architecture in this project.
---

# Frontend Dev

## Stack

React 19 + TypeScript + Vite 8 + React Router 7. No Bootstrap — custom CSS only (`src/styles/global.css`). Path alias `@` maps to `src/`.

## Structure

```
frontend/src/
  features/<domain>/   # pages, components, API calls per domain
  lib/                 # shared utilities
  components/          # shared UI components
  styles/global.css    # global styles
```

New code goes in `src/features/<domain>/`. Shared things go in `src/lib/` or `src/components/`.

## Auth flow

- On load, call `GET /api/admin/session` to check auth state and retrieve `csrfToken`.
- Pass `csrfToken` as `x-csrf-token` header on every mutating request (POST/PUT/PATCH/DELETE).
- Auth mode controlled by `VITE_AUTH_MODE` (`session` default, `placeholder` for dev bypass).

## Vite proxy (dev)

Vite proxies these paths to `DEV_PROXY_TARGET` (default `http://127.0.0.1:3001`):
`/api`, `/p`, `/go`, `/media`, `/health`, `/static`

The `base` path in vite config matches `ADMIN_FRONTEND_PATH` (default `/admin`).

## Env vars (build-time, set in repo root `.env`)

| Variable | Purpose |
|---|---|
| `VITE_APP_NAME` | Display name |
| `VITE_API_BASE_URL` | API base path (default `/api`) |
| `VITE_AUTH_MODE` | `session` or `placeholder` |
| `VITE_AUTH_SESSION_PATH` | Session endpoint (default `/admin/session`) |
| `VITE_LEGACY_ADMIN_URL` | Fallback link to EJS admin (default `/admin`) |

## Running

```bash
npm run dev:frontend    # Vite dev server
npm run build:frontend  # Production build → frontend/dist/
```

## Key conventions

- Feature-slice: each domain is self-contained — no cross-feature imports except through `src/lib/` or `src/components/`.
- Presell templates live at `frontend/src/features/presells/templates/` — see the **create-template** skill for adding new ones.
- The backend serves `frontend/dist/` when it exists; always rebuild before testing production routing.

## Styling rule (active migration)

**Use Tailwind classes — never `style={{}}`.**

Older components (`MediaPicker`, `AnalyzeUrlSection`, `ThemeEditor`, `FormSection`, `BenefitsList`, `PublishReadinessBlock`) still use inline styles. When touching any of these files, migrate the changed sections to Tailwind before committing. Do not do big-bang rewrites — migrate incrementally as you touch each component. This rule stays active until all inline styles are eliminated.

Design tokens (`var(--p-*)`) that have no Tailwind equivalent should be extracted to `global.css` as `@layer utilities` or `@layer components` classes — do not reference them as inline `style` props.

## API calls rule

All HTTP calls must go through `src/lib/api/api-client.ts` (`apiClient`). Never use raw `fetch()` or axios directly — `api-client` injects the CSRF token and normalizes errors automatically.

`navigator.sendBeacon()` is the only exception — it is a fire-and-forget browser API used for telemetry/analytics (presell redirect and time-on-page events) and does not need CSRF or error normalization.
