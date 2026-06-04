import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function DiscreetConfidential({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, settings } = presell

  const theme = presell.theme ?? {}
  const colors = {
    primary:    theme.primary    ?? '#c9a84c',
    secondary:  theme.secondary  ?? '#ffffff',
    background: theme.background ?? '#111111',
    surface:    theme.surface    ?? '#1c1c1c',
    textColor:  theme.textColor  ?? '#e5e5e5',
  }

  const brandName  = (settings.brand_name as string | undefined) || ''
  const topBarText = (settings.top_bar_text as string | undefined) || 'OFERTA OFICIAL'
  const badgesRaw  = (settings.badges as string | undefined) ?? '📦 EMBALAGEM DISCRETA\n🛡️ COMPRA PROTEGIDA\n🚚 ENTREGA SIGILOSA'
  const badges     = badgesRaw.split('\n').map(l => l.trim()).filter(Boolean)
  const disclaimer = settings.disclaimer as string | undefined

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: colors.background,
        paddingBottom: 'calc(var(--p-cta-min-height) + var(--p-space-8) + 3rem)',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--p-maxw-card)',
          margin: '0 auto',
          padding: 'var(--p-space-6) var(--p-space-4) var(--p-space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Header: lock icon + brand name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--p-space-2)',
            marginBottom: 'var(--p-space-4)',
          }}
        >
          <span style={{ fontSize: '18px', lineHeight: 1 }}>🔒</span>
          {brandName && (
            <p
              style={{
                fontSize: 'var(--p-eyebrow-size)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: colors.secondary,
                textTransform: 'uppercase',
              }}
            >
              {brandName}
            </p>
          )}
        </div>

        {/* Top badge */}
        {topBarText && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: `1px solid ${colors.primary}`,
              borderRadius: '999px',
              padding: '4px 14px',
              marginBottom: 'var(--p-space-6)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                flexShrink: 0,
              }}
            />
            <p
              style={{
                fontSize: 'var(--p-eyebrow-size)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                color: colors.primary,
                textTransform: 'uppercase',
              }}
            >
              {topBarText}
            </p>
          </div>
        )}

        {/* Product image */}
        <div
          style={{
            width: '100%',
            aspectRatio: '4/3',
            borderRadius: 'var(--p-radius-lg)',
            overflow: 'hidden',
            marginBottom: 'var(--p-space-6)',
            backgroundColor: colors.surface,
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'var(--p-h1-size)',
            fontWeight: 'var(--p-h1-weight)',
            lineHeight: 'var(--p-h1-lh)',
            letterSpacing: 'var(--p-h1-ls)',
            color: colors.secondary,
            textAlign: 'center',
            marginBottom: 'var(--p-space-4)',
          }}
        >
          {headline}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 'var(--p-body-size)',
            fontWeight: 'var(--p-body-weight)',
            lineHeight: 'var(--p-body-lh)',
            color: colors.textColor,
            textAlign: 'center',
            marginBottom: 'var(--p-space-6)',
          }}
        >
          {subtitle}
        </p>

        {/* Trust badges */}
        {badges.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 'var(--p-space-3)',
              width: '100%',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {badges.map((badge, i) => {
              const spaceIdx = badge.indexOf(' ')
              const emoji = spaceIdx !== -1 ? badge.slice(0, spaceIdx) : badge
              const text  = spaceIdx !== -1 ? badge.slice(spaceIdx + 1) : ''
              return (
                <div
                  key={i}
                  style={{
                    flex: '1 1 0',
                    minWidth: '72px',
                    backgroundColor: colors.surface,
                    borderRadius: 'var(--p-radius-md)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    padding: 'var(--p-space-3) var(--p-space-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 'var(--p-space-2)',
                    textAlign: 'center',
                  }}
                >
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{emoji}</span>
                  <p
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: colors.textColor,
                      textTransform: 'uppercase',
                      lineHeight: 1.3,
                    }}
                  >
                    {text}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Fixed CTA bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 'var(--p-space-4)',
          backgroundColor: colors.background,
          borderTop: '1px solid rgba(255,255,255,0.06)',
          zIndex: 50,
        }}
      >
        <div style={{ maxWidth: 'var(--p-maxw-card)', margin: '0 auto' }}>
          <button
            type="button"
            data-presell-cta=""
            onClick={handleCta}
            className="w-full cursor-pointer uppercase tracking-wider transition-[filter] hover:brightness-90 active:brightness-75"
            style={{
              backgroundColor: colors.primary,
              minHeight: 'var(--p-cta-min-height)',
              borderRadius: 'var(--p-radius-md)',
              fontSize: 'var(--p-cta-text-size)',
              fontWeight: 'var(--p-cta-text-weight)',
              lineHeight: 'var(--p-cta-text-lh)',
              color: colors.background,
              width: '100%',
              marginBottom: disclaimer ? 'var(--p-space-3)' : undefined,
            }}
          >
            {ctaText}
          </button>
          {disclaimer && (
            <p
              style={{
                fontSize: 'var(--p-micro-size)',
                lineHeight: 'var(--p-micro-lh)',
                color: 'var(--p-muted)',
                textAlign: 'center',
              }}
            >
              {disclaimer}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

registerTemplate('discreto-confidencial', DiscreetConfidential)

export default DiscreetConfidential
