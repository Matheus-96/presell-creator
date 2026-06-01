import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PresellWizardPage } from '@/features/presells/wizard/PresellWizardPage.tsx'

vi.mock('@/features/presells/wizard/useWizardState.ts', () => ({
  useWizardState: () => mockUseWizardState(),
}))

vi.mock('@/features/presells/wizard/steps/ConfigStep.tsx', () => ({
  ConfigStep: () => <div>Config Step</div>,
}))

vi.mock('@/features/presells/wizard/steps/AnalyzingStep.tsx', () => ({
  AnalyzingStep: () => <div>Analyzing Step</div>,
}))

vi.mock('@/features/presells/wizard/steps/ImagesStep.tsx', () => ({
  ImagesStep: () => <div>Images Step</div>,
}))

vi.mock('@/features/presells/wizard/steps/ReviewStep.tsx', () => ({
  ReviewStep: () => <div>Review Step</div>,
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
    },
    startAnalysis: vi.fn(),
    goToImages: vi.fn(),
    goToReview: vi.fn(),
  }
}

describe('PresellWizardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders ConfigStep when step is config', () => {
    mockUseWizardState.mockReturnValue(makeState('config'))
    render(<PresellWizardPage />)
    expect(screen.getByText('Config Step')).toBeDefined()
  })

  it('does not render AnalyzingStep when step is config', () => {
    mockUseWizardState.mockReturnValue(makeState('config'))
    render(<PresellWizardPage />)
    expect(screen.queryByText('Analyzing Step')).toBeNull()
  })

  it('renders AnalyzingStep when step is analyzing', () => {
    mockUseWizardState.mockReturnValue(makeState('analyzing'))
    render(<PresellWizardPage />)
    expect(screen.getByText('Analyzing Step')).toBeDefined()
  })

  it('renders ImagesStep when step is images', () => {
    mockUseWizardState.mockReturnValue(makeState('images'))
    render(<PresellWizardPage />)
    expect(screen.getByText('Images Step')).toBeDefined()
  })

  it('renders ReviewStep when step is review', () => {
    mockUseWizardState.mockReturnValue(makeState('review'))
    render(<PresellWizardPage />)
    expect(screen.getByText('Review Step')).toBeDefined()
  })
})
