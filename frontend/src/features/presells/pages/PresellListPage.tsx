import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { listPresells, listTemplates } from '@/features/presells/lib/presells-api.ts'
import type { PresellStatus } from '@/features/presells/types.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function PresellListPage() {
  useDocumentTitle('Presells')

  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const handleCopyLink = useCallback((slug: string) => {
    const url = `${window.location.origin}/p/${slug}`
    navigator.clipboard.writeText(url).then(
      () => {
        setCopiedSlug(slug)
        setTimeout(() => setCopiedSlug(null), 2000)
      },
      () => toast.error('Não foi possível copiar'),
    )
  }, [])
  const [selectedStatus, setSelectedStatus] = useState<'all' | PresellStatus>('all')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')

  const { data: presellData, isError, error } = useQuery({
    queryKey: ['presells', { limit: 100 }],
    queryFn: () => listPresells(100),
    staleTime: 30_000,
  })

  const { data: templateData } = useQuery({
    queryKey: ['templates'],
    queryFn: listTemplates,
    staleTime: 60_000,
  })

  const presells = presellData?.items ?? []
  const templates = templateData?.items ?? []

  const filteredPresells = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()

    return presells.filter((item) => {
      if (selectedStatus !== 'all' && item.status !== selectedStatus) return false
      if (selectedTemplateId && item.templateId !== selectedTemplateId) return false
      if (normalized) {
        const haystack = [item.title, item.headline, item.slug].join(' ').toLowerCase()
        if (!haystack.includes(normalized)) return false
      }
      return true
    })
  }, [presells, searchTerm, selectedStatus, selectedTemplateId])

  if (isError) {
    return (
      <div className="page">
        <PageHeader eyebrow="Presells" title="Lista de presells" description="Gerencie e publique suas páginas de presell." />
        <StatusBanner
          tone="warning"
          title="Não foi possível carregar a lista de presells"
          description={error instanceof Error ? error.message : 'Tente recarregar a página.'}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Presells"
        title="Lista de presells"
        description="Busque, filtre e gerencie sua coleção de presells."
        aside={
          <Button onClick={() => navigate('/presells/new')} size="default" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Novo presell
          </Button>
        }
      />

      <SectionCard eyebrow="Filtros" title="Filtrar coleção">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presell-search">Buscar</Label>
            <Input
              id="presell-search"
              type="search"
              placeholder="Título, headline ou slug"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.currentTarget.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presell-status-filter">Status</Label>
            <select
              id="presell-status-filter"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.currentTarget.value as 'all' | PresellStatus)}
            >
              <option value="all">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="published">Publicado</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presell-template-filter">Template</Label>
            <select
              id="presell-template-filter"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.currentTarget.value)}
            >
              <option value="">Todos os templates</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Coleção" title={`${filteredPresells.length} presell${filteredPresells.length !== 1 ? 's' : ''}`}>
        {filteredPresells.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Nenhum presell encontrado com os filtros atuais.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {filteredPresells.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">
                    {item.title || item.headline || item.slug}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    /{item.slug} · {item.templateId}
                  </p>
                </div>
                <span className={`status-pill status-pill--${item.status} shrink-0`}>
                  {item.status === 'published' ? 'Publicado' : 'Rascunho'}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    asChild
                  >
                    <a href={`/p/${item.slug}`} target="_blank" rel="noopener noreferrer">
                      Ver
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(item.slug)}
                  >
                    {copiedSlug === item.slug ? 'Copiado!' : 'Copiar link'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/presells/${item.id}/analytics`)}
                  >
                    Analytics
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/presells/${item.id}/edit`)}
                  >
                    Editar
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
