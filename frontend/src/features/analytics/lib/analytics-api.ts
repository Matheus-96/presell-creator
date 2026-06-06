import { apiClient } from '@/lib/api/api-client.ts'
import type { AnalyticsOverview, AnalyticsSummary, PresellStatistics, PresellEventsPage } from '@/features/analytics/types.ts'

export function getAnalyticsOverview() {
  return apiClient.get<AnalyticsOverview>('/admin/analytics/overview')
}

export function getAnalyticsSummary() {
  return apiClient.get<AnalyticsSummary>('/admin/analytics/summary')
}

export function getPresellStatistics(id: number | string) {
  return apiClient.get<PresellStatistics>(`/admin/analytics/presells/${id}`)
}

export type GetPresellEventsParams = {
  page?: number
  from?: string
  to?: string
  hasClickId?: true
  device?: string
  country?: string
}

export function getPresellEvents(id: number | string, params: GetPresellEventsParams = {}) {
  const query: Record<string, string | number> = { page: params.page ?? 1 }
  if (params.from) query.from = params.from
  if (params.to) query.to = params.to
  if (params.hasClickId) query.hasClickId = 'true'
  if (params.device) query.device = params.device
  if (params.country) query.country = params.country
  return apiClient.get<PresellEventsPage>(`/admin/analytics/presells/${id}/events`, { query })
}
