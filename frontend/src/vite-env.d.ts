/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_LEGACY_ADMIN_URL?: string
  readonly VITE_AUTH_MODE?: 'placeholder' | 'session'
  readonly VITE_AUTH_SESSION_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
