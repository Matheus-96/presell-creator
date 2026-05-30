import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AnalyzeUrlSection } from '@/features/presells/components/AnalyzeUrlSection.tsx'
import type { AnalyzeUrlResult } from '@/features/presells/lib/presells-api.ts'

vi.mock('@/features/presells/lib/presells-api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/presells/lib/presells-api.ts')>()
  return { ...actual, analyzeUrl: vi.fn() }
})

import { analyzeUrl } from '@/features/presells/lib/presells-api.ts'
const mockAnalyzeUrl = vi.mocked(analyzeUrl)

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
    vi.clearAllMocks()
  })

  it('renders URL input and Analisar button', () => {
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    expect(screen.getByPlaceholderText('https://exemplo.com/produto')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeInTheDocument()
  })

  it('button is disabled when URL input is empty', () => {
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
  })

  it('shows validation error for URL without http/https', async () => {
    const user = userEvent.setup()
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'not-a-url.com')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    expect(
      screen.getByText('A URL deve começar com http:// ou https://'),
    ).toBeInTheDocument()
    expect(mockAnalyzeUrl).not.toHaveBeenCalled()
  })

  it('clears validation error when user starts typing', async () => {
    const user = userEvent.setup()
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'bad')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    expect(screen.getByText('A URL deve começar com http:// ou https://')).toBeInTheDocument()
    await user.type(input, 'x')
    expect(
      screen.queryByText('A URL deve começar com http:// ou https://'),
    ).not.toBeInTheDocument()
  })

  it('calls analyzeUrl and invokes onResult on success', async () => {
    const user = userEvent.setup()
    const result = makeResult()
    mockAnalyzeUrl.mockResolvedValueOnce(result)
    const onResult = vi.fn()
    render(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result))
    expect(mockAnalyzeUrl).toHaveBeenCalledWith('https://example.com/product')
  })

  it('shows error message on API failure', async () => {
    const user = userEvent.setup()
    mockAnalyzeUrl.mockRejectedValueOnce(new Error('Falha ao analisar'))
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(screen.getByText('Falha ao analisar')).toBeInTheDocument())
  })

  it('shows loading state during request', async () => {
    const user = userEvent.setup()
    let resolve: (v: AnalyzeUrlResult) => void
    const promise = new Promise<AnalyzeUrlResult>((res) => {
      resolve = res
    })
    mockAnalyzeUrl.mockReturnValueOnce(promise)
    render(<AnalyzeUrlSection onResult={vi.fn()} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.click(screen.getByRole('button', { name: 'Analisar' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analisando…' })).toBeDisabled())
    expect(screen.getByText(/Isso pode levar até 1 minuto/)).toBeInTheDocument()
    resolve!(makeResult())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Analisar' })).toBeInTheDocument())
  })

  it('Enter key triggers analysis for valid URL', async () => {
    const user = userEvent.setup()
    const result = makeResult()
    mockAnalyzeUrl.mockResolvedValueOnce(result)
    const onResult = vi.fn()
    render(<AnalyzeUrlSection onResult={onResult} />)
    const input = screen.getByPlaceholderText('https://exemplo.com/produto')
    await user.type(input, 'https://example.com/product')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(onResult).toHaveBeenCalledWith(result))
  })

  it('disabled prop disables input and button', () => {
    render(<AnalyzeUrlSection onResult={vi.fn()} disabled />)
    expect(screen.getByPlaceholderText('https://exemplo.com/produto')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Analisar' })).toBeDisabled()
  })
})
