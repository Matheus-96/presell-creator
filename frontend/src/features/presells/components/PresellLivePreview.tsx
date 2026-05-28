import '@/features/presells/templates/index.ts'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'
import type { PresellFormState, TemplateMetadata } from '@/features/presells/types.ts'

type PresellLivePreviewProps = {
  draft: PresellFormState | null
  template: TemplateMetadata | null
  detailStatus: 'idle' | 'loading' | 'error'
}

function formStateToPresellPublicData(draft: PresellFormState): PresellPublicData {
  return {
    id: draft.id ?? 0,
    slug: draft.slug,
    templateId: draft.templateId,
    headline: draft.headline,
    subtitle: draft.subtitle,
    body: draft.body,
    bullets: draft.bulletsText.split(/\r?\n/).map((s) => s.trim()).filter(Boolean),
    ctaText: draft.ctaText,
    affiliateUrl: draft.affiliateUrl,
    googlePixelId: draft.googlePixelId || null,
    imageUrl: draft.media.heroImageReference?.url ?? null,
    backgroundImageUrl: draft.media.backgroundImageReference?.url ?? null,
    settings: draft.settings,
  }
}

export function PresellLivePreview({ draft, template, detailStatus }: PresellLivePreviewProps) {
  return (
    <SectionCard eyebrow="Live preview" title="Preview do template">
      {detailStatus === 'loading' ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <span>Carregando...</span>
        </div>
      ) : !draft ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <p>Selecione ou crie um presell para ver o preview.</p>
        </div>
      ) : !template ? (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <p>Escolha um template para ativar o preview.</p>
        </div>
      ) : (() => {
        const TemplateComponent = getTemplate(draft.templateId)

        if (!TemplateComponent) {
          return (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <p>Template não disponível para preview.</p>
            </div>
          )
        }

        const presellData = formStateToPresellPublicData(draft)

        return (
          <div
            className="overflow-y-auto rounded-lg border border-slate-200"
            style={{ height: '640px' }}
          >
            <TemplateComponent presell={presellData} />
          </div>
        )
      })()}
    </SectionCard>
  )
}
