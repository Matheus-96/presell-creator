import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ReviewStep } from '@/features/presells/wizard/steps/ReviewStep.tsx'

const singleVariant = {
  templateId: 'template-1',
  headline: 'Amazing Product',
  subtitle: 'You need this now',
  body: 'This is the body text.',
  bullets: ['Benefit one', 'Benefit two'],
  ctaText: 'Buy Now',
  heroImageUrl: null,
  theme: null,
  settings: {},
}

const multiVariant = {
  variants: [
    {
      angle: 'Urgência',
      templateId: 'template-1',
      headline: 'Urgency Headline',
      subtitle: 'Urgency Subtitle',
      body: 'Urgency body.',
      bullets: ['Fast', 'Now'],
      ctaText: 'Act Now',
      heroImageUrl: null,
      theme: null,
      settings: {},
    },
    {
      angle: 'Autoridade',
      templateId: 'template-1',
      headline: 'Authority Headline',
      subtitle: 'Authority Subtitle',
      body: 'Authority body.',
      bullets: ['Expert', 'Trusted'],
      ctaText: 'Learn More',
      heroImageUrl: null,
      theme: null,
      settings: {},
    },
  ],
}

describe('ReviewStep — single variant', () => {
  it('renders headline input with jobResult.headline value', () => {
    render(<ReviewStep jobResult={singleVariant} onSave={vi.fn()} />)
    const input = screen.getByDisplayValue('Amazing Product')
    expect(input).toBeDefined()
  })

  it('editing headline updates the input value', async () => {
    const user = userEvent.setup()
    render(<ReviewStep jobResult={singleVariant} onSave={vi.fn()} />)
    const input = screen.getByDisplayValue('Amazing Product')
    await user.clear(input)
    await user.type(input, 'New headline')
    expect((input as HTMLInputElement).value).toBe('New headline')
  })

  it('"Salvar como draft" calls onSave with current edited values', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ReviewStep jobResult={singleVariant} onSave={onSave} />)
    const headlineInput = screen.getByDisplayValue('Amazing Product')
    await user.clear(headlineInput)
    await user.type(headlineInput, 'New headline')
    await user.click(screen.getByText('Salvar como draft'))
    expect(onSave).toHaveBeenCalledOnce()
    const [drafts] = onSave.mock.calls[0]
    expect(drafts).toHaveLength(1)
    expect(drafts[0].headline).toBe('New headline')
    expect(drafts[0].templateId).toBe('template-1')
  })
})

describe('ReviewStep — multi variant', () => {
  it('renders tabs with variant angle labels', () => {
    render(<ReviewStep jobResult={multiVariant} onSave={vi.fn()} />)
    expect(screen.getByText('Urgência')).toBeDefined()
    expect(screen.getByText('Autoridade')).toBeDefined()
  })

  it('"Salvar selecionadas" is disabled when no checkboxes are checked', () => {
    render(<ReviewStep jobResult={multiVariant} onSave={vi.fn()} />)
    const button = screen.getByText('Salvar selecionadas') as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('"Salvar selecionadas" calls onSave with the checked variant', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<ReviewStep jobResult={multiVariant} onSave={onSave} />)
    // Check first variant's checkbox
    const checkbox = screen.getByLabelText('Salvar esta variante') as HTMLInputElement
    await user.click(checkbox)
    await user.click(screen.getByText('Salvar selecionadas'))
    expect(onSave).toHaveBeenCalledOnce()
    const [drafts] = onSave.mock.calls[0]
    expect(drafts).toHaveLength(1)
    expect(drafts[0].headline).toBe('Urgency Headline')
  })
})
