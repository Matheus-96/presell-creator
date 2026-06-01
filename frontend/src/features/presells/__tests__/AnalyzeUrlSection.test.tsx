import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { AnalyzeUrlSection } from '@/features/presells/components/AnalyzeUrlSection.tsx'
import type { AnalyzeUrlResult } from '@/features/presells/lib/presells-api.ts'
import { AnalyzeJobExpiredError } from '@/features/presells/lib/presells-api.ts'

vi.mock('@/features/presells/lib/presells-api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/presells/lib/presells-api.ts')>()
  return { ...actual, startAnalyzeUrl: vi.fn(), pollAnalyzeJob: vi.fn() }
})

import { startAnalyzeUrl, pollAnalyzeJob } from '@/features/presells/lib/presells-api.ts'
const mockStartAnalyzeUrl = vi.mocked(startAnalyzeUrl)
const mockPollAnalyzeJob = vi.mocked(pollAnalyzeJob)

function renderWithQC(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>)
}

function makeResult(overrides: Partial<AnalyzeUrlResult> = {}): AnalyzeUrlResult {
  return {
    templateId: 'offer-modal',
    headline: 'Headline from AI',
    subtitle: 'Subtitle from AI',
    body: 'Body text',
    bullets: ['Benefit 1', 'Benefit 2'],
    ctaText: 'Buy Now',
    heroImageUrl: '/media/hero.jpg',
    theme: null,
    settings: {},
    hostedImageUrls: [],
    ...overrides,
  }
}

describe('AnalyzeUrlSection', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders URL input and Analisar button', () => {
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    expect(screen.getByPlaceholderText('https://exemplo.com/produto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeInTheDocument()
  })

  it('button is disabled when URL input is empty', () => {
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
  })

  it('shows validation error for URL without http/https', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'not-a-url.com')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    expect(
      screen.getByText('A URL deve começar com http:// ou https://'),
    ).toBeInTheDocument()
    expect(mockStartAnalyzeUrl).not.toHaveBeenCalled()
  })

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup({ delay: null })
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'bad')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    expect(screen.getByText('A URL deve começar com http:// ou https://')).toBeInTheDocument()
    await user.type(input, 'x')
    expect(
      screen.queryByText('A URL deve começar com http:// ou https://'),
    ).not.toBeInTheDocument()
  })

  it('starts job, polls, and invokes onResult on done', async () => {
    const user = userEvent.setup({ delay: null })
    const result = makeResult()
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-1' })
    mockPollAnalyzeJob.mockResolvedValueOnce({ status: 'done', message: 'Concluído', result })
    const onResult = vi.fn()
    renderWithQC(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    // wait for startAnalyzeUrl to have been called and resolved (interval set)
    await waitFor(() =>
      expect(mockStartAnalyzeUrl).toHaveBeenCalledWith('https://example.com/product', undefined),
    )
    // advance past the 5s poll interval
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result))
    expect(mockPollAnalyzeJob).toHaveBeenCalledWith('job-1')
  })

  it('passes userInstructions to startAnalyzeUrl', async () => {
    const user = userEvent.setup({ delay: null })
    const result = makeResult()
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-2' })
    mockPollAnalyzeJob.mockResolvedValueOnce({ status: 'done', message: 'Concluído', result })
    const onResult = vi.fn()
    renderWithQC(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    const textarea = screen.getByRole('textbox', { name: /instruções adicionais/i })
    await user.type(textarea, 'foque no público jovem')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() =>
      expect(mockStartAnalyzeUrl).toHaveBeenCalledWith(
        'https://example.com/product',
        'foque no público jovem',
      ),
    )
  })

  it('shows error message when startAnalyzeUrl fails', async () => {
    const user = userEvent.setup({ delay: null })
    mockStartAnalyzeUrl.mockRejectedValueOnce(new Error('Falha ao iniciar'))
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(screen.getByText('Falha ao iniciar')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Analisar' })).not.toBeDisabled()
  })

  it('shows error message when poll returns failed status', async () => {
    const user = userEvent.setup({ delay: null })
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-3' })
    mockPollAnalyzeJob.mockResolvedValueOnce({
      status: 'failed',
      message: 'Erro ao processar a URL',
      error: 'timeout',
    })
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(mockStartAnalyzeUrl).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() => expect(screen.getByText('Erro ao processar a URL')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Analisar' })).not.toBeDisabled()
  })

  it('shows expiration error when poll returns 404', async () => {
    const user = userEvent.setup({ delay: null })
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-4' })
    mockPollAnalyzeJob.mockRejectedValueOnce(new AnalyzeJobExpiredError())
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(mockStartAnalyzeUrl).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() =>
      expect(screen.getByText('A análise expirou. Tente novamente.')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Analisar' })).not.toBeDisabled()
  })

  it('updates status message during polling progress', async () => {
    const user = userEvent.setup({ delay: null })
    const result = makeResult()
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-5' })
    mockPollAnalyzeJob
      .mockResolvedValueOnce({ status: 'extracting', message: 'Abrindo a página...' })
      .mockResolvedValueOnce({ status: 'downloading', message: 'Baixando imagens...' })
      .mockResolvedValueOnce({ status: 'done', message: 'Concluído', result })
    const onResult = vi.fn()
    renderWithQC(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(mockStartAnalyzeUrl).toHaveBeenCalled())
    // Trigger initial fetch (useQuery fires at t=0 via setTimeout)
    await vi.advanceTimersByTimeAsync(1)
    await waitFor(() => expect(screen.getByText('Abrindo a página...')).toBeInTheDocument())
    // Second poll — downloading (after 5s refetch interval)
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() => expect(screen.getByText('Baixando imagens...')).toBeInTheDocument())
    // Third poll — done
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result))
  })

  it('shows loading state after job starts', async () => {
    const user = userEvent.setup({ delay: null })
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-6' })
    // poll never resolves during this test
    mockPollAnalyzeJob.mockImplementation(() => new Promise(() => {}))
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analisando…' })).toBeDisabled())
    expect(screen.getByText(/Isso pode levar até 1 minuto/)).toBeInTheDocument()
  })

  it('Enter key triggers analysis for valid URL', async () => {
    const user = userEvent.setup({ delay: null })
    const result = makeResult()
    mockStartAnalyzeUrl.mockResolvedValueOnce({ jobId: 'job-7' })
    mockPollAnalyzeJob.mockResolvedValueOnce({ status: 'done', message: 'Concluído', result })
    const onResult = vi.fn()
    renderWithQC(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(mockStartAnalyzeUrl).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(5000)
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result))
  })

  it('disabled prop disables input and button', () => {
    renderWithQC(<AnalyzeUrlSection onResult={vi.fn()} disabled />)
    expect(screen.getByPlaceholderText('https://exemplo.com/produto')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
  })
})
