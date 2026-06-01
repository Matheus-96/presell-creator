import { useState } from 'react'
import type { AnalyzeUrlResult } from '@/features/presells/lib/presells-api.ts'

export type WizardStep = 'url' | 'analyzing' | 'images' | 'review'

export interface WizardState {
  step: WizardStep
  jobId: string | null
  jobResult: AnalyzeUrlResult | null
  selectedImages: string[]
}

export interface WizardActions {
  startAnalysis: (jobId: string) => void
  goToImages: (selectedImages: string[]) => void
  goToReview: (result: AnalyzeUrlResult) => void
  goBack: () => void
}

export function useWizardState(): WizardState & WizardActions {
  const [step, setStep] = useState<WizardStep>('url')
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobResult, setJobResult] = useState<AnalyzeUrlResult | null>(null)
  const [selectedImages, setSelectedImages] = useState<string[]>([])

  function startAnalysis(id: string) {
    setJobId(id)
    setStep('analyzing')
  }

  function goToImages(images: string[]) {
    setSelectedImages(images)
    setStep('images')
  }

  function goToReview(result: AnalyzeUrlResult) {
    setJobResult(result)
    setStep('review')
  }

  function goBack() {
    if (step === 'analyzing') setStep('url')
    else if (step === 'images') setStep('analyzing')
    else if (step === 'review') setStep('images')
  }

  return { step, jobId, jobResult, selectedImages, startAnalysis, goToImages, goToReview, goBack }
}
