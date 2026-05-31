import { useEffect, useMemo, useRef } from 'react'
import '@/features/presells/templates/index.ts'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'
import type { PresellFormState, TemplateMetadata } from '@/features/presells/types.ts'
import { getFontPair } from '@/features/presells/lib/font-pairs.ts'

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
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const fontPairKey = draft?.settings?.font_pair as string | undefined

  useEffect(() => {
    const container = previewContainerRef.current
    if (!container) return

    const pair = getFontPair(fontPairKey)

    // Inject CSS custom properties scoped to the preview container via a style tag
    // placed just before the container, targeting it by a data attribute
    container.setAttribute('data-presell-preview', 'true')
    const styleEl = document.createElement('style')
    styleEl.textContent = [
      `[data-presell-preview="true"] {`,
      `  --p-font-heading: ${pair.headingStack};`,
      `  --p-font-body: ${pair.bodyStack};`,
      `}`,
    ].join('\n')
    document.head.appendChild(styleEl)

    // Load external font if needed (shared document head — acceptable in preview)
    const nodes: HTMLElement[] = []
    if (pair.googleFontsUrl) {
      const linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      linkEl.href = pair.googleFontsUrl
      document.head.appendChild(linkEl)
      nodes.push(linkEl)
    }

    return () => {
      styleEl.remove()
      nodes.forEach((n) => n.remove())
    }
  }, [fontPairKey])

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
          ref={previewContainerRef}
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
