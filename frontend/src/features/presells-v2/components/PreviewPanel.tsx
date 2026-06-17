import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { createPresellV2 } from '@/features/presells-v2/lib/presells-v2-api.ts'
import { SectionsPreview } from '@/features/presells-v2/components/SectionsPreview.tsx'
import type { Section } from '@/features/presells-v2/sections/types.ts'
import { ApiClientError } from '@/lib/api/api-client.ts'

type PreviewPanelProps = {
  sections: Section[]
  affiliateUrl: string
  slug: string
  onSlugChange: (slug: string) => void
  onReset: () => void
}

export function PreviewPanel({
  sections,
  affiliateUrl,
  slug,
  onSlugChange,
  onReset,
}: PreviewPanelProps) {
  const navigate = useNavigate()
  const [slugDirty, setSlugDirty] = useState(false)
  const [slugError, setSlugError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!slug.trim() || saving) return
    setSaving(true)
    setSlugError(null)
    try {
      await createPresellV2({ slug: slug.trim(), affiliateUrl, sections })
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
                onSlugChange(e.target.value)
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
              <p id="v2-slug-error" role="alert" className="text-sm text-red-600">
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
            <Button type="button" variant="outline" onClick={onReset}>
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
        <SectionsPreview sections={sections} />
      </SectionCard>
    </>
  )
}
