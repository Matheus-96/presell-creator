import type { ReactNode } from 'react'

type StatusBannerProps = {
  tone?: 'info' | 'warning' | 'error'
  title: string
  description: string
  meta?: string[]
  action?: ReactNode
}

export function StatusBanner({
  tone = 'info',
  title,
  description,
  meta = [],
  action,
}: StatusBannerProps) {
  return (
    <section className={`status-banner status-banner--${tone}`}>
      <div className="status-banner__body">
        <div>
          <p className="eyebrow">System status</p>
          <h2 className="status-banner__title">{title}</h2>
          <p className="status-banner__description">{description}</p>
        </div>

        {meta.length > 0 ? (
          <ul className="status-banner__meta" aria-label="Runtime details">
            {meta.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>

      {action ? <div className="status-banner__actions">{action}</div> : null}
    </section>
  )
}
