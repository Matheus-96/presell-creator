import { useState, useEffect } from 'react'
import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function useCountdown(initialMinutes: number) {
  const [remaining, setRemaining] = useState(() => Math.max(0, initialMinutes) * 60)

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

function DigitBox({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div
        style={{
          backgroundColor: 'var(--p-text)',
          color: '#ffffff',
          borderRadius: 'var(--p-radius-sm)',
          padding: 'var(--p-space-2) var(--p-space-3)',
          fontSize: '28px',
          fontWeight: 800,
          lineHeight: 1,
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {String(value).padStart(2, '0')}
      </div>
      <p
        style={{
          fontSize: 'var(--p-micro-size)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          color: 'var(--p-muted)',
          textTransform: 'uppercase',
          marginTop: 'var(--p-space-1)',
        }}
      >
        {label}
      </p>
    </div>
  )
}

function UrgentOffer({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, bullets, settings } = presell

  const topBarText = settings.top_bar_text as string | undefined
  const countdownMinutes = Number(settings.countdown_minutes) || 0
  const originalPrice = settings.original_price as string | undefined
  const currentPrice = settings.current_price as string | undefined
  const scarcityText = settings.scarcity_text as string | undefined
  const disclaimer = settings.disclaimer as string | undefined
  const ctaBase = (settings.cta_color as string | undefined) ?? 'var(--p-cta-green)'

  const countdown = useCountdown(countdownMinutes)

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--p-bg)',
        paddingBottom: 'calc(var(--p-cta-min-height) + var(--p-space-8))',
      }}
    >
      {/* Top bar */}
      {topBarText && (
        <div
          className="flex items-center justify-center gap-2"
          style={{ backgroundColor: ctaBase, padding: 'var(--p-space-3) var(--p-space-4)' }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255,255,255,0.6)',
              flexShrink: 0,
            }}
          />
          <p
            style={{
              fontSize: 'var(--p-eyebrow-size)',
              fontWeight: 'var(--p-eyebrow-weight)',
              letterSpacing: '0.12em',
              color: '#ffffff',
              textTransform: 'uppercase',
            }}
          >
            {topBarText}
          </p>
        </div>
      )}

      {/* Content */}
      <div
        style={{
          maxWidth: 'var(--p-maxw-card)',
          margin: '0 auto',
          padding: '0 var(--p-space-4)',
        }}
      >
        {/* Countdown */}
        {countdownMinutes > 0 && (
          <div
            className="flex items-center justify-between"
            style={{
              border: '1px solid var(--p-line)',
              borderRadius: 'var(--p-radius-md)',
              padding: 'var(--p-space-4)',
              margin: 'var(--p-space-5) 0',
              backgroundColor: 'var(--p-panel)',
            }}
          >
            <p
              style={{
                fontSize: 'var(--p-micro-size)',
                fontWeight: 700,
                color: ctaBase,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                lineHeight: 1.3,
                maxWidth: '80px',
              }}
            >
              A OFERTA TERMINA EM
            </p>
            <div className="flex" style={{ gap: 'var(--p-space-2)' }}>
              <DigitBox value={countdown.hours} label="Horas" />
              <DigitBox value={countdown.minutes} label="Min" />
              <DigitBox value={countdown.seconds} label="Seg" />
            </div>
          </div>
        )}

        {/* Product image */}
        {imageUrl && (
          <div
            style={{
              borderRadius: 'var(--p-radius-lg)',
              overflow: 'hidden',
              marginBottom: 'var(--p-space-5)',
              backgroundColor: 'var(--p-line)',
              aspectRatio: '4/3',
            }}
          >
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {/* Headline */}
        <h1
          style={{
            fontSize: 'var(--p-h1-size)',
            fontWeight: 'var(--p-h1-weight)',
            lineHeight: 'var(--p-h1-lh)',
            letterSpacing: 'var(--p-h1-ls)',
            color: 'var(--p-text)',
            marginBottom: 'var(--p-space-4)',
            marginTop: countdownMinutes > 0 ? 0 : 'var(--p-space-5)',
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
            color: 'var(--p-muted)',
            marginBottom: 'var(--p-space-5)',
          }}
        >
          {subtitle}
        </p>

        {/* Pricing */}
        {(originalPrice || currentPrice) && (
          <div style={{ marginBottom: 'var(--p-space-3)' }}>
            <div className="flex items-baseline" style={{ gap: 'var(--p-space-3)' }}>
              {originalPrice && (
                <span
                  style={{
                    fontSize: 'var(--p-subtitle-size)',
                    color: 'var(--p-muted)',
                    textDecoration: 'line-through',
                  }}
                >
                  {originalPrice}
                </span>
              )}
              {currentPrice && (
                <span
                  style={{
                    fontSize: 'clamp(28px, 8vw, 40px)',
                    fontWeight: 800,
                    color: ctaBase,
                    lineHeight: 1,
                  }}
                >
                  {currentPrice}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Scarcity */}
        {scarcityText && (
          <div className="flex items-center" style={{ gap: 'var(--p-space-2)', marginBottom: 'var(--p-space-5)' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--p-cta-orange)',
                flexShrink: 0,
              }}
            />
            <p style={{ fontSize: 'var(--p-micro-size)', fontWeight: 600, color: 'var(--p-cta-orange)' }}>
              {scarcityText}
            </p>
          </div>
        )}

        {/* Bullets */}
        {bullets.length > 0 && (
          <ul
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--p-space-3)',
              marginBottom: 'var(--p-space-6)',
            }}
          >
            {bullets.map((bullet, i) => (
              <li
                key={i}
                className="flex items-start"
                style={{
                  gap: 'var(--p-space-2)',
                  fontSize: 'var(--p-body-size)',
                  lineHeight: 'var(--p-body-lh)',
                  color: 'var(--p-text)',
                }}
              >
                <span style={{ color: ctaBase, flexShrink: 0, marginTop: '0.125rem' }}>✓</span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Disclaimer */}
        {disclaimer && (
          <p
            style={{
              fontSize: 'var(--p-micro-size)',
              lineHeight: 'var(--p-micro-lh)',
              color: 'var(--p-muted)',
              textAlign: 'center',
              marginTop: 'var(--p-space-6)',
            }}
          >
            {disclaimer}
          </p>
        )}
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0"
        style={{ padding: 'var(--p-space-3) var(--p-space-4)', backgroundColor: 'var(--p-bg)' }}
      >
        <button
          type="button"
          onClick={handleCta}
          className="w-full cursor-pointer uppercase tracking-wider transition-[filter] hover:brightness-90 active:brightness-75"
          style={{
            backgroundColor: ctaBase,
            minHeight: 'var(--p-cta-min-height)',
            borderRadius: 'var(--p-radius-md)',
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

registerTemplate('urgent-offer', UrgentOffer)

export default UrgentOffer
