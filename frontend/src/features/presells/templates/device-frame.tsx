import { handlePresellCta } from '../lib/presell-cta.ts'
import { registerTemplate } from './registry.ts'
import type { TemplateComponentProps } from './types.ts'

function DeviceFrame({ presell }: TemplateComponentProps) {
  const { headline, subtitle, ctaText, affiliateUrl, slug, trackingParam, imageUrl, bullets, settings } = presell

  const theme = presell.theme ?? {}
  const colors = {
    primary:    theme.primary    ?? '#6366f1',
    secondary:  theme.secondary  ?? '#1e293b',
    background: theme.background ?? '#ffffff',
    surface:    theme.surface    ?? '#f8fafc',
    textColor:  theme.textColor  ?? '#0f172a',
  }

  const topBarText = settings.top_bar_text as string | undefined
  const offerNote = settings.offer_note as string | undefined
  const footerLeftText = settings.footer_left_text as string | undefined
  const footerRightText = settings.footer_right_text as string | undefined
  const frameType = settings.frame_type as string | undefined

  const isPhone = frameType === 'phone'

  function handleCta() {
    handlePresellCta(slug, affiliateUrl, trackingParam)
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ backgroundColor: colors.background, padding: 'var(--p-space-6)' }}
    >
      <div
        className="w-full overflow-hidden"
        style={{
          maxWidth: isPhone ? 'var(--p-maxw-card)' : 'var(--p-maxw-layout)',
          border: '1px solid var(--p-line)',
          borderRadius: 'var(--p-radius-lg)',
          backgroundColor: colors.surface,
          boxShadow: 'var(--p-shadow-md)',
        }}
      >
        {/* Browser/phone top bar */}
        <div
          data-testid="device-top-bar"
          className="flex items-center gap-2"
          style={{ backgroundColor: colors.primary, padding: 'var(--p-space-3) var(--p-space-4)' }}
        >
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-yellow-400" />
          <span className="h-3 w-3 rounded-full bg-green-400" />
          {topBarText && (
            <span
              className="ml-3 flex-1"
              style={{
                backgroundColor: 'var(--p-panel)',
                borderRadius: 'var(--p-radius-sm)',
                padding: '2px var(--p-space-3)',
                fontSize: 'var(--p-micro-size)',
                color: 'var(--p-muted)',
              }}
            >
              {topBarText}
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: 'var(--p-space-6)' }}>
          {/* Eyebrow + Headline — always full width */}
          <div style={{ marginBottom: 'var(--p-space-5)' }}>
            {offerNote && (
              <p
                style={{
                  fontSize: 'var(--p-eyebrow-size)',
                  fontWeight: 'var(--p-eyebrow-weight)',
                  letterSpacing: 'var(--p-eyebrow-ls)',
                  color: 'var(--p-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 'var(--p-space-2)',
                }}
              >
                {offerNote}
              </p>
            )}
            <h1
              style={{
                fontSize: 'var(--p-h1-size)',
                fontWeight: 'var(--p-h1-weight)',
                lineHeight: 'var(--p-h1-lh)',
                letterSpacing: 'var(--p-h1-ls)',
                color: colors.textColor,
              }}
            >
              {headline}
            </h1>
          </div>

          {/* Body: image | subtitle + bullets + CTA */}
          <div className={imageUrl && !isPhone ? 'md:grid md:grid-cols-2 md:gap-[var(--p-space-8)]' : ''}>
            {imageUrl && (
              <div className="mb-[var(--p-space-5)] md:mb-0 flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt=""
                  style={{ maxHeight: '256px', width: '100%', objectFit: 'contain' }}
                />
              </div>
            )}
            <div>
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
                      style={{ gap: 'var(--p-space-2)', fontSize: 'var(--p-body-size)', lineHeight: 'var(--p-body-lh)', color: colors.textColor }}
                    >
                      <span style={{ marginTop: '0.125rem', color: colors.primary, flexShrink: 0 }}>✓</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                data-presell-cta=""
                onClick={handleCta}
                className="w-full cursor-pointer transition-[filter] hover:brightness-90 active:brightness-75"
                style={{
                  backgroundColor: colors.primary,
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
        </div>

        {/* Footer */}
        {(footerLeftText || footerRightText) && (
          <div
            className="flex items-center justify-between"
            style={{
              borderTop: '1px solid var(--p-line)',
              backgroundColor: colors.secondary,
              padding: 'var(--p-space-3) var(--p-space-6)',
              fontSize: 'var(--p-micro-size)',
              color: 'var(--p-muted)',
            }}
          >
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
