import { useMemo } from 'react'
import '@/features/presells/templates/index.ts'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'
import type { PresellFormState, TemplateMetadata } from '@/features/presells/types.ts'

type PresellLivePreviewProps = {
  draft: PresellFormState | null
  template: TemplateMetadata | null
  detailStatus: 'idle' | 'loading' | 'error'
  highlightSelector: string | null
}

function formStateToPublicData(draft: PresellFormState): PresellPublicData {
  return {
    id: draft.id ?? 0,
    slug: draft.slug,
    templateId: draft.templateId,
    headline: draft.headline,
    subtitle: draft.subtitle,
    body: draft.body,
    bullets: draft.bulletsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    ctaText: draft.ctaText || 'Continuar',
    affiliateUrl: draft.affiliateUrl,
    googlePixelId: draft.googlePixelId || null,
    trackingParam: draft.trackingParam || 'gclid',
    imageUrl: draft.media.heroImageReference?.url ?? null,
    backgroundImageUrl: draft.media.backgroundImageReference?.url ?? null,
    settings: draft.settings,
    theme: draft.theme ?? null,
  }
}

export function PresellLivePreview({ draft, template, detailStatus }: PresellLivePreviewProps) {
  const publicData = useMemo(() => (draft ? formStateToPublicData(draft) : null), [draft])
  const TemplateComponent = template ? getTemplate(template.id) : null
  const openSavedPreviewUrl = draft?.urls?.publicPage ?? null

  const isEmpty = !draft || detailStatus === 'loading' || !TemplateComponent || !publicData

  return (
    <div className="flex flex-col h-full">
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50/80">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Preview</p>
        {openSavedPreviewUrl && (
          <a
            className="text-xs text-indigo-600 hover:underline"
            href={openSavedPreviewUrl}
            rel="noreferrer"
            target="_blank"
          >
            Abrir página
          </a>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {detailStatus === 'loading'
              ? 'Carregando…'
              : !TemplateComponent
                ? 'Escolha um template para ver o preview.'
                : 'Selecione ou crie um presell para ver o preview.'}
          </p>
        </div>
      ) : (
        // Bug fix: pointerEvents:none is on the INNER wrapper so the outer
        // container keeps its scroll behaviour. Without this, wheel events on
        // the preview panel were swallowed and the user could not scroll.
        <div
          className="flex-1 overflow-y-auto"
          style={{ transform: 'translateZ(0)' }}
        >
          <div style={{ pointerEvents: 'none' }}>
            <TemplateComponent presell={publicData} />
          </div>
        </div>
      )}
    </div>
  )
}
