import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function AppAd({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, imageUrl, settings } = presell

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
      ? 'w-full rounded-xl border-2 border-green-500 px-6 py-3 text-lg font-bold text-green-600 hover:bg-green-50'
      : buttonStyle === 'soft'
        ? 'w-full rounded-xl bg-green-100 px-6 py-3 text-lg font-bold text-green-700 hover:bg-green-200'
        : 'w-full rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white hover:bg-green-600'

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
        {labelText && (
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-400">{labelText}</p>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="mx-auto mb-4 object-contain"
            style={{ maxHeight: '180px' }}
          />
        )}
        <h1 className="mb-2 text-2xl font-extrabold text-gray-900">{headline}</h1>
        <p className="mb-4 text-gray-600">{subtitle}</p>
        {microcopy && (
          <p className="mb-4 text-sm text-gray-500">{microcopy}</p>
        )}
        <button type="button" onClick={handleCta} className={buttonClass}>
          {ctaText}
        </button>
        {disclaimer && (
          <p className="mt-4 text-xs text-gray-400">{disclaimer}</p>
        )}
      </div>
    </div>
  )
}

registerTemplate('app-ad', AppAd)

export default AppAd
