import '@/features/presells/templates/index.ts'
import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ApiClientError } from '@/lib/api/api-client.ts'
import { getPublicPresell } from '@/features/presells/lib/presells-api.ts'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import { getFontPair, buildFontCssVars } from '@/features/presells/lib/font-pairs.ts'

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
    if (!presell?.slug) return
    const slug = presell.slug
    const startTime = Date.now()
    let sent = false

    function sendTime() {
      if (sent) return
      sent = true
      const seconds = Math.round((Date.now() - startTime) / 1000)
      if (seconds < 1) return
      navigator.sendBeacon(
        `/api/public/presells/${slug}/events`,
        new Blob(
          [JSON.stringify({ eventType: 'time_on_page', params: { seconds } })],
          { type: 'application/json' },
        ),
      )
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') sendTime()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', sendTime, { once: true })

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      sendTime()
    }
  }, [presell?.slug])

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

  useEffect(() => {
    const fontPairKey = presell?.settings?.font_pair as string | undefined
    const pair = getFontPair(fontPairKey)

    // Inject CSS custom properties for heading/body fonts
    const styleEl = document.createElement('style')
    styleEl.id = 'presell-font-vars'
    styleEl.textContent = buildFontCssVars(pair)
    document.head.appendChild(styleEl)

    // Inject preconnect + font stylesheet for external pairs only
    const nodes: HTMLElement[] = []
    if (pair.googleFontsUrl) {
      const preconnectFonts = document.createElement('link')
      preconnectFonts.rel = 'preconnect'
      preconnectFonts.href = 'https://fonts.googleapis.com'
      document.head.appendChild(preconnectFonts)
      nodes.push(preconnectFonts)

      const preconnectStatic = document.createElement('link')
      preconnectStatic.rel = 'preconnect'
      preconnectStatic.href = 'https://fonts.gstatic.com'
      preconnectStatic.crossOrigin = 'anonymous'
      document.head.appendChild(preconnectStatic)
      nodes.push(preconnectStatic)

      const linkEl = document.createElement('link')
      linkEl.rel = 'stylesheet'
      linkEl.href = pair.googleFontsUrl
      document.head.appendChild(linkEl)
      nodes.push(linkEl)
    }

    return () => {
      styleEl.remove()
      nodes.forEach((n) => n.remove())
    }
  }, [presell?.settings?.font_pair])

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
