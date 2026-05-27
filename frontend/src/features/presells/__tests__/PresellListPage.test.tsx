import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PresellListPage } from '@/features/presells/pages/PresellListPage.tsx'
import type { PresellSummary, TemplateMetadata } from '@/features/presells/types.ts'

vi.mock('@/features/presells/lib/presells-api.ts', () => ({
  listPresells: vi.fn(),
  listTemplates: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { listPresells, listTemplates } from '@/features/presells/lib/presells-api.ts'

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
    tracking: { googlePixelId: null },
    timestamps: { createdAt: null, updatedAt: null },
    ...overrides,
  }
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
    mockListPresells.mockResolvedValue({ items: [makePresell({ title: 'My Presell' })] })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('My Presell')).toBeDefined()
    })
  })

  it('navigates to /presells/new when "New presell" is clicked', async () => {
    mockListPresells.mockResolvedValue({ items: [] })
    renderPage()

    await waitFor(() => expect(mockListPresells).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: /new presell/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/presells/new')
  })

  it('navigates to /presells/:id/edit when a presell is clicked', async () => {
    mockListPresells.mockResolvedValue({ items: [makePresell({ id: 42, title: 'Click Me' })] })
    renderPage()

    await waitFor(() => expect(screen.getByText('Click Me')).toBeDefined())

    await userEvent.click(screen.getByText('Click Me'))

    expect(mockNavigate).toHaveBeenCalledWith('/presells/42/edit')
  })

  it('filters presells by search term', async () => {
    mockListPresells.mockResolvedValue({
      items: [
        makePresell({ id: 1, title: 'Alpha Presell' }),
        makePresell({ id: 2, title: 'Beta Presell' }),
      ],
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Alpha Presell')).toBeDefined())

    await userEvent.type(screen.getByRole('searchbox'), 'Alpha')

    expect(screen.getByText('Alpha Presell')).toBeDefined()
    expect(screen.queryByText('Beta Presell')).toBeNull()
  })

  it('filters presells by status', async () => {
    mockListPresells.mockResolvedValue({
      items: [
        makePresell({ id: 1, title: 'Draft One', status: 'draft' }),
        makePresell({ id: 2, title: 'Published One', status: 'published' }),
      ],
    })
    renderPage()

    await waitFor(() => expect(screen.getByText('Draft One')).toBeDefined())

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'published')

    expect(screen.queryByText('Draft One')).toBeNull()
    expect(screen.getByText('Published One')).toBeDefined()
  })

  it('shows empty state when no presells match filters', async () => {
    mockListPresells.mockResolvedValue({ items: [makePresell({ title: 'Only One' })] })
    renderPage()

    await waitFor(() => expect(screen.getByText('Only One')).toBeDefined())

    await userEvent.type(screen.getByRole('searchbox'), 'zzz-no-match')

    expect(screen.getByText(/no presells match/i)).toBeDefined()
  })

  it('shows error state when the API fails', async () => {
    mockListPresells.mockRejectedValue(new Error('Network error'))
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/could not load/i)).toBeDefined()
    })
  })
})
