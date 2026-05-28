# Presell Creator Frontend

React + TypeScript + Vite admin shell for the split Presell Creator frontend.

## Scripts

- `npm run dev` — start the Vite dev server
- `npm run start` — build and preview the production bundle
- `npm run build` — type-check and build the app
- `npm run lint` — run the frontend ESLint config
- `npm run preview` — preview the production build locally

From the repository root, the same workspace can be driven with:

- `npm run dev:frontend`
- `npm run start:frontend`
- `npm run lint:frontend`
- `npm run build:frontend`

## Runtime configuration

Copy `.env.example` when the frontend needs non-default values.

- `VITE_APP_NAME` — shell title and runtime labels
- `VITE_API_BASE_URL` — shared base URL for the API client
- `VITE_LEGACY_ADMIN_URL` — fallback link to the existing server-rendered admin
- `VITE_AUTH_MODE` — `session` by default, or `placeholder` for scaffold-only mode
- `VITE_AUTH_SESSION_PATH` — session-check path relative to the API base URL
- `DEV_PROXY_TARGET` — optional backend target used by the Vite dev server for `/api`, `/admin`, `/p`, and related routes

## Current structure

```text
src/
  app/         app bootstrap, route composition, shell, providers
  components/  shared layout/UI primitives
  config/      runtime env parsing
  features/    auth, dashboard, presells, templates, settings
  hooks/       reusable hooks
  lib/         API client, admin API adapters, formatting helpers
  styles/      global styles
```

The current scope intentionally stops short of the full editor: the shell now handles login, guarded routing, navigation, live listings, and analytics while leaving deep authoring workflows for later slices.
