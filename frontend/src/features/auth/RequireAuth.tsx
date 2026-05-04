import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { SectionCard } from '@/components/ui/SectionCard.tsx'
import { appConfig, joinConfigUrl } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'

function getLegacyLoginUrl() {
  return joinConfigUrl(appConfig.legacyAdminUrl, '/login')
}

export function RequireAuth() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') {
    return (
      <div className="page page--centered">
        <SectionCard
          eyebrow="Auth boundary"
          title="Checking admin session"
          description={auth.message}
        >
          <p className="page-description">
            Expected session path: <strong>{appConfig.auth.sessionPath}</strong>
          </p>
        </SectionCard>
      </div>
    )
  }

  if (auth.status === 'error') {
    return (
      <div className="page page--centered">
        <SectionCard
          eyebrow="Auth boundary"
          title="Unable to validate the admin session"
          description={auth.message}
        >
          <div className="button-row">
            <button
              className="button-link"
              type="button"
              onClick={() => {
                void auth.refresh()
              }}
            >
              Retry session check
            </button>
            {appConfig.legacyAdminUrl !== appConfig.adminBaseUrl ? (
              <a className="button-link button-link--secondary" href={getLegacyLoginUrl()}>
                Open legacy admin
              </a>
            ) : null}
          </div>
        </SectionCard>
      </div>
    )
  }

  if (auth.status === 'unauthenticated') {
    return (
      <Navigate
        replace
        to="/login"
        state={{
          from: {
            pathname: location.pathname,
            search: location.search,
            hash: location.hash,
          },
        }}
      />
    )
  }

  return <Outlet />
}
