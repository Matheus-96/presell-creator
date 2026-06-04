import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'

import '@/features/presells/templates/index.ts'

function makePresell(overrides: Partial<PresellPublicData> = {}): PresellPublicData {
  return {
    id: 1,
    slug: 'test-slug',
    templateId: 'offer-modal',
    headline: 'Headline Test',
    subtitle: 'Subtitle Test',
    body: 'Body text',
    bullets: ['Benefit one', 'Benefit two'],
    ctaText: 'Buy Now',
    affiliateUrl: 'https://affiliate.example.com',
    googlePixelId: null,
    trackingParam: 'gclid',
    imageUrl: null,
    backgroundImageUrl: null,
    settings: {},
    ...overrides,
  }
}

const FALLBACK_PRIMARY = '#6366f1'
const FALLBACK_BACKGROUND = '#ffffff'

const CUSTOM_THEME = {
  primary: '#ff0000',
  secondary: '#00ff00',
  background: '#0000ff',
  surface: '#ffff00',
  textColor: '#ff00ff',
}

/** Normalize a hex color like #rrggbb to the rgb(...) string jsdom reports. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgb(${r}, ${g}, ${b})`
}

function expectColor(actual: string, hex: string) {
  const expected = hexToRgb(hex)
  expect(actual === hex || actual === expected).toBe(true)
}

describe('Template registration', () => {
  it('getTemplate("offer-modal") returns a component after import', () => {
    expect(getTemplate('offer-modal')).not.toBeNull()
  })

  it('getTemplate("app-ad") returns a component after import', () => {
    expect(getTemplate('app-ad')).not.toBeNull()
  })

  it('getTemplate("app-ad-fullscreen") returns a component after import', () => {
    expect(getTemplate('app-ad-fullscreen')).not.toBeNull()
  })

  it('getTemplate("device-frame") returns a component after import', () => {
    expect(getTemplate('device-frame')).not.toBeNull()
  })

  it('getTemplate("urgent-offer") returns a component after import', () => {
    expect(getTemplate('urgent-offer')).not.toBeNull()
  })
})

describe('offer-modal render', () => {
  it('renders the presell headline', () => {
    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ headline: 'Headline Test' })} />)
    expect(screen.getByText('Headline Test')).toBeDefined()
  })

  it('renders the CTA button with presell.ctaText', () => {
    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ ctaText: 'Get It Now' })} />)
    expect(screen.getByRole('button', { name: 'Get It Now' })).toBeDefined()
  })

  it('clicking CTA fires beacon to /api/public/presells/:slug/redirect', async () => {
    const mockBeacon = vi.fn().mockReturnValue(true)
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: mockBeacon })

    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })

    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ slug: 'test-slug', ctaText: 'Buy Now' })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Buy Now' }))

    expect(mockBeacon).toHaveBeenCalledWith('/api/public/presells/test-slug/redirect')

    vi.unstubAllGlobals()
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
  })

  it('uses fallback primary color on CTA button when theme is null', () => {
    const OfferModal = getTemplate('offer-modal')!
    const { container } = render(<OfferModal presell={makePresell({ theme: null })} />)
    const btn = container.querySelector('button')!
    expectColor(btn.style.backgroundColor, FALLBACK_PRIMARY)
  })

  it('applies custom theme primary to CTA button', () => {
    const OfferModal = getTemplate('offer-modal')!
    const { container } = render(<OfferModal presell={makePresell({ theme: CUSTOM_THEME })} />)
    const btn = container.querySelector('button')!
    expectColor(btn.style.backgroundColor, CUSTOM_THEME.primary)
  })

  it('applies custom theme surface to modal card background', () => {
    const OfferModal = getTemplate('offer-modal')!
    const { container } = render(<OfferModal presell={makePresell({ theme: CUSTOM_THEME })} />)
    // the modal card is the inner z-10 div
    const card = container.querySelector('.relative.z-10') as HTMLElement
    expectColor(card.style.backgroundColor, CUSTOM_THEME.surface)
  })
})

describe('app-ad render', () => {
  it('renders headline and label_text from settings', () => {
    const AppAd = getTemplate('app-ad')!
    render(
      <AppAd
        presell={makePresell({
          templateId: 'app-ad',
          headline: 'App Headline',
          settings: { label_text: 'Special Offer' },
        })}
      />,
    )
    expect(screen.getByText('App Headline')).toBeDefined()
    expect(screen.getByText('Special Offer')).toBeDefined()
  })

  it('uses fallback background color on page when theme is null', () => {
    const AppAd = getTemplate('app-ad')!
    const { container } = render(<AppAd presell={makePresell({ templateId: 'app-ad', theme: null })} />)
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, FALLBACK_BACKGROUND)
  })

  it('applies custom theme background to page', () => {
    const AppAd = getTemplate('app-ad')!
    const { container } = render(<AppAd presell={makePresell({ templateId: 'app-ad', theme: CUSTOM_THEME })} />)
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, CUSTOM_THEME.background)
  })

  it('applies custom theme primary to CTA button', () => {
    const AppAd = getTemplate('app-ad')!
    const { container } = render(<AppAd presell={makePresell({ templateId: 'app-ad', theme: CUSTOM_THEME })} />)
    const btn = container.querySelector('button')!
    expectColor(btn.style.backgroundColor, CUSTOM_THEME.primary)
  })
})

describe('app-ad-fullscreen render', () => {
  it('renders headline', () => {
    const AppAdFullscreen = getTemplate('app-ad-fullscreen')!
    render(
      <AppAdFullscreen presell={makePresell({ templateId: 'app-ad-fullscreen', headline: 'FS Headline' })} />,
    )
    expect(screen.getByText('FS Headline')).toBeDefined()
  })

  it('uses fallback background on page when theme is null', () => {
    const AppAdFullscreen = getTemplate('app-ad-fullscreen')!
    const { container } = render(
      <AppAdFullscreen presell={makePresell({ templateId: 'app-ad-fullscreen', theme: null })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, FALLBACK_BACKGROUND)
  })

  it('applies custom theme background to page', () => {
    const AppAdFullscreen = getTemplate('app-ad-fullscreen')!
    const { container } = render(
      <AppAdFullscreen presell={makePresell({ templateId: 'app-ad-fullscreen', theme: CUSTOM_THEME })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, CUSTOM_THEME.background)
  })

  it('applies custom theme primary to CTA button', () => {
    const AppAdFullscreen = getTemplate('app-ad-fullscreen')!
    const { container } = render(
      <AppAdFullscreen presell={makePresell({ templateId: 'app-ad-fullscreen', theme: CUSTOM_THEME })} />,
    )
    const btn = container.querySelector('button')!
    expectColor(btn.style.backgroundColor, CUSTOM_THEME.primary)
  })
})

describe('device-frame render', () => {
  it('renders headline, bullets and top_bar_text', () => {
    const DeviceFrame = getTemplate('device-frame')!
    render(
      <DeviceFrame
        presell={makePresell({
          templateId: 'device-frame',
          headline: 'Device Headline',
          bullets: ['First bullet', 'Second bullet'],
          settings: { top_bar_text: 'https://example.com' },
        })}
      />,
    )
    expect(screen.getByText('Device Headline')).toBeDefined()
    expect(screen.getByText('First bullet')).toBeDefined()
    expect(screen.getByText('Second bullet')).toBeDefined()
    expect(screen.getByText('https://example.com')).toBeDefined()
  })

  it('uses fallback background color on page when theme is null', () => {
    const DeviceFrame = getTemplate('device-frame')!
    const { container } = render(
      <DeviceFrame presell={makePresell({ templateId: 'device-frame', theme: null })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, FALLBACK_BACKGROUND)
  })

  it('applies custom theme background to page', () => {
    const DeviceFrame = getTemplate('device-frame')!
    const { container } = render(
      <DeviceFrame presell={makePresell({ templateId: 'device-frame', theme: CUSTOM_THEME })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, CUSTOM_THEME.background)
  })

  it('applies custom theme primary to top bar', () => {
    const DeviceFrame = getTemplate('device-frame')!
    const { container } = render(
      <DeviceFrame presell={makePresell({ templateId: 'device-frame', theme: CUSTOM_THEME })} />,
    )
    const bar = container.querySelector('[data-testid="device-top-bar"]') as HTMLElement
    expectColor(bar.style.backgroundColor, CUSTOM_THEME.primary)
  })
})

describe('oferta-black render', () => {

  it('getTemplate("oferta-black") returns a component', () => {
    expect(getTemplate('oferta-black')).not.toBeNull()
  })

  it('renders headline and CTA normally when age_gate_enabled is false', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          headline: 'Oferta Black Headline',
          ctaText: 'Comprar Agora',
          settings: { age_gate_enabled: false },
        })}
      />,
    )
    expect(screen.getByText('Oferta Black Headline')).toBeDefined()
    expect(screen.getByRole('button', { name: /comprar agora/i })).toBeDefined()
  })

  it('renders headline and CTA normally when age_gate_enabled is absent', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({ templateId: 'oferta-black', headline: 'Sem Gate' })}
      />,
    )
    expect(screen.getByText('Sem Gate')).toBeDefined()
  })

  it('hides presell content and shows gate when age_gate_enabled is true', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          headline: 'Conteúdo Bloqueado',
          settings: { age_gate_enabled: true },
        })}
      />,
    )
    expect(screen.queryByText('Conteúdo Bloqueado')).toBeNull()
    expect(screen.getByText('Verificação de Idade')).toBeDefined()
  })

  it('shows default gate texts when no custom texts are provided', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({ templateId: 'oferta-black', settings: { age_gate_enabled: true } })}
      />,
    )
    expect(screen.getByText('Verificação de Idade')).toBeDefined()
    expect(screen.getByText('Este conteúdo é destinado exclusivamente a maiores de 18 anos.')).toBeDefined()
    expect(screen.getByRole('button', { name: /declaro que possuo mais de 18 anos/i })).toBeDefined()
  })

  it('shows custom texts from settings', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          settings: {
            age_gate_enabled: true,
            age_gate_title: 'Age Verification',
            age_gate_description: 'You must be 18+ to view this content.',
            age_gate_confirm_text: 'I am 18 or older',
          },
        })}
      />,
    )
    expect(screen.getByText('Age Verification')).toBeDefined()
    expect(screen.getByText('You must be 18+ to view this content.')).toBeDefined()
    expect(screen.getByRole('button', { name: /i am 18 or older/i })).toBeDefined()
  })

  it('age_gate_enabled as string "true" also triggers gate', () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          headline: 'Headline Oculta',
          settings: { age_gate_enabled: 'true' },
        })}
      />,
    )
    expect(screen.queryByText('Headline Oculta')).toBeNull()
    expect(screen.getByText('Verificação de Idade')).toBeDefined()
  })

  it('reveals presell content after clicking the confirm button', async () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          headline: 'Headline Revelada',
          ctaText: 'Garantir Oferta',
          settings: { age_gate_enabled: true },
        })}
      />,
    )
    expect(screen.queryByText('Headline Revelada')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /declaro que possuo mais de 18 anos/i }))

    expect(screen.getByText('Headline Revelada')).toBeDefined()
  })

  it('gate is not shown after confirmation — CTA button becomes the presell CTA', async () => {
    const OfertaBlack = getTemplate('oferta-black')!
    render(
      <OfertaBlack
        presell={makePresell({
          templateId: 'oferta-black',
          ctaText: 'Garantir Oferta',
          settings: {
            age_gate_enabled: true,
            age_gate_confirm_text: 'Confirmar Idade',
          },
        })}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /confirmar idade/i }))

    expect(screen.queryByRole('button', { name: /confirmar idade/i })).toBeNull()
    expect(screen.getByRole('button', { name: /garantir oferta/i })).toBeDefined()
  })
})

describe('urgent-offer render', () => {
  it('renders headline', () => {
    const UrgentOffer = getTemplate('urgent-offer')!
    render(<UrgentOffer presell={makePresell({ templateId: 'urgent-offer', headline: 'Urgent Headline' })} />)
    expect(screen.getByText('Urgent Headline')).toBeDefined()
  })

  it('uses fallback background color on page when theme is null', () => {
    const UrgentOffer = getTemplate('urgent-offer')!
    const { container } = render(
      <UrgentOffer presell={makePresell({ templateId: 'urgent-offer', theme: null })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, FALLBACK_BACKGROUND)
  })

  it('applies custom theme background to page', () => {
    const UrgentOffer = getTemplate('urgent-offer')!
    const { container } = render(
      <UrgentOffer presell={makePresell({ templateId: 'urgent-offer', theme: CUSTOM_THEME })} />,
    )
    const root = container.firstElementChild as HTMLElement
    expectColor(root.style.backgroundColor, CUSTOM_THEME.background)
  })

  it('applies custom theme primary to CTA button', () => {
    const UrgentOffer = getTemplate('urgent-offer')!
    const { container } = render(
      <UrgentOffer presell={makePresell({ templateId: 'urgent-offer', theme: CUSTOM_THEME })} />,
    )
    // sticky CTA is last button
    const buttons = container.querySelectorAll('button')
    const btn = buttons[buttons.length - 1] as HTMLElement
    expectColor(btn.style.backgroundColor, CUSTOM_THEME.primary)
  })
})
