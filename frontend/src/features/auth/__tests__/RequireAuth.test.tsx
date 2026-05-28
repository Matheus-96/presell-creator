import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { toast } from 'sonner'
import { RequireAuth } from '@/features/auth/RequireAuth.tsx'
import { ADMIN_AUTH_REQUIRED_EVENT } from '@/lib/api/api-client.ts'

vi.mock('sonner', () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}))

vi.mock('@/features/auth/use-auth.ts', () => ({
  useAuth: () => ({
    status: 'authenticated',
    message: '',
    messageTone: 'info',
    canAccessAdmin: true,
    refresh: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    session: { authenticated: true },
    mode: 'session',
  }),
}))

function renderRequireAuth() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fires toast.warning when ADMIN_AUTH_REQUIRED_EVENT is dispatched', () => {
    renderRequireAuth()

    window.dispatchEvent(new CustomEvent(ADMIN_AUTH_REQUIRED_EVENT))

    expect(toast.warning).toHaveBeenCalledWith('Sua sessão expirou. Faça login novamente.')
  })
})
