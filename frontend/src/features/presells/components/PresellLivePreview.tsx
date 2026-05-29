import { useMemo } from 'react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
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
  }
}

export function PresellLivePreview({ draft, template, detailStatus }: PresellLivePreviewProps) {
  const publicData = useMemo(() => (draft ? formStateToPublicData(draft) : null), [draft])
  const TemplateComponent = template ? getTemplate(template.id) : null
  const openSavedPreviewUrl = draft?.urls?.publicPage ?? null

  if (!draft || detailStatus === 'loading') {
    return (
      <SectionCard eyebrow="Preview" title="Live preview">
        <div className="empty-state">
          <p>{detailStatus === 'loading' ? 'Loading presell…' : 'Select or create a presell to see the preview.'}</p>
        </div>
      </SectionCard>
    )
  }

  if (!TemplateComponent || !publicData) {
    return (
      <SectionCard eyebrow="Preview" title="Live preview">
        <div className="empty-state">
          <p>Choose a template to unlock the preview.</p>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard eyebrow="Preview" title="Live preview">
      <div className="preview-panel">
        {openSavedPreviewUrl && (
          <div className="preview-panel__toolbar">
            <a
              className="button-link button-link--secondary"
              href={openSavedPreviewUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open public page
            </a>
          </div>
        )}
        <div
          className="preview-panel__viewport"
          style={{ overflowY: 'auto', maxHeight: '640px', pointerEvents: 'none' }}
        >
          <TemplateComponent presell={publicData} />
        </div>
      </div>
    </SectionCard>
  )
}
