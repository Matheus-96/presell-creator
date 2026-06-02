import { useState } from 'react'

export type WizardStep = 'config' | 'analyzing' | 'images' | 'review'

export type WizardConfig = {
  url: string
  language: string
  prompt: string
  multiVariant: boolean
}

export type ImageSelection = {
  url: string
  role: 'hero' | 'background' | 'gallery'
}

export type WizardState = {
  step: WizardStep
  config: WizardConfig | null
  jobId: string | null
  jobResult: unknown | null
  selectedImages: { url: string; type: string }[]
  imageSelections: ImageSelection[]
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>({
    step: 'config',
    config: null,
    jobId: null,
    jobResult: null,
    selectedImages: [],
    imageSelections: [],
  })

  function startAnalysis(config: WizardConfig, jobId: string) {
    setState((prev) => ({ ...prev, step: 'analyzing', config, jobId }))
  }

  function goToImages(extractedImages: { url: string; type: string }[], jobResult: unknown) {
    setState((prev) => ({ ...prev, step: 'images', selectedImages: extractedImages, jobResult }))
  }

  function goToReview(imageSelections: ImageSelection[]) {
    setState((prev) => ({ ...prev, step: 'review', imageSelections }))
  }

  return { state, startAnalysis, goToImages, goToReview }
}
