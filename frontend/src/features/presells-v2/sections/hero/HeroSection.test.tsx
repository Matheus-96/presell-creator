import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import HeroSection from './HeroSection.tsx'
import type { HeroProps } from '../types.ts'

function makeProps(overrides: Partial<HeroProps> = {}): HeroProps {
  return {
    headline: 'Título do Hero',
    subtitle: 'Subtítulo do hero',
    ctaText: 'Comprar agora',
    ctaUrl: 'https://example.com',
    imageUrl: null,
    ...overrides,
  }
}

describe('HeroSection', () => {
  it('renders centered variant by default (no variant field)', () => {
    const { container } = render(<HeroSection props={makeProps()} />)
    expect(container.querySelector('[data-variant="centered"]')).toBeTruthy()
    expect(screen.getByText('Título do Hero')).toBeTruthy()
    expect(screen.getByText('Comprar agora')).toBeTruthy()
  })

  it('renders centered variant explicitly', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'centered' })} />)
    expect(container.querySelector('[data-variant="centered"]')).toBeTruthy()
  })

  it('renders split variant with image on right by default', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'split', imageUrl: '/img.jpg' })} />)
    expect(container.querySelector('[data-variant="split"]')).toBeTruthy()
    expect(container.querySelector('img[src="/img.jpg"]')).toBeTruthy()
  })

  it('renders split variant with image on left', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'split', imageUrl: '/img.jpg', imagePosition: 'left' })} />)
    expect(container.querySelector('[data-variant="split"]')).toBeTruthy()
    const wrapper = container.querySelector('[data-section="hero"]')!.querySelector('.flex.flex-col')!
    const children = Array.from(wrapper.children)
    expect(children[0].querySelector('img')).toBeTruthy()
  })

  it('renders background-image variant with overlay', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'background-image', imageUrl: '/bg.jpg' })} />)
    expect(container.querySelector('[data-variant="background-image"]')).toBeTruthy()
    expect(container.querySelector('.bg-black\\/60')).toBeTruthy()
    expect(screen.getByText('Título do Hero')).toBeTruthy()
  })

  it('shows placeholder when imageUrl is null in centered variant', () => {
    const { container } = render(<HeroSection props={makeProps()} />)
    expect(container.querySelector('[data-placeholder="hero-image"]')).toBeTruthy()
  })

  it('applies bgColor on centered variant', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'centered', bgColor: '#ff0000' })} />)
    const section = container.querySelector('[data-section="hero"]') as HTMLElement
    expect(section.style.backgroundColor).toBe('rgb(255, 0, 0)')
  })

  it('does not apply bgColor on background-image variant', () => {
    const { container } = render(<HeroSection props={makeProps({ variant: 'background-image', bgColor: '#ff0000' })} />)
    const section = container.querySelector('[data-section="hero"]') as HTMLElement
    expect(section.style.backgroundColor).toBe('')
  })
})
