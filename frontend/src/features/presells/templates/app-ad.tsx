import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function AppAd({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, settings } = presell

  const theme = presell.theme ?? {}
  const colors = {
    primary:    theme.primary    ?? '#6366f1',
    secondary:  theme.secondary  ?? '#1e293b',
    background: theme.background ?? '#ffffff',
    surface:    theme.surface    ?? '#f8fafc',
    textColor:  theme.textColor  ?? '#0f172a',
  }

  const labelText = settings.label_text as string | undefined
  const microcopy = settings.microcopy as string | undefined
  const disclaimer = settings.disclaimer as string | undefined
  const buttonStyle = (settings.button_style as string | undefined) ?? 'solid'

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
      return { ...base, border: `2px solid ${colors.primary}`, color: colors.primary, backgroundColor: 'transparent' }
    }
    if (buttonStyle === 'soft') {
      return { ...base, backgroundColor: `color-mix(in srgb, ${colors.primary} 15%, transparent)`, color: colors.primary }
    }
    return { ...base, backgroundColor: colors.primary, color: '#ffffff' }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: colors.background }}>
      <div
        className="w-full text-center"
        style={{
          maxWidth: 'var(--p-maxw-card)',
          backgroundColor: colors.surface,
          border: '1px solid var(--p-line)',
          borderRadius: 'var(--p-radius-lg)',
          padding: 'var(--p-space-10)',
          boxShadow: 'var(--p-shadow-sm)',
        }}
      >
        {labelText && (
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 'var(--p-eyebrow-weight)',
              letterSpacing: 'var(--p-eyebrow-ls)',
              color: colors.primary,
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
            color: colors.textColor,
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
            color: colors.textColor,
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
              color: 'var(--p-muted)',
              marginBottom: 'var(--p-space-4)',
            }}
          >
            {microcopy}
          </p>
        )}
        <button
          type="button"
          data-presell-cta=""
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
              color: 'var(--p-muted)',
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

registerTemplate('app-ad', AppAd)

export default AppAd
