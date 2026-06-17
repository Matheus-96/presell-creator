import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ProductHighlightEditor } from './ProductHighlightEditor.tsx'
import type { ProductHighlightProps } from '../types.ts'

vi.mock('@/features/presells/components/MediaPicker.tsx', () => ({
  MediaPicker: ({ label }: { label: string }) => <div data-testid="media-picker">{label}</div>,
}))

function singleProps(overrides: Partial<ProductHighlightProps> = {}): ProductHighlightProps {
  return {
    variant: 'single-product',
    name: 'Produto',
    description: 'Desc',
    price: 'R$ 99',
    ctaText: 'Comprar',
    ctaUrl: 'https://example.com',
    ...overrides,
  }
}

function benefitsProps(overrides: Partial<ProductHighlightProps> = {}): ProductHighlightProps {
  return {
    variant: 'benefits-list',
    title: 'Benefícios',
    items: [{ icon: '✅', text: 'Item 1' }],
    ...overrides,
  }
}

describe('ProductHighlightEditor', () => {
  it('renders variant selector', () => {
    render(<ProductHighlightEditor props={singleProps()} onChange={vi.fn()} />)
    const select = screen.getByLabelText(/layout/i) as HTMLSelectElement
    expect(select.value).toBe('single-product')
  })

  it('fires onChange with variant when layout is changed', async () => {
    const onChange = vi.fn()
    render(<ProductHighlightEditor props={singleProps()} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText(/layout/i), 'benefits-list')
    expect(onChange).toHaveBeenCalledWith({ variant: 'benefits-list' })
  })

  it('shows product fields for single-product variant', () => {
    render(<ProductHighlightEditor props={singleProps()} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/nome/i)).toBeTruthy()
    expect(screen.getByLabelText(/preço \(por\)/i)).toBeTruthy()
    expect(screen.getByTestId('media-picker')).toBeTruthy()
  })

  it('shows benefits fields for benefits-list variant', () => {
    render(<ProductHighlightEditor props={benefitsProps()} onChange={vi.fn()} />)
    expect(screen.getByLabelText(/título/i)).toBeTruthy()
    expect(screen.getByText('Item 1')).toBeTruthy()
  })

  it('clicking add opens AddBenefitModal', async () => {
    render(<ProductHighlightEditor props={benefitsProps({ items: [] })} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /adicionar benefício/i }))
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('confirming add benefit calls onChange with new item', async () => {
    const onChange = vi.fn()
    render(<ProductHighlightEditor props={benefitsProps({ items: [] })} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /adicionar benefício/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.clear(within(dialog).getByLabelText(/ícone/i))
    await userEvent.type(within(dialog).getByLabelText(/ícone/i), '🎁')
    await userEvent.type(within(dialog).getByLabelText(/texto/i), 'Frete grátis')
    await userEvent.click(within(dialog).getByRole('button', { name: /^adicionar$/i }))
    expect(onChange).toHaveBeenCalledWith({
      items: [{ icon: '🎁', text: 'Frete grátis' }],
    })
  })

  it('clicking remove opens ConfirmRemoveModal', async () => {
    render(<ProductHighlightEditor props={benefitsProps()} onChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /remover benefício/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/tem certeza/i)).toBeTruthy()
  })

  it('confirming remove calls onChange without the item', async () => {
    const onChange = vi.fn()
    const props = benefitsProps({ items: [{ icon: '✅', text: 'A' }, { icon: '🎁', text: 'B' }] })
    render(<ProductHighlightEditor props={props} onChange={onChange} />)
    const removeButtons = screen.getAllByRole('button', { name: /remover benefício/i })
    await userEvent.click(removeButtons[0])
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar/i }))
    expect(onChange).toHaveBeenCalledWith({
      items: [{ icon: '🎁', text: 'B' }],
    })
  })
})
