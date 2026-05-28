import type { ReactNode } from 'react'

type SectionCardProps = {
  eyebrow?: string
  title: string
  description?: string
  children: ReactNode
}

export function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: SectionCardProps) {
  return (
    <section className="section-card">
      <div className="section-card__header">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h3>{title}</h3>
        {description ? (
          <p className="section-card__description">{description}</p>
        ) : null}
      </div>
      <div className="section-card__content">{children}</div>
    </section>
  )
}
