import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function OfferModal({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, backgroundImageUrl, settings } = presell

  const discountText = settings.discount_text as string | undefined
  const rating = settings.rating as string | undefined
  const starsText = settings.stars_text as string | undefined
  const scarcityText = settings.scarcity_text as string | undefined
  const overlayStrength = (settings.overlay_strength as number | undefined) ?? 0.65
  const ctaBase = (settings.cta_color as string | undefined) ?? 'var(--p-cta-green)'

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-gray-900 px-4"
      style={
        backgroundImageUrl
          ? { backgroundImage: `url(${backgroundImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
    >
      {backgroundImageUrl && (
        <div className="absolute inset-0" style={{ backgroundColor: `rgba(0,0,0,${overlayStrength})` }} />
      )}
      <div
        className="relative z-10 w-full text-center"
        style={{
          maxWidth: 'var(--p-maxw-card)',
          backgroundColor: 'var(--p-panel)',
          borderRadius: 'var(--p-radius-lg)',
          padding: 'var(--p-space-10)',
          boxShadow: 'var(--p-shadow-lg)',
        }}
      >
        {discountText && (
          <p style={{ fontSize: 'var(--p-body-size)', fontWeight: 700, color: ctaBase, marginBottom: 'var(--p-space-3)' }}>
            {discountText}
          </p>
        )}
        <h1
          style={{
            fontSize: 'var(--p-h1-size)',
            fontWeight: 'var(--p-h1-weight)',
            lineHeight: 'var(--p-h1-lh)',
            letterSpacing: 'var(--p-h1-ls)',
            color: 'var(--p-text)',
            marginBottom: 'var(--p-space-3)',
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            fontSize: 'var(--p-subtitle-size)',
            fontWeight: 'var(--p-subtitle-weight)',
            lineHeight: 'var(--p-subtitle-lh)',
            color: 'var(--p-text)',
            marginBottom: 'var(--p-space-4)',
          }}
        >
          {subtitle}
        </p>
        {(rating || starsText) && (
          <p style={{ fontSize: 'var(--p-micro-size)', color: 'var(--p-muted)', marginBottom: 'var(--p-space-3)' }}>
            {rating} {starsText}
          </p>
        )}
        {scarcityText && (
          <p
            style={{
              fontSize: 'var(--p-micro-size)',
              fontWeight: 600,
              color: 'var(--p-danger)',
              marginBottom: 'var(--p-space-4)',
            }}
          >
            {scarcityText}
          </p>
        )}
        <button
          type="button"
          onClick={handleCta}
          className="w-full cursor-pointer transition-[filter] hover:brightness-90 active:brightness-75"
          style={{
            backgroundColor: ctaBase,
            minHeight: 'var(--p-cta-min-height)',
            borderRadius: 'var(--p-radius-md)',
            padding: '0 var(--p-space-6)',
            fontSize: 'var(--p-cta-text-size)',
            fontWeight: 'var(--p-cta-text-weight)',
            lineHeight: 'var(--p-cta-text-lh)',
            color: '#ffffff',
          }}
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
}

registerTemplate('offer-modal', OfferModal)

export default OfferModal
