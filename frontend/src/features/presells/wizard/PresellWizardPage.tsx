import { useWizardState } from '@/features/presells/wizard/useWizardState.ts'
import { ConfigStep } from '@/features/presells/wizard/steps/ConfigStep.tsx'
import { AnalyzingStep } from '@/features/presells/wizard/steps/AnalyzingStep.tsx'
import { ImagesStep } from '@/features/presells/wizard/steps/ImagesStep.tsx'
import { ReviewStep } from '@/features/presells/wizard/steps/ReviewStep.tsx'

export function PresellWizardPage() {
  const { state } = useWizardState()

  return (
    <div>
      {state.step === 'config' && <ConfigStep />}
      {state.step === 'analyzing' && <AnalyzingStep />}
      {state.step === 'images' && <ImagesStep extractedImages={[]} onComplete={() => {}} />}
      {state.step === 'review' && <ReviewStep />}
    </div>
  )
}
