import { useState, useEffect, useCallback } from 'react'

export type WizardStep = 'config' | 'analyzing' | 'images'

export type WizardConfig = {
  url: string
  language: string
  prompt: string
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

const STORAGE_KEY = 'presell_wizard_job'
const TTL_MS = 5 * 60 * 1000 // 5 minutes

type StoredJob = {
  jobId: string
  config: WizardConfig
  status: 'in_progress' | 'failed' | 'completed'
  timestamp: number
}

function loadFromStorage(): { jobId: string; config: WizardConfig } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored: StoredJob = JSON.parse(raw)
    if (Date.now() - stored.timestamp > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    if (stored.status === 'failed') {
      localStorage.removeItem(STORAGE_KEY)
      return null
    }
    return { jobId: stored.jobId, config: stored.config }
  } catch {
    return null
  }
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

  useEffect(() => {
    const recovered = loadFromStorage()
    if (recovered) {
      setState((prev) => ({
        ...prev,
        step: 'analyzing',
        jobId: recovered.jobId,
        config: recovered.config,
      }))
    }
  }, [])

  function startAnalysis(config: WizardConfig, jobId: string) {
    const stored: StoredJob = { jobId, config, status: 'in_progress', timestamp: Date.now() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
    setState((prev) => ({ ...prev, step: 'analyzing', config, jobId }))
  }

  function markJobFailed() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const stored: StoredJob = JSON.parse(raw)
        stored.status = 'failed'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
      }
    } catch {
      // ignore parse errors
    }
    setState((prev) => ({ ...prev, step: 'config', jobId: null, jobResult: null, config: null }))
  }

  const resetWizard = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    setState({
      step: 'config',
      config: null,
      jobId: null,
      jobResult: null,
      selectedImages: [],
      imageSelections: [],
    })
  }, [])

  function goToImages(extractedImages: { url: string; type: string }[], jobResult: unknown) {
    setState((prev) => ({ ...prev, step: 'images', selectedImages: extractedImages, jobResult }))
  }

  return { state, startAnalysis, goToImages, markJobFailed, resetWizard }
}
