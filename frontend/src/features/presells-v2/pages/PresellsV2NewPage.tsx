import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import {
  AnalyzeJobV2ExpiredError,
  createPresellV2,
  pollAnalyzeJobV2,
  startAnalyzeUrlV2,
} from '@/features/presells-v2/lib/presells-v2-api.ts'
import { slugify } from '@/features/presells-v2/lib/slugify.ts'
import { SectionsPreview } from '@/features/presells-v2/components/SectionsPreview.tsx'
import type { Section } from '@/features/presells-v2/sections/types.ts'
import { ApiClientError } from '@/lib/api/api-client.ts'

const POLL_INTERVAL_MS = 2_000

const ERROR_MESSAGES: Record<string, string> = {
  site_unreachable: 'Não foi possível abrir o site informado. Verifique a URL.',
  image_extraction_failed: 'Não foi possível obter imagens do site.',
  ai_error: 'A IA não conseguiu processar a página. Tente novamente.',
  timeout: 'A análise demorou mais que o esperado. Tente novamente.',
  unknown: 'Não foi possível concluir a análise. Tente novamente.',
}

function getFriendlyErrorMessage(errorCode?: string) {
  if (!errorCode) return ERROR_MESSAGES.unknown
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown
}

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
  const navigate = useNavigate()

  const [phase, setPhase] = useState<Phase>({ kind: 'form' })
  const [url, setUrl] = useState('')
  const [affiliateUrl, setAffiliateUrl] = useState('')
  const [startError, setStartError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const [slug, setSlug] = useState('')
  const [slugDirty, setSlugDirty] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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
    setSlugDirty(false)
    setSlugError(null)
  }

  function handlePreviewReady(sections: Section[], affiliateUrl: string) {
    setPhase({ kind: 'preview', sections, affiliateUrl })
    const headline = extractHeroHeadline(sections)
    setSlug(slugify(headline))
    setSlugDirty(false)
    setSlugError(null)
  }

  async function handleSave() {
    if (phase.kind !== 'preview') return
    if (!slug.trim() || saving) return
    setSaving(true)
    setSlugError(null)
    try {
      await createPresellV2({
        slug: slug.trim(),
        affiliateUrl: phase.affiliateUrl,
        sections: phase.sections,
      })
      navigate('/presells-v2')
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        setSlugError('Esse slug já está em uso. Escolha outro.')
      } else {
        setSlugError(
          err instanceof Error
            ? err.message
            : 'Não foi possível salvar. Tente novamente.',
        )
      }
    } finally {
      setSaving(false)
    }
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
              <p role="alert" className="text-sm text-red-600">
                {startError}
              </p>
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
        <>
          <SectionCard
            eyebrow="Passo 2"
            title="Detalhes da publicação"
            description="O slug é gerado a partir do headline. Você pode editá-lo."
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="v2-slug">Slug</Label>
                <Input
                  id="v2-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value)
                    setSlugDirty(true)
                    setSlugError(null)
                  }}
                  placeholder="slug-da-pagina"
                  aria-invalid={slugError ? 'true' : 'false'}
                  aria-describedby={slugError ? 'v2-slug-error' : undefined}
                />
                <p className="text-xs text-slate-500">
                  A página ficará disponível em <code>/lp/{slug || 'slug-da-pagina'}</code>.
                </p>
                {slugError && (
                  <p
                    id="v2-slug-error"
                    role="alert"
                    className="text-sm text-red-600"
                  >
                    {slugError}
                  </p>
                )}
                {slugDirty && !slug.trim() && (
                  <p className="text-xs text-amber-600">
                    Informe um slug para habilitar o botão Salvar.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={resetToForm}>
                  Recomeçar
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  disabled={!slug.trim() || saving}
                >
                  {saving ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            eyebrow="Preview"
            title="Visualização da página"
            description="Mesma renderização da página pública (`/lp/:slug`)."
          >
            <SectionsPreview sections={phase.sections} />
          </SectionCard>
        </>
      )}
    </div>
  )
}

type AnalyzingPanelProps = {
  jobId: string
  onDone: (sections: Section[]) => void
  onRetry: () => void
}

function AnalyzingPanel({ jobId, onDone, onRetry }: AnalyzingPanelProps) {
  const { data: status, error } = useQuery({
    queryKey: ['analyze-v2-job', jobId],
    queryFn: () => pollAnalyzeJobV2(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'done' || s === 'failed' ? false : POLL_INTERVAL_MS
    },
    retry: false,
  })

  useEffect(() => {
    if (status?.status === 'done') {
      onDone(status.result.sections)
    }
  }, [status, onDone])

  const failed =
    status?.status === 'failed' || error instanceof AnalyzeJobV2ExpiredError
  const errorMessage = useMemo(() => {
    if (status?.status === 'failed') {
      return getFriendlyErrorMessage(status.errorCode)
    }
    if (error instanceof AnalyzeJobV2ExpiredError) {
      return error.message
    }
    return null
  }, [status, error])

  if (failed) {
    return (
      <SectionCard
        eyebrow="Análise"
        title="Não foi possível concluir"
        description="Verifique a URL e tente novamente."
      >
        <div className="flex flex-col items-start gap-3 py-2">
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </SectionCard>
    )
  }

  const message =
    status && status.status !== 'done' ? status.message : 'Iniciando análise…'

  return (
    <SectionCard
      eyebrow="Análise"
      title="Analisando o site…"
      description="Aguarde enquanto a IA processa o conteúdo."
    >
      <div className="flex items-center gap-3 py-2">
        <Loader2
          aria-label="carregando"
          className="h-5 w-5 animate-spin text-indigo-500"
        />
        <p className="text-sm text-slate-700">{message}</p>
      </div>
    </SectionCard>
  )
}

export default PresellsV2NewPage
