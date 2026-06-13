import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PresellsV2ListPage } from '@/features/presells-v2/pages/PresellsV2ListPage.tsx'
import type { PresellV2Summary } from '@/features/presells-v2/lib/presells-v2-api.ts'

vi.mock('@/features/presells-v2/lib/presells-v2-api.ts', () => ({
  listPresellsV2: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import { listPresellsV2 } from '@/features/presells-v2/lib/presells-v2-api.ts'

const mockListPresellsV2 = vi.mocked(listPresellsV2)

function makeSummary(overrides: Partial<PresellV2Summary> = {}): PresellV2Summary {
  return {
    id: 1,
    slug: 'sample-v2',
    createdAt: '2026-06-13T10:00:00.000Z',
    ...overrides,
  }
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/presells-v2']}>
        <Routes>
          <Route path="/presells-v2" element={<PresellsV2ListPage />} />
          <Route path="/presells-v2/new" element={<div>New V2 page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PresellsV2ListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the presells V2 returned by the API', async () => {
    mockListPresellsV2.mockResolvedValue({
      items: [
        makeSummary({ id: 1, slug: 'alpha-v2' }),
        makeSummary({ id: 2, slug: 'beta-v2' }),
      ],
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('/alpha-v2')).toBeDefined()
      expect(screen.getByText('/beta-v2')).toBeDefined()
    })
  })

  it('renders a "Ver página" link pointing to /lp/:slug', async () => {
    mockListPresellsV2.mockResolvedValue({
      items: [makeSummary({ id: 7, slug: 'link-target' })],
    })

    renderPage()

    const link = await screen.findByRole('link', { name: /ver página/i })
    expect(link.getAttribute('href')).toBe('/lp/link-target')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('shows an empty-state with CTA when there are no items', async () => {
    mockListPresellsV2.mockResolvedValue({ items: [] })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/ainda não criou nenhum presell v2/i)).toBeDefined()
    })

    expect(
      screen.getByRole('button', { name: /criar primeiro presell v2/i }),
    ).toBeDefined()
  })

  it('navigates to /presells-v2/new when "Novo Presell V2" is clicked', async () => {
    mockListPresellsV2.mockResolvedValue({ items: [makeSummary()] })

    renderPage()

    await waitFor(() => expect(mockListPresellsV2).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: /novo presell v2/i }))

    expect(mockNavigate).toHaveBeenCalledWith('/presells-v2/new')
  })

  it('shows an error banner when the API fails', async () => {
    mockListPresellsV2.mockRejectedValue(new Error('Network error'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/não foi possível carregar/i)).toBeDefined()
    })
  })

  it('shows a loading message before the data arrives', () => {
    mockListPresellsV2.mockImplementation(() => new Promise(() => {}))

    renderPage()

    expect(screen.getByText(/carregando presells v2/i)).toBeDefined()
  })
})
