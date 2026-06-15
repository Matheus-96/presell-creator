import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FooterEditor } from './FooterEditor.tsx'
import type { FooterProps } from '../types.ts'

function makeProps(overrides: Partial<FooterProps> = {}): FooterProps {
  return {
    legalText: 'Todos os direitos reservados',
    links: [{ label: 'Termos', url: '/termos' }],
    ...overrides,
  }
}

describe('FooterEditor', () => {
  it('renders legal text field and fires onChange when typed', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps()} onChange={onChange} />)

    const input = screen.getByLabelText(/texto legal/i) as HTMLInputElement
    expect(input.value).toBe('Todos os direitos reservados')

    await userEvent.type(input, 'X')

    expect(onChange).toHaveBeenCalledWith({ legalText: 'Todos os direitos reservadosX' })
  })

  it('clicking "Adicionar link" opens the add modal', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps()} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /adicionar link/i }))

    expect(screen.getByRole('dialog')).toBeDefined()
    expect(screen.getByLabelText(/rótulo/i)).toBeDefined()
    expect(screen.getByLabelText(/url/i)).toBeDefined()
  })

  it('confirming add modal adds a link and closes modal', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps({ links: [] })} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /adicionar link/i }))

    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/rótulo/i), 'Privacidade')
    await userEvent.type(within(dialog).getByLabelText(/url/i), '/privacidade')
    await userEvent.click(within(dialog).getByRole('button', { name: /^adicionar$/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).toHaveBeenCalledWith({
      links: [{ label: 'Privacidade', url: '/privacidade' }],
    })
  })

  it('canceling add modal does not modify links', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps()} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /adicionar link/i }))

    const dialog = screen.getByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText(/rótulo/i), 'Rascunho')
    await userEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('clicking remove button on a link opens ConfirmRemoveModal', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps()} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /remover link/i }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/tem certeza/i)).toBeDefined()
  })

  it('confirming remove modal removes the link and closes modal', async () => {
    const onChange = vi.fn()
    const props = makeProps({
      links: [
        { label: 'Termos', url: '/termos' },
        { label: 'Privacidade', url: '/privacidade' },
      ],
    })
    render(<FooterEditor props={props} onChange={onChange} />)

    const removeButtons = screen.getAllByRole('button', { name: /remover link/i })
    await userEvent.click(removeButtons[0])

    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /confirmar/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).toHaveBeenCalledWith({
      links: [{ label: 'Privacidade', url: '/privacidade' }],
    })
  })

  it('canceling remove modal keeps the link', async () => {
    const onChange = vi.fn()
    render(<FooterEditor props={makeProps()} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: /remover link/i }))

    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /cancelar/i }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })
})
