import { useState, useEffect } from 'react'
import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  return `${r},${g},${b}`
}

function usePersistedCountdown(slug: string, hours: number, enabled: boolean) {
  const key = `presell-cd-${slug}`

  const [remaining, setRemaining] = useState(() => {
    if (!enabled || hours <= 0) return 0
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const diff = Math.floor((parseInt(stored, 10) - Date.now()) / 1000)
        if (diff > 0) return diff
        return 0
      }
    } catch {}
    const endTime = Date.now() + hours * 3600 * 1000
    try { localStorage.setItem(key, String(endTime)) } catch {}
    return hours * 3600
  })

  useEffect(() => {
    if (remaining === 0) return
    const id = setInterval(() => setRemaining(prev => Math.max(0, prev - 1)), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    hours: Math.floor(remaining / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
  }
}

function CdBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          backgroundColor: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '6px',
          padding: '6px 10px',
          fontSize: '22px',
          fontWeight: 800,
          lineHeight: 1,
          minWidth: '48px',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.02em',
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <p
        style={{
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          marginTop: '4px',
        }}
      >
        {label}
      </p>
    </div>
  )
}

function OfertaBlack({ presell }: TemplateComponentProps) {
  const {
    headline, subtitle, ctaText, affiliateUrl, slug,
    trackingParam, imageUrl, backgroundImageUrl, settings,
  } = presell

  const theme = presell.theme ?? {}
  const colors = {
    primary:    theme.primary    ?? '#c9a227',
    secondary:  theme.secondary  ?? '#ffffff',
    background: theme.background ?? '#0d0d0d',
    surface:    theme.surface    ?? '#1a1a1a',
    textColor:  theme.textColor  ?? '#e5e5e5',
  }

  const showCountdown   = settings.show_countdown !== false && settings.show_countdown !== 'false'
  const countdownLabel  = (settings.countdown_label as string | undefined) ?? 'A CONDIÇÃO TERMINA EM'
  const countdownHours  = Number(settings.countdown_hours) || 24
  const originalPrice   = settings.original_price as string | undefined
  const salePrice       = settings.sale_price as string | undefined
  const scarcityText    = settings.scarcity_text as string | undefined
  const overlayStrength = (settings.overlay_strength as number | undefined) ?? 0.75
  const disclaimer      = settings.disclaimer as string | undefined

  const ageGateEnabled     = settings.age_gate_enabled === true || settings.age_gate_enabled === 'true'
  const ageGateTitle       = (settings.age_gate_title as string | undefined) ?? 'Verificação de Idade'
  const ageGateDescription = (settings.age_gate_description as string | undefined) ?? 'Este conteúdo é destinado exclusivamente a maiores de 18 anos.'
  const ageGateConfirmText = (settings.age_gate_confirm_text as string | undefined) ?? 'Declaro que possuo mais de 18 anos'

  const [ageConfirmed, setAgeConfirmed] = useState(false)

  const countdown = usePersistedCountdown(slug, countdownHours, showCountdown)

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  if (ageGateEnabled && !ageConfirmed) {
    return (
      <div
        style={{
          minHeight: '100dvh',
          backgroundColor: colors.background,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 var(--p-space-4)',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 'var(--p-maxw-card)',
            backgroundColor: colors.surface,
            border: `1px solid rgba(${hexToRgb(colors.primary)}, 0.35)`,
            borderRadius: 'var(--p-radius-lg)',
            padding: 'var(--p-space-8) var(--p-space-6)',
            textAlign: 'center',
          }}
        >
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: colors.primary,
              textTransform: 'uppercase',
              marginBottom: 'var(--p-space-4)',
            }}
          >
            {ageGateTitle}
          </p>
          <p
            style={{
              fontSize: 'var(--p-body-size)',
              lineHeight: 'var(--p-body-lh)',
              color: colors.textColor,
              marginBottom: 'var(--p-space-8)',
            }}
          >
            {ageGateDescription}
          </p>
          <button
            type="button"
            onClick={() => setAgeConfirmed(true)}
            className="w-full cursor-pointer uppercase tracking-wider transition-[filter] hover:brightness-90 active:brightness-75"
            style={{
              backgroundColor: colors.primary,
              minHeight: 'var(--p-cta-min-height)',
              borderRadius: 'var(--p-radius-md)',
              fontSize: 'var(--p-cta-text-size)',
              fontWeight: 'var(--p-cta-text-weight)',
              lineHeight: 'var(--p-cta-text-lh)',
              color: colors.background,
            }}
          >
            {ageGateConfirmText}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative"
      style={{
        minHeight: '100dvh',
        backgroundColor: colors.background,
        paddingBottom: 'calc(var(--p-cta-min-height) + var(--p-space-8))',
      }}
    >
      {backgroundImageUrl && (
        <>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${backgroundImageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            className="oferta-black-overlay absolute inset-0"
            style={{ backgroundColor: `rgba(0,0,0,${overlayStrength})` }}
          />
        </>
      )}

      <div className="relative" style={{ maxWidth: 'var(--p-maxw-card)', margin: '0 auto' }}>
        {/* Header */}
        <div
          className="flex items-center justify-center"
          style={{
            padding: 'var(--p-space-4) var(--p-space-4) var(--p-space-3)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            gap: 'var(--p-space-2)',
          }}
        >
          <span
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: colors.primary,
              flexShrink: 0,
            }}
          />
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 700,
              letterSpacing: '0.14em',
              color: colors.primary,
              textTransform: 'uppercase',
            }}
          >
            OFERTA OFICIAL
          </p>
        </div>

        <div style={{ padding: '0 var(--p-space-4)' }}>
          {/* Countdown */}
          {showCountdown && (
            <div
              className="oferta-black-countdown flex items-center justify-between"
              style={{
                backgroundColor: colors.surface,
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 'var(--p-radius-md)',
                padding: 'var(--p-space-4)',
                margin: 'var(--p-space-4) 0',
              }}
            >
              <p
                style={{
                  fontSize: 'var(--p-micro-size)',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: 1.3,
                  maxWidth: '90px',
                }}
              >
                {countdownLabel}
              </p>
              <div className="flex" style={{ gap: 'var(--p-space-2)' }}>
                <CdBox value={countdown.hours} label="H" />
                <CdBox value={countdown.minutes} label="MIN" />
                <CdBox value={countdown.seconds} label="SEG" />
              </div>
            </div>
          )}

          {/* Product image */}
          <div
            style={{
              borderRadius: 'var(--p-radius-lg)',
              overflow: 'hidden',
              marginBottom: 'var(--p-space-5)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              aspectRatio: '4/3',
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
              <p
                style={{
                  fontSize: 'var(--p-micro-size)',
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.2)',
                  textTransform: 'uppercase',
                  textAlign: 'center',
                }}
              >
                FOTO DO PRODUTO
              </p>
            )}
          </div>

          {/* Headline */}
          <h1
            className="oferta-black-headline"
            style={{
              fontSize: 'var(--p-h1-size)',
              fontWeight: 'var(--p-h1-weight)',
              lineHeight: 'var(--p-h1-lh)',
              letterSpacing: 'var(--p-h1-ls)',
              color: colors.secondary,
              textTransform: 'uppercase',
              marginBottom: 'var(--p-space-3)',
            }}
          >
            {headline}
          </h1>

          {/* Subtitle */}
          <p
            className="oferta-black-subtitle"
            style={{
              fontSize: 'var(--p-body-size)',
              fontWeight: 'var(--p-body-weight)',
              lineHeight: 'var(--p-body-lh)',
              color: colors.textColor,
              marginBottom: 'var(--p-space-5)',
            }}
          >
            {subtitle}
          </p>

          {/* Pricing */}
          {(originalPrice || salePrice) && (
            <div style={{ marginBottom: 'var(--p-space-3)' }}>
              <div className="flex items-baseline" style={{ gap: 'var(--p-space-3)' }}>
                {originalPrice && (
                  <span
                    className="oferta-black-original-price"
                    style={{
                      fontSize: 'var(--p-subtitle-size)',
                      color: 'rgba(255,255,255,0.35)',
                      textDecoration: 'line-through',
                    }}
                  >
                    {originalPrice}
                  </span>
                )}
                {salePrice && (
                  <span
                    className="oferta-black-sale-price"
                    style={{
                      fontSize: 'clamp(28px, 8vw, 40px)',
                      fontWeight: 800,
                      color: colors.secondary,
                      lineHeight: 1,
                    }}
                  >
                    {salePrice}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Scarcity */}
          {scarcityText && (
            <div
              className="oferta-black-scarcity flex items-center"
              style={{ gap: 'var(--p-space-2)', marginBottom: 'var(--p-space-6)' }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: colors.primary,
                  flexShrink: 0,
                }}
              />
              <p style={{ fontSize: 'var(--p-micro-size)', fontWeight: 600, color: colors.primary }}>
                {scarcityText}
              </p>
            </div>
          )}

          {/* Disclaimer */}
          {disclaimer && (
            <p
              className="oferta-black-disclaimer"
              style={{
                fontSize: 'var(--p-micro-size)',
                lineHeight: 'var(--p-micro-lh)',
                color: 'rgba(255,255,255,0.25)',
                textAlign: 'center',
                marginTop: 'var(--p-space-4)',
              }}
            >
              {disclaimer}
            </p>
          )}
        </div>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{
          padding: 'var(--p-space-3) var(--p-space-4)',
          backgroundColor: colors.background,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
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
          }}
        >
          {ctaText}
        </button>
      </div>
    </div>
  )
}

registerTemplate('oferta-black', OfertaBlack)

export default OfertaBlack
