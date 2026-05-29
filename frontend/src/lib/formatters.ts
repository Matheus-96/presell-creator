const numberFormatter = new Intl.NumberFormat('pt-BR')
const compactNumberFormatter = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const percentFormatter = new Intl.NumberFormat('pt-BR', {
  maximumFractionDigits: 1,
})
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
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
