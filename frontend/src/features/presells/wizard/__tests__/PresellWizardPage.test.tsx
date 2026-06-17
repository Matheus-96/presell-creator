import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { PresellWizardPage } from '@/features/presells/wizard/PresellWizardPage.tsx'

vi.mock('@/features/presells/wizard/useWizardState.ts', () => ({
  useWizardState: () => mockUseWizardState(),
}))

vi.mock('@/features/presells/wizard/steps/ConfigStep.tsx', () => ({
  ConfigStep: ({ onStartAnalysis }: { onStartAnalysis: (data: unknown, id: string) => void }) => (
    <div data-testid="config-step" onClick={() => onStartAnalysis({}, 'test-id')}>
      Config Step
    </div>
  ),
}))

vi.mock('@/features/presells/wizard/steps/AnalyzingStep.tsx', () => ({
  AnalyzingStep: () => <div>Analyzing Step</div>,
}))

vi.mock('@/features/presells/wizard/steps/ImagesStep.tsx', () => ({
  ImagesStep: () => <div>Images Step</div>,
}))

const mockUseWizardState = vi.fn()

function makeState(step: string) {
  return {
    state: {
      step,
      config: null,
      jobId: null,
      jobResult: null,
      selectedImages: [],
      imageSelections: [],
    },
    startAnalysis: vi.fn(),
    goToImages: vi.fn(),
    goToReview: vi.fn(),
    resetWizard: vi.fn(),
  }
}

describe('PresellWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderPage() {
    return render(
      <MemoryRouter>
        <PresellWizardPage />
      </MemoryRouter>,
    )
  }

  it('renders ConfigStep when step is config', () => {
    mockUseWizardState.mockReturnValue(makeState('config'))
    renderPage()
    expect(screen.getByText('Config Step')).toBeDefined()
  })

  it('does not render AnalyzingStep when step is config', () => {
    mockUseWizardState.mockReturnValue(makeState('config'))
    renderPage()
    expect(screen.queryByText('Analyzing Step')).toBeNull()
  })

  it('renders AnalyzingStep when step is analyzing and jobId is set', () => {
    mockUseWizardState.mockReturnValue({
      ...makeState('analyzing'),
      state: { ...makeState('analyzing').state, jobId: 'job-123' },
    })
    renderPage()
    expect(screen.getByText('Analyzing Step')).toBeDefined()
  })

  it('renders ImagesStep when step is images and jobResult is set', () => {
    mockUseWizardState.mockReturnValue({
      ...makeState('images'),
      state: {
        ...makeState('images').state,
        jobResult: { templateId: 't1', headline: 'H', subtitle: '', body: '', bullets: [], ctaText: '', heroImageUrl: null, theme: null, settings: {}, extractedImages: [] },
      },
    })
    renderPage()
    expect(screen.getByText('Images Step')).toBeDefined()
  })

})
