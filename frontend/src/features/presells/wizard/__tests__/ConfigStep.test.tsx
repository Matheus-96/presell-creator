import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ConfigStep } from '@/features/presells/wizard/steps/ConfigStep.tsx'

const mockOnStartAnalysis = vi.fn()

vi.mock('@/features/presells/lib/presells-api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/presells/lib/presells-api.ts')>()
  return { ...actual, startAnalyzeUrl: vi.fn() }
})

import { startAnalyzeUrl } from '@/features/presells/lib/presells-api.ts'
const mockStartAnalyzeUrl = vi.mocked(startAnalyzeUrl)

function renderConfigStep() {
  return render(
    <MemoryRouter>
      <ConfigStep onStartAnalysis={mockOnStartAnalysis} />
    </MemoryRouter>,
  )
}

describe('ConfigStep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStartAnalyzeUrl.mockResolvedValue({ jobId: 'mock-job-id' })
  })

  // --- Cycle 1: Form renders required fields ---

  it('renders a URL input', () => {
    renderConfigStep()
    expect(screen.getByRole('textbox', { name: /url do produto/i })).toBeDefined()
  })

  it('renders a language select with expected options', () => {
    renderConfigStep()
    const select = screen.getByRole('combobox', { name: /idioma/i })
    expect(select).toBeDefined()
    expect(screen.getByRole('option', { name: /português/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /english/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /español/i })).toBeDefined()
    expect(screen.getByRole('option', { name: /français/i })).toBeDefined()
  })

  it('renders an instructions textarea', () => {
    renderConfigStep()
    expect(screen.getByRole('textbox', { name: /instruções adicionais/i })).toBeDefined()
  })

  it('renders the multi-variant checkbox/toggle', () => {
    renderConfigStep()
    expect(screen.getByRole('checkbox', { name: /gerar 3 variantes/i })).toBeDefined()
  })

  it('renders the "Analisar" submit button', () => {
    renderConfigStep()
    expect(screen.getByRole('button', { name: /analisar/i })).toBeDefined()
  })

  it('renders the "Criar sem análise" link', () => {
    renderConfigStep()
    expect(screen.getByRole('link', { name: /criar sem análise/i })).toBeDefined()
  })

  // --- Cycle 2: "Analisar" button disabled for invalid URL ---

  it('disables the Analisar button when URL is empty', () => {
    renderConfigStep()
    const button = screen.getByRole('button', { name: /analisar/i })
    expect(button).toBeDisabled()
  })

  it('disables the Analisar button when URL is not valid', async () => {
    renderConfigStep()
    const urlInput = screen.getByRole('textbox', { name: /url do produto/i })
    await userEvent.type(urlInput, 'not-a-url')
    expect(screen.getByRole('button', { name: /analisar/i })).toBeDisabled()
  })

  it('enables the Analisar button when URL is valid', async () => {
    renderConfigStep()
    const urlInput = screen.getByRole('textbox', { name: /url do produto/i })
    await userEvent.type(urlInput, 'https://example.com')
    expect(screen.getByRole('button', { name: /analisar/i })).not.toBeDisabled()
  })

  // --- Cycle 3: Submitting calls startAnalysis with correct config ---

  it('calls onStartAnalysis with correct config on submit', async () => {
    renderConfigStep()

    const urlInput = screen.getByRole('textbox', { name: /url do produto/i })
    await userEvent.type(urlInput, 'https://example.com')

    const languageSelect = screen.getByRole('combobox', { name: /idioma/i })
    await userEvent.selectOptions(languageSelect, 'en-US')

    const instructionsTextarea = screen.getByRole('textbox', { name: /instruções adicionais/i })
    await userEvent.type(instructionsTextarea, 'test prompt')

    const multiVariantCheckbox = screen.getByRole('checkbox', { name: /gerar 3 variantes/i })
    await userEvent.click(multiVariantCheckbox)

    await userEvent.click(screen.getByRole('button', { name: /analisar/i }))

    expect(mockStartAnalyzeUrl).toHaveBeenCalledWith('https://example.com', 'test prompt', true)
    expect(mockOnStartAnalysis).toHaveBeenCalledWith(
      { url: 'https://example.com', language: 'en-US', prompt: 'test prompt', multiVariant: true },
      'mock-job-id',
    )
  })

  // --- Cycle 4: Instructions textarea max 500 chars ---

  it('limits instructions textarea to 500 characters', () => {
    renderConfigStep()
    const textarea = screen.getByRole('textbox', { name: /instruções adicionais/i })
    expect((textarea as HTMLTextAreaElement).maxLength).toBe(500)
  })
})
