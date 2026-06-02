import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { toast } from 'sonner'
import { AnalyzingStep } from '@/features/presells/wizard/steps/AnalyzingStep.tsx'

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
  Toaster: () => null,
}))

vi.mock('@/features/presells/lib/presells-api.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/presells/lib/presells-api.ts')>()
  return { ...actual, pollAnalyzeJob: vi.fn() }
})

import { pollAnalyzeJob } from '@/features/presells/lib/presells-api.ts'
const mockPollAnalyzeJob = vi.mocked(pollAnalyzeJob)

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
}

function renderAnalyzingStep(props: {
  jobId: string
  goToImages?: (images: { url: string; type: string }[], jobResult: unknown) => void
  onRetry?: () => void
}) {
  const qc = makeQueryClient()
  return render(
    <QueryClientProvider client={qc}>
      <AnalyzingStep
        jobId={props.jobId}
        goToImages={props.goToImages ?? vi.fn()}
        onRetry={props.onRetry ?? vi.fn()}
      />
    </QueryClientProvider>,
  )
}

describe('AnalyzingStep', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Cycle 1: spinner and message while running
  it('renders a spinner while the job is running', async () => {
    mockPollAnalyzeJob.mockImplementation(() => new Promise(() => {}))
    renderAnalyzingStep({ jobId: 'job-1' })
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument())
  })

  it('shows the status message from the job while running', async () => {
    mockPollAnalyzeJob.mockResolvedValue({ status: 'analyzing', message: 'Consultando a IA…' })
    renderAnalyzingStep({ jobId: 'job-1' })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() => expect(screen.getByText('Consultando a IA…')).toBeInTheDocument())
  })

  // Cycle 2: calls goToImages on success
  it('calls goToImages when job status is done', async () => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'done',
      message: 'Concluído',
      result: {
        templateId: 'urgent-offer',
        headline: 'Test',
        subtitle: '',
        body: '',
        bullets: [],
        ctaText: '',
        heroImageUrl: null,
        theme: null,
        settings: {},
        extractedImages: [{ url: 'https://a.com/img.jpg', type: 'hero' }],
      },
    })
    const goToImages = vi.fn()
    renderAnalyzingStep({ jobId: 'job-2', goToImages })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(goToImages).toHaveBeenCalledWith(
        [{ url: 'https://a.com/img.jpg', type: 'hero' }],
        expect.objectContaining({ templateId: 'urgent-offer' }),
      ),
    )
  })

  // Cycle 3: toast and retry on failure
  it('calls toast.error with friendly message on failure', async () => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
      errorCode: 'ai_error',
    })
    renderAnalyzingStep({ jobId: 'job-3' })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Erro no processamento de IA'),
    )
  })

  it('renders "Tentar novamente" button on failure', async () => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
      errorCode: 'ai_error',
    })
    renderAnalyzingStep({ jobId: 'job-3' })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument(),
    )
  })

  it('calls onRetry when "Tentar novamente" is clicked', async () => {
    const user = userEvent.setup({ delay: null })
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
      errorCode: 'ai_error',
    })
    const onRetry = vi.fn()
    renderAnalyzingStep({ jobId: 'job-3', onRetry })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  // Cycle 4: unknown errorCode falls back to generic message
  it('uses generic message for unknown errorCode', async () => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
      errorCode: 'some_random_code',
    })
    renderAnalyzingStep({ jobId: 'job-4' })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível concluir a análise. Tente novamente.',
      ),
    )
  })

  it('uses generic message when errorCode is missing', async () => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
    })
    renderAnalyzingStep({ jobId: 'job-5' })
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'Não foi possível concluir a análise. Tente novamente.',
      ),
    )
  })

  // All known error codes
  it.each([
    ['site_unreachable', 'Erro ao consultar o site informado'],
    ['image_extraction_failed', 'Erro ao obter imagens do site'],
    ['ai_error', 'Erro no processamento de IA'],
    ['timeout', 'A análise demorou mais que o esperado. Tente novamente.'],
    ['unknown', 'Não foi possível concluir a análise. Tente novamente.'],
  ])('maps errorCode %s to correct message', async (errorCode, expectedMessage) => {
    mockPollAnalyzeJob.mockResolvedValue({
      status: 'failed',
      message: 'Erro',
      error: 'error',
      errorCode,
    })
    const qc = makeQueryClient()
    render(
      <QueryClientProvider client={qc}>
        <AnalyzingStep jobId="job-x" goToImages={vi.fn()} onRetry={vi.fn()} />
      </QueryClientProvider>,
    )
    await vi.advanceTimersByTimeAsync(2000)
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expectedMessage))
    vi.resetAllMocks()
  })
})
