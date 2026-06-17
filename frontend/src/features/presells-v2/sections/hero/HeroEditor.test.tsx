import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { HeroEditor } from './HeroEditor.tsx'
import type { HeroProps } from '../types.ts'

vi.mock('@/features/presells/components/MediaPicker.tsx', () => ({
  MediaPicker: ({ label }: { label: string }) => <div data-testid="media-picker">{label}</div>,
}))

function makeProps(overrides: Partial<HeroProps> = {}): HeroProps {
  return {
    headline: 'Headline',
    subtitle: 'Sub',
    ctaText: 'CTA',
    ctaUrl: 'https://example.com',
    imageUrl: null,
    ...overrides,
  }
}

describe('HeroEditor', () => {
  it('renders variant selector with centered selected by default', () => {
    render(<HeroEditor props={makeProps()} onChange={vi.fn()} />)
    const select = screen.getByLabelText(/layout/i) as HTMLSelectElement
    expect(select.value).toBe('centered')
  })

  it('fires onChange with variant when layout is changed', async () => {
    const onChange = vi.fn()
    render(<HeroEditor props={makeProps()} onChange={onChange} />)
    const select = screen.getByLabelText(/layout/i)
    await userEvent.selectOptions(select, 'split')
    expect(onChange).toHaveBeenCalledWith({ variant: 'split' })
  })

  it('shows MediaPicker for split variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'split' })} onChange={vi.fn()} />)
    expect(screen.getByTestId('media-picker')).toBeTruthy()
    expect(screen.getByText('Imagem')).toBeTruthy()
  })

  it('shows MediaPicker for background-image variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'background-image' })} onChange={vi.fn()} />)
    expect(screen.getByTestId('media-picker')).toBeTruthy()
    expect(screen.getByTestId('media-picker').textContent).toBe('Imagem de fundo')
  })

  it('does not show MediaPicker for centered variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'centered' })} onChange={vi.fn()} />)
    expect(screen.queryByTestId('media-picker')).toBeNull()
  })

  it('shows image position selector for split variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'split' })} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/posição da imagem/i)).toBeTruthy()
  })

  it('hides image position selector for background-image variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'background-image' })} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/posição da imagem/i)).toBeNull()
  })

  it('hides bgColor for background-image variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'background-image' })} onChange={vi.fn()} />)
    expect(screen.queryByLabelText(/cor de fundo/i)).toBeNull()
  })

  it('shows bgColor for centered variant', () => {
    render(<HeroEditor props={makeProps({ variant: 'centered' })} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Cor de fundo')).toBeTruthy()
  })
})
