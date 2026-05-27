import { appConfig, joinConfigUrl } from '@/config/app-config.ts'
import { apiClient } from '@/lib/api/api-client.ts'

export type AdminSessionLinkMap = {
  session: string
  login: string
  logout: string
  contracts: string
  templates: string
  previews: string
  presells: string
  analytics: string
  analyticsSummary: string
}

export type AdminSession = {
  authenticated: boolean
  authStrategy: 'session-cookie'
  csrfToken: string | null
  user: {
    username: string
  } | null
  capabilities: string[]
  links: AdminSessionLinkMap
}

export type LoginPayload = {
  username: string
  password: string
}

export const defaultAdminLinks: AdminSessionLinkMap = {
  session: appConfig.auth.sessionPath,
  login: joinConfigUrl(appConfig.legacyAdminUrl, '/login'),
  logout: joinConfigUrl(appConfig.legacyAdminUrl, '/logout'),
  contracts: '/admin/contracts',
  templates: '/admin/templates',
  previews: '/admin/previews',
  presells: '/admin/presells',
  analytics: '/admin/analytics',
  analyticsSummary: '/admin/analytics/summary',
}

export function createGuestSession(csrfToken: string | null = null): AdminSession {
  return {
    authenticated: false,
    authStrategy: 'session-cookie',
    csrfToken,
    user: null,
    capabilities: [],
    links: defaultAdminLinks,
  }
}

export const authApi = {
  getSession() {
    return apiClient.get<AdminSession>(appConfig.auth.sessionPath)
  },
  createSession(payload: LoginPayload) {
    return apiClient.post<AdminSession>(appConfig.auth.sessionPath, { body: payload })
  },
  deleteSession() {
    return apiClient.delete<AdminSession>(appConfig.auth.sessionPath)
  },
}
