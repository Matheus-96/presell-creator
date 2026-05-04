import { useMemo, useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { StatusBanner } from '@/components/ui/StatusBanner.tsx'
import { appConfig, joinConfigUrl } from '@/config/app-config.ts'
import { useAuth } from '@/features/auth/use-auth.ts'
import { useDocumentTitle } from '@/hooks/use-document-title.ts'

type LocationState = {
  from?: {
    pathname?: string
    search?: string
    hash?: string
  }
}

function getRedirectTarget(state: LocationState | null) {
  const pathname = state?.from?.pathname || '/'
  const search = state?.from?.search || ''
  const hash = state?.from?.hash || ''
  return `${pathname}${search}${hash}`
}

function getLegacyLoginUrl() {
  return joinConfigUrl(appConfig.legacyAdminUrl, '/login')
}

export function LoginPage() {
  useDocumentTitle('Sign in')

  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTo = useMemo(
    () => getRedirectTarget((location.state as LocationState | null) ?? null),
    [location.state],
  )

  if (auth.status === 'authenticated') {
    return <Navigate replace to={redirectTo} />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await auth.login({ username, password })
      navigate(redirectTo, { replace: true })
    } catch {
      setPassword('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="page page--centered auth-page">
      <section className="section-card auth-card">
        <div className="section-card__header">
          <p className="eyebrow">Admin sign-in</p>
          <h2>React admin shell</h2>
          <p className="section-card__description">
            Sign in with the existing admin credentials to unlock the dashboard,
            presell listings, and analytics snapshots powered by the split backend.
          </p>
        </div>

        <div className="section-card__content auth-card__content">
          {(auth.status === 'unauthenticated' || auth.status === 'error') && auth.message ? (
            <StatusBanner
              tone={auth.messageTone}
              title={auth.status === 'error' ? 'Session bootstrap failed' : 'Ready to sign in'}
              description={auth.message}
              meta={[
                `Environment: ${appConfig.environment}`,
                `Session path: ${appConfig.auth.sessionPath}`,
              ]}
            />
          ) : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                autoComplete="username"
                name="username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value)
                }}
                placeholder="admin"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                autoComplete="current-password"
                name="password"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value)
                }}
                placeholder="••••••••"
                required
              />
            </label>

            <div className="button-row">
              <button className="button-link" type="submit" disabled={isSubmitting}>
                {isSubmitting || auth.status === 'loading' ? 'Signing in…' : 'Sign in'}
              </button>
              <button
                className="button-link button-link--secondary"
                type="button"
                onClick={() => {
                  void auth.refresh()
                }}
              >
                Refresh session
              </button>
            </div>
          </form>

          <div className="auth-card__footer">
            {appConfig.legacyAdminUrl !== appConfig.adminBaseUrl ? (
              <p>
                Need the legacy workflow instead?{' '}
                <a href={getLegacyLoginUrl()}>Open the server-rendered admin.</a>
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  )
}
