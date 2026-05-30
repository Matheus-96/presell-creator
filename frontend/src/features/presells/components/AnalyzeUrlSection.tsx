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
      const result = await analyzeUrl(url.trim())
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
