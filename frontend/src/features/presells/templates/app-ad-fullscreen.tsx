import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function AppAdFullscreen({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, backgroundImageUrl, settings } = presell

  const labelText = settings.label_text as string | undefined
  const microcopy = settings.microcopy as string | undefined
  const disclaimer = settings.disclaimer as string | undefined
  const buttonStyle = (settings.button_style as string | undefined) ?? 'solid'
  const ctaBase = (settings.cta_color as string | undefined) ?? 'var(--p-cta-green)'

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  function getButtonStyle() {
    const base = {
      minHeight: 'var(--p-cta-min-height)',
      borderRadius: 'var(--p-radius-md)',
      padding: '0 var(--p-space-6)',
      fontSize: 'var(--p-cta-text-size)',
      fontWeight: 'var(--p-cta-text-weight)',
      lineHeight: 'var(--p-cta-text-lh)',
      width: '100%',
    }
    if (buttonStyle === 'outline') {
      return { ...base, border: '2px solid white', color: 'white', backgroundColor: 'transparent' }
    }
    if (buttonStyle === 'soft') {
      return { ...base, backgroundColor: 'rgba(255,255,255,0.2)', color: 'white' }
    }
    return { ...base, backgroundColor: ctaBase, color: '#ffffff' }
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
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full text-center text-white"
        style={{
          maxWidth: 'var(--p-maxw-card)',
          backgroundColor: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 'var(--p-radius-lg)',
          padding: 'var(--p-space-10)',
          boxShadow: 'var(--p-shadow-lg)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {labelText && (
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 'var(--p-eyebrow-weight)',
              letterSpacing: 'var(--p-eyebrow-ls)',
              color: 'rgba(255,255,255,0.6)',
              textTransform: 'uppercase',
              marginBottom: 'var(--p-space-3)',
            }}
          >
            {labelText}
          </p>
        )}
        {imageUrl && (
          <img
            src={imageUrl}
            alt=""
            className="mx-auto block"
            style={{ maxHeight: '180px', objectFit: 'contain', marginBottom: 'var(--p-space-4)' }}
          />
        )}
        <h1
          style={{
            fontSize: 'var(--p-h1-size)',
            fontWeight: 'var(--p-h1-weight)',
            lineHeight: 'var(--p-h1-lh)',
            letterSpacing: 'var(--p-h1-ls)',
            color: 'white',
            marginBottom: 'var(--p-space-2)',
          }}
        >
          {headline}
        </h1>
        <p
          style={{
            fontSize: 'var(--p-subtitle-size)',
            fontWeight: 'var(--p-subtitle-weight)',
            lineHeight: 'var(--p-subtitle-lh)',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 'var(--p-space-4)',
          }}
        >
          {subtitle}
        </p>
        {microcopy && (
          <p
            style={{
              fontSize: 'var(--p-micro-size)',
              lineHeight: 'var(--p-micro-lh)',
              letterSpacing: 'var(--p-micro-ls)',
              color: 'rgba(255,255,255,0.6)',
              marginBottom: 'var(--p-space-4)',
            }}
          >
            {microcopy}
          </p>
        )}
        <button
          type="button"
          onClick={handleCta}
          className="cursor-pointer transition-[filter] hover:brightness-90 active:brightness-75"
          style={getButtonStyle()}
        >
          {ctaText}
        </button>
        {disclaimer && (
          <p
            style={{
              fontSize: 'var(--p-micro-size)',
              lineHeight: 'var(--p-micro-lh)',
              letterSpacing: 'var(--p-micro-ls)',
              color: 'rgba(255,255,255,0.4)',
              marginTop: 'var(--p-space-4)',
            }}
          >
            {disclaimer}
          </p>
        )}
      </div>
    </div>
  )
}

registerTemplate('app-ad-fullscreen', AppAdFullscreen)

export default AppAdFullscreen
