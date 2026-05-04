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

export type AdminContract = {
  name: string
  version: string
  basePath: string
  auth: {
    strategy: string
    csrf: {
      header: string
      body: string[]
    }
  }
  versioning: {
    strategy: string
    breakingChangePlan: string
  }
  pagination: {
    type: string
    defaultLimit: number
    maxLimit: number
    cursorEncoding: string
  }
  endpoints: Array<{
    operationId: string
    method: string
    path: string
    auth: string
    csrf?: string
    note?: string
    request?: string
    response?: string
  }>
}

export type MediaReference = {
  fileName: string
  originalName: string | null
  mimeType: string | null
  size: number | null
  url: string
}

export type TemplateField = {
  name: string
  label: string
  type: string
  defaultValue: unknown
  helpText: string | null
  min: number | null
  max: number | null
  step: number | null
  previewSelector: string | null
  options: Array<{
    value: string
    label: string
  }>
}

export type TemplateMetadata = {
  id: string
  name: string
  description: string
  renderer?: {
    templateId: string
    kind: string
    engine: string
    entry: string
    view: string
    fileName: string
  }
  previewContract?: {
    schemaVersion: number
    templateId: string
    selectors?: Record<string, string>
    fields?: Array<{
      key: string
      inputName: string
      selector: string
      source: string
    }>
  }
  fields: TemplateField[]
}

export type TemplateCatalogResponse = {
  items: TemplateMetadata[]
}

export type PresellStatus = 'draft' | 'published'

export type PresellSummary = {
  id: number
  slug: string
  status: PresellStatus
  templateId: string
  title: string
  headline: string
  subtitle: string
  ctaText: string
  affiliateUrl: string
  published: boolean
  media: {
    heroImage: MediaReference | null
    backgroundImage: MediaReference | null
  }
  tracking: {
    googlePixelId: string | null
  }
  timestamps: {
    createdAt: string | null
    updatedAt: string | null
  }
}

export type PresellDetail = PresellSummary & {
  body: string
  bullets: string[]
  settings: Record<string, unknown>
  urls: {
    publicPage: string
    redirect: string
    adminPreview: string
  }
}

export type PresellListResponse = {
  items: PresellSummary[]
  pageInfo: {
    limit: number
    nextCursor: string | null
    hasMore: boolean
  }
}

export type PresellListFilters = {
  cursor?: string
  limit?: number
  status?: PresellStatus
  templateId?: string
}

export type AnalyticsSummary = {
  totalUsers: number
  recentSales: number
  systemHealth: 'healthy' | 'degraded'
}

export type AnalyticsOverview = {
  totals: {
    views: number
    clicks: number
    redirects: number
    ctr: number
  }
  byPresell: Array<{
    presell: {
      id: number
      slug: string
      title: string
    }
    views: number
    clicks: number
    redirects: number
    ctr: number
  }>
  recentEvents: Array<{
    id: number
    presellId: number | null
    eventType: string
    sessionKey: string | null
    referrer: string | null
    userAgent: string | null
    params: Record<string, unknown>
    createdAt: string | null
  }>
  sources: Array<{
    source: string | null
    total: number
  }>
}

export type PresellStatistics = {
  presell: PresellSummary
  summary: {
    views: number
    clicks: number
    redirects: number
    ctr: number
  }
  timeSeries: Array<{
    date: string
    views: number
    clicks: number
    redirects: number
    ctr: number
  }>
  gclidStats: Array<{
    gclid: string
    totalEvents: number
    views: number
    clicks: number
    redirects: number
    ctr: number
  }>
  utmSources: Array<{
    source: string
    total: number
  }>
  referrers: Array<{
    referrer: string
    total: number
  }>
  recentEvents: AnalyticsOverview['recentEvents']
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

export const adminApi = {
  getSession() {
    return apiClient.get<AdminSession>(appConfig.auth.sessionPath)
  },
  createSession(payload: LoginPayload, csrfToken: string | null) {
    return apiClient.post<AdminSession>(appConfig.auth.sessionPath, {
      body: payload,
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    })
  },
  deleteSession(csrfToken: string | null) {
    return apiClient.delete<AdminSession>(appConfig.auth.sessionPath, {
      headers: csrfToken ? { 'x-csrf-token': csrfToken } : undefined,
    })
  },
  getContracts() {
    return apiClient.get<AdminContract>('/admin/contracts')
  },
  listTemplates() {
    return apiClient.get<TemplateCatalogResponse>('/admin/templates')
  },
  listPresells(filters: PresellListFilters = {}) {
    return apiClient.get<PresellListResponse>('/admin/presells', {
      query: {
        cursor: filters.cursor,
        limit: filters.limit,
        status: filters.status,
        templateId: filters.templateId,
      },
    })
  },
  getPresell(id: number | string) {
    return apiClient.get<PresellDetail>(`/admin/presells/${id}`)
  },
  getAnalyticsOverview() {
    return apiClient.get<AnalyticsOverview>('/admin/analytics/overview')
  },
  getAnalyticsSummary() {
    return apiClient.get<AnalyticsSummary>('/admin/analytics/summary')
  },
  getPresellStatistics(id: number | string) {
    return apiClient.get<PresellStatistics>(`/admin/analytics/presells/${id}`)
  },
}
