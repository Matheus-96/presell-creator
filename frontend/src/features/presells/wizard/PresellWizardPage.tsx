import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWizardState } from '@/features/presells/wizard/useWizardState.ts'
import type { WizardStep } from '@/features/presells/wizard/useWizardState.ts'
import { ConfigStep } from '@/features/presells/wizard/steps/ConfigStep.tsx'
import { AnalyzingStep } from '@/features/presells/wizard/steps/AnalyzingStep.tsx'
import { ImagesStep } from '@/features/presells/wizard/steps/ImagesStep.tsx'
import type { ImageSelection } from '@/features/presells/wizard/steps/ImagesStep.tsx'
import { createPresell, downloadAndHostImages, getApiErrorMessage } from '@/features/presells/lib/presells-api.ts'
import type { PresellWritePayload } from '@/features/presells/types.ts'
import { DEFAULT_TRACKING_PARAM } from '@/features/presells/lib/constants.ts'
import { toast } from 'sonner'
import { cn } from '@/lib/utils.ts'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'config', label: 'Configurar' },
  { id: 'analyzing', label: 'Analisar' },
  { id: 'images', label: 'Imagens' },
]

const STEP_ORDER: WizardStep[] = ['config', 'analyzing', 'images']

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 40) || 'presell'
  )
}

interface PresellDraft {
  templateId: string
  headline: string
  subtitle: string
  body: string
  bullets: string[]
  ctaText: string
  theme: object | null
  settings: Record<string, unknown>
}

function draftToPayload(draft: PresellDraft): PresellWritePayload {
  return {
    slug: `${slugify(draft.headline)}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'draft',
    templateId: draft.templateId,
    title: draft.headline,
    headline: draft.headline,
    subtitle: draft.subtitle,
    body: draft.body,
    bullets: draft.bullets,
    ctaText: draft.ctaText,
    legalText: '',
    affiliateUrl: 'https://link-afiliado.com',
    googlePixelId: null,
    trackingParam: DEFAULT_TRACKING_PARAM,
    settings: draft.settings as Record<string, string | number | boolean>,
    theme: draft.theme as PresellWritePayload['theme'],
  }
}

export function PresellWizardPage() {
  const navigate = useNavigate()
  const { state, startAnalysis, goToImages, markJobFailed, resetWizard } = useWizardState()

  useEffect(() => {
    if (state.step === 'config') {
      resetWizard()
    }
  }, [state.step, resetWizard])

  const currentIndex = STEP_ORDER.indexOf(state.step)

  async function handleCreatePresell(selections: ImageSelection[]) {
    if (!state.jobResult) return

    const jobResult = state.jobResult as {
      templateId: string
      headline: string
      subtitle: string
      body: string
      bullets: string[]
      ctaText: string
      theme: object | null
      settings: Record<string, unknown>
      extractedImages?: { url: string; type: string }[]
    }

    const draft: PresellDraft = {
      templateId: jobResult.templateId,
      headline: jobResult.headline,
      subtitle: jobResult.subtitle,
      body: jobResult.body,
      bullets: jobResult.bullets,
      ctaText: jobResult.ctaText,
      theme: jobResult.theme,
      settings: jobResult.settings,
    }

    const payload = draftToPayload(draft)

    // Download and host selected images before creating presell
    const selectionsWithRole = selections.filter(
      (s): s is { url: string; role: 'hero' | 'background' | 'gallery' } => s.role !== null,
    )
    if (selectionsWithRole.length > 0) {
      try {
        const hostedImages = await downloadAndHostImages(selectionsWithRole)

        payload.media = {}
        if (hostedImages.hero) {
          payload.media.heroImage = { fileName: hostedImages.hero }
        }
        if (hostedImages.background) {
          payload.media.backgroundImage = { fileName: hostedImages.background }
        }

        if (hostedImages.gallery && hostedImages.gallery.length > 0) {
          payload.settings.galleryImages = hostedImages.gallery
        }
      } catch (err) {
        console.error('Failed to download images:', err)
        alert('Erro ao baixar imagens. Criando presell sem imagens.')
      }
    }

    try {
      const result = await createPresell(payload)
      resetWizard()
      navigate(`/presells/${result.id}/edit`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Erro ao criar presell'))
      throw err
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid gap-6 p-[clamp(1.5rem,4vw,3rem)] content-start">
      {/* Step indicator */}
      <nav aria-label="Etapas do wizard" className="flex items-center gap-0 max-w-xl mx-auto w-full">
        {STEPS.map((step, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          return (
            <div key={step.id} className="flex items-center gap-0 flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                    done
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : active
                        ? 'bg-white border-indigo-600 text-indigo-600'
                        : 'bg-white border-slate-300 text-slate-400',
                  )}
                >
                  {done ? '✓' : i + 1}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap',
                    active ? 'text-indigo-700' : done ? 'text-slate-600' : 'text-slate-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mb-5 mx-2 transition-colors',
                    i < currentIndex ? 'bg-indigo-600' : 'bg-slate-200',
                  )}
                />
              )}
            </div>
          )
        })}
      </nav>

      {/* Step content */}
      <div className="max-w-xl mx-auto w-full">
        {state.step === 'config' && <ConfigStep onStartAnalysis={startAnalysis} />}
        {state.step === 'analyzing' && state.jobId && (
          <AnalyzingStep
            jobId={state.jobId}
            goToImages={goToImages}
            onFail={markJobFailed}
            onRetry={() => {
              resetWizard()
              navigate('/presells/new')
            }}
          />
        )}
        {state.step === 'images' && !!state.jobResult && (
          <ImagesStep
            extractedImages={state.selectedImages}
            onComplete={handleCreatePresell}
          />
        )}
      </div>
      </div>
    </div>
  )
}
