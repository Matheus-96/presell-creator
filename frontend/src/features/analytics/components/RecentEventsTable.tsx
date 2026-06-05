import { UAParser } from 'ua-parser-js'
import { formatDateTime } from '@/lib/formatters.ts'
import type { AnalyticsEvent } from '@/features/analytics/types.ts'

type RecentEvent = AnalyticsEvent

const EVENT_TYPE_LABELS: Record<string, string> = {
  page_view: 'Page view',
  cta_click: 'CTA click',
  redirect: 'Redirect',
  time_on_page: 'Time on page',
}

function parseUserAgent(ua: string | null): string {
  if (!ua) return '—'
  const parser = new UAParser(ua)
  const browser = parser.getBrowser()
  const os = parser.getOS()
  const parts = [browser.name, os.name].filter(Boolean)
  return parts.length > 0 ? parts.join(' / ') : '—'
}

function DeviceLabel({ deviceType }: { deviceType: string | null }) {
  if (!deviceType) return <span className="text-muted-foreground">—</span>
  const icon = deviceType === 'mobile' ? '📱' : deviceType === 'bot' ? '🤖' : '🖥️'
  return <span>{icon} {deviceType}</span>
}

function EventTypeBadge({ eventType }: { eventType: string }) {
  const label = EVENT_TYPE_LABELS[eventType] ?? eventType
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
      {label}
    </span>
  )
}

interface RecentEventsTableProps {
  events: RecentEvent[]
}

export function RecentEventsTable({ events }: RecentEventsTableProps) {
  if (events.length === 0) return null

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground border-b border-border">
            <th className="pb-2 pr-4 font-medium">Timestamp</th>
            <th className="pb-2 pr-4 font-medium">Tipo</th>
            <th className="pb-2 pr-4 font-medium">Device</th>
            <th className="pb-2 pr-4 font-medium">País</th>
            <th className="pb-2 font-medium">Browser / OS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {events.map((event) => (
            <tr key={event.id}>
              <td className="py-2 pr-4 tabular-nums whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(event.createdAt)}
              </td>
              <td className="py-2 pr-4">
                <EventTypeBadge eventType={event.eventType} />
              </td>
              <td className="py-2 pr-4 text-xs">
                <DeviceLabel deviceType={event.deviceType} />
              </td>
              <td className="py-2 pr-4 text-xs font-mono">
                {event.country ?? '—'}
              </td>
              <td className="py-2 text-xs text-muted-foreground truncate max-w-[220px]">
                {parseUserAgent(event.userAgent)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
