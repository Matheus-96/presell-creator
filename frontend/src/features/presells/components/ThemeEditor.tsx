import { useState } from 'react'
import { RgbaStringColorPicker } from 'react-colorful'
import type { PresellTheme } from '../types'

interface ThemeEditorProps {
  theme: PresellTheme | null | undefined
  onChange: (theme: PresellTheme) => void
}

const THEME_TOKENS: { key: keyof PresellTheme; label: string; description: string }[] = [
  { key: 'primary',    label: 'Primária',    description: 'Botões, CTAs, destaques' },
  { key: 'secondary',  label: 'Secundária',  description: 'Títulos, ícones, acentos' },
  { key: 'background', label: 'Fundo',       description: 'Cor de fundo da página' },
  { key: 'surface',    label: 'Superfície',  description: 'Fundo de cards e seções (suporta transparência)' },
  { key: 'textColor',  label: 'Texto',       description: 'Cor principal do texto' },
]

const DEFAULT_COLORS: PresellTheme = {
  primary:    'rgba(99, 102, 241, 1)',
  secondary:  'rgba(30, 41, 59, 1)',
  background: 'rgba(255, 255, 255, 1)',
  surface:    'rgba(248, 250, 252, 1)',
  textColor:  'rgba(15, 23, 42, 1)',
}

export function ThemeEditor({ theme, onChange }: ThemeEditorProps) {
  const [openPicker, setOpenPicker] = useState<keyof PresellTheme | null>(null)

  const current: PresellTheme = { ...DEFAULT_COLORS, ...theme }

  function handleChange(key: keyof PresellTheme, value: string) {
    onChange({ ...current, [key]: value })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-3)' }}>
      {THEME_TOKENS.map(({ key, label, description }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--p-space-2)' }}>
            <button
              type="button"
              onClick={() => setOpenPicker(openPicker === key ? null : key)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--p-radius-sm)',
                border: '1px solid rgba(148, 163, 184, 0.4)',
                background: current[key] ?? 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              aria-label={`Editar cor ${label}`}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--p-text)' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--p-muted)' }}>{description}</div>
            </div>
            <code style={{
              fontSize: '0.7rem',
              color: 'var(--p-muted)',
              background: 'rgba(148, 163, 184, 0.1)',
              padding: '2px 6px',
              borderRadius: 4,
              maxWidth: 200,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {current[key]}
            </code>
          </div>

          {openPicker === key && (
            <div style={{ paddingLeft: 40 }}>
              <RgbaStringColorPicker
                color={current[key] ?? 'rgba(0,0,0,1)'}
                onChange={(v) => handleChange(key, v)}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
