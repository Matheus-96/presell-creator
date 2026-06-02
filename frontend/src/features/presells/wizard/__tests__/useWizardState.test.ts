import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWizardState } from '@/features/presells/wizard/useWizardState.ts'

describe('useWizardState', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const sampleConfig = {
    url: 'https://example.com',
    language: 'pt-BR',
    prompt: 'test prompt',
    multiVariant: false,
  }

  describe('initial state', () => {
    it('starts at step config', () => {
      const { result } = renderHook(() => useWizardState())
      expect(result.current.state.step).toBe('config')
    })

    it('has jobId null', () => {
      const { result } = renderHook(() => useWizardState())
      expect(result.current.state.jobId).toBeNull()
    })

    it('has jobResult null', () => {
      const { result } = renderHook(() => useWizardState())
      expect(result.current.state.jobResult).toBeNull()
    })
  })

  describe('startAnalysis', () => {
    it('transitions step to analyzing', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'test-job-id'))
      expect(result.current.state.step).toBe('analyzing')
    })

    it('sets state.config to the passed values', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'test-job-id'))
      expect(result.current.state.config).toEqual(sampleConfig)
    })

    it('saves job to localStorage with jobId, config, and timestamp', () => {
      const { result } = renderHook(() => useWizardState())
      const before = Date.now()
      act(() => result.current.startAnalysis(sampleConfig, 'ext-job-123'))
      const raw = localStorage.getItem('presell_wizard_job')
      expect(raw).not.toBeNull()
      const stored = JSON.parse(raw!)
      expect(stored.jobId).toBe('ext-job-123')
      expect(stored.config).toEqual(sampleConfig)
      expect(stored.timestamp).toBeGreaterThanOrEqual(before)
    })

    it('sets state.jobId to the passed jobId', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'ext-job-abc'))
      expect(result.current.state.jobId).toBe('ext-job-abc')
    })
  })

  const sampleImages = [
    { url: 'img1.jpg', type: 'hero' },
    { url: 'img2.jpg', type: 'generic' },
  ]
  const sampleJobResult = { templateId: 't1', headline: 'H', subtitle: '', body: '', bullets: [], ctaText: '', heroImageUrl: null, theme: null, settings: {}, extractedImages: sampleImages }

  describe('goToImages', () => {
    it('transitions step to images', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      expect(result.current.state.step).toBe('images')
    })

    it('sets selectedImages to the passed extractedImages', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      expect(result.current.state.selectedImages).toEqual(sampleImages)
    })

    it('sets jobResult from goToImages', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      expect(result.current.state.jobResult).toEqual(sampleJobResult)
    })
  })

  describe('goToReview', () => {
    it('transitions step to review', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      const selections = [{ url: 'img1.jpg', role: 'hero' as const }]
      act(() => result.current.goToReview(selections))
      expect(result.current.state.step).toBe('review')
    })

    it('stores imageSelections passed to goToReview', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      const selections = [
        { url: 'img1.jpg', role: 'hero' as const },
        { url: 'img2.jpg', role: 'gallery' as const },
      ]
      act(() => result.current.goToReview(selections))
      expect(result.current.state.imageSelections).toEqual(selections)
    })

    it('preserves jobResult set by goToImages', () => {
      const { result } = renderHook(() => useWizardState())
      act(() => result.current.startAnalysis(sampleConfig, 'job-id'))
      act(() => result.current.goToImages(sampleImages, sampleJobResult))
      act(() => result.current.goToReview([]))
      expect(result.current.state.jobResult).toEqual(sampleJobResult)
    })
  })

  describe('localStorage recovery on mount', () => {
    it('recovers jobId and sets step to analyzing when storage is fresh', async () => {
      const stored = {
        jobId: 'abc-123',
        config: sampleConfig,
        timestamp: Date.now(),
      }
      localStorage.setItem('presell_wizard_job', JSON.stringify(stored))

      const { result } = renderHook(() => useWizardState())
      // Wait for useEffect to run
      await act(async () => {})
      expect(result.current.state.jobId).toBe('abc-123')
      expect(result.current.state.step).toBe('analyzing')
    })

    it('starts at config and clears localStorage when stored timestamp is older than 5 minutes', async () => {
      const staleTimestamp = Date.now() - 6 * 60 * 1000 // 6 minutes ago
      const stored = {
        jobId: 'old-job',
        config: sampleConfig,
        timestamp: staleTimestamp,
      }
      localStorage.setItem('presell_wizard_job', JSON.stringify(stored))

      const { result } = renderHook(() => useWizardState())
      await act(async () => {})
      expect(result.current.state.step).toBe('config')
      expect(result.current.state.jobId).toBeNull()
      expect(localStorage.getItem('presell_wizard_job')).toBeNull()
    })
  })
})
