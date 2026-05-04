import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { adminRoutes } from '@/app/routes/admin-routes.tsx'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { appConfig, joinConfigUrl } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'

function getNavLinkClassName(isActive: boolean) {
  return isActive
    ? 'admin-shell__nav-link admin-shell__nav-link--active'
    : 'admin-shell__nav-link'
}

function getLegacyLoginUrl() {
  return joinConfigUrl(appConfig.legacyAdminUrl, '/login')
}

export function AdminShell() {
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const activeRoute = useMemo(
    () =>
      adminRoutes.find((route) =>
        route.to === '/'
          ? location.pathname === '/'
          : location.pathname === route.to || location.pathname.startsWith(`${route.to}/`),
      ) ?? adminRoutes[0],
    [location.pathname],
  )

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
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="admin-shell__brand-block">
          <span className="tag">Admin shell</span>
          <h1>{appConfig.appName}</h1>
          <p>
            Live auth, navigation, listings, and analytics now sit on top of the
            split backend without pulling the editor into this slice.
          </p>
        </div>

        <section className="admin-shell__sidebar-card admin-shell__sidebar-card--highlight">
          <p className="eyebrow">Signed in</p>
          <h2>{auth.session?.user?.username ?? 'Admin session'}</h2>
          <p>{auth.message}</p>
          <ul className="list list--compact admin-shell__capabilities">
            {(auth.session?.capabilities ?? []).slice(0, 4).map((capability) => (
              <li key={capability}>{capability}</li>
            ))}
          </ul>
        </section>

        <nav aria-label="Admin sections" className="admin-shell__nav">
          {adminRoutes.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => getNavLinkClassName(isActive)}
            >
              <span className="admin-shell__nav-label">{item.label}</span>
              <span className="admin-shell__nav-description">{item.description}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-shell__sidebar-card">
          <h2>Runtime</h2>
          <p>
            API requests use <strong>{appConfig.apiBaseUrl}</strong> and inherit the
            backend session cookie automatically.
          </p>
          <div className="button-row">
            <button
              className="button-link button-link--secondary"
              type="button"
              onClick={() => {
                void auth.refresh()
              }}
            >
              Refresh session
            </button>
            {appConfig.legacyAdminUrl !== appConfig.adminBaseUrl ? (
              <a className="button-link button-link--secondary" href={getLegacyLoginUrl()}>
                Legacy admin
              </a>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="admin-shell__content">
        <header className="admin-shell__topbar">
          <div>
            <p className="eyebrow">{activeRoute.label}</p>
            <h2>{activeRoute.description}</h2>
          </div>

          <div className="button-row">
            <button
              className="button-link button-link--secondary"
              type="button"
              onClick={() => {
                void auth.refresh()
              }}
            >
              Refresh data
            </button>
            <button className="button-link" type="button" onClick={() => void handleSignOut()}>
              {isSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </header>

        <div className="admin-shell__status">
          <StatusBanner
            tone={auth.messageTone}
            title="Admin session is active"
            description="Protected routes are enforced, and the frontend can bootstrap links, CSRF, and capabilities from the backend session endpoint."
            meta={[
              `Environment: ${appConfig.environment}`,
              `API base: ${appConfig.apiBaseUrl}`,
              `CSRF token: ${auth.session?.csrfToken ? 'available' : 'missing'}`,
            ]}
          />
        </div>

        <Outlet />
      </main>
    </div>
  )
}
