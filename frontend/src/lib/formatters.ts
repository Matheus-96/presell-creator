const numberFormatter = new Intl.NumberFormat('en-US')
const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const percentFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
})

export function formatNumber(value: number) {
  return numberFormatter.format(value)
}

export function formatCompactNumber(value: number) {
  return compactNumberFormatter.format(value)
}

export function formatPercent(value: number) {
  return `${percentFormatter.format(value)}%`
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateTimeFormatter.format(parsed)
}

export function formatDate(value: string | null | undefined) {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed)
}

export function formatTitle(value: string | null | undefined, fallback: string) {
  const normalized = value?.trim()
  return normalized && normalized.length > 0 ? normalized : fallback
}
