import { useNavigate } from 'react-router-dom'
import { useWizardState } from '@/features/presells/wizard/useWizardState.ts'
import type { WizardStep } from '@/features/presells/wizard/useWizardState.ts'
import { ConfigStep } from '@/features/presells/wizard/steps/ConfigStep.tsx'
import { AnalyzingStep } from '@/features/presells/wizard/steps/AnalyzingStep.tsx'
import { ImagesStep } from '@/features/presells/wizard/steps/ImagesStep.tsx'
import { ReviewStep } from '@/features/presells/wizard/steps/ReviewStep.tsx'
import type { PresellDraft } from '@/features/presells/wizard/steps/ReviewStep.tsx'
import { createPresell } from '@/features/presells/lib/presells-api.ts'
import type { PresellWritePayload } from '@/features/presells/types.ts'
import { cn } from '@/lib/utils.ts'

const STEPS: { id: WizardStep; label: string }[] = [
  { id: 'config', label: 'Configurar' },
  { id: 'analyzing', label: 'Analisar' },
  { id: 'images', label: 'Imagens' },
  { id: 'review', label: 'Revisão' },
]

const STEP_ORDER: WizardStep[] = ['config', 'analyzing', 'images', 'review']

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
    affiliateUrl: 'https://link-afiliado.com',
    googlePixelId: null,
    trackingParam: '',
    settings: draft.settings as Record<string, string | number | boolean>,
    theme: draft.theme as PresellWritePayload['theme'],
  }
}

export function PresellWizardPage() {
  const navigate = useNavigate()
  const { state, startAnalysis, goToImages, goToReview } = useWizardState()

  const currentIndex = STEP_ORDER.indexOf(state.step)

  async function handleSave(drafts: PresellDraft[]) {
    const results = await Promise.all(drafts.map((d) => createPresell(draftToPayload(d))))
    if (results.length === 1) {
      navigate(`/presells/${results[0].id}/edit`)
    } else {
      navigate('/presells')
    }
  }

  return (
    <div className="page">
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
            onRetry={() => navigate('/presells/new')}
          />
        )}
        {state.step === 'images' && (
          <ImagesStep
            extractedImages={state.selectedImages}
            onComplete={(selections) => goToReview(selections)}
          />
        )}
        {state.step === 'review' && state.jobResult && (
          <ReviewStep
            jobResult={
              state.jobResult as React.ComponentProps<typeof ReviewStep>['jobResult']
            }
            onSave={handleSave}
          />
        )}
      </div>
    </div>
  )
}
