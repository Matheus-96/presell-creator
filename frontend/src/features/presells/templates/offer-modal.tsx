import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'
import { handlePresellCta } from '@/features/presells/lib/presell-cta.ts'

function OfferModal({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, backgroundImageUrl, settings } = presell

  const discountText = settings.discount_text as string | undefined
  const rating = settings.rating as string | undefined
  const starsText = settings.stars_text as string | undefined
  const scarcityText = settings.scarcity_text as string | undefined

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-gray-900"
      style={
        backgroundImageUrl
          ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {backgroundImageUrl && (
        <div className="absolute inset-0 bg-black/60" />
      )}
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        {discountText && (
          <p className="mb-3 text-base font-bold text-green-600">{discountText}</p>
        )}
        <h1 className="mb-3 text-3xl font-extrabold text-gray-900">{headline}</h1>
        <p className="mb-4 text-gray-600">{subtitle}</p>
        {(rating || starsText) && (
          <p className="mb-3 text-sm text-gray-500">
            {rating} {starsText}
          </p>
        )}
        {scarcityText && (
          <p className="mb-4 text-sm font-semibold text-red-600">{scarcityText}</p>
        )}
        <button
          type="button"
          onClick={() => handlePresellCta(slug, affiliateUrl)}
          className="w-full rounded-xl bg-green-500 px-6 py-3 text-lg font-bold text-white hover:bg-green-600 active:bg-green-700"
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
}

registerTemplate('offer-modal', OfferModal)

export default OfferModal
