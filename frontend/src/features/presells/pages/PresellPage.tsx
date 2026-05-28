import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api/api-client.ts'
import { getPublicPresell } from '@/features/presells/lib/presells-api.ts'
import { getTemplate } from '@/features/presells/templates/registry.ts'

export function PresellPage() {
  const { slug } = useParams<{ slug: string }>()

  const { data: presell, isLoading, isError, error } = useQuery({
    queryKey: ['public-presell', slug],
    queryFn: () => getPublicPresell(slug!),
    enabled: Boolean(slug),
    retry: false,
  })

  useEffect(() => {
    if (!presell?.googlePixelId) return

    const tagScript = document.createElement('script')
    tagScript.async = true
    tagScript.src = `https://www.googletagmanager.com/gtag/js?id=${presell.googlePixelId}`
    document.head.appendChild(tagScript)

    const inlineScript = document.createElement('script')
    inlineScript.innerHTML = [
      'window.dataLayer=window.dataLayer||[];',
      'function gtag(){dataLayer.push(arguments)}',
      "gtag('js',new Date());",
      `gtag('config','${presell.googlePixelId}');`,
    ].join('')
    document.head.appendChild(inlineScript)
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

  const Template = getTemplate(presell.template)

  if (!Template) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-gray-600">Template "{presell.template}" não disponível.</p>
      </div>
    )
  }

  return <Template presell={presell} />
}
