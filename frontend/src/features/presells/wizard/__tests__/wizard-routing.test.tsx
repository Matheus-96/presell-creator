import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/features/presells/wizard/useWizardState.ts', () => ({
  useWizardState: () => ({
    state: {
      step: 'config',
      config: null,
      jobId: null,
      jobResult: null,
      selectedImages: [],
    },
    startAnalysis: vi.fn(),
    goToImages: vi.fn(),
    goToReview: vi.fn(),
  }),
}))

vi.mock('@/features/presells/wizard/steps/ConfigStep.tsx', () => ({
  ConfigStep: () => <div>Config Step</div>,
}))

import { PresellWizardPage } from '@/features/presells/wizard/PresellWizardPage.tsx'

function renderAtPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/presells/new" element={<PresellWizardPage />} />
        <Route path="/presells" element={<div>Presells List</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('wizard routing', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('renders PresellWizardPage at /presells/new', () => {
    renderAtPath('/presells/new')
    expect(screen.getByText('Config Step')).toBeDefined()
  })

  it('does not render PresellWizardPage at /presells', () => {
    renderAtPath('/presells')
    expect(screen.queryByText('Config Step')).toBeNull()
    expect(screen.getByText('Presells List')).toBeDefined()
  })
})
