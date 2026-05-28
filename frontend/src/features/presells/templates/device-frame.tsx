import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function DeviceFrame({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, imageUrl, bullets, settings } = presell

  const topBarText = settings.top_bar_text as string | undefined
  const offerNote = settings.offer_note as string | undefined
  const footerLeftText = settings.footer_left_text as string | undefined
  const footerRightText = settings.footer_right_text as string | undefined
  const frameType = settings.frame_type as string | undefined

  const isPhone = frameType === 'phone'

  function handleCta() {
    fetch(`/api/public/presells/${slug}/redirect`, { method: 'POST' })
    window.location.href = affiliateUrl
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-6">
      <div
        className={`w-full overflow-hidden rounded-2xl border border-gray-300 bg-white shadow-xl ${isPhone ? 'max-w-sm' : 'max-w-4xl'}`}
      >
        {/* Browser/phone top bar */}
        <div className="flex items-center gap-2 bg-gray-200 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          {topBarText && (
            <span className="ml-3 flex-1 rounded bg-white px-3 py-1 text-xs text-gray-500">{topBarText}</span>
          )}
        </div>

        {/* Content */}
        <div className={`p-6 ${isPhone ? '' : 'grid grid-cols-2 gap-8'}`}>
          {imageUrl && (
            <div className="flex items-center justify-center">
              <img src={imageUrl} alt={headline} className="max-h-64 w-full object-contain" />
            </div>
          )}
          <div>
            {offerNote && (
              <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-green-600">{offerNote}</p>
            )}
            <h1 className="mb-3 text-3xl font-extrabold text-gray-900">{headline}</h1>
            <p className="mb-4 text-gray-600">{subtitle}</p>
            {bullets.length > 0 && (
              <ul className="mb-6 space-y-1 text-gray-700">
                {bullets.map((bullet, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 text-green-500">✓</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={handleCta}
              className="w-full rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white hover:bg-green-600 active:bg-green-700"
            >
              {ctaText}
            </button>
          </div>
        </div>

        {/* Footer */}
        {(footerLeftText || footerRightText) && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-400">
            <span>{footerLeftText}</span>
            <span>{footerRightText}</span>
          </div>
        )}
      </div>
    </div>
  )
}

registerTemplate('device-frame', DeviceFrame)

export default DeviceFrame
