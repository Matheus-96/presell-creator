import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { LoginPage } from '@/features/auth/pages/LoginPage.tsx'

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

const mockLogin = vi.fn()
const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('@/features/auth/use-auth.ts', () => ({
  useAuth: () => mockAuthValue,
}))

let mockAuthValue: {
  status: string
  login: typeof mockLogin
  refresh: ReturnType<typeof vi.fn>
  message: string
  messageTone: string
}

function renderLoginPage(initialPath = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthValue = {
      status: 'unauthenticated',
      login: mockLogin,
      refresh: vi.fn(),
      message: '',
      messageTone: 'info',
    }
  })

  it('redirects to the intended destination when already authenticated', () => {
    mockAuthValue = { ...mockAuthValue, status: 'authenticated' }
    renderLoginPage('/login')

    expect(screen.getByText('Dashboard')).toBeDefined()
    expect(screen.queryByRole('button', { name: /entrar/i })).toBeNull()
  })

  it('disables the submit button while submitting', async () => {
    let resolveLogin!: () => void
    mockLogin.mockReturnValueOnce(new Promise<void>((res) => { resolveLogin = res }))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/usuário/i), 'admin')
    await userEvent.type(screen.getByLabelText(/senha/i), 'secret')

    const button = screen.getByRole('button', { name: /entrar/i })
    await userEvent.click(button)

    expect(button).toBeDisabled()

    resolveLogin()
  })

  it('shows toast.error with the error message when login fails', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Credenciais inválidas'))
    renderLoginPage()

    await userEvent.type(screen.getByLabelText(/usuário/i), 'admin')
    await userEvent.type(screen.getByLabelText(/senha/i), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: /entrar/i }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Credenciais inválidas')
    })
  })
})
