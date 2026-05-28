import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { AdminShell } from '@/app/shell/AdminShell.tsx'
import { adminRoutes } from '@/app/routes/admin-routes.tsx'
import type { AuthContextValue } from '@/features/auth/auth-context.ts'
import { defaultAdminLinks } from '@/features/auth/auth-api.ts'

const mockLogout = vi.fn()

vi.mock('@/features/auth/use-auth.ts', () => ({
  useAuth: () => mockAuthValue,
}))

let mockAuthValue: Partial<AuthContextValue>

function renderShell(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<AdminShell />}>
          <Route index element={<div>Dashboard content</div>} />
          <Route path="presells" element={<div>Presells content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AdminShell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthValue = {
      status: 'authenticated',
      session: {
        authenticated: true,
        authStrategy: 'session-cookie',
        user: { username: 'admin' },
        csrfToken: 'tok',
        capabilities: [],
        links: defaultAdminLinks,
      },
      message: '',
      messageTone: 'info',
      logout: mockLogout,
      refresh: vi.fn(),
    }
  })

  it('renders a navbar link for each admin route', () => {
    renderShell()

    for (const route of adminRoutes) {
      expect(screen.getByRole('link', { name: route.label })).toBeDefined()
    }
  })

  it('marks the current route link as active via aria-current', () => {
    renderShell('/presells')

    expect(screen.getByRole('link', { name: 'Presells' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('calls auth.logout() when the sign out button is clicked', async () => {
    mockLogout.mockResolvedValue(undefined)
    renderShell()

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    expect(mockLogout).toHaveBeenCalledOnce()
  })

  it('renders the child route content via Outlet', () => {
    renderShell('/')

    expect(screen.getByText('Dashboard content')).toBeDefined()
  })

  it('does not render StatusBanner', () => {
    renderShell()

    expect(screen.queryByText(/admin session is active/i)).toBeNull()
  })
})
