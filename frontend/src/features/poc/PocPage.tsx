import { useState, useRef } from 'react'
import { PageHeader } from '@/components/layout/PageHeader.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Input } from '@/components/ui/input.tsx'
import { Label } from '@/components/ui/label.tsx'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'
import { DynamicPresellRenderer } from '@/features/poc/DynamicPresellRenderer.tsx'
import type { Block, RootProps } from '@/features/poc/types.ts'

interface GenerateResult {
  blocks: Block[]
  rootProps: RootProps
  rawJson: string
}

type Status = 'idle' | 'loading' | 'success' | 'error'

export function PocPage() {
  useDocumentTitle('Gerar Presell (POC)')

  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [urlError, setUrlError] = useState('')
  const [copied, setCopied] = useState(false)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function validateUrl(value: string): string {
    if (!value.startsWith('http://') && !value.startsWith('https://')) {
      return 'A URL deve começar com http:// ou https://'
    }
    return ''
  }

  async function handleGenerate() {
    const validationError = validateUrl(url)
    if (validationError) {
      setUrlError(validationError)
      return
    }
    setUrlError('')
    setStatus('loading')
    setErrorMessage('')

    try {
      const res = await fetch('/api/admin/poc/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        credentials: 'include',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Erro ${res.status}`)
      }

      const data = await res.json() as GenerateResult
      setResult(data)
      setStatus('success')
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Ocorreu um erro inesperado')
      setStatus('error')
    }
  }

  function handleReset() {
    setStatus('idle')
    setResult(null)
    setErrorMessage('')
    setUrlError('')
  }

  function handleCopyJson() {
    if (!result) return
    const json = JSON.stringify(result, null, 2)
    navigator.clipboard.writeText(json).then(
      () => {
        setCopied(true)
        if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
      },
      () => {},
    )
  }

  return (
    <div className="page" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <PageHeader
        eyebrow="POC"
        title="Gerar Presell"
        description="Cole a URL de um produto para gerar um presell com IA."
      />

      <div
        style={{
          display: 'flex',
          flex: 1,
          gap: 'var(--p-space-6)',
          overflow: 'hidden',
          flexWrap: 'wrap',
          minHeight: 0,
        }}
      >
        {/* Left panel */}
        <div
          style={{
            flex: '0 0 clamp(280px, 40%, 480px)',
            background: 'var(--p-panel)',
            padding: 'var(--p-space-6)',
            borderRadius: 'var(--p-radius-md)',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            boxShadow: '0 22px 40px -30px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--p-space-4)',
            overflowY: 'auto',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-2)' }}>
            <Label htmlFor="poc-url">URL da página</Label>
            <Input
              id="poc-url"
              type="url"
              placeholder="https://exemplo.com/produto"
              value={url}
              onChange={(e) => {
                setUrl(e.currentTarget.value)
                if (urlError) setUrlError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && url && status !== 'loading') {
                  void handleGenerate()
                }
              }}
              aria-invalid={!!urlError}
              aria-describedby={urlError ? 'poc-url-error' : undefined}
            />
            {urlError && (
              <p
                id="poc-url-error"
                style={{ fontSize: '0.875rem', color: 'var(--p-danger)', margin: 0 }}
              >
                {urlError}
              </p>
            )}
          </div>

          <Button
            onClick={() => void handleGenerate()}
            disabled={status === 'loading' || !url.trim()}
          >
            {status === 'loading' ? 'Gerando…' : 'Gerar Presell'}
          </Button>

          {status === 'success' && result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-2)', flex: 1, minHeight: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--p-space-2)' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--p-text)' }}>
                  JSON gerado
                </span>
                <Button size="sm" variant="outline" onClick={handleCopyJson}>
                  {copied ? 'Copiado!' : 'Copiar JSON'}
                </Button>
              </div>
              <pre
                style={{
                  flex: 1,
                  overflow: 'auto',
                  background: '#f1f5f9',
                  borderRadius: 'var(--p-radius-sm)',
                  padding: 'var(--p-space-4)',
                  fontSize: '0.75rem',
                  lineHeight: 1.6,
                  color: 'var(--p-text)',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxHeight: '400px',
                }}
              >
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div
          style={{
            flex: '1 1 300px',
            overflowY: 'auto',
            display: 'flex',
            alignItems: status === 'idle' || status === 'loading' || status === 'error' ? 'center' : 'flex-start',
            justifyContent: 'center',
          }}
        >
          {status === 'idle' && (
            <p
              style={{
                color: 'var(--p-muted)',
                fontSize: '1rem',
                textAlign: 'center',
                padding: 'var(--p-space-8)',
              }}
            >
              Cole uma URL de produto para começar
            </p>
          )}

          {status === 'loading' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--p-space-4)',
                color: 'var(--p-muted)',
              }}
            >
              <Spinner />
              <span style={{ fontSize: '0.95rem' }}>Analisando página…</span>
            </div>
          )}

          {status === 'error' && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 'var(--p-space-4)',
                textAlign: 'center',
                padding: 'var(--p-space-8)',
              }}
            >
              <p style={{ color: 'var(--p-danger)', fontSize: '0.95rem', margin: 0 }}>
                {errorMessage}
              </p>
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#4f46e5',
                  textDecoration: 'underline',
                  fontSize: '0.875rem',
                  padding: 0,
                }}
              >
                Tentar novamente
              </button>
            </div>
          )}

          {status === 'success' && result && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: 'var(--p-maxw-card)',
                  boxShadow: 'var(--p-shadow-lg)',
                  borderRadius: 'var(--p-radius-md)',
                  overflow: 'hidden',
                }}
              >
                <DynamicPresellRenderer blocks={result.blocks} rootProps={result.rootProps} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <>
      <style>{`
        @keyframes poc-spin {
          to { transform: rotate(360deg); }
        }
        .poc-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(99, 102, 241, 0.2);
          border-top-color: #6366f1;
          border-radius: 50%;
          animation: poc-spin 0.7s linear infinite;
        }
      `}</style>
      <div className="poc-spinner" aria-hidden="true" />
    </>
  )
}
