import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import {
  AnalyzeJobExpiredError,
  pollAnalyzeJob,
  startAnalyzeUrl,
  type AnalyzeUrlResult,
} from '../lib/presells-api.ts'

const POLL_INTERVAL_MS = 5000

interface AnalyzeUrlSectionProps {
  onResult: (result: AnalyzeUrlResult) => void
  disabled?: boolean
}

export function AnalyzeUrlSection({ onResult, disabled }: AnalyzeUrlSectionProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [userInstructions, setUserInstructions] = useState('')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function clearPolling() {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  useEffect(() => {
    return () => {
      clearPolling()
    }
  }, [])

  function validateUrl(value: string): string | null {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'A URL deve começar com http:// ou https://'
    }
    return null
  }

  function startPolling(jobId: string) {
    intervalRef.current = setInterval(() => {
      void pollAnalyzeJob(jobId)
        .then((status) => {
          if (status.status === 'done') {
            clearPolling()
            setLoading(false)
            setStatusMessage(null)
            onResult(status.result)
          } else if (status.status === 'failed') {
            clearPolling()
            setLoading(false)
            setStatusMessage(null)
            setError(status.message)
          } else {
            setStatusMessage(status.message)
          }
        })
        .catch((err: unknown) => {
          clearPolling()
          setLoading(false)
          setStatusMessage(null)
          if (err instanceof AnalyzeJobExpiredError) {
            setError(err.message)
          } else {
            setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
          }
        })
    }, POLL_INTERVAL_MS)
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
    setStatusMessage(null)
    try {
      const instructions = userInstructions.trim() || undefined
      const { jobId } = await startAnalyzeUrl(url.trim(), instructions)
      startPolling(jobId)
    } catch (err) {
      setLoading(false)
      setError(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-1)' }}>
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

      {error && (
        <p style={{ fontSize: '0.875rem', color: 'var(--p-danger)', margin: 0 }}>
          {error}
        </p>
      )}
      {loading && (
        <p style={{ fontSize: '0.875rem', color: 'var(--p-muted)', margin: 0 }}>
          {statusMessage ?? 'Isso pode levar até 1 minuto — o servidor está abrindo a página e consultando a IA…'}
        </p>
      )}
    </div>
  )
}
