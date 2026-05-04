import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import {
  adminApi,
  type AnalyticsOverview,
  type AnalyticsSummary,
  type PresellSummary,
  type TemplateMetadata,
} from '@/lib/api/admin-api.ts'
import {
  formatCompactNumber,
  formatDateTime,
  formatNumber,
  formatPercent,
  formatTitle,
} from '@/lib/formatters.ts'

type DashboardState = {
  isLoading: boolean
  error: string | null
  summary: AnalyticsSummary | null
  overview: AnalyticsOverview | null
  presells: PresellSummary[]
  templates: TemplateMetadata[]
}

const initialState: DashboardState = {
  isLoading: true,
  error: null,
  summary: null,
  overview: null,
  presells: [],
  templates: [],
}

export function DashboardPage() {
  useDocumentTitle('Dashboard')

  const [state, setState] = useState<DashboardState>(initialState)

  useEffect(() => {
    let isCancelled = false

    async function loadDashboard() {
      setState((current) => ({ ...current, isLoading: true, error: null }))

      try {
        const [summary, overview, presellsResponse, templatesResponse] = await Promise.all([
          adminApi.getAnalyticsSummary(),
          adminApi.getAnalyticsOverview(),
          adminApi.listPresells({ limit: 6 }),
          adminApi.listTemplates(),
        ])

        if (isCancelled) {
          return
        }

        setState({
          isLoading: false,
          error: null,
          summary,
          overview,
          presells: presellsResponse.items,
          templates: templatesResponse.items,
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        setState((current) => ({
          ...current,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unable to load the dashboard.',
        }))
      }
    }

    void loadDashboard()

    return () => {
      isCancelled = true
    }
  }, [])

  const totalPresells = state.presells.length
  const publishedPresells = state.presells.filter((item) => item.published).length
  const draftPresells = totalPresells - publishedPresells
  const overview = state.overview
  const summary = state.summary

  return (
    <div className="page">
      <PageHeader
        eyebrow="Admin overview"
        title="Operational snapshot"
        description="The React admin shell now boots from the backend session API and surfaces live catalog and analytics data without pulling in the full editor."
        aside={
          <div className="page-badges" aria-label="Current system state">
            <span className="tag">Live session</span>
            <span className="tag">Presell APIs</span>
            <span className="tag">Analytics summary</span>
          </div>
        }
      />

      {state.error ? (
        <SectionCard
          eyebrow="Load state"
          title="Dashboard data could not be loaded"
          description={state.error}
        >
          <p className="page-description">
            The admin shell can render without the data, but the backend endpoints need to
            respond for the live snapshot cards to populate.
          </p>
        </SectionCard>
      ) : null}

      <div className="stats-grid">
        <article className="metric-card">
          <p className="metric-card__label">Total views</p>
          <strong className="metric-card__value">
            {overview ? formatCompactNumber(overview.totals.views) : state.isLoading ? '…' : '0'}
          </strong>
          <p className="metric-card__helper">Across tracked presell visits.</p>
        </article>

        <article className="metric-card">
          <p className="metric-card__label">CTR</p>
          <strong className="metric-card__value">
            {overview ? formatPercent(overview.totals.ctr) : state.isLoading ? '…' : '0%'}
          </strong>
          <p className="metric-card__helper">Clicks divided by page views.</p>
        </article>

        <article className="metric-card">
          <p className="metric-card__label">Published presells</p>
          <strong className="metric-card__value">
            {state.isLoading ? '…' : formatNumber(publishedPresells)}
          </strong>
          <p className="metric-card__helper">{formatNumber(draftPresells)} draft pages still queued.</p>
        </article>

        <article className="metric-card">
          <p className="metric-card__label">System health</p>
          <strong className="metric-card__value">
            {summary ? summary.systemHealth : state.isLoading ? '…' : 'healthy'}
          </strong>
          <p className="metric-card__helper">
            {summary
              ? `${formatNumber(summary.recentSales)} recent sales across ${formatNumber(summary.totalUsers)} tracked users.`
              : 'Waiting for analytics summary.'}
          </p>
        </article>
      </div>

      <div className="page-grid page-grid--two-up">
        <SectionCard
          eyebrow="Traffic leaders"
          title="Best-performing presells"
          description="Pulled from the analytics overview endpoint so the dashboard reflects current backend totals."
        >
          {overview && overview.byPresell.length > 0 ? (
            <ul className="list list--spacious">
              {overview.byPresell.slice(0, 5).map((item) => (
                <li key={item.presell.id} className="list-row">
                  <div>
                    <strong>{formatTitle(item.presell.title, item.presell.slug)}</strong>
                    <p className="list-row__meta">/{item.presell.slug}</p>
                  </div>
                  <div className="list-row__stats">
                    <span>{formatNumber(item.views)} views</span>
                    <span>{formatPercent(item.ctr)} CTR</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {state.isLoading
                ? 'Loading analytics overview…'
                : 'No tracked presell analytics are available yet.'}
            </p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Catalog coverage"
          title="What the shell can reach today"
          description="These counts prove the shell is already wired into the backend catalog endpoints needed for the next editor slice."
        >
          <ul className="list list--spacious">
            <li>
              <strong>{formatNumber(totalPresells)}</strong> presells loaded into the dashboard snapshot.
            </li>
            <li>
              <strong>{formatNumber(state.templates.length)}</strong> templates returned by the template registry API.
            </li>
            <li>
              <strong>{overview ? formatNumber(overview.sources.length) : '0'}</strong> traffic sources grouped by analytics.
            </li>
            <li>
              <Link className="text-link" to="/presells">
                Open the presell listing workspace
              </Link>
            </li>
          </ul>
        </SectionCard>
      </div>

      <div className="page-grid page-grid--two-up">
        <SectionCard
          eyebrow="Recent presells"
          title="Most recently updated pages"
          description="The dashboard uses the new listing endpoint to show where content work is happening right now."
        >
          {state.presells.length > 0 ? (
            <ul className="list list--spacious">
              {state.presells.map((presell) => (
                <li key={presell.id} className="list-row list-row--stacked">
                  <div>
                    <strong>{formatTitle(presell.title, presell.slug)}</strong>
                    <p className="list-row__meta">
                      {presell.templateId} · updated {formatDateTime(presell.timestamps.updatedAt)}
                    </p>
                  </div>
                  <span className={`pill pill--${presell.status}`}>
                    {presell.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {state.isLoading ? 'Loading presells…' : 'No presells are available yet.'}
            </p>
          )}
        </SectionCard>

        <SectionCard
          eyebrow="Recent events"
          title="Latest tracked interactions"
          description="Event sampling comes straight from the analytics overview endpoint so product and marketing can spot new traffic quickly."
        >
          {overview && overview.recentEvents.length > 0 ? (
            <ul className="list list--spacious">
              {overview.recentEvents.slice(0, 5).map((event) => (
                <li key={event.id} className="list-row list-row--stacked">
                  <div>
                    <strong>{event.eventType}</strong>
                    <p className="list-row__meta">
                      {event.referrer || 'Direct'} · {formatDateTime(event.createdAt)}
                    </p>
                  </div>
                  <span className="list-row__meta">
                    presell {event.presellId ?? '—'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">
              {state.isLoading ? 'Loading event stream…' : 'No tracked events are available yet.'}
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  )
}
