import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { PresellsV2NewPage } from '@/features/presells-v2/pages/PresellsV2NewPage.tsx'
import type { Section } from '@/features/presells-v2/sections/types.ts'
import { ApiClientError } from '@/lib/api/api-client.ts'

vi.mock('@/features/presells-v2/lib/presells-v2-api.ts', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/features/presells-v2/lib/presells-v2-api.ts')
  >()
  return {
    ...actual,
    startAnalyzeUrlV2: vi.fn(),
    pollAnalyzeJobV2: vi.fn(),
    createPresellV2: vi.fn(),
  }
})

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mockNavigate }
})

import {
  startAnalyzeUrlV2,
  pollAnalyzeJobV2,
  createPresellV2,
} from '@/features/presells-v2/lib/presells-v2-api.ts'

const mockStartAnalyze = vi.mocked(startAnalyzeUrlV2)
const mockPollJob = vi.mocked(pollAnalyzeJobV2)
const mockCreate = vi.mocked(createPresellV2)

function makeAiSections(headline = 'Headline Incrível do Produto'): Section[] {
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
          { name: 'Ana', role: 'Cliente', text: 'Adorei o produto!', avatarUrl: null },
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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/presells-v2/new']}>
        <Routes>
          <Route path="/presells-v2/new" element={<PresellsV2NewPage />} />
          <Route path="/presells-v2" element={<div>V2 list page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillInitialForm(
  url = 'https://example.com/produto',
  affiliateUrl = 'https://aff.example.com/x',
) {
  await userEvent.type(
    screen.getByRole('textbox', { name: /url para analisar/i }),
    url,
  )
  await userEvent.type(
    screen.getByRole('textbox', { name: /affiliate.*url|link de afiliado/i }),
    affiliateUrl,
  )
}

describe('PresellsV2NewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the initial form with URL and affiliate URL inputs', () => {
    renderPage()
    expect(screen.getByRole('textbox', { name: /url para analisar/i })).toBeDefined()
    expect(
      screen.getByRole('textbox', { name: /affiliate.*url|link de afiliado/i }),
    ).toBeDefined()
    expect(screen.getByRole('button', { name: /gerar com ia/i })).toBeDefined()
  })

  it('disables "Gerar com IA" until both URL and affiliateUrl are filled with valid URLs', async () => {
    renderPage()
    const button = screen.getByRole('button', { name: /gerar com ia/i })
    expect(button).toBeDisabled()

    await userEvent.type(
      screen.getByRole('textbox', { name: /url para analisar/i }),
      'https://example.com',
    )
    expect(button).toBeDisabled()

    await userEvent.type(
      screen.getByRole('textbox', { name: /affiliate.*url|link de afiliado/i }),
      'not-a-url',
    )
    expect(button).toBeDisabled()

    await userEvent.clear(
      screen.getByRole('textbox', { name: /affiliate.*url|link de afiliado/i }),
    )
    await userEvent.type(
      screen.getByRole('textbox', { name: /affiliate.*url|link de afiliado/i }),
      'https://aff.example.com',
    )
    expect(button).not.toBeDisabled()
  })

  it('shows API status messages during polling', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-1' })
    mockPollJob
      .mockResolvedValueOnce({ status: 'extracting', message: 'Abrindo a página…' })
      .mockResolvedValueOnce({ status: 'analyzing', message: 'Consultando a IA…' })

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    await waitFor(() =>
      expect(screen.getByText(/abrindo a página/i)).toBeDefined(),
    )

    await vi.advanceTimersByTimeAsync(2500)
    await waitFor(() =>
      expect(screen.getByText(/consultando a ia/i)).toBeDefined(),
    )
  })

  it('renders 4 sections in preview and auto-fills slug from hero headline once done', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-2' })
    mockPollJob.mockResolvedValue({
      status: 'done',
      message: 'Concluído!',
      result: { sections: makeAiSections('Produto Sensacional 2026') },
    })

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    await waitFor(() =>
      expect(screen.getByText('Produto Sensacional 2026')).toBeDefined(),
    )

    expect(screen.getByText('Perguntas frequentes')).toBeDefined()
    expect(screen.getByText('Depoimentos')).toBeDefined()
    expect(screen.getByText('Texto legal')).toBeDefined()

    const slugInput = screen.getByLabelText(/slug/i) as HTMLInputElement
    expect(slugInput.value).toBe('produto-sensacional-2026')
  })

  it('disables Salvar button when the slug is empty', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-3' })
    mockPollJob.mockResolvedValue({
      status: 'done',
      message: 'Concluído!',
      result: { sections: makeAiSections() },
    })

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    const slugInput = await screen.findByLabelText(/slug/i)
    await userEvent.clear(slugInput)

    expect(screen.getByRole('button', { name: /salvar/i })).toBeDisabled()
  })

  it('navigates to /presells-v2 after a successful save', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-4' })
    mockPollJob.mockResolvedValue({
      status: 'done',
      message: 'Concluído!',
      result: { sections: makeAiSections('My Product') },
    })
    mockCreate.mockResolvedValue({
      id: 42,
      slug: 'my-product',
      affiliateUrl: 'https://aff.example.com/x',
      sections: makeAiSections('My Product'),
      renderedHtml: null,
      createdAt: '2026-06-13T10:00:00.000Z',
      updatedAt: '2026-06-13T10:00:00.000Z',
    })

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    await screen.findByLabelText(/slug/i)
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        slug: 'my-product',
        affiliateUrl: 'https://aff.example.com/x',
        sections: expect.any(Array),
      })
      expect(mockNavigate).toHaveBeenCalledWith('/presells-v2')
    })
  })

  it('shows inline slug error when save returns 409', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-5' })
    mockPollJob.mockResolvedValue({
      status: 'done',
      message: 'Concluído!',
      result: { sections: makeAiSections('Duplicado') },
    })
    mockCreate.mockRejectedValue(
      new ApiClientError(
        'Slug "duplicado" já está em uso.',
        409,
        JSON.stringify({
          error: { code: 'slug_taken', message: 'Slug "duplicado" já está em uso.' },
        }),
        'slug_taken',
      ),
    )

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    await screen.findByLabelText(/slug/i)
    await userEvent.click(screen.getByRole('button', { name: /salvar/i }))

    await waitFor(() =>
      expect(screen.getByText(/slug.*j[áa].*em uso|já está em uso/i)).toBeDefined(),
    )
    expect(mockNavigate).not.toHaveBeenCalled()
  })

  it('shows an error message with retry when the analysis fails', async () => {
    mockStartAnalyze.mockResolvedValue({ jobId: 'job-6' })
    mockPollJob.mockResolvedValue({
      status: 'failed',
      message: 'Não foi possível abrir o site.',
      error: 'Não foi possível abrir o site.',
      errorCode: 'site_unreachable',
    })

    renderPage()
    await fillInitialForm()
    await userEvent.click(screen.getByRole('button', { name: /gerar com ia/i }))

    await waitFor(() =>
      expect(
        screen.getByText(/erro ao consultar o site|site inacessível|n[ãa]o foi poss[íi]vel abrir/i),
      ).toBeDefined(),
    )

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i })
    expect(retryButton).toBeDefined()

    await userEvent.click(retryButton)
    expect(screen.getByRole('button', { name: /gerar com ia/i })).toBeDefined()
  })
})
