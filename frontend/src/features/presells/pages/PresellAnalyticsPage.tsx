import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { getPresellStatistics, getPresellEvents } from '@/features/analytics/lib/analytics-api.ts'
import { formatNumber, formatPercent, formatDate, formatTitle, formatDuration } from '@/lib/formatters.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { RecentEventsTable } from '@/features/analytics/components/RecentEventsTable.tsx'

export function PresellAnalyticsPage() {
  const { id: idParam } = useParams<{ id: string }>()
  const id = Number(idParam)
  const navigate = useNavigate()
  const [eventsPage, setEventsPage] = useState(1)

  const statsQuery = useQuery({
    queryKey: ['analytics', 'presell', id],
    queryFn: () => getPresellStatistics(id),
    staleTime: 30_000,
    enabled: Number.isFinite(id),
  })

  const eventsQuery = useQuery({
    queryKey: ['analytics', 'presell', id, 'events', eventsPage],
    queryFn: () => getPresellEvents(id, eventsPage),
    staleTime: 30_000,
    enabled: Number.isFinite(id),
    placeholderData: (prev) => prev,
  })

  const title = statsQuery.data
    ? formatTitle(statsQuery.data.presell.title, statsQuery.data.presell.slug)
    : 'Analytics'

  useDocumentTitle(title)

  const gclidRows = useMemo(() => {
    const gclidStats = statsQuery.data?.gclidStats ?? []
    const gclidDwellTime = statsQuery.data?.gclidDwellTime ?? []
    const map = new Map<string, Record<string, unknown>>()
    for (const stat of gclidStats) {
      map.set(stat.gclid, { ...stat })
    }
    for (const dwell of gclidDwellTime) {
      const existing = map.get(dwell.gclid) ?? { gclid: dwell.gclid }
      map.set(dwell.gclid, { ...existing, avgDwellSeconds: dwell.avgDwellSeconds })
    }
    return Array.from(map.values())
  }, [statsQuery.data?.gclidStats, statsQuery.data?.gclidDwellTime])

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

  const { summary, timeSeries, utmSources, referrers, avgTimeOnPage } = statsQuery.data

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
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          <StatCard label="Visualizações" value={formatNumber(summary.views)} />
          <StatCard label="Cliques no CTA" value={formatNumber(summary.clicks)} />
          <StatCard label="Redirecionamentos" value={formatNumber(summary.redirects)} />
          <StatCard label="CTR" value={formatPercent(summary.ctr)} />
          <StatCard
            label="Tempo médio"
            value={avgTimeOnPage ? formatDuration(avgTimeOnPage.avgSeconds) : '—'}
            helper={avgTimeOnPage ? `${formatNumber(avgTimeOnPage.sampleCount)} amostras` : undefined}
          />
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

      {/* Eventos recentes */}
      <SectionCard eyebrow="Eventos" title="Eventos recentes">
        {eventsQuery.data && eventsQuery.data.events.length > 0 ? (
          <>
            <RecentEventsTable events={eventsQuery.data.events} />
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Página {eventsQuery.data.page} de {eventsQuery.data.pageCount}
                {' '}({formatNumber(eventsQuery.data.total)} eventos)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventsQuery.data.page <= 1 || eventsQuery.isFetching}
                  onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={eventsQuery.data.page >= eventsQuery.data.pageCount || eventsQuery.isFetching}
                  onClick={() => setEventsPage((p) => p + 1)}
                >
                  Próximo
                </Button>
              </div>
            </div>
          </>
        ) : eventsQuery.isPending ? (
          <p className="text-sm text-muted-foreground">Carregando eventos…</p>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>
        )}
      </SectionCard>

      {/* gclid stats */}
      {gclidRows.length > 0 && (
        <SectionCard eyebrow="Google Ads" title={`${gclidRows.length} GCLID${gclidRows.length !== 1 ? 's' : ''} rastreados`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4 font-medium">gclid</th>
                  <th className="pb-2 pr-4 font-medium text-right">Views</th>
                  <th className="pb-2 pr-4 font-medium text-right">Cliques</th>
                  <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">Permanência</th>
                </tr>
              </thead>
              <tbody>
                {gclidRows.map((row) => (
                  <tr key={row.gclid as string} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs max-w-[180px] truncate">{row.gclid as string}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(Number(row.views ?? 0))}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{formatNumber(Number(row.clicks ?? 0))}</td>
                    <td className="py-2 pr-4 text-right tabular-nums">{row.ctr != null ? formatPercent(row.ctr as number) : '—'}</td>
                    <td className="py-2 text-right tabular-nums">
                      {row.avgDwellSeconds != null ? formatDuration(row.avgDwellSeconds as number) : '—'}
                    </td>
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

function StatCard({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
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
