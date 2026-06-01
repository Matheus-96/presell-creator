import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { pollAnalyzeJob } from '@/features/presells/lib/presells-api.ts'

const POLL_INTERVAL_MS = 2_000

const ERROR_MESSAGES: Record<string, string> = {
  site_unreachable: 'Erro ao consultar o site informado',
  image_extraction_failed: 'Erro ao obter imagens do site',
  ai_error: 'Erro no processamento de IA',
  timeout: 'A análise demorou mais que o esperado. Tente novamente.',
  unknown: 'Não foi possível concluir a análise. Tente novamente.',
}

function getFriendlyErrorMessage(errorCode?: string): string {
  if (!errorCode) return ERROR_MESSAGES.unknown
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unknown
}

interface AnalyzingStepProps {
  jobId: string
  goToImages: (selectedImages: string[]) => void
  onRetry: () => void
}

export function AnalyzingStep({ jobId, goToImages, onRetry }: AnalyzingStepProps) {
  const { data: jobStatus } = useQuery({
    queryKey: ['analyze-job', jobId],
    queryFn: () => pollAnalyzeJob(jobId),
    enabled: true,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'done' || status === 'failed' ? false : POLL_INTERVAL_MS
    },
    retry: false,
  })

  useEffect(() => {
    if (!jobStatus) return
    if (jobStatus.status === 'done') {
      goToImages([])
    } else if (jobStatus.status === 'failed') {
      toast.error(getFriendlyErrorMessage(jobStatus.errorCode))
    }
  }, [jobStatus, goToImages])

  const isFailed = jobStatus?.status === 'failed'
  const message =
    jobStatus && jobStatus.status !== 'done' && jobStatus.status !== 'failed'
      ? jobStatus.message
      : null

  return (
    <div>
      {!isFailed && (
        <span role="status" aria-label="Analisando…" />
      )}
      {message && <p>{message}</p>}
      {isFailed && (
        <button type="button" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}
