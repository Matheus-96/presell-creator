import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { listPresellsV2 } from '@/features/presells-v2/lib/presells-v2-api.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function PresellsV2ListPage() {
  useDocumentTitle('Presells V2')
  const navigate = useNavigate()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['presells-v2'],
    queryFn: listPresellsV2,
    staleTime: 30_000,
  })

  if (isError) {
    return (
      <div className="page">
        <PageHeader
          eyebrow="Presells V2"
          title="Lista de presells V2"
          description="Gerencie suas páginas V2 baseadas em seções."
        />
        <StatusBanner
          tone="warning"
          title="Não foi possível carregar a lista de presells V2"
          description={error instanceof Error ? error.message : 'Tente recarregar a página.'}
        />
      </div>
    )
  }

  const items = data?.items ?? []

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells V2"
        title="Lista de presells V2"
        description="Páginas V2 geradas pela IA a partir de uma URL de referência."
        aside={
          <Button onClick={() => navigate('/presells-v2/new')} size="default" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo Presell V2
          </Button>
        }
      />

      <SectionCard
        eyebrow="Coleção"
        title={
          isLoading
            ? 'Carregando…'
            : `${items.length} presell${items.length !== 1 ? 's' : ''} V2`
        }
      >
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Carregando presells V2…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-start gap-3 py-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não criou nenhum presell V2. Comece gerando o primeiro com a IA.
            </p>
            <Button onClick={() => navigate('/presells-v2/new')} size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Criar primeiro presell V2
            </Button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">/{item.slug}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    Criado em {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`/lp/${item.slug}`} target="_blank" rel="noopener noreferrer">
                      Ver página
                    </a>
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
