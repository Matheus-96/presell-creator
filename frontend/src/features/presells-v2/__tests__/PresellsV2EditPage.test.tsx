import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { PresellsV2EditPage } from '@/features/presells-v2/pages/PresellsV2EditPage.tsx'
import type { PresellV2Detail } from '@/features/presells-v2/lib/presells-v2-api.ts'
import type { Section } from '@/features/presells-v2/sections/types.ts'

vi.mock('@/features/presells-v2/lib/presells-v2-api.ts', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/presells-v2/lib/presells-v2-api.ts')
  >()
  return {
    ...actual,
    getPresellV2ById: vi.fn(),
    updatePresellV2: vi.fn(),
  }
})

import { getPresellV2ById } from '@/features/presells-v2/lib/presells-v2-api.ts'

const mockGetById = vi.mocked(getPresellV2ById)

function makeSections(headline = 'Headline da Página'): Section[] {
  return [
    {
      type: 'hero',
      order: 0,
      props: {
        headline,
        subtitle: 'Subtítulo',
        ctaText: 'Comprar agora',
        ctaUrl: 'https://aff.example.com/x',
        imageUrl: null,
        bgColor: '#ffffff',
      },
    },
    {
      type: 'footer',
      order: 1,
      props: {
        legalText: 'Texto legal',
        links: [{ label: 'Termos', url: '#' }],
      },
    },
  ]
}

function makeDetail(overrides: Partial<PresellV2Detail> = {}): PresellV2Detail {
  return {
    id: 42,
    slug: 'meu-presell-v2',
    affiliateUrl: 'https://aff.example.com/x',
    sections: makeSections(),
    renderedHtml: null,
    createdAt: '2026-06-13T10:00:00.000Z',
    updatedAt: '2026-06-13T10:00:00.000Z',
    ...overrides,
  }
}

function renderPage(id = '42') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/presells-v2/${id}/edit`]}>
        <Routes>
          <Route path="/presells-v2/:id/edit" element={<PresellsV2EditPage />} />
          <Route path="/presells-v2" element={<div>V2 list page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PresellsV2EditPage skeleton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state before the detail arrives', () => {
    mockGetById.mockImplementation(() => new Promise(() => {}))
    renderPage()
    expect(screen.getByText(/carregando presell v2/i)).toBeDefined()
  })

  it('shows an error state when the GET fails', async () => {
    mockGetById.mockRejectedValue(new Error('Network down'))
    renderPage()
    await waitFor(() => {
      expect(
        screen.getByText(/não foi possível carregar/i),
      ).toBeDefined()
    })
  })

  it('renders the slug as a readonly input at the top', async () => {
    mockGetById.mockResolvedValue(makeDetail({ slug: 'minha-pagina' }))
    renderPage()

    const slugInput = (await screen.findByLabelText(/slug/i)) as HTMLInputElement
    expect(slugInput.value).toBe('minha-pagina')
    expect(slugInput.readOnly).toBe(true)
  })

  it('renders the SectionsPreview with the loaded sections', async () => {
    mockGetById.mockResolvedValue(
      makeDetail({ sections: makeSections('Headline Carregado') }),
    )
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Headline Carregado')).toBeDefined()
      expect(screen.getByText('Texto legal')).toBeDefined()
    })
  })

  it('calls getPresellV2ById with the id from the route param', async () => {
    mockGetById.mockResolvedValue(makeDetail())
    renderPage('123')
    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith('123')
    })
  })
})
