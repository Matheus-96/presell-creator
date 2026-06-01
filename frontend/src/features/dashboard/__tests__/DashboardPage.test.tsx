import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage.tsx'
import type { PresellSummary } from '@/features/presells/types.ts'
import type { AnalyticsOverview, AnalyticsSummary } from '@/features/analytics/types.ts'

vi.mock('@/features/analytics/lib/analytics-api.ts', () => ({
  getAnalyticsSummary: vi.fn(),
  getAnalyticsOverview: vi.fn(),
}))

vi.mock('@/features/presells/lib/presells-api.ts', () => ({
  listPresells: vi.fn(),
  listTemplates: vi.fn(),
}))


import { getAnalyticsSummary, getAnalyticsOverview } from '@/features/analytics/lib/analytics-api.ts'
import { listPresells, listTemplates } from '@/features/presells/lib/presells-api.ts'

const mockGetAnalyticsSummary = vi.mocked(getAnalyticsSummary)
const mockGetAnalyticsOverview = vi.mocked(getAnalyticsOverview)
const mockListPresells = vi.mocked(listPresells)
const mockListTemplates = vi.mocked(listTemplates)

function makePresell(overrides: Partial<PresellSummary> = {}): PresellSummary {
  return {
    id: 1,
    slug: 'my-presell',
    status: 'draft',
    templateId: 'advertorial',
    title: 'My Presell',
    headline: 'Big Headline',
    subtitle: '',
    ctaText: 'Buy now',
    affiliateUrl: 'https://example.com',
    published: false,
    media: { heroImage: null, backgroundImage: null },
    tracking: { 
      googlePixelId: null,
      trackingParam: 'sid'
     },

    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }
}

function makeSummary(overrides: Partial<AnalyticsSummary> = {}): AnalyticsSummary {
  return {
    totalUsers: 10,
    recentSales: 3,
    systemHealth: 'healthy',
    ...overrides,
  }
}

function makeOverview(overrides: Partial<AnalyticsOverview> = {}): AnalyticsOverview {
  return {
    totals: { views: 500, clicks: 50, redirects: 20, ctr: 0.1 },
    byPresell: [],
    recentEvents: [],
    sources: [],
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetAnalyticsSummary.mockResolvedValue(makeSummary())
    mockGetAnalyticsOverview.mockResolvedValue(makeOverview())
    mockListPresells.mockResolvedValue({
      items: [makePresell({ title: 'Featured Presell' })],
      pageInfo: {
        hasMore: false,
        limit: 1,
        nextCursor: ''
      }
    })
    mockListTemplates.mockResolvedValue({ items: [] })
  })

  it('renders presells returned by the API', async () => {
    mockListPresells.mockResolvedValue({
      items: [makePresell({ title: 'Featured Presell' })],
      pageInfo: {
        hasMore: false,
        limit: 1,
        nextCursor: ''
      }
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Featured Presell')).toBeDefined()
    })
  })

  it('renders analytics overview metrics', async () => {
    mockGetAnalyticsOverview.mockResolvedValue(
      makeOverview({ totals: { views: 1234, clicks: 100, redirects: 50, ctr: 0.08 } }),
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('1,2 mil')).toBeDefined()
    })
  })

  it('renders system health from analytics summary', async () => {
    mockGetAnalyticsSummary.mockResolvedValue(makeSummary({ systemHealth: 'degraded' }))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('degraded')).toBeDefined()
    })
  })

  it('shows error banner when a query fails', async () => {
    mockListPresells.mockRejectedValue(new Error('Server error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/i)).toBeDefined()
    })
  })

  it('shows loading placeholder while queries are pending', async () => {
    mockListPresells.mockImplementation(() => new Promise(() => {}))
    renderPage()

    expect(screen.getAllByText('…').length).toBeGreaterThan(0)
  })
})
