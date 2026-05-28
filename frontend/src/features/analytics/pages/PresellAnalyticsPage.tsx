import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { Button } from '@/components/ui/button.tsx'
import { getPresellStatistics } from '@/features/analytics/lib/analytics-api.ts'
import { formatNumber, formatPercent, formatTitle } from '@/lib/formatters.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

export function PresellAnalyticsPage() {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analytics', 'presell', id],
    queryFn: () => getPresellStatistics(id!),
    staleTime: 30_000,
  })

  const presellTitle = data
    ? formatTitle(data.presell.title || data.presell.headline, data.presell.slug)
    : 'Analytics'

  useDocumentTitle(presellTitle)

  const gclidRows = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>()
    for (const stat of data?.gclidStats ?? []) {
      map.set(stat.gclid, { ...stat })
    }
    for (const dwell of data?.gclidDwellTime ?? []) {
      const existing = map.get(dwell.gclid) ?? { gclid: dwell.gclid }
      map.set(dwell.gclid, { ...existing, avgDwellSeconds: dwell.avgDwellSeconds })
    }
    return Array.from(map.values())
  }, [data])

  if (isError) {
    return (
      <div className="page">
        <PageHeader eyebrow="Analytics" title="Presell analytics" />
        <StatusBanner
          tone="warning"
          title="Could not load statistics"
          description={error instanceof Error ? error.message : 'Try refreshing the page.'}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Analytics"
        title={isLoading ? 'Loading…' : presellTitle}
        description={data ? `/${data.presell.slug}` : undefined}
        aside={
          <Button variant="outline" asChild>
            <Link to="/presells">← Presells</Link>
          </Button>
        }
      />

      <SectionCard eyebrow="Overview" title="Resumo">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {([
              { label: 'Views', value: formatNumber(data!.summary.views) },
              { label: 'Clicks', value: formatNumber(data!.summary.clicks) },
              { label: 'Redirects', value: formatNumber(data!.summary.redirects) },
              { label: 'CTR', value: formatPercent(data!.summary.ctr) },
            ] as const).map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <p className="text-sm text-muted-foreground">{label}</p>
                <strong className="text-2xl font-bold tabular-nums">{value}</strong>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {gclidRows.length > 0 && (
        <SectionCard eyebrow="Google Ads" title={`${gclidRows.length} GCLID${gclidRows.length !== 1 ? 's' : ''} rastreados`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">GCLID</th>
                  <th className="pb-2 pr-4 font-medium text-right">Views</th>
                  <th className="pb-2 pr-4 font-medium text-right">Clicks</th>
                  <th className="pb-2 pr-4 font-medium text-right">CTR</th>
                  <th className="pb-2 font-medium text-right">Permanência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gclidRows.map((row) => (
                  <tr key={row.gclid as string}>
                    <td className="py-2 pr-4 font-mono text-xs max-w-[180px] truncate">
                      {row.gclid as string}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatNumber((row.views as number) ?? 0)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {formatNumber((row.clicks as number) ?? 0)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums">
                      {row.ctr != null ? formatPercent(row.ctr as number) : '—'}
                    </td>
                    <td className="py-2 text-right tabular-nums">
                      {row.avgDwellSeconds != null ? `${row.avgDwellSeconds as number}s` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {(data?.utmSources.length ?? 0) > 0 && (
        <SectionCard eyebrow="Tráfego" title="UTM sources">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Source</th>
                  <th className="pb-2 font-medium text-right">Eventos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data!.utmSources.map((row) => (
                  <tr key={row.source}>
                    <td className="py-2 pr-4">{row.source}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {(data?.referrers.length ?? 0) > 0 && (
        <SectionCard eyebrow="Tráfego" title="Referrers">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border">
                  <th className="pb-2 pr-4 font-medium">Referrer</th>
                  <th className="pb-2 font-medium text-right">Eventos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data!.referrers.map((row) => (
                  <tr key={row.referrer}>
                    <td className="py-2 pr-4 truncate max-w-[300px]">{row.referrer || '(direct)'}</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(row.total)}</td>
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
