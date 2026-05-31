import { useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { analyzeUrl, type AnalyzeUrlResult } from '../lib/presells-api.ts'

interface AnalyzeUrlSectionProps {
  onResult: (result: AnalyzeUrlResult) => void
  disabled?: boolean
}

export function AnalyzeUrlSection({ onResult, disabled }: AnalyzeUrlSectionProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [userInstructions, setUserInstructions] = useState('')

  function validateUrl(value: string): string | null {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'A URL deve começar com http:// ou https://'
    }
    return null
  }

  async function handleAnalyze() {
    const validationError = validateUrl(url.trim())
    if (validationError) {
      setUrlError(validationError)
      return
    }
    setUrlError(null)
    setError(null)
    setLoading(true)
    try {
      const instructions = userInstructions.trim() || undefined
      const result = await analyzeUrl(url.trim(), instructions)
      onResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-3)' }}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--p-muted)' }}>
        Cole a URL de um produto para preencher o formulário automaticamente com IA.
        Os campos existentes serão sobrescritos.
      </p>
      <div style={{ display: 'flex', gap: 'var(--p-space-2)' }}>
        <div style={{ flex: 1 }}>
          <Input
            type="url"
            placeholder="https://exemplo.com/produto"
            value={url}
            onChange={(e) => {
              setUrl(e.currentTarget.value)
              if (urlError) setUrlError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && url && !loading) void handleAnalyze()
            }}
            disabled={loading || disabled}
            aria-invalid={!!urlError}
          />
          {urlError && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--p-danger)', margin: '4px 0 0' }}>
              {urlError}
            </p>
          )}
        </div>
        <Button
          onClick={() => void handleAnalyze()}
          disabled={loading || !url.trim() || disabled}
        >
          {loading ? 'Analisando…' : 'Analisar'}
        </Button>
      </div>

      {/* Wizard de IA — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setWizardOpen(o => !o)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            fontSize: '0.8125rem',
            color: 'var(--p-muted)',
            userSelect: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              transition: 'transform 0.2s',
              transform: wizardOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          Wizard de IA
        </button>

        {wizardOpen && (
          <div style={{ marginTop: 'var(--p-space-2)', display: 'flex', flexDirection: 'column', gap: 'var(--p-space-1)' }}>
            <label
              htmlFor="wizard-instructions"
              style={{ fontSize: '0.8125rem', color: 'var(--p-text)', fontWeight: 500 }}
            >
              Instruções adicionais para a IA
            </label>
            <textarea
              id="wizard-instructions"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows={3}
              maxLength={500}
              placeholder="ex: foque em público feminino 35+, use tom urgente, destaque o desconto de 50%"
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.currentTarget.value)}
              disabled={loading || disabled}
            />
            {userInstructions.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: 'var(--p-muted)', margin: 0, textAlign: 'right' }}>
                {userInstructions.length}/500
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--p-danger)', margin: 0 }}>
          {error}
        </p>
      )}
      {loading && (
        <p style={{ fontSize: '0.875rem', color: 'var(--p-muted)', margin: 0 }}>
          Isso pode levar até 1 minuto — o servidor está abrindo a página e consultando a IA…
        </p>
      )}
    </div>
  )
}
