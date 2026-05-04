import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { appConfig } from '@/config/app-config.ts'
import {
  AuthContext,
  type AuthContextValue,
  type AuthMessageTone,
  type AuthState,
} from '@/features/auth/auth-context.ts'
import {
  ADMIN_AUTH_REQUIRED_EVENT,
  ApiClientError,
} from '@/lib/api/api-client.ts'
import {
  adminApi,
  createGuestSession,
  type AdminSession,
  type LoginPayload,
} from '@/lib/api/admin-api.ts'

type AuthAction =
  | { type: 'placeholder' }
  | { type: 'loading'; message: string }
  | {
      type: 'resolved'
      session: AdminSession
      message?: string
      tone?: AuthMessageTone
    }
  | { type: 'failed'; message: string; session?: AdminSession | null }

function createPlaceholderState(): AuthState {
  return {
    mode: appConfig.auth.mode,
    status: 'placeholder',
    message:
      'Placeholder mode is active. Switch VITE_AUTH_MODE to session to enforce the admin API session boundary.',
    messageTone: 'warning',
    session: createGuestSession(),
  }
}

function createLoadingState(
  message = 'Checking the admin session before rendering protected routes.',
): AuthState {
  return {
    mode: appConfig.auth.mode,
    status: 'loading',
    message,
    messageTone: 'info',
    session: null,
  }
}

function createSessionState(
  session: AdminSession,
  message?: string,
  tone?: AuthMessageTone,
): AuthState {
  const isAuthenticated = session.authenticated
  const username = session.user?.username ?? 'admin'

  return {
    mode: appConfig.auth.mode,
    status: isAuthenticated ? 'authenticated' : 'unauthenticated',
    message:
      message
      ?? (isAuthenticated
        ? `Signed in as ${username}.`
        : 'Sign in with your admin account to access the workspace.'),
    messageTone: tone ?? (isAuthenticated ? 'info' : 'warning'),
    checkedAt: new Date().toISOString(),
    session,
  }
}

function createErrorState(
  message: string,
  session: AdminSession | null = null,
): AuthState {
  return {
    mode: appConfig.auth.mode,
    status: 'error',
    message,
    messageTone: 'error',
    checkedAt: new Date().toISOString(),
    session,
  }
}

function createInitialState(): AuthState {
  return appConfig.auth.mode === 'placeholder'
    ? createPlaceholderState()
    : createLoadingState()
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'placeholder':
      return createPlaceholderState()
    case 'loading':
      return createLoadingState(action.message)
    case 'resolved':
      return createSessionState(action.session, action.message, action.tone)
    case 'failed':
      return createErrorState(action.message, action.session ?? state.session)
    default:
      return state
  }
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message
  }

  return fallback
}

function isCsrfError(error: unknown) {
  return (
    error instanceof ApiClientError
    && (error.code === 'csrf_invalid' || error.code === 'csrf_required')
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, createInitialState)

  const runSessionCheck = useCallback(
    async (
      showLoadingState: boolean,
      loadingMessage = 'Refreshing the admin session.',
    ) => {
      if (appConfig.auth.mode === 'placeholder') {
        dispatch({ type: 'placeholder' })
        return
      }

      if (showLoadingState) {
        dispatch({ type: 'loading', message: loadingMessage })
      }

      try {
        const session = await adminApi.getSession()
        dispatch({ type: 'resolved', session })
      } catch (error) {
        dispatch({
          type: 'failed',
          message: getErrorMessage(error, 'Unable to validate the admin session.'),
        })
      }
    },
    [],
  )

  useEffect(() => {
    if (appConfig.auth.mode === 'session') {
      void runSessionCheck(false)
    }
  }, [runSessionCheck])

  useEffect(() => {
    if (appConfig.auth.mode !== 'session') {
      return undefined
    }

    function handleAuthRequired() {
      void runSessionCheck(false, 'Your admin session expired. Sign in again to continue.')
    }

    window.addEventListener(ADMIN_AUTH_REQUIRED_EVENT, handleAuthRequired)

    return () => {
      window.removeEventListener(ADMIN_AUTH_REQUIRED_EVENT, handleAuthRequired)
    }
  }, [runSessionCheck])

  const executeSessionMutation = useCallback(
    async <T,>(action: (csrfToken: string | null) => Promise<T>) => {
      const initialSession = state.session?.csrfToken ? state.session : await adminApi.getSession()

      try {
        return await action(initialSession.csrfToken)
      } catch (error) {
        if (!isCsrfError(error)) {
          throw error
        }

        const refreshedSession = await adminApi.getSession()
        if (refreshedSession.csrfToken === initialSession.csrfToken) {
          throw error
        }

        return action(refreshedSession.csrfToken)
      }
    },
    [state.session],
  )

  const refresh = useCallback(async () => {
    await runSessionCheck(true)
  }, [runSessionCheck])

  const login = useCallback(
    async (payload: LoginPayload) => {
      if (appConfig.auth.mode === 'placeholder') {
        dispatch({ type: 'placeholder' })
        return
      }

      const fallbackCsrfToken = state.session?.csrfToken ?? null

      dispatch({
        type: 'loading',
        message: 'Signing in to the admin workspace.',
      })

      try {
        const session = await executeSessionMutation((token) =>
          adminApi.createSession(payload, token),
        )
        dispatch({
          type: 'resolved',
          session,
          message: `Welcome back, ${session.user?.username ?? payload.username}.`,
        })
      } catch (error) {
        const fallbackSession = await adminApi
          .getSession()
          .catch(() => state.session ?? createGuestSession(fallbackCsrfToken))

        dispatch({
          type: 'resolved',
          session: fallbackSession,
          message: getErrorMessage(error, 'Unable to sign in right now.'),
          tone: 'error',
        })

        throw error
      }
    },
    [executeSessionMutation, state.session],
  )

  const logout = useCallback(async () => {
    if (appConfig.auth.mode === 'placeholder') {
      dispatch({ type: 'placeholder' })
      return
    }

    dispatch({
      type: 'loading',
      message: 'Signing out and clearing the admin session.',
    })

    try {
      const session = await executeSessionMutation((token) => adminApi.deleteSession(token))
      dispatch({
        type: 'resolved',
        session,
        message: 'You have been signed out.',
      })
    } catch (error) {
      dispatch({
        type: 'failed',
        message: getErrorMessage(error, 'Unable to clear the admin session.'),
        session: state.session,
      })

      throw error
    }
  }, [executeSessionMutation, state.session])

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      canAccessAdmin:
        state.status === 'authenticated' || state.status === 'placeholder',
      refresh,
      login,
      logout,
    }),
    [login, logout, refresh, state],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
