import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { getPresellV2ById } from '@/features/presells-v2/lib/presells-v2-api.ts'
import { SectionsPreview } from '@/features/presells-v2/components/SectionsPreview.tsx'

export function PresellsV2EditPage() {
  useDocumentTitle('Editar Presell V2')
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['presells-v2', id],
    queryFn: () => getPresellV2ById(id as string),
    enabled: Boolean(id),
  })

  if (isLoading || !data) {
    if (isError) {
      return (
        <div className="page">
          <PageHeader
            eyebrow="Presells V2"
            title="Editar Presell V2"
            description="Edite as seções da página V2 e visualize o resultado em tempo real."
          />
          <StatusBanner
            tone="warning"
            title="Não foi possível carregar o presell V2"
            description={
              error instanceof Error ? error.message : 'Tente recarregar a página.'
            }
          />
        </div>
      )
    }

    return (
      <div className="page">
        <PageHeader
          eyebrow="Presells V2"
          title="Editar Presell V2"
          description="Edite as seções da página V2 e visualize o resultado em tempo real."
        />
        <SectionCard eyebrow="Edição" title="Carregando…">
          <p className="text-sm text-muted-foreground py-4">
            Carregando presell V2…
          </p>
        </SectionCard>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells V2"
        title="Editar Presell V2"
        description="Edite as seções da página V2 e visualize o resultado em tempo real."
      />

      <SectionCard eyebrow="Identificação" title="Slug da página">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="v2-edit-slug">Slug</Label>
          <Input id="v2-edit-slug" value={data.slug} readOnly />
          <p className="text-xs text-slate-500">
            A página fica disponível em <code>/lp/{data.slug}</code>.
          </p>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <SectionCard eyebrow="Edição" title="Seções">
            <p className="text-sm text-muted-foreground py-4">
              O formulário por seção será adicionado em breve.
            </p>
          </SectionCard>
        </div>
        <div className="lg:col-span-3">
          <SectionCard
            eyebrow="Preview"
            title="Visualização da página"
            description="Mesma renderização da página pública (`/lp/:slug`)."
          >
            <SectionsPreview sections={data.sections} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}

export default PresellsV2EditPage
