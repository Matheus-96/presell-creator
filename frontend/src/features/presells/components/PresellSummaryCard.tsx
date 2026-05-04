
type PresellSummaryCardProps = {
  label: string
  value: string
  helper: string
}

export function PresellSummaryCard({
  label,
  value,
  helper,
}: PresellSummaryCardProps) {
  return (
    <article className="summary-card">
      <p className="summary-card__label">{label}</p>
      <strong className="summary-card__value">{value}</strong>
      <p className="summary-card__helper">{helper}</p>
    </article>
  )
}
