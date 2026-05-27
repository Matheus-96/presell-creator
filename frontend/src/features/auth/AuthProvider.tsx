import { useEffect, useMemo, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { appConfig } from '@/config/app-config.ts'
import { AuthContext, type AuthContextValue, type AuthState } from '@/features/auth/auth-context.ts'
import { authApi, createGuestSession } from '@/features/auth/auth-api.ts'
import { setCsrfToken } from '@/lib/api/csrf-store.ts'

function placeholderState(): AuthState {
  return {
    mode: appConfig.auth.mode,
    status: 'placeholder',
    message: 'Placeholder mode is active. Switch VITE_AUTH_MODE to session to enforce the admin API session boundary.',
    messageTone: 'warning',
    session: createGuestSession(),
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data: session, isLoading, isError, error } = useQuery({
    queryKey: ['session'],
    queryFn: authApi.getSession,
    retry: false,
    staleTime: 1000 * 60 * 5,
    enabled: appConfig.auth.mode === 'session',
  })

  useEffect(() => {
    setCsrfToken(session?.csrfToken ?? null)
  }, [session])

  const loginMutation = useMutation({
    mutationFn: authApi.createSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
  })

  const logoutMutation = useMutation({
    mutationFn: authApi.deleteSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
  })

  const value = useMemo<AuthContextValue>(() => {
    if (appConfig.auth.mode === 'placeholder') {
      return {
        ...placeholderState(),
        canAccessAdmin: true,
        refresh: async () => {},
        login: async () => {},
        logout: async () => {},
      }
    }

    let state: AuthState
    if (isLoading) {
      state = {
        mode: appConfig.auth.mode,
        status: 'loading',
        message: 'Checking the admin session before rendering protected routes.',
        messageTone: 'info',
        session: null,
      }
    } else if (isError) {
      state = {
        mode: appConfig.auth.mode,
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to validate the admin session.',
        messageTone: 'error',
        checkedAt: new Date().toISOString(),
        session: null,
      }
    } else if (session?.authenticated) {
      state = {
        mode: appConfig.auth.mode,
        status: 'authenticated',
        message: `Signed in as ${session.user?.username ?? 'admin'}.`,
        messageTone: 'info',
        checkedAt: new Date().toISOString(),
        session,
      }
    } else {
      state = {
        mode: appConfig.auth.mode,
        status: 'unauthenticated',
        message: 'Sign in with your admin account to access the workspace.',
        messageTone: 'warning',
        checkedAt: new Date().toISOString(),
        session: session ?? null,
      }
    }

    return {
      ...state,
      canAccessAdmin: state.status === 'authenticated',
      refresh: () => queryClient.invalidateQueries({ queryKey: ['session'] }),
      login: async (payload) => { await loginMutation.mutateAsync(payload) },
      logout: async () => { await logoutMutation.mutateAsync() },
    }
  }, [isLoading, isError, error, session, loginMutation, logoutMutation, queryClient])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
