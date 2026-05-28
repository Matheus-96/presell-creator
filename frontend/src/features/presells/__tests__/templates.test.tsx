import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { getTemplate } from '@/features/presells/templates/registry.ts'
import type { PresellPublicData } from '@/features/presells/templates/types.ts'

// Side-effect imports to register all templates
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
    imageUrl: null,
    backgroundImageUrl: null,
    settings: {},
    ...overrides,
  }
}

// --- Tests 5-8: Registration checks for remaining templates ---
describe('Template registration — all templates', () => {
  it('getTemplate("offer-modal") returns a component after import', () => {
    expect(getTemplate('offer-modal')).not.toBeNull()
  })

  // --- Test 5: app-ad ---
  it('getTemplate("app-ad") returns a component after import', () => {
    expect(getTemplate('app-ad')).not.toBeNull()
  })

  // --- Test 7: app-ad-fullscreen ---
  it('getTemplate("app-ad-fullscreen") returns a component after import', () => {
    expect(getTemplate('app-ad-fullscreen')).not.toBeNull()
  })

  // --- Test 8: device-frame ---
  it('getTemplate("device-frame") returns a component after import', () => {
    expect(getTemplate('device-frame')).not.toBeNull()
  })
})

// --- Test 6: Render app-ad ---
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
})

// --- Test 9: Render device-frame ---
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
})

// --- Test 1: Registration offer-modal ---
describe('Template registration', () => {
  it('getTemplate("offer-modal") returns a component after import', () => {
    const component = getTemplate('offer-modal')
    expect(component).not.toBeNull()
  })
})

// --- Test 2: Render offer-modal headline ---
describe('offer-modal render', () => {
  it('renders the presell headline', () => {
    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ headline: 'Headline Test' })} />)
    expect(screen.getByText('Headline Test')).toBeDefined()
  })

  // --- Test 3: CTA button text ---
  it('renders the CTA button with presell.ctaText', () => {
    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ ctaText: 'Get It Now' })} />)
    expect(screen.getByRole('button', { name: 'Get It Now' })).toBeDefined()
  })

  // --- Test 4: CTA click fires redirect API ---
  it('clicking CTA fires POST /api/public/presells/:slug/redirect', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', mockFetch)

    // jsdom does not support navigation, stub window.location.href setter
    const originalLocation = window.location
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    })

    const OfferModal = getTemplate('offer-modal')!
    render(<OfferModal presell={makePresell({ slug: 'test-slug', ctaText: 'Buy Now' })} />)

    await userEvent.click(screen.getByRole('button', { name: 'Buy Now' }))

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/public/presells/test-slug/redirect',
      expect.objectContaining({ method: 'POST' }),
    )

    vi.unstubAllGlobals()
    Object.defineProperty(window, 'location', { writable: true, value: originalLocation })
  })
})
