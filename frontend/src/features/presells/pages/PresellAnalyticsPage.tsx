import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { getPresellStatistics } from '@/features/analytics/lib/analytics-api.ts'
import { formatNumber, formatPercent, formatDate, formatTitle } from '@/lib/formatters.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function PresellAnalyticsPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const navigate = useNavigate()

  const statsQuery = useQuery({
    queryKey: ['analytics', 'presell', id],
    queryFn: () => getPresellStatistics(id),
    staleTime: 30_000,
    enabled: Number.isFinite(id),
  })

  const title = statsQuery.data
    ? formatTitle(statsQuery.data.presell.title, statsQuery.data.presell.slug)
    : 'Analytics'

  useDocumentTitle(title)

  if (statsQuery.isPending) {
    return (
      <div className="page">
        <PageHeader eyebrow="Analytics" title="Carregando…" />
      </div>
    )
  }

  if (statsQuery.isError) {
    return (
      <div className="page">
        <PageHeader eyebrow="Analytics" title="Erro" />
        <StatusBanner
          tone="warning"
          title="Não foi possível carregar os dados"
          description={statsQuery.error instanceof Error ? statsQuery.error.message : 'Tente novamente.'}
        />
      </div>
    )
  }

  const { summary, timeSeries, utmSources, referrers, gclidStats } = statsQuery.data

  return (
    <div className="page">
      <PageHeader
        eyebrow="Analytics"
        title={title}
        description={`/${statsQuery.data.presell.slug}`}
        aside={
          <Button variant="outline" onClick={() => navigate(`/presells/${id}/edit`)}>
            Editar presell
          </Button>
        }
      />

      {/* Resumo */}
      <SectionCard eyebrow="Resumo" title="Totais acumulados">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Visualizações" value={formatNumber(summary.views)} />
          <StatCard label="Cliques no CTA" value={formatNumber(summary.clicks)} />
          <StatCard label="Redirecionamentos" value={formatNumber(summary.redirects)} />
          <StatCard label="CTR" value={formatPercent(summary.ctr)} />
        </div>
      </SectionCard>

      {/* Série temporal */}
      {timeSeries.length > 0 && (
        <SectionCard eyebrow="Histórico" title="Eventos por dia">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">Data</th>
                  <th className="pb-2 pr-4 font-medium text-right">Views</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cliques</th>
                  <th className="pb-2 pr-4 font-medium text-right">Redirecionamentos</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {timeSeries.map((row) => (
                  <tr key={row.date} className="border-b last:border-0">
                    <td className="py-2 pr-4">{formatDate(row.date)}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(row.views)}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(row.clicks)}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(row.redirects)}</td>
                    <td className="py-2 text-right">{formatPercent(row.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* UTM sources e referrers lado a lado */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {utmSources.length > 0 && (
          <SectionCard eyebrow="Tráfego" title="Fontes UTM">
            <SourceTable rows={utmSources} labelKey="source" />
          </SectionCard>
        )}
        {referrers.length > 0 && (
          <SectionCard eyebrow="Tráfego" title="Referrers">
            <SourceTable rows={referrers} labelKey="referrer" />
          </SectionCard>
        )}
      </div>

      {/* gclid stats */}
      {gclidStats.length > 0 && (
        <SectionCard eyebrow="Google Ads" title="Performance por gclid">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">gclid</th>
                  <th className="pb-2 pr-4 font-medium text-right">Views</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cliques</th>
                  <th className="pb-2 font-medium text-right">CTR</th>
                </tr>
              </thead>
              <tbody>
                {gclidStats.map((row) => (
                  <tr key={row.gclid} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{row.gclid}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(row.views)}</td>
                    <td className="py-2 pr-4 text-right">{formatNumber(row.clicks)}</td>
                    <td className="py-2 text-right">{formatPercent(row.ctr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
    </div>
  )
}

function SourceTable({
  rows,
  labelKey,
}: {
  rows: Array<Record<string, unknown>>
  labelKey: string
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-left text-muted-foreground">
          <th className="pb-2 pr-4 font-medium">Origem</th>
          <th className="pb-2 font-medium text-right">Eventos</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="py-2 pr-4 truncate max-w-[200px]">
              {String(row[labelKey] ?? '—')}
            </td>
            <td className="py-2 text-right">{formatNumber(Number(row.total))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
