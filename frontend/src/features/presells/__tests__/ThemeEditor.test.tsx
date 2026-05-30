import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect } from 'vitest'
import { ThemeEditor } from '@/features/presells/components/ThemeEditor.tsx'
import type { PresellTheme } from '@/features/presells/types.ts'

// react-colorful renders an SVG-based picker; mock it to keep tests simple
vi.mock('react-colorful', () => ({
  RgbaStringColorPicker: ({
    color,
    onChange,
  }: {
    color: string
    onChange: (v: string) => void
  }) => (
    <div data-testid="color-picker" data-color={color}>
      <button onClick={() => onChange('rgba(255, 0, 0, 1)')}>pick red</button>
    </div>
  ),
}))

describe('ThemeEditor', () => {
  it('renders 5 color swatches', () => {
    render(<ThemeEditor theme={null} onChange={vi.fn()} />)
    const buttons = screen.getAllByRole('button', { name: /editar cor/i })
    expect(buttons).toHaveLength(5)
  })

  it('clicking swatch opens picker for that token', async () => {
    render(<ThemeEditor theme={null} onChange={vi.fn()} />)
    expect(screen.queryByTestId('color-picker')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    expect(screen.getByTestId('color-picker')).toBeDefined()
  })

  it('clicking same swatch closes picker', async () => {
    render(<ThemeEditor theme={null} onChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    expect(screen.getByTestId('color-picker')).toBeDefined()

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    expect(screen.queryByTestId('color-picker')).toBeNull()
  })

  it('clicking different swatch switches picker', async () => {
    render(<ThemeEditor theme={null} onChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    const firstPicker = screen.getByTestId('color-picker')
    expect(firstPicker.getAttribute('data-color')).toContain('99, 102, 241') // DEFAULT primary

    await userEvent.click(screen.getByRole('button', { name: /editar cor fundo/i }))
    const secondPicker = screen.getByTestId('color-picker')
    expect(secondPicker.getAttribute('data-color')).toContain('255, 255, 255') // DEFAULT background
  })

  it('onChange called with updated theme when color changes', async () => {
    const onChange = vi.fn()
    render(<ThemeEditor theme={null} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick red/i }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ primary: 'rgba(255, 0, 0, 1)' }),
    )
  })

  it('uses DEFAULT_COLORS when theme prop is null', () => {
    render(<ThemeEditor theme={null} onChange={vi.fn()} />)
    expect(screen.getByText('Primária')).toBeDefined()
    expect(screen.getByText('Secundária')).toBeDefined()
    expect(screen.getByText('Fundo')).toBeDefined()
    expect(screen.getByText('Superfície')).toBeDefined()
    expect(screen.getByText('Texto')).toBeDefined()
  })

  it('merges provided theme over defaults', async () => {
    const theme: PresellTheme = { primary: 'rgba(10, 20, 30, 1)' }
    render(<ThemeEditor theme={theme} onChange={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /editar cor primária/i }))
    const picker = screen.getByTestId('color-picker')
    expect(picker.getAttribute('data-color')).toBe('rgba(10, 20, 30, 1)')
  })
})
