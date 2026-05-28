import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api/api-client.ts'
import { getPublicPresell } from '@/features/presells/lib/presells-api.ts'
import { getTemplate } from '@/features/presells/templates/registry.ts'

const PIXEL_ID_RE = /^[A-Z]+-[A-Z0-9]+$/

function isValidPixelId(id: string): boolean {
  return PIXEL_ID_RE.test(id)
}

export function PresellPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: presell, isLoading, isError, error } = useQuery({
    queryKey: ['public-presell', slug],
    queryFn: () => getPublicPresell(slug!),
    enabled: Boolean(slug),
    retry: false,
  })

  useEffect(() => {
    const pixelId = presell?.googlePixelId
    if (!pixelId || !isValidPixelId(pixelId)) return

    const tagScript = document.createElement('script')
    tagScript.async = true
    tagScript.src = `https://www.googletagmanager.com/gtag/js?id=${pixelId}`
    document.head.appendChild(tagScript)

    const inlineScript = document.createElement('script')
    inlineScript.innerHTML = [
      'window.dataLayer=window.dataLayer||[];',
      'function gtag(){dataLayer.push(arguments)}',
      "gtag('js',new Date());",
      `gtag('config','${pixelId}');`,
    ].join('')
    document.head.appendChild(inlineScript)

    return () => {
      tagScript.remove()
      inlineScript.remove()
    }
  }, [presell?.googlePixelId])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-current border-t-transparent" />
      </div>
    )
  }

  if (isError) {
    const status = error instanceof ApiClientError ? error.status : null
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">
          {status === 404 ? 'Presell não encontrado.' : 'Erro ao carregar o presell. Tente novamente.'}
        </p>
      </div>
    )
  }

  if (!presell) return null

  const Template = getTemplate(presell.templateId)

  if (!Template) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Template "{presell.templateId}" não disponível.</p>
      </div>
    )
  }

  return <Template presell={presell} />
}
