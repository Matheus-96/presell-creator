import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminRoutes } from '@/app/routes/admin-routes.tsx'
import { Button } from '@/components/ui/button.tsx'
import { appConfig } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'
import { cn } from '@/lib/utils.ts'

export function AdminShell() {
  const auth = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await auth.logout()
      navigate('/login', { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <nav className="flex items-center h-14 px-6 border-b border-slate-200/70 bg-white/90 backdrop-blur-sm shrink-0 gap-0">
        <div className="flex items-center gap-2 mr-5 shrink-0">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 shrink-0" aria-hidden="true" />
          <span className="text-[0.95rem] font-bold text-slate-800">{appConfig.appName}</span>
        </div>

        <ul className="flex items-center gap-1 flex-1 list-none m-0 p-0">
          {adminRoutes.map((route) => (
            <li key={route.id}>
              <NavLink
                to={route.to}
                end={route.to === '/'}
                aria-label={route.label}
                className={({ isActive }) =>
                  cn(
                    'inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-100/80 text-indigo-800 font-semibold border border-indigo-200/60'
                      : 'text-slate-500 hover:bg-indigo-50 hover:text-indigo-800 border border-transparent',
                  )
                }
              >
                {route.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-3 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
          >
            {isSigningOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden min-w-0">
        <Outlet />
      </main>
    </div>
  )
}
