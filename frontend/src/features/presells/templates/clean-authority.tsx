import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function StarRating({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color, fontSize: '20px', lineHeight: 1 }}>★</span>
      ))}
    </div>
  )
}

function CleanAuthority({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, settings } = presell

  const theme = presell.theme ?? {}
  const colors = {
    primary:    theme.primary    ?? '#2563eb',
    secondary:  theme.secondary  ?? '#1e293b',
    background: theme.background ?? '#ffffff',
    surface:    theme.surface    ?? '#f8fafc',
    textColor:  theme.textColor  ?? '#0f172a',
  }

  const labelText   = (settings.label_text as string | undefined) || 'OFERTA OFICIAL'
  const showRating  = settings.show_rating !== false && settings.show_rating !== 'false'
  const ratingCount = settings.rating_count as string | undefined
  const disclaimer  = settings.disclaimer as string | undefined

  const showGuarantee = settings.show_guarantee === 'true' || settings.show_guarantee === true
  const guaranteeTitle = (settings.guarantee_title as string | undefined) || 'Garantia de 30 dias'
  const guaranteeText = (settings.guarantee_text as string | undefined) || 'Se não ficar satisfeito, devolvemos 100% do seu dinheiro.'

  const showBonus = settings.show_bonus === 'true' || settings.show_bonus === true
  const bonusTitle = (settings.bonus_title as string | undefined) || 'Bônus Exclusivos'
  const bonusItems = ((settings.bonus_items as string | undefined) || '').split('\n').filter(line => line.trim() !== '')

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: colors.background,
        paddingBottom: 'calc(var(--p-cta-min-height) + var(--p-space-8))',
      }}
    >
      {/* Content */}
      <div
        style={{
          maxWidth: 'var(--p-maxw-card)',
          margin: '0 auto',
          padding: 'var(--p-space-8) var(--p-space-4) var(--p-space-4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        {/* Top label */}
        {labelText && (
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 'var(--p-eyebrow-weight)',
              letterSpacing: '0.14em',
              color: colors.primary,
              textTransform: 'uppercase',
              marginBottom: 'var(--p-space-3)',
            }}
          >
            {labelText}
          </p>
        )}

        {/* Circular product image or placeholder */}
        <div
          style={{
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            overflow: 'hidden',
            marginBottom: 'var(--p-space-5)',
            backgroundColor: imageUrl ? 'transparent' : colors.primary,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                fontSize: '64px',
                lineHeight: 1,
                color: 'rgba(255,255,255,0.8)',
                userSelect: 'none',
              }}
            >
              ✦
            </span>
          )}
        </div>

        {/* Star rating */}
        {showRating && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--p-space-2)',
              marginBottom: 'var(--p-space-5)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <StarRating color={colors.primary} />
            {ratingCount && (
              <span
                style={{
                  fontSize: 'var(--p-micro-size)',
                  fontWeight: 600,
                  color: 'var(--p-muted)',
                }}
              >
                {ratingCount}
              </span>
            )}
          </div>
        )}

        {/* Headline */}
        <h1
          style={{
            fontSize: 'var(--p-h1-size)',
            fontWeight: 'var(--p-h1-weight)',
            lineHeight: 'var(--p-h1-lh)',
            letterSpacing: 'var(--p-h1-ls)',
            color: colors.secondary,
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
            marginBottom: 'var(--p-space-6)',
          }}
        >
          {subtitle}
        </p>

        {/* Bônus */}
        {showBonus && bonusItems.length > 0 && (
          <div
            style={{
              width: '100%',
              borderRadius: 'var(--p-radius-md)',
              border: `1px solid ${colors.primary}33`,
              backgroundColor: colors.surface,
              padding: 'var(--p-space-4)',
              marginBottom: 'var(--p-space-5)',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: 'var(--p-subtitle-size)',
                fontWeight: 700,
                color: colors.secondary,
                marginBottom: 'var(--p-space-3)',
                textAlign: 'center',
              }}
            >
              {bonusTitle}
            </p>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--p-space-2)',
              }}
            >
              {bonusItems.map((item, i) => (
                <li
                  key={i}
                  className="flex items-start"
                  style={{
                    gap: 'var(--p-space-2)',
                    fontSize: 'var(--p-body-size)',
                    lineHeight: 'var(--p-body-lh)',
                    color: colors.textColor,
                  }}
                >
                  <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>⭐</span>
                  <span>{item.trim()}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Garantia */}
        {showGuarantee && (
          <div
            style={{
              width: '100%',
              borderRadius: 'var(--p-radius-md)',
              border: '1px solid var(--p-line)',
              backgroundColor: colors.surface,
              padding: 'var(--p-space-4)',
              marginBottom: 'var(--p-space-5)',
              textAlign: 'center',
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{ gap: 'var(--p-space-2)', marginBottom: 'var(--p-space-2)' }}
            >
              <span style={{ fontSize: '24px', lineHeight: 1 }}>🛡️</span>
              <p
                style={{
                  fontSize: 'var(--p-subtitle-size)',
                  fontWeight: 700,
                  color: colors.secondary,
                }}
              >
                {guaranteeTitle}
              </p>
            </div>
            <p
              style={{
                fontSize: 'var(--p-body-size)',
                lineHeight: 'var(--p-body-lh)',
                color: colors.textColor,
              }}
            >
              {guaranteeText}
            </p>
          </div>
        )}

        {/* Full-width CTA button */}
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
            color: '#ffffff',
            width: '100%',
            marginBottom: 'var(--p-space-6)',
          }}
        >
          {ctaText}
        </button>

        {/* Disclaimer */}
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
  )
}

registerTemplate('clean-authority', CleanAuthority)

export default CleanAuthority
