import { useState } from 'react'

type FormSectionProps = {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
}

export function FormSection({
  title,
  description,
  action,
  children,
  collapsible = false,
  defaultOpen = true,
}: FormSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--p-space-4) 0',
          cursor: collapsible ? 'pointer' : 'default',
          userSelect: 'none',
        }}
        onClick={() => collapsible && setOpen(o => !o)}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--p-text)' }}>
            {title}
          </h3>
          {description && (
            <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--p-muted)' }}>
              {description}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)' }}>
          {action && <div onClick={e => e.stopPropagation()}>{action}</div>}
          {collapsible && (
            <span style={{
              display: 'inline-flex',
              transition: 'transform 0.2s',
              transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
              color: 'var(--p-muted)',
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
          )}
        </div>
      </div>

      {(!collapsible || open) && (
        <div style={{ paddingBottom: 'var(--p-space-4)' }}>
          {children}
        </div>
      )}
    </section>
  )
}
