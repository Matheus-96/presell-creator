import type { PresellSummary } from '@/features/presells/types.ts'

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
  gclidDwellTime: Array<{
    gclid: string
    avgDwellSeconds: number
    sessionsWithClick: number
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
  avgTimeOnPage: { avgSeconds: number; sampleCount: number } | null
}
