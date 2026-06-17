import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import {
  getPresellV2ById,
  updatePresellV2,
} from '@/features/presells-v2/lib/presells-v2-api.ts'

const mockGetById = vi.mocked(getPresellV2ById)
const mockUpdate = vi.mocked(updatePresellV2)

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

function makeFullSections(headline = 'Headline da Página'): Section[] {
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
      type: 'faq',
      order: 1,
      props: {
        title: 'Perguntas frequentes',
        items: [{ question: 'Como funciona?', answer: 'Funciona muito bem.' }],
      },
    },
    {
      type: 'testimonials',
      order: 2,
      props: {
        title: 'Depoimentos',
        items: [
          { name: 'Ana', role: 'Cliente', text: 'Adorei!', avatarUrl: null },
        ],
      },
    },
    {
      type: 'footer',
      order: 3,
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

    const slugInput = (await screen.findByLabelText(/^slug$/i)) as HTMLInputElement
    expect(slugInput.value).toBe('minha-pagina')
    expect(slugInput.readOnly).toBe(true)
  })

  it('renders the SectionsPreview with the loaded sections', async () => {
    mockGetById.mockResolvedValue(
      makeDetail({ sections: makeSections('Headline Carregado') }),
    )
    renderPage()

    const preview = await screen.findByTestId('sections-preview')
    await waitFor(() => {
      expect(within(preview).getByText('Headline Carregado')).toBeDefined()
      expect(within(preview).getByText('Texto legal')).toBeDefined()
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

describe('PresellsV2EditPage forms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('typing in the Hero headline input updates the preview live', async () => {
    mockGetById.mockResolvedValue(
      makeDetail({ sections: makeSections('Original') }),
    )
    renderPage()

    const headlineInput = (await screen.findByLabelText(
      /^headline$/i,
    )) as HTMLInputElement
    expect(headlineInput.value).toBe('Original')

    await userEvent.clear(headlineInput)
    await userEvent.type(headlineInput, 'Novo Headline')

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Novo Headline' })).toBeDefined()
    })
  })

  it('does not render FAQ or Testimonials accordions when those sections are absent', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeSections() }))
    renderPage()

    await screen.findByLabelText(/^slug$/i)
    expect(screen.queryByRole('button', { name: /adicionar pergunta/i })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /adicionar depoimento/i }),
    ).toBeNull()
  })

  it('renders FAQ accordion when faq section is present', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeFullSections() }))
    renderPage()

    await screen.findByLabelText(/^slug$/i)
    expect(screen.getByRole('button', { name: /adicionar pergunta/i })).toBeDefined()
  })

  it('adds an FAQ item through the add modal', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeFullSections() }))
    renderPage()

    const addBtn = await screen.findByRole('button', {
      name: /adicionar pergunta/i,
    })
    await userEvent.click(addBtn)

    const dialog = await screen.findByRole('dialog')
    await userEvent.type(
      within(dialog).getByLabelText(/pergunta/i),
      'Quanto custa?',
    )
    await userEvent.type(
      within(dialog).getByLabelText(/resposta/i),
      'Bem barato.',
    )
    await userEvent.click(
      within(dialog).getByRole('button', { name: /^adicionar$/i }),
    )

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull()
    })
    const preview = await screen.findByTestId('sections-preview')
    expect(within(preview).getByText('Quanto custa?')).toBeDefined()
  })

  it('cancel on add modal does not add the item', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeFullSections() }))
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: /adicionar pergunta/i }),
    )
    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /cancelar/i }),
    )

    expect(screen.queryByRole('dialog')).toBeNull()
    const preview = screen.getByTestId('sections-preview')
    expect(within(preview).getByText('Como funciona?')).toBeDefined()
  })

  it('removes an FAQ item via confirm modal', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeFullSections() }))
    renderPage()

    const preview = await screen.findByTestId('sections-preview')
    await waitFor(() =>
      expect(within(preview).getByText('Como funciona?')).toBeDefined(),
    )

    const removeBtns = await screen.findAllByRole('button', {
      name: /remover pergunta/i,
    })
    await userEvent.click(removeBtns[0])

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /confirmar/i }),
    )

    await waitFor(() => {
      expect(within(preview).queryByText('Como funciona?')).toBeNull()
    })
  })

  it('cancel on remove modal keeps the item', async () => {
    mockGetById.mockResolvedValue(makeDetail({ sections: makeFullSections() }))
    renderPage()

    const preview = await screen.findByTestId('sections-preview')
    await waitFor(() =>
      expect(within(preview).getByText('Como funciona?')).toBeDefined(),
    )

    const removeBtns = await screen.findAllByRole('button', {
      name: /remover pergunta/i,
    })
    await userEvent.click(removeBtns[0])

    const dialog = await screen.findByRole('dialog')
    await userEvent.click(
      within(dialog).getByRole('button', { name: /cancelar/i }),
    )

    expect(within(preview).getByText('Como funciona?')).toBeDefined()
  })
})

describe('PresellsV2EditPage save flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updatePresellV2 with the current sections on save', async () => {
    mockGetById.mockResolvedValue(
      makeDetail({ sections: makeSections('Original') }),
    )
    mockUpdate.mockResolvedValue(makeDetail())
    renderPage()

    const headlineInput = (await screen.findByLabelText(
      /^headline$/i,
    )) as HTMLInputElement
    await userEvent.clear(headlineInput)
    await userEvent.type(headlineInput, 'Modificado')

    await userEvent.click(
      screen.getByRole('button', { name: /salvar altera/i }),
    )

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })
    const [calledId, payload] = mockUpdate.mock.calls[0]
    expect(calledId).toBe('42')
    expect(payload.sections).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'hero',
          props: expect.objectContaining({ headline: 'Modificado' }),
        }),
      ]),
    )
  })

  it('navigates to /presells-v2 on save success', async () => {
    mockGetById.mockResolvedValue(makeDetail())
    mockUpdate.mockResolvedValue(makeDetail())
    renderPage()

    await screen.findByLabelText(/^slug$/i)
    await userEvent.click(
      screen.getByRole('button', { name: /salvar altera/i }),
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/presells-v2')
    })
  })

  it('shows inline error and does not navigate on save error', async () => {
    mockGetById.mockResolvedValue(makeDetail())
    mockUpdate.mockRejectedValue(new Error('Falha na rede'))
    renderPage()

    await screen.findByLabelText(/^slug$/i)
    await userEvent.click(
      screen.getByRole('button', { name: /salvar altera/i }),
    )

    await waitFor(() => {
      expect(screen.getByText(/falha na rede/i)).toBeDefined()
    })
    expect(mockNavigate).not.toHaveBeenCalled()
  })
})
