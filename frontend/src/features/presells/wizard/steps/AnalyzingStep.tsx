import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button.tsx'
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
  goToImages: (extractedImages: { url: string; type: string }[], jobResult: unknown) => void
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
      goToImages(jobStatus.result.extractedImages, jobStatus.result)
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
    <div className="section-card flex flex-col items-center gap-6 text-center">
      {!isFailed && (
        <div className="flex flex-col items-center gap-4">
          <span role="status" aria-label="Analisando…">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-slate-700">Analisando o site…</p>
            {message && <p className="text-sm text-slate-500">{message}</p>}
          </div>
        </div>
      )}

      {isFailed && (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-500 text-xl font-bold">
            !
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-semibold text-slate-700">Não foi possível concluir</p>
            <p className="text-sm text-slate-500">Verifique a URL e tente novamente.</p>
          </div>
          <Button variant="outline" type="button" onClick={onRetry}>
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  )
}
