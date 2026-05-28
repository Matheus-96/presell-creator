export type AuthMode = 'placeholder' | 'session'

export type AppConfig = {
  appName: string
  environment: string
  adminBaseUrl: string
  apiBaseUrl: string
  legacyAdminUrl: string
  auth: {
    mode: AuthMode
    sessionPath: string
  }
}

function getStringEnv(value: string | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}

function normalizeUrlSegment(value: string | undefined, fallback: string) {
  const normalized = getStringEnv(value, fallback)

  if (/^https?:\/\//.test(normalized)) {
    return normalized.replace(/\/$/, '')
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/$/, '')}`
}

function normalizeBaseUrl(value: string | undefined) {
  const normalized = getStringEnv(value, '/')

  if (/^https?:\/\//.test(normalized)) {
    return normalized.replace(/\/$/, '')
  }

  if (normalized === '/') {
    return '/'
  }

  return `/${normalized.replace(/^\/+/, '').replace(/\/+$/, '')}`
}

function getAuthMode(value: string | undefined): AuthMode {
  return value === 'placeholder' ? 'placeholder' : 'session'
}

export function joinConfigUrl(baseUrl: string, suffix: string) {
  if (!suffix.startsWith('/')) {
    throw new Error(`Expected suffix to start with "/" but received "${suffix}".`)
  }

  if (baseUrl === '/') {
    return suffix
  }

  return `${baseUrl.replace(/\/$/, '')}${suffix}`
}

const adminBaseUrl = normalizeBaseUrl(import.meta.env.BASE_URL)

export const appConfig: Readonly<AppConfig> = Object.freeze({
  appName: getStringEnv(import.meta.env.VITE_APP_NAME, 'Presell Creator Admin'),
  adminBaseUrl,
  environment: import.meta.env.MODE,
  apiBaseUrl: normalizeUrlSegment(import.meta.env.VITE_API_BASE_URL, '/api'),
  legacyAdminUrl: normalizeUrlSegment(
    import.meta.env.VITE_LEGACY_ADMIN_URL,
    adminBaseUrl,
  ),
  auth: {
    mode: getAuthMode(import.meta.env.VITE_AUTH_MODE),
    sessionPath: normalizeUrlSegment(
      import.meta.env.VITE_AUTH_SESSION_PATH,
      '/admin/session',
    ),
  },
})
