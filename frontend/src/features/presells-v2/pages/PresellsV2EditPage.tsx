import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { getPresellV2ById, updatePresellV2 } from '@/features/presells-v2/lib/presells-v2-api.ts'
import { SectionsPreview } from '@/features/presells-v2/components/SectionsPreview.tsx'
import { HeroEditor } from '@/features/presells-v2/sections/hero/HeroEditor.tsx'
import { FaqEditor } from '@/features/presells-v2/sections/faq/FaqEditor.tsx'
import { TestimonialsEditor } from '@/features/presells-v2/sections/testimonials/TestimonialsEditor.tsx'
import { FooterEditor } from '@/features/presells-v2/sections/footer/FooterEditor.tsx'
import type { Section } from '@/features/presells-v2/sections/types.ts'

type SectionOfType<T extends Section['type']> = Extract<Section, { type: T }>

function patchSection<T extends Section['type']>(sections: Section[], type: T, patch: Partial<SectionOfType<T>['props']>): Section[] {
  const i = sections.findIndex((s) => s.type === type)
  if (i < 0) return sections
  const next = [...sections]
  const current = next[i] as SectionOfType<T>
  next[i] = { ...current, props: { ...current.props, ...patch } }
  return next
}

const PAGE_HEADER = { eyebrow: 'Presells V2', title: 'Editar Presell V2', description: 'Edite as seções da página V2 e visualize o resultado em tempo real.' }

export function PresellsV2EditPage() {
  useDocumentTitle('Editar Presell V2')
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['presells-v2', id], queryFn: () => getPresellV2ById(id as string), enabled: Boolean(id) })
  const [sections, setSections] = useState<Section[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => { if (data) setSections(data.sections) }, [data])

  if (isError) return (
    <div className="page">
      <PageHeader {...PAGE_HEADER} />
      <StatusBanner tone="warning" title="Não foi possível carregar o presell V2" description={error instanceof Error ? error.message : 'Tente recarregar a página.'} />
    </div>
  )
  if (isLoading || !data) return (
    <div className="page">
      <PageHeader {...PAGE_HEADER} />
      <SectionCard eyebrow="Edição" title="Carregando…"><p className="text-sm text-muted-foreground py-4">Carregando presell V2…</p></SectionCard>
    </div>
  )

  const hero = sections.find((s): s is SectionOfType<'hero'> => s.type === 'hero')
  const faq = sections.find((s): s is SectionOfType<'faq'> => s.type === 'faq')
  const testimonials = sections.find((s): s is SectionOfType<'testimonials'> => s.type === 'testimonials')
  const footer = sections.find((s): s is SectionOfType<'footer'> => s.type === 'footer')

  async function handleSave() {
    if (!id || saving) return
    setSaving(true); setSaveError(null)
    try { await updatePresellV2(id, { sections }); navigate('/presells-v2') }
    catch (err) { setSaveError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.') }
    finally { setSaving(false) }
  }

  return (
    <div className="page">
      <PageHeader {...PAGE_HEADER} />
      <SectionCard eyebrow="Identificação" title="Slug da página">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-edit-slug">Slug</Label>
          <Input id="v2-edit-slug" value={data.slug} readOnly />
          <p className="text-xs text-slate-500">A página fica disponível em <code>/lp/{data.slug}</code>.</p>
        </div>
      </SectionCard>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {hero && <HeroEditor props={hero.props} onChange={(patch) => setSections((s) => patchSection(s, 'hero', patch))} />}
          {faq && <FaqEditor props={faq.props} onChange={(patch) => setSections((s) => patchSection(s, 'faq', patch))} />}
          {testimonials && <TestimonialsEditor props={testimonials.props} onChange={(patch) => setSections((s) => patchSection(s, 'testimonials', patch))} />}
          {footer && <FooterEditor props={footer.props} onChange={(patch) => setSections((s) => patchSection(s, 'footer', patch))} />}
          <SectionCard eyebrow="Publicação" title="Salvar alterações">
            <div className="flex flex-col gap-3">
              {saveError && <p role="alert" className="text-sm text-red-600">{saveError}</p>}
              <div className="flex justify-end"><Button type="button" onClick={handleSave} disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</Button></div>
            </div>
          </SectionCard>
        </div>
        <div className="lg:col-span-3">
          <SectionCard eyebrow="Preview" title="Visualização da página" description="Mesma renderização da página pública (`/lp/:slug`).">
            <SectionsPreview sections={sections} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default PresellsV2EditPage
