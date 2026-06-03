import type { CSSProperties } from 'react'
import type { FieldErrors } from 'react-hook-form'
import type { PresellFormValues } from '@/features/presells/lib/presell-form-schema.ts'
import type { TabId } from '@/features/presells/components/EditorTabs.tsx'

type PublishReadinessBlockProps = {
  errors: FieldErrors<PresellFormValues>
  values: PresellFormValues
  onNavigateToTab: (tab: TabId) => void
  onPublish: () => void
  isBusy: boolean
}

type RequiredField = {
  field: keyof PresellFormValues
  label: string
  tab: TabId
}

const REQUIRED_FIELDS: RequiredField[] = [
  { field: 'headline' as const, label: 'Título principal',    tab: 'content' as TabId },
  { field: 'ctaText' as const,  label: 'Texto do botão',      tab: 'conversion' as TabId },
  { field: 'slug' as const,     label: 'Endereço da página',  tab: 'publish' as TabId },
  { field: 'title' as const,    label: 'Título interno',      tab: 'publish' as TabId },
]

function isMissing(
  field: keyof PresellFormValues,
  errors: FieldErrors<PresellFormValues>,
  values: PresellFormValues,
): boolean {
  const value = values[field]
  const hasError = !!errors[field]
  const isEmpty = typeof value === 'string' ? value.trim() === '' : !value
  return isEmpty || hasError
}

export function PublishReadinessBlock({
  errors,
  values,
  onNavigateToTab,
  onPublish,
  isBusy,
}: PublishReadinessBlockProps) {
  const missingFields = REQUIRED_FIELDS.filter(({ field }) =>
    isMissing(field, errors, values),
  )

  const allValid = missingFields.length === 0

  const containerStyle: CSSProperties = {
    borderRadius: '8px',
    border: `1px solid ${allValid ? 'rgba(22, 163, 74, 0.3)' : 'rgba(217, 119, 6, 0.3)'}`,
    borderLeft: `4px solid ${allValid ? '#16a34a' : '#d97706'}`,
    background: allValid
      ? 'rgba(22, 163, 74, 0.05)'
      : 'rgba(217, 119, 6, 0.05)',
    padding: 'var(--p-space-4)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--p-space-4)',
  }

  return (
    <div style={containerStyle}>
      {allValid ? (
        <div>
          <p style={{
            margin: 0,
            fontWeight: 600,
            color: '#16a34a',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--p-space-2)',
          }}>
            <span>✅</span> Tudo pronto para publicar
          </p>
          <p style={{
            margin: '4px 0 0',
            fontSize: '0.8125rem',
            color: 'var(--p-muted)',
          }}>
            Os {REQUIRED_FIELDS.length} campos obrigatórios estão preenchidos.
          </p>
        </div>
      ) : (
        <div>
          <p style={{
            margin: '0 0 var(--p-space-2)',
            fontWeight: 600,
            color: '#d97706',
            fontSize: '0.9375rem',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--p-space-2)',
          }}>
            <span>⚠️</span> Campos obrigatórios pendentes:
          </p>
          <ul style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}>
            {missingFields.map(({ field, label, tab }) => (
              <li key={field} style={{ fontSize: '0.875rem' }}>
                <button
                  type="button"
                  onClick={() => onNavigateToTab(tab)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: '#3b82f6',
                    fontSize: 'inherit',
                    textDecoration: 'underline',
                    textDecorationColor: 'transparent',
                    transition: 'text-decoration-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.textDecorationColor = '#3b82f6'
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLButtonElement).style.textDecorationColor = 'transparent'
                  }}
                >
                  • {label} →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={onPublish}
          disabled={isBusy}
          style={{
            background: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1.25rem',
            fontSize: '0.9375rem',
            fontWeight: 600,
            cursor: isBusy ? 'not-allowed' : 'pointer',
            opacity: isBusy ? 0.6 : 1,
            transition: 'opacity 0.15s',
          }}
        >
          {isBusy ? 'Publicando…' : 'Publicar página'}
        </button>
      </div>
    </div>
  )
}
