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

export function getPresellEvents(id: number | string, page = 1) {
  return apiClient.get<PresellEventsPage>(`/admin/analytics/presells/${id}/events`, { query: { page } })
}
