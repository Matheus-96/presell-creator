import { createContext } from 'react'
import type { AuthMode } from '@/config/app-config.ts'
import type { AdminSession, LoginPayload } from '@/lib/api/admin-api.ts'

export type AuthStatus =
  | 'loading'
  | 'authenticated'
  | 'unauthenticated'
  | 'placeholder'
  | 'error'

export type AuthMessageTone = 'info' | 'warning' | 'error'

export type AuthState = {
  mode: AuthMode
  status: AuthStatus
  message: string
  messageTone: AuthMessageTone
  checkedAt?: string
  session: AdminSession | null
}

export type AuthContextValue = AuthState & {
  canAccessAdmin: boolean
  refresh: () => Promise<void>
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
