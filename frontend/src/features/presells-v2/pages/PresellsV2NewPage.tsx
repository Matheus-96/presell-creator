import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { startAnalyzeUrlV2 } from '@/features/presells-v2/lib/presells-v2-api.ts'
import { slugify } from '@/features/presells-v2/lib/slugify.ts'
import { AnalyzingPanel } from '@/features/presells-v2/components/AnalyzingPanel.tsx'
import { PreviewPanel } from '@/features/presells-v2/components/PreviewPanel.tsx'
import type { Section } from '@/features/presells-v2/sections/types.ts'

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

function extractHeroHeadline(sections: Section[]): string {
  const hero = sections.find((s): s is Extract<Section, { type: 'hero' }> => s.type === 'hero')
  return hero?.props.headline?.trim() ?? ''
}

type Phase =
  | { kind: 'form' }
  | { kind: 'analyzing'; jobId: string; url: string; affiliateUrl: string }
  | { kind: 'preview'; sections: Section[]; affiliateUrl: string }

export function PresellsV2NewPage() {
  useDocumentTitle('Novo Presell V2')

  const [phase, setPhase] = useState<Phase>({ kind: 'form' })
  const [url, setUrl] = useState('')
  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)
  const [slug, setSlug] = useState('')

  const canStart = isValidHttpUrl(url) && isValidHttpUrl(affiliateUrl) && !starting

  async function handleStartAnalysis(e: React.FormEvent) {
    e.preventDefault()
    if (!canStart) return
    setStartError(null)
    setStarting(true)
    try {
      const { jobId } = await startAnalyzeUrlV2({ url, affiliateUrl })
      setPhase({ kind: 'analyzing', jobId, url, affiliateUrl })
    } catch (err) {
      setStartError(
        err instanceof Error
          ? err.message
          : 'Não foi possível iniciar a análise. Tente novamente.',
      )
    } finally {
      setStarting(false)
    }
  }

  function resetToForm() {
    setPhase({ kind: 'form' })
    setStartError(null)
    setSlug('')
  }

  function handlePreviewReady(sections: Section[], afUrl: string) {
    setPhase({ kind: 'preview', sections, affiliateUrl: afUrl })
    setSlug(slugify(extractHeroHeadline(sections)))
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells V2"
        title="Novo Presell V2"
        description="Gere uma página V2 a partir de uma URL de referência usando IA."
      />

      {phase.kind === 'form' && (
        <SectionCard
          eyebrow="Passo 1"
          title="Informações iniciais"
          description="Informe a URL da página que será analisada e o link de afiliado."
        >
          <form
            onSubmit={handleStartAnalysis}
            className="flex flex-col gap-5"
            aria-label="Formulário inicial"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v2-url">URL para analisar</Label>
              <Input
                id="v2-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://exemplo.com/produto"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="v2-affiliate-url">Link de afiliado (affiliateUrl)</Label>
              <Input
                id="v2-affiliate-url"
                type="url"
                value={affiliateUrl}
                onChange={(e) => setAffiliateUrl(e.target.value)}
                placeholder="https://aff.exemplo.com/abc"
                required
              />
            </div>
            {startError && (
              <p role="alert" className="text-sm text-red-600">{startError}</p>
            )}
            <div className="flex justify-end">
              <Button type="submit" disabled={!canStart}>
                {starting ? 'Iniciando…' : 'Gerar com IA'}
              </Button>
            </div>
          </form>
        </SectionCard>
      )}

      {phase.kind === 'analyzing' && (
        <AnalyzingPanel
          jobId={phase.jobId}
          onDone={(sections) => handlePreviewReady(sections, phase.affiliateUrl)}
          onRetry={resetToForm}
        />
      )}

      {phase.kind === 'preview' && (
        <PreviewPanel
          sections={phase.sections}
          affiliateUrl={phase.affiliateUrl}
          slug={slug}
          onSlugChange={setSlug}
          onReset={resetToForm}
        />
      )}
    </div>
  )
}

export default PresellsV2NewPage
