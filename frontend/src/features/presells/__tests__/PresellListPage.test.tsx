import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PresellListPage } from '@/features/presells/pages/PresellListPage.tsx'
import type { PresellSummary, TemplateMetadata } from '@/features/presells/types.ts'

vi.mock('@/features/presells/lib/presells-api.ts', () => ({
  listPresells: vi.fn(),
}))

vi.mock('@/features/templates/lib/templates-api.ts', () => ({
  listTemplates: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { listPresells } from '@/features/presells/lib/presells-api.ts'
import { listTemplates } from '@/features/templates/lib/templates-api.ts'

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
    tracking: { googlePixelId: null, trackingParam: 'gclid' },
    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }
}

const defaultPageInfo = { limit: 50, nextCursor: null, hasMore: false }

function makeListResponse(items: PresellSummary[]) {
  return { items, pageInfo: defaultPageInfo }
}

function makeTemplate(overrides: Partial<TemplateMetadata> = {}): TemplateMetadata {
  return {
    id: 'advertorial',
    name: 'Advertorial',
    description: 'Classic advertorial layout',
    fields: [],
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/presells']}>
        <Routes>
          <Route path="/presells" element={<PresellListPage />} />
          <Route path="/presells/new" element={<div>New page</div>} />
          <Route path="/presells/:id/edit" element={<div>Edit page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PresellListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListTemplates.mockResolvedValue({ items: [makeTemplate()] })
  })

  it('renders presells returned by the API', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([makePresell({ title: 'My Presell' })]))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('My Presell')).toBeDefined()
    })
  })

  it('navigates to /presells/new when "New presell" is clicked', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([]))
    renderPage()

    await waitFor(() => expect(mockListPresells).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: /novo presell/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/presells/new')
  })

  it('navigates to /presells/:id/edit when "Editar" is clicked', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([makePresell({ id: 42, title: 'Click Me' })]))
    renderPage()

    await waitFor(() => expect(screen.getByText('Click Me')).toBeDefined())

    await userEvent.click(screen.getByRole('button', { name: /editar/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/presells/42/edit')
  })

  it('filters presells by search term', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([
      makePresell({ id: 1, title: 'Alpha Presell' }),
      makePresell({ id: 2, title: 'Beta Presell' }),
    ]))
    renderPage()

    await waitFor(() => expect(screen.getByText('Alpha Presell')).toBeDefined())

    await userEvent.type(screen.getByRole('searchbox'), 'Alpha')

    expect(screen.getByText('Alpha Presell')).toBeDefined()
    expect(screen.queryByText('Beta Presell')).toBeNull()
  })

  it('filters presells by status', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([
      makePresell({ id: 1, title: 'Draft One', status: 'draft' }),
      makePresell({ id: 2, title: 'Published One', status: 'published' }),
    ]))
    renderPage()

    await waitFor(() => expect(screen.getByText('Draft One')).toBeDefined())

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'published')

    expect(screen.queryByText('Draft One')).toBeNull()
    expect(screen.getByText('Published One')).toBeDefined()
  })

  it('shows empty state when no presells match filters', async () => {
    mockListPresells.mockResolvedValue(makeListResponse([makePresell({ title: 'Only One' })]))
    renderPage()

    await waitFor(() => expect(screen.getByText('Only One')).toBeDefined())

    await userEvent.type(screen.getByRole('searchbox'), 'zzz-no-match')

    expect(screen.getByText(/nenhum presell/i)).toBeDefined()
  })

  it('shows error state when the API fails', async () => {
    mockListPresells.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/não foi possível/i)).toBeDefined()
    })
  })
})
