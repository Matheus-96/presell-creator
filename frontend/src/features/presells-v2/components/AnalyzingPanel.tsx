import { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { Button } from '@/components/ui/button.tsx'
import {
  AnalyzeJobV2ExpiredError,
  pollAnalyzeJobV2,
} from '@/features/presells-v2/lib/presells-v2-api.ts'
import type { Section } from '@/features/presells-v2/sections/types.ts'

const POLL_INTERVAL_MS = 2_000

const ERROR_MESSAGES: Record<string, string> = {
  site_unreachable: 'Não foi possível abrir o site informado. Verifique a URL.',
  image_extraction_failed: 'Não foi possível obter imagens do site.',
  ai_error: 'A IA não conseguiu processar a página. Tente novamente.',
  timeout: 'A análise demorou mais que o esperado. Tente novamente.',
  unknown: 'Não foi possível concluir a análise. Tente novamente.',
}

function getFriendlyErrorMessage(errorCode?: string) {
  if (!errorCode) return ERROR_MESSAGES.unknown
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown
}

type AnalyzingPanelProps = {
  jobId: string
  onDone: (sections: Section[]) => void
  onRetry: () => void
}

export function AnalyzingPanel({ jobId, onDone, onRetry }: AnalyzingPanelProps) {
  const { data: status, error } = useQuery({
    queryKey: ['analyze-v2-job', jobId],
    queryFn: () => pollAnalyzeJobV2(jobId),
    refetchInterval: (query) => {
      const s = query.state.data?.status
      return s === 'done' || s === 'failed' ? false : POLL_INTERVAL_MS
    },
    retry: false,
  })

  useEffect(() => {
    if (status?.status === 'done') {
      onDone(status.result.sections)
    }
  }, [status, onDone])

  const failed =
    status?.status === 'failed' || error instanceof AnalyzeJobV2ExpiredError
  const errorMessage = useMemo(() => {
    if (status?.status === 'failed') {
      return getFriendlyErrorMessage(status.errorCode)
    }
    if (error instanceof AnalyzeJobV2ExpiredError) {
      return error.message
    }
    return null
  }, [status, error])

  if (failed) {
    return (
      <SectionCard
        eyebrow="Análise"
        title="Não foi possível concluir"
        description="Verifique a URL e tente novamente."
      >
        <div className="flex flex-col items-start gap-3 py-2">
          <p role="alert" className="text-sm text-red-600">
            {errorMessage}
          </p>
          <Button type="button" variant="outline" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      </SectionCard>
    )
  }

  const message =
    status && status.status !== 'done' ? status.message : 'Iniciando análise…'

  return (
    <SectionCard
      eyebrow="Análise"
      title="Analisando o site…"
      description="Aguarde enquanto a IA processa o conteúdo."
    >
      <div className="flex items-center gap-3 py-2">
        <Loader2
          aria-label="carregando"
          className="h-5 w-5 animate-spin text-indigo-500"
        />
        <p className="text-sm text-slate-700">{message}</p>
      </div>
    </SectionCard>
  )
}
