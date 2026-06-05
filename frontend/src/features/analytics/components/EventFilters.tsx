import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'

export type EventFilters = {
  from?: string
  to?: string
  hasClickId?: true
  device?: string
  country?: string
}

type DatePreset = 'none' | 'today' | '7d' | '30d' | 'custom'

function dateRange(preset: DatePreset): { from?: string; to?: string } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const toIso = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.000Z`

  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d }

  if (preset === 'today') {
    return { from: toIso(startOfDay(now)), to: toIso(endOfDay(now)) }
  }
  if (preset === '7d') {
    return { from: toIso(startOfDay(daysAgo(6))), to: toIso(endOfDay(now)) }
  }
  if (preset === '30d') {
    return { from: toIso(startOfDay(daysAgo(29))), to: toIso(endOfDay(now)) }
  }
  return {}
}

interface EventFiltersProps {
  deviceOptions: string[]
  countryOptions: string[]
  onFilterChange: (filters: EventFilters) => void
}

export function EventFilters({ deviceOptions, countryOptions, onFilterChange }: EventFiltersProps) {
  const [preset, setPreset] = useState<DatePreset>('none')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [hasClickId, setHasClickId] = useState(false)
  const [device, setDevice] = useState('')
  const [country, setCountry] = useState('')

  function emit(overrides: Partial<{
    preset: DatePreset
    customFrom: string
    customTo: string
    hasClickId: boolean
    device: string
    country: string
  }>) {
    const p = overrides.preset ?? preset
    const cf = overrides.customFrom ?? customFrom
    const ct = overrides.customTo ?? customTo
    const hci = overrides.hasClickId ?? hasClickId
    const dev = overrides.device ?? device
    const cou = overrides.country ?? country

    const filters: EventFilters = {}

    if (p === 'custom') {
      if (cf) filters.from = cf
      if (ct) filters.to = ct
    } else if (p !== 'none') {
      const range = dateRange(p)
      if (range.from) filters.from = range.from
      if (range.to) filters.to = range.to
    }

    if (hci) filters.hasClickId = true
    if (dev) filters.device = dev
    if (cou) filters.country = cou

    onFilterChange(filters)
  }

  function selectPreset(p: DatePreset) {
    setPreset(p)
    emit({ preset: p })
  }

  const presets: { label: string; value: DatePreset }[] = [
    { label: 'Todos', value: 'none' },
    { label: 'Hoje', value: 'today' },
    { label: '7 dias', value: '7d' },
    { label: '30 dias', value: '30d' },
    { label: 'Customizado', value: 'custom' },
  ]

  return (
    <div className="flex flex-wrap gap-3 items-end mb-4">
      {/* Período */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium">Período</span>
        <div className="flex gap-1">
          {presets.map((p) => (
            <Button
              key={p.value}
              variant={preset === p.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => selectPreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Custom date inputs */}
      {preset === 'custom' && (
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">De</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={customFrom.slice(0, 10)}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T00:00:00.000Z` : ''
                setCustomFrom(v)
                emit({ customFrom: v })
              }}
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground font-medium">Até</span>
            <Input
              type="date"
              className="h-8 text-sm w-36"
              value={customTo.slice(0, 10)}
              onChange={(e) => {
                const v = e.target.value ? `${e.target.value}T23:59:59.000Z` : ''
                setCustomTo(v)
                emit({ customTo: v })
              }}
            />
          </div>
        </div>
      )}

      {/* Tem Click ID toggle */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground font-medium">Click ID</span>
        <Button
          variant={hasClickId ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            const next = !hasClickId
            setHasClickId(next)
            emit({ hasClickId: next })
          }}
        >
          Tem Click ID
        </Button>
      </div>

      {/* Device select */}
      {deviceOptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">Device</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={device}
            onChange={(e) => {
              setDevice(e.target.value)
              emit({ device: e.target.value })
            }}
          >
            <option value="">Todos</option>
            {deviceOptions.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      )}

      {/* Country select */}
      {countryOptions.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground font-medium">País</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            value={country}
            onChange={(e) => {
              setCountry(e.target.value)
              emit({ country: e.target.value })
            }}
          >
            <option value="">Todos</option>
            {countryOptions.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
