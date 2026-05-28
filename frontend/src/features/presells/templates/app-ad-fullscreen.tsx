import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function AppAdFullscreen({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, imageUrl, backgroundImageUrl, settings } = presell

  const labelText = settings.label_text as string | undefined
  const microcopy = settings.microcopy as string | undefined
  const disclaimer = settings.disclaimer as string | undefined
  const buttonStyle = (settings.button_style as string | undefined) ?? 'solid'

  function handleCta() {
    fetch(`/api/public/presells/${slug}/redirect`, { method: 'POST' })
    window.location.href = affiliateUrl
  }

  const buttonClass =
    buttonStyle === 'outline'
      ? 'w-full rounded-xl border-2 border-white px-6 py-3 text-lg font-bold text-white hover:bg-white/10'
      : buttonStyle === 'soft'
        ? 'w-full rounded-xl bg-white/20 px-6 py-3 text-lg font-bold text-white hover:bg-white/30'
        : 'w-full rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white hover:bg-green-600'

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-gray-900"
      style={
        backgroundImageUrl
          ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      <div className="absolute inset-0 backdrop-blur-sm bg-black/50" />
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-white/20 bg-white/15 p-8 text-center text-white shadow-2xl backdrop-blur-md">
        {labelText && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/60">{labelText}</p>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt={headline}
            className="mx-auto mb-4 object-contain"
            style={{ maxHeight: '180px' }}
          />
        )}
        <h1 className="mb-2 text-2xl font-extrabold text-white">{headline}</h1>
        <p className="mb-4 text-white/80">{subtitle}</p>
        {microcopy && (
          <p className="mb-4 text-sm text-white/60">{microcopy}</p>
        )}
        <button onClick={handleCta} className={buttonClass}>
          {ctaText}
        </button>
        {disclaimer && (
          <p className="mt-4 text-xs text-white/40">{disclaimer}</p>
        )}
      </div>
    </div>
  )
}

registerTemplate('app-ad-fullscreen', AppAdFullscreen)

export default AppAdFullscreen
