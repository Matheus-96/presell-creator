import { useEffect, useRef, useState } from 'react'

type BenefitsListProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

function parseItems(v: string): string[] {
  return v === '' ? [] : v.split('\n')
}

export function BenefitsList({ value, onChange, disabled }: BenefitsListProps) {
  const [items, setItems] = useState<string[]>(() => parseItems(value))

  const [focusIndex, setFocusIndex] = useState<number | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Tracks the last string we emitted via onChange so the sync effect can
  // distinguish an external reset (value ≠ lastEmitted) from the parent
  // echoing back our own filtered output (value === lastEmitted). Without this,
  // clearing a row calls onChange('remaining'), the parent sets value='remaining',
  // the effect fires and overwrites local state — wiping the empty field the user
  // is still editing.
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      setItems(parseItems(value))
    }
  }, [value])

  useEffect(() => {
    if (focusIndex !== null && inputRefs.current[focusIndex]) {
      inputRefs.current[focusIndex]!.focus()
      setFocusIndex(null)
    }
  }, [focusIndex])

  function emit(next: string[]) {
    const emitted = next.filter(s => s.length > 0).join('\n')
    lastEmitted.current = emitted
    onChange(emitted)
  }

  function handleChange(index: number, newText: string) {
    const next = [...items]
    next[index] = newText
    setItems(next)
    emit(next)
  }

  function handleRemove(index: number) {
    const next = items.filter((_, i) => i !== index)
    setItems(next)
    emit(next)
  }

  function handleAdd() {
    const next = [...items, '']
    setItems(next)
    setFocusIndex(next.length - 1)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-2)' }}>
      {items.map((item, index) => (
        <div
          key={index}
          style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)' }}
        >
          <input
            ref={el => { inputRefs.current[index] = el }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            value={item}
            disabled={disabled}
            onChange={e => handleChange(index, e.target.value)}
            placeholder={`Benefício ${index + 1}`}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => handleRemove(index)}
            title="Remover"
            style={{
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '1.75rem',
              height: '1.75rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--p-muted)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              fontSize: '1rem',
              lineHeight: 1,
              padding: 0,
              opacity: disabled ? 0.5 : 1,
              transition: 'color 0.15s, background 0.15s',
            }}
            onMouseEnter={e => {
              if (!disabled) {
                ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--p-text)'
                ;(e.currentTarget as HTMLButtonElement).style.background = 'rgba(148,163,184,0.12)'
              }
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--p-muted)'
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
          >
            ×
          </button>
        </div>
      ))}

      <div style={{ paddingTop: items.length > 0 ? 'var(--p-space-2)' : 0 }}>
        <button
          type="button"
          disabled={disabled}
          onClick={handleAdd}
          style={{
            border: 'none',
            background: 'transparent',
            color: disabled ? 'var(--p-muted)' : 'var(--p-text)',
            fontSize: '0.8125rem',
            cursor: disabled ? 'not-allowed' : 'pointer',
            padding: 0,
            opacity: disabled ? 0.5 : 0.7,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => {
            if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '1'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.opacity = disabled ? '0.5' : '0.7'
          }}
        >
          + Adicionar benefício
        </button>
      </div>
    </div>
  )
}
